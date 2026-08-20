-- Tactical Group Airsoft v7: notificações, múltiplos comandantes, progressão e visitas ligadas a jogos
ALTER TABLE operators ADD COLUMN IF NOT EXISTS is_primary_commander BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS last_promotion_period DATE;
ALTER TABLE visitor_requests ADD COLUMN IF NOT EXISTS requested_game_id UUID REFERENCES games(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS notifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, link TEXT, read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS notifications_operator_idx ON notifications(operator_id, created_at DESC);
CREATE TABLE IF NOT EXISTS push_subscriptions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE, endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
