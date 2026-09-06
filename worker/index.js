const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})

async function handleGameState(request, env) {
  if (!env.DB) return json({ error: 'Database binding is unavailable' }, 503)

  if (request.method === 'GET') {
    const row = await env.DB.prepare('SELECT data, updated_at FROM game_state WHERE id = ?').bind(1).first()
    if (!row) return json({ state: null, updatedAt: null })
    try { return json({ state: JSON.parse(row.data), updatedAt: row.updated_at }) }
    catch { return json({ state: null, updatedAt: row.updated_at }) }
  }

  if (request.method === 'PUT') {
    const raw = await request.text()
    if (raw.length > 100000) return json({ error: 'Game state is too large' }, 413)
    let state
    try { state = JSON.parse(raw) } catch { return json({ error: 'Invalid JSON' }, 400) }
    if (!state || typeof state !== 'object' || Array.isArray(state)) return json({ error: 'Invalid game state' }, 400)
    await env.DB.prepare(`INSERT INTO game_state (id, data, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP`)
      .bind(1, JSON.stringify(state)).run()
    return json({ ok: true })
  }

  return json({ error: 'Method not allowed' }, 405)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/game-state') {
      try { return await handleGameState(request, env) }
      catch (error) { return json({ error: 'Unable to access the classroom database' }, 500) }
    }
    return env.ASSETS.fetch(request)
  },
}
