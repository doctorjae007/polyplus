import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import worker from '../worker/index.js'

const database = new DatabaseSync(':memory:')
database.exec(await readFile(new URL('../drizzle/0000_game_state.sql', import.meta.url), 'utf8'))
database.exec(await readFile(new URL('../drizzle/0001_classroom_rooms.sql', import.meta.url), 'utf8'))

const DB = {
  prepare(sql) {
    const statement = database.prepare(sql)
    let values = []
    return {
      bind(...nextValues) { values = nextValues; return this },
      first() { return statement.get(...values) },
      async all() { return { results: statement.all(...values) } },
      async run() { return statement.run(...values) },
    }
  },
}
const env = { DB, ASSETS: { fetch: () => new Response('asset') } }
const call = (path, options) => worker.fetch(new Request(`https://class.test${path}`, options), env)

const createdResponse = await call('/api/rooms', { method: 'POST' })
assert.equal(createdResponse.status, 201)
const created = await createdResponse.json()
assert.match(created.code, /^\d{6}$/)

const guest = await (await call(`/api/rooms/${created.code}`)).json()
assert.equal(guest.role, 'guest')
assert.deepEqual(guest.room.occupiedTeams, [])

const joinedResponse = await call(`/api/rooms/${created.code}/join`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamIndex: 0, deviceId: 'phone-blue' }),
})
assert.equal(joinedResponse.status, 201)
const joined = await joinedResponse.json()

const initialState = { activity: 'intro', roomStatus: 'playing', teamNames: ['ทีมฟ้า', 'ทีมส้ม', 'ทีมเขียว', 'ทีมม่วง'], introAnswers: [[], [], [], []], introRevealed: false }
assert.equal((await call(`/api/rooms/${created.code}`, { method: 'PUT', headers: { Authorization: `Bearer ${created.teacherToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(initialState) })).status, 200)
assert.equal((await call(`/api/rooms/${created.code}/answer`, { method: 'PUT', headers: { Authorization: `Bearer ${joined.playerToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ activity: 'intro', answer: ['x', 'x', 3] }) })).status, 200)

const teacherView = await (await call(`/api/rooms/${created.code}`, { headers: { Authorization: `Bearer ${created.teacherToken}` } })).json()
assert.deepEqual(teacherView.state.introAnswers[0], ['x', 'x', 3])
const studentView = await (await call(`/api/rooms/${created.code}`, { headers: { Authorization: `Bearer ${joined.playerToken}` } })).json()
assert.equal(studentView.teamIndex, 0)
assert.deepEqual(studentView.state.introAnswers.slice(1), [[], [], []])

const duplicate = await call(`/api/rooms/${created.code}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamIndex: 0, deviceId: 'another-phone' }) })
assert.equal(duplicate.status, 409)

console.log('Classroom worker smoke test passed')
