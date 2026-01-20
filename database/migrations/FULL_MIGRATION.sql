-- ============================================
-- CFLOW GESTOR - MIGRATION COMPLETA
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- Data: 2026-01-19
-- ============================================

-- ============================================
-- PARTE 0: FUNÇÃO AUXILIAR
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- PARTE 1: TABELA COMPANIES (Multi-tenancy)
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    razao_social VARCHAR(255),
    cnpj VARCHAR(18) UNIQUE,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),

    -- Integração com ASAAS
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

    -- Tracking de uso
    current_users_count INTEGER DEFAULT 0,
    current_leads_count INTEGER DEFAULT 0,
    current_storage_used_gb DECIMAL(10, 2) DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para companies
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_asaas_customer_id ON companies(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_companies_current_users ON companies(current_users_count);
CREATE INDEX IF NOT EXISTS idx_companies_current_leads ON companies(current_leads_count);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PARTE 2: TABELA PLANS (Planos de Assinatura)
-- ============================================
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),

    -- Limites do plano
    max_users INTEGER NOT NULL DEFAULT 3,
    max_leads INTEGER NOT NULL DEFAULT 100,
    max_storage_gb DECIMAL(10, 2) NOT NULL DEFAULT 1.0,
    max_equipes INTEGER NOT NULL DEFAULT 1,

    -- Features (JSONB para flexibilidade)
    features JSONB DEFAULT '[]'::jsonb,

    -- Status
    active BOOLEAN DEFAULT true,
    is_popular BOOLEAN DEFAULT false,

    -- Ordem de exibição
    display_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para plans
