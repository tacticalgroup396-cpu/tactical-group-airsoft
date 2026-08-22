import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'

const sql = neon(process.env.DATABASE_URL)
const COOKIE = 'tg_session'
let scoresSchemaReady = null

const json = (res, status, data) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.end(JSON.stringify(data))
}

const cookies = req => Object.fromEntries((req.headers?.cookie || '').split(';').filter(Boolean).map(v => {
  const i = v.indexOf('=')
  return [v.slice(0, i).trim(), decodeURIComponent(v.slice(i + 1))]
}))

const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const body = req => new Promise((resolve, reject) => {
  let data = ''
  req.on('data', chunk => {
    data += chunk
    if (data.length > 200_000) reject(new Error('Payload muito grande.'))
  })
  req.on('end', () => {
    try { resolve(data ? JSON.parse(data) : {}) } catch (e) { reject(e) }
  })
  req.on('error', reject)
})

async function currentUser(req) {
  const token = cookies(req)[COOKIE]
  if (!token) return null
  const rows = await sql`SELECT o.id,o.nickname,o.rank,o.role,o.photo_url,o.active
    FROM sessions s JOIN operators o ON o.id=s.operator_id
    WHERE s.token_hash=${hash(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`
  return rows[0] || null
}

async function ensureScoresSchema() {
  if (!scoresSchemaReady) {
    scoresSchemaReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS operator_game_scores (
        id BIGSERIAL PRIMARY KEY,
        operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
        score INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        kills INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`
      await sql`CREATE INDEX IF NOT EXISTS operator_game_scores_best_idx
        ON operator_game_scores(operator_id, score DESC, level DESC, kills DESC)`
      await sql`CREATE INDEX IF NOT EXISTS operator_game_scores_created_idx
        ON operator_game_scores(created_at DESC)`
    })().catch(err => {
      scoresSchemaReady = null
      throw err
    })
  }
  return scoresSchemaReady
}

async function activeOperators() {
  const rows = await sql`SELECT id,nickname,rank,photo_url
    FROM operators
    WHERE active=true AND role IN ('operator','commander')
    ORDER BY nickname ASC`
  return rows.map(row => ({
    id: row.id,
    nickname: row.nickname,
    rank: row.rank || 'Recruta',
    photo_url: row.photo_url || null
  }))
}

async function leaderboard(userId) {
  const rows = await sql`WITH best AS (
      SELECT DISTINCT ON (s.operator_id)
        s.operator_id,s.score,s.level,s.kills,s.created_at
      FROM operator_game_scores s
      ORDER BY s.operator_id,s.score DESC,s.level DESC,s.kills DESC,s.created_at ASC
    )
    SELECT b.operator_id,o.nickname,o.rank,o.photo_url,b.score,b.level,b.kills,b.created_at
    FROM best b JOIN operators o ON o.id=b.operator_id
    WHERE o.active=true
    ORDER BY b.score DESC,b.level DESC,b.kills DESC,b.created_at ASC
    LIMIT 20`
  const leaders = rows.map((row, index) => ({
    rank: index + 1,
    operator_id: row.operator_id,
    nickname: row.nickname,
    operator_rank: row.rank,
    photo_url: row.photo_url || null,
    score: Number(row.score) || 0,
    level: Number(row.level) || 1,
    kills: Number(row.kills) || 0,
    created_at: row.created_at
  }))
  const mine = await sql`SELECT score,level,kills,created_at
    FROM operator_game_scores WHERE operator_id=${userId}
    ORDER BY score DESC,level DESC,kills DESC,created_at ASC LIMIT 1`
  return {
    leaderboard: leaders,
    operators: await activeOperators(),
    myBest: mine[0] ? Number(mine[0].score) || 0 : 0,
    myBestLevel: mine[0] ? Number(mine[0].level) || 1 : 1,
    myBestKills: mine[0] ? Number(mine[0].kills) || 0 : 0
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      return res.end()
    }

    const u = await currentUser(req)
    if (!u) return json(res, 401, { error: 'Faça login como operador para jogar.' })
    if (!['operator', 'commander'].includes(u.role)) return json(res, 403, { error: 'Acesso restrito aos operadores.' })

    await ensureScoresSchema()
    const url = new URL(req.url, 'http://localhost')
    const action = url.searchParams.get('action') || 'leaderboard'

    if (action === 'leaderboard' && req.method === 'GET') {
      const data = await leaderboard(u.id)
      return json(res, 200, {
        user: { id: u.id, nickname: u.nickname, rank: u.rank, role: u.role, photo_url: u.photo_url || null },
        ...data
      })
    }

    if (action === 'score' && req.method === 'POST') {
      const payload = await body(req)
      const score = Math.trunc(Number(payload.score))
      const level = Math.trunc(Number(payload.level))
      const kills = Math.trunc(Number(payload.kills))
      if (!Number.isFinite(score) || !Number.isFinite(level) || !Number.isFinite(kills)) {
        return json(res, 400, { error: 'Resultado inválido.' })
      }
      if (score < 0 || score > 10_000_000 || level < 1 || level > 250 || kills < 0 || kills > 100_000) {
        return json(res, 400, { error: 'Resultado fora dos limites permitidos.' })
      }
      if (score > 0) {
        await sql`INSERT INTO operator_game_scores(operator_id,score,level,kills)
          VALUES(${u.id},${score},${level},${kills})`
      }
      const data = await leaderboard(u.id)
      const first = data.leaderboard[0] || null
      return json(res, 200, {
        ok: true,
        isPersonalBest: score > 0 && score >= data.myBest,
        isOverallRecord: !!first && String(first.operator_id) === String(u.id) && Number(first.score) === score,
        ...data
      })
    }

    return json(res, 404, { error: 'Ação do jogo não encontrada.' })
  } catch (e) {
    console.error('operator-game', e)
    return json(res, 500, { error: e?.message || 'Erro ao carregar o jogo.' })
  }
}
