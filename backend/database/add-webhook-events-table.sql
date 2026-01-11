-- ============================================
-- TABELA DE EVENTOS DE WEBHOOK (ASAAS)
-- ============================================
-- Registra todos os eventos recebidos do Asaas via webhooks
-- para auditoria, debugging e rastreamento de pagamentos

CREATE TABLE IF NOT EXISTS webhook_events (
  id SERIAL PRIMARY KEY,

  -- Identificação do evento
  event_id VARCHAR(255) UNIQUE NOT NULL,  -- ID único do evento Asaas
  event_type VARCHAR(100) NOT NULL,       -- Tipo: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, etc.

  -- Dados relacionados
  company_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
  payment_id VARCHAR(255),                -- ID do pagamento no Asaas
  subscription_id VARCHAR(255),           -- ID da assinatura no Asaas (se aplicável)

  -- Payload e processamento
  payload JSONB NOT NULL,                 -- Payload completo do webhook
  status VARCHAR(50) DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'processed', 'failed', 'ignored')
  ),

  -- Resultado do processamento
  processed_at TIMESTAMP,
  error_message TEXT,                     -- Mensagem de erro se falhar
  retry_count INTEGER DEFAULT 0,          -- Contador de tentativas

  -- Metadados
  ip_address INET,                        -- IP de origem do webhook
  user_agent TEXT,                        -- User agent

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_company_id ON webhook_events(company_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_payment_id ON webhook_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_webhook_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_webhook_events_updated_at
  BEFORE UPDATE ON webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_events_updated_at();

-- Comentários
COMMENT ON TABLE webhook_events IS 'Registro de todos os eventos de webhook recebidos do Asaas';
COMMENT ON COLUMN webhook_events.event_id IS 'ID único do evento fornecido pelo Asaas';
COMMENT ON COLUMN webhook_events.event_type IS 'Tipo do evento: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE, etc.';
COMMENT ON COLUMN webhook_events.payload IS 'Payload JSON completo recebido do webhook';
COMMENT ON COLUMN webhook_events.status IS 'Status do processamento: pending, processing, processed, failed, ignored';
COMMENT ON COLUMN webhook_events.retry_count IS 'Número de tentativas de processamento';
