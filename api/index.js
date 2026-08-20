import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

const sql = neon(process.env.DATABASE_URL)
const COOKIE = 'tg_session'
const ranks = ['Recruta','Soldado','Cabo','3º Sargento','2º Sargento','1º Sargento','Subtenente','Aspirante','Tenente','Capitão','Major','Tenente-Coronel','Coronel']
let schemaReady = null

const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data))}
const parseCookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const hashToken=t=>crypto.createHash('sha256').update(t).digest('hex')
const makeInviteCode=()=>`TGA-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
const body=req=>new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>5_000_000){reject(new Error('Payload muito grande.'))}});req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)})

async function ensureSchema(){
  if(!schemaReady){
    schemaReady=(async()=>{
      const cols=[
        ['operators','email','TEXT'],['operators','invite_code_hash','TEXT'],['operators','invite_expires_at','TIMESTAMPTZ'],['operators','invite_used_at','TIMESTAMPTZ'],
        ['operators','age','INTEGER'],['operators','blood_type','TEXT'],['operators','airsoft_years','NUMERIC'],['operators','play_style','TEXT'],['operators','primary_replica','TEXT'],['operators','secondary_replica','TEXT'],
        ['games','game_time','TIME'],['games','max_players','INTEGER'],['games','briefing','TEXT']
      ]
      for(const [table,col,type] of cols) await sql.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${type}`)
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS operators_email_unique_idx ON operators (lower(email)) WHERE email IS NOT NULL`
      await sql`CREATE INDEX IF NOT EXISTS operators_invite_idx ON operators(invite_code_hash) WHERE invite_code_hash IS NOT NULL`
      await sql`CREATE TABLE IF NOT EXISTS operator_gallery (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE, image_data TEXT NOT NULL, caption TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      await sql`CREATE INDEX IF NOT EXISTS operator_gallery_operator_idx ON operator_gallery(operator_id,created_at DESC)`
    })().catch(e=>{schemaReady=null;throw e})
  }
  return schemaReady
}

async function userFromSession(req){
  const token=parseCookies(req)[COOKIE];if(!token)return null
  const rows=await sql`SELECT o.* FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hashToken(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`
  return rows[0]||null
}
function setCookie(res,token,maxAge=60*60*24*14){res.setHeader('Set-Cookie',`${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`)}
async function requireUser(req,res,role){const u=await userFromSession(req);if(!u){json(res,401,{error:'Faça login.'});return null}if(role&&u.role!==role){json(res,403,{error:'Acesso restrito.'});return null}return u}
async function reconcileAbsences(){
  const rows=await sql`SELECT gp.game_id,gp.operator_id FROM game_participants gp JOIN games g ON g.id=gp.game_id WHERE g.game_date<CURRENT_DATE AND gp.response='going' AND gp.present=false AND gp.absence_processed=false`
  for(const r of rows){await sql`UPDATE game_participants SET absence_processed=true WHERE game_id=${r.game_id} AND operator_id=${r.operator_id} AND absence_processed=false`;await sql`UPDATE operators SET absences=COALESCE(absences,0)+1 WHERE id=${r.operator_id}`}
}
function publicOperatorRow(o){return {id:o.id,name:o.name,nickname:o.nickname,rank:o.rank,function:o.function||'Operador',games_count:o.games_count||0,absences:o.absences||0,photo_url:o.photo_url||null,bio:o.bio||'',equipment_summary:o.equipment_summary||'',elo:o.elo||0,age:o.age||null,blood_type:o.blood_type||null,airsoft_years:o.airsoft_years||null,play_style:o.play_style||'',primary_replica:o.primary_replica||'',secondary_replica:o.secondary_replica||''}}

