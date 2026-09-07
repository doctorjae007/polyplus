const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})

const readJson = async (request, maxLength = 100000) => {
  const raw = await request.text()
  if (raw.length > maxLength) throw new Response(JSON.stringify({ error: 'Request is too large' }), { status: 413 })
  try { return JSON.parse(raw) } catch { throw new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }) }
}

const token = () => crypto.randomUUID().replaceAll('-', '')
const bearer = (request) => request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
const roomCode = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0')
const answerKey = (activity) => ({ intro: 'introAnswers', pairs: 'answers', guided: 'guidedAnswers', factor: 'factorAnswers' })[activity]

const roomSummary = (row, teams) => {
  let state = {}
  try { state = JSON.parse(row.state) } catch {}
  return {
    code: row.code,
    status: state.roomStatus === 'playing' ? 'playing' : 'lobby',
    activity: state.activity ?? 'intro',
    teamNames: Array.isArray(state.teamNames) ? state.teamNames : ['ทีมฟ้า', 'ทีมส้ม', 'ทีมเขียว', 'ทีมม่วง'],
    occupiedTeams: teams.map((team) => team.team_index),
    updatedAt: row.updated_at,
  }
}

const scrubStateForTeam = (state, teamIndex) => {
  const copy = structuredClone(state)
  for (const key of ['introAnswers', 'answers', 'guidedAnswers', 'factorAnswers']) {
    if (!Array.isArray(copy[key])) continue
    copy[key] = copy[key].map((answer, index) => index === teamIndex ? answer : [])
  }
  delete copy.members
  return copy
}

async function findRoom(env, code) {
  return env.DB.prepare('SELECT code, teacher_token, state, created_at, updated_at FROM classroom_rooms WHERE code = ?').bind(code).first()
}

async function listTeams(env, code) {
  const result = await env.DB.prepare('SELECT team_index, player_token, device_id, updated_at FROM classroom_teams WHERE room_code = ? ORDER BY team_index').bind(code).all()
  return result.results ?? []
}

