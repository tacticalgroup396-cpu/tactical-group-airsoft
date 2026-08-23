import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'

const sql=neon(process.env.DATABASE_URL)
const COOKIE='tg_session'
const hash=t=>crypto.createHash('sha256').update(t).digest('hex')
const cookies=req=>Object.fromEntries((req.headers?.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(data))}
const safePhoto=p=>p&&!String(p).startsWith('data:image/')?p:null
const person=o=>({id:o.id,name:o.name,nickname:o.nickname,rank:o.rank,function:o.function||'Operador',photo_url:safePhoto(o.photo_url),elo_level:Number(o.elo_level)||7,birth_date:o.birth_date||null,age:o.age??null})

async function currentUser(req){
  const token=cookies(req)[COOKIE];if(!token)return null
  const rows=await sql`SELECT o.id,o.name,o.nickname,o.role,o.rank,o.function,o.games_count,o.absences,o.elo_level,o.age,o.birth_date,o.guardian_operator_id,o.is_primary_commander,o.photo_url FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`
  return rows[0]||null
}

export default async function handler(req,res){
  try{
    if(req.method!=='GET')return json(res,405,{error:'Método não permitido.'})
    const action=new URL(req.url,'http://localhost').searchParams.get('action')||'dashboard'
    const u=await currentUser(req);if(!u)return json(res,401,{error:'Faça login novamente.'})
    if(!['operator','commander'].includes(u.role))return json(res,403,{error:'Acesso restrito.'})

    if(action==='me'){
      return json(res,200,{user:{...u,photo_url:safePhoto(u.photo_url)},instagram_url:null})
    }

    const [games,roster,responsible,financeRows]=await Promise.all([
      sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.briefing,g.rsvp_closed,gf.name field_name,gf.maps_url field_maps_url,COALESCE(me.response,'pending') response,me.loadout FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id LEFT JOIN game_participants me ON me.game_id=g.id AND me.operator_id=${u.id} WHERE g.game_date>=CURRENT_DATE-interval '1 day' AND COALESCE(g.status,'')<>'cancelado' ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 5`,
      sql`SELECT gp.game_id,gp.response,gp.loadout,o.id,o.name,o.nickname,o.rank,o.function,o.photo_url,o.elo_level FROM game_participants gp JOIN games g ON g.id=gp.game_id JOIN operators o ON o.id=gp.operator_id WHERE g.game_date>=CURRENT_DATE-interval '1 day' AND COALESCE(g.status,'')<>'cancelado' AND o.active=true ORDER BY g.game_date,o.nickname LIMIT 250`,
      sql`SELECT id,name,nickname,rank,function,elo_level,birth_date,age,photo_url FROM operators WHERE guardian_operator_id=${u.id} AND active=true ORDER BY nickname LIMIT 20`,
      sql`SELECT fs.monthly_fee,fs.currency,fs.active,fs.instagram_url,d.id due_id,d.amount,d.due_date,d.status FROM finance_settings fs LEFT JOIN membership_dues d ON d.operator_id=${u.id} AND d.period=date_trunc('month',CURRENT_DATE)::date WHERE fs.id=1 LIMIT 1`
    ])

    const normalizedGames=games.map(g=>{
      const list=roster.filter(p=>String(p.game_id)===String(g.id)).map(p=>({...person(p),response:p.response||'pending',loadout:p.loadout||null}))
      return {...g,participants:list.filter(p=>p.response==='going'),not_going_participants:list.filter(p=>p.response==='not_going'),pending_participants:list.filter(p=>!p.response||p.response==='pending')}
    })
    const f=financeRows[0]||{}
    const financeSettings={monthly_fee:Number(f.monthly_fee)||0,currency:f.currency||'BRL',active:!!f.active,instagram_url:f.instagram_url||null}
    const finance=financeSettings.active&&f.due_id?{id:f.due_id,amount:f.amount,due_date:f.due_date,status:f.status}:null
    return json(res,200,{user:{...u,photo_url:safePhoto(u.photo_url)},games:normalizedGames,responsibleFor:responsible.map(person),guardianOptions:[],guardian:null,finance,financeSettings,instagram_url:financeSettings.instagram_url})
  }catch(e){console.error('operator-home-fast',e);return json(res,500,{error:e?.message||'Erro ao carregar a área do operador.'})}
}
