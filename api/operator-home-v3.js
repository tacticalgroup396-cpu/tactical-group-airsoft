import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'

const sql = neon(process.env.DATABASE_URL)
const COOKIE = 'tg_session'
const hash = t => crypto.createHash('sha256').update(t).digest('hex')
const cookies = req => Object.fromEntries((req.headers?.cookie || '').split(';').filter(Boolean).map(v => { const i=v.indexOf('='); return [v.slice(0,i).trim(), decodeURIComponent(v.slice(i+1))] }))
const json = (res,status,data) => { res.statusCode=status; res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','no-store, max-age=0'); res.end(JSON.stringify(data)) }
const safePhoto = p => p && !String(p).startsWith('data:image/') ? p : null
const op = o => ({id:o.id,name:o.name,nickname:o.nickname,rank:o.rank,function:o.function||'Operador',photo_url:safePhoto(o.photo_url),elo_level:Number(o.elo_level)||7,birth_date:o.birth_date||null,age:o.age??null})

async function me(req){
  const token=cookies(req)[COOKIE]
  if(!token) return null
  const rows=await sql`SELECT o.id,o.name,o.nickname,o.role,o.rank,o.function,o.games_count,o.absences,o.elo_level,o.age,o.birth_date,o.guardian_operator_id,o.is_primary_commander,o.photo_url FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`
  return rows[0]||null
}

export default async function handler(req,res){
  try{
    if(req.method!=='GET') return json(res,405,{error:'Método não permitido.'})
    const u=await me(req)
    if(!u) return json(res,401,{error:'Faça login novamente.'})
    if(!['operator','commander'].includes(u.role)) return json(res,403,{error:'Acesso restrito.'})

    const [games,responsible,financeRows] = await Promise.all([
      sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.briefing,g.rsvp_closed,COALESCE(me.response,'pending') response,me.loadout,
        COALESCE((SELECT json_agg(json_build_object('id',o.id,'nickname',o.nickname,'rank',o.rank,'function',o.function,'photo_url',CASE WHEN o.photo_url LIKE 'data:image/%' THEN NULL ELSE o.photo_url END,'elo_level',o.elo_level) ORDER BY o.nickname) FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=g.id AND gp.response='going' AND o.active=true),'[]'::json) participants,
        COALESCE((SELECT json_agg(json_build_object('id',o.id,'nickname',o.nickname,'rank',o.rank,'function',o.function,'photo_url',CASE WHEN o.photo_url LIKE 'data:image/%' THEN NULL ELSE o.photo_url END,'elo_level',o.elo_level) ORDER BY o.nickname) FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=g.id AND gp.response='not_going' AND o.active=true),'[]'::json) not_going_participants,
        COALESCE((SELECT json_agg(json_build_object('id',o.id,'nickname',o.nickname,'rank',o.rank,'function',o.function,'photo_url',CASE WHEN o.photo_url LIKE 'data:image/%' THEN NULL ELSE o.photo_url END,'elo_level',o.elo_level) ORDER BY o.nickname) FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=g.id AND COALESCE(gp.response,'pending')='pending' AND o.active=true),'[]'::json) pending_participants
      FROM games g LEFT JOIN game_participants me ON me.game_id=g.id AND me.operator_id=${u.id}
      WHERE g.game_date>=CURRENT_DATE-interval '1 day' AND COALESCE(g.status,'')<>'cancelado'
      ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 3`,
      sql`SELECT id,name,nickname,rank,function,elo_level,birth_date,age,photo_url FROM operators WHERE guardian_operator_id=${u.id} AND active=true ORDER BY nickname`,
      sql`SELECT fs.monthly_fee,fs.currency,fs.active,fs.instagram_url,d.id due_id,d.amount,d.due_date,d.status FROM finance_settings fs LEFT JOIN membership_dues d ON d.operator_id=${u.id} AND d.period=date_trunc('month',CURRENT_DATE)::date WHERE fs.id=1 LIMIT 1`
    ])

    const f=financeRows[0]||{}
    const financeSettings={monthly_fee:Number(f.monthly_fee)||0,currency:f.currency||'BRL',active:!!f.active,instagram_url:f.instagram_url||null}
    const finance=financeSettings.active&&f.due_id?{id:f.due_id,amount:f.amount,due_date:f.due_date,status:f.status}:null
    return json(res,200,{user:{...u,photo_url:safePhoto(u.photo_url)},games,responsibleFor:responsible.map(op),guardianOptions:[],guardian:null,finance,financeSettings,instagram_url:financeSettings.instagram_url})
  }catch(e){
    console.error('operator-home-v3',e)
    return json(res,500,{error:e?.message||'Erro ao carregar a área do operador.'})
  }
}
