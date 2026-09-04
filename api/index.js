import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'
import legacyHandler from '../lib/index-legacy.js'

const sql = neon(process.env.DATABASE_URL)
const COOKIE = 'tg_session'
const ranks = ['Recruta','Soldado','Cabo','3º Sargento','2º Sargento','1º Sargento','Subtenente','Aspirante','Tenente','Capitão','Major','Tenente-Coronel','Coronel']
const eloNames={1:'Diamante',2:'Esmeralda',3:'Platina',4:'Ouro',5:'Prata',6:'Bronze',7:'Ferro'}
const clampEloLevel=v=>Math.min(7,Math.max(1,Number(v)||7))
let guardReady=null

const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(data))}
const parseCookies=req=>Object.fromEntries((req.headers?.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const hashToken=t=>crypto.createHash('sha256').update(t).digest('hex')
const body=req=>new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>5_000_000)reject(new Error('Payload muito grande.'))});req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)})

async function userFromSession(req){
  const token=parseCookies(req)[COOKIE];if(!token)return null
  const rows=await sql`SELECT o.* FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hashToken(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`
  return rows[0]||null
}
async function requireCommander(req,res){const u=await userFromSession(req);if(!u){json(res,401,{error:'Faça login.'});return null}if(u.role!=='commander'){json(res,403,{error:'Acesso restrito ao comando.'});return null}return u}

async function recomputeAbsences(){
  await sql`UPDATE operators o SET absences=COALESCE((SELECT count(*)::int FROM game_participants gp WHERE gp.operator_id=o.id AND COALESCE(gp.absence_manual,false)=true),0)`
}

