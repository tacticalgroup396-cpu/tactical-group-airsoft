-- V22: elo por participação e fotos na equipe
ALTER TABLE games ADD COLUMN IF NOT EXISTS elo_reward INTEGER NOT NULL DEFAULT 1;
ALTER TABLE game_participants ADD COLUMN IF NOT EXISTS elo_awarded BOOLEAN NOT NULL DEFAULT FALSE;
