import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import worker from '../worker/index.js'

const database = new DatabaseSync(':memory:')
database.exec(await readFile(new URL('../drizzle/0000_game_state.sql', import.meta.url), 'utf8'))
database.exec(await readFile(new URL('../drizzle/0001_classroom_rooms.sql', import.meta.url), 'utf8'))
database.exec(await readFile(new URL('../drizzle/0002_classroom_players.sql', import.meta.url), 'utf8'))
database.exec(await readFile(new URL('../drizzle/0003_individual_competition.sql', import.meta.url), 'utf8'))

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

const createdResponse = await call('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamCount: 6 }) })
assert.equal(createdResponse.status, 201)
const created = await createdResponse.json()
assert.match(created.code, /^\d{6}$/)
assert.equal(created.teamCount, 6)

const guest = await (await call(`/api/rooms/${created.code}`)).json()
assert.equal(guest.role, 'guest')
assert.deepEqual(guest.room.occupiedTeams, [])

const joinedResponse = await call(`/api/rooms/${created.code}/join`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamIndex: 0, deviceId: 'phone-blue', name: 'มิน', emoji: '🐯' }),
})
assert.equal(joinedResponse.status, 201)
const joined = await joinedResponse.json()

const initialState = { teamCount: 6, activity: 'intro', roomStatus: 'playing', teamNames: ['ทีมฟ้า', 'ทีมส้ม', 'ทีมเขียว', 'ทีมม่วง', 'ทีมชมพู', 'ทีมฟ้าคราม'], introAnswers: [[], [], [], [], [], []], introRevealed: false }
assert.equal((await call(`/api/rooms/${created.code}`, { method: 'PUT', headers: { Authorization: `Bearer ${created.teacherToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(initialState) })).status, 200)
assert.equal((await call(`/api/rooms/${created.code}/answer`, { method: 'PUT', headers: { Authorization: `Bearer ${joined.playerToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ activity: 'intro', answer: ['x', 'x', 3] }) })).status, 200)

const teacherView = await (await call(`/api/rooms/${created.code}`, { headers: { Authorization: `Bearer ${created.teacherToken}` } })).json()
assert.deepEqual(teacherView.state.introAnswers[0], ['x', 'x', 3])
const studentView = await (await call(`/api/rooms/${created.code}`, { headers: { Authorization: `Bearer ${joined.playerToken}` } })).json()
assert.equal(studentView.teamIndex, 0)
assert.deepEqual(studentView.state.introAnswers.slice(1), [[], [], [], [], []])

const duplicate = await call(`/api/rooms/${created.code}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamIndex: 0, deviceId: 'another-phone' }) })
assert.equal(duplicate.status, 400)

const teammate = await call(`/api/rooms/${created.code}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamIndex: 0, deviceId: 'another-phone', name: 'พลอย', emoji: '🦋' }) })
assert.equal(teammate.status, 201)
const roomWithPlayers = await (await call(`/api/rooms/${created.code}`)).json()
assert.equal(roomWithPlayers.room.members[0].length, 2)

const individualCreated = await (await call('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomMode: 'individual' }) })).json()
assert.equal(individualCreated.roomMode, 'individual')
const individualJoined = await (await call(`/api/rooms/${individualCreated.code}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamIndex: 0, deviceId: 'solo-phone', name: 'ฟ้า', emoji: '⭐' }) })).json()
const fasterJoined = await (await call(`/api/rooms/${individualCreated.code}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamIndex: 0, deviceId: 'fast-phone', name: 'เร็ว', emoji: '🚀' }) })).json()
const individualState = { roomMode: 'individual', teamCount: 1, activity: 'pairs', roomStatus: 'playing', individualQuestionIndex: 0, individualQuestionData: { m: 2, n: 5, product: 10, sum: 7 }, individualQuestionStartedAt: Date.now() - 1200, individualFinished: false }
assert.equal((await call(`/api/rooms/${individualCreated.code}`, { method: 'PUT', headers: { Authorization: `Bearer ${individualCreated.teacherToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(individualState) })).status, 200)
assert.equal((await call(`/api/rooms/${individualCreated.code}/individual-answer`, { method: 'PUT', headers: { Authorization: `Bearer ${individualJoined.playerToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ answer: [2, 5] }) })).status, 200)
assert.equal((await call(`/api/rooms/${individualCreated.code}/individual-answer`, { method: 'PUT', headers: { Authorization: `Bearer ${individualJoined.playerToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ answer: [2, 5] }) })).status, 409)
const fasterState = { ...individualState, individualQuestionStartedAt: Date.now() - 200 }
assert.equal((await call(`/api/rooms/${individualCreated.code}`, { method: 'PUT', headers: { Authorization: `Bearer ${individualCreated.teacherToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(fasterState) })).status, 200)
assert.equal((await call(`/api/rooms/${individualCreated.code}/individual-answer`, { method: 'PUT', headers: { Authorization: `Bearer ${fasterJoined.playerToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ answer: [5, 2] }) })).status, 200)
const individualRoom = await (await call(`/api/rooms/${individualCreated.code}`)).json()
assert.equal(individualRoom.room.leaderboard[0].correctCount, 1)
assert.equal(individualRoom.room.leaderboard[0].name, 'เร็ว')
assert.ok(individualRoom.room.leaderboard[0].correctTimeMs < individualRoom.room.leaderboard[1].correctTimeMs)

console.log('Classroom worker smoke test passed')
