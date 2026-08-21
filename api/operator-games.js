import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'

const sql = neon(process.env.DATABASE_URL)
const COOKIE = 'tg_session'
const hashToken = t => crypto.createHash('sha256').update(t).digest('hex')
const cookies = req => Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const json = (res,status,data) => { res.statusCode=status; res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','no-store, max-age=0'); res.end(JSON.stringify(data)) }

export default async function handler(req,res){
  try{
    const token=cookies(req)[COOKIE]
    if(!token)return json(res,401,{error:'Faça login para acessar os jogos.'})
    const user=(await sql`SELECT o.id,o.nickname,o.role,o.active FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hashToken(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`)[0]
    if(!user || !['operator','commander'].includes(user.role))return json(res,403,{error:'Acesso restrito.'})

    const activeGames=await sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.description,g.notes,g.briefing,g.min_players,g.max_players,g.rsvp_deadline_date,g.rsvp_deadline_time,g.match_photo_url,g.completed_at,gf.name field_name,gf.address field_address,gf.maps_url field_maps_url FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id WHERE g.game_date>=CURRENT_DATE AND g.completed_at IS NULL AND COALESCE(g.status,'') NOT IN ('cancelado','finalizado') ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 50`
    const finishedGames=await sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.description,g.notes,g.briefing,g.min_players,g.max_players,g.match_photo_url,g.completed_at,gf.name field_name,gf.address field_address,gf.maps_url field_maps_url FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id WHERE g.status='finalizado' OR g.completed_at IS NOT NULL ORDER BY g.game_date DESC,g.game_time DESC NULLS LAST LIMIT 100`
    const operators=await sql`SELECT id,name,nickname,rank,function,photo_url,elo_level,active FROM operators WHERE active=true ORDER BY nickname`

    const build=async(game,finished=false)=>{
      const rows=await sql`SELECT gp.operator_id,gp.response,gp.present,gp.loadout,o.name,o.nickname,o.rank,o.function,o.photo_url,o.elo_level FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=${game.id} AND o.active=true ORDER BY CASE gp.response WHEN 'going' THEN 0 WHEN 'not_going' THEN 1 ELSE 2 END,o.nickname`
      const byId=new Map(rows.map(x=>[String(x.operator_id),x]))
      const going=rows.filter(x=>x.response==='going')
      const notGoing=rows.filter(x=>x.response==='not_going')
      const pending=operators.filter(o=>!byId.has(String(o.id)) || byId.get(String(o.id))?.response==='pending')
      const present=rows.filter(x=>x.present===true || x.present==='true')
      const absent=rows.filter(x=>x.response==='going' && (x.present===false || x.present==='false'))
      const photoRows=await sql`SELECT id,image_data,caption,created_at FROM match_photos WHERE game_id=${game.id} ORDER BY created_at DESC LIMIT 10`
      const photos=photoRows.length?photoRows:(game.match_photo_url?[{id:`game-${game.id}`,image_data:game.match_photo_url,caption:'Foto da partida',created_at:game.completed_at}]:[])
      return {...game,going,not_going:notGoing,pending,present,absent,photos,counts:{going:going.length,not_going:notGoing.length,pending:pending.length,present:present.length}}
    }
    const active=await Promise.all(activeGames.map(g=>build(g,false)))
    const finished=await Promise.all(finishedGames.map(g=>build(g,true)))
    return json(res,200,{active,finished,user})
  }catch(e){console.error('operator-games',e);return json(res,500,{error:e?.message||'Erro ao carregar jogos.'})}
}
