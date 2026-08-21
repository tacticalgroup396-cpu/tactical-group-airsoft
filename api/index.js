import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import webpush from 'web-push'

const sql = neon(process.env.DATABASE_URL)
const COOKIE = 'tg_session'
const ranks = ['Recruta','Soldado','Cabo','3º Sargento','2º Sargento','1º Sargento','Subtenente','Aspirante','Tenente','Capitão','Major','Tenente-Coronel','Coronel']
let schemaReady = null

const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(data))}
const parseCookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const hashToken=t=>crypto.createHash('sha256').update(t).digest('hex')
const makeInviteCode=()=>`TGA-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
const body=req=>new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>5_000_000){reject(new Error('Payload muito grande.'))}});req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)})

async function ensureSchema(){
  if(!schemaReady){
    schemaReady=(async()=>{
      const cols=[
        ['operators','email','TEXT'],['operators','is_primary_commander','BOOLEAN NOT NULL DEFAULT FALSE'],['operators','last_promotion_period','DATE'],['operators','invite_code_hash','TEXT'],['operators','invite_expires_at','TIMESTAMPTZ'],['operators','invite_used_at','TIMESTAMPTZ'],
        ['operators','age','INTEGER'],['operators','birth_date','DATE'],['operators','blood_type','TEXT'],['operators','airsoft_years','NUMERIC'],['operators','play_style','TEXT'],['operators','primary_replica','TEXT'],['operators','secondary_replica','TEXT'],
        ['operators','absences','INTEGER NOT NULL DEFAULT 0'],['operators','suspension_until','DATE'],['operators','public_profile','BOOLEAN NOT NULL DEFAULT TRUE'],['operators','photo_url','TEXT'],['operators','bio','TEXT'],['operators','equipment_summary','TEXT'],['operators','elo','INTEGER NOT NULL DEFAULT 0'],['operators','elo_level','INTEGER NOT NULL DEFAULT 7'],
        ['games','game_time','TIME'],['games','elo_reward','INTEGER NOT NULL DEFAULT 1'],['games','commander_id','UUID'],['games','min_players','INTEGER NOT NULL DEFAULT 4'],['games','max_players','INTEGER'],['games','rsvp_deadline_date','DATE'],['games','rsvp_deadline_time','TIME'],['games','rsvp_closed','BOOLEAN NOT NULL DEFAULT FALSE'],['games','rsvp_closed_at','TIMESTAMPTZ'],['games','description','TEXT'],['games','briefing','TEXT'],['games','notes','TEXT'],['games','maps_url','TEXT'],['games','field_id','UUID'],['games','match_photo_url','TEXT'],['games','completed_at','TIMESTAMPTZ'],
        ["game_participants","response","TEXT NOT NULL DEFAULT 'pending'"], ["game_participants","elo_awarded","BOOLEAN NOT NULL DEFAULT FALSE"],['game_participants','loadout','JSONB'],['game_participants','responded_at','TIMESTAMPTZ'],['game_participants','absence_processed','BOOLEAN NOT NULL DEFAULT FALSE']
      ]
      for(const [table,col,type] of cols) await sql.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${type}`)
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS operators_email_unique_idx ON operators (lower(email)) WHERE email IS NOT NULL`
      await sql`CREATE INDEX IF NOT EXISTS operators_invite_idx ON operators(invite_code_hash) WHERE invite_code_hash IS NOT NULL`
      await sql`ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS requested_game_id UUID REFERENCES games(id) ON DELETE SET NULL`
      await sql`CREATE TABLE IF NOT EXISTS notifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, link TEXT, read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      await sql`CREATE INDEX IF NOT EXISTS notifications_operator_idx ON notifications(operator_id, created_at DESC)`
      await sql`ALTER TABLE operator_equipment ADD COLUMN IF NOT EXISTS photo_url TEXT`
      await sql`CREATE TABLE IF NOT EXISTS push_subscriptions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE, endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      await sql`CREATE TABLE IF NOT EXISTS game_fields (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL UNIQUE, address TEXT, maps_url TEXT NOT NULL, notes TEXT, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      await sql`CREATE INDEX IF NOT EXISTS game_fields_active_idx ON game_fields(active,name)`
      await sql`CREATE TABLE IF NOT EXISTS operator_gallery (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE, image_data TEXT NOT NULL, caption TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      await sql`CREATE INDEX IF NOT EXISTS operator_gallery_operator_idx ON operator_gallery(operator_id,created_at DESC)`
      await sql`CREATE TABLE IF NOT EXISTS finance_settings (id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), monthly_fee NUMERIC(12,2) NOT NULL DEFAULT 0, due_day INTEGER NOT NULL DEFAULT 10 CHECK (due_day BETWEEN 1 AND 28), grace_days INTEGER NOT NULL DEFAULT 0 CHECK (grace_days BETWEEN 0 AND 30), currency TEXT NOT NULL DEFAULT 'BRL', active BOOLEAN NOT NULL DEFAULT TRUE, instagram_url TEXT, pix_key TEXT, pix_holder TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by UUID REFERENCES operators(id) ON DELETE SET NULL)`
      await sql`ALTER TABLE finance_settings ADD COLUMN IF NOT EXISTS instagram_url TEXT`
      await sql`ALTER TABLE finance_settings ADD COLUMN IF NOT EXISTS pix_key TEXT`
      await sql`ALTER TABLE finance_settings ADD COLUMN IF NOT EXISTS pix_holder TEXT`
      await sql`CREATE TABLE IF NOT EXISTS finance_transactions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), type TEXT NOT NULL CHECK (type IN ('income','expense')), description TEXT NOT NULL, amount NUMERIC(12,2) NOT NULL DEFAULT 0, transaction_date DATE NOT NULL DEFAULT CURRENT_DATE, category TEXT, note TEXT, created_by UUID REFERENCES operators(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      await sql`ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS reference_id UUID`
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS finance_transactions_reference_idx ON finance_transactions(reference_id) WHERE reference_id IS NOT NULL`
      await sql`CREATE INDEX IF NOT EXISTS finance_transactions_date_idx ON finance_transactions(transaction_date DESC)`
      await sql`INSERT INTO finance_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING`
      await sql`UPDATE operators SET elo_level=CASE WHEN elo_level=1 THEN 4 WHEN elo_level=2 THEN 5 WHEN elo_level=3 THEN 6 WHEN elo_level IS NULL OR elo_level<1 OR elo_level>7 THEN 7 ELSE elo_level END`
      await sql`CREATE TABLE IF NOT EXISTS elo_settings (id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id=1), attendance_step INTEGER NOT NULL DEFAULT 1, promote_at_level INTEGER NOT NULL DEFAULT 1, default_level INTEGER NOT NULL DEFAULT 7, absence_penalty_level INTEGER NOT NULL DEFAULT 1, highlander_penalty_level INTEGER NOT NULL DEFAULT 1, misconduct_penalty_level INTEGER NOT NULL DEFAULT 1, highlander_suspension_days INTEGER NOT NULL DEFAULT 1, misconduct_suspension_days INTEGER NOT NULL DEFAULT 0, updated_by UUID REFERENCES operators(id) ON DELETE SET NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      await sql`INSERT INTO elo_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING`
      await sql`UPDATE elo_settings SET default_level=7 WHERE id=1 AND default_level IS NULL`
      await sql`CREATE TABLE IF NOT EXISTS elo_history (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE, game_id UUID REFERENCES games(id) ON DELETE SET NULL, old_level INTEGER, new_level INTEGER, action TEXT NOT NULL, reason TEXT, changed_by UUID REFERENCES operators(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      await sql`CREATE INDEX IF NOT EXISTS elo_history_operator_idx ON elo_history(operator_id, created_at DESC)`
      await sql`CREATE TABLE IF NOT EXISTS match_photos (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), game_id UUID NOT NULL UNIQUE REFERENCES games(id) ON DELETE CASCADE, image_data TEXT NOT NULL, caption TEXT, created_by UUID REFERENCES operators(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      await sql`CREATE INDEX IF NOT EXISTS games_completed_idx ON games(completed_at DESC)`
      await sql`CREATE TABLE IF NOT EXISTS membership_dues (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE, period DATE NOT NULL, amount NUMERIC(12,2) NOT NULL DEFAULT 0, due_date DATE NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','waived','overdue')), paid_at TIMESTAMPTZ, payment_note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(operator_id, period))`
      await sql`CREATE INDEX IF NOT EXISTS membership_dues_operator_idx ON membership_dues(operator_id, period DESC)`
      await sql`CREATE INDEX IF NOT EXISTS membership_dues_status_idx ON membership_dues(status, due_date)`
      await sql`UPDATE operators SET is_primary_commander=true WHERE id=(SELECT id FROM operators WHERE role='commander' ORDER BY created_at ASC NULLS LAST, nickname ASC LIMIT 1) AND NOT EXISTS (SELECT 1 FROM operators WHERE role='commander' AND is_primary_commander=true)`
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
async function requireUser(req,res,role){const u=await userFromSession(req);if(!u){json(res,401,{error:'Faça login.'});return null}if(role==='operator' && !['operator','commander'].includes(u.role)){json(res,403,{error:'Acesso restrito.'});return null}if(role==='commander' && !['commander'].includes(u.role)){json(res,403,{error:'Acesso restrito.'});return null}return u}
const eloNames={1:'Diamante',2:'Esmeralda',3:'Platina',4:'Ouro',5:'Prata',6:'Bronze',7:'Ferro'}
const eloSymbols={1:'💎',2:'🟩',3:'🔷',4:'🏆',5:'🥈',6:'🥉',7:'⚙️'}
const clampEloLevel=v=>Math.min(7,Math.max(1,Number(v)||7))
async function currentEloSettings(){return (await sql`SELECT * FROM elo_settings WHERE id=1 LIMIT 1`)[0]||{attendance_step:1,promote_at_level:1,default_level:7,absence_penalty_level:1,highlander_penalty_level:1,miscconduct_penalty_level:1,highlander_suspension_days:1,miscconduct_suspension_days:0}}
async function changeEloLevel(operatorId,action,reason,changedBy,gameId=null,step=1){
  const op=(await sql`SELECT id,nickname,rank,elo_level FROM operators WHERE id=${operatorId} LIMIT 1`)[0];
  if(!op)return null;
  const settings=await currentEloSettings();
  let oldLevel=clampEloLevel(op.elo_level), level=oldLevel, promoted=false, currentRank=op.rank;
  if(action==='attendance'){
    let steps=Math.max(1,Number(step||1));
    while(steps-- > 0){
      if(level>Number(settings.promote_at_level||1)) level=Math.max(1,level-1);
      else{
        const idx=ranks.indexOf(currentRank);
        if(idx<0||idx>=ranks.length-1)break;
        const next=ranks[idx+1];
        await sql`INSERT INTO rank_history(operator_id,old_rank,new_rank,reason) VALUES(${operatorId},${currentRank},${next},${reason||'Promoção por participação'})`;
        await sql`INSERT INTO notifications(operator_id,type,title,body,link) VALUES(${operatorId},'rank-up','Promoção de patente',${`Você subiu para ${next} por participação.`},'/operador')`;
        currentRank=next; promoted=true; level=clampEloLevel(settings.default_level||7);
      }
    }
    await sql`UPDATE operators SET rank=${currentRank},elo_level=${level} WHERE id=${operatorId}`;
    await sql`INSERT INTO elo_history(operator_id,game_id,old_level,new_level,action,reason,changed_by) VALUES(${operatorId},${gameId},${oldLevel},${level},'attendance',${reason||'Presença no jogo'},${changedBy||null})`;
  }else{
    const penalty=Math.max(1,Number(step||1));
    level=Math.min(7,oldLevel+penalty);
    await sql`UPDATE operators SET elo_level=${level} WHERE id=${operatorId}`;
    await sql`INSERT INTO elo_history(operator_id,game_id,old_level,new_level,action,reason,changed_by) VALUES(${operatorId},${gameId},${oldLevel},${level},${action},${reason||action},${changedBy||null})`;
  }
  return {operatorId,oldLevel,newLevel:level,promoted,rank:currentRank};
}

async function ensureBirthdayNotifications(){
  const birthdays=await sql`SELECT id,nickname FROM operators WHERE active=true AND birth_date IS NOT NULL AND EXTRACT(MONTH FROM birth_date)=EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM birth_date)=EXTRACT(DAY FROM CURRENT_DATE)`
  for(const b of birthdays){
    const already=await sql`SELECT id FROM notifications WHERE type='birthday' AND operator_id=${b.id} AND created_at::date=CURRENT_DATE LIMIT 1`
    if(already.length)continue
    const title='🎂 Aniversariante do dia'
    const body=`Hoje é aniversário de @${b.nickname}. Deseje parabéns ao nosso operador!`
    const all=await sql`SELECT id FROM operators WHERE active=true`
    for(const recipient of all) await sql`INSERT INTO notifications(operator_id,type,title,body,link) VALUES(${recipient.id},'birthday',${title},${body},${`/visitantes?operator=${b.id}`})`
    if(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT){
      webpush.setVapidDetails(process.env.VAPID_SUBJECT,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY)
      const subs=await sql`SELECT ps.* FROM push_subscriptions ps JOIN operators o ON o.id=ps.operator_id WHERE o.active=true`
      for(const sub of subs){try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title,body,url:`/visitantes?operator=${b.id}`}))}catch(e){if(e?.statusCode===404||e?.statusCode===410)await sql`DELETE FROM push_subscriptions WHERE id=${sub.id}`}}
    }
  }
}

