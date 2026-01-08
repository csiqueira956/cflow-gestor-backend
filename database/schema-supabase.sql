-- ============================================
-- CFLOW GESTOR - SCHEMA PARA SUPABASE
-- ============================================
-- Este schema complementa o schema existente do cflow-admin-saas
-- As tabelas plans, customers, subscriptions, payments, webhook_logs
-- já existem no Supabase do cflow-admin-saas
--
-- Execute este script no SQL Editor do Supabase APÓS o schema do admin-saas

-- ============================================
-- 1. TABELA DE EMPRESAS (companies)
-- ============================================
-- Faz a ponte entre o gestor e o admin-saas
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    razao_social VARCHAR(255),
    cnpj VARCHAR(18) UNIQUE,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    asaas_customer_id VARCHAR(100) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'ACTIVE', 'TRIAL', 'OVERDUE', 'EXPIRED')),
    max_users INTEGER DEFAULT 3,
    max_leads INTEGER DEFAULT 100,
    max_storage_gb DECIMAL(10, 2) DEFAULT 1,
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    subscription_id UUID, -- Referência opcional para subscriptions (admin-saas)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para companies
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_companies_asaas_customer_id ON companies(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_id ON companies(subscription_id);

-- ============================================
-- 2. TABELA DE EQUIPES
-- ============================================
CREATE TABLE IF NOT EXISTS equipes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(nome, company_id)
);

-- Índices para equipes
CREATE INDEX IF NOT EXISTS idx_equipes_company_id ON equipes(company_id);

