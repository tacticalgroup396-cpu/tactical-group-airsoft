-- Tactical Group Airsoft v5: monthly membership fees and finance settings.
CREATE TABLE IF NOT EXISTS finance_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  monthly_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_day INTEGER NOT NULL DEFAULT 10 CHECK (due_day BETWEEN 1 AND 28),
  grace_days INTEGER NOT NULL DEFAULT 0 CHECK (grace_days BETWEEN 0 AND 30),
  currency TEXT NOT NULL DEFAULT 'BRL',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES operators(id) ON DELETE SET NULL
);
INSERT INTO finance_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS membership_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  period DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','waived','overdue')),
  paid_at TIMESTAMPTZ,
  payment_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(operator_id, period)
);
CREATE INDEX IF NOT EXISTS membership_dues_operator_idx ON membership_dues(operator_id, period DESC);
CREATE INDEX IF NOT EXISTS membership_dues_status_idx ON membership_dues(status, due_date);
