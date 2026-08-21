import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(data))}

export default async function handler(req,res){
  try{
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`
    await sql`CREATE TABLE IF NOT EXISTS visitor_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      nickname TEXT,
      contact TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
    await sql`CREATE TABLE IF NOT EXISTS operator_equipment (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      details TEXT,
      public_visible BOOLEAN NOT NULL DEFAULT TRUE,
      photo_url TEXT
    )`
    await sql`CREATE INDEX IF NOT EXISTS operator_equipment_operator_idx ON operator_equipment(operator_id,category,name)`
    await sql`CREATE TABLE IF NOT EXISTS rank_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
      old_rank TEXT,
      new_rank TEXT,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
    await sql`CREATE INDEX IF NOT EXISTS rank_history_operator_idx ON rank_history(operator_id,created_at DESC)`
    return json(res,200,{ok:true})
  }catch(e){
    return json(res,500,{ok:false,error:e?.message||'Falha ao preparar o banco.'})
  }
}
