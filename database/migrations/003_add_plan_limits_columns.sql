-- ============================================
-- MIGRAÇÃO: Adicionar colunas de limites aos planos
-- ============================================
-- Esta migração adiciona os campos max_usuarios, max_leads e max_storage_gb
-- à tabela plans (admin-saas) e max_storage_gb à tabela companies (gestor)
-- Execute este script no SQL Editor do Supabase

-- ============================================
-- 1. ADICIONAR CAMPOS DE LIMITES À TABELA PLANS (admin-saas)
-- ============================================

ALTER TABLE plans
ADD COLUMN IF NOT EXISTS max_usuarios INTEGER,
ADD COLUMN IF NOT EXISTS max_leads INTEGER,
ADD COLUMN IF NOT EXISTS max_storage_gb INTEGER;

-- Comentários nas novas colunas
COMMENT ON COLUMN plans.max_usuarios IS 'Limite máximo de usuários permitidos neste plano (NULL = ilimitado)';
COMMENT ON COLUMN plans.max_leads IS 'Limite máximo de leads permitidos neste plano (NULL = ilimitado)';
COMMENT ON COLUMN plans.max_storage_gb IS 'Limite máximo de armazenamento em GB neste plano (NULL = ilimitado)';

-- ============================================
-- 2. ADICIONAR max_storage_gb À TABELA COMPANIES (gestor)
-- ============================================

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS max_storage_gb INTEGER;

COMMENT ON COLUMN companies.max_storage_gb IS 'Limite de armazenamento em GB conforme plano da assinatura';

-- ============================================
-- 3. ATUALIZAR PLANOS PADRÃO COM LIMITES
-- ============================================

-- Atualizar plano Basic
UPDATE plans
SET
    max_usuarios = 10,
    max_leads = 100,
    max_storage_gb = 10
WHERE name = 'Basic';

-- Atualizar plano Pro
UPDATE plans
SET
    max_usuarios = 50,
    max_leads = 500,
    max_storage_gb = 50
WHERE name = 'Pro';

-- Atualizar plano Enterprise (ilimitado)
UPDATE plans
SET
    max_usuarios = NULL,  -- Ilimitado
    max_leads = NULL,     -- Ilimitado
    max_storage_gb = NULL -- Ilimitado
WHERE name = 'Enterprise';

-- ============================================
-- 4. ATUALIZAR TRIGGER PARA COPIAR LIMITES DO PLANO
-- ============================================

-- Recriar função do trigger para usar os limites da tabela plans
CREATE OR REPLACE FUNCTION update_company_limits_on_subscription_change()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_max_usuarios INTEGER;
    v_plan_max_leads INTEGER;
    v_plan_max_storage_gb INTEGER;
BEGIN
    -- Buscar limites do plano
    SELECT
        max_usuarios,
        max_leads,
        max_storage_gb
    INTO
        v_plan_max_usuarios,
        v_plan_max_leads,
        v_plan_max_storage_gb
    FROM plans
    WHERE id = NEW.plan_id;

    -- Atualizar limites da empresa baseado no plano
    UPDATE companies
    SET
        max_users = COALESCE(v_plan_max_usuarios, 999),  -- Se NULL, usar 999 (ilimitado)
        max_leads = v_plan_max_leads,                     -- NULL = ilimitado
        max_storage_gb = v_plan_max_storage_gb,           -- NULL = ilimitado
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

-- Nota: O trigger já existe (criado na migration 002), não precisa recriar

-- ============================================
-- 5. SINCRONIZAR LIMITES DAS COMPANIES EXISTENTES
-- ============================================

-- Atualizar companies que já têm assinatura ativa
UPDATE companies c
SET
    max_users = COALESCE(p.max_usuarios, 999),
    max_leads = p.max_leads,
    max_storage_gb = p.max_storage_gb
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
WHERE c.subscription_id = s.id;

-- ============================================
-- 6. VERIFICAR RESULTADO DA MIGRAÇÃO
-- ============================================

-- Mostrar planos com novos limites
SELECT
    id,
    name,
    price,
    max_usuarios,
    max_leads,
    max_storage_gb,
    active
FROM plans
ORDER BY price;

-- Mostrar companies com limites atualizados
SELECT
    c.id,
    c.nome as company_nome,
    c.max_users,
    c.max_leads,
    c.max_storage_gb,
    c.status,
    p.name as plan_name
FROM companies c
LEFT JOIN subscriptions s ON c.subscription_id = s.id
LEFT JOIN plans p ON s.plan_id = p.id
LIMIT 10;

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================

COMMENT ON COLUMN plans.max_usuarios IS 'Limite máximo de usuários (NULL = ilimitado)';
COMMENT ON COLUMN plans.max_leads IS 'Limite máximo de leads (NULL = ilimitado)';
COMMENT ON COLUMN plans.max_storage_gb IS 'Limite máximo de storage em GB (NULL = ilimitado)';
COMMENT ON COLUMN companies.max_storage_gb IS 'Limite de storage conforme o plano';