async function createRoom(env) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = roomCode()
    const teacherToken = token()
    try {
      await env.DB.prepare(`INSERT INTO classroom_rooms (code, teacher_token, state, created_at, updated_at)
        VALUES (?, ?, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).bind(code, teacherToken).run()
      return json({ code, teacherToken }, 201)
    } catch (error) {
      if (!String(error).toLowerCase().includes('unique')) throw error
    }
  }
  return json({ error: 'Unable to create a unique room code' }, 503)
}

async function getRoom(request, env, code) {
  const row = await findRoom(env, code)
  if (!row) return json({ error: 'Room not found' }, 404)
  const teams = await listTeams(env, code)
  const auth = bearer(request)
  if (auth && auth === row.teacher_token) return json({ role: 'teacher', state: JSON.parse(row.state || '{}'), room: roomSummary(row, teams) })
  const player = auth ? teams.find((team) => team.player_token === auth) : null
  if (player) return json({ role: 'student', teamIndex: player.team_index, state: scrubStateForTeam(JSON.parse(row.state || '{}'), player.team_index), room: roomSummary(row, teams) })
  return json({ role: 'guest', room: roomSummary(row, teams) })
}

async function joinRoom(request, env, code) {
  const row = await findRoom(env, code)
  if (!row) return json({ error: 'Room not found' }, 404)
  const body = await readJson(request, 5000)
  const teamIndex = Number(body.teamIndex)
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.slice(0, 80) : ''
  if (!Number.isInteger(teamIndex) || teamIndex < 0 || teamIndex > 3 || !deviceId) return json({ error: 'Invalid team selection' }, 400)
  const existing = await env.DB.prepare('SELECT player_token, device_id FROM classroom_teams WHERE room_code = ? AND team_index = ?').bind(code, teamIndex).first()
  if (existing && existing.device_id !== deviceId) return json({ error: 'Team is already occupied' }, 409)
  if (existing) return json({ code, teamIndex, playerToken: existing.player_token })
  const playerToken = token()
  await env.DB.prepare(`INSERT INTO classroom_teams (room_code, team_index, player_token, device_id, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(code, teamIndex, playerToken, deviceId).run()
  return json({ code, teamIndex, playerToken }, 201)
}

async function leaveRoom(request, env, code) {
  const auth = bearer(request)
  if (!auth) return json({ error: 'Unauthorized' }, 401)
  await env.DB.prepare('DELETE FROM classroom_teams WHERE room_code = ? AND player_token = ?').bind(code, auth).run()
  return json({ ok: true })
}

async function unlockTeam(request, env, code, teamIndex) {
  const row = await findRoom(env, code)
  if (!row) return json({ error: 'Room not found' }, 404)
  if (bearer(request) !== row.teacher_token) return json({ error: 'Unauthorized' }, 401)
  await env.DB.prepare('DELETE FROM classroom_teams WHERE room_code = ? AND team_index = ?').bind(code, teamIndex).run()
  return json({ ok: true })
}

async function updateRoomState(request, env, code) {
  const row = await findRoom(env, code)
  if (!row) return json({ error: 'Room not found' }, 404)
  if (bearer(request) !== row.teacher_token) return json({ error: 'Unauthorized' }, 401)
  const state = await readJson(request)
  if (!state || typeof state !== 'object' || Array.isArray(state)) return json({ error: 'Invalid room state' }, 400)
  await env.DB.prepare('UPDATE classroom_rooms SET state = ?, updated_at = CURRENT_TIMESTAMP WHERE code = ?').bind(JSON.stringify(state), code).run()
  return json({ ok: true })
}

async function updateTeamAnswer(request, env, code) {
  const auth = bearer(request)
  const player = await env.DB.prepare('SELECT team_index FROM classroom_teams WHERE room_code = ? AND player_token = ?').bind(code, auth).first()
  if (!player) return json({ error: 'Unauthorized' }, 401)
  const row = await findRoom(env, code)
  if (!row) return json({ error: 'Room not found' }, 404)
  const body = await readJson(request, 5000)
  const state = JSON.parse(row.state || '{}')
  const key = answerKey(body.activity)
  if (!key || body.activity !== state.activity || state.roomStatus !== 'playing') return json({ error: 'Activity is not accepting answers' }, 409)
  if (!Array.isArray(body.answer) || body.answer.length > 8 || body.answer.some((value) => value !== null && value !== 'x' && !Number.isFinite(value))) return json({ error: 'Invalid answer' }, 400)
  if ((key === 'introAnswers' && state.introRevealed) || (key === 'answers' && state.revealed) || (key === 'guidedAnswers' && state.guidedRevealed) || (key === 'factorAnswers' && state.factorRevealed)) return json({ error: 'Answers are locked' }, 409)
  const answers = Array.isArray(state[key]) && state[key].length === 4 ? state[key] : Array.from({ length: 4 }, () => [])
  answers[player.team_index] = body.answer
  state[key] = answers
  await env.DB.prepare('UPDATE classroom_rooms SET state = ?, updated_at = CURRENT_TIMESTAMP WHERE code = ?').bind(JSON.stringify(state), code).run()
  return json({ ok: true, answer: body.answer })
}

async function handleLegacyGameState(request, env) {
  if (request.method === 'GET') {
    const row = await env.DB.prepare('SELECT data, updated_at FROM game_state WHERE id = ?').bind(1).first()
    if (!row) return json({ state: null, updatedAt: null })
    try { return json({ state: JSON.parse(row.data), updatedAt: row.updated_at }) } catch { return json({ state: null, updatedAt: row.updated_at }) }
  }
  if (request.method === 'PUT') {
    const state = await readJson(request)
    if (!state || typeof state !== 'object' || Array.isArray(state)) return json({ error: 'Invalid game state' }, 400)
    await env.DB.prepare(`INSERT INTO game_state (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP`).bind(1, JSON.stringify(state)).run()
    return json({ ok: true })
  }
  return json({ error: 'Method not allowed' }, 405)
}

async function handleApi(request, env, url) {
  if (!env.DB) return json({ error: 'Database binding is unavailable' }, 503)
  if (url.pathname === '/api/game-state') return handleLegacyGameState(request, env)
  if (url.pathname === '/api/rooms' && request.method === 'POST') return createRoom(env)
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0] !== 'api' || parts[1] !== 'rooms' || !/^\d{6}$/.test(parts[2] ?? '')) return json({ error: 'Not found' }, 404)
  const code = parts[2]
  if (parts.length === 3 && request.method === 'GET') return getRoom(request, env, code)
  if (parts.length === 3 && request.method === 'PUT') return updateRoomState(request, env, code)
  if (parts[3] === 'join' && request.method === 'POST') return joinRoom(request, env, code)
  if (parts[3] === 'leave' && request.method === 'POST') return leaveRoom(request, env, code)
  if (parts[3] === 'answer' && request.method === 'PUT') return updateTeamAnswer(request, env, code)
  if (parts[3] === 'teams' && /^\d$/.test(parts[4] ?? '') && request.method === 'DELETE') return unlockTeam(request, env, code, Number(parts[4]))
  return json({ error: 'Not found' }, 404)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      try { return await handleApi(request, env, url) }
      catch (error) {
        if (error instanceof Response) return new Response(error.body, { status: error.status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })
        return json({ error: 'Unable to access the classroom database' }, 500)
      }
    }
    return env.ASSETS.fetch(request)
  },
}
