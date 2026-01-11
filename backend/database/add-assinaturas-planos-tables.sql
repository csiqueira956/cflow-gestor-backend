-- ============================================
-- TABELAS DE ASSINATURAS E PLANOS
-- ============================================
-- Essas tabelas são usadas para gerenciar assinaturas localmente
-- enquanto se integram com o sistema Asaas para pagamentos

-- ============================================
-- 1. TABELA DE PLANOS
-- ============================================
CREATE TABLE IF NOT EXISTS planos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  tipo_cobranca VARCHAR(20) NOT NULL DEFAULT 'FIXED' CHECK (tipo_cobranca IN ('FIXED', 'PER_USER')),
  preco_fixo DECIMAL(10, 2) DEFAULT 0,
  preco_por_usuario DECIMAL(10, 2) DEFAULT 0,
  max_usuarios INTEGER,
  max_leads INTEGER,
  max_storage_gb DECIMAL(10, 2),
  features JSONB,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para planos
CREATE INDEX IF NOT EXISTS idx_planos_ativo ON planos(ativo);
CREATE INDEX IF NOT EXISTS idx_planos_nome ON planos(nome);

-- Inserir planos padrão
INSERT INTO planos (nome, descricao, tipo_cobranca, preco_fixo, max_usuarios, max_leads, ativo) VALUES
  ('Trial', 'Período de teste gratuito de 14 dias', 'FIXED', 0, 3, 50, true),
  ('Starter', 'Plano básico para pequenas equipes', 'FIXED', 99.90, 5, 200, true),
  ('Professional', 'Plano profissional com mais recursos', 'FIXED', 199.90, 15, 1000, true),
  ('Enterprise', 'Plano empresarial com recursos ilimitados', 'PER_USER', 0, NULL, NULL, true)
ON CONFLICT DO NOTHING;

-- Atualizar o plano Enterprise com preço por usuário
UPDATE planos SET preco_por_usuario = 29.90 WHERE nome = 'Enterprise';