CREATE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(active);
CREATE INDEX IF NOT EXISTS idx_plans_display_order ON plans(display_order);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PARTE 3: TABELA SUBSCRIPTIONS (Assinaturas)
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,

    -- Status da assinatura
    status VARCHAR(20) NOT NULL DEFAULT 'trialing' CHECK (
        status IN ('trialing', 'active', 'past_due', 'cancelled', 'expired', 'pending')
    ),

    -- Períodos
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,

    -- Gateway de pagamento
    gateway VARCHAR(50) DEFAULT 'asaas' CHECK (gateway IN ('asaas', 'stripe', 'mercadopago')),
    gateway_subscription_id VARCHAR(255) UNIQUE,
    gateway_customer_id VARCHAR(255),

    -- Controle
    cancel_at_period_end BOOLEAN DEFAULT false,
    auto_renew BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway_id ON subscriptions(gateway_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PARTE 4: TABELA INVOICES (Faturas)
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Dados da fatura
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')
    ),

    -- Datas
    due_date DATE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,

    -- Gateway
    gateway VARCHAR(50) DEFAULT 'asaas',
    gateway_invoice_id VARCHAR(255) UNIQUE,
    gateway_invoice_url TEXT,
    gateway_pdf_url TEXT,

    -- Detalhes
    description TEXT,
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para invoices
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_gateway_id ON invoices(gateway_invoice_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PARTE 5: TABELA SUBSCRIPTION_HISTORY (Histórico)
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Mudança
    event_type VARCHAR(50) NOT NULL CHECK (
        event_type IN ('created', 'activated', 'upgraded', 'downgraded', 'cancelled', 'renewed', 'expired', 'trial_ended')
    ),

    -- Dados antes/depois
    old_plan_id UUID REFERENCES plans(id),
    new_plan_id UUID REFERENCES plans(id),
    old_status VARCHAR(20),
    new_status VARCHAR(20),

    -- Detalhes
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Quem fez a mudança
    changed_by_user_id INTEGER,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para subscription_history
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription_id ON subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_company_id ON subscription_history(company_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_event_type ON subscription_history(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at DESC);

-- ============================================
-- PARTE 6: TABELA WEBHOOK_EVENTS (Eventos Asaas)
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Gateway
    gateway VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255) UNIQUE,

    -- Payload
    payload JSONB NOT NULL,

    -- Processamento
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para webhook_events
CREATE INDEX IF NOT EXISTS idx_webhook_events_gateway ON webhook_events(gateway);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- ============================================
-- PARTE 7: TABELA WEBSITE_LEADS (Leads do Site)
-- ============================================
CREATE TABLE IF NOT EXISTS website_leads (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    empresa VARCHAR(255),
    tamanho_equipe VARCHAR(50),
    mensagem TEXT,
    origem VARCHAR(100) DEFAULT 'cflow-website',
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(50) DEFAULT 'novo' CHECK (status IN ('novo', 'em_analise', 'contatado', 'convertido', 'descartado')),
    notas TEXT,
    atribuido_a_vendedor_id INTEGER,
    atribuido_a_empresa_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    convertido_em_cliente_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para website_leads
CREATE INDEX IF NOT EXISTS idx_website_leads_status ON website_leads(status);
CREATE INDEX IF NOT EXISTS idx_website_leads_email ON website_leads(email);
CREATE INDEX IF NOT EXISTS idx_website_leads_created_at ON website_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_leads_atribuido_vendedor ON website_leads(atribuido_a_vendedor_id);
CREATE INDEX IF NOT EXISTS idx_website_leads_atribuido_empresa ON website_leads(atribuido_a_empresa_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_website_leads_updated_at ON website_leads;
CREATE TRIGGER trigger_website_leads_updated_at
    BEFORE UPDATE ON website_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PARTE 8: INSERIR PLANOS PADRÃO
-- ============================================
INSERT INTO plans (name, slug, description, price, billing_cycle, max_users, max_leads, max_storage_gb, max_equipes, features, active, is_popular, display_order)
VALUES
    -- Plano Básico
    (
        'Básico',
        'basico',
        'Ideal para começar sua operação de vendas',
        49.90,
        'monthly',
        3,
        100,
        1.0,
        1,
        '["Até 3 usuários", "Até 100 leads", "1GB de armazenamento", "1 equipe", "Kanban de vendas", "Formulários públicos", "Relatórios básicos", "Suporte por email"]'::jsonb,
        true,
        false,
        1
    ),
    -- Plano Profissional
    (
        'Profissional',
        'profissional',
        'Para equipes em crescimento',
        99.90,
        'monthly',
        10,
        500,
        5.0,
        3,
        '["Até 10 usuários", "Até 500 leads", "5GB de armazenamento", "3 equipes", "Todos os recursos do Básico", "Metas e comissões", "Relatórios avançados", "Integrações via API", "Suporte prioritário"]'::jsonb,
        true,
        true,
        2
    ),
    -- Plano Enterprise
    (
        'Enterprise',
        'enterprise',
        'Para grandes operações comerciais',
        249.90,
        'monthly',
        50,
        5000,
        50.0,
        999,
        '["Até 50 usuários", "Até 5.000 leads", "50GB de armazenamento", "Equipes ilimitadas", "Todos os recursos do Profissional", "Personalização avançada", "Onboarding dedicado", "Suporte 24/7", "SLA garantido"]'::jsonb,
        true,
        false,
        3
    )
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- PARTE 9: FUNCTIONS AUXILIARES
-- ============================================

-- Função: Calcular fim do período
CREATE OR REPLACE FUNCTION calculate_period_end(
    start_date TIMESTAMP WITH TIME ZONE,
    billing_cycle VARCHAR(20)
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    RETURN CASE billing_cycle
        WHEN 'monthly' THEN start_date + INTERVAL '1 month'
        WHEN 'quarterly' THEN start_date + INTERVAL '3 months'
        WHEN 'yearly' THEN start_date + INTERVAL '1 year'
        ELSE start_date + INTERVAL '1 month'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função: Criar trial automático
CREATE OR REPLACE FUNCTION create_trial_subscription(
    p_company_id UUID,
    p_plan_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_subscription_id UUID;
    v_plan_id UUID;
    v_billing_cycle VARCHAR(20);
BEGIN
    -- Se não especificou plano, usar o básico
    IF p_plan_id IS NULL THEN
        SELECT id, billing_cycle INTO v_plan_id, v_billing_cycle
        FROM plans
        WHERE slug = 'basico' AND active = true
        LIMIT 1;
    ELSE
        SELECT id, billing_cycle INTO v_plan_id, v_billing_cycle
        FROM plans
        WHERE id = p_plan_id AND active = true;
    END IF;

    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'Plano não encontrado ou inativo';
    END IF;

    -- Criar assinatura em trial
    INSERT INTO subscriptions (
        company_id,
        plan_id,
        status,
        current_period_start,
        current_period_end,
        trial_ends_at
    ) VALUES (
        p_company_id,
        v_plan_id,
        'trialing',
        NOW(),
        calculate_period_end(NOW(), v_billing_cycle),
        NOW() + INTERVAL '14 days'
    )
    RETURNING id INTO v_subscription_id;

    -- Registrar histórico
    INSERT INTO subscription_history (
        subscription_id,
        company_id,
        event_type,
        new_plan_id,
        new_status,
        description
    ) VALUES (
        v_subscription_id,
        p_company_id,
        'created',
        v_plan_id,
        'trialing',
        'Trial de 14 dias iniciado automaticamente'
    );

    RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTE 10: ROW LEVEL SECURITY
-- ============================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_leads ENABLE ROW LEVEL SECURITY;

-- Políticas: Service role tem acesso total
DROP POLICY IF EXISTS "Service role full access companies" ON companies;
CREATE POLICY "Service role full access companies" ON companies FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access plans" ON plans;
CREATE POLICY "Service role full access plans" ON plans FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access subscriptions" ON subscriptions;
CREATE POLICY "Service role full access subscriptions" ON subscriptions FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access invoices" ON invoices;
CREATE POLICY "Service role full access invoices" ON invoices FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access subscription_history" ON subscription_history;
CREATE POLICY "Service role full access subscription_history" ON subscription_history FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access webhook_events" ON webhook_events;
CREATE POLICY "Service role full access webhook_events" ON webhook_events FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access website_leads" ON website_leads;
CREATE POLICY "Service role full access website_leads" ON website_leads FOR ALL USING (true);

-- ============================================
-- PARTE 11: COMENTÁRIOS
-- ============================================
COMMENT ON TABLE companies IS 'Empresas clientes do sistema SaaS';
COMMENT ON TABLE plans IS 'Planos de assinatura disponíveis';
COMMENT ON TABLE subscriptions IS 'Assinaturas ativas das empresas';
COMMENT ON TABLE invoices IS 'Faturas/cobranças das assinaturas';
COMMENT ON TABLE subscription_history IS 'Histórico de mudanças nas assinaturas';
COMMENT ON TABLE webhook_events IS 'Eventos recebidos dos gateways de pagamento';
COMMENT ON TABLE website_leads IS 'Leads capturados através do site público';

-- ============================================
-- PARTE 12: INSERIR EMPRESA E ASSINATURA DE TESTE
-- ============================================
-- Criar empresa de teste (se não existir)
INSERT INTO companies (nome, email, status, max_users)
VALUES ('Empresa Teste', 'teste@cflow.com.br', 'active', 999)
ON CONFLICT DO NOTHING;

-- Criar assinatura de teste para a empresa
DO $$
DECLARE
    v_company_id UUID;
    v_plan_id UUID;
BEGIN
    -- Buscar empresa de teste
    SELECT id INTO v_company_id FROM companies WHERE email = 'teste@cflow.com.br' LIMIT 1;

    -- Buscar plano profissional
    SELECT id INTO v_plan_id FROM plans WHERE slug = 'profissional' LIMIT 1;

    -- Criar assinatura se não existir
    IF v_company_id IS NOT NULL AND v_plan_id IS NOT NULL THEN
        INSERT INTO subscriptions (company_id, plan_id, status, current_period_start, current_period_end)
        VALUES (v_company_id, v_plan_id, 'active', NOW(), NOW() + INTERVAL '1 month')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
SELECT 'MIGRATION COMPLETA!' as status;

SELECT
    'companies' as tabela, COUNT(*) as registros FROM companies
UNION ALL
SELECT 'plans', COUNT(*) FROM plans
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'webhook_events', COUNT(*) FROM webhook_events
UNION ALL
SELECT 'website_leads', COUNT(*) FROM website_leads;
