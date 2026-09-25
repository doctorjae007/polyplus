export const gameStateSchema = `CREATE TABLE IF NOT EXISTS game_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`

export const classroomRoomsSchema = `CREATE TABLE classroom_rooms (
  code TEXT PRIMARY KEY NOT NULL,
  teacher_token TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`

export const classroomTeamsSchema = `CREATE TABLE classroom_players (
  id TEXT PRIMARY KEY NOT NULL,
  room_code TEXT NOT NULL,
  team_index INTEGER NOT NULL CHECK (team_index BETWEEN 0 AND 5),
  player_token TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  correct_time_ms INTEGER NOT NULL DEFAULT 0,
  last_answer_key TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (room_code, device_id),
  FOREIGN KEY (room_code) REFERENCES classroom_rooms(code) ON DELETE CASCADE
)`
