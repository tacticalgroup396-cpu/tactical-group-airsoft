import { neon } from '@neondatabase/serverless'
import { put, del } from '@vercel/blob'
import crypto from 'node:crypto'

const sql=neon(process.env.DATABASE_URL)
const COOKIE='tg_session'
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(data))}
const cookies=req=>Object.fromEntries((req.headers?.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const hash=t=>crypto.createHash('sha256').update(t).digest('hex')
const body=req=>new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>5_000_000)reject(new Error('Payload muito grande.'))});req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)})
let gameMediaSchemaReady=false

async function currentUser(req){
  const token=cookies(req)[COOKIE];if(!token)return null
  const rows=await sql`SELECT o.id,o.name,o.nickname,o.role,o.active FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`
  return rows[0]||null
}
async function requireUser(req,res,role='operator'){
  const u=await currentUser(req)
  if(!u){json(res,401,{error:'Faça login novamente.'});return null}
  if(role==='commander'&&u.role!=='commander'){json(res,403,{error:'Acesso restrito ao comandante.'});return null}
  if(role==='operator'&&!['operator','commander'].includes(u.role)){json(res,403,{error:'Acesso restrito.'});return null}
  return u
}
async function ensureGameMediaSchema(){
  if(gameMediaSchemaReady)return
  await sql`ALTER TABLE game_missions ADD COLUMN IF NOT EXISTS team_a_photo_url TEXT`
  await sql`ALTER TABLE game_missions ADD COLUMN IF NOT EXISTS team_b_photo_url TEXT`
  await sql`ALTER TABLE game_missions ADD COLUMN IF NOT EXISTS team_a_photo_caption TEXT`
  await sql`ALTER TABLE game_missions ADD COLUMN IF NOT EXISTS team_b_photo_caption TEXT`
  gameMediaSchemaReady=true
}
function blobToken(){const token=process.env.BLOB_READ_WRITE_TOKEN;if(!token)throw new Error('Vercel Blob ainda não está conectado ao projeto.');return token}
function decodeImage(data){
  const value=String(data||'')
  const m=value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/)
  if(!m)throw new Error('Envie uma imagem válida.')
  const buffer=Buffer.from(m[2],'base64')
  if(!buffer.length||buffer.length>3_500_000)throw new Error('Imagem muito grande. Use uma foto de até 3 MB.')
  const extMap={'image/jpeg':'jpg','image/jpg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif'}
  const ext=extMap[m[1].toLowerCase()]||'jpg'
  return {buffer,contentType:m[1],ext}
}
async function uploadImage(data,folder){
  const {buffer,contentType,ext}=decodeImage(data)
  const pathname=`tactical-group/${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`
  const result=await put(pathname,buffer,{access:'public',contentType,addRandomSuffix:false,token:blobToken()})
  return result.url
}
function isBlobUrl(value){return /^https:\/\/[^/]+\.blob\.vercel-storage\.com\//i.test(String(value||''))}
async function cleanupBlob(value){if(!isBlobUrl(value))return;try{await del(value,{token:blobToken()})}catch(e){console.warn('blob cleanup',e?.message||e)}}
function cleanText(v,max=4000){const s=String(v||'').trim();return s?s.slice(0,max):null}

export default async function handler(req,res){
  try{
    if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}
    const url=new URL(req.url,'http://localhost')
    const action=url.searchParams.get('action')||'health'
    if(action==='health'&&req.method==='GET')return json(res,200,{ok:true,blob_enabled:!!process.env.BLOB_READ_WRITE_TOKEN})

    if(action==='history-extras'&&req.method==='GET'){
      await ensureGameMediaSchema()
      const games=await sql`SELECT g.id,gm.team_a_photo_url,gm.team_b_photo_url,gm.team_a_photo_caption,gm.team_b_photo_caption,gm.winning_team,gm.team_a_name,gm.team_b_name,gm.team_a_wins,gm.team_b_wins FROM games g LEFT JOIN game_missions gm ON gm.game_id=g.id WHERE g.status='finalizado' OR g.completed_at IS NOT NULL ORDER BY COALESCE(g.completed_at,g.game_date::timestamp) DESC LIMIT 80`
      const visitors=await sql`SELECT r.game_id,r.team_code,vr.id,COALESCE(NULLIF(vr.nickname,''),vr.name) nickname,'VISITANTE'::text rank,'Visitante'::text function,'/logo.webp'::text photo_url,true visitor FROM visitor_game_rsvps r JOIN visitor_requests vr ON vr.id=r.visitor_request_id JOIN games g ON g.id=r.game_id WHERE (g.status='finalizado' OR g.completed_at IS NOT NULL) AND r.team_code IN ('A','B') AND COALESCE(vr.status,'pending') IN ('approved','accepted') ORDER BY r.game_id,COALESCE(NULLIF(vr.nickname,''),vr.name)`
      return json(res,200,{games,visitors})
    }

    if(action==='upload-photo'&&req.method==='POST'){
      const u=await requireUser(req,res);if(!u)return
      const b=await body(req),old=(await sql`SELECT photo_url FROM operators WHERE id=${u.id} LIMIT 1`)[0]?.photo_url||null
      const photoUrl=await uploadImage(b.image_data,`operators/${u.id}/profile`)
      await sql`UPDATE operators SET photo_url=${photoUrl} WHERE id=${u.id}`
      await cleanupBlob(old)
      return json(res,200,{ok:true,photo_url:photoUrl})
    }

    if(action==='add-gallery'&&req.method==='POST'){
      const u=await requireUser(req,res);if(!u)return
      const b=await body(req),photoUrl=await uploadImage(b.image_data,`operators/${u.id}/gallery`)
      const rows=await sql`INSERT INTO operator_gallery(operator_id,image_data,caption) VALUES(${u.id},${photoUrl},${cleanText(b.caption,160)}) RETURNING id,image_data,caption,created_at`
      return json(res,201,{ok:true,item:rows[0]})
    }

    if(action==='delete-gallery'&&req.method==='POST'){
      const u=await requireUser(req,res);if(!u)return
      const b=await body(req),row=(await sql`SELECT id,image_data FROM operator_gallery WHERE id=${b.id} AND operator_id=${u.id} LIMIT 1`)[0]
      if(row){await sql`DELETE FROM operator_gallery WHERE id=${row.id}`;await cleanupBlob(row.image_data)}
      return json(res,200,{ok:true})
    }

    if(action==='equipment'&&req.method==='POST'){
      const u=await requireUser(req,res);if(!u)return
      const b=await body(req);if(!String(b.name||'').trim())return json(res,400,{error:'Nome do equipamento é obrigatório.'})
      const photoUrl=b.photo_url?await uploadImage(b.photo_url,`operators/${u.id}/equipment`):null
      const rows=await sql`INSERT INTO operator_equipment(operator_id,category,name,details,public_visible,photo_url) VALUES(${u.id},${cleanText(b.category,80)||'Equipamento'},${String(b.name).trim().slice(0,160)},${cleanText(b.details,1000)},${b.public_visible!==false},${photoUrl}) RETURNING id,category,name,details,public_visible,photo_url`
      return json(res,201,{ok:true,item:rows[0]})
    }

    if(action==='delete-equipment'&&req.method==='POST'){
      const u=await requireUser(req,res);if(!u)return
      const b=await body(req),row=(await sql`SELECT id,photo_url FROM operator_equipment WHERE id=${b.id} AND operator_id=${u.id} LIMIT 1`)[0]
      if(row){await sql`DELETE FROM operator_equipment WHERE id=${row.id}`;await cleanupBlob(row.photo_url)}
      return json(res,200,{ok:true})
    }

    if(action==='finish-game'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return
      await ensureGameMediaSchema()
      const b=await body(req),g=(await sql`SELECT id,title,match_photo_url FROM games WHERE id=${b.game_id} LIMIT 1`)[0]
      if(!g)return json(res,404,{error:'Jogo não encontrado.'})
      const old=(await sql`SELECT team_a_photo_url,team_b_photo_url FROM game_missions WHERE game_id=${g.id} LIMIT 1`)[0]||{}
      const image=String(b.image_data||''),aImage=String(b.team_a_image_data||''),bImage=String(b.team_b_image_data||'')
      const photoUrl=image?await uploadImage(image,`games/${g.id}/match`):null
      const teamAPhoto=aImage?await uploadImage(aImage,`games/${g.id}/team-a`):null
      const teamBPhoto=bImage?await uploadImage(bImage,`games/${g.id}/team-b`):null
      await sql`UPDATE games SET status='finalizado',completed_at=COALESCE(completed_at,now()),match_photo_url=COALESCE(${photoUrl},match_photo_url) WHERE id=${g.id}`
      await sql`INSERT INTO game_missions(game_id,team_a_photo_url,team_b_photo_url,team_a_photo_caption,team_b_photo_caption,created_by,updated_by) VALUES(${g.id},${teamAPhoto},${teamBPhoto},${cleanText(b.team_a_caption,180)},${cleanText(b.team_b_caption,180)},${u.id},${u.id}) ON CONFLICT(game_id) DO UPDATE SET team_a_photo_url=COALESCE(EXCLUDED.team_a_photo_url,game_missions.team_a_photo_url),team_b_photo_url=COALESCE(EXCLUDED.team_b_photo_url,game_missions.team_b_photo_url),team_a_photo_caption=COALESCE(EXCLUDED.team_a_photo_caption,game_missions.team_a_photo_caption),team_b_photo_caption=COALESCE(EXCLUDED.team_b_photo_caption,game_missions.team_b_photo_caption),updated_by=EXCLUDED.updated_by,updated_at=now()`
      if(photoUrl)await sql`INSERT INTO match_photos(game_id,image_data,caption,created_by) VALUES(${g.id},${photoUrl},${cleanText(b.caption,180)||'Foto da partida'},${u.id}) ON CONFLICT(game_id) DO UPDATE SET image_data=EXCLUDED.image_data,caption=EXCLUDED.caption,created_by=EXCLUDED.created_by,created_at=now()`
      if(photoUrl)await cleanupBlob(g.match_photo_url)
      if(teamAPhoto)await cleanupBlob(old.team_a_photo_url)
      if(teamBPhoto)await cleanupBlob(old.team_b_photo_url)
      return json(res,200,{ok:true,match_photo_url:photoUrl||g.match_photo_url||null,team_a_photo_url:teamAPhoto||old.team_a_photo_url||null,team_b_photo_url:teamBPhoto||old.team_b_photo_url||null})
    }

    if(action==='mission-save'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return
      const b=await body(req),gameId=String(b.game_id||'');if(!gameId)return json(res,400,{error:'Jogo não informado.'})
      const game=(await sql`SELECT id FROM games WHERE id=${gameId} LIMIT 1`)[0];if(!game)return json(res,404,{error:'Jogo não encontrado.'})
      const oldMission=(await sql`SELECT mission_photo FROM game_missions WHERE game_id=${gameId} LIMIT 1`)[0]||null
      const incoming=String(b.mission_photo||''),photoUrl=incoming?await uploadImage(incoming,`games/${gameId}/mission`):null
      const a=cleanText(b.team_a_name,80)||'Equipe A',bb=cleanText(b.team_b_name,80)||'Equipe B'
      await sql`INSERT INTO game_missions(game_id,team_a_name,team_b_name,mission_objective,mission_rules,respawn_rules,mission_duration,secondary_objectives,winning_team,mission_photo,created_by,updated_by)
        VALUES(${gameId},${a},${bb},${cleanText(b.mission_objective)},${cleanText(b.mission_rules)},${cleanText(b.respawn_rules)},${cleanText(b.mission_duration,120)},${cleanText(b.secondary_objectives)},${cleanText(b.winning_team,30)},${photoUrl},${u.id},${u.id})
        ON CONFLICT(game_id) DO UPDATE SET team_a_name=EXCLUDED.team_a_name,team_b_name=EXCLUDED.team_b_name,mission_objective=EXCLUDED.mission_objective,mission_rules=EXCLUDED.mission_rules,respawn_rules=EXCLUDED.respawn_rules,mission_duration=EXCLUDED.mission_duration,secondary_objectives=EXCLUDED.secondary_objectives,winning_team=EXCLUDED.winning_team,mission_photo=COALESCE(EXCLUDED.mission_photo,game_missions.mission_photo),updated_by=EXCLUDED.updated_by,updated_at=now()`
      const allowed=await sql`SELECT gp.operator_id FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=${gameId} AND gp.response='going' AND o.active=true`
      const allowedSet=new Set(allowed.map(x=>String(x.operator_id)))
      await sql`DELETE FROM game_mission_members WHERE game_id=${gameId} AND operator_id NOT IN (SELECT gp.operator_id FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=${gameId} AND gp.response='going' AND o.active=true)`
      const members=Array.isArray(b.members)?b.members:[]
      for(const m of members){
        const operatorId=String(m.operator_id||'');if(!allowedSet.has(operatorId))continue
        const team=['A','B','RESERVE'].includes(m.team_code)?m.team_code:null
        const role=['operator','leader','medic'].includes(m.mission_role)?m.mission_role:'operator'
        const kills=Math.max(0,Math.min(999,Number(m.kills)||0)),deaths=Math.max(0,Math.min(999,Number(m.deaths)||0))
        await sql`INSERT INTO game_mission_members(game_id,operator_id,team_code,mission_role,kills,deaths) VALUES(${gameId},${operatorId},${team},${role},${kills},${deaths}) ON CONFLICT(game_id,operator_id) DO UPDATE SET team_code=EXCLUDED.team_code,mission_role=EXCLUDED.mission_role,kills=EXCLUDED.kills,deaths=EXCLUDED.deaths,updated_at=now()`
      }
      if(photoUrl)await cleanupBlob(oldMission?.mission_photo)
      return json(res,200,{ok:true,mission_photo:photoUrl||oldMission?.mission_photo||null})
    }

    return json(res,404,{error:'Ação de mídia não encontrada.'})
  }catch(e){console.error('media',e);return json(res,500,{error:e?.message||'Erro ao salvar arquivo.'})}
}
