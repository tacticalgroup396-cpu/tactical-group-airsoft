import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'

const sql=neon(process.env.DATABASE_URL)
const COOKIE='tg_session'
let schemaReady=null

const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(data))}
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const hash=t=>crypto.createHash('sha256').update(t).digest('hex')
const body=req=>new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>3_500_000)reject(new Error('Payload muito grande.'))});req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)})

async function me(req){const token=cookies(req)[COOKIE];if(!token)return null;const rows=await sql`SELECT o.* FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`;return rows[0]||null}
async function requireUser(req,res,role='operator'){const u=await me(req);if(!u){json(res,401,{error:'Faça login.'});return null}if(role==='commander'&&u.role!=='commander'){json(res,403,{error:'Acesso restrito ao comandante.'});return null}if(role==='operator'&&!['operator','commander'].includes(u.role)){json(res,403,{error:'Acesso restrito.'});return null}return u}

async function ensureSchema(){
  if(!schemaReady){schemaReady=(async()=>{
    await sql`CREATE TABLE IF NOT EXISTS game_missions (
      game_id UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
      team_a_name TEXT NOT NULL DEFAULT 'Equipe A',
      team_b_name TEXT NOT NULL DEFAULT 'Equipe B',
      mission_objective TEXT,
      mission_rules TEXT,
      respawn_rules TEXT,
      mission_duration TEXT,
      secondary_objectives TEXT,
      winning_team TEXT,
      mission_photo TEXT,
      created_by UUID REFERENCES operators(id) ON DELETE SET NULL,
      updated_by UUID REFERENCES operators(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
    await sql`CREATE TABLE IF NOT EXISTS game_mission_members (
      game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
      team_code TEXT CHECK (team_code IN ('A','B','RESERVE')),
      mission_role TEXT NOT NULL DEFAULT 'operator' CHECK (mission_role IN ('operator','leader','medic')),
      kills INTEGER NOT NULL DEFAULT 0,
      deaths INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY(game_id,operator_id)
    )`
    await sql`CREATE INDEX IF NOT EXISTS game_mission_members_game_idx ON game_mission_members(game_id)`
  })().catch(e=>{schemaReady=null;throw e})}
  return schemaReady
}

function cleanText(v,max=4000){const s=String(v||'').trim();return s?s.slice(0,max):null}

export default async function handler(req,res){
  try{
    if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}
    await ensureSchema()
    const url=new URL(req.url,'http://localhost')
    const action=url.searchParams.get('action')||'games'

    if(action==='games'&&req.method==='GET'){
      const u=await requireUser(req,res,'commander');if(!u)return
      const rows=await sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,
        gm.team_a_name,gm.team_b_name,gm.mission_objective,gm.winning_team,
        COALESCE((SELECT count(*)::int FROM game_participants gp WHERE gp.game_id=g.id AND gp.response='going'),0) going_count,
        COALESCE((SELECT count(*)::int FROM game_mission_members mm WHERE mm.game_id=g.id),0) assigned_count
        FROM games g LEFT JOIN game_missions gm ON gm.game_id=g.id
        WHERE g.game_date>=CURRENT_DATE-interval '1 day' AND COALESCE(g.status,'')<>'cancelado'
        ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 40`
      return json(res,200,{games:rows})
    }

    if(action==='get'&&req.method==='GET'){
      const u=await requireUser(req,res,'commander');if(!u)return
      const gameId=url.searchParams.get('game_id');if(!gameId)return json(res,400,{error:'Jogo não informado.'})
      const game=(await sql`SELECT id,title,game_date,game_time,location,status,description,briefing,notes FROM games WHERE id=${gameId} LIMIT 1`)[0]
      if(!game)return json(res,404,{error:'Jogo não encontrado.'})
      const mission=(await sql`SELECT * FROM game_missions WHERE game_id=${gameId} LIMIT 1`)[0]||null
      const people=await sql`SELECT o.id,o.name,o.nickname,o.rank,o.function,o.photo_url,
        COALESCE(mm.team_code,'') team_code,COALESCE(mm.mission_role,'operator') mission_role,
        COALESCE(mm.kills,0)::int kills,COALESCE(mm.deaths,0)::int deaths
        FROM game_participants gp JOIN operators o ON o.id=gp.operator_id
        LEFT JOIN game_mission_members mm ON mm.game_id=gp.game_id AND mm.operator_id=o.id
        WHERE gp.game_id=${gameId} AND gp.response='going' AND o.active=true ORDER BY o.nickname`
      return json(res,200,{game,mission,people})
    }

    if(action==='save'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return
      const b=await body(req);const gameId=String(b.game_id||'');if(!gameId)return json(res,400,{error:'Jogo não informado.'})
      const game=(await sql`SELECT id FROM games WHERE id=${gameId} LIMIT 1`)[0];if(!game)return json(res,404,{error:'Jogo não encontrado.'})
      const photo=String(b.mission_photo||'');if(photo&&!photo.startsWith('data:image/'))return json(res,400,{error:'Foto da missão inválida.'});if(photo.length>2_000_000)return json(res,400,{error:'A foto da missão ficou grande demais.'})
      const a=cleanText(b.team_a_name,80)||'Equipe A',bb=cleanText(b.team_b_name,80)||'Equipe B'
      await sql`INSERT INTO game_missions(game_id,team_a_name,team_b_name,mission_objective,mission_rules,respawn_rules,mission_duration,secondary_objectives,winning_team,mission_photo,created_by,updated_by)
        VALUES(${gameId},${a},${bb},${cleanText(b.mission_objective)},${cleanText(b.mission_rules)},${cleanText(b.respawn_rules)},${cleanText(b.mission_duration,120)},${cleanText(b.secondary_objectives)},${cleanText(b.winning_team,30)},${photo||null},${u.id},${u.id})
        ON CONFLICT(game_id) DO UPDATE SET team_a_name=EXCLUDED.team_a_name,team_b_name=EXCLUDED.team_b_name,mission_objective=EXCLUDED.mission_objective,mission_rules=EXCLUDED.mission_rules,respawn_rules=EXCLUDED.respawn_rules,mission_duration=EXCLUDED.mission_duration,secondary_objectives=EXCLUDED.secondary_objectives,winning_team=EXCLUDED.winning_team,mission_photo=COALESCE(EXCLUDED.mission_photo,game_missions.mission_photo),updated_by=EXCLUDED.updated_by,updated_at=now()`
      const allowed=await sql`SELECT gp.operator_id FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=${gameId} AND gp.response='going' AND o.active=true`
      const allowedSet=new Set(allowed.map(x=>String(x.operator_id)))
      await sql`DELETE FROM game_mission_members WHERE game_id=${gameId} AND operator_id NOT IN (SELECT gp.operator_id FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=${gameId} AND gp.response='going' AND o.active=true)`
      const members=Array.isArray(b.members)?b.members:[]
      for(const m of members){
        const operatorId=String(m.operator_id||'');if(!allowedSet.has(operatorId))continue
        const team=['A','B','RESERVE'].includes(m.team_code)?m.team_code:null
        const role=['operator','leader','medic'].includes(m.mission_role)?m.mission_role:'operator'
        const kills=Math.max(0,Math.min(999,Number(m.kills)||0)),deaths=Math.max(0,Math.min(999,Number(m.deaths)||0))
        await sql`INSERT INTO game_mission_members(game_id,operator_id,team_code,mission_role,kills,deaths) VALUES(${gameId},${operatorId},${team},${role},${kills},${deaths}) ON CONFLICT(game_id,operator_id) DO UPDATE SET team_code=EXCLUDED.team_code,mission_role=EXCLUDED.mission_role,kills=EXCLUDED.kills,deaths=EXCLUDED.deaths,updated_at=now()`
      }
      return json(res,200,{ok:true})
    }

    if(action==='roster'&&req.method==='GET'){
      const u=await requireUser(req,res,'operator');if(!u)return
      const games=await sql`SELECT id,title,game_date,game_time,location,status FROM games WHERE game_date>=CURRENT_DATE AND COALESCE(status,'')<>'cancelado' ORDER BY game_date,game_time NULLS LAST LIMIT 20`
      const out=[]
      for(const g of games){
        const rows=await sql`SELECT o.id,o.nickname,o.rank,o.function,o.photo_url,COALESCE(gp.response,'pending') response FROM operators o LEFT JOIN game_participants gp ON gp.operator_id=o.id AND gp.game_id=${g.id} WHERE o.active=true ORDER BY o.nickname`
        out.push({...g,going:rows.filter(x=>x.response==='going'||x.response==='attended'),not_going:rows.filter(x=>x.response==='not_going'),pending:rows.filter(x=>!['going','attended','not_going'].includes(x.response))})
      }
      return json(res,200,{games:out})
    }

    return json(res,404,{error:'Ação de missão não encontrada.'})
  }catch(e){console.error(e);return json(res,500,{error:e?.message||'Erro interno na missão.'})}
}
