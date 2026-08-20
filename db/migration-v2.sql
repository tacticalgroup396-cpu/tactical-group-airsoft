-- Tactical Group Airsoft v2 migration.
-- This migration is already applied to the Neon project used for the current deployment.
ALTER TABLE operators ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS equipment_summary TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS elo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS absences INTEGER NOT NULL DEFAULT 0;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS suspension_until DATE;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS public_profile BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS commander_id UUID REFERENCES operators(id) ON DELETE SET NULL;
ALTER TABLE game_participants ADD COLUMN IF NOT EXISTS response TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE game_participants ADD COLUMN IF NOT EXISTS loadout JSONB;
ALTER TABLE game_participants ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
ALTER TABLE game_participants ADD COLUMN IF NOT EXISTS absence_processed BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS rank_history (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE, old_rank TEXT, new_rank TEXT NOT NULL, reason TEXT, changed_by UUID REFERENCES operators(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS penalties (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE, type TEXT NOT NULL, reason TEXT, days INTEGER NOT NULL DEFAULT 0, starts_at TIMESTAMPTZ NOT NULL DEFAULT now(), ends_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS visitor_requests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, nickname TEXT, contact TEXT NOT NULL, message TEXT, status TEXT NOT NULL DEFAULT 'pending', approved_by UUID REFERENCES operators(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), decided_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS visitor_game_assignments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), visitor_request_id UUID NOT NULL REFERENCES visitor_requests(id) ON DELETE CASCADE, game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'scheduled', notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(visitor_request_id, game_id));
CREATE TABLE IF NOT EXISTS operator_equipment (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE, category TEXT NOT NULL, name TEXT NOT NULL, details TEXT, public_visible BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
