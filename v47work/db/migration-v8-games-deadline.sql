-- V8: prazo de confirmação de jogos e proteção do comandante principal
ALTER TABLE games ADD COLUMN IF NOT EXISTS rsvp_deadline_date DATE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS rsvp_deadline_time TIME;
UPDATE operators SET is_primary_commander=true
WHERE id=(SELECT id FROM operators WHERE role='commander' ORDER BY created_at ASC NULLS LAST, nickname ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM operators WHERE role='commander' AND is_primary_commander=true);
