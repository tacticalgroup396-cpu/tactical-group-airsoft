import { neon } from '@neondatabase/serverless'
import crypto from 'node:crypto'

const sql = neon(process.env.DATABASE_URL)
const COOKIE = 'tg_session'

const json = (res, status, data) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.end(JSON.stringify(data))
}

const parseCookies = req => Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(v => {
  const i = v.indexOf('=')
  return [v.slice(0, i).trim(), decodeURIComponent(v.slice(i + 1))]
}))

const hashToken = token => crypto.createHash('sha256').update(token).digest('hex')

async function currentUser(req) {
  const token = parseCookies(req)[COOKIE]
  if (!token) return null
  const rows = await sql`SELECT o.id, o.nickname, o.role FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.token_hash=${hashToken(token)} AND s.expires_at>now() AND o.active=true LIMIT 1`
  return rows[0] || null
}

const operatorFields = 'o.id, o.nickname, o.name, o.rank, o.function, o.photo_url, o.elo_level'

async function participants(gameIds, onlyPresent = false) {
  if (!gameIds.length) return []
  const placeholders = gameIds.map((_, i) => `$${i + 1}`).join(',')
  const present = onlyPresent ? ' AND COALESCE(gp.present,false)=true' : ''
  return sql.query(`SELECT gp.game_id, gp.operator_id, gp.response, gp.present, gp.loadout, ${operatorFields} FROM game_participants gp JOIN operators o ON o.id=gp.operator_id WHERE gp.game_id IN (${placeholders}) AND o.active=true${present} ORDER BY o.nickname`, gameIds)
}

export default async function handler(req, res) {
  try {
    const user = await currentUser(req)
    if (!user || !['operator', 'commander'].includes(user.role)) return json(res, 401, { error: 'Faça login como operador.' })

    const active = await sql`
      SELECT g.id, g.title, g.game_date, g.game_time, g.status, g.min_players, g.max_players,
             g.rsvp_deadline_date, g.rsvp_deadline_time, g.description, g.briefing, g.notes,
             g.completed_at, g.match_photo_url, f.name AS field_name, f.address AS field_address, f.maps_url AS field_maps_url
      FROM games g
      LEFT JOIN game_fields f ON f.id=g.field_id
      WHERE g.completed_at IS NULL AND COALESCE(g.status,'confirmado') <> 'cancelado'
      ORDER BY g.game_date ASC, g.game_time ASC NULLS LAST
    `

    const finished = await sql`
      SELECT g.id, g.title, g.game_date, g.game_time, g.status, g.description, g.notes,
             g.completed_at, g.match_photo_url, f.name AS field_name, f.address AS field_address
      FROM games g
      LEFT JOIN game_fields f ON f.id=g.field_id
      WHERE g.completed_at IS NOT NULL
      ORDER BY g.completed_at DESC, g.game_date DESC
      LIMIT 50
    `

    const activeIds = active.map(g => g.id)
    const finishedIds = finished.map(g => g.id)
    const activeParts = await participants(activeIds, false)
    const presentParts = await participants(finishedIds, true)

    let photos = []
    if (finishedIds.length) {
      const placeholders = finishedIds.map((_, i) => `$${i + 1}`).join(',')
      photos = await sql.query(`SELECT mp.game_id, mp.image_data, mp.caption, mp.created_at FROM match_photos mp WHERE mp.game_id IN (${placeholders}) ORDER BY mp.created_at DESC`, finishedIds)
    }

    const mapParticipant = p => ({
      id: p.id,
      operator_id: p.operator_id,
      nickname: p.nickname,
      name: p.name,
      rank: p.rank,
      function: p.function,
      photo_url: p.photo_url,
      elo_level: p.elo_level,
      response: p.response,
      present: !!p.present,
      loadout: p.loadout || {}
    })

    const activeByGame = new Map()
    for (const p of activeParts) {
      if (!activeByGame.has(p.game_id)) activeByGame.set(p.game_id, [])
      activeByGame.get(p.game_id).push(mapParticipant(p))
    }
    const presentByGame = new Map()
    for (const p of presentParts) {
      if (!presentByGame.has(p.game_id)) presentByGame.set(p.game_id, [])
      presentByGame.get(p.game_id).push(mapParticipant(p))
    }
    const photoByGame = new Map()
    for (const p of photos) if (!photoByGame.has(p.game_id)) photoByGame.set(p.game_id, p)

    return json(res, 200, {
      user,
      active: active.map(g => {
        const list = activeByGame.get(g.id) || []
        return {
          ...g,
          going: list.filter(p => p.response === 'going'),
          not_going: list.filter(p => p.response === 'not_going'),
          pending: list.filter(p => !p.response || p.response === 'pending')
        }
      }),
      finished: finished.map(g => ({
        ...g,
        photo: g.match_photo_url ? { image_data: g.match_photo_url, caption: '' } : (photoByGame.get(g.id) || null),
        present: presentByGame.get(g.id) || []
      }))
    })
  } catch (e) {
    console.error('operator-games', e)
    return json(res, 500, { error: e?.message || 'Erro ao carregar jogos do operador.' })
  }
}
