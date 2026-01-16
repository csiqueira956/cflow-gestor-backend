-- Adicionar campos de ativação de conta na tabela usuarios
-- Para suportar o fluxo de trial com ativação por email

-- Adicionar coluna activation_token (token de ativação)
ALTER TABLE usuarios ADD COLUMN activation_token TEXT;

-- Adicionar coluna token_expires (data de expiração do token)
ALTER TABLE usuarios ADD COLUMN token_expires DATETIME;

-- Adicionar colunas na tabela assinaturas para vincular com ASAAS
ALTER TABLE assinaturas ADD COLUMN asaas_customer_id TEXT;
ALTER TABLE assinaturas ADD COLUMN asaas_subscription_id TEXT;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_usuarios_activation_token ON usuarios(activation_token);
CREATE INDEX IF NOT EXISTS idx_assinaturas_asaas_customer ON assinaturas(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_asaas_subscription ON assinaturas(asaas_subscription_id);