-- ============================================
-- 3. TABELA DE USUÁRIOS
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'vendedor' CHECK (role IN ('admin', 'gerente', 'vendedor', 'super_admin')),
    tipo_usuario VARCHAR(50) CHECK (tipo_usuario IN ('interno', 'externo', 'parceiro')),
    percentual_comissao DECIMAL(5, 2),
    celular VARCHAR(20),
    equipe VARCHAR(100),
    equipe_id INTEGER REFERENCES equipes(id) ON DELETE SET NULL,
    link_publico VARCHAR(100),
    foto_perfil TEXT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    activation_token VARCHAR(255),
    token_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(email, company_id),
    UNIQUE(link_publico)
);

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_company_id ON usuarios(company_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_equipe_id ON usuarios(equipe_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);
CREATE INDEX IF NOT EXISTS idx_usuarios_link_publico ON usuarios(link_publico);

-- ============================================
-- 4. TABELA DE ADMINISTRADORAS
-- ============================================
CREATE TABLE IF NOT EXISTS administradoras (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    nome_contato VARCHAR(255),
    celular VARCHAR(20),
    comissionamento_recebido DECIMAL(5, 2),
    comissionamento_pago DECIMAL(5, 2),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para administradoras
CREATE INDEX IF NOT EXISTS idx_administradoras_company_id ON administradoras(company_id);

-- ============================================
-- 5. TABELA DE CLIENTES (leads)
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    -- Dados Básicos
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(255),

    -- Dados Pessoais
    data_nascimento DATE,
    estado_civil VARCHAR(50),
    nacionalidade VARCHAR(100) DEFAULT 'Brasil',
    cidade_nascimento VARCHAR(100),
    nome_mae VARCHAR(255),
    profissao VARCHAR(100),
    remuneracao DECIMAL(10, 2),

    -- Contatos
    telefone_residencial VARCHAR(20),
    telefone_comercial VARCHAR(20),
    telefone_celular VARCHAR(20),
    telefone_celular_2 VARCHAR(20),

    -- Documentação
    tipo_documento VARCHAR(100) DEFAULT 'RG',
    numero_documento VARCHAR(50),
    orgao_emissor VARCHAR(50),
    data_emissao DATE,

    -- Dados do Cônjuge
    cpf_conjuge VARCHAR(14),
    nome_conjuge VARCHAR(255),

    -- Endereço
    cep VARCHAR(10),
    tipo_logradouro VARCHAR(50) DEFAULT 'Rua',
    endereco VARCHAR(255),
    numero_endereco VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),

    -- Pagamento - 1ª Parcela
    forma_pagamento_primeira VARCHAR(50) DEFAULT 'Boleto',
    data_pre_datado DATE,
    valor_cheque DECIMAL(10, 2),
    numero_cheque VARCHAR(50),
    data_vencimento_cheque DATE,
    banco_cheque VARCHAR(100),
    agencia_cheque VARCHAR(20),
    conta_cheque VARCHAR(30),

    -- Pagamento - Demais Parcelas
    forma_pagamento_demais VARCHAR(50) DEFAULT 'Boleto',
    nome_correntista VARCHAR(255),
    cpf_correntista VARCHAR(14),
    banco_debito VARCHAR(100),
    agencia_debito VARCHAR(20),
    conta_debito VARCHAR(30),

    -- Seguro
    aceita_seguro BOOLEAN DEFAULT false,

    -- Dados do Consórcio
    valor_carta DECIMAL(10, 2),
    administradora VARCHAR(100),
    grupo VARCHAR(50),
    cota VARCHAR(50),
    observacao TEXT,

    -- Controle
    etapa VARCHAR(50) NOT NULL DEFAULT 'novo_contato' CHECK (
        etapa IN ('novo_contato', 'proposta_enviada', 'negociacao', 'fechado', 'em_comissionamento', 'perdido')
    ),
    vendedor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para clientes
CREATE INDEX IF NOT EXISTS idx_clientes_vendedor_id ON clientes(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_clientes_company_id ON clientes(company_id);
CREATE INDEX IF NOT EXISTS idx_clientes_etapa ON clientes(etapa);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_clientes_created_at ON clientes(created_at DESC);

-- ============================================
-- 6. TABELA DE COMISSÕES
-- ============================================
CREATE TABLE IF NOT EXISTS comissoes (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    vendedor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    valor_venda DECIMAL(10, 2) NOT NULL,
    percentual_comissao DECIMAL(5, 2) NOT NULL,
    valor_comissao DECIMAL(10, 2) NOT NULL,
    numero_parcelas INTEGER DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (
        status IN ('pendente', 'em_pagamento', 'pago', 'cancelado')
    ),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para comissoes
CREATE INDEX IF NOT EXISTS idx_comissoes_cliente_id ON comissoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_vendedor_id ON comissoes(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_company_id ON comissoes(company_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_status ON comissoes(status);

-- ============================================
-- 7. TABELA DE PARCELAS DE COMISSÃO
-- ============================================
CREATE TABLE IF NOT EXISTS parcelas_comissao (
    id SERIAL PRIMARY KEY,
    comissao_id INTEGER NOT NULL REFERENCES comissoes(id) ON DELETE CASCADE,
    numero_parcela INTEGER NOT NULL,
    valor_parcela DECIMAL(10, 2) NOT NULL,
    data_vencimento DATE,
    data_pagamento DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (
        status IN ('pendente', 'pago', 'cancelado')
    ),
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comissao_id, numero_parcela)
);

-- Índices para parcelas_comissao
CREATE INDEX IF NOT EXISTS idx_parcelas_comissao_id ON parcelas_comissao(comissao_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas_comissao(status);

-- ============================================
-- 8. TABELA DE METAS
-- ============================================
CREATE TABLE IF NOT EXISTS metas (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('vendedor', 'equipe')),
    vendedor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    equipe_id INTEGER REFERENCES equipes(id) ON DELETE CASCADE,
    valor_meta DECIMAL(10, 2) NOT NULL,
    mes_referencia VARCHAR(7) NOT NULL,
    status VARCHAR(50) DEFAULT 'ativa' CHECK (status IN ('ativa', 'concluida', 'cancelada')),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para metas
CREATE INDEX IF NOT EXISTS idx_metas_company_id ON metas(company_id);
CREATE INDEX IF NOT EXISTS idx_metas_vendedor_id ON metas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_metas_equipe_id ON metas(equipe_id);
CREATE INDEX IF NOT EXISTS idx_metas_mes_referencia ON metas(mes_referencia);

-- ============================================
-- 9. TABELA DE FORMULÁRIOS PÚBLICOS
-- ============================================
CREATE TABLE IF NOT EXISTS formularios_publicos (
    id SERIAL PRIMARY KEY,
    token VARCHAR(100) UNIQUE NOT NULL,
    vendedor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(255),
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    total_preenchimentos INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Índices para formularios_publicos
CREATE INDEX IF NOT EXISTS idx_formularios_token ON formularios_publicos(token);
CREATE INDEX IF NOT EXISTS idx_formularios_vendedor ON formularios_publicos(vendedor_id);

-- ============================================
-- 10. TABELA DE PASSWORD RESETS
-- ============================================
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para password_resets
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);

-- ============================================
-- 11. TRIGGERS PARA UPDATED_AT
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para as tabelas

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipes_updated_at
    BEFORE UPDATE ON equipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_administradoras_updated_at
    BEFORE UPDATE ON administradoras
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comissoes_updated_at
    BEFORE UPDATE ON comissoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parcelas_updated_at
    BEFORE UPDATE ON parcelas_comissao
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metas_updated_at
    BEFORE UPDATE ON metas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 12. ROW LEVEL SECURITY
-- ============================================

-- Habilitar RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE administradoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_comissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE formularios_publicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Políticas: Service role tem acesso total (backend usa service key)
CREATE POLICY "Service role full access companies" ON companies FOR ALL USING (true);
CREATE POLICY "Service role full access usuarios" ON usuarios FOR ALL USING (true);
CREATE POLICY "Service role full access equipes" ON equipes FOR ALL USING (true);
CREATE POLICY "Service role full access clientes" ON clientes FOR ALL USING (true);
CREATE POLICY "Service role full access administradoras" ON administradoras FOR ALL USING (true);
CREATE POLICY "Service role full access comissoes" ON comissoes FOR ALL USING (true);
CREATE POLICY "Service role full access parcelas" ON parcelas_comissao FOR ALL USING (true);
CREATE POLICY "Service role full access metas" ON metas FOR ALL USING (true);
CREATE POLICY "Service role full access formularios" ON formularios_publicos FOR ALL USING (true);
CREATE POLICY "Service role full access resets" ON password_resets FOR ALL USING (true);

-- ============================================
-- 13. LINK COM CUSTOMERS DO ADMIN-SAAS (OPCIONAL)
-- ============================================
-- Execute este bloco apenas se a tabela customers do admin-saas existir:
-- ALTER TABLE customers ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
-- CREATE INDEX idx_customers_company_id ON customers(company_id);

-- ============================================
-- 14. VIEWS ÚTEIS
-- ============================================

-- View: Estatísticas por empresa
CREATE OR REPLACE VIEW v_company_stats AS
SELECT
    c.id as company_id,
    c.nome as company_nome,
    c.status,
    c.max_users,
    c.max_leads,
    COUNT(DISTINCT u.id) as total_usuarios,
    COUNT(DISTINCT cl.id) as total_clientes,
    COUNT(DISTINCT CASE WHEN u.role = 'vendedor' THEN u.id END) as total_vendedores,
    COUNT(DISTINCT CASE WHEN u.role = 'admin' THEN u.id END) as total_admins
FROM companies c
LEFT JOIN usuarios u ON c.id = u.company_id
LEFT JOIN clientes cl ON c.id = cl.company_id
GROUP BY c.id, c.nome, c.status, c.max_users, c.max_leads;

-- View: Comissões com detalhes
CREATE OR REPLACE VIEW v_comissoes_detalhes AS
SELECT
    co.id,
    co.valor_venda,
    co.percentual_comissao,
    co.valor_comissao,
    co.numero_parcelas,
    co.status,
    co.created_at,
    cl.nome as cliente_nome,
    cl.cpf as cliente_cpf,
    u.nome as vendedor_nome,
    u.email as vendedor_email,
    c.nome as empresa_nome,
    co.company_id
FROM comissoes co
JOIN clientes cl ON co.cliente_id = cl.id
JOIN usuarios u ON co.vendedor_id = u.id
JOIN companies c ON co.company_id = c.id;

-- ============================================
-- 15. COMENTÁRIOS NAS TABELAS
-- ============================================

COMMENT ON TABLE companies IS 'Empresas/tenants que usam o sistema';
COMMENT ON TABLE usuarios IS 'Usuários do sistema (admin, gerente, vendedor)';
COMMENT ON TABLE equipes IS 'Equipes de vendas';
COMMENT ON TABLE clientes IS 'Clientes/leads cadastrados pelos vendedores';
COMMENT ON TABLE administradoras IS 'Administradoras de consórcio parceiras';
COMMENT ON TABLE comissoes IS 'Comissões de vendas';
COMMENT ON TABLE parcelas_comissao IS 'Parcelas de pagamento das comissões';
COMMENT ON TABLE metas IS 'Metas de vendas por vendedor ou equipe';
COMMENT ON TABLE formularios_publicos IS 'Formulários públicos para captação de leads';
COMMENT ON TABLE password_resets IS 'Tokens para recuperação de senha';

COMMENT ON COLUMN companies.subscription_id IS 'Referência à assinatura no admin-saas';
COMMENT ON COLUMN companies.max_users IS 'Limite de usuários baseado no plano';
COMMENT ON COLUMN companies.max_leads IS 'Limite de leads baseado no plano';

-- ============================================
-- FIM DO SCHEMA CFLOW-GESTOR
-- ============================================

-- Verificar tabelas criadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
