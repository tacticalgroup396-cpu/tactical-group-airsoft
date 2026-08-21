import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'

const sql=neon(process.env.DATABASE_URL)
const COOKIE='tg_session'
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store,max-age=0');res.end(JSON.stringify(data))}
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const hash=t=>crypto.createHash('sha256').update(t).digest('hex')
const body=req=>new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>8_000_000)reject(new Error('Payload muito grande.'))});req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)})
async function user(req){const token=cookies(req)[COOKIE];if(!token)return null;const rows=await sql`SELECT o.* FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`;return rows[0]||null}
async function auth(req,res,role='operator'){const u=await user(req);if(!u){json(res,401,{error:'Faça login.'});return null}if(role==='commander'&&u.role!=='commander'){json(res,403,{error:'Acesso restrito ao comandante.'});return null}if(role==='operator'&&!['operator','commander'].includes(u.role)){json(res,403,{error:'Acesso restrito.'});return null}return u}
async function ensure(){
  const cols=[['mission_objective','TEXT'],['team_a_name','TEXT'],['team_b_name','TEXT'],['winning_team','TEXT'],['team_a_leader_id','UUID'],['team_b_leader_id','UUID'],['team_a_medic_id','UUID'],['team_b_medic_id','UUID']]
  for(const [c,t] of cols)await sql.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS ${c} ${t}`)
  await sql`CREATE TABLE IF NOT EXISTS game_mission_photos (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,image_data TEXT NOT NULL,caption TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
  await sql`CREATE TABLE IF NOT EXISTS game_mission_stats (game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,team_name TEXT,kills INTEGER NOT NULL DEFAULT 0,deaths INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(game_id,operator_id))`
}
const opRow=o=>({id:o.id,name:o.name,nickname:o.nickname,rank:o.rank,function:o.function||'Operador',photo_url:o.photo_url||null,elo_level:o.elo_level||7,bio:o.bio||'',age:o.age||null,birth_date:o.birth_date||null,airsoft_years:o.airsoft_years||null,play_style:o.play_style||'',primary_replica:o.primary_replica||'',secondary_replica:o.secondary_replica||'',equipment_summary:o.equipment_summary||''})
export default async function handler(req,res){try{
  await ensure();const url=new URL(req.url,'http://localhost');const action=url.searchParams.get('action')||''
  if(action==='operator-rosters'){
    const u=await auth(req,res);if(!u)return
    const games=await sql`SELECT id,title,game_date,game_time,status FROM games WHERE game_date>=CURRENT_DATE-interval '1 day' ORDER BY game_date,game_time NULLS LAST`
    const ops=await sql`SELECT id,name,nickname,rank,function,photo_url,elo_level FROM operators WHERE active=true ORDER BY nickname`
    const out=[]
    for(const g of games){const rows=await sql`SELECT gp.operator_id,gp.response,gp.loadout,o.name,o.nickname,o.rank,o.function,o.photo_url,o.elo_level FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=${g.id} AND o.active=true`;const by=new Map(rows.map(r=>[String(r.operator_id),r]));const going=[],notGoing=[],pending=[];for(const o of ops){const r=by.get(String(o.id));const item={...opRow(o),response:r?.response||'pending',loadout:r?.loadout||null};if(item.response==='going')going.push(item);else if(item.response==='not_going')notGoing.push(item);else pending.push(item)}out.push({...g,going,not_going:notGoing,pending})}
    return json(res,200,{games:out})
  }
  if(action==='operator-profile'){
    const u=await auth(req,res);if(!u)return;const id=url.searchParams.get('id');if(!id)return json(res,400,{error:'Operador não informado.'})
    const o=(await sql`SELECT * FROM operators WHERE id=${id} AND active=true LIMIT 1`)[0];if(!o)return json(res,404,{error:'Operador não encontrado.'})
    const equipment=await sql`SELECT id,category,name,details,photo_url FROM operator_equipment WHERE operator_id=${id} ORDER BY category,name`;const gallery=await sql`SELECT id,image_data,caption FROM operator_gallery WHERE operator_id=${id} ORDER BY created_at DESC LIMIT 24`
    return json(res,200,{operator:opRow(o),equipment,gallery})
  }
  if(action==='team-list'){
    const u=await auth(req,res);if(!u)return;const ops=await sql`SELECT * FROM operators WHERE active=true ORDER BY CASE WHEN role='commander' THEN 0 ELSE 1 END,nickname`;return json(res,200,{operators:ops.map(opRow)})
  }
  if(action==='commander-missions'){
    const u=await auth(req,res,'commander');if(!u)return;const games=await sql`SELECT * FROM games ORDER BY game_date DESC,game_time DESC NULLS LAST LIMIT 100`;const ops=await sql`SELECT id,name,nickname,rank,function,photo_url FROM operators WHERE active=true ORDER BY nickname`;const photos=await sql`SELECT * FROM game_mission_photos ORDER BY created_at DESC`;const stats=await sql`SELECT s.*,o.nickname,o.name,o.rank,o.photo_url FROM game_mission_stats s JOIN operators o ON o.id=s.operator_id ORDER BY o.nickname`;return json(res,200,{games,operators:ops,photos,stats})
  }
  if(action==='create-game-mission'&&req.method==='POST'){
    const u=await auth(req,res,'commander');if(!u)return;const b=await body(req);if(!b.title||!b.game_date)return json(res,400,{error:'Título e data são obrigatórios.'});const rows=await sql`INSERT INTO games(title,game_date,game_time,location,status,notes,description,briefing,commander_id,mission_objective,team_a_name,team_b_name,team_a_leader_id,team_b_leader_id,team_a_medic_id,team_b_medic_id) VALUES(${String(b.title).trim()},${b.game_date},${b.game_time||null},${b.location||'Não informado'},${b.status||'confirmado'},${b.notes||null},${b.description||null},${b.briefing||null},${u.id},${b.mission_objective||null},${b.team_a_name||null},${b.team_b_name||null},${b.team_a_leader_id||null},${b.team_b_leader_id||null},${b.team_a_medic_id||null},${b.team_b_medic_id||null}) RETURNING *`;return json(res,201,{game:rows[0]})
  }
  if(action==='save-mission'&&req.method==='POST'){
    const u=await auth(req,res,'commander');if(!u)return;const b=await body(req);if(!b.game_id)return json(res,400,{error:'Jogo não informado.'});await sql`UPDATE games SET mission_objective=${b.mission_objective||null},team_a_name=${b.team_a_name||null},team_b_name=${b.team_b_name||null},winning_team=${b.winning_team||null},team_a_leader_id=${b.team_a_leader_id||null},team_b_leader_id=${b.team_b_leader_id||null},team_a_medic_id=${b.team_a_medic_id||null},team_b_medic_id=${b.team_b_medic_id||null} WHERE id=${b.game_id}`;for(const s of Array.isArray(b.stats)?b.stats:[]){if(!s.operator_id)continue;await sql`INSERT INTO game_mission_stats(game_id,operator_id,team_name,kills,deaths) VALUES(${b.game_id},${s.operator_id},${s.team_name||null},${Math.max(0,Number(s.kills)||0)},${Math.max(0,Number(s.deaths)||0)}) ON CONFLICT(game_id,operator_id) DO UPDATE SET team_name=EXCLUDED.team_name,kills=EXCLUDED.kills,deaths=EXCLUDED.deaths`}return json(res,200,{ok:true})
  }
  if(action==='mission-photo'&&req.method==='POST'){
    const u=await auth(req,res,'commander');if(!u)return;const b=await body(req);const img=String(b.image_data||'');if(!b.game_id||!img.startsWith('data:image/'))return json(res,400,{error:'Jogo e foto são obrigatórios.'});if(img.length>6_500_000)return json(res,400,{error:'Imagem muito grande.'});await sql`INSERT INTO game_mission_photos(game_id,image_data,caption) VALUES(${b.game_id},${img},${b.caption||null})`;return json(res,201,{ok:true})
  }
  return json(res,404,{error:'Ação não encontrada.'})
}catch(e){console.error('OPERATIONS API',e);return json(res,500,{error:e?.message||'Erro interno.'})}}
