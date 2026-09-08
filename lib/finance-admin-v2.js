import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'

const sql=neon(process.env.DATABASE_URL)
const COOKIE='tg_session'

const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(data))}
const parseCookies=req=>Object.fromEntries((req.headers?.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const hashToken=t=>crypto.createHash('sha256').update(t).digest('hex')
const readBody=req=>new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>500000)reject(new Error('Payload muito grande.'))});req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)})
const pad=n=>String(n).padStart(2,'0')
const cleanPeriod=v=>{const m=String(v||'').match(/^(\d{4})-(\d{2})/);if(!m)return new Date().toISOString().slice(0,7)+'-01';const month=Math.min(12,Math.max(1,Number(m[2])));return `${m[1]}-${pad(month)}-01`}
const cleanYear=v=>{const n=Number(v);return Number.isInteger(n)&&n>=2020&&n<=2100?n:new Date().getFullYear()}

async function currentUser(req,res){
  const token=parseCookies(req)[COOKIE];if(!token){json(res,401,{error:'Faça login.'});return null}
  const rows=await sql`SELECT o.id,o.nickname,o.role FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hashToken(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`
  const u=rows[0];if(!u){json(res,401,{error:'Faça login.'});return null}return u
}
function requireCommander(u,res){if(u?.role!=='commander'){json(res,403,{error:'Acesso restrito ao comando.'});return false}return true}

