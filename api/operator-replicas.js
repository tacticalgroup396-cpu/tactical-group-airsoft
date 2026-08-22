import { neon } from '@neondatabase/serverless'
import { put, del } from '@vercel/blob'
import crypto from 'node:crypto'

const sql=neon(process.env.DATABASE_URL)
const COOKIE='tg_session'
let ready=null
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(data))}
const cookies=req=>Object.fromEntries((req.headers?.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const hash=v=>crypto.createHash('sha256').update(v).digest('hex')
const body=req=>new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>5_000_000)reject(new Error('Payload muito grande.'))});req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)})
async function schema(){if(!ready)ready=(async()=>{
  await sql`CREATE TABLE IF NOT EXISTS operator_replicas(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK(kind IN ('primary','secondary')),
    model TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity BETWEEN 1 AND 20),
    photo_url TEXT,
    public_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`
  await sql`CREATE INDEX IF NOT EXISTS operator_replicas_operator_idx ON operator_replicas(operator_id,kind,created_at)`
  await sql`ALTER TABLE operators ADD COLUMN IF NOT EXISTS primary_replica_qty INTEGER NOT NULL DEFAULT 0`
  await sql`ALTER TABLE operators ADD COLUMN IF NOT EXISTS secondary_replica_qty INTEGER NOT NULL DEFAULT 0`
  await sql`ALTER TABLE operators ADD COLUMN IF NOT EXISTS primary_replica_photo_url TEXT`
  await sql`ALTER TABLE operators ADD COLUMN IF NOT EXISTS secondary_replica_photo_url TEXT`
  await sql`INSERT INTO operator_replicas(operator_id,kind,model,quantity,photo_url)
    SELECT o.id,'primary',o.primary_replica,GREATEST(1,COALESCE(o.primary_replica_qty,1)),o.primary_replica_photo_url FROM operators o
    WHERE NULLIF(trim(o.primary_replica),'') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM operator_replicas r WHERE r.operator_id=o.id AND r.kind='primary')`
  await sql`INSERT INTO operator_replicas(operator_id,kind,model,quantity,photo_url)
    SELECT o.id,'secondary',o.secondary_replica,GREATEST(1,COALESCE(o.secondary_replica_qty,1)),o.secondary_replica_photo_url FROM operators o
    WHERE NULLIF(trim(o.secondary_replica),'') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM operator_replicas r WHERE r.operator_id=o.id AND r.kind='secondary')`
})().catch(e=>{ready=null;throw e});return ready}
async function user(req){const t=cookies(req)[COOKIE];if(!t)return null;return (await sql`SELECT o.id,o.nickname,o.role FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hash(t)} AND s.expires_at>now() AND o.active=true LIMIT 1`)[0]||null}
function blobToken(){if(!process.env.BLOB_READ_WRITE_TOKEN)throw new Error('Vercel Blob não está conectado.') ;return process.env.BLOB_READ_WRITE_TOKEN}
function decodeImage(data){const m=String(data||'').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);if(!m)throw new Error('Envie uma imagem válida.');const buffer=Buffer.from(m[2],'base64');if(!buffer.length||buffer.length>3_500_000)throw new Error('Imagem muito grande. Use foto de até 3 MB.');const ext={'image/jpeg':'jpg','image/jpg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'}[m[1].toLowerCase()]||'jpg';return {buffer,type:m[1],ext}}
async function upload(data,operatorId,kind){const x=decodeImage(data);const pathname=`tactical-group/operators/${operatorId}/replicas/${kind}/${Date.now()}-${crypto.randomUUID()}.${x.ext}`;return (await put(pathname,x.buffer,{access:'public',contentType:x.type,addRandomSuffix:false,token:blobToken()})).url}
async function cleanup(url){if(!/^https:\/\/[^/]+\.blob\.vercel-storage\.com\//i.test(String(url||'')))return;try{await del(url,{token:blobToken()})}catch{}}
const clean=r=>({id:r.id,operator_id:r.operator_id,kind:r.kind,model:r.model,quantity:Number(r.quantity)||1,photo_url:r.photo_url||null,public_visible:r.public_visible!==false,created_at:r.created_at})

export default async function handler(req,res){try{
  if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}
  await schema();const u=await user(req);if(!u)return json(res,401,{error:'Faça login novamente.'});if(!['operator','commander'].includes(u.role))return json(res,403,{error:'Acesso restrito.'})
  const url=new URL(req.url,'http://localhost'),action=url.searchParams.get('action')||'list'
  if(action==='list'&&req.method==='GET'){
    const target=String(url.searchParams.get('operator_id')||u.id)
    const exists=(await sql`SELECT id FROM operators WHERE id=${target} AND active=true LIMIT 1`)[0];if(!exists)return json(res,404,{error:'Operador não encontrado.'})
    const rows=String(target)===String(u.id)?await sql`SELECT * FROM operator_replicas WHERE operator_id=${target} ORDER BY CASE WHEN kind='primary' THEN 0 ELSE 1 END,created_at`:await sql`SELECT * FROM operator_replicas WHERE operator_id=${target} AND public_visible=true ORDER BY CASE WHEN kind='primary' THEN 0 ELSE 1 END,created_at`
    return json(res,200,{replicas:rows.map(clean),own:String(target)===String(u.id)})
  }
  if(action==='add'&&req.method==='POST'){
    const b=await body(req),kind=b.kind==='secondary'?'secondary':'primary',model=String(b.model||'').trim().slice(0,180),quantity=Math.max(1,Math.min(20,Math.trunc(Number(b.quantity)||1)))
    if(!model)return json(res,400,{error:'Informe o modelo da réplica.'})
    let photo=null;if(b.image_data)photo=await upload(String(b.image_data),u.id,kind)
    const rows=await sql`INSERT INTO operator_replicas(operator_id,kind,model,quantity,photo_url,public_visible) VALUES(${u.id},${kind},${model},${quantity},${photo},${b.public_visible!==false}) RETURNING *`
    return json(res,201,{ok:true,replica:clean(rows[0])})
  }
  if(action==='delete'&&req.method==='POST'){
    const b=await body(req),row=(await sql`DELETE FROM operator_replicas WHERE id=${b.id} AND operator_id=${u.id} RETURNING photo_url`)[0];if(!row)return json(res,404,{error:'Réplica não encontrada.'});await cleanup(row.photo_url);return json(res,200,{ok:true})
  }
  return json(res,404,{error:'Ação de réplica não encontrada.'})
}catch(e){console.error('operator-replicas',e);return json(res,500,{error:e?.message||'Erro ao carregar réplicas.'})}}
