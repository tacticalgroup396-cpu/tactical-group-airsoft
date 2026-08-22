import { neon } from '@neondatabase/serverless'
import { put, del } from '@vercel/blob'
import crypto from 'node:crypto'

const sql=neon(process.env.DATABASE_URL)
const COOKIE='tg_session'
let schemaReady=null
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(data))}
const cookies=req=>Object.fromEntries((req.headers?.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const hash=t=>crypto.createHash('sha256').update(t).digest('hex')
const body=req=>new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>5_000_000)reject(new Error('Payload muito grande.'))});req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)})
const safe=o=>o?({id:o.id,name:o.name,nickname:o.nickname,email:o.email||null,role:o.role,rank:o.rank,function:o.function||'Operador,',photo_url:o.photo_url||null,bio:o.bio||'',equipment_summary:o.equipment_summary||'',birth_date:o.birth_date||null,age:o.age??null,blood_type:o.blood_type||null,airsoft_years:o.airsoft_years??null,play_style:o.play_style||'',primary_replica:o.primary_replica||'',secondary_replica:o.secondary_replica||'',primary_replica_qty:Number(o.primary_replica_qty)||0,secondary_replica_qty:Number(o.secondary_replica_qty)||0,primary_replica_photo_url:o.primary_replica_photo_url||null,secondary_replica_photo_url:o.secondary_replica_photo_url||null,guardian_operator_id:o.guardian_operator_id||null,public_profile:o.public_profile!==false,elo_level:Number(o.elo_level)||7,games_count:Number(o.games_count)||0,absences:Number(o.absences)||0}):null

