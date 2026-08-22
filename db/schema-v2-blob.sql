-- Tactical Group Airsoft v2 database bootstrap.
-- Prepared for Neon + Vercel Blob architecture.
-- Media columns use URL fields; legacy Base64 columns are kept nullable only for migration compatibility.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- This file documents the new database target. The schema has already been provisioned in Neon.
-- Media destination fields added for the new architecture:
ALTER TABLE operator_gallery ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE match_photos ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE game_missions ADD COLUMN IF NOT EXISTS mission_photo_url TEXT;

-- Existing URL fields that will point to Vercel Blob:
-- operators.photo_url
-- operator_equipment.photo_url
-- games.match_photo_url
