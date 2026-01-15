-- ============================================
-- MIGRATION: Adicionar rastreamento de sessões de usuários
-- ============================================

-- Adicionar campos na tabela usuarios para rastrear sessões
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS session_token VARCHAR(255);

-- Criar tabela de histórico de sessões (opcional, para relatórios)
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    logout_at TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_company_id ON user_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_at ON user_sessions(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_last_activity ON usuarios(last_activity);

-- Comentários
COMMENT ON COLUMN usuarios.last_login IS 'Data/hora do último login';
COMMENT ON COLUMN usuarios.last_activity IS 'Data/hora da última atividade';
COMMENT ON COLUMN usuarios.session_token IS 'Token da sessão atual';
COMMENT ON TABLE user_sessions IS 'Histórico de sessões dos usuários';
