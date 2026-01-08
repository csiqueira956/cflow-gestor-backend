-- ============================================
-- TABELA DE PAGAMENTOS
-- ============================================
-- Registra todos os pagamentos das assinaturas
-- Integrada com webhooks do Asaas para rastreamento completo

CREATE TABLE IF NOT EXISTS pagamentos (
  id SERIAL PRIMARY KEY,

  -- Relacionamentos
  company_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  assinatura_id INTEGER REFERENCES assinaturas(id) ON DELETE SET NULL,
  webhook_event_id INTEGER REFERENCES webhook_events(id) ON DELETE SET NULL,

  -- Dados do pagamento
  valor DECIMAL(10, 2) NOT NULL,
  valor_liquido DECIMAL(10, 2),              -- Valor após taxas
  status VARCHAR(50) NOT NULL CHECK (
    status IN ('pending', 'paid', 'confirmed', 'received', 'overdue', 'refunded', 'cancelled')
  ),

  -- Método de pagamento
  metodo_pagamento VARCHAR(50),               -- PIX, BOLETO, CREDIT_CARD, etc.
  billing_type VARCHAR(50),                   -- Tipo de cobrança Asaas

  -- Integração Asaas
  asaas_payment_id VARCHAR(255) UNIQUE,       -- ID do pagamento no Asaas
  asaas_invoice_url TEXT,                     -- URL da fatura/boleto
  asaas_invoice_number VARCHAR(100),          -- Número da nota fiscal

  -- URLs de pagamento
  bank_slip_url TEXT,                         -- URL do boleto
  pix_qr_code TEXT,                          -- QR Code PIX
  pix_copy_paste TEXT,                       -- Código Pix Copia e Cola

  -- Datas
  data_vencimento DATE,                       -- Data de vencimento
  data_pagamento TIMESTAMP,                   -- Data efetiva do pagamento
  data_confirmacao TIMESTAMP,                 -- Data de confirmação

  -- Descrição e observações
  descricao TEXT,
  observacoes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pagamentos_company_id ON pagamentos(company_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_assinatura_id ON pagamentos(assinatura_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_asaas_payment_id ON pagamentos(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data_vencimento ON pagamentos(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data_pagamento ON pagamentos(data_pagamento DESC);
CREATE INDEX IF NOT EXISTS idx_pagamentos_created_at ON pagamentos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pagamentos_webhook_event_id ON pagamentos(webhook_event_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_pagamentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pagamentos_updated_at
  BEFORE UPDATE ON pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_pagamentos_updated_at();

-- Comentários
COMMENT ON TABLE pagamentos IS 'Histórico de pagamentos das assinaturas';
COMMENT ON COLUMN pagamentos.asaas_payment_id IS 'ID do pagamento no sistema Asaas';
COMMENT ON COLUMN pagamentos.status IS 'Status: pending, paid, confirmed, received, overdue, refunded, cancelled';
COMMENT ON COLUMN pagamentos.valor_liquido IS 'Valor líquido após dedução de taxas';
COMMENT ON COLUMN pagamentos.webhook_event_id IS 'Referência ao evento de webhook que criou/atualizou este pagamento';
