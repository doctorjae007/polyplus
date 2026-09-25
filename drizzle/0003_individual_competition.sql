ALTER TABLE classroom_players ADD COLUMN correct_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE classroom_players ADD COLUMN correct_time_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE classroom_players ADD COLUMN last_answer_key TEXT NOT NULL DEFAULT '';

PRAGMA optimize;
