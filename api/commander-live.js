import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'
import webpush from 'web-push'

const sql=neon(process.env.DATABASE_URL),COOKIE='tg_session'
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(data))}
const cookies=req=>Object.fromEntries((req.headers?.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const hash=t=>crypto.createHash('sha256').update(t).digest('hex')
const body=req=>new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>200_000)reject(new Error('Payload muito grande.'))});req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)})
async function commander(req,res){const token=cookies(req)[COOKIE];if(!token){json(res,401,{error:'Faça login.'});return null}const u=(await sql`SELECT o.id,o.nickname,o.role FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`)[0];if(!u){json(res,401,{error:'Faça login.'});return null}if(u.role!=='commander'){json(res,403,{error:'Acesso restrito ao comandante.'});return null}return u}
async function pushAll(title,text,url){if(!(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT))return 0;webpush.setVapidDetails(process.env.VAPID_SUBJECT,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);const subs=await sql`SELECT ps.* FROM push_subscriptions ps JOIN operators o ON o.id=ps.operator_id WHERE o.active=true AND o.role IN ('operator','commander')`;let sent=0;for(const s of subs){try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title,body:text,url}));sent++}catch(e){if(e?.statusCode===404||e?.statusCode===410)await sql`DELETE FROM push_subscriptions WHERE id=${s.id}`}}return sent}
export default async function handler(req,res){try{if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}const u=await commander(req,res);if(!u)return;const action=new URL(req.url,'http://localhost').searchParams.get('action')||''
  if(action==='notify-list'&&req.method==='POST'){
    const b=await body(req),g=(await sql`SELECT id,title,game_date,game_time,location FROM games WHERE id=${b.game_id} LIMIT 1`)[0];if(!g)return json(res,404,{error:'Jogo não encontrado.'})
    const ops=await sql`SELECT id FROM operators WHERE active=true AND role IN ('operator','commander')`;const date=new Date(g.game_date).toLocaleDateString('pt-BR',{timeZone:'UTC'}),text=String(b.message||'').trim()||`Lista de ${g.title} (${date}${g.game_time?' · '+String(g.game_time).slice(0,5):''}). Confirme sua presença no aplicativo.`
    for(const op of ops)await sql`INSERT INTO notifications(operator_id,type,title,body,link) VALUES(${op.id},'game-list','Lista do jogo',${text},'/operador/jogos')`
    const pushSent=await pushAll('📋 Lista do jogo',text,'/operador/jogos');return json(res,200,{ok:true,inApp:ops.length,pushSent})
  }
  if(action==='set-status'&&req.method==='POST'){
    const b=await body(req),status=['confirmado','preparacao','em_andamento','finalizado'].includes(b.status)?b.status:null;if(!status)return json(res,400,{error:'Status inválido.'});const rows=await sql`UPDATE games SET status=${status} WHERE id=${b.game_id} RETURNING id,title,status`;if(!rows[0])return json(res,404,{error:'Jogo não encontrado.'});return json(res,200,{ok:true,game:rows[0]})
  }
  return json(res,404,{error:'Ação não encontrada.'})
}catch(e){console.error('commander-live',e);return json(res,500,{error:e?.message||'Erro no comando da partida.'})}}