async function closeGameRsvp(gameId, changedBy=null, reason='Lista encerrada pelo comando'){
  const game=(await sql`SELECT id,title,rsvp_closed FROM games WHERE id=${gameId} LIMIT 1`)[0]
  if(!game) throw new Error('Jogo não encontrado.')
  if(game.rsvp_closed) return {closed:true,already:true,penalized:0}
  const settings=await currentEloSettings()
  const activeOps=await sql`SELECT id FROM operators WHERE active=true`
  for(const op of activeOps){
    await sql`INSERT INTO game_participants(game_id,operator_id,response,responded_at,present,absence_processed) VALUES(${gameId},${op.id},'pending',NULL,false,false) ON CONFLICT(game_id,operator_id) DO NOTHING`
  }
  const pending=await sql`SELECT operator_id FROM game_participants WHERE game_id=${gameId} AND response='pending' AND absence_processed=false`
  for(const p of pending){
    await changeEloLevel(p.operator_id,'absence',`${reason}: não respondeu à lista`,changedBy,gameId,Number(settings.absence_penalty_level||1))
    await sql`UPDATE game_participants SET absence_processed=true WHERE game_id=${gameId} AND operator_id=${p.operator_id}`
    await sql`INSERT INTO notifications(operator_id,type,title,body,link) VALUES(${p.operator_id},'elo_penalty','Perda de Elo','Você não respondeu à lista do jogo e perdeu Elo por ausência de resposta.','/operador')`
  }
  await sql`UPDATE games SET rsvp_closed=true,rsvp_closed_at=now() WHERE id=${gameId}`
  return {closed:true,already:false,penalized:pending.length}
}

async function autoCloseExpiredRsvp(){
  const rows=await sql`SELECT id FROM games WHERE COALESCE(rsvp_closed,false)=false AND status NOT IN ('cancelado','finalizado') AND rsvp_deadline_date IS NOT NULL AND ((rsvp_deadline_date + COALESCE(rsvp_deadline_time,'23:59:59'::time)) AT TIME ZONE 'America/Sao_Paulo') <= now()`
  for(const g of rows){ try{ await closeGameRsvp(g.id,null,'Prazo da lista encerrado automaticamente') }catch{} }
}

