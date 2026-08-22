import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'

const sql=neon(process.env.DATABASE_URL)
const COOKIE='tg_session'
const hash=t=>crypto.createHash('sha256').update(t).digest('hex')
const cookies=req=>Object.fromEntries((req.headers?.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(data))}
const clamp=v=>Math.min(7,Math.max(1,Number(v)||7))
const person=o=>({id:o.id,name:o.name,nickname:o.nickname,rank:o.rank,function:o.function||'Operador',photo_url:o.photo_url||null,elo_level:clamp(o.elo_level),birth_date:o.birth_date||null,age:o.age??null})

async function currentUser(req){
  const token=cookies(req)[COOKIE];if(!token)return null
  const rows=await sql`SELECT o.id,o.name,o.nickname,o.role,o.rank,o.function,o.games_count,o.absences,o.elo_level,o.age,o.birth_date,o.guardian_operator_id,o.is_primary_commander,CASE WHEN o.photo_url LIKE 'data:image/%' THEN NULL ELSE o.photo_url END photo_url FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`
  return rows[0]||null
}

function isMinor(birth){if(!birth)return false;const d=new Date(String(birth).slice(0,10)+'T12:00:00'),n=new Date();let a=n.getFullYear()-d.getFullYear();const m=n.getMonth()-d.getMonth();if(m<0||(m===0&&n.getDate()<d.getDate()))a--;return a<18}

export default async function handler(req,res){
  try{
    if(req.method!=='GET')return json(res,405,{error:'Método não permitido.'})
    const u=await currentUser(req);if(!u)return json(res,401,{error:'Faça login novamente.'})
    if(!['operator','commander'].includes(u.role))return json(res,403,{error:'Acesso restrito.'})

    const [games,participants,responsible,financeRows,settingsRows]=await Promise.all([
      sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.description,g.notes,g.briefing,g.min_players,g.max_players,g.rsvp_deadline_date,g.rsvp_deadline_time,g.rsvp_closed,gf.name field_name,gf.maps_url field_maps_url,COALESCE(me.response,'pending') response,me.loadout,me.responded_at FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id LEFT JOIN game_participants me ON me.game_id=g.id AND me.operator_id=${u.id} WHERE g.game_date>=CURRENT_DATE-interval '1 day' AND COALESCE(g.status,'')<>'cancelado' ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 3`,
      sql`SELECT gp.game_id,gp.response,gp.loadout,o.id,o.name,o.nickname,o.rank,o.function,o.elo_level,CASE WHEN o.photo_url LIKE 'data:image/%' THEN NULL ELSE o.photo_url END photo_url,o.birth_date,o.age FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE o.active=true AND gp.game_id IN (SELECT id FROM games WHERE game_date>=CURRENT_DATE-interval '1 day' AND COALESCE(status,'')<>'cancelado' ORDER BY game_date,game_time NULLS LAST LIMIT 3) ORDER BY gp.game_id,o.nickname`,
      sql`SELECT id,name,nickname,rank,function,elo_level,birth_date,age,CASE WHEN photo_url LIKE 'data:image/%' THEN NULL ELSE photo_url END photo_url FROM operators WHERE guardian_operator_id=${u.id} AND active=true ORDER BY nickname`,
      sql`SELECT d.*,to_char(d.period,'YYYY-MM') period_label FROM membership_dues d WHERE d.operator_id=${u.id} AND d.period=date_trunc('month',CURRENT_DATE)::date LIMIT 1`,
      sql`SELECT monthly_fee,due_day,grace_days,currency,active,instagram_url,pix_key,pix_holder FROM finance_settings WHERE id=1 LIMIT 1`
    ])

    const normalized=games.map(g=>{const list=participants.filter(p=>String(p.game_id)===String(g.id)).map(p=>({...person(p),response:p.response,loadout:p.loadout||null}));return {...g,participants:list.filter(p=>p.response==='going'),not_going_participants:list.filter(p=>p.response==='not_going'),pending_participants:list.filter(p=>!p.response||p.response==='pending')}})
    const settings=settingsRows[0]||{monthly_fee:0,currency:'BRL',active:false,instagram_url:null}
    return json(res,200,{user:{...u,is_minor:isMinor(u.birth_date)},responsibleFor:responsible.map(person),games:normalized,finance:settings.active?(financeRows[0]||null):null,financeSettings:settings,instagram_url:settings.instagram_url||null})
  }catch(e){console.error('operator-home-fast',e);return json(res,500,{error:e?.message||'Erro ao carregar a área do operador.'})}
}
