import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

const sql=neon(process.env.DATABASE_URL)
const OP_COOKIE='tg_session'
const VIS_COOKIE='tg_visitor'
let schemaReady=null

const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(data))}
const hash=t=>crypto.createHash('sha256').update(String(t||'')).digest('hex')
const cookies=req=>Object.fromEntries((req.headers?.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const body=req=>new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>300000)reject(new Error('Payload muito grande.'))});req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)})
const visitorCode=()=>`VIS-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`
const operatorCode=()=>`TGA-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
const cleanNick=v=>String(v||'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9_-]/g,'').slice(0,28)

async function ensureSchema(){
  if(!schemaReady)schemaReady=(async()=>{
    await sql`ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`
    await sql`ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS access_code_hash TEXT`
    await sql`ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS access_code_expires_at TIMESTAMPTZ`
    await sql`ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS access_code_created_at TIMESTAMPTZ`
    await sql`ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS recruited_operator_id UUID REFERENCES operators(id) ON DELETE SET NULL`
    await sql`ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS recruited_at TIMESTAMPTZ`
    await sql`CREATE TABLE IF NOT EXISTS visitor_sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),visitor_request_id UUID NOT NULL REFERENCES visitor_requests(id) ON DELETE CASCADE,token_hash TEXT NOT NULL UNIQUE,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
    await sql`CREATE INDEX IF NOT EXISTS visitor_sessions_request_idx ON visitor_sessions(visitor_request_id,expires_at DESC)`
    await sql`CREATE TABLE IF NOT EXISTS visitor_game_rsvps (visitor_request_id UUID NOT NULL REFERENCES visitor_requests(id) ON DELETE CASCADE,game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,response TEXT NOT NULL DEFAULT 'pending' CHECK(response IN ('pending','going','not_going')),responded_at TIMESTAMPTZ,team_code TEXT CHECK(team_code IN ('A','B')),PRIMARY KEY(visitor_request_id,game_id))`
    await sql`CREATE INDEX IF NOT EXISTS visitor_game_rsvps_game_idx ON visitor_game_rsvps(game_id,response)`
  })().catch(e=>{schemaReady=null;throw e});return schemaReady
}

async function commander(req){
  const token=cookies(req)[OP_COOKIE];if(!token)return null
  const rows=await sql`SELECT o.id,o.role,o.active FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`
  return rows[0]?.role==='commander'?rows[0]:null
}
async function visitor(req){
  const token=cookies(req)[VIS_COOKIE];if(!token)return null
  const rows=await sql`SELECT vr.id,vr.name,vr.nickname,vr.contact,vr.status,vr.recruited_operator_id,vr.recruited_at FROM visitor_sessions vs JOIN visitor_requests vr ON vr.id=vs.visitor_request_id WHERE vs.token_hash=${hash(token)} AND vs.expires_at>now() AND COALESCE(vr.status,'pending')<>'rejected' LIMIT 1`
  return rows[0]||null
}
function setVisitorCookie(res,token,maxAge=60*60*24*14){res.setHeader('Set-Cookie',`${VIS_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`)}
function clearVisitorCookie(res){res.setHeader('Set-Cookie',`${VIS_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`)}
async function commanderOnly(req,res){const u=await commander(req);if(!u){json(res,403,{error:'Acesso restrito ao comandante.'});return null}return u}
async function visitorOnly(req,res){const v=await visitor(req);if(!v){json(res,401,{error:'Código de visitante não autenticado.'});return null}return v}

