import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'

const sql=neon(process.env.DATABASE_URL)
const COOKIE='tg_session'
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(data))}
const hash=t=>crypto.createHash('sha256').update(t).digest('hex')
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const body=req=>new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>200000)reject(new Error('Payload muito grande.'))});req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)})

async function commander(req){
  const token=cookies(req)[COOKIE];if(!token)return null
  const rows=await sql`SELECT o.id,o.role,o.active FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`
  return rows[0]?.role==='commander'?rows[0]:null
}

export default async function handler(req,res){
  try{
    if(req.method!=='POST')return json(res,405,{error:'Método não permitido.'})
    const u=await commander(req);if(!u)return json(res,403,{error:'Acesso restrito ao comandante.'})
    await sql`ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`
    const action=String(req.query?.action||'decision')
    if(action==='decision'){
      const b=await body(req);const id=String(b.id||'').trim();const status=String(b.status||'').trim().toLowerCase();
      if(!id||!['pending','approved','rejected'].includes(status))return json(res,400,{error:'Solicitação ou status inválido.'})
      const rows=await sql`UPDATE visitor_requests SET status=${status} WHERE id=${id} RETURNING id,status`
      if(!rows.length)return json(res,404,{error:'Solicitação de visitante não encontrada.'})
      return json(res,200,{ok:true,request:rows[0]})
    }
    return json(res,400,{error:'Ação inválida.'})
  }catch(e){console.error('visitor-admin',e);return json(res,500,{error:'Não foi possível atualizar o visitante.'})}
}
