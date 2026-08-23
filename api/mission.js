import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'

const sql=neon(process.env.DATABASE_URL)
const COOKIE='tg_session'
const ranks=['Recruta','Soldado','Cabo','3º Sargento','2º Sargento','1º Sargento','Subtenente','Aspirante','Tenente','Capitão','Major','Tenente-Coronel','Coronel']
let schemaReady=null

const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(data))}
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const hash=t=>crypto.createHash('sha256').update(t).digest('hex')
const body=req=>new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>3_500_000)reject(new Error('Payload muito grande.'))});req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)})
const clampLevel=v=>Math.min(7,Math.max(1,Number(v)||7))
const points=v=>Math.max(0,Math.min(7,Number(v)||0))

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
    await sql`ALTER TABLE game_missions ADD COLUMN IF NOT EXISTS winner_elo INTEGER NOT NULL DEFAULT 1`
    await sql`ALTER TABLE game_missions ADD COLUMN IF NOT EXISTS loser_penalty INTEGER NOT NULL DEFAULT 1`
    await sql`ALTER TABLE game_missions ADD COLUMN IF NOT EXISTS absence_penalty INTEGER NOT NULL DEFAULT 1`
    await sql`ALTER TABLE game_missions ADD COLUMN IF NOT EXISTS no_response_penalty INTEGER NOT NULL DEFAULT 1`
    await sql`ALTER TABLE game_missions ADD COLUMN IF NOT EXISTS teams_drawn_at TIMESTAMPTZ`
    await sql`ALTER TABLE game_missions ADD COLUMN IF NOT EXISTS result_processed BOOLEAN NOT NULL DEFAULT FALSE`
    await sql`ALTER TABLE game_missions ADD COLUMN IF NOT EXISTS result_processed_at TIMESTAMPTZ`
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
async function ensureMission(gameId,userId=null){await sql`INSERT INTO game_missions(game_id,created_by,updated_by) VALUES(${gameId},${userId},${userId}) ON CONFLICT(game_id) DO NOTHING`;return (await sql`SELECT * FROM game_missions WHERE game_id=${gameId} LIMIT 1`)[0]}

async function applyElo(operatorId,kind,step,reason,changedBy,gameId){
  let steps=points(step);if(!steps)return null
  const op=(await sql`SELECT id,nickname,rank,elo_level FROM operators WHERE id=${operatorId} LIMIT 1`)[0];if(!op)return null
  const oldLevel=clampLevel(op.elo_level);let level=oldLevel,currentRank=op.rank,promoted=false
  if(kind==='gain'){
    while(steps-->0){
      if(level>1)level--
      else{
        const idx=ranks.indexOf(currentRank);if(idx<0||idx>=ranks.length-1)break
        const next=ranks[idx+1]
        await sql`INSERT INTO rank_history(operator_id,old_rank,new_rank,reason) VALUES(${operatorId},${currentRank},${next},${reason||'Progressão por jogo'})`
        currentRank=next;level=7;promoted=true
      }
    }
  }else level=Math.min(7,level+steps)
  await sql`UPDATE operators SET rank=${currentRank},elo_level=${level} WHERE id=${operatorId}`
  await sql`INSERT INTO elo_history(operator_id,game_id,old_level,new_level,action,reason,changed_by) VALUES(${operatorId},${gameId},${oldLevel},${level},${kind==='gain'?'game_reward':'game_penalty'},${reason},${changedBy||null})`
  const title=kind==='gain'?'Elo recebido':'Perda de Elo';const msg=kind==='gain'?`${reason}. Seu Elo foi atualizado.`:`${reason}. Seu Elo foi reduzido.`
  await sql`INSERT INTO notifications(operator_id,type,title,body,link) VALUES(${operatorId},${kind==='gain'?'elo_reward':'elo_penalty'},${title},${msg},'/operador/jogos')`
  if(promoted)await sql`INSERT INTO notifications(operator_id,type,title,body,link) VALUES(${operatorId},'rank-up','Promoção de patente',${`Você subiu para ${currentRank}.`},'/operador')`
  return {oldLevel,newLevel:level,rank:currentRank,promoted}
}