async function reconcileAbsences(){
  const rows=await sql`SELECT gp.game_id,gp.operator_id FROM game_participants gp JOIN games g ON g.id=gp.game_id WHERE g.game_date<CURRENT_DATE AND gp.response='going' AND gp.present=false AND gp.absence_processed=false`
  for(const r of rows){await sql`UPDATE game_participants SET absence_processed=true WHERE game_id=${r.game_id} AND operator_id=${r.operator_id} AND absence_processed=false`;await sql`UPDATE operators SET absences=COALESCE(absences,0)+1 WHERE id=${r.operator_id}`}
}
function publicOperatorRow(o){return {id:o.id,name:o.name,nickname:o.nickname,rank:o.rank,function:o.function||'Operador',games_count:o.games_count||0,absences:o.absences||0,photo_url:o.photo_url||null,bio:o.bio||'',equipment_summary:o.equipment_summary||'',elo:o.elo||0,elo_level:clampEloLevel(o.elo_level),elo_label:eloNames[clampEloLevel(o.elo_level)],age:o.age||null,birth_date:o.birth_date||null,blood_type:o.blood_type||null,airsoft_years:o.airsoft_years||null,play_style:o.play_style||'',primary_replica:o.primary_replica||'',secondary_replica:o.secondary_replica||''}}

async function currentFinanceSettings(){return (await sql`SELECT * FROM finance_settings WHERE id=1 LIMIT 1`)[0]||{monthly_fee:0,due_day:10,grace_days:0,currency:'BRL',active:true,instagram_url:null}}
async function ensureCurrentDues(){
  const settings=await currentFinanceSettings();
  const periodRows=await sql`SELECT date_trunc('month', CURRENT_DATE)::date AS period`;
  const period=periodRows[0].period;
  const dueDate=await sql`SELECT make_date(EXTRACT(YEAR FROM ${period}::date)::int, EXTRACT(MONTH FROM ${period}::date)::int, ${Number(settings.due_day)})::date AS due_date`;
  await sql`INSERT INTO membership_dues(operator_id,period,amount,due_date) SELECT id,${period},${Number(settings.monthly_fee)},${dueDate[0].due_date} FROM operators WHERE active=true AND role='operator' ON CONFLICT(operator_id,period) DO UPDATE SET amount=EXCLUDED.amount,due_date=EXCLUDED.due_date WHERE membership_dues.status='pending'`;
  if(Number(settings.monthly_fee)>0) await sql`UPDATE membership_dues SET status='overdue' WHERE status='pending' AND due_date < CURRENT_DATE AND CURRENT_DATE > due_date + (COALESCE(${Number(settings.grace_days)},0)||' days')::interval`;
}
async function reconcileGameDeadlines(){
  const games=await sql`SELECT id,title,game_date,game_time,min_players,status FROM games WHERE status<>'cancelado' AND rsvp_deadline_date IS NOT NULL AND (rsvp_deadline_date < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date OR (rsvp_deadline_date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date AND COALESCE(rsvp_deadline_time,'23:59:59')::time <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::time))`;
  for(const g of games){
    const c=(await sql`SELECT count(*)::int c FROM game_participants WHERE game_id=${g.id} AND response='going'`)[0].c||0;
    if(c < Number(g.min_players||4)){
      await sql`UPDATE games SET status='cancelado' WHERE id=${g.id} AND status<>'cancelado'`;
      const ops=await sql`SELECT id FROM operators WHERE active=true AND role='operator'`;
      for(const o of ops) await sql`INSERT INTO notifications(operator_id,type,title,body,link) VALUES(${o.id},'game-cancelled','Jogo cancelado',${`${g.title} foi cancelado por não atingir o mínimo de ${Number(g.min_players||4)} operadores até o prazo.`},'/operador')`;
    }
  }
}

async function notifyOperatorsForGame(game){
  const ops=await sql`SELECT id FROM operators WHERE active=true AND role='operator'`;const title='Novo jogo criado';const bodyText=`${game.title} · ${game.game_date}${game.game_time?` · ${game.game_time}`:''} · ${game.location}`;
  for(const o of ops) await sql`INSERT INTO notifications(operator_id,type,title,body,link) VALUES(${o.id},'new-game',${title},${bodyText},'/operador')`;
  if(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT){webpush.setVapidDetails(process.env.VAPID_SUBJECT,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);const subs=await sql`SELECT * FROM push_subscriptions WHERE operator_id IN (SELECT id FROM operators WHERE active=true AND role='operator')`;for(const sub of subs){try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title,body:bodyText,url:'/operador'}))}catch(e){if(e?.statusCode===404||e?.statusCode===410)await sql`DELETE FROM push_subscriptions WHERE id=${sub.id}`}}}
}
async function financeForOperator(id){await ensureCurrentDues();return (await sql`SELECT d.*, to_char(d.period,'YYYY-MM') AS period_label, s.monthly_fee, s.due_day, s.grace_days, s.currency, s.active AS finance_active FROM membership_dues d CROSS JOIN finance_settings s WHERE d.operator_id=${id} AND d.period=date_trunc('month',CURRENT_DATE)::date LIMIT 1`)[0]||null}

