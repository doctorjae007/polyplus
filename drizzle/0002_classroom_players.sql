CREATE TABLE classroom_players (
  id TEXT PRIMARY KEY NOT NULL,
  room_code TEXT NOT NULL,
  team_index INTEGER NOT NULL CHECK (team_index BETWEEN 0 AND 5),
  player_token TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (room_code, device_id),
  FOREIGN KEY (room_code) REFERENCES classroom_rooms(code) ON DELETE CASCADE
);

INSERT INTO classroom_players (id, room_code, team_index, player_token, device_id, name, emoji, updated_at)
SELECT lower(hex(randomblob(16))), room_code, team_index, player_token, device_id, 'สมาชิกกลุ่ม', '😀', updated_at
FROM classroom_teams;

PRAGMA optimize;