-- ============================================
-- 2. TABELA DE EMPRESAS (se não existir)
-- ============================================
-- Alias para companies com campos adicionais
CREATE TABLE IF NOT EXISTS empresas (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  razao_social VARCHAR(255),
  cnpj VARCHAR(18),
  email VARCHAR(255),
  telefone VARCHAR(20),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'TRIAL', 'OVERDUE', 'CANCELLED', 'EXPIRED', 'SUSPENDED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para empresas
CREATE INDEX IF NOT EXISTS idx_empresas_company_id ON empresas(company_id);
CREATE INDEX IF NOT EXISTS idx_empresas_status ON empresas(status);
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON empresas(cnpj);

-- ============================================
-- 3. TABELA DE ASSINATURAS
-- ============================================
CREATE TABLE IF NOT EXISTS assinaturas (
  id SERIAL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plano_id INTEGER NOT NULL REFERENCES planos(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'TRIAL' CHECK (status IN ('ACTIVE', 'TRIAL', 'OVERDUE', 'CANCELLED', 'EXPIRED', 'PENDING')),

  -- Valores e quantidades
  valor_mensal DECIMAL(10, 2) DEFAULT 0,
  usuarios_contratados INTEGER DEFAULT 1,

  -- Datas importantes
  data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_fim_trial TIMESTAMP WITH TIME ZONE,
  data_proximo_vencimento TIMESTAMP WITH TIME ZONE,

  -- Integração Asaas
  asaas_customer_id VARCHAR(100),
  asaas_subscription_id VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Garantir uma assinatura por empresa
  UNIQUE(company_id)
);

-- Índices para assinaturas
CREATE INDEX IF NOT EXISTS idx_assinaturas_company_id ON assinaturas(company_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_plano_id ON assinaturas(plano_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON assinaturas(status);
CREATE INDEX IF NOT EXISTS idx_assinaturas_asaas_customer_id ON assinaturas(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_data_proximo_vencimento ON assinaturas(data_proximo_vencimento);

-- ============================================
-- 4. ATUALIZAR TABELA PAGAMENTOS
-- ============================================
-- Modificar pagamentos para usar company_id UUID

-- Primeiro, criar tabela temporária com nova estrutura
CREATE TABLE IF NOT EXISTS pagamentos (
  id SERIAL PRIMARY KEY,

  -- Relacionamentos
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assinatura_id INTEGER REFERENCES assinaturas(id) ON DELETE SET NULL,
  plano_id INTEGER REFERENCES planos(id) ON DELETE SET NULL,

  -- Dados do pagamento
  valor DECIMAL(10, 2) NOT NULL,
  valor_liquido DECIMAL(10, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'CONFIRMED', 'RECEIVED', 'OVERDUE', 'REFUNDED', 'CANCELLED', 'LINK_PAGAMENTO')
  ),

  -- Método e tipo
  metodo_pagamento VARCHAR(50),
  tipo VARCHAR(50),
  billing_type VARCHAR(50),

  -- Integração Asaas
  asaas_payment_id VARCHAR(255) UNIQUE,
  asaas_invoice_url TEXT,

  -- URLs de pagamento
  bank_slip_url TEXT,
  pix_qr_code TEXT,
  pix_copy_paste TEXT,

  -- Datas
  data_vencimento DATE,
  data_pagamento TIMESTAMP WITH TIME ZONE,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Descrição
  descricao TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para pagamentos
CREATE INDEX IF NOT EXISTS idx_pagamentos_company_id ON pagamentos(company_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_asaas_payment_id ON pagamentos(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data_vencimento ON pagamentos(data_vencimento);

-- ============================================
-- 5. TRIGGERS PARA UPDATED_AT
-- ============================================

-- Trigger para planos
CREATE OR REPLACE FUNCTION update_planos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_planos_updated_at ON planos;
CREATE TRIGGER trigger_update_planos_updated_at
  BEFORE UPDATE ON planos
  FOR EACH ROW
  EXECUTE FUNCTION update_planos_updated_at();

-- Trigger para assinaturas
CREATE OR REPLACE FUNCTION update_assinaturas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_assinaturas_updated_at ON assinaturas;
CREATE TRIGGER trigger_update_assinaturas_updated_at
  BEFORE UPDATE ON assinaturas
  FOR EACH ROW
  EXECUTE FUNCTION update_assinaturas_updated_at();

-- Trigger para pagamentos
CREATE OR REPLACE FUNCTION update_pagamentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pagamentos_updated_at ON pagamentos;
CREATE TRIGGER trigger_update_pagamentos_updated_at
  BEFORE UPDATE ON pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_pagamentos_updated_at();

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================

-- Habilitar RLS
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

-- Políticas: Service role tem acesso total
CREATE POLICY "Service role full access planos" ON planos FOR ALL USING (true);
CREATE POLICY "Service role full access assinaturas" ON assinaturas FOR ALL USING (true);
CREATE POLICY "Service role full access pagamentos" ON pagamentos FOR ALL USING (true);

-- ============================================
-- 7. CRIAR ASSINATURA TRIAL PARA EMPRESA EXISTENTE
-- ============================================
-- Isso cria automaticamente uma assinatura Trial para a empresa admin@cflow.com

INSERT INTO assinaturas (company_id, plano_id, status, data_fim_trial, valor_mensal, usuarios_contratados)
SELECT
  c.id as company_id,
  (SELECT id FROM planos WHERE nome = 'Trial') as plano_id,
  'TRIAL' as status,
  NOW() + INTERVAL '14 days' as data_fim_trial,
  0 as valor_mensal,
  1 as usuarios_contratados
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM assinaturas a WHERE a.company_id = c.id)
LIMIT 1;

-- ============================================
-- 8. COMENTÁRIOS
-- ============================================
COMMENT ON TABLE planos IS 'Planos de assinatura disponíveis';
COMMENT ON TABLE assinaturas IS 'Assinaturas das empresas';
COMMENT ON TABLE pagamentos IS 'Histórico de pagamentos das assinaturas';
COMMENT ON COLUMN assinaturas.status IS 'Status: ACTIVE, TRIAL, OVERDUE, CANCELLED, EXPIRED, PENDING';
COMMENT ON COLUMN planos.tipo_cobranca IS 'FIXED = preço fixo, PER_USER = preço por usuário';

-- ============================================
-- VERIFICAÇÃO
-- ============================================
SELECT 'planos' as tabela, COUNT(*) as registros FROM planos
UNION ALL
SELECT 'assinaturas', COUNT(*) FROM assinaturas
UNION ALL
SELECT 'pagamentos', COUNT(*) FROM pagamentos;