export default async function handler(req,res){
  try{
    await ensureSchema()
    if(req.method==='OPTIONS'){res.statusCode=204;res.end();return}
    const url=new URL(req.url,'http://localhost');const action=url.searchParams.get('action')||'public'

    if(action==='public'){
      const operators=await sql`SELECT * FROM operators WHERE active=true AND public_profile=true ORDER BY CASE WHEN role='commander' THEN 0 ELSE 1 END,nickname`
      const games=await sql`SELECT id,title,game_date,game_time,location,status,description,notes,briefing,max_players FROM games WHERE game_date>=CURRENT_DATE ORDER BY game_date,game_time NULLS LAST LIMIT 20`
      return json(res,200,{operators:operators.map(publicOperatorRow),games,ranks})
    }

    if(action==='operator'){
      const id=url.searchParams.get('id');if(!id)return json(res,400,{error:'Operador não informado.'})
      const rows=await sql`SELECT * FROM operators WHERE id=${id} AND active=true AND public_profile=true LIMIT 1`;const op=rows[0]
      if(!op)return json(res,404,{error:'Operador não encontrado.'})
      const equipment=await sql`SELECT id,category,name,details,public_visible FROM operator_equipment WHERE operator_id=${id} AND public_visible=true ORDER BY category,name`
      const gallery=await sql`SELECT id,image_data,caption,created_at FROM operator_gallery WHERE operator_id=${id} ORDER BY created_at DESC LIMIT 18`
      return json(res,200,{operator:publicOperatorRow(op),equipment,gallery})
    }

    if(action==='visitor-request'&&req.method==='POST'){
      const b=await body(req);if(!b.name||!b.contact)return json(res,400,{error:'Nome e contato são obrigatórios.'})
      await sql`INSERT INTO visitor_requests(name,nickname,contact,message) VALUES(${b.name},${b.nickname||null},${b.contact},${b.message||null})`
      return json(res,201,{message:'Solicitação enviada ao comando.'})
    }

    if(action==='activate-operator'&&req.method==='POST'){
      const b=await body(req);const code=String(b.code||'').trim().toUpperCase();const email=String(b.email||'').trim().toLowerCase();const password=String(b.password||'')
      if(!code||!email||!password)return json(res,400,{error:'Código, e-mail e senha são obrigatórios.'});if(password.length<8)return json(res,400,{error:'A senha precisa ter pelo menos 8 caracteres.'})
      const rows=await sql`SELECT id,name,nickname,role,rank FROM operators WHERE role='operator' AND active=false AND invite_code_hash=${hashToken(code)} AND invite_expires_at>now() AND invite_used_at IS NULL LIMIT 1`;const op=rows[0]
      if(!op)return json(res,400,{error:'Código inválido, expirado ou já utilizado.'})
      const conflict=await sql`SELECT id FROM operators WHERE lower(email)=${email} LIMIT 1`;if(conflict.length)return json(res,409,{error:'Esse e-mail já está cadastrado.'})
      const passwordHash=await bcrypt.hash(password,12)
      await sql`UPDATE operators SET email=${email},password_hash=${passwordHash},active=true,invite_used_at=now(),invite_code_hash=NULL,invite_expires_at=NULL WHERE id=${op.id}`
      const token=crypto.randomBytes(32).toString('hex');await sql`INSERT INTO sessions(token_hash,operator_id,expires_at) VALUES(${hashToken(token)},${op.id},now()+interval '14 days')`;setCookie(res,token)
      return json(res,200,{user:{id:op.id,name:op.name,nickname:op.nickname,role:op.role,rank:op.rank}})
    }

    if(action==='login'&&req.method==='POST'){
      const b=await body(req);const identifier=String(b.identifier||'').trim().toLowerCase();const pass=String(b.password||'');const rows=await sql`SELECT * FROM operators WHERE active=true AND (lower(coalesce(email,''))=${identifier} OR lower(nickname)=${identifier}) LIMIT 1`;const u=rows[0]
      if(!u||!(await bcrypt.compare(pass,u.password_hash)))return json(res,401,{error:'E-mail/apelido ou senha inválidos.'})
      if(u.suspension_until&&new Date(u.suspension_until)>new Date())return json(res,403,{error:`Conta suspensa até ${new Date(u.suspension_until).toLocaleDateString('pt-BR')}.`})
      const token=crypto.randomBytes(32).toString('hex');await sql`INSERT INTO sessions(token_hash,operator_id,expires_at) VALUES(${hashToken(token)},${u.id},now()+interval '14 days')`;setCookie(res,token)
      return json(res,200,{user:{id:u.id,name:u.name,nickname:u.nickname,email:u.email||null,role:u.role,rank:u.rank,function:u.function||null,bio:u.bio||null,absences:u.absences||0,suspension_until:u.suspension_until||null}})
    }

    if(action==='logout'){const token=parseCookies(req)[COOKIE];if(token)await sql`DELETE FROM sessions WHERE token_hash=${hashToken(token)}`;setCookie(res,'',0);return json(res,200,{ok:true})}

    if(action==='me'){const u=await userFromSession(req);return json(res,200,{user:u?{id:u.id,name:u.name,nickname:u.nickname,email:u.email||null,role:u.role,rank:u.rank,function:u.function||null,bio:u.bio||null,absences:u.absences||0,suspension_until:u.suspension_until||null,age:u.age||null,blood_type:u.blood_type||null,airsoft_years:u.airsoft_years||null,play_style:u.play_style||'',primary_replica:u.primary_replica||'',secondary_replica:u.secondary_replica||'',equipment_summary:u.equipment_summary||'',photo_url:u.photo_url||null,public_profile:u.public_profile}:null})}

    if(action==='profile-data'){
      const u=await requireUser(req,res,'operator');if(!u)return
      const equipment=await sql`SELECT id,category,name,details,public_visible FROM operator_equipment WHERE operator_id=${u.id} ORDER BY category,name`
      const gallery=await sql`SELECT id,image_data,caption,created_at FROM operator_gallery WHERE operator_id=${u.id} ORDER BY created_at DESC LIMIT 30`
      return json(res,200,{user:u,equipment,gallery})
    }

    if(action==='update-profile'&&req.method==='POST'){
      const u=await requireUser(req,res);if(!u)return;const b=await body(req)
      const age=b.age===''||b.age==null?null:Number(b.age);const years=b.airsoft_years===''||b.airsoft_years==null?null:Number(b.airsoft_years)
      await sql`UPDATE operators SET name=COALESCE(NULLIF(${String(b.name||'').trim()},''),name),email=COALESCE(NULLIF(${String(b.email||'').trim().toLowerCase()},''),email),age=${age},blood_type=${b.blood_type||null},airsoft_years=${years},play_style=${b.play_style||null},primary_replica=${b.primary_replica||null},secondary_replica=${b.secondary_replica||null},function=${b.function||null},bio=${b.bio||null},equipment_summary=${b.equipment_summary||null},public_profile=${b.public_profile!==false} WHERE id=${u.id}`
      return json(res,200,{ok:true})
    }

    if(action==='upload-photo'&&req.method==='POST'){
      const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);const data=String(b.image_data||'');if(!data.startsWith('data:image/'))return json(res,400,{error:'Envie uma imagem válida.'});if(data.length>2_000_000)return json(res,400,{error:'Imagem muito grande. Use uma foto de até ~1,5 MB.'});await sql`UPDATE operators SET photo_url=${data} WHERE id=${u.id}`;return json(res,200,{ok:true,photo_url:data})
    }

    if(action==='add-gallery'&&req.method==='POST'){
      const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);const data=String(b.image_data||'');if(!data.startsWith('data:image/'))return json(res,400,{error:'Envie uma imagem válida.'});if(data.length>2_000_000)return json(res,400,{error:'Imagem muito grande.'});await sql`INSERT INTO operator_gallery(operator_id,image_data,caption) VALUES(${u.id},${data},${b.caption||null})`;return json(res,201,{ok:true})
    }

    if(action==='delete-gallery'&&req.method==='POST'){const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);await sql`DELETE FROM operator_gallery WHERE id=${b.id} AND operator_id=${u.id}`;return json(res,200,{ok:true})}

    if(action==='equipment'&&req.method==='POST'){
      const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);if(!b.name)return json(res,400,{error:'Nome do equipamento é obrigatório.'});await sql`INSERT INTO operator_equipment(operator_id,category,name,details,public_visible) VALUES(${u.id},${b.category||'Equipamento'},${b.name},${b.details||null},${b.public_visible!==false})`;return json(res,201,{ok:true})
    }
    if(action==='delete-equipment'&&req.method==='POST'){const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);await sql`DELETE FROM operator_equipment WHERE id=${b.id} AND operator_id=${u.id}`;return json(res,200,{ok:true})}

    if(action==='games'){
      await reconcileAbsences();const u=await requireUser(req,res);if(!u)return
      const games=await sql`SELECT g.*,COALESCE(gp.response,'pending') response,gp.loadout FROM games g LEFT JOIN game_participants gp ON gp.game_id=g.id AND gp.operator_id=${u.id} WHERE g.game_date>=CURRENT_DATE-interval '1 day' ORDER BY g.game_date,g.game_time NULLS LAST`
      return json(res,200,{games})
    }
    if(action==='rsvp'&&req.method==='POST'){const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);const response=b.response==='going'?'going':'not_going';await sql`INSERT INTO game_participants(game_id,operator_id,response,responded_at,present) VALUES(${b.game_id},${u.id},${response},now(),false) ON CONFLICT(game_id,operator_id) DO UPDATE SET response=EXCLUDED.response,responded_at=now(),present=CASE WHEN EXCLUDED.response='going' THEN false ELSE game_participants.present END,absence_processed=false`;return json(res,200,{ok:true})}
    if(action==='loadout'&&req.method==='POST'){const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);await sql`INSERT INTO game_participants(game_id,operator_id,response,loadout,responded_at) VALUES(${b.game_id},${u.id},COALESCE(${b.response||'pending'},'pending'),${JSON.stringify(b.loadout||{})}::jsonb,now()) ON CONFLICT(game_id,operator_id) DO UPDATE SET loadout=EXCLUDED.loadout,response=CASE WHEN EXCLUDED.response='pending' THEN game_participants.response ELSE EXCLUDED.response END,responded_at=now()`;return json(res,200,{ok:true})}

    if(action==='commander'){
      await reconcileAbsences();const u=await requireUser(req,res,'commander');if(!u)return
      const operators=await sql`SELECT id,name,nickname,role,rank,function,games_count,absences,elo,suspension_until,active,email,invite_expires_at,invite_used_at FROM operators ORDER BY role DESC,active DESC,nickname`
      const games=await sql`SELECT g.*,count(gp.operator_id) FILTER (WHERE gp.response='going')::int going_count,count(gp.operator_id)::int participant_count FROM games g LEFT JOIN game_participants gp ON gp.game_id=g.id GROUP BY g.id ORDER BY g.game_date DESC,g.game_time DESC NULLS LAST LIMIT 50`
      const requests=await sql`SELECT vr.*,COALESCE(json_agg(json_build_object('game_id',vga.game_id,'title',g.title,'game_date',g.game_date,'location',g.location)) FILTER (WHERE vga.id IS NOT NULL),'[]') assignments FROM visitor_requests vr LEFT JOIN visitor_game_assignments vga ON vga.visitor_request_id=vr.id LEFT JOIN games g ON g.id=vga.game_id GROUP BY vr.id ORDER BY vr.created_at DESC LIMIT 50`
      return json(res,200,{me:u,operators,games,requests,ranks})
    }

    if(action==='create-game'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);if(!b.title||!b.game_date||!b.location)return json(res,400,{error:'Preencha nome, data e local.'});
      const max=b.max_players?Number(b.max_players):null
      const rows=await sql`INSERT INTO games(title,game_date,game_time,location,status,description,notes,briefing,max_players,commander_id) VALUES(${b.title},${b.game_date},${b.game_time||null},${b.location},${b.status||'confirmado'},${b.description||null},${b.notes||null},${b.briefing||null},${max},${u.id}) RETURNING *`
      await sql`INSERT INTO game_participants(game_id,operator_id) SELECT ${rows[0].id},id FROM operators WHERE active=true AND role='operator' ON CONFLICT DO NOTHING`
      return json(res,201,{game:rows[0]})
    }

    if(action==='create-invite'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const nickname=String(b.nickname||'').trim().toUpperCase();const fn=String(b.function||'').trim()
      if(!nickname)return json(res,400,{error:'Informe o apelido.'});const existing=await sql`SELECT id FROM operators WHERE lower(nickname)=lower(${nickname}) LIMIT 1`;if(existing.length)return json(res,409,{error:'Esse apelido já está cadastrado.'})
      const code=makeInviteCode();const hash=hashToken(code);const rows=await sql`INSERT INTO operators(name,nickname,password_hash,role,rank,function,active,public_profile,invite_code_hash,invite_expires_at) VALUES(${nickname},${nickname},${await bcrypt.hash(crypto.randomBytes(32).toString('hex'),10)},'operator','Recruta',${fn||null},false,true,${hash},now()+interval '24 hours') RETURNING id,nickname,function,invite_expires_at`;return json(res,201,{operator:rows[0],code})
    }
    if(action==='revoke-invite'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);await sql`UPDATE operators SET invite_code_hash=NULL,invite_expires_at=NULL WHERE id=${b.operator_id} AND active=false AND role='operator'`;return json(res,200,{ok:true})}
    if(action==='rank'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const op=(await sql`SELECT id,rank,elo FROM operators WHERE id=${b.operator_id}`)[0];if(!op)return json(res,404,{error:'Operador não encontrado.'});if(!ranks.includes(b.rank))return json(res,400,{error:'Patente inválida.'});await sql`UPDATE operators SET rank=${b.rank},elo=GREATEST(0,COALESCE(elo,0)+${Number(b.elo_delta||0)}) WHERE id=${op.id}`;await sql`INSERT INTO rank_history(operator_id,old_rank,new_rank,reason,changed_by) VALUES(${op.id},${op.rank},${b.rank},${b.reason||null},${u.id})`;return json(res,200,{ok:true})}
    if(action==='penalty'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const days=Math.max(0,Number(b.days||0));if(days)await sql`UPDATE operators SET suspension_until=CURRENT_DATE + ${days}::int WHERE id=${b.operator_id}`;else await sql`UPDATE operators SET suspension_until=NULL WHERE id=${b.operator_id}`;await sql`INSERT INTO penalties(operator_id,type,reason,days,ends_at) VALUES(${b.operator_id},${b.type||'suspensão'},${b.reason||null},${days},${days?new Date(Date.now()+days*86400000):null})`;return json(res,200,{ok:true})}
    if(action==='attendance'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);await sql`UPDATE game_participants SET present=${!!b.present},response=CASE WHEN ${!!b.present} THEN 'attended' ELSE response END,absence_processed=false WHERE game_id=${b.game_id} AND operator_id=${b.operator_id}`;return json(res,200,{ok:true})}
    if(action==='visitor-decision'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const status=b.status==='approved'?'approved':'rejected';await sql`UPDATE visitor_requests SET status=${status},approved_by=${status==='approved'?u.id:null},decided_at=now() WHERE id=${b.id}`;return json(res,200,{ok:true})}
    if(action==='assign-visitor'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);await sql`INSERT INTO visitor_game_assignments(visitor_request_id,game_id,notes) VALUES(${b.visitor_request_id},${b.game_id},${b.notes||null}) ON CONFLICT(visitor_request_id,game_id) DO UPDATE SET notes=EXCLUDED.notes`;return json(res,200,{ok:true})}

    return json(res,404,{error:'Ação não encontrada.'})
  }catch(e){console.error(e);return json(res,500,{error:e?.message||'Erro interno.'})}
}
