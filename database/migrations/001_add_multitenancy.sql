-- ============================================
-- MIGRAÇÃO: Adicionar Multi-tenancy ao CFLOW Gestor
-- ============================================
-- Esta migração adiciona suporte a múltiplas empresas (companies)
-- permitindo que o sistema funcione como SaaS
-- Execute este script no SQL Editor do Supabase

-- ============================================
-- 1. CRIAR TABELA DE EMPRESAS (COMPANIES)
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    razao_social VARCHAR(255),
    cnpj VARCHAR(18) UNIQUE,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),

    -- Integração com ASAAS (cflow-admin-saas)
    asaas_customer_id VARCHAR(100) UNIQUE,

    -- Status da empresa
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),

    -- Limites do plano
    max_users INTEGER DEFAULT 3,
    max_leads INTEGER,

    -- Dados de endereço
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para companies
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_asaas_customer_id ON companies(asaas_customer_id);
CREATE INDEX idx_companies_cnpj ON companies(cnpj);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. ADICIONAR COMPANY_ID À TABELA USUARIOS
-- ============================================
-- Adicionar coluna company_id (nullable inicialmente)
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_usuarios_company_id ON usuarios(company_id);

-- ============================================
-- 3. ADICIONAR COMPANY_ID À TABELA CLIENTES
-- ============================================
-- Para garantir isolamento de dados entre empresas
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_clientes_company_id ON clientes(company_id);

-- ============================================
-- 4. CRIAR EMPRESA PADRÃO E MIGRAR DADOS EXISTENTES
-- ============================================
-- Inserir empresa padrão para dados existentes
INSERT INTO companies (nome, email, status, max_users)
VALUES ('Empresa Principal', 'admin@gestorconsorcios.com', 'active', 999)
ON CONFLICT (id) DO NOTHING
RETURNING id;

-- Atualizar usuários existentes com a empresa padrão
UPDATE usuarios
SET company_id = (SELECT id FROM companies WHERE email = 'admin@gestorconsorcios.com' LIMIT 1)
WHERE company_id IS NULL;

-- Atualizar clientes existentes com a empresa padrão
UPDATE clientes
SET company_id = (SELECT id FROM companies WHERE email = 'admin@gestorconsorcios.com' LIMIT 1)
WHERE company_id IS NULL;

-- ============================================
-- 5. TORNAR COMPANY_ID OBRIGATÓRIO
-- ============================================
-- Agora que todos os registros têm company_id, tornar NOT NULL
ALTER TABLE usuarios
ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE clientes
ALTER COLUMN company_id SET NOT NULL;

-- ============================================
-- 6. POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY)
-- ============================================
-- Habilitar RLS nas tabelas
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_comissao ENABLE ROW LEVEL SECURITY;

-- Política: Service role tem acesso total
CREATE POLICY "Service role has full access to companies" ON companies
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to usuarios" ON usuarios
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to clientes" ON clientes
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to comissoes" ON comissoes
    FOR ALL USING (true);

CREATE POLICY "Service role has full access to parcelas_comissao" ON parcelas_comissao
    FOR ALL USING (true);

-- ============================================
-- 7. VIEWS ÚTEIS PARA RELATÓRIOS
-- ============================================
-- View: Usuários com dados da empresa
CREATE OR REPLACE VIEW v_usuarios_empresas AS
SELECT
    u.id as usuario_id,
    u.nome as usuario_nome,
    u.email as usuario_email,
    u.role,
    u.tipo_usuario,
    u.percentual_comissao,
    u.celular,
    u.equipe,
    c.id as company_id,
    c.nome as company_nome,
    c.status as company_status,
    c.max_users,
    c.created_at as usuario_created_at
FROM usuarios u
JOIN companies c ON u.company_id = c.id;

-- View: Contagem de usuários por empresa
CREATE OR REPLACE VIEW v_company_stats AS
SELECT
    c.id as company_id,
    c.nome as company_nome,
    c.status,
    c.max_users,
    COUNT(u.id) as total_usuarios,
    COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as total_admins,
    COUNT(CASE WHEN u.role = 'vendedor' THEN 1 END) as total_vendedores,
    COUNT(cl.id) as total_leads
FROM companies c
LEFT JOIN usuarios u ON c.id = u.company_id
LEFT JOIN clientes cl ON c.id = cl.company_id
GROUP BY c.id, c.nome, c.status, c.max_users;

-- ============================================
-- 8. COMENTÁRIOS NAS TABELAS
-- ============================================
COMMENT ON TABLE companies IS 'Empresas clientes do sistema SaaS';
COMMENT ON COLUMN companies.asaas_customer_id IS 'ID do cliente no ASAAS para controle de pagamentos';
COMMENT ON COLUMN companies.max_users IS 'Número máximo de usuários permitidos no plano';
COMMENT ON COLUMN usuarios.company_id IS 'Empresa à qual o usuário pertence';
COMMENT ON COLUMN clientes.company_id IS 'Empresa à qual o lead pertence';

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================

-- Verificar se a migração foi bem-sucedida
SELECT
    'Companies' as tabela,
    COUNT(*) as total_registros
FROM companies
UNION ALL
SELECT
    'Usuarios com company_id' as tabela,
    COUNT(*) as total_registros
FROM usuarios
WHERE company_id IS NOT NULL
UNION ALL
SELECT
    'Clientes com company_id' as tabela,
    COUNT(*) as total_registros
FROM clientes
WHERE company_id IS NOT NULL;
