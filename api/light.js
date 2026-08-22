import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'

const sql=neon(process.env.DATABASE_URL)
const COOKIE='tg_session'
const ranks=['Recruta','Soldado','Cabo','3º Sargento','2º Sargento','1º Sargento','Subtenente','Aspirante','Tenente','Capitão','Major','Tenente-Coronel','Coronel']

const hash=t=>crypto.createHash('sha256').update(t).digest('hex')
const cookies=req=>Object.fromEntries((req.headers?.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const body=req=>new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>250000)reject(new Error('Payload muito grande.'))});req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)})
function json(res,status,data,cache='no-store, max-age=0'){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control',cache);res.end(JSON.stringify(data))}
const eloNames={1:'Diamante',2:'Esmeralda',3:'Platina',4:'Ouro',5:'Prata',6:'Bronze',7:'Ferro'}
const clampElo=v=>Math.min(7,Math.max(1,Number(v)||7))
const publicOp=o=>({id:o.id,name:o.name,nickname:o.nickname,rank:o.rank,function:o.function||'Operador',games_count:o.games_count||0,absences:o.absences||0,photo_url:o.photo_url||null,bio:o.bio||'',equipment_summary:o.equipment_summary||'',elo:o.elo||0,elo_level:clampElo(o.elo_level),elo_label:eloNames[clampElo(o.elo_level)],age:o.age??null,birth_date:o.birth_date||null,blood_type:o.blood_type||null,airsoft_years:o.airsoft_years??null,play_style:o.play_style||'',primary_replica:o.primary_replica||'',secondary_replica:o.secondary_replica||''})

async function currentUser(req){
  const token=cookies(req)[COOKIE];if(!token)return null
  const rows=await sql`SELECT o.id,o.name,o.nickname,o.email,o.role,o.rank,o.function,o.games_count,o.absences,o.elo,o.elo_level,o.suspension_until,o.active,o.age,o.birth_date,o.blood_type,o.airsoft_years,o.play_style,o.primary_replica,o.secondary_replica,o.bio,o.equipment_summary,o.public_profile,o.guardian_operator_id,o.is_primary_commander,o.last_promotion_period,CASE WHEN o.photo_url LIKE 'data:image/%' THEN NULL ELSE o.photo_url END photo_url FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`
  return rows[0]||null
}
async function requireUser(req,res,role='operator'){
  const u=await currentUser(req);if(!u){json(res,401,{error:'Faça login.'});return null}
  if(role==='commander'&&u.role!=='commander'){json(res,403,{error:'Acesso restrito ao comandante.'});return null}
  if(role==='operator'&&!['operator','commander'].includes(u.role)){json(res,403,{error:'Acesso restrito.'});return null}
  return u
}
async function settings(){return (await sql`SELECT monthly_fee,due_day,grace_days,currency,active,instagram_url,pix_key,pix_holder FROM finance_settings WHERE id=1 LIMIT 1`)[0]||{monthly_fee:0,due_day:10,grace_days:0,currency:'BRL',active:false,instagram_url:null}}
async function ensureCurrentDues(){
  const s=await settings();const period=(await sql`SELECT date_trunc('month',CURRENT_DATE)::date p`)[0].p
  const due=(await sql`SELECT make_date(EXTRACT(YEAR FROM ${period}::date)::int,EXTRACT(MONTH FROM ${period}::date)::int,${Math.max(1,Math.min(28,Number(s.due_day||10)))})::date d`)[0].d
  await sql`INSERT INTO membership_dues(operator_id,period,amount,due_date) SELECT id,${period},${Number(s.monthly_fee||0)},${due} FROM operators WHERE active=true AND role='operator' ON CONFLICT(operator_id,period) DO UPDATE SET amount=EXCLUDED.amount,due_date=EXCLUDED.due_date WHERE membership_dues.status='pending'`
  if(Number(s.monthly_fee)>0)await sql`UPDATE membership_dues SET status='overdue' WHERE status='pending' AND CURRENT_DATE>due_date+(COALESCE(${Number(s.grace_days||0)},0)||' days')::interval`
}

async function publicData(res){
  const [operators,games,site,completed]=await Promise.all([
    sql`SELECT id,name,nickname,rank,function,games_count,absences,bio,equipment_summary,elo,elo_level,age,birth_date,blood_type,airsoft_years,play_style,primary_replica,secondary_replica,CASE WHEN photo_url LIKE 'data:image/%' THEN NULL ELSE photo_url END photo_url FROM operators WHERE active=true AND public_profile=true ORDER BY CASE WHEN role='commander' THEN 0 ELSE 1 END,nickname`,
    sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.description,g.notes,g.briefing,g.max_players,g.min_players,g.rsvp_deadline_date,g.rsvp_deadline_time,gf.name field_name,gf.maps_url field_maps_url,COALESCE((SELECT json_agg(json_build_object('id',o.id,'nickname',o.nickname,'rank',o.rank,'function',o.function,'photo_url',CASE WHEN o.photo_url LIKE 'data:image/%' THEN NULL ELSE o.photo_url END,'loadout',gp.loadout) ORDER BY o.nickname) FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=g.id AND gp.response='going' AND o.active=true),'[]'::json) participants FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id WHERE g.game_date>=CURRENT_DATE AND COALESCE(g.status,'')<>'cancelado' ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 20`,
    settings(),
    sql`SELECT id,title,game_date,game_time,location,status,NULL::text match_photo_url,completed_at FROM games WHERE status='finalizado' ORDER BY game_date DESC,game_time DESC NULLS LAST LIMIT 50`
  ])
  return json(res,200,{operators:operators.map(publicOp),games,completedGames:completed,ranks,instagram_url:site.instagram_url||null},'public, s-maxage=30, stale-while-revalidate=120')
}

async function operatorMe(req,res){const u=await requireUser(req,res);if(!u)return;const s=await settings();return json(res,200,{user:u,instagram_url:s.instagram_url||null})}
async function operatorTeam(req,res){
  const u=await requireUser(req,res);if(!u)return
  const [rows,s]=await Promise.all([
    sql`SELECT id,name,nickname,rank,function,bio,elo_level,birth_date,age,airsoft_years,play_style,primary_replica,secondary_replica,CASE WHEN photo_url LIKE 'data:image/%' THEN NULL ELSE photo_url END photo_url FROM operators WHERE active=true ORDER BY CASE WHEN role='commander' THEN 0 ELSE 1 END,nickname`,settings()
  ])
  return json(res,200,{operators:rows.map(publicOp),instagram_url:s.instagram_url||null})
}
async function operatorDashboard(req,res){
  const u=await requireUser(req,res);if(!u)return
  const [guardianRows,responsibleRows,guardianOptions,games,participants,financeRows,financeSettings]=await Promise.all([
    u.guardian_operator_id?sql`SELECT id,name,nickname,rank,function,birth_date,age,CASE WHEN photo_url LIKE 'data:image/%' THEN NULL ELSE photo_url END photo_url FROM operators WHERE id=${u.guardian_operator_id} AND active=true LIMIT 1`:Promise.resolve([]),
    sql`SELECT id,name,nickname,rank,function,birth_date,age,CASE WHEN photo_url LIKE 'data:image/%' THEN NULL ELSE photo_url END photo_url FROM operators WHERE guardian_operator_id=${u.id} AND active=true ORDER BY nickname`,
    sql`SELECT id,name,nickname,rank,function,birth_date,age,CASE WHEN photo_url LIKE 'data:image/%' THEN NULL ELSE photo_url END photo_url FROM operators WHERE active=true AND id<>${u.id} AND (birth_date IS NULL OR birth_date<=CURRENT_DATE-interval '18 years') ORDER BY CASE WHEN role='commander' THEN 0 ELSE 1 END,nickname`,
    sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.description,g.notes,g.briefing,g.min_players,g.max_players,g.rsvp_deadline_date,g.rsvp_deadline_time,g.rsvp_closed,gf.name field_name,gf.maps_url field_maps_url,COALESCE(gp.response,'pending') response,gp.loadout,gp.responded_at FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id LEFT JOIN game_participants gp ON gp.game_id=g.id AND gp.operator_id=${u.id} WHERE g.game_date>=CURRENT_DATE-interval '1 day' AND COALESCE(g.status,'')<>'cancelado' ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 20`,
    sql`SELECT gp.game_id,gp.response,gp.loadout,o.id,o.name,o.nickname,o.rank,o.function,o.elo_level,CASE WHEN o.photo_url LIKE 'data:image/%' THEN NULL ELSE o.photo_url END photo_url FROM game_participants gp JOIN games g ON g.id=gp.game_id JOIN operators o ON o.id=gp.operator_id WHERE g.game_date>=CURRENT_DATE-interval '1 day' AND COALESCE(g.status,'')<>'cancelado' AND o.active=true ORDER BY g.game_date,o.nickname`,
    sql`SELECT d.*,to_char(d.period,'YYYY-MM') period_label FROM membership_dues d WHERE d.operator_id=${u.id} AND d.period=date_trunc('month',CURRENT_DATE)::date LIMIT 1`,
    settings()
  ])
  const normalized=games.map(g=>{const list=participants.filter(p=>String(p.game_id)===String(g.id)).map(p=>({...publicOp(p),response:p.response,loadout:p.loadout||null}));return {...g,participants:list.filter(p=>p.response==='going'),not_going_participants:list.filter(p=>p.response==='not_going'),pending_participants:list.filter(p=>!p.response||p.response==='pending')}})
  const birth=u.birth_date?String(u.birth_date).slice(0,10):null;const minor=birth?(await sql`SELECT (${birth}::date>CURRENT_DATE-interval '18 years') minor`)[0]?.minor:false
  return json(res,200,{user:{...u,is_minor:!!minor},guardian:guardianRows[0]?publicOp(guardianRows[0]):null,responsibleFor:responsibleRows.map(publicOp),guardianOptions:guardianOptions.map(publicOp),games:normalized,finance:financeRows[0]||null,financeSettings,instagram_url:financeSettings.instagram_url||null})
}

async function commander(req,res){
  const u=await requireUser(req,res,'commander');if(!u)return
  await ensureCurrentDues()
  const [operators,fields,eloSettings,games,history,requests,financeSettings,dues,financeRows,financeTransactions]=await Promise.all([
    sql`SELECT id,name,nickname,role,rank,function,games_count,absences,elo,elo_level,suspension_until,active,email,invite_expires_at,invite_used_at,is_primary_commander,last_promotion_period,CASE WHEN photo_url LIKE 'data:image/%' THEN NULL ELSE photo_url END photo_url FROM operators ORDER BY role DESC,active DESC,nickname`,
    sql`SELECT * FROM game_fields WHERE active=true ORDER BY name`,
    sql`SELECT * FROM elo_settings WHERE id=1 LIMIT 1`,
    sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.description,g.notes,g.briefing,g.min_players,g.max_players,g.elo_reward,g.commander_id,g.field_id,g.rsvp_deadline_date,g.rsvp_deadline_time,g.rsvp_closed,g.rsvp_closed_at,g.completed_at,NULL::text match_photo_url,gf.name field_name,gf.maps_url field_maps_url,count(gp.operator_id) FILTER (WHERE gp.response='going')::int going_count,count(gp.operator_id) FILTER (WHERE gp.response='not_going')::int not_going_count,count(gp.operator_id) FILTER (WHERE gp.response='pending')::int pending_count,count(gp.operator_id)::int participant_count,COALESCE((SELECT json_agg(json_build_object('id',o2.id,'nickname',o2.nickname,'rank',o2.rank,'function',o2.function,'photo_url',CASE WHEN o2.photo_url LIKE 'data:image/%' THEN NULL ELSE o2.photo_url END,'elo_level',o2.elo_level,'response',gp2.response,'loadout',gp2.loadout) ORDER BY CASE gp2.response WHEN 'going' THEN 0 WHEN 'not_going' THEN 1 ELSE 2 END,o2.nickname) FROM game_participants gp2 JOIN operators o2 ON o2.id=gp2.operator_id WHERE gp2.game_id=g.id AND o2.active=true),'[]'::json) participants FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id LEFT JOIN game_participants gp ON gp.game_id=g.id WHERE g.game_date>=CURRENT_DATE GROUP BY g.id,gf.name,gf.maps_url ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 50`,
    sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.description,g.notes,g.briefing,g.completed_at,NULL::text match_photo_url,count(gp.operator_id) FILTER (WHERE gp.response='going')::int going_count,count(gp.operator_id) FILTER (WHERE gp.present=true)::int present_count,count(gp.operator_id) FILTER (WHERE gp.response='going' AND gp.present=false AND gp.absence_processed=true)::int absence_count FROM games g LEFT JOIN game_participants gp ON gp.game_id=g.id WHERE g.game_date<CURRENT_DATE GROUP BY g.id ORDER BY g.game_date DESC,g.game_time DESC NULLS LAST LIMIT 100`,
    sql`SELECT vr.*,greq.title requested_game_title,greq.game_date requested_game_date,COALESCE(json_agg(json_build_object('game_id',vga.game_id,'title',g.title,'game_date',g.game_date,'location',g.location)) FILTER (WHERE vga.id IS NOT NULL),'[]') assignments FROM visitor_requests vr LEFT JOIN games greq ON greq.id=vr.requested_game_id LEFT JOIN visitor_game_assignments vga ON vga.visitor_request_id=vr.id LEFT JOIN games g ON g.id=vga.game_id GROUP BY vr.id,greq.title,greq.game_date ORDER BY vr.created_at DESC LIMIT 50`,
    settings(),
    sql`SELECT d.*,o.nickname,o.rank,o.active,o.email FROM membership_dues d JOIN operators o ON o.id=d.operator_id WHERE d.period=date_trunc('month',CURRENT_DATE)::date ORDER BY CASE d.status WHEN 'overdue' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,o.nickname`,
    sql`SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0)::numeric total_income,COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0)::numeric total_expense,COUNT(*)::int total_count FROM finance_transactions WHERE transaction_date>=date_trunc('month',CURRENT_DATE)::date AND transaction_date<(date_trunc('month',CURRENT_DATE)+INTERVAL '1 month')::date`,
    sql`SELECT * FROM finance_transactions WHERE transaction_date>=date_trunc('month',CURRENT_DATE)::date AND transaction_date<(date_trunc('month',CURRENT_DATE)+INTERVAL '1 month')::date ORDER BY transaction_date DESC,created_at DESC LIMIT 200`
  ])
  return json(res,200,{me:u,operators,games,history,requests,ranks,eloSettings:eloSettings[0]||{},financeSettings,dues,fields,financeLedger:{period:'monthly',summary:financeRows[0],transactions:financeTransactions}})
}

let scoreSchemaReady=false
async function ensureScoreSchema(){if(scoreSchemaReady)return;await sql`CREATE TABLE IF NOT EXISTS operator_game_scores (id BIGSERIAL PRIMARY KEY,operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,score INTEGER NOT NULL DEFAULT 0,level INTEGER NOT NULL DEFAULT 1,kills INTEGER NOT NULL DEFAULT 0,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;await sql`CREATE INDEX IF NOT EXISTS operator_game_scores_best_idx ON operator_game_scores(operator_id,score DESC,level DESC,kills DESC)`;scoreSchemaReady=true}
async function leaderboard(userId){const rows=await sql`WITH best AS (SELECT DISTINCT ON (s.operator_id) s.operator_id,s.score,s.level,s.kills,s.created_at FROM operator_game_scores s ORDER BY s.operator_id,s.score DESC,s.level DESC,s.kills DESC,s.created_at ASC) SELECT b.operator_id,o.nickname,o.rank operator_rank,NULL::text photo_url,b.score,b.level,b.kills,b.created_at FROM best b JOIN operators o ON o.id=b.operator_id WHERE o.active=true ORDER BY b.score DESC,b.level DESC,b.kills DESC,b.created_at ASC LIMIT 20`;const leaders=rows.map((r,i)=>({...r,rank:i+1,score:Number(r.score)||0,level:Number(r.level)||1,kills:Number(r.kills)||0}));const mine=(await sql`SELECT score,level,kills FROM operator_game_scores WHERE operator_id=${userId} ORDER BY score DESC,level DESC,kills DESC,created_at ASC LIMIT 1`)[0];return{leaderboard:leaders,myBest:Number(mine?.score)||0,myBestLevel:Number(mine?.level)||1,myBestKills:Number(mine?.kills)||0}}
async function arena(req,res,save=false){const u=await requireUser(req,res);if(!u)return;await ensureScoreSchema();if(!save){const d=await leaderboard(u.id);return json(res,200,{user:{id:u.id,nickname:u.nickname,rank:u.rank,role:u.role,photo_url:null},...d})}const b=await body(req),score=Math.trunc(Number(b.score)),level=Math.trunc(Number(b.level)),kills=Math.trunc(Number(b.kills));if(!Number.isFinite(score)||!Number.isFinite(level)||!Number.isFinite(kills)||score<0||score>10000000||level<1||level>250||kills<0||kills>100000)return json(res,400,{error:'Resultado inválido.'});if(score>0)await sql`INSERT INTO operator_game_scores(operator_id,score,level,kills) VALUES(${u.id},${score},${level},${kills})`;const d=await leaderboard(u.id),first=d.leaderboard[0]||null;return json(res,200,{ok:true,isPersonalBest:score>0&&score>=d.myBest,isOverallRecord:!!first&&String(first.operator_id)===String(u.id)&&Number(first.score)===score,...d})}

export default async function handler(req,res){
  try{
    if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}
    const action=new URL(req.url,'http://localhost').searchParams.get('action')||'public'
    if(action==='public'&&req.method==='GET')return publicData(res)
    if(action==='op-me'&&req.method==='GET')return operatorMe(req,res)
    if(action==='op-team'&&req.method==='GET')return operatorTeam(req,res)
    if(action==='op-dashboard'&&req.method==='GET')return operatorDashboard(req,res)
    if(action==='commander'&&req.method==='GET')return commander(req,res)
    if(action==='arena-leaderboard'&&req.method==='GET')return arena(req,res,false)
    if(action==='arena-score'&&req.method==='POST')return arena(req,res,true)
    return json(res,404,{error:'Ação leve não encontrada.'})
  }catch(e){console.error('light-api',e);return json(res,500,{error:e?.message||'Erro ao carregar dados.'})}
}