async function closeRsvp(gameId,changedBy=null,reason='Lista encerrada'){
  const game=(await sql`SELECT id,title,rsvp_closed FROM games WHERE id=${gameId} LIMIT 1`)[0];if(!game)throw new Error('Jogo não encontrado.')
  if(game.rsvp_closed)return {closed:true,already:true,penalized:0}
  const mission=await ensureMission(gameId,changedBy);const penalty=points(mission.no_response_penalty)
  const active=await sql`SELECT id FROM operators WHERE active=true`
  for(const op of active)await sql`INSERT INTO game_participants(game_id,operator_id,response,responded_at,present,absence_processed) VALUES(${gameId},${op.id},'pending',NULL,false,false) ON CONFLICT(game_id,operator_id) DO NOTHING`
  const pending=await sql`SELECT operator_id FROM game_participants WHERE game_id=${gameId} AND response='pending' AND absence_processed=false`
  for(const p of pending){
    if(penalty)await applyElo(p.operator_id,'loss',penalty,`${reason}: não respondeu à lista`,changedBy,gameId)
    await sql`UPDATE game_participants SET absence_processed=true WHERE game_id=${gameId} AND operator_id=${p.operator_id}`
  }
  await sql`UPDATE games SET rsvp_closed=true,rsvp_closed_at=now() WHERE id=${gameId}`
  return {closed:true,already:false,penalized:pending.length,penalty}
}

async function autoCloseDeadlines(){
  const rows=await sql`SELECT id FROM games WHERE COALESCE(rsvp_closed,false)=false AND COALESCE(status,'') NOT IN ('cancelado','finalizado') AND rsvp_deadline_date IS NOT NULL AND ((rsvp_deadline_date + COALESCE(rsvp_deadline_time,'23:59:59'::time)) AT TIME ZONE 'America/Sao_Paulo')<=now()`
  for(const g of rows){try{await closeRsvp(g.id,null,'Prazo da lista encerrado automaticamente')}catch(e){console.warn('auto close',e?.message||e)}}
}

async function rosterForGame(gameId){
  return sql`SELECT o.id,o.name,o.nickname,o.rank,o.function,o.photo_url,COALESCE(gp.response,'pending') response,COALESCE(gp.present,false) present,
    COALESCE(mm.team_code,'') team_code,COALESCE(mm.mission_role,'operator') mission_role,COALESCE(mm.kills,0)::int kills,COALESCE(mm.deaths,0)::int deaths
    FROM operators o LEFT JOIN game_participants gp ON gp.operator_id=o.id AND gp.game_id=${gameId}
    LEFT JOIN game_mission_members mm ON mm.game_id=${gameId} AND mm.operator_id=o.id
    WHERE o.active=true ORDER BY o.nickname`
}

