-- V34: patentes e elos por participação + disciplina administrada pelo comando
ALTER TABLE operators ADD COLUMN IF NOT EXISTS elo_level INTEGER NOT NULL DEFAULT 3;
UPDATE operators SET elo_level=3 WHERE elo_level IS NULL OR elo_level < 1 OR elo_level > 3;
ALTER TABLE operators DROP CONSTRAINT IF EXISTS operators_elo_level_check;
ALTER TABLE operators ADD CONSTRAINT operators_elo_level_check CHECK (elo_level BETWEEN 1 AND 3);

CREATE TABLE IF NOT EXISTS elo_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id=1),
  attendance_step INTEGER NOT NULL DEFAULT 1,
  promote_at_level INTEGER NOT NULL DEFAULT 1,
  default_level INTEGER NOT NULL DEFAULT 3,
  absence_penalty_level INTEGER NOT NULL DEFAULT 1,
  highlander_penalty_level INTEGER NOT NULL DEFAULT 1,
  misconduct_penalty_level INTEGER NOT NULL DEFAULT 1,
  highlander_suspension_days INTEGER NOT NULL DEFAULT 1,
  misconduct_suspension_days INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES operators(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO elo_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS elo_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  old_level INTEGER,
  new_level INTEGER,
  action TEXT NOT NULL,
  reason TEXT,
  changed_by UUID REFERENCES operators(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS elo_history_operator_idx ON elo_history(operator_id, created_at DESC);
