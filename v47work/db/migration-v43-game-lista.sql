-- V43: edição completa, fechamento da lista e respostas obrigatórias
ALTER TABLE games ADD COLUMN IF NOT EXISTS rsvp_closed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS rsvp_closed_at TIMESTAMPTZ;
ALTER TABLE games ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE game_participants ADD COLUMN IF NOT EXISTS absence_processed BOOLEAN NOT NULL DEFAULT FALSE;
