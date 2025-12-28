-- Create leads  table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  lead_first_name TEXT NOT NULL,
  lead_last_name TEXT NOT NULL,
  lead_job_title TEXT NOT NULL,
  account_domain TEXT,
  account_employee_range TEXT,
  account_industry TEXT,
  company_size TEXT,
  priority INTEGER DEFAULT 0,
  is_champion TEXT DEFAULT 'no',
  import_batch TEXT, -- Identificador de importación elegido por el usuario
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create rankings table
CREATE TABLE IF NOT EXISTS rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  score DECIMAL(5, 2) NOT NULL,
  reasoning TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_leads_account_name ON leads(account_name);
CREATE INDEX IF NOT EXISTS idx_leads_company_size ON leads(company_size);
CREATE INDEX IF NOT EXISTS idx_rankings_lead_id ON rankings(lead_id);
CREATE INDEX IF NOT EXISTS idx_rankings_score ON rankings(score DESC);

-- Habilitar RLS (Row Level Security) opcional
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;

-- Politicas:
CREATE POLICY "Allow read leads" ON leads FOR SELECT USING (true);
CREATE POLICY "Allow insert leads" ON leads FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read rankings" ON rankings FOR SELECT USING (true);
CREATE POLICY "Allow insert rankings" ON rankings FOR INSERT WITH CHECK (true);
