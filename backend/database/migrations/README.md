# 🔄 Guia de Migração - Integração CFLOW Gestor + Admin SaaS

## 📋 Visão Geral

Este diretório contém as migrações necessárias para transformar o CFLOW Gestor em um sistema SaaS multi-tenant integrado com o CFLOW Admin SaaS.

## 🎯 Objetivo

Permitir que:
- **Clientes** gerenciem suas assinaturas dentro do CFLOW Gestor
- **Super Admin** gerencie todas as empresas no CFLOW Admin SaaS
- Sistema compartilhe um único banco de dados Supabase

## 📦 Migrações Disponíveis

### 001_add_multitenancy.sql
**Descrição**: Adiciona suporte a múltiplas empresas (multi-tenancy) ao CFLOW Gestor

**O que faz**:
- ✅ Cria tabela `companies` (empresas clientes)
- ✅ Adiciona coluna `company_id` em `usuarios`
- ✅ Adiciona coluna `company_id` em `clientes`
- ✅ Migra dados existentes para empresa padrão
- ✅ Habilita Row Level Security (RLS)
- ✅ Cria views úteis para relatórios

**Quando executar**: Primeiro, antes de todas as outras

### 002_integrate_with_admin_saas.sql
**Descrição**: Integra CFLOW Gestor com CFLOW Admin SaaS

**O que faz**:
- ✅ Vincula `companies` com `subscriptions` (do admin-saas)
- ✅ Vincula `customers` com `companies`
- ✅ Cria views unificadas de empresas e assinaturas
- ✅ Cria funções de validação (`can_create_user`, `can_create_lead`)
- ✅ Cria triggers de sincronização automática
- ✅ Implementa controle de limites por plano

**Quando executar**: Segundo, depois que o schema do admin-saas estiver criado

## 🚀 Como Executar

### Pré-requisitos

1. **Banco de dados Supabase criado**
2. **Schema do CFLOW Admin SaaS já executado** ([database/schema.sql](../../../../cflow-admin-saas/database/schema.sql))
3. **Schema original do CFLOW Gestor já executado** ([../schema.sql](../schema.sql))

### Passo a Passo

#### 1️⃣ Acessar Supabase SQL Editor

1. Acesse: https://supabase.com
2. Entre no seu projeto
3. No menu lateral, clique em **SQL Editor**

#### 2️⃣ Executar Migração 001 (Multi-tenancy)

1. Abra o arquivo `001_add_multitenancy.sql`
2. Copie todo o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **Run**
5. Aguarde a mensagem de sucesso
6. Verifique os resultados:

```sql
SELECT * FROM companies;
SELECT nome, email, company_id FROM usuarios LIMIT 5;
SELECT * FROM v_company_stats;
```

#### 3️⃣ Executar Migração 002 (Integração Admin SaaS)

1. Abra o arquivo `002_integrate_with_admin_saas.sql`
2. Copie todo o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **Run**
5. Aguarde a mensagem de sucesso
6. Verifique os resultados:

```sql
SELECT * FROM v_companies_subscriptions;
SELECT * FROM get_subscription_status((SELECT id FROM companies LIMIT 1));
```

## 🧪 Testes de Validação

Após executar as migrações, execute estes testes:

### Teste 1: Verificar estrutura das tabelas

```sql
-- Ver colunas da tabela companies
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'companies'
ORDER BY ordinal_position;

-- Ver colunas da tabela usuarios
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios'
AND column_name IN ('id', 'nome', 'email', 'company_id')
ORDER BY ordinal_position;
```

### Teste 2: Testar função de validação

```sql
-- Testar se empresa pode criar usuário
SELECT can_create_user((SELECT id FROM companies LIMIT 1));

-- Testar se empresa pode criar lead
SELECT can_create_lead((SELECT id FROM companies LIMIT 1));
```

### Teste 3: Verificar views

```sql
-- View de empresas com assinaturas
SELECT * FROM v_companies_subscriptions LIMIT 5;

-- View de estatísticas por empresa
SELECT * FROM v_company_stats;
```