async function ensureSchema(){
  await sql`ALTER TABLE membership_dues ADD COLUMN IF NOT EXISTS payment_method TEXT`
  await sql`ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS reference_id UUID`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS finance_transactions_reference_idx ON finance_transactions(reference_id) WHERE reference_id IS NOT NULL`
}
async function settings(){return (await sql`SELECT * FROM finance_settings WHERE id=1 LIMIT 1`)[0]||{monthly_fee:0,due_day:10,grace_days:0,currency:'BRL',active:true}}
async function ensurePeriodForAll(period){
  const s=await settings();const dueDay=Math.min(28,Math.max(1,Number(s.due_day||10)));
  const dueDate=`${period.slice(0,8)}${pad(dueDay)}`;
  await sql`INSERT INTO membership_dues(operator_id,period,amount,due_date)
    SELECT id,${period}::date,${Number(s.monthly_fee||0)},${dueDate}::date FROM operators WHERE active=true
    ON CONFLICT(operator_id,period) DO UPDATE SET amount=EXCLUDED.amount,due_date=EXCLUDED.due_date WHERE membership_dues.status='pending'`
  return s
}
async function ensureYearForOperator(operatorId,year){
  const s=await settings();const start=`${year}-01-01`,end=`${year}-12-01`,dueDay=Math.min(28,Math.max(1,Number(s.due_day||10)));
  await sql`INSERT INTO membership_dues(operator_id,period,amount,due_date)
    SELECT ${operatorId},gs::date,${Number(s.monthly_fee||0)},make_date(EXTRACT(YEAR FROM gs)::int,EXTRACT(MONTH FROM gs)::int,${dueDay})
    FROM generate_series(${start}::date,${end}::date,interval '1 month') gs
    ON CONFLICT(operator_id,period) DO UPDATE SET amount=EXCLUDED.amount,due_date=EXCLUDED.due_date WHERE membership_dues.status='pending'`
  return s
}

async function listMembers(req,res,url){
  const period=cleanPeriod(url.searchParams.get('period'));const s=await ensurePeriodForAll(period);
  const members=await sql`SELECT o.id,o.name,o.nickname,o.role,o.rank,o.function,o.photo_url,o.age,o.airsoft_years,o.play_style,
      d.id AS due_id,d.period,d.amount,d.due_date,d.status,d.paid_at,d.payment_method,d.payment_note,
      CASE WHEN d.status='pending' AND d.due_date<CURRENT_DATE THEN 'overdue' ELSE d.status END AS effective_status
    FROM operators o LEFT JOIN membership_dues d ON d.operator_id=o.id AND d.period=${period}::date
    WHERE o.active=true ORDER BY lower(o.nickname),o.created_at`
  return json(res,200,{settings:s,period,members,total:members.length})
}

async function operatorDetail(req,res,url,forcedOperatorId=null){
  const operatorId=forcedOperatorId||url.searchParams.get('operator_id');if(!operatorId)return json(res,400,{error:'Operador não informado.'});
  const year=cleanYear(url.searchParams.get('year'));
  const op=(await sql`SELECT id,name,nickname,role,rank,function,photo_url,age,airsoft_years,play_style FROM operators WHERE id=${operatorId} AND active=true LIMIT 1`)[0];
  if(!op)return json(res,404,{error:'Operador não encontrado.'});
  const s=await ensureYearForOperator(operatorId,year);
  const dues=await sql`SELECT id,operator_id,period,amount,due_date,status,paid_at,payment_method,payment_note,
      CASE WHEN status='pending' AND due_date<CURRENT_DATE THEN 'overdue' ELSE status END AS effective_status
    FROM membership_dues WHERE operator_id=${operatorId} AND EXTRACT(YEAR FROM period)=${year} ORDER BY period`;
  const irregular=dues.some(x=>String(x.effective_status)==='overdue');
  return json(res,200,{operator:op,settings:s,year,dues,regular:!irregular})
}

async function savePayment(req,res,u){
  const b=await readBody(req);if(!b.operator_id)return json(res,400,{error:'Operador não informado.'});
  const period=cleanPeriod(b.period);const s=await settings();const amount=Number(b.amount??s.monthly_fee??0);if(!Number.isFinite(amount)||amount<0)return json(res,400,{error:'Valor inválido.'});
  const status=['paid','waived','pending'].includes(String(b.status))?String(b.status):'paid';
  const dueDay=Math.min(28,Math.max(1,Number(s.due_day||10)));const dueDate=`${period.slice(0,8)}${pad(dueDay)}`;
  const paymentDate=/^\d{4}-\d{2}-\d{2}$/.test(String(b.payment_date||''))?String(b.payment_date):new Date().toISOString().slice(0,10);
  const method=status==='paid'?String(b.payment_method||'PIX').trim().slice(0,40):null;const note=String(b.note||'').trim().slice(0,500)||null;
  const paidAt=status==='paid'?new Date(`${paymentDate}T12:00:00Z`):null;
  const due=await sql`INSERT INTO membership_dues(operator_id,period,amount,due_date,status,paid_at,payment_method,payment_note)
    VALUES(${b.operator_id},${period}::date,${amount},${dueDate}::date,${status},${paidAt},${method},${note})
    ON CONFLICT(operator_id,period) DO UPDATE SET amount=EXCLUDED.amount,due_date=EXCLUDED.due_date,status=EXCLUDED.status,paid_at=EXCLUDED.paid_at,payment_method=EXCLUDED.payment_method,payment_note=EXCLUDED.payment_note
    RETURNING id,operator_id,period,amount,status`;
  const row=due[0];const op=(await sql`SELECT nickname FROM operators WHERE id=${b.operator_id} LIMIT 1`)[0];
  if(status==='paid'&&row){
    await sql`INSERT INTO finance_transactions(type,description,amount,transaction_date,category,note,reference_id,created_by)
      VALUES('income',${`Mensalidade @${op?.nickname||'Operador'} — ${period.slice(0,7)}`},${amount},${paymentDate}::date,'Mensalidades',${method?`${method}${note?' · '+note:''}`:note},${row.id},${u.id})
      ON CONFLICT(reference_id) DO UPDATE SET amount=EXCLUDED.amount,description=EXCLUDED.description,transaction_date=EXCLUDED.transaction_date,note=EXCLUDED.note`
  }else if(row){await sql`DELETE FROM finance_transactions WHERE reference_id=${row.id}`}
  return json(res,200,{ok:true,status,message:status==='paid'?'Pagamento registrado.':status==='waived'?'Mensalidade isentada.':'Mensalidade marcada como pendente.'})
}

async function deletePayment(req,res){
  const b=await readBody(req);const dueId=String(b.due_id||'').trim();if(!dueId)return json(res,400,{error:'Mensalidade não informada.'});
  const due=(await sql`SELECT id,operator_id,period,status FROM membership_dues WHERE id=${dueId} LIMIT 1`)[0];if(!due)return json(res,404,{error:'Mensalidade não encontrada.'});
  await sql`DELETE FROM finance_transactions WHERE reference_id=${due.id}`;
  await sql`UPDATE membership_dues SET status='pending',paid_at=NULL,payment_method=NULL,payment_note=NULL WHERE id=${due.id}`;
  return json(res,200,{ok:true,message:'Lançamento excluído. A mensalidade voltou para pendente.'})
}

export default async function handler(req,res){
  try{
    await ensureSchema();const u=await currentUser(req,res);if(!u)return;
    const url=new URL(req.url,'http://localhost');const action=url.searchParams.get('action')||'list';
    if(req.method==='GET'&&action==='self')return operatorDetail(req,res,url,u.id);
    if(!requireCommander(u,res))return;
    if(req.method==='GET'&&action==='list')return listMembers(req,res,url);
    if(req.method==='GET'&&action==='operator')return operatorDetail(req,res,url);
    if(req.method==='POST'&&action==='payment')return savePayment(req,res,u);
    if(req.method==='POST'&&action==='delete-payment')return deletePayment(req,res);
    return json(res,404,{error:'Ação financeira não encontrada.'});
  }catch(e){console.error('finance-admin-v2',e);return json(res,500,{error:e?.message||'Erro interno.'})}
}
