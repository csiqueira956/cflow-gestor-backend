-- Criar tabela notifications no Supabase
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- 'novo_cliente', 'venda_realizada', 'meta_atingida', 'pagamento', etc
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT,
  icone VARCHAR(50), -- Nome do ícone ou emoji
  cor VARCHAR(20), -- Cor da notificação (opcional)
  link VARCHAR(500), -- Link para navegar (opcional)
  lida BOOLEAN DEFAULT false,
  lida_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  lida_em TIMESTAMP,
  expira_em TIMESTAMP, -- Opcional: data de expiração
  metadados JSONB, -- Dados extras (cliente_id, venda_id, etc)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_lida ON notifications(lida);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expira_em ON notifications(expira_em);

-- Comentários
COMMENT ON TABLE notifications IS 'Notificações do sistema para usuários da empresa';
COMMENT ON COLUMN notifications.tipo IS 'Tipo da notificação (novo_cliente, venda_realizada, meta_atingida, etc)';
COMMENT ON COLUMN notifications.lida IS 'Indica se a notificação foi lida';
COMMENT ON COLUMN notifications.expira_em IS 'Data de expiração da notificação (opcional)';
COMMENT ON COLUMN notifications.metadados IS 'Dados extras em formato JSON (cliente_id, venda_id, etc)';
