-- V36: YouTube no perfil e onboarding de comandante
ALTER TABLE operators ADD COLUMN IF NOT EXISTS youtube_url TEXT;
