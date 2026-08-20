-- Tactical Group Airsoft v3: invite-based operator onboarding.
ALTER TABLE operators ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS invite_code_hash TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS invite_used_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS operators_email_unique_idx ON operators (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS operators_invite_idx ON operators(invite_code_hash) WHERE invite_code_hash IS NOT NULL;
