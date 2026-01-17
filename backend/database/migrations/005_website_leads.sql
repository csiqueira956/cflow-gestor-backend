-- ============================================
-- CFLOW GESTOR - MIGRATION: WEBSITE LEADS
-- ============================================
-- Tabela para armazenar leads capturados pelo site público (cflow-website)

-- 1. Criar tabela website_leads
CREATE TABLE IF NOT EXISTS website_leads (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    empresa VARCHAR(255),
    tamanho_equipe VARCHAR(50),
    mensagem TEXT,
    origem VARCHAR(100) DEFAULT 'cflow-website',
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(50) DEFAULT 'novo' CHECK (status IN ('novo', 'em_analise', 'contatado', 'convertido', 'descartado')),
    notas TEXT,
    atribuido_a_vendedor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    atribuido_a_empresa_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    convertido_em_cliente_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_website_leads_status ON website_leads(status);
CREATE INDEX IF NOT EXISTS idx_website_leads_email ON website_leads(email);
CREATE INDEX IF NOT EXISTS idx_website_leads_created_at ON website_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_leads_atribuido_vendedor ON website_leads(atribuido_a_vendedor_id);
CREATE INDEX IF NOT EXISTS idx_website_leads_atribuido_empresa ON website_leads(atribuido_a_empresa_id);

-- 3. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_website_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_website_leads_updated_at ON website_leads;
CREATE TRIGGER trigger_website_leads_updated_at
    BEFORE UPDATE ON website_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_website_leads_updated_at();

-- 5. Comentários na tabela
COMMENT ON TABLE website_leads IS 'Leads capturados através do site público cflow-website';
COMMENT ON COLUMN website_leads.status IS 'Status do lead: novo, em_analise, contatado, convertido, descartado';
COMMENT ON COLUMN website_leads.tamanho_equipe IS 'Tamanho da equipe informado: 1, 2-5, 6-10, 11+';
COMMENT ON COLUMN website_leads.convertido_em_cliente_id IS 'ID do cliente na tabela clientes se foi convertido';
