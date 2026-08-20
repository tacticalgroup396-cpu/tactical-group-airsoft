-- Tactical Group Airsoft V6: gestão de jogos, convites e histórico
ALTER TABLE games ADD COLUMN IF NOT EXISTS min_players INTEGER NOT NULL DEFAULT 4;
ALTER TABLE games ADD COLUMN IF NOT EXISTS maps_url TEXT;
CREATE INDEX IF NOT EXISTS games_date_status_idx ON games(game_date, status);
