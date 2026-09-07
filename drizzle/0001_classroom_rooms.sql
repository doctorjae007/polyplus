CREATE TABLE classroom_rooms (
  code TEXT PRIMARY KEY NOT NULL,
  teacher_token TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE classroom_teams (
  room_code TEXT NOT NULL,
  team_index INTEGER NOT NULL CHECK (team_index BETWEEN 0 AND 3),
  player_token TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_code, team_index),
  FOREIGN KEY (room_code) REFERENCES classroom_rooms(code) ON DELETE CASCADE
);

PRAGMA optimize;