async function ensureSchema(){if(!schemaReady)schemaReady=(async()=>{
  await sql`ALTER TABLE operators ADD COLUMN IF NOT EXISTS primary_replica_qty INTEGER NOT NULL DEFAULT 0`
  await sql`ALTER TABLE operators ADD COLUMN IF NOT EXISTS secondary_replica_qty INTEGER NOT NULL DEFAULT 0`
  await sql`ALTER TABLE operators ADD COLUMN IF NOT EXISTS primary_replica_photo_url TEXT`
  await sql`ALTER TABLE operators ADD COLUMN IF NOT EXISTS secondary_replica_photo_url TEXT`
})().catch(e=>{schemaReady=null;throw e});return schemaReady}
async function currentUser(req){const token=cookies(req)[COOKIE];if(!token)return null;const rows=await sql`SELECT o.* FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`;return rows[0]||null}
async function requireUser(req,res){const u=await currentUser(req);if(!u){json(res,401,{error:'Faça login novamente.'});return null}if(!['operator','commander'].includes(u.role)){json(res,403,{error:'Acesso restrito.'});return null}return u}
const adultWhere=()=>`((birth_date IS NOT NULL AND birth_date<=CURRENT_DATE-interval '18 years') OR (birth_date IS NULL AND COALESCE(age,0)>=18))`
function blobToken(){if(!process.env.BLOB_READ_WRITE_TOKEN)throw new Error('Vercel Blob não está conectado.');return process.env.BLOB_READ_WRITE_TOKEN}
function decodeImage(data){const m=String(data||'').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);if(!m)throw new Error('Envie uma imagem válida.');const buffer=Buffer.from(m[2],'base64');if(!buffer.length||buffer.length>3_500_000)throw new Error('Imagem muito grande. Use foto de até 3 MB.');const ext={'image/jpeg':'jpg','image/jpg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'}[m[1].toLowerCase()]||'jpg';return {buffer,type:m[1],ext}}
async function uploadImage(data,folder){const x=decodeImage(data);const pathname=`tactical-group/${folder}/${Date.now()}-${crypto.randomUUID()}.${x.ext}`;return (await put(pathname,x.buffer,{access:'public',contentType:x.type,addRandomSuffix:false,token:blobToken()})).url}
async function cleanup(url){if(!/^https:\/\/[^/]+\.blob\.vercel-storage\.com\//i.test(String(url||'')))return;try{await del(url,{token:blobToken()})}catch{}}

export default async function handler(req,res){try{
  if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}
  await ensureSchema();const u=await requireUser(req,res);if(!u)return
  const url=new URL(req.url,'http://localhost'),action=url.searchParams.get('action')||'settings'
  if(action==='team'&&req.method==='GET'){
    const rows=await sql`SELECT * FROM operators WHERE active=true ORDER BY CASE WHEN role='commander' THEN 0 ELSE 1 END,nickname`
    return json(res,200,{user:safe(u),operators:rows.map(safe)})
  }
  if(action==='profile'&&req.method==='GET'){
    const id=url.searchParams.get('id');if(!id)return json(res,400,{error:'Operador não informado.'})
    const o=(await sql`SELECT * FROM operators WHERE id=${id} AND active=true LIMIT 1`)[0];if(!o)return json(res,404,{error:'Operador não encontrado.'})
    const [equipment,gallery,guardian,responsible]=await Promise.all([
      sql`SELECT id,category,name,details,public_visible,photo_url FROM operator_equipment WHERE operator_id=${id} AND public_visible=true ORDER BY category,name`,
      sql`SELECT id,image_data,caption,created_at FROM operator_gallery WHERE operator_id=${id} ORDER BY created_at DESC LIMIT 30`,
      o.guardian_operator_id?sql`SELECT * FROM operators WHERE id=${o.guardian_operator_id} AND active=true LIMIT 1`:Promise.resolve([]),
      sql`SELECT * FROM operators WHERE guardian_operator_id=${id} AND active=true ORDER BY nickname`
    ])
    return json(res,200,{user:safe(u),operator:safe(o),equipment,gallery,guardian:safe(guardian[0]),responsibleFor:responsible.map(safe)})
  }
  if(action==='settings'&&req.method==='GET'){
    const [equipment,gallery,guardians,responsible,guardian]=await Promise.all([
      sql`SELECT id,category,name,details,public_visible,photo_url FROM operator_equipment WHERE operator_id=${u.id} ORDER BY category,name`,
      sql`SELECT id,image_data,caption,created_at FROM operator_gallery WHERE operator_id=${u.id} ORDER BY created_at DESC LIMIT 30`,
      sql`SELECT * FROM operators WHERE active=true AND id<>${u.id} AND ((birth_date IS NOT NULL AND birth_date<=CURRENT_DATE-interval '18 years') OR (birth_date IS NULL AND COALESCE(age,0)>=18)) ORDER BY CASE WHEN role='commander' THEN 0 ELSE 1 END,nickname`,
      sql`SELECT * FROM operators WHERE guardian_operator_id=${u.id} AND active=true ORDER BY nickname`,
      u.guardian_operator_id?sql`SELECT * FROM operators WHERE id=${u.guardian_operator_id} AND active=true LIMIT 1`:Promise.resolve([])
    ])
    return json(res,200,{user:safe(u),equipment,gallery,guardianOptions:guardians.map(safe),guardian:safe(guardian[0]),responsibleFor:responsible.map(safe)})
  }
  if(action==='save-profile'&&req.method==='POST'){
    const b=await body(req),birth=String(b.birth_date||'').trim()||null
    if(birth&&!/^\d{4}-\d{2}-\d{2}$/.test(birth))return json(res,400,{error:'Data de nascimento inválida.'})
    let age=b.age===''||b.age==null?(u.age??null):Math.max(0,Math.min(120,Number(b.age)||0))
    if(birth){age=Number((await sql`SELECT EXTRACT(YEAR FROM age(CURRENT_DATE,${birth}::date))::int age`)[0]?.age)}
    const minor=Number.isFinite(age)&&age<18;let guardianId=null
    if(minor){guardianId=String(b.guardian_operator_id||'').trim()||null;if(!guardianId)return json(res,400,{error:'Operador menor de 18 anos precisa selecionar um responsável.'});if(guardianId===String(u.id))return json(res,400,{error:'Você não pode ser seu próprio responsável.'});const g=(await sql`SELECT id FROM operators WHERE id=${guardianId} AND active=true AND ((birth_date IS NOT NULL AND birth_date<=CURRENT_DATE-interval '18 years') OR (birth_date IS NULL AND COALESCE(age,0)>=18)) LIMIT 1`)[0];if(!g)return json(res,400,{error:'Selecione um operador responsável maior de idade.'})}
    const oldGuardian=u.guardian_operator_id||null
    await sql`UPDATE operators SET name=COALESCE(NULLIF(${String(b.name||'').trim()},''),name),email=NULLIF(${String(b.email||'').trim().toLowerCase()},''),birth_date=${birth},age=${Number.isFinite(age)?age:null},blood_type=${String(b.blood_type||'').trim()||null},airsoft_years=${b.airsoft_years===''?null:Number(b.airsoft_years)||null},play_style=${String(b.play_style||'').trim()||null},function=${String(b.function||'').trim()||null},bio=${String(b.bio||'').trim()||null},equipment_summary=${String(b.equipment_summary||'').trim()||null},public_profile=${b.public_profile!==false},guardian_operator_id=${guardianId} WHERE id=${u.id}`
    if(guardianId&&String(guardianId)!==String(oldGuardian))await sql`INSERT INTO notifications(operator_id,type,title,body,link) VALUES(${guardianId},'minor-guardian','Responsabilidade por menor',${`Você foi definido como responsável por @${u.nickname}.`},${`/operador/equipe?operator=${u.id}`})`
    return json(res,200,{ok:true,age,is_minor:minor,guardian_operator_id:guardianId})
  }
  if(action==='save-replica'&&req.method==='POST'){
    const b=await body(req),kind=b.kind==='secondary'?'secondary':'primary',model=String(b.model||'').trim().slice(0,180),qty=Math.max(0,Math.min(20,Math.trunc(Number(b.quantity)||0))),incoming=String(b.image_data||''),remove=!!b.remove_photo
    if(kind==='primary'){
      const old=u.primary_replica_photo_url||null;let photo=old;if(incoming)photo=await uploadImage(incoming,`operators/${u.id}/replicas/primary`);else if(remove)photo=null
      await sql`UPDATE operators SET primary_replica=${model||null},primary_replica_qty=${qty},primary_replica_photo_url=${photo} WHERE id=${u.id}`;if((incoming||remove)&&old&&old!==photo)await cleanup(old);return json(res,200,{ok:true,photo_url:photo})
    }
    const old=u.secondary_replica_photo_url||null;let photo=old;if(incoming)photo=await uploadImage(incoming,`operators/${u.id}/replicas/secondary`);else if(remove)photo=null
    await sql`UPDATE operators SET secondary_replica=${model||null},secondary_replica_qty=${qty},secondary_replica_photo_url=${photo} WHERE id=${u.id}`;if((incoming||remove)&&old&&old!==photo)await cleanup(old);return json(res,200,{ok:true,photo_url:photo})
  }
  return json(res,404,{error:'Ação de perfil não encontrada.'})
}catch(e){console.error('operator-profile',e);return json(res,500,{error:e?.message||'Erro ao carregar perfil.'})}}
