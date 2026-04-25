-- Migrations para o Ledger e Invoices do CrediFlow

ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS balance NUMERIC(10,2) DEFAULT 0.00;

CREATE TABLE IF NOT EXISTS card_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  paid_amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'PAID',
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(card_id, month, year)
);

-- Configurando RLS para as novas tabelas (Se o RLS estiver ativado)
ALTER TABLE card_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público genérico (ou ajuste de acordo com seu RLS se usar auth.uid())
CREATE POLICY "Enable read access for all users" ON card_adjustments FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON card_adjustments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON card_adjustments FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON invoices FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON invoices FOR UPDATE USING (true);
