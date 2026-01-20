-- ============================================
-- MIGRATION: Token version e Audit logs
-- ============================================

-- Adicionar token_version para invalidar sessões
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 0;

-- Criar tabela de audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Comentários
COMMENT ON COLUMN usuarios.token_version IS 'Versão do token para invalidar sessões antigas';
COMMENT ON TABLE audit_logs IS 'Registro de ações críticas do sistema';
COMMENT ON COLUMN audit_logs.action IS 'Tipo de ação: LOGIN, LOGOUT, PASSWORD_CHANGE, etc';
COMMENT ON COLUMN audit_logs.entity_type IS 'Tipo de entidade afetada: user, vendedor, proposta, etc';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID da entidade afetada';
COMMENT ON COLUMN audit_logs.details IS 'Detalhes adicionais em JSON';