async function ensureGuardSchema(){
  if(!guardReady){
    guardReady=(async()=>{
      await sql`ALTER TABLE game_participants ADD COLUMN IF NOT EXISTS absence_manual BOOLEAN NOT NULL DEFAULT FALSE`
      await sql`CREATE TABLE IF NOT EXISTS system_flags (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      const done=(await sql`SELECT value FROM system_flags WHERE key='manual_absence_guard_v1' LIMIT 1`)[0]
      if(!done){
        await sql`UPDATE game_participants gp SET absence_manual=true WHERE gp.absence_processed=true AND EXISTS (SELECT 1 FROM elo_history eh WHERE eh.operator_id=gp.operator_id AND eh.game_id=gp.game_id AND eh.action='absence')`
        await recomputeAbsences()
        await sql`INSERT INTO system_flags(key,value) VALUES('manual_absence_guard_v1','repaired') ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()`
      }
    })().catch(e=>{guardReady=null;throw e})
  }
  return guardReady
}

async function protectPastUnconfirmed(){
  await sql`UPDATE game_participants gp SET absence_processed=true,absence_manual=false FROM games g WHERE g.id=gp.game_id AND g.game_date<CURRENT_DATE AND gp.response='going' AND gp.present=false AND gp.absence_processed=false`
}

async function currentEloSettings(){return (await sql`SELECT * FROM elo_settings WHERE id=1 LIMIT 1`)[0]||{attendance_step:1,promote_at_level:1,default_level:7,absence_penalty_level:1}}
async function changeEloLevel(operatorId,action,reason,changedBy,gameId=null,step=1){
  const op=(await sql`SELECT id,nickname,rank,elo_level FROM operators WHERE id=${operatorId} LIMIT 1`)[0];if(!op)return null
  const settings=await currentEloSettings();let oldLevel=clampEloLevel(op.elo_level),level=oldLevel,promoted=false,currentRank=op.rank
  if(action==='attendance'){
    let steps=Math.max(1,Number(step||1))
    while(steps-->0){
      if(level>Number(settings.promote_at_level||1))level=Math.max(1,level-1)
      else{
        const idx=ranks.indexOf(currentRank);if(idx<0||idx>=ranks.length-1)break
        const next=ranks[idx+1]
        await sql`INSERT INTO rank_history(operator_id,old_rank,new_rank,reason) VALUES(${operatorId},${currentRank},${next},${reason||'Promoção por participação'})`
        await sql`INSERT INTO notifications(operator_id,type,title,body,link) VALUES(${operatorId},'rank-up','Promoção de patente',${`Você subiu para ${next} por participação.`},'/operador')`
        currentRank=next;promoted=true;level=clampEloLevel(settings.default_level||7)
      }
    }
    await sql`UPDATE operators SET rank=${currentRank},elo_level=${level} WHERE id=${operatorId}`
    await sql`INSERT INTO elo_history(operator_id,game_id,old_level,new_level,action,reason,changed_by) VALUES(${operatorId},${gameId},${oldLevel},${level},'attendance',${reason||'Presença no jogo'},${changedBy||null})`
  }else{
    const penalty=Math.max(1,Number(step||1));level=Math.min(7,oldLevel+penalty)
    await sql`UPDATE operators SET elo_level=${level} WHERE id=${operatorId}`
    await sql`INSERT INTO elo_history(operator_id,game_id,old_level,new_level,action,reason,changed_by) VALUES(${operatorId},${gameId},${oldLevel},${level},${action},${reason||action},${changedBy||null})`
  }
  return {operatorId,oldLevel,newLevel:level,promoted,rank:currentRank,elo:eloNames[level]}
}

async function handleAttendance(req,res){
  const u=await requireCommander(req,res);if(!u)return
  const b=await body(req);if(!b.game_id||!b.operator_id)return json(res,400,{error:'Jogo e operador são obrigatórios.'})
  const before=(await sql`SELECT gp.present,gp.response,gp.elo_awarded,gp.absence_processed,gp.absence_manual,g.elo_reward FROM game_participants gp JOIN games g ON g.id=gp.game_id WHERE gp.game_id=${b.game_id} AND gp.operator_id=${b.operator_id} LIMIT 1`)[0]
  if(!before)return json(res,404,{error:'Participante não encontrado neste jogo.'})
  const present=!!b.present
  if(present){
    await sql`UPDATE game_participants SET present=true,response='attended',absence_processed=true,absence_manual=false WHERE game_id=${b.game_id} AND operator_id=${b.operator_id}`
    if(!before.present&&!before.elo_awarded){
      await changeEloLevel(b.operator_id,'attendance',b.reason||'Presença confirmada pelo comando',u.id,b.game_id,Math.max(1,Number(before.elo_reward||1)))
      await sql`UPDATE game_participants SET elo_awarded=true WHERE game_id=${b.game_id} AND operator_id=${b.operator_id}`
    }
  }else{
    const response=before.response==='attended'?'going':before.response
    const alreadyManual=!!before.absence_manual
    await sql`UPDATE game_participants SET present=false,response=${response},absence_processed=true,absence_manual=true,elo_awarded=false WHERE game_id=${b.game_id} AND operator_id=${b.operator_id}`
    if(!alreadyManual&&response==='going')await changeEloLevel(b.operator_id,'absence',b.reason||'Falta registrada pelo comando',u.id,b.game_id,1)
  }
  await sql`UPDATE operators SET games_count=(SELECT count(*) FROM game_participants WHERE operator_id=${b.operator_id} AND present=true) WHERE id=${b.operator_id}`
  await recomputeAbsences()
  return json(res,200,{ok:true,present})
}

async function handleCancelGame(req,res){
  const u=await requireCommander(req,res);if(!u)return
  const b=await body(req);if(!b.game_id)return json(res,400,{error:'Jogo não informado.'})
  const g=(await sql`SELECT id,title,status FROM games WHERE id=${b.game_id} LIMIT 1`)[0]
  if(!g)return json(res,404,{error:'Jogo não encontrado.'})
  if(g.status==='finalizado')return json(res,409,{error:'Um jogo finalizado não pode ser cancelado.'})
  const reason=String(b.reason||'Jogo cancelado pelo comando').trim().slice(0,500)
  await sql`UPDATE games SET status='cancelado',rsvp_closed=true,rsvp_closed_at=now(),notes=CASE WHEN ${reason}<>'' THEN concat_ws(E'\n',NULLIF(notes,''),${'CANCELADO: '+reason}) ELSE notes END WHERE id=${g.id}`
  await sql`UPDATE game_participants SET absence_processed=true,absence_manual=false WHERE game_id=${g.id}`
  await recomputeAbsences()
  const message=`${g.title} foi cancelado pelo comando.${reason?` Motivo: ${reason}`:''}`
  await sql`INSERT INTO notifications(operator_id,type,title,body,link) SELECT id,'game-cancelled','Jogo cancelado',${message},'/operador/jogos' FROM operators WHERE active=true`
  return json(res,200,{ok:true,status:'cancelado',message:'Jogo cancelado. Nenhuma falta será gerada por ele.'})
}

async function handleRepairAbsences(req,res){
  const u=await requireCommander(req,res);if(!u)return
  await sql`UPDATE game_participants gp SET absence_manual=EXISTS (SELECT 1 FROM elo_history eh WHERE eh.operator_id=gp.operator_id AND eh.game_id=gp.game_id AND eh.action='absence') WHERE gp.absence_processed=true`
  await protectPastUnconfirmed();await recomputeAbsences()
  const rows=await sql`SELECT count(*)::int total FROM operators WHERE absences>0`
  return json(res,200,{ok:true,message:'Faltas automáticas indevidas removidas. Permaneceram apenas as faltas registradas pelo comando.',operators_with_absences:rows[0]?.total||0})
}

async function capturedLegacy(req,res){
  const headers=new Map();let bodyText='';let ended=false
  const mock={statusCode:200,setHeader:(k,v)=>headers.set(String(k).toLowerCase(),v),getHeader:k=>headers.get(String(k).toLowerCase()),end:v=>{bodyText=v==null?'':String(v);ended=true}}
  await legacyHandler(req,mock)
  if(!ended)mock.end('')
  let payload=null
  try{payload=bodyText?JSON.parse(bodyText):null}catch{}
  if(payload?.history&&Array.isArray(payload.history)){
    const counts=await sql`SELECT game_id,count(*)::int AS c FROM game_participants WHERE COALESCE(absence_manual,false)=true GROUP BY game_id`
    const map=new Map(counts.map(x=>[String(x.game_id),Number(x.c||0)]))
    payload.history=payload.history.map(g=>({...g,absence_count:map.get(String(g.id))||0}))
    bodyText=JSON.stringify(payload)
  }
  res.statusCode=mock.statusCode||200
  for(const [k,v] of headers)res.setHeader(k,v)
  res.setHeader('Content-Type','application/json; charset=utf-8')
  res.setHeader('Cache-Control','no-store, max-age=0')
  res.end(bodyText)
}

export default async function handler(req,res){
  try{
    await ensureGuardSchema()
    const url=new URL(req.url,'http://localhost');const action=url.searchParams.get('action')||'public'
    if(action==='attendance'&&req.method==='POST')return handleAttendance(req,res)
    if(action==='cancel-game'&&req.method==='POST')return handleCancelGame(req,res)
    if(action==='repair-auto-absences'&&req.method==='POST')return handleRepairAbsences(req,res)
    if(['commander','games','cron'].includes(action))await protectPastUnconfirmed()
    if(action==='commander')return capturedLegacy(req,res)
    return legacyHandler(req,res)
  }catch(e){console.error('index wrapper',e);return json(res,500,{error:e?.message||'Erro interno.'})}
}
