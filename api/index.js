import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

const sql = neon(process.env.DATABASE_URL)
const COOKIE = 'tg_session'
const ranks = ['Recruta','Soldado','Cabo','3º Sargento','2º Sargento','1º Sargento','Subtenente','Aspirante','Tenente','Capitão','Major','Tenente-Coronel','Coronel']
let schemaReady = null

function json(res, status, data){ res.statusCode=status; res.setHeader('Content-Type','application/json; charset=utf-8'); res.end(JSON.stringify(data)) }
function parseCookies(req){ return Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]})) }
function hashToken(t){ return crypto.createHash('sha256').update(t).digest('hex') }
function makeInviteCode(){ const a=crypto.randomBytes(4).toString('hex').toUpperCase(); const b=crypto.randomBytes(4).toString('hex').toUpperCase(); return `TGA-${a}-${b}` }
async function ensureSchema(){
  if(!schemaReady){
    schemaReady=(async()=>{
      await sql`ALTER TABLE operators ADD COLUMN IF NOT EXISTS email TEXT`
      await sql`ALTER TABLE operators ADD COLUMN IF NOT EXISTS invite_code_hash TEXT`
      await sql`ALTER TABLE operators ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ`
      await sql`ALTER TABLE operators ADD COLUMN IF NOT EXISTS invite_used_at TIMESTAMPTZ`
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS operators_email_unique_idx ON operators (lower(email)) WHERE email IS NOT NULL`
      await sql`CREATE INDEX IF NOT EXISTS operators_invite_idx ON operators(invite_code_hash) WHERE invite_code_hash IS NOT NULL`
    })()
  }
  return schemaReady
}
async function userFromSession(req){
  const token=parseCookies(req)[COOKIE]; if(!token) return null
  const rows=await sql`SELECT o.* FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hashToken(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`
  return rows[0]||null
}
function setCookie(res, token, maxAge=60*60*24*14){ res.setHeader('Set-Cookie',`${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`) }
async function requireUser(req,res,role){ const u=await userFromSession(req); if(!u){json(res,401,{error:'Faça login.'});return null} if(role&&u.role!==role){json(res,403,{error:'Acesso restrito.'});return null} return u }
async function body(req){ return await new Promise((resolve,reject)=>{let d='';req.on('data',c=>d+=c);req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)}) }
async function reconcileAbsences(){
  const rows=await sql`SELECT gp.game_id,gp.operator_id FROM game_participants gp JOIN games g ON g.id=gp.game_id WHERE g.game_date < CURRENT_DATE AND gp.response='going' AND gp.present=false AND gp.absence_processed=false`
  for(const r of rows){
    await sql`UPDATE game_participants SET absence_processed=true WHERE game_id=${r.game_id} AND operator_id=${r.operator_id} AND absence_processed=false`
    await sql`UPDATE operators SET absences=absences+1 WHERE id=${r.operator_id}`
  }
}

export default async function handler(req,res){
  try{
    await ensureSchema()
    const url=new URL(req.url,'http://localhost'); const action=url.searchParams.get('action')||'public'
    if(req.method==='OPTIONS'){res.statusCode=204;res.end();return}

    if(action==='public'){
      const operators=await sql`SELECT id,name,nickname,role,rank,function,games_count,absences,photo_url,bio,equipment_summary,elo FROM operators WHERE active=true AND public_profile=true ORDER BY CASE WHEN role='commander' THEN 0 ELSE 1 END, nickname`
      const games=await sql`SELECT id,title,game_date,location,status,description,notes FROM games WHERE game_date>=CURRENT_DATE ORDER BY game_date LIMIT 20`
      return json(res,200,{operators,games})
    }

    if(action==='operator'){
      const id=url.searchParams.get('id'); if(!id) return json(res,400,{error:'Operador não informado.'})
      const op=(await sql`SELECT id,name,nickname,role,rank,function,games_count,absences,photo_url,bio,equipment_summary,elo FROM operators WHERE id=${id} AND active=true AND public_profile=true LIMIT 1`)[0]
      if(!op)return json(res,404,{error:'Operador não encontrado.'})
      const equipment=await sql`SELECT id,category,name,details FROM operator_equipment WHERE operator_id=${id} AND public_visible=true ORDER BY category,name`
      return json(res,200,{operator:op,equipment})
    }

    if(action==='visitor-request'&&req.method==='POST'){
      const b=await body(req); if(!b.name||!b.contact)return json(res,400,{error:'Nome e contato são obrigatórios.'})
      await sql`INSERT INTO visitor_requests(name,nickname,contact,message) VALUES(${b.name},${b.nickname||null},${b.contact},${b.message||null})`
      return json(res,201,{ok:true,message:'Solicitação enviada. O comando irá analisar sua visita.'})
    }

    if(action==='activate-operator'&&req.method==='POST'){
      const b=await body(req)
      const code=String(b.code||'').trim().toUpperCase()
      const email=String(b.email||'').trim().toLowerCase()
      const password=String(b.password||'')
      if(!code||!email||!password)return json(res,400,{error:'Código, e-mail e senha são obrigatórios.'})
      if(password.length<8)return json(res,400,{error:'A senha deve ter pelo menos 8 caracteres.'})
      const rows=await sql`SELECT id,name,nickname,role,rank FROM operators WHERE role='operator' AND active=false AND invite_code_hash=${hashToken(code)} AND invite_expires_at>now() AND invite_used_at IS NULL LIMIT 1`
      const operator=rows[0]
      if(!operator)return json(res,400,{error:'Código inválido, expirado ou já utilizado.'})
      const conflict=await sql`SELECT id FROM operators WHERE lower(email)=${email} AND id<>${operator.id} LIMIT 1`
      if(conflict.length)return json(res,409,{error:'Esse e-mail já está cadastrado.'})
      const passwordHash=await bcrypt.hash(password,12)
      await sql`UPDATE operators SET email=${email},password_hash=${passwordHash},active=true,invite_used_at=now(),invite_code_hash=NULL,invite_expires_at=NULL WHERE id=${operator.id}`
      const token=crypto.randomBytes(32).toString('hex')
      await sql`INSERT INTO sessions(token_hash,operator_id,expires_at) VALUES(${hashToken(token)},${operator.id},now()+interval '14 days')`
      setCookie(res,token)
      return json(res,200,{user:{id:operator.id,name:operator.name,nickname:operator.nickname,role:operator.role,rank:operator.rank}})
    }

    if(action==='login'&&req.method==='POST'){
      const b=await body(req); const identifier=String(b.identifier||b.email||b.nickname||'').trim().toLowerCase(); const pass=String(b.password||'')
      const rows=await sql`SELECT * FROM operators WHERE active=true AND (lower(coalesce(email,''))=${identifier} OR lower(nickname)=${identifier}) LIMIT 1`; const u=rows[0]
      if(!u||!(await bcrypt.compare(pass,u.password_hash)))return json(res,401,{error:'E-mail/apelido ou senha inválidos.'})
      const token=crypto.randomBytes(32).toString('hex'); await sql`INSERT INTO sessions(token_hash,operator_id,expires_at) VALUES(${hashToken(token)},${u.id},now()+interval '14 days') ON CONFLICT(token_hash) DO NOTHING`; setCookie(res,token)
      return json(res,200,{user:{id:u.id,name:u.name,nickname:u.nickname,email:u.email||null,role:u.role,rank:u.rank,absences:u.absences||0,suspension_until:u.suspension_until||null}})
    }

    if(action==='logout'){
      const token=parseCookies(req)[COOKIE]; if(token) await sql`DELETE FROM sessions WHERE token_hash=${hashToken(token)}`; setCookie(res,'',0); return json(res,200,{ok:true})
    }

    if(action==='me'){
      const u=await userFromSession(req); return json(res,200,{user:u?{id:u.id,name:u.name,nickname:u.nickname,email:u.email||null,role:u.role,rank:u.rank,function:u.function||null,bio:u.bio||null,absences:u.absences||0,suspension_until:u.suspension_until||null,equipment_summary:u.equipment_summary||null}:null})
    }

    if(action==='update-profile'&&req.method==='POST'){
      const u=await requireUser(req,res); if(!u)return
      const b=await body(req)
      await sql`UPDATE operators SET equipment_summary=${b.equipment_summary||null},bio=${b.bio||null},function=COALESCE(NULLIF(${b.function||''},''),function) WHERE id=${u.id}`
      return json(res,200,{ok:true})
    }

    if(action==='games'){
      await reconcileAbsences(); const u=await requireUser(req,res); if(!u)return
      const games=await sql`SELECT g.*, COALESCE(gp.response,'pending') response, gp.loadout FROM games g LEFT JOIN game_participants gp ON gp.game_id=g.id AND gp.operator_id=${u.id} WHERE g.game_date>=CURRENT_DATE-interval '2 days' ORDER BY g.game_date`
      return json(res,200,{games})
    }

    if(action==='rsvp'&&req.method==='POST'){
      const u=await requireUser(req,res); if(!u)return; const b=await body(req); const response=b.response==='going'?'going':'not_going'
      await sql`INSERT INTO game_participants(game_id,operator_id,response,responded_at,present) VALUES(${b.game_id},${u.id},${response},now(),false) ON CONFLICT(game_id,operator_id) DO UPDATE SET response=EXCLUDED.response,responded_at=now(),present=CASE WHEN EXCLUDED.response='going' THEN false ELSE game_participants.present END,absence_processed=false`
      return json(res,200,{ok:true})
    }

    if(action==='loadout'&&req.method==='POST'){
      const u=await requireUser(req,res); if(!u)return; const b=await body(req)
      await sql`INSERT INTO game_participants(game_id,operator_id,response,loadout,responded_at) VALUES(${b.game_id},${u.id},COALESCE(${b.response||'pending'},'pending'),${JSON.stringify(b.loadout||{})}::jsonb,now()) ON CONFLICT(game_id,operator_id) DO UPDATE SET loadout=EXCLUDED.loadout,response=CASE WHEN EXCLUDED.response='pending' THEN game_participants.response ELSE EXCLUDED.response END,responded_at=now()`
      return json(res,200,{ok:true})
    }

    if(action==='commander'){
      await reconcileAbsences(); const u=await requireUser(req,res,'commander'); if(!u)return
      const operators=await sql`SELECT id,name,nickname,role,rank,function,games_count,absences,elo,suspension_until,active,email,invite_expires_at,invite_used_at FROM operators ORDER BY role DESC, active DESC, nickname`
      const games=await sql`SELECT g.*, count(gp.operator_id) FILTER (WHERE gp.response='going')::int going_count, count(gp.operator_id)::int participant_count FROM games g LEFT JOIN game_participants gp ON gp.game_id=g.id GROUP BY g.id ORDER BY g.game_date DESC LIMIT 50`
      const requests=await sql`SELECT vr.*, COALESCE(json_agg(json_build_object('game_id',vga.game_id,'title',g.title,'game_date',g.game_date,'location',g.location)) FILTER (WHERE vga.id IS NOT NULL),'[]') assignments FROM visitor_requests vr LEFT JOIN visitor_game_assignments vga ON vga.visitor_request_id=vr.id LEFT JOIN games g ON g.id=vga.game_id GROUP BY vr.id ORDER BY vr.created_at DESC LIMIT 50`
      return json(res,200,{operators,games,requests,ranks})
    }

    if(action==='create-game'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander'); if(!u)return; const b=await body(req); if(!b.title||!b.game_date||!b.location)return json(res,400,{error:'Preencha nome, data e local.'})
      const rows=await sql`INSERT INTO games(title,game_date,location,status,description,notes,commander_id) VALUES(${b.title},${b.game_date},${b.location},'confirmado',${b.description||null},${b.notes||null},${u.id}) RETURNING *`
      await sql`INSERT INTO game_participants(game_id,operator_id) SELECT ${rows[0].id},id FROM operators WHERE active=true AND role='operator' ON CONFLICT DO NOTHING`
      return json(res,201,{game:rows[0]})
    }

    if(action==='create-invite'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander'); if(!u)return
      const b=await body(req); if(!b.name||!b.nickname)return json(res,400,{error:'Nome e apelido são obrigatórios.'})
      const nickname=String(b.nickname).trim().toUpperCase()
      const existing=await sql`SELECT id FROM operators WHERE lower(nickname)=lower(${nickname}) LIMIT 1`
      if(existing.length)return json(res,409,{error:'Esse apelido já está cadastrado.'})
      const code=makeInviteCode(); const codeHash=hashToken(code)
      const rows=await sql`INSERT INTO operators(name,nickname,password_hash,role,rank,function,bio,equipment_summary,active,public_profile,invite_code_hash,invite_expires_at) VALUES(${b.name},${nickname},${await bcrypt.hash(crypto.randomBytes(32).toString('hex'),10)},'operator',${b.rank||'Recruta'},${b.function||null},${b.bio||null},${b.equipment_summary||null},false,true,${codeHash},now()+interval '24 hours') RETURNING id,name,nickname,role,rank,function,invite_expires_at`
      return json(res,201,{operator:rows[0],code})
    }

    if(action==='revoke-invite'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander'); if(!u)return; const b=await body(req)
      await sql`UPDATE operators SET invite_code_hash=NULL,invite_expires_at=NULL WHERE id=${b.operator_id} AND active=false AND role='operator'`
      return json(res,200,{ok:true})
    }

    if(action==='rank'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander'); if(!u)return; const b=await body(req); const op=(await sql`SELECT id,rank,elo FROM operators WHERE id=${b.operator_id}`)[0]; if(!op)return json(res,404,{error:'Operador não encontrado.'})
      const next=b.rank; if(!ranks.includes(next))return json(res,400,{error:'Patente inválida.'})
      await sql`UPDATE operators SET rank=${next},elo=GREATEST(0,elo+${Number(b.elo_delta||0)}) WHERE id=${op.id}`; await sql`INSERT INTO rank_history(operator_id,old_rank,new_rank,reason,changed_by) VALUES(${op.id},${op.rank},${next},${b.reason||null},${u.id})`; return json(res,200,{ok:true})
    }

    if(action==='visitor-decision'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander'); if(!u)return; const b=await body(req); const status=b.status==='approved'?'approved':'rejected'; await sql`UPDATE visitor_requests SET status=${status},approved_by=${status==='approved'?u.id:null},decided_at=now() WHERE id=${b.id}`; return json(res,200,{ok:true})
    }

    if(action==='assign-visitor'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander'); if(!u)return; const b=await body(req); await sql`INSERT INTO visitor_game_assignments(visitor_request_id,game_id,notes) VALUES(${b.visitor_request_id},${b.game_id},${b.notes||null}) ON CONFLICT(visitor_request_id,game_id) DO UPDATE SET notes=EXCLUDED.notes`; return json(res,200,{ok:true})
    }

    if(action==='penalty'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander'); if(!u)return; const b=await body(req); const days=Math.max(0,Number(b.days||0))
      if(days) await sql`UPDATE operators SET suspension_until=CURRENT_DATE + ${days}::int WHERE id=${b.operator_id}`
      else await sql`UPDATE operators SET suspension_until=NULL WHERE id=${b.operator_id}`
      await sql`INSERT INTO penalties(operator_id,type,reason,days,ends_at) VALUES(${b.operator_id},${b.type||'suspensão'},${b.reason||null},${days},${days?`CURRENT_DATE + ${days}::int`:null})`
      return json(res,200,{ok:true})
    }

    if(action==='attendance'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander'); if(!u)return; const b=await body(req); await sql`UPDATE game_participants SET present=${!!b.present}, response=CASE WHEN ${!!b.present} THEN 'attended' ELSE response END, absence_processed=false WHERE game_id=${b.game_id} AND operator_id=${b.operator_id}`; return json(res,200,{ok:true})
    }

    return json(res,404,{error:'Ação não encontrada.'})
  }catch(e){ console.error(e); return json(res,500,{error:e?.message||'Erro interno.'}) }
}
