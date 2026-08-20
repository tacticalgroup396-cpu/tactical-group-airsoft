
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nickname TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('operator','commander')),
  rank TEXT NOT NULL DEFAULT 'recruta',
  games_count INTEGER NOT NULL DEFAULT 0,
  function TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  game_date DATE NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmado',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_participants (
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  function TEXT,
  present BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (game_id, operator_id)
);

CREATE TABLE IF NOT EXISTS rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS games_date_idx ON games(game_date);
CREATE INDEX IF NOT EXISTS participants_operator_idx ON game_participants(operator_id);

INSERT INTO rules (title, description, sort_order)
SELECT * FROM (VALUES
  ('Equipamento obrigatório','EYE PRO, máscara, uniforme, rádio e no mínimo 300 BBs.',1),
  ('Segurança no campo','Nunca apontar para o rosto. Respeitar zonas de exclusão.',2),
  ('Patente e hierarquia','Recrutas seguem a hierarquia definida pelo comando.',3),
  ('Participação','Três faltas sem aviso podem resultar em suspensão.',4),
  ('Comportamento','Álcool é proibido antes e durante os jogos. Respeito é obrigatório.',5),
  ('Eventos','Jogos são programados previamente. Avise alterações com antecedência.',6)
) AS v(title,description,sort_order)
WHERE NOT EXISTS (SELECT 1 FROM rules);