### Teste 4: Verificar status de assinatura

```sql
-- Obter status da assinatura
SELECT * FROM get_subscription_status((SELECT id FROM companies LIMIT 1));
```

## 📊 Estrutura Final do Banco

Após as migrações, o banco terá:

### Tabelas CFLOW Gestor
- `companies` (novo) - Empresas clientes
- `usuarios` (modificado) - Usuários com `company_id`
- `clientes` (modificado) - Leads com `company_id`
- `comissoes` (inalterado)
- `parcelas_comissao` (inalterado)

### Tabelas CFLOW Admin SaaS
- `plans` - Planos de assinatura
- `customers` (modificado) - Clientes com `company_id`
- `subscriptions` - Assinaturas
- `payments` - Pagamentos
- `webhook_logs` - Logs de webhooks

### Views
- `v_usuarios_empresas` - Usuários com dados da empresa
- `v_company_stats` - Estatísticas por empresa
- `v_companies_subscriptions` - Empresas com assinaturas
- `v_company_payments` - Pagamentos por empresa

### Funções
- `can_create_user(company_id)` - Validar criação de usuário
- `can_create_lead(company_id)` - Validar criação de lead
- `get_subscription_status(company_id)` - Obter status da assinatura

## 🔧 Rollback (Desfazer Migrações)

Se precisar reverter as migrações:

### Rollback 002

```sql
-- Remover triggers
DROP TRIGGER IF EXISTS sync_customer_company_trigger ON customers;
DROP TRIGGER IF EXISTS update_company_limits_trigger ON subscriptions;

-- Remover funções
DROP FUNCTION IF EXISTS sync_customer_company();
DROP FUNCTION IF EXISTS update_company_limits_on_subscription_change();
DROP FUNCTION IF EXISTS can_create_user(UUID);
DROP FUNCTION IF EXISTS can_create_lead(UUID);
DROP FUNCTION IF EXISTS get_subscription_status(UUID);

-- Remover views
DROP VIEW IF EXISTS v_company_payments;
DROP VIEW IF EXISTS v_companies_subscriptions;

-- Remover colunas
ALTER TABLE companies DROP COLUMN IF EXISTS subscription_id;
ALTER TABLE customers DROP COLUMN IF EXISTS company_id;
```

### Rollback 001

```sql
-- Remover RLS
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;

-- Remover policies
DROP POLICY IF EXISTS "Service role has full access to companies" ON companies;

-- Remover triggers
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;

-- Remover views
DROP VIEW IF EXISTS v_company_stats;
DROP VIEW IF EXISTS v_usuarios_empresas;

-- Remover colunas
ALTER TABLE clientes DROP COLUMN IF EXISTS company_id;
ALTER TABLE usuarios DROP COLUMN IF EXISTS company_id;

-- Remover tabela
DROP TABLE IF EXISTS companies CASCADE;
```

## ⚠️ Observações Importantes

1. **Backup**: Sempre faça backup antes de executar migrações
2. **Ordem**: Execute as migrações na ordem correta (001 → 002)
3. **Produção**: Teste em ambiente de desenvolvimento antes de produção
4. **Reversão**: Tenha um plano de rollback preparado
5. **Dados**: As migrações preservam todos os dados existentes

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs de erro no Supabase
2. Confirme que todas as tabelas do admin-saas existem
3. Verifique se você está usando o mesmo banco de dados
4. Consulte a documentação do [GUIA_INTEGRACAO_ASAAS.md](../../../../cflow-admin-saas/GUIA_INTEGRACAO_ASAAS.md)

## ✅ Checklist de Execução

- [ ] Backup do banco de dados criado
- [ ] Schema do CFLOW Gestor executado
- [ ] Schema do CFLOW Admin SaaS executado
- [ ] Migração 001 executada com sucesso
- [ ] Migração 002 executada com sucesso
- [ ] Testes de validação executados
- [ ] Views funcionando corretamente
- [ ] Funções funcionando corretamente
- [ ] Dados existentes migrados corretamente

---

**Documentação criada para integração CFLOW Gestor + Admin SaaS**
