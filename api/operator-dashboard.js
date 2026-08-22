import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'

const sql=neon(process.env.DATABASE_URL)
const COOKIE='tg_session'
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store, max-age=0');res.end(JSON.stringify(data))}
const cookies=req=>Object.fromEntries((req.headers?.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}))
const hash=t=>crypto.createHash('sha256').update(t).digest('hex')
const body=req=>new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>2_000_000)reject(new Error('Payload muito grande.'))});req.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}});req.on('error',reject)})
async function currentUser(req){const token=cookies(req)[COOKIE];if(!token)return null;const rows=await sql`SELECT o.* FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`;return rows[0]||null}
const publicOp=o=>({id:o.id,name:o.name,nickname:o.nickname,rank:o.rank,function:o.function||'Operador',photo_url:o.photo_url||null,bio:o.bio||'',elo_level:Number(o.elo_level)||7,birth_date:o.birth_date||null,age:o.age??null,airsoft_years:o.airsoft_years??null,play_style:o.play_style||'',primary_replica:o.primary_replica||'',secondary_replica:o.secondary_replica||''})
const safeUser=u=>{const {password_hash,...rest}=u;return rest}

export default async function handler(req,res){
  try{
    if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}
    const url=new URL(req.url,'http://localhost')
    const action=url.searchParams.get('action')||'dashboard'
    const u=await currentUser(req)
    if(!u)return json(res,401,{error:'Faça login novamente.'})
    if(!['operator','commander'].includes(u.role))return json(res,403,{error:'Acesso restrito.'})
    const settingsRows=()=>sql`SELECT monthly_fee,due_day,grace_days,currency,active,pix_key,pix_holder,instagram_url FROM finance_settings WHERE id=1 LIMIT 1`

    if(action==='me'&&req.method==='GET'){
      const s=(await settingsRows())[0]||{}
      return json(res,200,{user:safeUser(u),instagram_url:s.instagram_url||null})
    }
    if(action==='team'&&req.method==='GET'){
      const [rows,sr]=await Promise.all([sql`SELECT id,name,nickname,rank,function,photo_url,bio,elo_level,birth_date,age,airsoft_years,play_style,primary_replica,secondary_replica FROM operators WHERE active=true ORDER BY CASE WHEN role='commander' THEN 0 ELSE 1 END,nickname`,settingsRows()])
      return json(res,200,{operators:rows.map(publicOp),instagram_url:sr[0]?.instagram_url||null})
    }
    if(action==='profile'&&req.method==='GET'){
      const id=url.searchParams.get('id');if(!id)return json(res,400,{error:'Operador não informado.'})
      const [rows,equipment]=await Promise.all([sql`SELECT id,name,nickname,rank,function,photo_url,bio,elo_level,birth_date,age,airsoft_years,play_style,primary_replica,secondary_replica FROM operators WHERE id=${id} AND active=true LIMIT 1`,sql`SELECT id,category,name,details,photo_url FROM operator_equipment WHERE operator_id=${id} AND public_visible=true ORDER BY category,name`])
      if(!rows[0])return json(res,404,{error:'Operador não encontrado.'})
      return json(res,200,{operator:publicOp(rows[0]),equipment})
    }
    if(action==='settings'&&req.method==='GET'){
      const [equipment,gallery,guardianOptions,responsibleRows,sr]=await Promise.all([
        sql`SELECT id,category,name,details,public_visible,photo_url FROM operator_equipment WHERE operator_id=${u.id} ORDER BY category,name`,
        sql`SELECT id,image_data,caption,created_at FROM operator_gallery WHERE operator_id=${u.id} ORDER BY created_at DESC LIMIT 30`,
        sql`SELECT id,name,nickname,rank,function,photo_url,birth_date,age FROM operators WHERE active=true AND id<>${u.id} AND (birth_date IS NULL OR birth_date<=CURRENT_DATE-interval '18 years') ORDER BY CASE WHEN role='commander' THEN 0 ELSE 1 END,nickname`,
        sql`SELECT id,name,nickname,rank,function,photo_url,birth_date,age FROM operators WHERE guardian_operator_id=${u.id} AND active=true ORDER BY nickname`,
        settingsRows()
      ])
      const guardian=u.guardian_operator_id?(await sql`SELECT id,name,nickname,rank,function,photo_url,birth_date,age FROM operators WHERE id=${u.guardian_operator_id} AND active=true LIMIT 1`)[0]||null:null
      return json(res,200,{user:safeUser(u),equipment,gallery,guardian:guardian?publicOp(guardian):null,guardianOptions:guardianOptions.map(publicOp),responsibleFor:responsibleRows.map(publicOp),instagram_url:sr[0]?.instagram_url||null})
    }
    if(action==='dashboard'&&req.method==='GET'){
      const [guardianRows,responsibleRows,guardianOptions,games,participants,financeRows,financeSettingsRows]=await Promise.all([
        u.guardian_operator_id?sql`SELECT id,name,nickname,rank,function,photo_url,birth_date,age FROM operators WHERE id=${u.guardian_operator_id} AND active=true LIMIT 1`:Promise.resolve([]),
        sql`SELECT id,name,nickname,rank,function,photo_url,birth_date,age FROM operators WHERE guardian_operator_id=${u.id} AND active=true ORDER BY nickname`,
        sql`SELECT id,name,nickname,rank,function,photo_url,birth_date,age FROM operators WHERE active=true AND id<>${u.id} AND (birth_date IS NULL OR birth_date<=CURRENT_DATE-interval '18 years') ORDER BY CASE WHEN role='commander' THEN 0 ELSE 1 END,nickname`,
        sql`SELECT g.id,g.title,g.game_date,g.game_time,g.location,g.status,g.description,g.notes,g.briefing,g.min_players,g.max_players,g.rsvp_deadline_date,g.rsvp_deadline_time,g.rsvp_closed,gf.name field_name,gf.maps_url field_maps_url,COALESCE(gp.response,'pending') response,gp.loadout,gp.responded_at FROM games g LEFT JOIN game_fields gf ON gf.id=g.field_id LEFT JOIN game_participants gp ON gp.game_id=g.id AND gp.operator_id=${u.id} WHERE g.game_date>=CURRENT_DATE-interval '1 day' AND COALESCE(g.status,'')<>'cancelado' ORDER BY g.game_date,g.game_time NULLS LAST LIMIT 20`,
        sql`SELECT gp.game_id,gp.response,gp.loadout,o.id,o.name,o.nickname,o.rank,o.function,o.photo_url,o.elo_level FROM game_participants gp JOIN games g ON g.id=gp.game_id JOIN operators o ON o.id=gp.operator_id WHERE g.game_date>=CURRENT_DATE-interval '1 day' AND COALESCE(g.status,'')<>'cancelado' AND o.active=true ORDER BY g.game_date,o.nickname`,
        sql`SELECT d.*,to_char(d.period,'YYYY-MM') period_label FROM membership_dues d WHERE d.operator_id=${u.id} AND d.period=date_trunc('month',CURRENT_DATE)::date LIMIT 1`,
        settingsRows()
      ])
      const normalizedGames=games.map(g=>{const list=participants.filter(p=>String(p.game_id)===String(g.id)).map(p=>({...publicOp(p),response:p.response,loadout:p.loadout||null}));return {...g,participants:list.filter(p=>p.response==='going'),not_going_participants:list.filter(p=>p.response==='not_going'),pending_participants:list.filter(p=>!p.response||p.response==='pending')}})
      const birth=u.birth_date?String(u.birth_date).slice(0,10):null
      const minorRow=birth?(await sql`SELECT (${birth}::date>CURRENT_DATE-interval '18 years') AS minor`)[0]:{minor:false}
      const settings=financeSettingsRows[0]||{monthly_fee:0,currency:'BRL',active:false}
      return json(res,200,{user:{...safeUser(u),is_minor:!!minorRow.minor},guardian:guardianRows[0]?publicOp(guardianRows[0]):null,responsibleFor:responsibleRows.map(publicOp),guardianOptions:guardianOptions.map(publicOp),games:normalizedGames,finance:financeRows[0]||null,financeSettings:settings,instagram_url:settings.instagram_url||null})
    }
    if(action==='save-guardian'&&req.method==='POST'){
      const b=await body(req),birth=String(b.birth_date||'').trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(birth))return json(res,400,{error:'Informe uma data de nascimento válida.'})
      const calc=(await sql`SELECT EXTRACT(YEAR FROM age(CURRENT_DATE,${birth}::date))::int AS age,(${birth}::date>CURRENT_DATE-interval '18 years') AS minor`)[0],isMinor=!!calc.minor;let guardianId=null
      if(isMinor){guardianId=String(b.guardian_operator_id||'').trim()||null;if(!guardianId)return json(res,400,{error:'Operador menor de 18 anos precisa selecionar um responsável ativo.'});if(guardianId===String(u.id))return json(res,400,{error:'Você não pode ser seu próprio responsável.'});const g=(await sql`SELECT id FROM operators WHERE id=${guardianId} AND active=true AND (birth_date IS NULL OR birth_date<=CURRENT_DATE-interval '18 years') LIMIT 1`)[0];if(!g)return json(res,400,{error:'Selecione um operador responsável ativo e maior de idade.'})}
      await sql`UPDATE operators SET birth_date=${birth},age=${Number(calc.age)||null},guardian_operator_id=${guardianId} WHERE id=${u.id}`;return json(res,200,{ok:true,is_minor:isMinor,age:Number(calc.age)||null,guardian_operator_id:guardianId})
    }
    if(action==='rsvp'&&req.method==='POST'){
      const b=await body(req),response=['going','not_going'].includes(b.response)?b.response:null;if(!response)return json(res,400,{error:'Escolha Vou ou Não vou.'})
      const game=(await sql`SELECT id,max_players,status,rsvp_closed FROM games WHERE id=${b.game_id} LIMIT 1`)[0];if(!game)return json(res,404,{error:'Jogo não encontrado.'});if(game.status==='cancelado')return json(res,409,{error:'Este jogo foi cancelado.'})
      if(response==='going'){
        const settings=(await sql`SELECT monthly_fee,active,due_day,grace_days FROM finance_settings WHERE id=1 LIMIT 1`)[0]
        if(settings?.active&&Number(settings.monthly_fee)>0){const period=(await sql`SELECT date_trunc('month',CURRENT_DATE)::date AS p,(date_trunc('month',CURRENT_DATE)::date + (${Math.max(1,Math.min(28,Number(settings.due_day||10)))-1})::int) AS due`)[0];await sql`INSERT INTO membership_dues(operator_id,period,amount,due_date,status) VALUES(${u.id},${period.p},${Number(settings.monthly_fee)},${period.due},'pending') ON CONFLICT(operator_id,period) DO NOTHING`;const due=(await sql`SELECT status FROM membership_dues WHERE operator_id=${u.id} AND period=${period.p} LIMIT 1`)[0];if(due&&!['paid','waived'].includes(due.status))return json(res,402,{error:'Mensalidade pendente. Regularize o financeiro para confirmar presença.'})}
        if(game.max_players){const count=(await sql`SELECT count(*)::int c FROM game_participants WHERE game_id=${game.id} AND response='going' AND operator_id<>${u.id}`)[0]?.c||0;if(count>=Number(game.max_players))return json(res,409,{error:'Este jogo atingiu o limite de operadores.'})}
      }
      await sql`INSERT INTO game_participants(game_id,operator_id,response,responded_at,present) VALUES(${game.id},${u.id},${response},now(),false) ON CONFLICT(game_id,operator_id) DO UPDATE SET response=EXCLUDED.response,responded_at=now(),present=false,absence_processed=false`
      return json(res,200,{ok:true,response})
    }
    if(action==='loadout'&&req.method==='POST'){
      const b=await body(req);if(!b.game_id)return json(res,400,{error:'Jogo inválido.'});await sql`INSERT INTO game_participants(game_id,operator_id,response,loadout,responded_at) VALUES(${b.game_id},${u.id},'pending',${JSON.stringify(b.loadout||{})}::jsonb,now()) ON CONFLICT(game_id,operator_id) DO UPDATE SET loadout=EXCLUDED.loadout,responded_at=now()`;return json(res,200,{ok:true})
    }
    if(action==='logout'){
      const token=cookies(req)[COOKIE];if(token)await sql`DELETE FROM sessions WHERE token_hash=${hash(token)}`;res.setHeader('Set-Cookie',`${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`);return json(res,200,{ok:true})
    }
    return json(res,404,{error:'Ação não encontrada.'})
  }catch(e){console.error('operator-dashboard',e);return json(res,500,{error:e?.message||'Erro ao carregar a área do operador.'})}
}
