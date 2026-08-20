-- V35: 7 níveis de Elo + foto da partida finalizada
ALTER TABLE operators ADD COLUMN IF NOT EXISTS elo_level INTEGER NOT NULL DEFAULT 7;
UPDATE operators SET elo_level=CASE WHEN elo_level=1 THEN 4 WHEN elo_level=2 THEN 5 WHEN elo_level=3 THEN 6 WHEN elo_level IS NULL OR elo_level<1 OR elo_level>7 THEN 7 ELSE elo_level END;
ALTER TABLE operators DROP CONSTRAINT IF EXISTS operators_elo_level_check;
ALTER TABLE operators ADD CONSTRAINT operators_elo_level_check CHECK (elo_level BETWEEN 1 AND 7);
ALTER TABLE games ADD COLUMN IF NOT EXISTS match_photo_url TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS games_completed_idx ON games(completed_at DESC);
CREATE TABLE IF NOT EXISTS match_photos (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), game_id UUID NOT NULL UNIQUE REFERENCES games(id) ON DELETE CASCADE, image_data TEXT NOT NULL, caption TEXT, created_by UUID REFERENCES operators(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
