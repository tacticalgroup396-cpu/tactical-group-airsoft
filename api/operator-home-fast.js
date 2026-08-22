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

    const [games,responsible,financeRows]=await Promise.all([
      sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.description,g.notes,g.briefing,g.min_players,g.max_players,g.rsvp_deadline_date,g.rsvp_deadline_time,g.rsvp_closed,gf.name field_name,gf.maps_url field_maps_url,COALESCE(me.response,'pending') response,me.loadout,me.responded_at,
        COALESCE((SELECT json_agg(json_build_object('id',o.id,'name',o.name,'nickname',o.nickname,'rank',o.rank,'function',o.function,'elo_level',o.elo_level,'photo_url',CASE WHEN o.photo_url LIKE 'data:image/%' THEN NULL ELSE o.photo_url END,'birth_date',o.birth_date,'age',o.age,'response',gp.response,'loadout',gp.loadout) ORDER BY o.nickname) FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=g.id AND gp.response='going' AND o.active=true),'[]'::json) participants,
        COALESCE((SELECT json_agg(json_build_object('id',o.id,'name',o.name,'nickname',o.nickname,'rank',o.rank,'function',o.function,'elo_level',o.elo_level,'photo_url',CASE WHEN o.photo_url LIKE 'data:image/%' THEN NULL ELSE o.photo_url END,'birth_date',o.birth_date,'age',o.age,'response',gp.response,'loadout',gp.loadout) ORDER BY o.nickname) FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=g.id AND gp.response='not_going' AND o.active=true),'[]'::json) not_going_participants,
        COALESCE((SELECT json_agg(json_build_object('id',o.id,'name',o.name,'nickname',o.nickname,'rank',o.rank,'function',o.function,'elo_level',o.elo_level,'photo_url',CASE WHEN o.photo_url LIKE 'data:image/%' THEN NULL ELSE o.photo_url END,'birth_date',o.birth_date,'age',o.age,'response',gp.response,'loadout',gp.loadout) ORDER BY o.nickname) FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=g.id AND gp.response='pending' AND o.active=true),'[]'::json) pending_participants
        FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id LEFT JOIN game_participants me ON me.game_id=g.id AND me.operator_id=${u.id} WHERE g.game_date>=CURRENT_DATE-interval '1 day' AND COALESCE(g.status,'')<>'cancelado' ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 3`,
      sql`SELECT id,name,nickname,rank,function,elo_level,birth_date,age,CASE WHEN photo_url LIKE 'data:image/%' THEN NULL ELSE photo_url END photo_url FROM operators WHERE guardian_operator_id=${u.id} AND active=true ORDER BY nickname`,
      sql`SELECT fs.monthly_fee,fs.due_day,fs.grace_days,fs.currency,fs.active,fs.instagram_url,fs.pix_key,fs.pix_holder,d.id due_id,d.amount due_amount,d.due_date,d.status due_status,to_char(d.period,'YYYY-MM') period_label FROM finance_settings fs LEFT JOIN membership_dues d ON d.operator_id=${u.id} AND d.period=date_trunc('month',CURRENT_DATE)::date WHERE fs.id=1 LIMIT 1`
    ])

    const f=financeRows[0]||{};const settings={monthly_fee:Number(f.monthly_fee)||0,due_day:Number(f.due_day)||10,grace_days:Number(f.grace_days)||0,currency:f.currency||'BRL',active:!!f.active,instagram_url:f.instagram_url||null,pix_key:f.pix_key||null,pix_holder:f.pix_holder||null};
    const finance=settings.active&&f.due_id?{id:f.due_id,amount:f.due_amount,due_date:f.due_date,status:f.due_status,period_label:f.period_label}:null
    return json(res,200,{user:{...u,is_minor:isMinor(u.birth_date)},responsibleFor:responsible.map(person),games,finance,financeSettings:settings,instagram_url:settings.instagram_url})
  }catch(e){console.error('operator-home-fast',e);return json(res,500,{error:e?.message||'Erro ao carregar a área do operador.'})}
}
