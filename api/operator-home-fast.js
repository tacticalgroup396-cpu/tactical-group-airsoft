import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'

const sql=neon(process.env.DATABASE_URL)
const COOKIE='tg_session'
const hash=t=>crypto.createHash('sha256').update(t).digest('hex')
const cookies=req=>Object.fromEntries((req.headers?.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(data))}
const safePhoto=p=>p&&!String(p).startsWith('data:image/')?p:null
const person=o=>({id:o.id,name:o.name,nickname:o.nickname,rank:o.rank,function:o.function||'Operador',photo_url:safePhoto(o.photo_url),elo_level:Number(o.elo_level)||7,birth_date:o.birth_date||null,age:o.age??null,visitor:!!o.visitor})
const visitorCode=()=>`VIS-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`
let visitorSchemaReady=false
async function ensureVisitorSchema(){if(visitorSchemaReady)return;await sql`ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`;await sql`ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS access_code_hash TEXT`;await sql`ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS access_code_expires_at TIMESTAMPTZ`;await sql`ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS access_code_created_at TIMESTAMPTZ`;await sql`ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS invited_by_operator_id UUID REFERENCES operators(id) ON DELETE SET NULL`;await sql`CREATE TABLE IF NOT EXISTS visitor_game_rsvps (visitor_request_id UUID NOT NULL REFERENCES visitor_requests(id) ON DELETE CASCADE,game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,response TEXT NOT NULL DEFAULT 'pending' CHECK(response IN ('pending','going','not_going')),responded_at TIMESTAMPTZ,team_code TEXT CHECK(team_code IN ('A','B')),PRIMARY KEY(visitor_request_id,game_id))`;visitorSchemaReady=true}
async function currentUser(req){const token=cookies(req)[COOKIE];if(!token)return null;const rows=await sql`SELECT o.id,o.name,o.nickname,o.role,o.rank,o.function,o.games_count,o.absences,o.elo_level,o.age,o.birth_date,o.guardian_operator_id,o.is_primary_commander,o.photo_url FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`;return rows[0]||null}

const alertKind=reason=>{/Vitória no jogo geral/i.test(reason)?'win':/Derrota no jogo geral/i.test(reason)?'loss':/Faltou após marcar Vou/i.test(reason)?'absence':/não respondeu à lista/i.test(reason)?'no_response':'info'}
const alertTitle=kind=>({win:'🏆 Vitória do seu time!',loss:'❌ Derrota do seu time',absence:'⚠️ Você marcou Vou e faltou',no_response:'⏳ Você não respondeu à lista',info:'Atualização de Elo'}[kind]||'Atualização de Elo')