export default async function handler(req,res){
  try{
    if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}
    await ensureSchema()
    const url=new URL(req.url,'http://localhost'),action=url.searchParams.get('action')||'decision'

    if(action==='login-code'&&req.method==='POST'){
      const b=await body(req),code=String(b.code||'').trim().toUpperCase();if(!code)return json(res,400,{error:'Informe o código do visitante.'})
      const rows=await sql`SELECT id,name,nickname,contact,status,recruited_operator_id,recruited_at FROM visitor_requests WHERE access_code_hash=${hash(code)} AND access_code_expires_at>now() AND COALESCE(status,'pending') IN ('approved','accepted') LIMIT 1`;const v=rows[0]
      if(!v)return json(res,401,{error:'Código inválido, expirado ou ainda não aprovado pelo comandante.'})
      const token=crypto.randomBytes(32).toString('hex');await sql`DELETE FROM visitor_sessions WHERE visitor_request_id=${v.id} AND expires_at<=now()`;await sql`INSERT INTO visitor_sessions(visitor_request_id,token_hash,expires_at) VALUES(${v.id},${hash(token)},now()+interval '14 days')`;setVisitorCookie(res,token)
      return json(res,200,{visitor:v})
    }
    if(action==='session'&&req.method==='GET'){
      const v=await visitorOnly(req,res);if(!v)return;return json(res,200,{visitor:v})
    }
    if(action==='logout'&&req.method==='POST'){
      const token=cookies(req)[VIS_COOKIE];if(token)await sql`DELETE FROM visitor_sessions WHERE token_hash=${hash(token)}`;clearVisitorCookie(res);return json(res,200,{ok:true})
    }
    if(action==='update-name'&&req.method==='POST'){
      const v=await visitorOnly(req,res);if(!v)return;const b=await body(req),name=String(b.name||'').trim().replace(/\s+/g,' ').slice(0,80);if(name.length<2)return json(res,400,{error:'Informe seu nome.'});const row=(await sql`UPDATE visitor_requests SET name=${name} WHERE id=${v.id} RETURNING id,name,nickname,contact,status,recruited_operator_id,recruited_at`)[0];return json(res,200,{ok:true,visitor:row})
    }
    if(action==='games'&&req.method==='GET'){
      const v=await visitorOnly(req,res);if(!v)return
      const games=await sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.description,g.briefing,g.rsvp_deadline_date,g.rsvp_deadline_time,g.rsvp_closed,gf.name field_name,gf.maps_url field_maps_url,COALESCE(vr.response,'pending') visitor_response,vr.responded_at,vr.team_code,gm.mission_objective,gm.team_a_name,gm.team_b_name FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id LEFT JOIN visitor_game_rsvps vr ON vr.game_id=g.id AND vr.visitor_request_id=${v.id} LEFT JOIN game_missions gm ON gm.game_id=g.id WHERE g.game_date>=CURRENT_DATE AND COALESCE(g.status,'') NOT IN ('cancelado','finalizado') ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 50`
      return json(res,200,{visitor:v,games})
    }
    if(action==='rsvp'&&req.method==='POST'){
      const v=await visitorOnly(req,res);if(!v)return;const b=await body(req),gameId=String(b.game_id||''),response=String(b.response||'');if(!gameId||!['going','not_going'].includes(response))return json(res,400,{error:'Jogo ou resposta inválida.'})
      const g=(await sql`SELECT id,rsvp_closed,rsvp_deadline_date,rsvp_deadline_time,status FROM games WHERE id=${gameId} LIMIT 1`)[0];if(!g)return json(res,404,{error:'Jogo não encontrado.'});if(g.rsvp_closed||['cancelado','finalizado'].includes(String(g.status||'')))return json(res,409,{error:'A lista deste jogo já está encerrada.'})
      if(g.rsvp_deadline_date){const expired=(await sql`SELECT ((((${g.rsvp_deadline_date}::date)+COALESCE(${g.rsvp_deadline_time}::time,'23:59:59'::time)) AT TIME ZONE 'America/Sao_Paulo')<=now()) expired`)[0]?.expired;if(expired)return json(res,409,{error:'O prazo para responder esta lista terminou.'})}
      await sql`INSERT INTO visitor_game_rsvps(visitor_request_id,game_id,response,responded_at,team_code) VALUES(${v.id},${gameId},${response},now(),NULL) ON CONFLICT(visitor_request_id,game_id) DO UPDATE SET response=EXCLUDED.response,responded_at=now(),team_code=CASE WHEN EXCLUDED.response='going' THEN visitor_game_rsvps.team_code ELSE NULL END`
      return json(res,200,{ok:true,response})
    }

    if(action==='create-code'&&req.method==='POST'){
      const u=await commanderOnly(req,res);if(!u)return;const code=visitorCode(),suffix=code.split('-').pop(),placeholder=`Visitante ${suffix}`
      const vr=(await sql`INSERT INTO visitor_requests(name,nickname,contact,message,status,access_code_hash,access_code_created_at,access_code_expires_at) VALUES(${placeholder},NULL,'Código direto','Acesso criado pelo comandante','approved',${hash(code)},now(),now()+interval '30 days') RETURNING id,name,status`)[0]
      return json(res,201,{ok:true,code,expires_in_days:30,visitor:vr,login_path:'/visitante'})
    }
    if(action==='decision'&&req.method==='POST'){
      const u=await commanderOnly(req,res);if(!u)return;const b=await body(req),id=String(b.id||'').trim(),status=String(b.status||'').trim().toLowerCase();if(!id||!['pending','approved','rejected'].includes(status))return json(res,400,{error:'Solicitação ou status inválido.'})
      const rows=await sql`UPDATE visitor_requests SET status=${status} WHERE id=${id} RETURNING id,status`;if(!rows.length)return json(res,404,{error:'Solicitação de visitante não encontrada.'});return json(res,200,{ok:true,request:rows[0]})
    }
    if(action==='generate-code'&&req.method==='POST'){
      const u=await commanderOnly(req,res);if(!u)return;const b=await body(req),id=String(b.id||'');const vr=(await sql`SELECT id,name,nickname,status FROM visitor_requests WHERE id=${id} LIMIT 1`)[0];if(!vr)return json(res,404,{error:'Visitante não encontrado.'});if(String(vr.status||'pending')==='rejected')return json(res,409,{error:'Aprove o visitante antes de gerar o código.'})
      const code=visitorCode();await sql`DELETE FROM visitor_sessions WHERE visitor_request_id=${id}`;await sql`UPDATE visitor_requests SET status='approved',access_code_hash=${hash(code)},access_code_created_at=now(),access_code_expires_at=now()+interval '30 days' WHERE id=${id}`
      return json(res,200,{ok:true,code,expires_in_days:30,visitor:{id:vr.id,name:vr.name,nickname:vr.nickname},login_path:'/visitante'})
    }
    if(action==='delete'&&req.method==='POST'){
      const u=await commanderOnly(req,res);if(!u)return;const b=await body(req),id=String(b.id||'');if(!id)return json(res,400,{error:'Visitante não informado.'});await sql`DELETE FROM visitor_game_rsvps WHERE visitor_request_id=${id}`;await sql`DELETE FROM visitor_sessions WHERE visitor_request_id=${id}`;await sql`DELETE FROM visitor_game_assignments WHERE visitor_request_id=${id}`;const rows=await sql`DELETE FROM visitor_requests WHERE id=${id} RETURNING id`;if(!rows.length)return json(res,404,{error:'Visitante não encontrado.'});return json(res,200,{ok:true})
    }
    if(action==='recruit'&&req.method==='POST'){
      const u=await commanderOnly(req,res);if(!u)return;const b=await body(req),id=String(b.id||'');const vr=(await sql`SELECT * FROM visitor_requests WHERE id=${id} LIMIT 1`)[0];if(!vr)return json(res,404,{error:'Visitante não encontrado.'});if(vr.recruited_operator_id)return json(res,409,{error:'Este visitante já foi encaminhado para recrutamento.'})
      let nick=cleanNick(b.nickname||vr.nickname||vr.name)||'NOVOOPERADOR';const conflict=await sql`SELECT id FROM operators WHERE lower(nickname)=lower(${nick}) LIMIT 1`;if(conflict.length)nick=`${nick.slice(0,22)}-${String(vr.id).slice(0,4).toUpperCase()}`
      const code=operatorCode(),passwordHash=await bcrypt.hash(crypto.randomBytes(32).toString('hex'),10);const op=(await sql`INSERT INTO operators(name,nickname,password_hash,role,rank,function,active,public_profile,invite_code_hash,invite_expires_at) VALUES(${String(vr.name||nick)},${nick},${passwordHash},'operator','Recruta',NULL,false,true,${hash(code)},now()+interval '7 days') RETURNING id,name,nickname,rank,invite_expires_at`)[0]
      await sql`UPDATE visitor_requests SET status='approved',recruited_operator_id=${op.id},recruited_at=now() WHERE id=${id}`
      return json(res,201,{ok:true,operator:op,code,activation_path:'/operador/primeiro-acesso',expires_in_days:7})
    }
    if(action==='game-visitors'&&req.method==='GET'){
      const u=await commanderOnly(req,res);if(!u)return;const gameId=String(url.searchParams.get('game_id')||'');if(!gameId)return json(res,400,{error:'Jogo não informado.'})
      const visitors=await sql`SELECT vr.id,vr.name,vr.nickname,vr.contact,r.response,r.responded_at,r.team_code FROM visitor_game_rsvps r JOIN visitor_requests vr ON vr.id=r.visitor_request_id WHERE r.game_id=${gameId} AND COALESCE(vr.status,'pending')<>'rejected' ORDER BY CASE r.response WHEN 'going' THEN 0 WHEN 'not_going' THEN 1 ELSE 2 END,COALESCE(NULLIF(vr.nickname,''),vr.name)`
      return json(res,200,{visitors})
    }
    if(action==='draw-visitors'&&req.method==='POST'){
      const u=await commanderOnly(req,res);if(!u)return;const b=await body(req),gameId=String(b.game_id||'');if(!gameId)return json(res,400,{error:'Jogo não informado.'})
      const people=await sql`SELECT vr.id,vr.name,vr.nickname FROM visitor_game_rsvps r JOIN visitor_requests vr ON vr.id=r.visitor_request_id WHERE r.game_id=${gameId} AND r.response='going' AND COALESCE(vr.status,'pending')<>'rejected' ORDER BY COALESCE(NULLIF(vr.nickname,''),vr.name)`;if(!people.length)return json(res,409,{error:'Nenhum visitante marcou Vou neste jogo.'})
      const counts=await sql`SELECT team_code,count(*)::int n FROM game_mission_members WHERE game_id=${gameId} AND team_code IN ('A','B') GROUP BY team_code`;let a=Number(counts.find(x=>x.team_code==='A')?.n||0),bb=Number(counts.find(x=>x.team_code==='B')?.n||0);const shuffled=[...people];for(let i=shuffled.length-1;i>0;i--){const j=crypto.randomInt(i+1);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]}
      const assigned=[];for(const p of shuffled){let team;if(a<bb)team='A';else if(bb<a)team='B';else team=crypto.randomInt(2)===0?'A':'B';if(team==='A')a++;else bb++;await sql`UPDATE visitor_game_rsvps SET team_code=${team} WHERE visitor_request_id=${p.id} AND game_id=${gameId}`;assigned.push({...p,team_code:team})}
      return json(res,200,{ok:true,count:assigned.length,assigned,team_counts:{A:a,B:bb}})
    }
    return json(res,400,{error:'Ação inválida.'})
  }catch(e){console.error('visitor-admin',e);return json(res,500,{error:e?.message||'Não foi possível processar o visitante.'})}
}