-- ============================================
-- MIGRAÇÃO: Integração com CFLOW Admin SaaS
-- ============================================
-- Esta migração conecta o CFLOW Gestor com o CFLOW Admin SaaS
-- permitindo gerenciamento centralizado de assinaturas e pagamentos
-- Execute este script no SQL Editor do Supabase (MESMO banco do cflow-admin-saas)

-- ============================================
-- 1. ADICIONAR SUBSCRIPTION_ID À TABELA COMPANIES
-- ============================================
-- Vincular empresa com sua assinatura no sistema de pagamentos
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_companies_subscription_id ON companies(subscription_id);

-- ============================================
-- 2. ATUALIZAR TABELA CUSTOMERS (do admin-saas)
-- ============================================
-- Adicionar referência à empresa no gestor
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);

-- ============================================
-- 3. CRIAR VIEW UNIFICADA DE EMPRESAS E ASSINATURAS
-- ============================================
-- View que combina dados da empresa (gestor) com assinatura (admin-saas)
CREATE OR REPLACE VIEW v_companies_subscriptions AS
SELECT
    -- Dados da empresa (gestor)
    co.id as company_id,
    co.nome as company_nome,
    co.razao_social,
    co.cnpj,
    co.email as company_email,
    co.telefone as company_telefone,
    co.status as company_status,
    co.max_users,
    co.max_leads,
    co.created_at as company_created_at,

    -- Dados do customer (admin-saas)
    cu.id as customer_id,
    cu.name as customer_name,
    cu.asaas_customer_id,
    cu.sales_count,

    -- Dados da assinatura (admin-saas)
    s.id as subscription_id,
    s.asaas_subscription_id,
    s.status as subscription_status,
    s.trial_end_date,
    s.next_due_date,
    s.value as subscription_value,
    s.payment_method,
    s.billing_type,
    s.cycle,
    s.created_at as subscription_created_at,

    -- Dados do plano (admin-saas)
    p.id as plan_id,
    p.name as plan_name,
    p.description as plan_description,
    p.price as plan_price,
    p.billing_cycle,
    p.features as plan_features

FROM companies co
LEFT JOIN customers cu ON co.company_id = cu.company_id OR co.asaas_customer_id = cu.asaas_customer_id
LEFT JOIN subscriptions s ON co.subscription_id = s.id
LEFT JOIN plans p ON s.plan_id = p.id;

-- ============================================
-- 4. CRIAR VIEW DE PAGAMENTOS POR EMPRESA
-- ============================================
CREATE OR REPLACE VIEW v_company_payments AS
SELECT
    co.id as company_id,
    co.nome as company_nome,
    pay.id as payment_id,
    pay.invoice_number,
    pay.value,
    pay.net_value,
    pay.due_date,
    pay.payment_date,
    pay.status as payment_status,
    pay.payment_method,
    pay.bank_slip_url,
    pay.pix_qr_code,
    pay.pix_copy_paste,
    pay.created_at as payment_created_at
FROM companies co
JOIN subscriptions s ON co.subscription_id = s.id
JOIN payments pay ON s.id = pay.subscription_id
ORDER BY pay.due_date DESC;

-- ============================================
-- 5. CRIAR FUNÇÕES DE VALIDAÇÃO
-- ============================================

