import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(data))}

export default async function handler(req,res){
  try{
    const id=String(req.query?.id||'').trim()
    if(!id)return json(res,400,{error:'Operador não informado.'})
    const rows=await sql`
      SELECT o.id,o.age,o.birth_date,o.guardian_operator_id,
             g.nickname AS guardian_nickname,
             g.name AS guardian_name,
             g.rank AS guardian_rank,
             g.photo_url AS guardian_photo_url
      FROM operators o
      LEFT JOIN operators g ON g.id=o.guardian_operator_id
      WHERE o.id=${id} AND o.active=true AND o.public_profile=true
      LIMIT 1
    `
    if(!rows.length)return json(res,404,{error:'Operador não encontrado.'})
    const o=rows[0]
    let age=o.age
    if(o.birth_date){
      const birth=new Date(`${String(o.birth_date).slice(0,10)}T00:00:00Z`)
      const now=new Date()
      age=now.getUTCFullYear()-birth.getUTCFullYear()
      const beforeBirthday=(now.getUTCMonth()<birth.getUTCMonth()) || (now.getUTCMonth()===birth.getUTCMonth()&&now.getUTCDate()<birth.getUTCDate())
      if(beforeBirthday)age--
    }
    const minor=Number(age)<18
    return json(res,200,{id:o.id,age:age==null?null:Number(age),minor,guardian:minor&&o.guardian_operator_id?{id:o.guardian_operator_id,nickname:o.guardian_nickname||'',name:o.guardian_name||'',rank:o.guardian_rank||'Responsável',photo_url:o.guardian_photo_url||''}:null})
  }catch(e){return json(res,500,{error:e?.message||'Erro ao consultar responsável.'})}
}
