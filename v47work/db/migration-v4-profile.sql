-- Tactical Group Airsoft v4: operator profile, photos and improved games.
ALTER TABLE operators ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS airsoft_years NUMERIC;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS play_style TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS primary_replica TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS secondary_replica TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_time TIME;
ALTER TABLE games ADD COLUMN IF NOT EXISTS max_players INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS briefing TEXT;
CREATE TABLE IF NOT EXISTS operator_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  image_data TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS operator_gallery_operator_idx ON operator_gallery(operator_id, created_at DESC);