-- Função: Verificar se empresa pode criar novos usuários
CREATE OR REPLACE FUNCTION can_create_user(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_users INTEGER;
    v_max_users INTEGER;
    v_subscription_status VARCHAR(20);
BEGIN
    -- Buscar dados da empresa e assinatura
    SELECT
        (SELECT COUNT(*) FROM usuarios WHERE company_id = p_company_id),
        co.max_users,
        s.status
    INTO v_current_users, v_max_users, v_subscription_status
    FROM companies co
    LEFT JOIN subscriptions s ON co.subscription_id = s.id
    WHERE co.id = p_company_id;

    -- Verificar se assinatura está ativa ou em trial
    IF v_subscription_status NOT IN ('ACTIVE', 'TRIAL') THEN
        RETURN FALSE;
    END IF;

    -- Verificar limite de usuários
    IF v_current_users >= v_max_users THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Função: Verificar se empresa pode criar novos leads
CREATE OR REPLACE FUNCTION can_create_lead(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_leads INTEGER;
    v_max_leads INTEGER;
    v_subscription_status VARCHAR(20);
BEGIN
    -- Buscar dados da empresa e assinatura
    SELECT
        (SELECT COUNT(*) FROM clientes WHERE company_id = p_company_id),
        co.max_leads,
        s.status
    INTO v_current_leads, v_max_leads, v_subscription_status
    FROM companies co
    LEFT JOIN subscriptions s ON co.subscription_id = s.id
    WHERE co.id = p_company_id;

    -- Verificar se assinatura está ativa ou em trial
    IF v_subscription_status NOT IN ('ACTIVE', 'TRIAL') THEN
        RETURN FALSE;
    END IF;

    -- Se não há limite, permitir
    IF v_max_leads IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Verificar limite de leads
    IF v_current_leads >= v_max_leads THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Função: Obter status da assinatura de uma empresa
CREATE OR REPLACE FUNCTION get_subscription_status(p_company_id UUID)
RETURNS TABLE (
    status VARCHAR(20),
    trial_end_date DATE,
    next_due_date DATE,
    plan_name VARCHAR(100),
    max_users INTEGER,
    current_users INTEGER,
    is_active BOOLEAN,
    days_until_due INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.status,
        s.trial_end_date,
        s.next_due_date,
        pl.name as plan_name,
        co.max_users,
        (SELECT COUNT(*)::INTEGER FROM usuarios WHERE company_id = p_company_id) as current_users,
        (s.status IN ('ACTIVE', 'TRIAL')) as is_active,
        (s.next_due_date - CURRENT_DATE)::INTEGER as days_until_due
    FROM companies co
    LEFT JOIN subscriptions s ON co.subscription_id = s.id
    LEFT JOIN plans pl ON s.plan_id = pl.id
    WHERE co.id = p_company_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. CRIAR TRIGGERS DE SINCRONIZAÇÃO
-- ============================================

-- Trigger: Sincronizar company_id quando customer for criado
CREATE OR REPLACE FUNCTION sync_customer_company()
RETURNS TRIGGER AS $$
BEGIN
    -- Se já existe uma empresa com esse asaas_customer_id, vincular
    UPDATE companies
    SET asaas_customer_id = NEW.asaas_customer_id
    WHERE id = NEW.company_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_customer_company_trigger
    AFTER INSERT OR UPDATE ON customers
    FOR EACH ROW
    WHEN (NEW.company_id IS NOT NULL)
    EXECUTE FUNCTION sync_customer_company();

-- Trigger: Atualizar max_users quando plano mudar
CREATE OR REPLACE FUNCTION update_company_limits_on_subscription_change()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_features JSONB;
BEGIN
    -- Buscar features do novo plano
    SELECT features INTO v_plan_features
    FROM plans
    WHERE id = NEW.plan_id;

    -- Atualizar limites da empresa
    UPDATE companies
    SET
        max_users = CASE
            WHEN NEW.plan_id = (SELECT id FROM plans WHERE name = 'Basic') THEN 10
            WHEN NEW.plan_id = (SELECT id FROM plans WHERE name = 'Pro') THEN 50
            WHEN NEW.plan_id = (SELECT id FROM plans WHERE name = 'Enterprise') THEN 999
            ELSE 3
        END,
        subscription_id = NEW.id,
        status = CASE
            WHEN NEW.status IN ('ACTIVE', 'TRIAL') THEN 'active'
            WHEN NEW.status = 'CANCELLED' THEN 'cancelled'
            WHEN NEW.status = 'OVERDUE' THEN 'suspended'
            ELSE 'active'
        END
    WHERE subscription_id = NEW.id OR asaas_customer_id = (
        SELECT asaas_customer_id FROM customers WHERE id = NEW.customer_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_limits_trigger
    AFTER INSERT OR UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_company_limits_on_subscription_change();

-- ============================================
-- 7. COMENTÁRIOS
-- ============================================
COMMENT ON COLUMN companies.subscription_id IS 'Assinatura ativa da empresa no sistema de pagamentos';
COMMENT ON COLUMN customers.company_id IS 'Empresa vinculada no CFLOW Gestor';
COMMENT ON FUNCTION can_create_user IS 'Verifica se empresa pode criar novo usuário baseado no plano';
COMMENT ON FUNCTION can_create_lead IS 'Verifica se empresa pode criar novo lead baseado no plano';
COMMENT ON FUNCTION get_subscription_status IS 'Retorna status completo da assinatura de uma empresa';

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================

-- Verificar integração
SELECT
    'Total Companies' as metrica,
    COUNT(*) as valor
FROM companies
UNION ALL
SELECT
    'Companies com Subscription' as metrica,
    COUNT(*) as valor
FROM companies
WHERE subscription_id IS NOT NULL
UNION ALL
SELECT
    'Total Customers' as metrica,
    COUNT(*) as valor
FROM customers
UNION ALL
SELECT
    'Customers com Company' as metrica,
    COUNT(*) as valor
FROM customers
WHERE company_id IS NOT NULL;
