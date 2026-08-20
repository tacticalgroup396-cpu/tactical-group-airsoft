-- Tactical Group Airsoft v30: PIX e livro caixa.
ALTER TABLE finance_settings ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE finance_settings ADD COLUMN IF NOT EXISTS pix_holder TEXT;
CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT,
  note TEXT,
  reference_id UUID,
  created_by UUID REFERENCES operators(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS reference_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS finance_transactions_reference_idx ON finance_transactions(reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS finance_transactions_date_idx ON finance_transactions(transaction_date DESC);
