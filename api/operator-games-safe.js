import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'
const sql=neon(process.env.DATABASE_URL), COOKIE='tg_session'
const hash=t=>crypto.createHash('sha256').update(t).digest('hex')
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store,max-age=0');res.end(JSON.stringify(data))}
export default async function handler(req,res){try{
 const token=cookies(req)[COOKIE];if(!token)return json(res,401,{error:'Faça login.'})
 const ur=await sql.query('SELECT o.* FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=$1 AND s.expires_at>now() AND o.active=true LIMIT 1',[hash(token)]);const u=ur.rows?.[0];if(!u)return json(res,401,{error:'Faça login.'})
 const gr=await sql.query('SELECT * FROM games WHERE game_date>=CURRENT_DATE-INTERVAL \'1 day\' ORDER BY game_date ASC, created_at DESC');const games=gr.rows||[]
 let participants=[];if(games.length){const ids=games.map(g=>g.id);participants=(await sql.query('SELECT * FROM game_participants WHERE game_id=ANY($1::uuid[])',[ids])).rows||[]}
 const opIds=[...new Set(participants.map(p=>p.operator_id))];const ops=new Map();if(opIds.length){for(const o of (await sql.query('SELECT * FROM operators WHERE id=ANY($1::uuid[])',[opIds])).rows||[])ops.set(String(o.id),o)}
 for(const g of games){const own=participants.find(p=>String(p.game_id)===String(g.id)&&String(p.operator_id)===String(u.id));g.response=own?.response||((String(own?.attendance).toLowerCase()==='true'||own?.attendance===true)?'going':(String(own?.attendance).toLowerCase()==='false'||own?.attendance===false)?'not_going':'pending');g.loadout=own?.loadout||null;g.going_count=0;g.participants=[];g.not_going_participants=[];for(const p of participants.filter(x=>String(x.game_id)===String(g.id))){const o=ops.get(String(p.operator_id));if(!o)continue;const response=p.response||((String(p.attendance).toLowerCase()==='true'||p.attendance===true)?'going':(String(p.attendance).toLowerCase()==='false'||p.attendance===false)?'not_going':'pending');const row={id:o.id,name:o.name,nickname:o.nickname,rank:o.rank||'Recruta',function:o.function||'Operador',photo_url:o.photo_url||null,elo_level:o.elo_level||7,loadout:p.loadout||{}};if(response==='going'){g.going_count++;g.participants.push(row)}else if(response==='not_going')g.not_going_participants.push(row)}}
 return json(res,200,{games,finance:null,financeSettings:{currency:'BRL',active:false},instagram_url:null,ranks:['Recruta','Soldado','Cabo','3º Sargento','2º Sargento','1º Sargento','Subtenente','Aspirante','Tenente','Capitão','Major','Tenente-Coronel','Coronel']})
}catch(e){console.error('OPERATOR GAMES SAFE API',e);return json(res,500,{error:e?.message||'Erro ao carregar jogos.'})}}
