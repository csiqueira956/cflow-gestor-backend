-- Migration: Adicionar tabela de notificações
-- Criado para o sistema de notificações de vencimento de assinaturas

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,

  -- Dados da notificação
  company_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (
    tipo IN ('vencimento_proximo', 'vencimento_hoje', 'vencimento_atrasado', 'limite_atingido', 'upgrade_disponivel', 'sistema')
  ),
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT NOT NULL,

  -- Metadados
  prioridade VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (
    prioridade IN ('baixa', 'normal', 'alta', 'urgente')
  ),
  categoria VARCHAR(50) NOT NULL DEFAULT 'assinatura' CHECK (
    categoria IN ('assinatura', 'pagamento', 'limite', 'sistema', 'promocao')
  ),

  -- Dados adicionais (JSON com informações extras)
  dados_extras JSONB,

  -- Link de ação (onde a notificação deve levar o usuário)
  action_url VARCHAR(255),
  action_label VARCHAR(100),

  -- Controle de leitura
  lida BOOLEAN DEFAULT false,
  lida_em TIMESTAMP,
  lida_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,

  -- Controle de expiração
  expira_em TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tipo ON notifications(tipo);
CREATE INDEX IF NOT EXISTS idx_notifications_lida ON notifications(lida);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_company_lida ON notifications(company_id, lida);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notifications_timestamp
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_notifications_updated_at();

-- Comentários
COMMENT ON TABLE notifications IS 'Tabela de notificações do sistema para empresas';
COMMENT ON COLUMN notifications.tipo IS 'Tipo da notificação: vencimento_proximo, vencimento_hoje, vencimento_atrasado, limite_atingido, upgrade_disponivel, sistema';
COMMENT ON COLUMN notifications.prioridade IS 'Prioridade da notificação: baixa, normal, alta, urgente';
COMMENT ON COLUMN notifications.categoria IS 'Categoria da notificação: assinatura, pagamento, limite, sistema, promocao';
COMMENT ON COLUMN notifications.dados_extras IS 'Dados adicionais em formato JSON (ex: dias até vencimento, valor, etc)';
COMMENT ON COLUMN notifications.action_url IS 'URL para onde a notificação deve redirecionar (ex: /minha-assinatura)';
COMMENT ON COLUMN notifications.expira_em IS 'Data de expiração da notificação (opcional)';