async function completedHistory(limit=40){
  const rows=await sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.description,g.briefing,g.notes,g.match_photo_url,g.completed_at,
    gm.team_a_name,gm.team_b_name,gm.mission_objective,gm.mission_rules,gm.secondary_objectives,gm.mission_duration,gm.winning_team,gm.mission_photo,
    gm.winner_elo,gm.loser_penalty,gm.absence_penalty,gm.no_response_penalty,mp.caption match_caption,
    COALESCE((SELECT count(*)::int FROM game_participants gp WHERE gp.game_id=g.id AND gp.present=true),0) present_count,
    COALESCE((SELECT count(*)::int FROM game_participants gp WHERE gp.game_id=g.id AND gp.response='going' AND gp.present=false),0) absence_count
    FROM games g LEFT JOIN game_missions gm ON gm.game_id=g.id LEFT JOIN match_photos mp ON mp.game_id=g.id
    WHERE g.status='finalizado' OR g.completed_at IS NOT NULL ORDER BY COALESCE(g.completed_at,g.game_date::timestamp) DESC LIMIT ${limit}`
  const out=[]
  for(const g of rows){
    const members=await sql`SELECT o.id,o.nickname,o.rank,o.function,o.photo_url,mm.team_code,mm.mission_role,mm.kills,mm.deaths,COALESCE(gp.present,false) present
      FROM game_mission_members mm JOIN operators o ON o.id=mm.operator_id LEFT JOIN game_participants gp ON gp.game_id=mm.game_id AND gp.operator_id=mm.operator_id
      WHERE mm.game_id=${g.id} ORDER BY mm.team_code,o.nickname`
    out.push({...g,team_a:members.filter(x=>x.team_code==='A'),team_b:members.filter(x=>x.team_code==='B'),reserve:members.filter(x=>x.team_code==='RESERVE')})
  }
  return out
}

export default async function handler(req,res){
  try{
    if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}
    await ensureSchema();const url=new URL(req.url,'http://localhost');const action=url.searchParams.get('action')||'games'

    if(action==='public-history'&&req.method==='GET')return json(res,200,{games:await completedHistory(30)})
    if(action==='history'&&req.method==='GET'){const u=await requireUser(req,res,'operator');if(!u)return;return json(res,200,{games:await completedHistory(60)})}

    if(action==='games'&&req.method==='GET'){
      const u=await requireUser(req,res,'commander');if(!u)return;await autoCloseDeadlines()
      const rows=await sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.elo_reward,g.rsvp_deadline_date,g.rsvp_deadline_time,g.rsvp_closed,
        gm.team_a_name,gm.team_b_name,gm.mission_objective,gm.winning_team,gm.winner_elo,gm.loser_penalty,gm.absence_penalty,gm.no_response_penalty,
        COALESCE((SELECT count(*)::int FROM game_participants gp WHERE gp.game_id=g.id AND gp.response IN ('going','attended')),0) going_count,
        COALESCE((SELECT count(*)::int FROM game_mission_members mm WHERE mm.game_id=g.id AND mm.team_code IN ('A','B')),0) assigned_count
        FROM games g LEFT JOIN game_missions gm ON gm.game_id=g.id
        WHERE g.game_date>=CURRENT_DATE-interval '1 day' AND COALESCE(g.status,'')<>'cancelado' ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 40`
      return json(res,200,{games:rows})
    }

    if(action==='get'&&req.method==='GET'){
      const u=await requireUser(req,res,'commander');if(!u)return;await autoCloseDeadlines()
      const gameId=url.searchParams.get('game_id');if(!gameId)return json(res,400,{error:'Jogo não informado.'})
      const game=(await sql`SELECT id,title,game_date,game_time,location,status,description,briefing,notes,elo_reward,rsvp_deadline_date,rsvp_deadline_time,rsvp_closed FROM games WHERE id=${gameId} LIMIT 1`)[0];if(!game)return json(res,404,{error:'Jogo não encontrado.'})
      const mission=await ensureMission(gameId,u.id);const roster=await rosterForGame(gameId)
      return json(res,200,{game,mission,roster,people:roster.filter(x=>['going','attended'].includes(x.response))})
    }

    if(action==='save'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const gameId=String(b.game_id||'');if(!gameId)return json(res,400,{error:'Jogo não informado.'})
      const game=(await sql`SELECT id FROM games WHERE id=${gameId} LIMIT 1`)[0];if(!game)return json(res,404,{error:'Jogo não encontrado.'})
      const photo=String(b.mission_photo||'');if(photo&&!photo.startsWith('data:image/'))return json(res,400,{error:'Foto da missão inválida.'});if(photo.length>2_000_000)return json(res,400,{error:'A foto da missão ficou grande demais.'})
      const a=cleanText(b.team_a_name,80)||'Equipe A',bb=cleanText(b.team_b_name,80)||'Equipe B'
      await sql`INSERT INTO game_missions(game_id,team_a_name,team_b_name,mission_objective,mission_rules,respawn_rules,mission_duration,secondary_objectives,winning_team,mission_photo,winner_elo,loser_penalty,absence_penalty,no_response_penalty,created_by,updated_by)
        VALUES(${gameId},${a},${bb},${cleanText(b.mission_objective)},${cleanText(b.mission_rules)},${cleanText(b.respawn_rules)},${cleanText(b.mission_duration,120)},${cleanText(b.secondary_objectives)},${cleanText(b.winning_team,30)},${photo||null},${points(b.winner_elo)},${points(b.loser_penalty)},${points(b.absence_penalty)},${points(b.no_response_penalty)},${u.id},${u.id})
        ON CONFLICT(game_id) DO UPDATE SET team_a_name=EXCLUDED.team_a_name,team_b_name=EXCLUDED.team_b_name,mission_objective=EXCLUDED.mission_objective,mission_rules=EXCLUDED.mission_rules,respawn_rules=EXCLUDED.respawn_rules,mission_duration=EXCLUDED.mission_duration,secondary_objectives=EXCLUDED.secondary_objectives,winning_team=EXCLUDED.winning_team,mission_photo=COALESCE(EXCLUDED.mission_photo,game_missions.mission_photo),winner_elo=EXCLUDED.winner_elo,loser_penalty=EXCLUDED.loser_penalty,absence_penalty=EXCLUDED.absence_penalty,no_response_penalty=EXCLUDED.no_response_penalty,updated_by=EXCLUDED.updated_by,updated_at=now()`
      const allowed=await sql`SELECT gp.operator_id FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=${gameId} AND gp.response IN ('going','attended') AND o.active=true`;const allowedSet=new Set(allowed.map(x=>String(x.operator_id)))
      await sql`DELETE FROM game_mission_members WHERE game_id=${gameId} AND operator_id NOT IN (SELECT gp.operator_id FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=${gameId} AND gp.response IN ('going','attended') AND o.active=true)`
      const members=Array.isArray(b.members)?b.members:[]
      for(const m of members){const operatorId=String(m.operator_id||'');if(!allowedSet.has(operatorId))continue;const team=['A','B','RESERVE'].includes(m.team_code)?m.team_code:null;const role=['operator','leader','medic'].includes(m.mission_role)?m.mission_role:'operator';const kills=Math.max(0,Math.min(999,Number(m.kills)||0)),deaths=Math.max(0,Math.min(999,Number(m.deaths)||0));await sql`INSERT INTO game_mission_members(game_id,operator_id,team_code,mission_role,kills,deaths) VALUES(${gameId},${operatorId},${team},${role},${kills},${deaths}) ON CONFLICT(game_id,operator_id) DO UPDATE SET team_code=EXCLUDED.team_code,mission_role=EXCLUDED.mission_role,kills=EXCLUDED.kills,deaths=EXCLUDED.deaths,updated_at=now()`}
      return json(res,200,{ok:true})
    }

    if(action==='draw-teams'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const gameId=String(b.game_id||'');if(!gameId)return json(res,400,{error:'Jogo não informado.'});await ensureMission(gameId,u.id)
      const people=await sql`SELECT o.id,o.nickname FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=${gameId} AND gp.response IN ('going','attended') AND o.active=true ORDER BY o.nickname`
      if(people.length<2)return json(res,409,{error:'É preciso ter pelo menos 2 operadores marcados como Vou para sortear.'})
      const shuffled=[...people];for(let i=shuffled.length-1;i>0;i--){const j=crypto.randomInt(i+1);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]}
      await sql`DELETE FROM game_mission_members WHERE game_id=${gameId} AND operator_id NOT IN (SELECT gp.operator_id FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id=${gameId} AND gp.response IN ('going','attended') AND o.active=true)`
      for(let i=0;i<shuffled.length;i++){const team=i%2===0?'A':'B';await sql`INSERT INTO game_mission_members(game_id,operator_id,team_code) VALUES(${gameId},${shuffled[i].id},${team}) ON CONFLICT(game_id,operator_id) DO UPDATE SET team_code=EXCLUDED.team_code,updated_at=now()`}
      await sql`UPDATE game_missions SET teams_drawn_at=now(),updated_by=${u.id},updated_at=now() WHERE game_id=${gameId}`
      return json(res,200,{ok:true,count:shuffled.length})
    }

    if(action==='close-rsvp'&&req.method==='POST'){const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);return json(res,200,await closeRsvp(String(b.game_id||''),u.id,'Lista encerrada pelo comando'))}

    if(action==='attendance'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const gameId=String(b.game_id||''),operatorId=String(b.operator_id||'');if(!gameId||!operatorId)return json(res,400,{error:'Jogo e operador são obrigatórios.'})
      await sql`INSERT INTO game_participants(game_id,operator_id,response,responded_at,present,absence_processed) VALUES(${gameId},${operatorId},'pending',NULL,false,false) ON CONFLICT(game_id,operator_id) DO NOTHING`
      const before=(await sql`SELECT gp.present,gp.response,gp.elo_awarded,gp.absence_processed,g.elo_reward FROM game_participants gp JOIN games g ON g.id=gp.game_id WHERE gp.game_id=${gameId} AND gp.operator_id=${operatorId} LIMIT 1`)[0];const mission=await ensureMission(gameId,u.id);const present=!!b.present
      await sql`UPDATE game_participants SET present=${present},response=CASE WHEN ${present} THEN 'attended' ELSE response END WHERE game_id=${gameId} AND operator_id=${operatorId}`
      if(present&&!before?.elo_awarded){await applyElo(operatorId,'gain',Number(before?.elo_reward||1),'Participação confirmada no jogo',u.id,gameId);await sql`UPDATE game_participants SET elo_awarded=true,absence_processed=false WHERE game_id=${gameId} AND operator_id=${operatorId}`}
      else if(!present&&before&&before.response==='going'&&!before.absence_processed){if(points(mission.absence_penalty))await applyElo(operatorId,'loss',mission.absence_penalty,'Faltou após marcar Vou',u.id,gameId);await sql`UPDATE game_participants SET elo_awarded=false,absence_processed=true WHERE game_id=${gameId} AND operator_id=${operatorId}`}
      await sql`UPDATE operators SET games_count=(SELECT count(*) FROM game_participants WHERE operator_id=${operatorId} AND present=true),absences=(SELECT count(*) FROM game_participants WHERE operator_id=${operatorId} AND response='going' AND present=false AND absence_processed=true) WHERE id=${operatorId}`
      return json(res,200,{ok:true})
    }

    if(action==='finalize'&&req.method==='POST'){
      const u=await requireUser(req,res,'commander');if(!u)return;const b=await body(req);const gameId=String(b.game_id||''),winner=['A','B','Empate'].includes(b.winning_team)?b.winning_team:null;if(!gameId)return json(res,400,{error:'Jogo não informado.'});if(!winner)return json(res,400,{error:'Informe o time vencedor ou selecione Empate.'})
      const game=(await sql`SELECT id,title,elo_reward,rsvp_closed FROM games WHERE id=${gameId} LIMIT 1`)[0];if(!game)return json(res,404,{error:'Jogo não encontrado.'});const mission=await ensureMission(gameId,u.id)
      if(mission.result_processed)return json(res,200,{ok:true,already:true})
      if(!game.rsvp_closed)await closeRsvp(gameId,u.id,'Jogo encerrado')
      await sql`UPDATE game_missions SET winning_team=${winner},updated_by=${u.id},updated_at=now() WHERE game_id=${gameId}`
      const rows=await sql`SELECT gp.operator_id,gp.response,gp.present,gp.elo_awarded,gp.absence_processed,mm.team_code FROM game_participants gp LEFT JOIN game_mission_members mm ON mm.game_id=gp.game_id AND mm.operator_id=gp.operator_id WHERE gp.game_id=${gameId}`
      let presentCount=0,absenceCount=0,winners=0,losers=0
      for(const r of rows){
        if(r.present||r.response==='attended'){
          presentCount++
          if(!r.elo_awarded){await applyElo(r.operator_id,'gain',game.elo_reward,'Participação no jogo',u.id,gameId);await sql`UPDATE game_participants SET elo_awarded=true,absence_processed=false WHERE game_id=${gameId} AND operator_id=${r.operator_id}`}
          if(winner!=='Empate'&&['A','B'].includes(r.team_code)){
            if(r.team_code===winner){if(points(mission.winner_elo)){await applyElo(r.operator_id,'gain',mission.winner_elo,'Vitória do time na partida',u.id,gameId);winners++}}
            else {if(points(mission.loser_penalty)){await applyElo(r.operator_id,'loss',mission.loser_penalty,'Derrota do time na partida',u.id,gameId);losers++}}
          }
        }else if(r.response==='going'&&!r.absence_processed){absenceCount++;if(points(mission.absence_penalty))await applyElo(r.operator_id,'loss',mission.absence_penalty,'Faltou após marcar Vou',u.id,gameId);await sql`UPDATE game_participants SET absence_processed=true,elo_awarded=false WHERE game_id=${gameId} AND operator_id=${r.operator_id}`}
      }
      await sql`UPDATE operators o SET games_count=(SELECT count(*) FROM game_participants gp WHERE gp.operator_id=o.id AND gp.present=true),absences=(SELECT count(*) FROM game_participants gp WHERE gp.operator_id=o.id AND gp.response='going' AND gp.present=false AND gp.absence_processed=true) WHERE o.id IN (SELECT operator_id FROM game_participants WHERE game_id=${gameId})`
      await sql`UPDATE game_missions SET result_processed=true,result_processed_at=now(),winning_team=${winner},updated_by=${u.id},updated_at=now() WHERE game_id=${gameId}`
      await sql`UPDATE games SET status='finalizado',completed_at=COALESCE(completed_at,now()),rsvp_closed=true,rsvp_closed_at=COALESCE(rsvp_closed_at,now()) WHERE id=${gameId}`
      return json(res,200,{ok:true,present:presentCount,absences:absenceCount,winners,losers})
    }

    if(action==='roster'&&req.method==='GET'){
      const u=await requireUser(req,res,'operator');if(!u)return;await autoCloseDeadlines()
      const games=await sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.elo_reward,g.rsvp_deadline_date,g.rsvp_deadline_time,g.rsvp_closed,gm.winner_elo,gm.loser_penalty,gm.absence_penalty,gm.no_response_penalty FROM games g LEFT JOIN game_missions gm ON gm.game_id=g.id WHERE g.game_date>=CURRENT_DATE AND COALESCE(g.status,'')<>'cancelado' ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 20`
      const out=[];for(const g of games){const rows=await rosterForGame(g.id);out.push({...g,going:rows.filter(x=>['going','attended'].includes(x.response)),not_going:rows.filter(x=>x.response==='not_going'),pending:rows.filter(x=>!['going','attended','not_going'].includes(x.response))})}
      return json(res,200,{games:out})
    }

    return json(res,404,{error:'Ação de missão não encontrada.'})
  }catch(e){console.error(e);return json(res,500,{error:e?.message||'Erro interno na missão.'})}
}
