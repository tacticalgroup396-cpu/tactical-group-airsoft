import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import webpush from 'web-push'

const sql = neon(process.env.DATABASE_URL)
const COOKIE = 'tg_session'
const ranks = ['Recruta','Soldado','Cabo','3º Sargento','2º Sargento','1º Sargento','Subtenente','Aspirante','Tenente','Capitão','Major','Tenente-Coronel','Coronel']
let schemaReady = null

const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data))}
const parseCookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const hashToken=t=>crypto.createHash('sha256').update(t).digest('hex')
const makeInviteCode=()=>`TGA-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
const body=req=>new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>5_000_000){reject(new Error('Payload muito grande.'))}});req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)})

async function ensureSchema(){
  if(!schemaReady){
    schemaReady=(async()=>{
      const cols=[
        ['operators','email','TEXT'],['operators','is_primary_commander','BOOLEAN NOT NULL DEFAULT FALSE'],['operators','last_promotion_period','DATE'],['operators','invite_code_hash','TEXT'],['operators','invite_expires_at','TIMESTAMPTZ'],['operators','invite_used_at','TIMESTAMPTZ'],
        ['operators','age','INTEGER'],['operators','blood_type','TEXT'],['operators','airsoft_years','NUMERIC'],['operators','play_style','TEXT'],['operators','primary_replica','TEXT'],['operators','secondary_replica','TEXT'],
        ['operators','absences','INTEGER NOT NULL DEFAULT 0'],['operators','suspension_until','DATE'],['operators','public_profile','BOOLEAN NOT NULL DEFAULT TRUE'],['operators','photo_url','TEXT'],['operators','bio','TEXT'],['operators','equipment_summary','TEXT'],['operators','elo','INTEGER NOT NULL DEFAULT 0'],
        ['games','game_time','TIME'],['games','elo_reward','INTEGER NOT NULL DEFAULT 1'],['games','commander_id','UUID'],['games','min_players','INTEGER NOT NULL DEFAULT 4'],['games','max_players','INTEGER'],['games','rsvp_deadline_date','DATE'],['games','rsvp_deadline_time','TIME'],['games','description','TEXT'],['games','briefing','TEXT'],['games','maps_url','TEXT'],['games','field_id','UUID'],
        ["game_participants","response","TEXT NOT NULL DEFAULT 'pending'"], ["game_participants","elo_awarded","BOOLEAN NOT NULL DEFAULT FALSE"],['game_participants','loadout','JSONB'],['game_participants','responded_at','TIMESTAMPTZ'],['game_participants','absence_processed','BOOLEAN NOT NULL DEFAULT FALSE']
      ]
      for(const [table,col,type] of cols) await sql.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${type}`)
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS operators_email_unique_idx ON operators (lower(email)) WHERE email IS NOT NULL`
      await sql`CREATE INDEX IF NOT EXISTS operators_invite_idx ON operators(invite_code_hash) WHERE invite_code_hash IS NOT NULL`
      await sql`ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS requested_game_id UUID REFERENCES games(id) ON DELETE SET NULL`
      await sql`CREATE TABLE IF NOT EXISTS notifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, link TEXT, read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      await sql`CREATE INDEX IF NOT EXISTS notifications_operator_idx ON notifications(operator_id, created_at DESC)`
      await sql`CREATE TABLE IF NOT EXISTS push_subscriptions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE, endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      await sql`CREATE TABLE IF NOT EXISTS game_fields (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL UNIQUE, address TEXT, maps_url TEXT NOT NULL, notes TEXT, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      await sql`CREATE INDEX IF NOT EXISTS game_fields_active_idx ON game_fields(active,name)`
      await sql`CREATE TABLE IF NOT EXISTS operator_gallery (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE, image_data TEXT NOT NULL, caption TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      await sql`CREATE INDEX IF NOT EXISTS operator_gallery_operator_idx ON operator_gallery(operator_id,created_at DESC)`
      await sql`CREATE TABLE IF NOT EXISTS finance_settings (id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), monthly_fee NUMERIC(12,2) NOT NULL DEFAULT 0, due_day INTEGER NOT NULL DEFAULT 10 CHECK (due_day BETWEEN 1 AND 28), grace_days INTEGER NOT NULL DEFAULT 0 CHECK (grace_days BETWEEN 0 AND 30), currency TEXT NOT NULL DEFAULT 'BRL', active BOOLEAN NOT NULL DEFAULT TRUE, instagram_url TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by UUID REFERENCES operators(id) ON DELETE SET NULL)`
      await sql`ALTER TABLE finance_settings ADD COLUMN IF NOT EXISTS instagram_url TEXT`
      await sql`INSERT INTO finance_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING`
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
async function autoPromoteByElo(operatorId){const op=(await sql`SELECT id,rank,elo FROM operators WHERE id=${operatorId} LIMIT 1`)[0];if(!op)return;let idx=ranks.indexOf(op.rank);let elo=Number(op.elo||0);while(elo>=3&&idx>=0&&idx<ranks.length-1){const next=ranks[idx+1];elo-=3;await sql`UPDATE operators SET rank=${next},elo=${elo},last_promotion_period=CURRENT_DATE WHERE id=${operatorId}`;await sql`INSERT INTO rank_history(operator_id,old_rank,new_rank,reason) VALUES(${operatorId},${op.rank},${next},'Promoção por 3 elos de participação')`;await sql`INSERT INTO notifications(operator_id,type,title,body,link) VALUES(${operatorId},'rank-up','Promoção de patente',${`Você alcançou 3 elos e subiu para ${next}.`},'/operador')`;idx+=1;op.rank=next}}

async function reconcileAbsences(){
  const rows=await sql`SELECT gp.game_id,gp.operator_id FROM game_participants gp JOIN games g ON g.id=gp.game_id WHERE g.game_date<CURRENT_DATE AND gp.response='going' AND gp.present=false AND gp.absence_processed=false`
  for(const r of rows){await sql`UPDATE game_participants SET absence_processed=true WHERE game_id=${r.game_id} AND operator_id=${r.operator_id} AND absence_processed=false`;await sql`UPDATE operators SET absences=COALESCE(absences,0)+1 WHERE id=${r.operator_id}`}
}
function publicOperatorRow(o){return {id:o.id,name:o.name,nickname:o.nickname,rank:o.rank,function:o.function||'Operador',games_count:o.games_count||0,absences:o.absences||0,photo_url:o.photo_url||null,bio:o.bio||'',equipment_summary:o.equipment_summary||'',elo:o.elo||0,age:o.age||null,blood_type:o.blood_type||null,airsoft_years:o.airsoft_years||null,play_style:o.play_style||'',primary_replica:o.primary_replica||'',secondary_replica:o.secondary_replica||''}}

async function currentFinanceSettings(){return (await sql`SELECT * FROM finance_settings WHERE id=1 LIMIT 1`)[0]||{monthly_fee:0,due_day:10,grace_days:0,currency:'BRL',active:true,instagram_url:null}}
async function ensureCurrentDues(){
  const settings=await currentFinanceSettings();
  const periodRows=await sql`SELECT date_trunc('month', CURRENT_DATE)::date AS period`;
  const period=periodRows[0].period;
  const dueDate=await sql`SELECT make_date(EXTRACT(YEAR FROM ${period}::date)::int, EXTRACT(MONTH FROM ${period}::date)::int, ${Number(settings.due_day)})::date AS due_date`;
  await sql`INSERT INTO membership_dues(operator_id,period,amount,due_date) SELECT id,${period},${Number(settings.monthly_fee)},${dueDate[0].due_date} FROM operators WHERE active=true AND role='operator' ON CONFLICT(operator_id,period) DO UPDATE SET amount=EXCLUDED.amount,due_date=EXCLUDED.due_date WHERE membership_dues.status='pending'`;
  if(Number(settings.monthly_fee)>0) await sql`UPDATE membership_dues SET status='overdue' WHERE status='pending' AND due_date < CURRENT_DATE AND CURRENT_DATE > due_date + (COALESCE(${Number(settings.grace_days)},0)||' days')::interval`;
}
const promotionThresholds=[2,4,6,8,10,12,14,16,18,20,22,24,26]
async function autoPromoteEligible(){
  const period=(await sql`SELECT date_trunc('month',CURRENT_DATE)::date period`)[0].period
  const rows=await sql`SELECT o.id,o.rank,o.last_promotion_period,COUNT(gp.game_id) FILTER (WHERE gp.present=true AND gp.game_id IN (SELECT id FROM games WHERE game_date>=date_trunc('month',CURRENT_DATE)::date AND game_date<date_trunc('month',CURRENT_DATE)::date+interval '1 month'))::int attended FROM operators o LEFT JOIN game_participants gp ON gp.operator_id=o.id WHERE o.active=true AND o.role='operator' GROUP BY o.id,o.rank,o.last_promotion_period`
  for(const r of rows){if(r.last_promotion_period&&String(r.last_promotion_period).slice(0,10)===String(period).slice(0,10))continue;const idx=ranks.indexOf(r.rank);if(idx<0||idx>=ranks.length-1)continue;const threshold=promotionThresholds[Math.min(idx,promotionThresholds.length-1)];if(Number(r.attended)>=threshold){const next=ranks[idx+1];await sql`UPDATE operators SET rank=${next},last_promotion_period=${period},elo=COALESCE(elo,0)+${Number(r.attended)*10} WHERE id=${r.id}`;await sql`INSERT INTO rank_history(operator_id,old_rank,new_rank,reason) VALUES(${r.id},${r.rank},${next},${`Promoção automática por ${Number(r.attended)} participações no mês`})`;await sql`INSERT INTO notifications(operator_id,type,title,body,link) VALUES(${r.id},'rank-up','Promoção de patente',${`Você foi promovido para ${next} por participação nos jogos deste mês.`},'/operador')`}}
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
    if(req.method==='OPTIONS'){res.statusCode=204;res.end();return}
    const url=new URL(req.url,'http://localhost');const action=url.searchParams.get('action')||'public'

    if(action==='cron'&&req.method==='GET'){
      const secret=req.headers['x-cron-secret']||url.searchParams.get('secret');
      if(process.env.CRON_SECRET&&secret!==process.env.CRON_SECRET)return json(res,401,{error:'Não autorizado.'});
      await reconcileGameDeadlines();
      await reconcileAbsences();
      await autoPromoteEligible();
      return json(res,200,{ok:true});
    }

    if(action==='public'){
      const operators=await sql`SELECT * FROM operators WHERE active=true AND public_profile=true ORDER BY CASE WHEN role='commander' THEN 0 ELSE 1 END,nickname`
      const games=await sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.description,g.notes,g.briefing,g.max_players,g.min_players,g.rsvp_deadline_date,g.rsvp_deadline_time,gf.name field_name,gf.maps_url field_maps_url FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id WHERE g.game_date>=CURRENT_DATE AND COALESCE(g.status,'')<>'cancelado' ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 20`
      const siteSettings=await currentFinanceSettings();
      return json(res,200,{operators:operators.map(publicOperatorRow),games,ranks,instagram_url:siteSettings.instagram_url||null})
    }

    if(action==='operator'){
      const id=url.searchParams.get('id');if(!id)return json(res,400,{error:'Operador não informado.'})
      const rows=await sql`SELECT * FROM operators WHERE id=${id} AND active=true AND public_profile=true LIMIT 1`;const op=rows[0]
      if(!op)return json(res,404,{error:'Operador não encontrado.'})
      const equipment=await sql`SELECT id,category,name,details,public_visible FROM operator_equipment WHERE operator_id=${id} AND public_visible=true ORDER BY category,name`
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

    if(action==='me'){const u=await userFromSession(req);return json(res,200,{user:u?{id:u.id,name:u.name,nickname:u.nickname,email:u.email||null,role:u.role,is_primary_commander:!!u.is_primary_commander,rank:u.rank,function:u.function||null,bio:u.bio||null,absences:u.absences||0,suspension_until:u.suspension_until||null,age:u.age||null,blood_type:u.blood_type||null,airsoft_years:u.airsoft_years||null,play_style:u.play_style||'',primary_replica:u.primary_replica||'',secondary_replica:u.secondary_replica||'',equipment_summary:u.equipment_summary||'',photo_url:u.photo_url||null,public_profile:u.public_profile}:null})}

    if(action==='push-config'){const enabled=!!(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT);return json(res,200,{enabled,publicKey:enabled?process.env.VAPID_PUBLIC_KEY:null})}
    if(action==='push-subscribe'&&req.method==='POST'){const u=await requireUser(req,res);if(!u)return;const b=await body(req);const sub=b.subscription||{};if(!sub.endpoint||!sub.keys?.p256dh||!sub.keys?.auth)return json(res,400,{error:'Assinatura de notificação inválida.'});await sql`INSERT INTO push_subscriptions(operator_id,endpoint,p256dh,auth) VALUES(${u.id},${sub.endpoint},${sub.keys.p256dh},${sub.keys.auth}) ON CONFLICT(endpoint) DO UPDATE SET operator_id=EXCLUDED.operator_id,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth`;return json(res,200,{ok:true})}
    if(action==='push-unsubscribe'&&req.method==='POST'){const u=await requireUser(req,res);if(!u)return;const b=await body(req);await sql`DELETE FROM push_subscriptions WHERE operator_id=${u.id} AND endpoint=${b.endpoint}`;return json(res,200,{ok:true})}
    if(action==='notifications'){const u=await requireUser(req,res);if(!u)return;return json(res,200,{items:await sql`SELECT * FROM notifications WHERE operator_id=${u.id} ORDER BY created_at DESC LIMIT 30`})}
    if(action==='notification-read'&&req.method==='POST'){const u=await requireUser(req,res);if(!u)return;const b=await body(req);await sql`UPDATE notifications SET read_at=now() WHERE id=${b.id} AND operator_id=${u.id}`;return json(res,200,{ok:true})}

    if(action==='profile-data'){
      const u=await requireUser(req,res,'operator');if(!u)return;await autoPromoteEligible()
      const equipment=await sql`SELECT id,category,name,details,public_visible FROM operator_equipment WHERE operator_id=${u.id} ORDER BY category,name`
      const gallery=await sql`SELECT id,image_data,caption,created_at FROM operator_gallery WHERE operator_id=${u.id} ORDER BY created_at DESC LIMIT 30`
      return json(res,200,{user:u,equipment,gallery})
    }

    if(action==='update-profile'&&req.method==='POST'){
      const u=await requireUser(req,res);if(!u)return;const b=await body(req)
      const age=b.age===''||b.age==null?null:Number(b.age);const years=b.airsoft_years===''||b.airsoft_years==null?null:Number(b.airsoft_years)
      await sql`UPDATE operators SET name=COALESCE(NULLIF(${String(b.name||'').trim()},''),name),email=COALESCE(NULLIF(${String(b.email||'').trim().toLowerCase()},''),email),age=${age},blood_type=${b.blood_type||null},airsoft_years=${years},play_style=${b.play_style||null},primary_replica=${b.primary_replica||null},secondary_replica=${b.secondary_replica||null},function=${b.function||null},bio=${b.bio||null},equipment_summary=${b.equipment_summary||null},public_profile=${b.public_profile!==false} WHERE id=${u.id}`
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
      const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);if(!b.name)return json(res,400,{error:'Nome do equipamento é obrigatório.'});await sql`INSERT INTO operator_equipment(operator_id,category,name,details,public_visible) VALUES(${u.id},${b.category||'Equipamento'},${b.name},${b.details||null},${b.public_visible!==false})`;return json(res,201,{ok:true})
    }
    if(action==='delete-equipment'&&req.method==='POST'){const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);await sql`DELETE FROM operator_equipment WHERE id=${b.id} AND operator_id=${u.id}`;return json(res,200,{ok:true})}

    if(action==='games'){
      await reconcileAbsences();const u=await requireUser(req,res);if(!u)return;
      const games=await sql`SELECT g.*,gf.name field_name,gf.address field_address,gf.maps_url field_maps_url,COALESCE(gp.response,'pending') response,gp.loadout FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id LEFT JOIN game_participants gp ON gp.game_id=g.id AND gp.operator_id=${u.id} WHERE g.game_date>=CURRENT_DATE-interval '1 day' ORDER BY g.game_date,g.game_time NULLS LAST`;
      const finance=u.role==='operator'?await financeForOperator(u.id):null;
      const siteSettings=await currentFinanceSettings();return json(res,200,{games,finance,instagram_url:siteSettings.instagram_url||null})
    }
    if(action==='finance'&&req.method==='GET'){
      const u=await requireUser(req,res);if(!u)return;await ensureCurrentDues();
      const settings=await currentFinanceSettings();
      const dues=u.role==='commander'?await sql`SELECT d.*,o.nickname,o.rank FROM membership_dues d JOIN operators o ON o.id=d.operator_id ORDER BY d.period DESC,o.nickname LIMIT 300`:await sql`SELECT d.* FROM membership_dues d WHERE d.operator_id=${u.id} ORDER BY d.period DESC LIMIT 12`;
      return json(res,200,{settings,dues})
    }
    if(action==='finance-settings'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const monthly=Number(b.monthly_fee);const dueDay=Math.min(28,Math.max(1,Number(b.due_day||10)));const grace=Math.min(30,Math.max(0,Number(b.grace_days||0)));if(!Number.isFinite(monthly)||monthly<0)return json(res,400,{error:'Mensalidade inválida.'});await sql`UPDATE finance_settings SET monthly_fee=${monthly},due_day=${dueDay},grace_days=${grace},currency=${b.currency||'BRL'},active=${b.active!==false},instagram_url=${String(b.instagram_url||'').trim()||null},updated_at=now(),updated_by=${u.id} WHERE id=1`;await ensureCurrentDues();return json(res,200,{ok:true})
    }
    if(action==='site-settings'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const instagram=String(b.instagram_url||'').trim();if(instagram&&!/^https?:\/\/(www\.)?instagram\.com\//i.test(instagram))return json(res,400,{error:'Informe uma URL válida do Instagram.'});await sql`UPDATE finance_settings SET instagram_url=${instagram||null},updated_at=now(),updated_by=${u.id} WHERE id=1`;return json(res,200,{ok:true,instagram_url:instagram||null})}
    if(action==='update-login-settings'&&req.method==='POST'){
      const u=await requireUser(req,res);if(!u)return;
      const b=await body(req);const current=String(b.current_password||'');
      if(!current)return json(res,400,{error:'Informe sua senha atual.'});
      if(!(await bcrypt.compare(current,u.password_hash)))return json(res,401,{error:'Senha atual incorreta.'});
      const nickname=String(b.nickname||'').trim().toUpperCase();
      const email=String(b.email||'').trim().toLowerCase();
      const newPassword=String(b.new_password||'');
      if(!nickname)return json(res,400,{error:'Informe o apelido.'});
      if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{error:'Informe um e-mail válido.'});
      const nickConflict=await sql`SELECT id FROM operators WHERE lower(nickname)=lower(${nickname}) AND id<>${u.id} LIMIT 1`;if(nickConflict.length)return json(res,409,{error:'Esse apelido já está em uso.'});
      if(email){const emailConflict=await sql`SELECT id FROM operators WHERE lower(coalesce(email,''))=${email} AND id<>${u.id} LIMIT 1`;if(emailConflict.length)return json(res,409,{error:'Esse e-mail já está em uso.'})}
      if(newPassword && newPassword.length<8)return json(res,400,{error:'A nova senha precisa ter pelo menos 8 caracteres.'});
      if(newPassword){const hash=await bcrypt.hash(newPassword,12);await sql`UPDATE operators SET nickname=${nickname},email=${email||null},password_hash=${hash} WHERE id=${u.id}`}
      else await sql`UPDATE operators SET nickname=${nickname},email=${email||null} WHERE id=${u.id}`;
      return json(res,200,{ok:true,nickname,email:email||null});
    }
    if(action==='finance-generate'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;await ensureCurrentDues();return json(res,200,{ok:true})
    }
    if(action==='finance-payment'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const period=b.period||new Date().toISOString().slice(0,7)+'-01';const status=['paid','waived','pending'].includes(b.status)?b.status:'paid';await sql`INSERT INTO membership_dues(operator_id,period,amount,due_date,status,paid_at,payment_note) VALUES(${b.operator_id},${period},COALESCE(${Number(b.amount)||0},0),COALESCE(${b.due_date||period},${period}),${status},${status==='paid'?'now()':null},${b.note||null}) ON CONFLICT(operator_id,period) DO UPDATE SET status=EXCLUDED.status,amount=EXCLUDED.amount,due_date=EXCLUDED.due_date,paid_at=EXCLUDED.paid_at,payment_note=EXCLUDED.payment_note`;return json(res,200,{ok:true})
    }

    if(action==='rsvp'&&req.method==='POST'){
      const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);
      const response=['going','not_going','pending'].includes(b.response)?b.response:'pending';
      const game=(await sql`SELECT id,max_players,status,rsvp_deadline_date,rsvp_deadline_time FROM games WHERE id=${b.game_id} LIMIT 1`)[0];
      if(!game)return json(res,404,{error:'Jogo não encontrado.'});
      if(game.status==='cancelado')return json(res,409,{error:'Este jogo foi cancelado.'});
      if(response==='going'){
        const deadline=game.rsvp_deadline_date ? new Date(`${game.rsvp_deadline_date}T${String(game.rsvp_deadline_time||'23:59:59').slice(0,8)}`) : null;
        if(deadline && Date.now()>=deadline.getTime())return json(res,409,{error:'O prazo para confirmar presença já terminou.'});
        const settings=await currentFinanceSettings();const due=await financeForOperator(u.id);
        if(settings.active&&Number(settings.monthly_fee)>0&&due?.status!=='paid'&&due?.status!=='waived')return json(res,402,{error:'Mensalidade pendente. Regularize o financeiro para confirmar presença nos jogos.'});
        if(game.max_players){const count=(await sql`SELECT count(*)::int AS c FROM game_participants WHERE game_id=${b.game_id} AND response='going' AND operator_id<>${u.id}`)[0].c||0;if(count>=Number(game.max_players))return json(res,409,{error:'Este jogo atingiu o limite de operadores.'})}
      }
      if(response==='pending'){await sql`DELETE FROM game_participants WHERE game_id=${b.game_id} AND operator_id=${u.id}`;return json(res,200,{ok:true,response:'pending'})}
      await sql`INSERT INTO game_participants(game_id,operator_id,response,responded_at,present) VALUES(${b.game_id},${u.id},${response},now(),false) ON CONFLICT(game_id,operator_id) DO UPDATE SET response=EXCLUDED.response,responded_at=now(),present=false,absence_processed=false`;
      return json(res,200,{ok:true,response})
    }

    if(action==='loadout'&&req.method==='POST'){const u=await requireUser(req,res,'operator');if(!u)return;const b=await body(req);await sql`INSERT INTO game_participants(game_id,operator_id,response,loadout,responded_at) VALUES(${b.game_id},${u.id},COALESCE(${b.response||'pending'},'pending'),${JSON.stringify(b.loadout||{})}::jsonb,now()) ON CONFLICT(game_id,operator_id) DO UPDATE SET loadout=EXCLUDED.loadout,response=CASE WHEN EXCLUDED.response='pending' THEN game_participants.response ELSE EXCLUDED.response END,responded_at=now()`;return json(res,200,{ok:true})}

    if(action==='commander'){
      const u=await requireUser(req,res,'commander');if(!u)return;await reconcileAbsences()
      const operators=await sql`SELECT id,name,nickname,role,rank,function,games_count,absences,elo,suspension_until,active,email,photo_url,invite_expires_at,invite_used_at,is_primary_commander,last_promotion_period FROM operators ORDER BY role DESC,active DESC,nickname`
      const fields=await sql`SELECT * FROM game_fields WHERE active=true ORDER BY name`;const games=await sql`SELECT g.*,gf.name field_name,gf.maps_url field_maps_url,count(gp.operator_id) FILTER (WHERE gp.response='going')::int going_count,count(gp.operator_id)::int participant_count FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id LEFT JOIN game_participants gp ON gp.game_id=g.id WHERE g.game_date>=CURRENT_DATE GROUP BY g.id,gf.name,gf.maps_url ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 50`
      const history=await sql`SELECT g.*,count(gp.operator_id) FILTER (WHERE gp.response='going')::int going_count,count(gp.operator_id) FILTER (WHERE gp.present=true)::int present_count,count(gp.operator_id) FILTER (WHERE gp.response='going' AND gp.present=false AND gp.absence_processed=true)::int absence_count FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id LEFT JOIN game_participants gp ON gp.game_id=g.id WHERE g.game_date<CURRENT_DATE GROUP BY g.id,gf.name,gf.maps_url ORDER BY g.game_date DESC,g.game_time DESC NULLS LAST LIMIT 100`
      const requests=await sql`SELECT vr.*,greq.title AS requested_game_title,greq.game_date AS requested_game_date,COALESCE(json_agg(json_build_object('game_id',vga.game_id,'title',g.title,'game_date',g.game_date,'location',g.location)) FILTER (WHERE vga.id IS NOT NULL),'[]') assignments FROM visitor_requests vr LEFT JOIN games greq ON greq.id=vr.requested_game_id LEFT JOIN visitor_game_assignments vga ON vga.visitor_request_id=vr.id LEFT JOIN games g ON g.id=vga.game_id GROUP BY vr.id,greq.title,greq.game_date ORDER BY vr.created_at DESC LIMIT 50`
      await ensureCurrentDues();const financeSettings=await currentFinanceSettings();const dues=await sql`SELECT d.*,o.nickname,o.rank,o.active,o.email FROM membership_dues d JOIN operators o ON o.id=d.operator_id WHERE d.period=date_trunc('month',CURRENT_DATE)::date ORDER BY CASE d.status WHEN 'overdue' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,o.nickname`;
      return json(res,200,{me:u,operators,games,history,requests,ranks,financeSettings,dues,fields})
    }

    if(action==='create-field'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const name=String(b.name||'').trim();const maps=String(b.maps_url||'').trim();if(!name||!maps)return json(res,400,{error:'Informe nome e link do Google Maps.'});const rows=await sql`INSERT INTO game_fields(name,address,maps_url,notes) VALUES(${name},${String(b.address||'').trim()||null},${maps},${String(b.notes||'').trim()||null}) RETURNING *`;return json(res,201,{field:rows[0]})}
    if(action==='delete-field'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const used=(await sql`SELECT count(*)::int c FROM games WHERE field_id=${b.id}`)[0].c||0;if(used>0)return json(res,409,{error:'Este campo já foi usado em jogos e não pode ser excluído.'});await sql`UPDATE game_fields SET active=false WHERE id=${b.id}`;return json(res,200,{ok:true})}
    if(action==='create-game'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);if(!b.title||!b.game_date||!b.field_id)return json(res,400,{error:'Preencha nome, data e selecione o campo.'});
      const min=Math.max(1,Number(b.min_players||4));const max=b.max_players?Number(b.max_players):null;if(max&&max<min)return json(res,400,{error:'O máximo de operadores não pode ser menor que o mínimo.'});const field=(await sql`SELECT id,name,address,maps_url FROM game_fields WHERE id=${b.field_id} AND active=true LIMIT 1`)[0];if(!field)return json(res,400,{error:'Selecione um campo válido.'});
      if(b.rsvp_deadline_date){const deadlineLocal=new Date(`${b.rsvp_deadline_date}T${String(b.rsvp_deadline_time||'23:59').slice(0,5)}:00-03:00`);const gameLocal=new Date(`${b.game_date}T${String(b.game_time||'23:59').slice(0,5)}:00-03:00`);if(Number.isNaN(deadlineLocal.getTime())||deadlineLocal>=gameLocal)return json(res,400,{error:'O prazo de confirmação deve ser antes do início do jogo.'})}
      const eloReward=Math.max(1,Number(b.elo_reward||1)); const rows=await sql`INSERT INTO games(title,game_date,game_time,location,status,description,notes,briefing,min_players,max_players,elo_reward,maps_url,commander_id,field_id,rsvp_deadline_date,rsvp_deadline_time) VALUES(${b.title},${b.game_date},${b.game_time||null},${field.name},${b.status||'confirmado'},${b.description||null},${b.notes||null},${b.briefing||null},${min},${max},${eloReward},${field.maps_url},${u.id},${field.id},${b.rsvp_deadline_date||null},${b.rsvp_deadline_time||null}) RETURNING *`
      await notifyOperatorsForGame(rows[0]);
      return json(res,201,{game:rows[0]})
    }

    if(action==='edit-game'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const min=Math.max(1,Number(b.min_players||4));const max=b.max_players?Number(b.max_players):null;if(max&&max<min)return json(res,400,{error:'O máximo não pode ser menor que o mínimo.'});const eloReward=Math.max(1,Number(b.elo_reward||1));await sql`UPDATE games SET min_players=${min},max_players=${max},elo_reward=${eloReward},maps_url=${String(b.maps_url||'').trim()||null},status=${b.status||'confirmado'},rsvp_deadline_date=${b.rsvp_deadline_date||null},rsvp_deadline_time=${b.rsvp_deadline_time||null} WHERE id=${b.game_id}`;return json(res,200,{ok:true})}
    if(action==='create-invite'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const nickname=String(b.nickname||'').trim().toUpperCase()
      if(!nickname)return json(res,400,{error:'Informe o apelido.'});const existing=await sql`SELECT id FROM operators WHERE lower(nickname)=lower(${nickname}) LIMIT 1`;if(existing.length)return json(res,409,{error:'Esse apelido já está cadastrado.'})
      const code=makeInviteCode();const hash=hashToken(code);const rows=await sql`INSERT INTO operators(name,nickname,password_hash,role,rank,function,active,public_profile,invite_code_hash,invite_expires_at) VALUES(${nickname},${nickname},${await bcrypt.hash(crypto.randomBytes(32).toString('hex'),10)},'operator','Recruta',NULL,false,true,${hash},now()+interval '24 hours') RETURNING id,nickname,function,invite_expires_at`;return json(res,201,{operator:rows[0],code})
    }
    if(action==='revoke-invite'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);await sql`DELETE FROM operators WHERE id=${b.operator_id} AND active=false AND role='operator'`;return json(res,200,{ok:true})}
    if(action==='delete-operator'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);if(String(b.operator_id)===String(u.id))return json(res,400,{error:'O comandante não pode excluir a própria conta.'});const op=(await sql`SELECT id,role FROM operators WHERE id=${b.operator_id} LIMIT 1`)[0];if(!op||op.role!=='operator')return json(res,404,{error:'Operador não encontrado.'});await sql`DELETE FROM operators WHERE id=${op.id}`;return json(res,200,{ok:true})}
    if(action==='change-role'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;if(!u.is_primary_commander)return json(res,403,{error:'Somente o comandante principal pode alterar comandantes.'});const b=await body(req);const op=(await sql`SELECT id,role,is_primary_commander FROM operators WHERE id=${b.operator_id} LIMIT 1`)[0];if(!op)return json(res,404,{error:'Operador não encontrado.'});if(String(op.id)===String(u.id))return json(res,400,{error:'A conta principal não pode ser alterada.'});const role=b.role==='commander'?'commander':'operator';await sql`UPDATE operators SET role=${role},is_primary_commander=false WHERE id=${op.id}`;return json(res,200,{ok:true})}

    if(action==='rank'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const op=(await sql`SELECT id,rank,elo FROM operators WHERE id=${b.operator_id}`)[0];if(!op)return json(res,404,{error:'Operador não encontrado.'});if(!ranks.includes(b.rank))return json(res,400,{error:'Patente inválida.'});await sql`UPDATE operators SET rank=${b.rank},elo=GREATEST(0,COALESCE(elo,0)+${Number(b.elo_delta||0)}) WHERE id=${op.id}`;await sql`INSERT INTO rank_history(operator_id,old_rank,new_rank,reason,changed_by) VALUES(${op.id},${op.rank},${b.rank},${b.reason||null},${u.id})`;return json(res,200,{ok:true})}
    if(action==='penalty'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const days=Math.max(0,Number(b.days||0));if(days)await sql`UPDATE operators SET suspension_until=CURRENT_DATE + ${days}::int WHERE id=${b.operator_id}`;else await sql`UPDATE operators SET suspension_until=NULL WHERE id=${b.operator_id}`;await sql`INSERT INTO penalties(operator_id,type,reason,days,ends_at) VALUES(${b.operator_id},${b.type||'suspensão'},${b.reason||null},${days},${days?new Date(Date.now()+days*86400000):null})`;return json(res,200,{ok:true})}
    if(action==='attendance'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;
      const b=await body(req);
      const before=(await sql`SELECT gp.present,gp.elo_awarded,g.elo_reward FROM game_participants gp JOIN games g ON g.id=gp.game_id WHERE gp.game_id=${b.game_id} AND gp.operator_id=${b.operator_id} LIMIT 1`)[0];
      await sql`UPDATE game_participants SET present=${!!b.present},response=CASE WHEN ${!!b.present} THEN 'attended' ELSE response END,absence_processed=false WHERE game_id=${b.game_id} AND operator_id=${b.operator_id}`;
      await sql`UPDATE operators SET games_count=(SELECT count(*) FROM game_participants WHERE operator_id=${b.operator_id} AND present=true) WHERE id=${b.operator_id}`;
      if(b.present && (!before || !before.present) && !before?.elo_awarded){
        const reward=Math.max(1,Number(before?.elo_reward||1));
        await sql`UPDATE operators SET elo=COALESCE(elo,0)+${reward} WHERE id=${b.operator_id}`;
        await sql`UPDATE game_participants SET elo_awarded=true WHERE game_id=${b.game_id} AND operator_id=${b.operator_id}`;
        await autoPromoteByElo(b.operator_id);
      }
      return json(res,200,{ok:true});
    }

    if(action==='visitor-decision'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const status=b.status==='approved'?'approved':'rejected';await sql`UPDATE visitor_requests SET status=${status},approved_by=${status==='approved'?u.id:null},decided_at=now() WHERE id=${b.id}`;return json(res,200,{ok:true})}
    if(action==='assign-visitor'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);await sql`INSERT INTO visitor_game_assignments(visitor_request_id,game_id,notes) VALUES(${b.visitor_request_id},${b.game_id},${b.notes||null}) ON CONFLICT(visitor_request_id,game_id) DO UPDATE SET notes=EXCLUDED.notes`;return json(res,200,{ok:true})}

    return json(res,404,{error:'Ação não encontrada.'})
  }catch(e){console.error(e);return json(res,500,{error:e?.message||'Erro interno.'})}
}