export default async function handler(req,res){
  try{
    await ensureSchema()
    await reconcileGameDeadlines()
    await ensureBirthdayNotifications()
    if(req.method==='OPTIONS'){res.statusCode=204;res.end();return}
    const url=new URL(req.url,'http://localhost');const action=url.searchParams.get('action')||'public'

    if(action==='cron'&&req.method==='GET'){
      const secret=req.headers['x-cron-secret']||url.searchParams.get('secret');
      if(process.env.CRON_SECRET&&secret!==process.env.CRON_SECRET)return json(res,401,{error:'Não autorizado.'});
      await reconcileGameDeadlines();
      await reconcileAbsences();
      return json(res,200,{ok:true});
    }

    if(action==='public'){
      const operators=await sql`SELECT * FROM operators WHERE active=true AND public_profile=true ORDER BY CASE WHEN role='commander' THEN 0 ELSE 1 END,nickname`
      const games=await sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.description,g.notes,g.briefing,g.max_players,g.min_players,g.rsvp_deadline_date,g.rsvp_deadline_time,gf.name field_name,gf.maps_url field_maps_url,COALESCE((SELECT json_agg(json_build_object('id',o.id,'nickname',o.nickname,'rank',o.rank,'function',o.function,'photo_url',o.photo_url,'loadout',gp.loadout) ORDER BY o.nickname) FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=g.id AND gp.response='going' AND o.active=true),'[]'::json) participants FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id WHERE g.game_date>=CURRENT_DATE AND COALESCE(g.status,'')<>'cancelado' ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 20`
      const siteSettings=await currentFinanceSettings();
      const completedGames=await sql`SELECT id,title,game_date,game_time,location,status,match_photo_url,completed_at FROM games WHERE status='finalizado' ORDER BY game_date DESC,game_time DESC NULLS LAST LIMIT 50`;
      return json(res,200,{operators:operators.map(publicOperatorRow),games,completedGames,ranks,instagram_url:siteSettings.instagram_url||null})
    }

    if(action==='team-members'){
      const u=await requireUser(req,res,'operator');if(!u)return;
      const operators=await sql`SELECT id,name,nickname,role,rank,function,photo_url,bio,public_profile,elo_level FROM operators WHERE active=true ORDER BY CASE WHEN role='commander' THEN 0 ELSE 1 END, nickname`;
      const siteSettings=await currentFinanceSettings();
      return json(res,200,{operators:operators.map(publicOperatorRow),instagram_url:siteSettings.instagram_url||null});
    }

    if(action==='operator'){
      const id=url.searchParams.get('id');if(!id)return json(res,400,{error:'Operador não informado.'})
      const rows=await sql`SELECT * FROM operators WHERE id=${id} AND active=true AND public_profile=true LIMIT 1`;const op=rows[0]
      if(!op)return json(res,404,{error:'Operador não encontrado.'})
      const equipment=await sql`SELECT id,category,name,details,public_visible,photo_url FROM operator_equipment WHERE operator_id=${id} AND public_visible=true ORDER BY category,name`
      const gallery=await sql`SELECT id,image_data,caption,created_at FROM operator_gallery WHERE operator_id=${id} ORDER BY created_at DESC LIMIT 18`
      return json(res,200,{operator:publicOperatorRow(op),equipment,gallery})
    }

    if(action==='visitor-request'&&req.method==='POST'){
      const b=await body(req);if(!b.name||!b.contact)return json(res,400,{error:'Nome e contato são obrigatórios.'})
      await sql`INSERT INTO visitor_requests(name,nickname,contact,message,requested_game_id) VALUES(${b.name},${b.nickname||null},${b.contact},${b.message||null},${b.game_id||null})`
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

    if(action==='me'){const u=await userFromSession(req);return json(res,200,{user:u?{id:u.id,name:u.name,nickname:u.nickname,email:u.email||null,role:u.role,is_primary_commander:!!u.is_primary_commander,rank:u.rank,function:u.function||null,bio:u.bio||null,absences:u.absences||0,suspension_until:u.suspension_until||null,age:u.age||null,blood_type:u.blood_type||null,airsoft_years:u.airsoft_years||null,play_style:u.play_style||'',primary_replica:u.primary_replica||'',secondary_replica:u.secondary_replica||'',birth_date:u.birth_date||null,equipment_summary:u.equipment_summary||'',photo_url:u.photo_url||null,public_profile:u.public_profile}:null})}

    if(action==='push-config'){const enabled=!!(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT);return json(res,200,{enabled,publicKey:enabled?process.env.VAPID_PUBLIC_KEY:null})}
    if(action==='push-subscribe'&&req.method==='POST'){const u=await requireUser(req,res);if(!u)return;const b=await body(req);const sub=b.subscription||{};if(!sub.endpoint||!sub.keys?.p256dh||!sub.keys?.auth)return json(res,400,{error:'Assinatura de notificação inválida.'});await sql`INSERT INTO push_subscriptions(operator_id,endpoint,p256dh,auth) VALUES(${u.id},${sub.endpoint},${sub.keys.p256dh},${sub.keys.auth}) ON CONFLICT(endpoint) DO UPDATE SET operator_id=EXCLUDED.operator_id,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth`;return json(res,200,{ok:true})}
    if(action==='push-unsubscribe'&&req.method==='POST'){const u=await requireUser(req,res);if(!u)return;const b=await body(req);await sql`DELETE FROM push_subscriptions WHERE operator_id=${u.id} AND endpoint=${b.endpoint}`;return json(res,200,{ok:true})}
    if(action==='notifications'){const u=await requireUser(req,res);if(!u)return;return json(res,200,{items:await sql`SELECT * FROM notifications WHERE operator_id=${u.id} ORDER BY created_at DESC LIMIT 30`})}
    if(action==='notification-read'&&req.method==='POST'){const u=await requireUser(req,res);if(!u)return;const b=await body(req);await sql`UPDATE notifications SET read_at=now() WHERE id=${b.id} AND operator_id=${u.id}`;return json(res,200,{ok:true})}

    if(action==='profile-data'){
      const u=await requireUser(req,res,'operator');if(!u)return;
      const equipment=await sql`SELECT id,category,name,details,public_visible,photo_url FROM operator_equipment WHERE operator_id=${u.id} ORDER BY category,name`
      const gallery=await sql`SELECT id,image_data,caption,created_at FROM operator_gallery WHERE operator_id=${u.id} ORDER BY created_at DESC LIMIT 30`
      return json(res,200,{user:u,equipment,gallery})
    }

    if(action==='update-profile'&&req.method==='POST'){
      const u=await requireUser(req,res);if(!u)return;const b=await body(req)
      const age=b.age===''||b.age==null?null:Number(b.age);const years=b.airsoft_years===''||b.airsoft_years==null?null:Number(b.airsoft_years)
      const birthDate=String(b.birth_date||'').trim()||null
      if(birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate))return json(res,400,{error:'Data de nascimento inválida.'})
      await sql`UPDATE operators SET name=COALESCE(NULLIF(${String(b.name||'').trim()},''),name),email=COALESCE(NULLIF(${String(b.email||'').trim().toLowerCase()},''),email),age=${age},birth_date=${birthDate},blood_type=${b.blood_type||null},airsoft_years=${years},play_style=${b.play_style||null},primary_replica=${b.primary_replica||null},secondary_replica=${b.secondary_replica||null},function=${b.function||null},bio=${b.bio||null},equipment_summary=${b.equipment_summary||null},public_profile=${b.public_profile!==false} WHERE id=${u.id}`
      return json(res,200,{ok:true})
    }

    if(action==='upload-photo'&&req.method==='POST'){
      const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);const data=String(b.image_data||'');if(!data.startsWith('data:image/'))return json(res,400,{error:'Envie uma imagem válida.'});if(data.length>4_200_000)return json(res,400,{error:'Imagem muito grande. Use uma foto de até 3 MB.'});await sql`UPDATE operators SET photo_url=${data} WHERE id=${u.id}`;return json(res,200,{ok:true,photo_url:data})
    }

    if(action==='add-gallery'&&req.method==='POST'){
      const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);const data=String(b.image_data||'');if(!data.startsWith('data:image/'))return json(res,400,{error:'Envie uma imagem válida.'});if(data.length>4_200_000)return json(res,400,{error:'Imagem muito grande. Use uma foto de até 3 MB.'});await sql`INSERT INTO operator_gallery(operator_id,image_data,caption) VALUES(${u.id},${data},${b.caption||null})`;return json(res,201,{ok:true})
    }

    if(action==='delete-gallery'&&req.method==='POST'){const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);await sql`DELETE FROM operator_gallery WHERE id=${b.id} AND operator_id=${u.id}`;return json(res,200,{ok:true})}

    if(action==='equipment'&&req.method==='POST'){
      const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);if(!b.name)return json(res,400,{error:'Nome do equipamento é obrigatório.'});const photo=String(b.photo_url||'');if(photo&&!photo.startsWith('data:image/'))return json(res,400,{error:'Foto do equipamento inválida.'});if(photo.length>4_200_000)return json(res,400,{error:'Imagem do equipamento não pôde ser processada. O arquivo original pode ter até 5 MB; o aplicativo comprime a foto antes do envio.'});await sql`INSERT INTO operator_equipment(operator_id,category,name,details,public_visible,photo_url) VALUES(${u.id},${b.category||'Equipamento'},${b.name},${b.details||null},${b.public_visible!==false},${photo||null})`;return json(res,201,{ok:true})
    }
    if(action==='delete-equipment'&&req.method==='POST'){const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);await sql`DELETE FROM operator_equipment WHERE id=${b.id} AND operator_id=${u.id}`;return json(res,200,{ok:true})}

    if(action==='games'){
      await reconcileAbsences(); await autoCloseExpiredRsvp(); const u=await requireUser(req,res);
      if(!u)return;
      const games=await sql`SELECT g.*,gf.name field_name,gf.address field_address,gf.maps_url field_maps_url,COALESCE(gp.response,'pending') response,gp.loadout,gp.responded_at,
        COALESCE((SELECT count(*)::int FROM game_participants q WHERE q.game_id=g.id AND q.response='going'),0) going_count,
        COALESCE((SELECT json_agg(json_build_object('id',o.id,'nickname',o.nickname,'rank',o.rank,'function',o.function,'photo_url',o.photo_url,'elo_level',o.elo_level,'loadout',q.loadout) ORDER BY o.nickname) FROM game_participants q JOIN operators o ON o.id=q.operator_id WHERE q.game_id=g.id AND q.response='going' AND o.active=true),'[]'::json) participants
        FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id LEFT JOIN game_participants gp ON gp.game_id=g.id AND gp.operator_id=${u.id}
        WHERE g.game_date>=CURRENT_DATE-interval '1 day' ORDER BY g.game_date,g.game_time NULLS LAST`;
      const finance=u.role==='operator'?await financeForOperator(u.id):null; const siteSettings=await currentFinanceSettings();
      return json(res,200,{games,finance,financeSettings:siteSettings,instagram_url:siteSettings.instagram_url||null})
    }
    if(action==='finance'&&req.method==='GET'){
      const u=await requireUser(req,res);if(!u)return;await ensureCurrentDues();
      const settings=await currentFinanceSettings();
      const dues=u.role==='commander'?await sql`SELECT d.*,o.nickname,o.rank FROM membership_dues d JOIN operators o ON o.id=d.operator_id ORDER BY d.period DESC,o.nickname LIMIT 300`:await sql`SELECT d.* FROM membership_dues d WHERE d.operator_id=${u.id} ORDER BY d.period DESC LIMIT 12`;
      return json(res,200,{settings,dues})
    }
    if(action==='finance-settings'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const monthly=Number(b.monthly_fee);const dueDay=Math.min(28,Math.max(1,Number(b.due_day||10)));const grace=Math.min(30,Math.max(0,Number(b.grace_days||0)));if(!Number.isFinite(monthly)||monthly<0)return json(res,400,{error:'Mensalidade inválida.'});await sql`UPDATE finance_settings SET monthly_fee=${monthly},due_day=${dueDay},grace_days=${grace},currency=${b.currency||'BRL'},active=${b.active!==false},instagram_url=${String(b.instagram_url||'').trim()||null},pix_key=${String(b.pix_key||'').trim()||null},pix_holder=${String(b.pix_holder||'').trim()||null},updated_at=now(),updated_by=${u.id} WHERE id=1`;await ensureCurrentDues();return json(res,200,{ok:true})
    }
    if(action==='site-settings'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const instagram=String(b.instagram_url||'').trim();if(instagram&&!/^https?:\/\/(www\.)?instagram\.com\//i.test(instagram))return json(res,400,{error:'Informe uma URL válida do Instagram.'});await sql`UPDATE finance_settings SET instagram_url=${instagram||null},updated_at=now(),updated_by=${u.id} WHERE id=1`;return json(res,200,{ok:true,instagram_url:instagram||null})}
    if(action==='update-login-settings'&&req.method==='POST'){
      const u=await requireUser(req,res);if(!u)return;
      const b=await body(req);const current=String(b.current_password||'');
      if(!current)return json(res,400,{error:'Informe sua senha atual.'});
      if(!(await bcrypt.compare(current,u.password_hash)))return json(res,401,{error:'Senha atual incorreta.'});
      const name=String(b.name||'').trim();
      const nickname=String(b.nickname||'').trim().toUpperCase();
      const email=String(b.email||'').trim().toLowerCase();
      const newPassword=String(b.new_password||'');
      if(!nickname)return json(res,400,{error:'Informe o apelido.'});
      if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{error:'Informe um e-mail válido.'});
      const nickConflict=await sql`SELECT id FROM operators WHERE lower(nickname)=lower(${nickname}) AND id<>${u.id} LIMIT 1`;if(nickConflict.length)return json(res,409,{error:'Esse apelido já está em uso.'});
      if(email){const emailConflict=await sql`SELECT id FROM operators WHERE lower(coalesce(email,''))=${email} AND id<>${u.id} LIMIT 1`;if(emailConflict.length)return json(res,409,{error:'Esse e-mail já está em uso.'})}
      if(newPassword && newPassword.length<8)return json(res,400,{error:'A nova senha precisa ter pelo menos 8 caracteres.'});
      if(!name)return json(res,400,{error:'Informe o nome completo.'});
      if(newPassword){const hash=await bcrypt.hash(newPassword,12);await sql`UPDATE operators SET name=${name},nickname=${nickname},email=${email||null},password_hash=${hash} WHERE id=${u.id}`}
      else await sql`UPDATE operators SET name=${name},nickname=${nickname},email=${email||null} WHERE id=${u.id}`;
      return json(res,200,{ok:true,name,nickname,email:email||null});
    }
    if(action==='finance-ledger'&&req.method==='GET'){
      const u=await requireUser(req,res,'commander');if(!u)return;
      const period=new URL(req.url,'http://localhost').searchParams.get('period')||'monthly';
      const now=new Date();
      const rows=period==='weekly'?await sql`SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0)::numeric total_income,COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0)::numeric total_expense,COUNT(*)::int total_count FROM finance_transactions WHERE transaction_date>=((CURRENT_DATE - INTERVAL '6 days')::date)`:await sql`SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0)::numeric total_income,COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0)::numeric total_expense,COUNT(*)::int total_count FROM finance_transactions WHERE transaction_date>=date_trunc('month',CURRENT_DATE)::date AND transaction_date<(date_trunc('month',CURRENT_DATE)+INTERVAL '1 month')::date`;
      const tx=period==='weekly'?await sql`SELECT * FROM finance_transactions WHERE transaction_date>=((CURRENT_DATE - INTERVAL '6 days')::date) ORDER BY transaction_date DESC,created_at DESC LIMIT 200`:await sql`SELECT * FROM finance_transactions WHERE transaction_date>=date_trunc('month',CURRENT_DATE)::date AND transaction_date<(date_trunc('month',CURRENT_DATE)+INTERVAL '1 month')::date ORDER BY transaction_date DESC,created_at DESC LIMIT 200`;
      return json(res,200,{period,summary:rows[0],transactions:tx});
    }
    if(action==='finance-transaction'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const type=['income','expense'].includes(b.type)?b.type:null;const amount=Number(b.amount);const description=String(b.description||'').trim();if(!type||!description||!Number.isFinite(amount)||amount<=0)return json(res,400,{error:'Informe tipo, descrição e um valor válido.'});const date=String(b.transaction_date||'').trim()||new Date().toISOString().slice(0,10);const rows=await sql`INSERT INTO finance_transactions(type,description,amount,transaction_date,category,note,created_by) VALUES(${type},${description},${amount},${date},${String(b.category||'').trim()||null},${String(b.note||'').trim()||null},${u.id}) RETURNING *`;return json(res,201,{transaction:rows[0]});
    }
    if(action==='finance-delete-transaction'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);await sql`DELETE FROM finance_transactions WHERE id=${b.id}`;return json(res,200,{ok:true});
    }
    if(action==='finance-generate'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;await ensureCurrentDues();return json(res,200,{ok:true})
    }
    if(action==='finance-payment'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const period=b.period||new Date().toISOString().slice(0,7)+'-01';const status=['paid','waived','pending'].includes(b.status)?b.status:'paid';
      const due=await sql`INSERT INTO membership_dues(operator_id,period,amount,due_date,status,paid_at,payment_note) VALUES(${b.operator_id},${period},COALESCE(${Number(b.amount)||0},0),COALESCE(${b.due_date||period},${period}),${status},${status==='paid'?'now()':null},${b.note||null}) ON CONFLICT(operator_id,period) DO UPDATE SET status=EXCLUDED.status,amount=EXCLUDED.amount,due_date=EXCLUDED.due_date,paid_at=EXCLUDED.paid_at,payment_note=EXCLUDED.payment_note RETURNING id,operator_id,period,amount,status`;
      const op=(await sql`SELECT nickname FROM operators WHERE id=${b.operator_id} LIMIT 1`)[0];
      if(status==='paid'&&due[0]){await sql`INSERT INTO finance_transactions(type,description,amount,transaction_date,category,reference_id,created_by) VALUES('income',${`Mensalidade @${op?.nickname||'Operador'} — ${String(period).slice(0,7)}`},${Number(due[0].amount||0)},CURRENT_DATE,'Mensalidades',${due[0].id},${u.id}) ON CONFLICT(reference_id) DO UPDATE SET amount=EXCLUDED.amount,description=EXCLUDED.description,transaction_date=EXCLUDED.transaction_date`}
      if(status==='waived'&&due[0]) await sql`DELETE FROM finance_transactions WHERE reference_id=${due[0].id}`;
      return json(res,200,{ok:true})
    }

    if(action==='rsvp'&&req.method==='POST'){
      const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);
      const response=['going','not_going'].includes(b.response)?b.response:null;
      if(!response)return json(res,400,{error:'Escolha Vou ou Não vou.'});
      const game=(await sql`SELECT id,max_players,status,rsvp_deadline_date,rsvp_deadline_time,rsvp_closed FROM games WHERE id=${b.game_id} LIMIT 1`)[0];
      if(!game)return json(res,404,{error:'Jogo não encontrado.'});
      if(game.status==='cancelado')return json(res,409,{error:'Este jogo foi cancelado.'});
      const deadlinePassed=game.rsvp_deadline_date ? (await sql`SELECT (((rsvp_deadline_date + COALESCE(rsvp_deadline_time,'23:59:59'::time)) AT TIME ZONE 'America/Sao_Paulo') <= now()) AS passed FROM games WHERE id=${game.id}`)[0]?.passed : false;
      if(!game.rsvp_closed && deadlinePassed) { try{ await closeGameRsvp(game.id,null,'Prazo da lista encerrado automaticamente') }catch{} }
      const effectiveClosed=Boolean(game.rsvp_closed || deadlinePassed);
      if(effectiveClosed && response==='not_going')return json(res,409,{error:'A lista foi encerrada. Não é mais permitido retirar sua presença. Só é possível marcar Vou.'});
      if(!effectiveClosed && response==='going'){}
      if(response==='going'){
        const settings=await currentFinanceSettings();const due=await financeForOperator(u.id);
        if(settings.active&&Number(settings.monthly_fee)>0&&due?.status!=='paid'&&due?.status!=='waived')return json(res,402,{error:'Mensalidade pendente. Regularize o financeiro para confirmar presença nos jogos.'});
        if(game.max_players){const count=(await sql`SELECT count(*)::int AS c FROM game_participants WHERE game_id=${b.game_id} AND response='going' AND operator_id<>${u.id}`)[0].c||0;if(count>=Number(game.max_players))return json(res,409,{error:'Este jogo atingiu o limite de operadores.'})}
      }
      await sql`INSERT INTO game_participants(game_id,operator_id,response,responded_at,present) VALUES(${b.game_id},${u.id},${response},now(),false) ON CONFLICT(game_id,operator_id) DO UPDATE SET response=EXCLUDED.response,responded_at=now(),present=false,absence_processed=false`;
      return json(res,200,{ok:true,response})
    }

    if(action==='loadout'&&req.method==='POST'){const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);await sql`INSERT INTO game_participants(game_id,operator_id,response,loadout,responded_at) VALUES(${b.game_id},${u.id},COALESCE(${b.response||'pending'},'pending'),${JSON.stringify(b.loadout||{})}::jsonb,now()) ON CONFLICT(game_id,operator_id) DO UPDATE SET loadout=EXCLUDED.loadout,response=CASE WHEN EXCLUDED.response='pending' THEN game_participants.response ELSE EXCLUDED.response END,responded_at=now()`;return json(res,200,{ok:true})}

    if(action==='commander'){
      const u=await requireUser(req,res,'commander');if(!u)return;await reconcileAbsences();await autoCloseExpiredRsvp()
      const operators=await sql`SELECT id,name,nickname,role,rank,function,games_count,absences,elo,elo_level,suspension_until,active,email,photo_url,invite_expires_at,invite_used_at,is_primary_commander,last_promotion_period FROM operators ORDER BY role DESC,active DESC,nickname`
      const fields=await sql`SELECT * FROM game_fields WHERE active=true ORDER BY name`;const eloSettings=await currentEloSettings();const games=await sql`SELECT g.*,g.match_photo_url,g.completed_at,g.rsvp_closed,g.rsvp_closed_at,gf.name field_name,gf.maps_url field_maps_url,count(gp.operator_id) FILTER (WHERE gp.response='going')::int going_count,count(gp.operator_id) FILTER (WHERE gp.response='not_going')::int not_going_count,count(gp.operator_id) FILTER (WHERE gp.response='pending')::int pending_count,count(gp.operator_id)::int participant_count,COALESCE((SELECT json_agg(json_build_object('id',o2.id,'nickname',o2.nickname,'rank',o2.rank,'function',o2.function,'photo_url',o2.photo_url,'elo_level',o2.elo_level,'response',gp2.response,'loadout',gp2.loadout) ORDER BY CASE gp2.response WHEN 'going' THEN 0 WHEN 'not_going' THEN 1 ELSE 2 END,o2.nickname) FROM game_participants gp2 JOIN operators o2 ON o2.id=gp2.operator_id WHERE gp2.game_id=g.id AND o2.active=true),'[]'::json) participants FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id LEFT JOIN game_participants gp ON gp.game_id=g.id WHERE g.game_date>=CURRENT_DATE GROUP BY g.id,gf.name,gf.maps_url ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 50`
      const history=await sql`SELECT g.*,g.match_photo_url,g.completed_at,count(gp.operator_id) FILTER (WHERE gp.response='going')::int going_count,count(gp.operator_id) FILTER (WHERE gp.present=true)::int present_count,count(gp.operator_id) FILTER (WHERE gp.response='going' AND gp.present=false AND gp.absence_processed=true)::int absence_count FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id LEFT JOIN game_participants gp ON gp.game_id=g.id WHERE g.game_date<CURRENT_DATE GROUP BY g.id,gf.name,gf.maps_url ORDER BY g.game_date DESC,g.game_time DESC NULLS LAST LIMIT 100`
      const requests=await sql`SELECT vr.*,greq.title AS requested_game_title,greq.game_date AS requested_game_date,COALESCE(json_agg(json_build_object('game_id',vga.game_id,'title',g.title,'game_date',g.game_date,'location',g.location)) FILTER (WHERE vga.id IS NOT NULL),'[]') assignments FROM visitor_requests vr LEFT JOIN games greq ON greq.id=vr.requested_game_id LEFT JOIN visitor_game_assignments vga ON vga.visitor_request_id=vr.id LEFT JOIN games g ON g.id=vga.game_id GROUP BY vr.id,greq.title,greq.game_date ORDER BY vr.created_at DESC LIMIT 50`
      await ensureCurrentDues();const financeSettings=await currentFinanceSettings();const dues=await sql`SELECT d.*,o.nickname,o.rank,o.active,o.email FROM membership_dues d JOIN operators o ON o.id=d.operator_id WHERE d.period=date_trunc('month',CURRENT_DATE)::date ORDER BY CASE d.status WHEN 'overdue' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,o.nickname`;
      const financeRows=await sql`SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0)::numeric total_income,COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0)::numeric total_expense,COUNT(*)::int total_count FROM finance_transactions WHERE transaction_date>=date_trunc('month',CURRENT_DATE)::date AND transaction_date<(date_trunc('month',CURRENT_DATE)+INTERVAL '1 month')::date`;
      const financeTransactions=await sql`SELECT * FROM finance_transactions WHERE transaction_date>=date_trunc('month',CURRENT_DATE)::date AND transaction_date<(date_trunc('month',CURRENT_DATE)+INTERVAL '1 month')::date ORDER BY transaction_date DESC,created_at DESC LIMIT 200`;
      return json(res,200,{me:u,operators,games,history,requests,ranks,eloSettings,financeSettings,dues,fields,financeLedger:{period:'monthly',summary:financeRows[0],transactions:financeTransactions}})
    }

    if(action==='create-field'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const name=String(b.name||'').trim();const maps=String(b.maps_url||'').trim();if(!name||!maps)return json(res,400,{error:'Informe nome e link do Google Maps.'});const rows=await sql`INSERT INTO game_fields(name,address,maps_url,notes) VALUES(${name},${String(b.address||'').trim()||null},${maps},${String(b.notes||'').trim()||null}) RETURNING *`;return json(res,201,{field:rows[0]})}
    if(action==='delete-field'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const used=(await sql`SELECT count(*)::int c FROM games WHERE field_id=${b.id}`)[0].c||0;if(used>0)return json(res,409,{error:'Este campo já foi usado em jogos e não pode ser excluído.'});await sql`UPDATE game_fields SET active=false WHERE id=${b.id}`;return json(res,200,{ok:true})}
    if(action==='create-game'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);if(!b.title||!b.game_date||!b.field_id)return json(res,400,{error:'Preencha nome, data e selecione o campo.'});
      const min=Math.max(1,Number(b.min_players||4));const max=b.max_players?Number(b.max_players):null;if(max&&max<min)return json(res,400,{error:'O máximo de operadores não pode ser menor que o mínimo.'});const field=(await sql`SELECT id,name,address,maps_url FROM game_fields WHERE id=${b.field_id} AND active=true LIMIT 1`)[0];if(!field)return json(res,400,{error:'Selecione um campo válido.'});
      if(b.rsvp_deadline_date){const deadlineLocal=new Date(`${b.rsvp_deadline_date}T${String(b.rsvp_deadline_time||'23:59').slice(0,5)}:00-03:00`);const gameLocal=new Date(`${b.game_date}T${String(b.game_time||'23:59').slice(0,5)}:00-03:00`);if(Number.isNaN(deadlineLocal.getTime())||deadlineLocal>=gameLocal)return json(res,400,{error:'O prazo de confirmação deve ser antes do início do jogo.'})}
      const eloReward=Math.max(1,Number(b.elo_reward||1)); const rows=await sql`INSERT INTO games(title,game_date,game_time,location,status,description,notes,briefing,min_players,max_players,elo_reward,maps_url,commander_id,field_id,rsvp_deadline_date,rsvp_deadline_time) VALUES(${b.title},${b.game_date},${b.game_time||null},${field.name},${b.status||'confirmado'},${b.description||null},${b.notes||null},${b.briefing||null},${min},${max},${eloReward},${field.maps_url},${u.id},${field.id},${b.rsvp_deadline_date||null},${b.rsvp_deadline_time||null}) RETURNING *`
      await sql`INSERT INTO game_participants(game_id,operator_id,response,responded_at,present,absence_processed) SELECT ${rows[0].id},id,'pending',NULL,false,false FROM operators WHERE active=true ON CONFLICT(game_id,operator_id) DO NOTHING`;
      await notifyOperatorsForGame(rows[0]);
      return json(res,201,{game:rows[0]})
    }

    if(action==='edit-game'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const id=String(b.game_id||'');
      if(!id||!b.title||!b.game_date||!b.field_id)return json(res,400,{error:'Preencha nome, data e campo do jogo.'});
      const min=Math.max(1,Number(b.min_players||4));const max=b.max_players?Number(b.max_players):null;if(max&&max<min)return json(res,400,{error:'O máximo não pode ser menor que o mínimo.'});
      const eloReward=Math.max(1,Number(b.elo_reward||1));const field=(await sql`SELECT id,name,maps_url FROM game_fields WHERE id=${b.field_id} AND active=true LIMIT 1`)[0];if(!field)return json(res,400,{error:'Campo inválido.'});
      const existing=(await sql`SELECT id,rsvp_closed FROM games WHERE id=${id} LIMIT 1`)[0];if(!existing)return json(res,404,{error:'Jogo não encontrado.'});
      await sql`UPDATE games SET title=${String(b.title).trim()},game_date=${b.game_date},game_time=${b.game_time||null},location=${field.name},field_id=${field.id},maps_url=${field.maps_url},min_players=${min},max_players=${max},elo_reward=${eloReward},status=${b.status||'confirmado'},description=${String(b.description||'').trim()||null},briefing=${String(b.briefing||'').trim()||null},notes=${String(b.notes||'').trim()||null},rsvp_deadline_date=${b.rsvp_deadline_date||null},rsvp_deadline_time=${b.rsvp_deadline_time||null} WHERE id=${id}`;
      const changedTitle=String(b.title).trim();
      const recipients=await sql`SELECT operator_id FROM game_participants WHERE game_id=${id} AND operator_id IS NOT NULL`;
      for(const r of recipients){await sql`INSERT INTO notifications(operator_id,type,title,body,link) VALUES(${r.operator_id},'game-updated','Jogo atualizado',${`As informações do jogo ${changedTitle} foram atualizadas pelo comando.`},'/operador')`}
      return json(res,200,{ok:true})
    }
    if(action==='close-rsvp'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);if(!b.game_id)return json(res,400,{error:'Jogo inválido.'});
      const result=await closeGameRsvp(b.game_id,u.id,'Lista encerrada pelo comando');return json(res,200,result)
    }
    if(action==='delete-game'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const id=String(b.game_id||'');if(!id)return json(res,400,{error:'Jogo inválido.'});
      await sql`DELETE FROM game_participants WHERE game_id=${id}`;await sql`DELETE FROM match_photos WHERE game_id=${id}`;await sql`DELETE FROM visitor_game_assignments WHERE game_id=${id}`;await sql`DELETE FROM games WHERE id=${id}`;return json(res,200,{ok:true})
    }
    if(action==='finish-game'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);
      const image=String(b.image_data||'');
      if(image && !image.startsWith('data:image/')) return json(res,400,{error:'Foto da partida inválida.'});
      if(image.length>4_300_000) return json(res,400,{error:'A foto da partida ficou grande demais. Reduza a imagem antes do envio.'});
      const g=(await sql`SELECT id,title FROM games WHERE id=${b.game_id} LIMIT 1`)[0];
      if(!g)return json(res,404,{error:'Jogo não encontrado.'});
      await sql`UPDATE games SET status='finalizado',completed_at=now(),match_photo_url=${image||null} WHERE id=${g.id}`;
      if(image){await sql`INSERT INTO match_photos(game_id,image_data,caption,created_by) VALUES(${g.id},${image},${b.caption||'Foto da partida'},${u.id}) ON CONFLICT(game_id) DO UPDATE SET image_data=EXCLUDED.image_data,caption=EXCLUDED.caption,created_by=EXCLUDED.created_by,created_at=now()`}
      return json(res,200,{ok:true});
    }
    if(action==='create-invite'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const nickname=String(b.nickname||'').trim().toUpperCase()
      if(!nickname)return json(res,400,{error:'Informe o apelido.'});const existing=await sql`SELECT id FROM operators WHERE lower(nickname)=lower(${nickname}) LIMIT 1`;if(existing.length)return json(res,409,{error:'Esse apelido já está cadastrado.'})
      const code=makeInviteCode();const hash=hashToken(code);const rows=await sql`INSERT INTO operators(name,nickname,password_hash,role,rank,function,active,public_profile,invite_code_hash,invite_expires_at) VALUES(${nickname},${nickname},${await bcrypt.hash(crypto.randomBytes(32).toString('hex'),10)},'operator','Recruta',NULL,false,true,${hash},now()+interval '24 hours') RETURNING id,nickname,function,invite_expires_at`;return json(res,201,{operator:rows[0],code})
    }
    if(action==='revoke-invite'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);await sql`DELETE FROM operators WHERE id=${b.operator_id} AND active=false AND role='operator'`;return json(res,200,{ok:true})}
    if(action==='delete-operator'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);if(String(b.operator_id)===String(u.id))return json(res,400,{error:'O comandante não pode excluir a própria conta.'});const op=(await sql`SELECT id,role FROM operators WHERE id=${b.operator_id} LIMIT 1`)[0];if(!op||op.role!=='operator')return json(res,404,{error:'Operador não encontrado.'});await sql`DELETE FROM operators WHERE id=${op.id}`;return json(res,200,{ok:true})}
    if(action==='change-role'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;if(!u.is_primary_commander)return json(res,403,{error:'Somente o comandante principal pode alterar comandantes.'});const b=await body(req);const op=(await sql`SELECT id,role,is_primary_commander FROM operators WHERE id=${b.operator_id} LIMIT 1`)[0];if(!op)return json(res,404,{error:'Operador não encontrado.'});if(String(op.id)===String(u.id))return json(res,400,{error:'A conta principal não pode ser alterada.'});const role=b.role==='commander'?'commander':'operator';await sql`UPDATE operators SET role=${role},is_primary_commander=false WHERE id=${op.id}`;return json(res,200,{ok:true})}

    if(action==='rank'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const op=(await sql`SELECT id,rank FROM operators WHERE id=${b.operator_id}`)[0];if(!op)return json(res,404,{error:'Operador não encontrado.'});if(!ranks.includes(b.rank))return json(res,400,{error:'Patente inválida.'});await sql`UPDATE operators SET rank=${b.rank} WHERE id=${op.id}`;await sql`INSERT INTO rank_history(operator_id,old_rank,new_rank,reason,changed_by) VALUES(${op.id},${op.rank},${b.rank},${b.reason||null},${u.id})`;return json(res,200,{ok:true})}
    if(action==='penalty'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const days=Math.max(0,Number(b.days||0));if(days)await sql`UPDATE operators SET suspension_until=CURRENT_DATE + ${days}::int WHERE id=${b.operator_id}`;else await sql`UPDATE operators SET suspension_until=NULL WHERE id=${b.operator_id}`;await sql`INSERT INTO penalties(operator_id,type,reason,days,ends_at) VALUES(${b.operator_id},${b.type||'suspensão'},${b.reason||null},${days},${days?new Date(Date.now()+days*86400000):null})`;return json(res,200,{ok:true})}
    if(action==='attendance'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;
      const b=await body(req);
      const before=(await sql`SELECT gp.present,gp.response,gp.elo_awarded,gp.absence_processed,g.elo_reward FROM game_participants gp JOIN games g ON g.id=gp.game_id WHERE gp.game_id=${b.game_id} AND gp.operator_id=${b.operator_id} LIMIT 1`)[0];
      const present=!!b.present;
      await sql`UPDATE game_participants SET present=${present},response=CASE WHEN ${present} THEN 'attended' ELSE response END,absence_processed=false WHERE game_id=${b.game_id} AND operator_id=${b.operator_id}`;
      await sql`UPDATE operators SET games_count=(SELECT count(*) FROM game_participants WHERE operator_id=${b.operator_id} AND present=true),absences=(SELECT count(*) FROM game_participants WHERE operator_id=${b.operator_id} AND response='going' AND present=false AND absence_processed=true) WHERE id=${b.operator_id}`;
      if(present && (!before || !before.present) && !before?.elo_awarded){
        await changeEloLevel(b.operator_id,'attendance',b.reason||'Presença confirmada pelo comando',u.id,b.game_id,Math.max(1,Number(before?.elo_reward||1)));
        await sql`UPDATE game_participants SET elo_awarded=true,absence_processed=false WHERE game_id=${b.game_id} AND operator_id=${b.operator_id}`;
      } else if(!present && before && before.response==='going' && !before.absence_processed){
        await changeEloLevel(b.operator_id,'absence',b.reason||'Falta registrada pelo comando',u.id,b.game_id,1);
        await sql`UPDATE game_participants SET elo_awarded=false,absence_processed=true WHERE game_id=${b.game_id} AND operator_id=${b.operator_id}`;
      }
      return json(res,200,{ok:true});
    }

    if(action==='elo-adjust'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const level=clampEloLevel(b.level);const op=(await sql`SELECT id,elo_level FROM operators WHERE id=${b.operator_id} LIMIT 1`)[0];if(!op)return json(res,404,{error:'Operador não encontrado.'});const oldLevel=clampEloLevel(op.elo_level);await sql`UPDATE operators SET elo_level=${level} WHERE id=${op.id}`;await sql`INSERT INTO elo_history(operator_id,old_level,new_level,action,reason,changed_by) VALUES(${op.id},${oldLevel},${level},'manual',${b.reason||'Ajuste manual do comando'},${u.id})`;return json(res,200,{ok:true,level})}
    if(action==='discipline-elo'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const type=['absence','highlander','misconduct'].includes(b.type)?b.type:'misconduct';const reason=String(b.reason||'Decisão disciplinar do comando');const settings=await currentEloSettings();const step=type==='absence'?settings.absence_penalty_level:type==='highlander'?settings.highlander_penalty_level:settings.misconduct_penalty_level;const r=await changeEloLevel(b.operator_id,type,reason,u.id,b.game_id,step);const days=type==='highlander'?Number(settings.highlander_suspension_days||0):type==='misconduct'?Number(settings.misconduct_suspension_days||0):0;if(days)await sql`UPDATE operators SET suspension_until=CURRENT_DATE + ${days}::int WHERE id=${b.operator_id}`;return json(res,200,{ok:true,result:r,days})}
    if(action==='elo-settings'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const values={attendance_step:1,promote_at_level:1,default_level:clampEloLevel(b.default_level),absence_penalty_level:Math.max(1,Math.min(3,Number(b.absence_penalty_level||1))),highlander_penalty_level:Math.max(1,Math.min(3,Number(b.highlander_penalty_level||1))),misconduct_penalty_level:Math.max(1,Math.min(3,Number(b.misconduct_penalty_level||1))),highlander_suspension_days:Math.max(0,Number(b.highlander_suspension_days||0)),misconduct_suspension_days:Math.max(0,Number(b.misconduct_suspension_days||0))};await sql`UPDATE elo_settings SET attendance_step=${values.attendance_step},promote_at_level=${values.promote_at_level},default_level=${values.default_level},absence_penalty_level=${values.absence_penalty_level},highlander_penalty_level=${values.highlander_penalty_level},misconduct_penalty_level=${values.misconduct_penalty_level},highlander_suspension_days=${values.highlander_suspension_days},misconduct_suspension_days=${values.misconduct_suspension_days},updated_by=${u.id},updated_at=now() WHERE id=1`;return json(res,200,{ok:true})}

    if(action==='visitor-decision'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const status=b.status==='approved'?'approved':'rejected';await sql`UPDATE visitor_requests SET status=${status},approved_by=${status==='approved'?u.id:null},decided_at=now() WHERE id=${b.id}`;return json(res,200,{ok:true})}
    if(action==='assign-visitor'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);await sql`INSERT INTO visitor_game_assignments(visitor_request_id,game_id,notes) VALUES(${b.visitor_request_id},${b.game_id},${b.notes||null}) ON CONFLICT(visitor_request_id,game_id) DO UPDATE SET notes=EXCLUDED.notes`;return json(res,200,{ok:true})}

    return json(res,404,{error:'Ação não encontrada.'})
  }catch(e){console.error(e);return json(res,500,{error:e?.message||'Erro interno.'})}
}