export default async function handler(req,res){
  try{
    const action=new URL(req.url,'http://localhost').searchParams.get('action')||'dashboard',u=await currentUser(req);if(!u)return json(res,401,{error:'Faça login novamente.'});if(!['operator','commander'].includes(u.role))return json(res,403,{error:'Acesso restrito.'})
    if(action==='invite-visitor'&&req.method==='POST'){
      await ensureVisitorSchema();const code=visitorCode(),suffix=code.split('-').pop(),placeholder=`Visitante ${suffix}`
      const vr=(await sql`INSERT INTO visitor_requests(name,nickname,contact,message,status,access_code_hash,access_code_created_at,access_code_expires_at,invited_by_operator_id) VALUES(${placeholder},NULL,'Convite de operador',${`Convidado por @${u.nickname}`},'approved',${hash(code)},now(),now()+interval '30 days',${u.id}) RETURNING id,name,status`)[0]
      return json(res,201,{ok:true,code,expires_in_days:30,visitor:vr,login_path:'/visitante',invited_by:{id:u.id,nickname:u.nickname}})
    }
    if(req.method!=='GET')return json(res,405,{error:'Método não permitido.'})
    if(action==='me')return json(res,200,{user:{...u,photo_url:safePhoto(u.photo_url)},instagram_url:null})
    await ensureVisitorSchema()
    const [games,roster,visitorRoster,responsible,financeRows,alertRows]=await Promise.all([
      sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.description,g.briefing,g.elo_reward,g.rsvp_deadline_date,g.rsvp_deadline_time,g.rsvp_closed,gf.name field_name,gf.maps_url field_maps_url,COALESCE(me.response,'pending') response,me.loadout,
        gm.total_rounds,gm.round_win_elo,gm.winner_elo,gm.loser_penalty,gm.absence_penalty,gm.no_response_penalty,gm.team_a_name,gm.team_b_name,
        gm.mission_objective,gm.mission_rules,gm.secondary_objectives,gm.mission_duration,gm.respawn_rules,gm.mission_photo
        FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id LEFT JOIN game_participants me ON me.game_id=g.id AND me.operator_id=${u.id} LEFT JOIN game_missions gm ON gm.game_id=g.id
        WHERE g.game_date>=CURRENT_DATE-interval '1 day' AND COALESCE(g.status,'')<>'cancelado' ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 8`,
      sql`SELECT gp.game_id,gp.response,gp.loadout,o.id,o.name,o.nickname,o.rank,o.function,o.photo_url,o.elo_level,false visitor FROM game_participants gp JOIN games g ON g.id=gp.game_id JOIN operators o ON o.id=gp.operator_id WHERE g.game_date>=CURRENT_DATE-interval '1 day' AND COALESCE(g.status,'')<>'cancelado' AND o.active=true ORDER BY g.game_date,o.nickname LIMIT 400`,
      sql`SELECT r.game_id,r.response,NULL::jsonb loadout,vr.id,vr.name,COALESCE(NULLIF(vr.nickname,''),vr.name) nickname,'VISITANTE'::text rank,'Visitante'::text function,'/logo.webp'::text photo_url,7::int elo_level,true visitor FROM visitor_game_rsvps r JOIN visitor_requests vr ON vr.id=r.visitor_request_id JOIN games g ON g.id=r.game_id WHERE g.game_date>=CURRENT_DATE-interval '1 day' AND COALESCE(g.status,'')<>'cancelado' AND r.response IN ('going','not_going') AND COALESCE(vr.status,'pending') IN ('approved','accepted') ORDER BY g.game_date,COALESCE(NULLIF(vr.nickname,''),vr.name) LIMIT 200`,
      sql`SELECT id,name,nickname,rank,function,elo_level,birth_date,age,photo_url FROM operators WHERE guardian_operator_id=${u.id} AND active=true ORDER BY nickname LIMIT 20`,
      sql`SELECT fs.monthly_fee,fs.currency,fs.active,fs.instagram_url,d.id due_id,d.amount,d.due_date,d.status FROM finance_settings fs LEFT JOIN membership_dues d ON d.operator_id=${u.id} AND d.period=date_trunc('month',CURRENT_DATE)::date WHERE fs.id=1 LIMIT 1`,
      sql`SELECT eh.id,eh.game_id,eh.old_level,eh.new_level,eh.action,eh.reason,eh.created_at,g.title game_title FROM elo_history eh LEFT JOIN games g ON g.id=eh.game_id WHERE eh.operator_id=${u.id} AND eh.created_at>=now()-interval '45 days' AND (eh.reason ILIKE '%Vitória no jogo geral%' OR eh.reason ILIKE '%Derrota no jogo geral%' OR eh.reason ILIKE '%Faltou após marcar Vou%' OR eh.reason ILIKE '%não respondeu à lista%') ORDER BY eh.created_at DESC LIMIT 12`
    ])
    const allRoster=[...roster,...visitorRoster]
    const normalizedGames=games.map(g=>{const list=allRoster.filter(p=>String(p.game_id)===String(g.id)).map(p=>({...person(p),response:p.response||'pending',loadout:p.loadout||null}));return {...g,total_rounds:Number(g.total_rounds||1),round_win_elo:Number(g.round_win_elo||0),winner_elo:Number(g.winner_elo||0),loser_penalty:Number(g.loser_penalty||0),absence_penalty:Number(g.absence_penalty||0),no_response_penalty:Number(g.no_response_penalty||0),participants:list.filter(p=>p.response==='going'||p.response==='attended'),not_going_participants:list.filter(p=>p.response==='not_going'),pending_participants:list.filter(p=>!p.response||p.response==='pending')}})
    const f=financeRows[0]||{},financeSettings={monthly_fee:Number(f.monthly_fee)||0,currency:f.currency||'BRL',active:!!f.active,instagram_url:f.instagram_url||null},finance=financeSettings.active&&f.due_id?{id:f.due_id,amount:f.amount,due_date:f.due_date,status:f.status}:null
    const gameAlerts=alertRows.map(a=>{const kind=alertKind(String(a.reason||''));return {id:a.id,kind,title:alertTitle(kind),game_id:a.game_id,game_title:a.game_title||'Jogo',reason:a.reason||'',old_level:Number(a.old_level)||7,new_level:Number(a.new_level)||7,created_at:a.created_at}})
    return json(res,200,{user:{...u,photo_url:safePhoto(u.photo_url)},games:normalizedGames,responsibleFor:responsible.map(person),guardianOptions:[],guardian:null,finance,financeSettings,gameAlerts,instagram_url:financeSettings.instagram_url})
  }catch(e){console.error('operator-home-fast',e);return json(res,500,{error:e?.message||'Erro ao carregar a área do operador.'})}
}
