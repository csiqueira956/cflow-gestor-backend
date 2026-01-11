# 🔗 Integração CFLOW Gestor + Admin SaaS

## 📋 Visão Geral

Este documento descreve a integração completa entre o **CFLOW Gestor** (sistema de gestão de vendas) e o **CFLOW Admin SaaS** (sistema de gerenciamento de assinaturas e pagamentos).

### Arquitetura Implementada

```
┌─────────────────────────────────────────────────────────────┐
│                     CFLOW GESTOR                            │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐│
│  │   Frontend     │  │   Backend    │  │    Database     ││
│  │   (React)      │→│   (Node.js)  │→│   (Supabase)    ││
│  └────────────────┘  └──────┬───────┘  └────────┬────────┘│
│                             │                     │         │
└─────────────────────────────┼─────────────────────┼─────────┘
                              │                     │
                              │  API Calls          │ Shared DB
                              ↓                     ↓
┌─────────────────────────────┼─────────────────────┼─────────┐
│                     CFLOW ADMIN SAAS                │         │
│  ┌────────────────┐  ┌──────┴───────┐  ┌─────────┴───────┐│
│  │sistema-vendas  │  │   Netlify    │  │    Database     ││
│  │   .html        │→│  Functions   │→│   (Supabase)    ││
│  └────────────────┘  └──────┬───────┘  └─────────────────┘│
│                             │                               │
│                             ↓                               │
│                     ┌───────────────┐                       │
│                     │     ASAAS     │                       │
│                     │  (Pagamentos) │                       │
│                     └───────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Objetivos Atingidos

✅ **Clientes** gerenciam suas assinaturas dentro do CFLOW Gestor
✅ **Super Admin** gerencia todas as empresas no CFLOW Admin SaaS
✅ **Banco de dados compartilhado** (Supabase PostgreSQL)
✅ **Multi-tenancy** completo com isolamento de dados
✅ **Integração com ASAAS** para processamento de pagamentos
✅ **Controle de limites** por plano (usuários, leads, etc)
✅ **Upgrade/Downgrade** de planos pelos clientes

## 📦 Arquivos Criados/Modificados

### Backend do CFLOW Gestor

#### Migrações de Banco de Dados
- `backend/database/migrations/001_add_multitenancy.sql`
  - Cria tabela `companies`
  - Adiciona `company_id` em `usuarios` e `clientes`
  - Implementa RLS (Row Level Security)
  - Cria views e funções de validação

- `backend/database/migrations/002_integrate_with_admin_saas.sql`
  - Integra `companies` com `subscriptions`
  - Cria funções SQL de validação
  - Implementa triggers de sincronização
  - Cria views unificadas

- `backend/database/migrations/README.md`
  - Guia completo de execução das migrações
  - Testes de validação
  - Procedimentos de rollback

#### Controllers
- `backend/src/controllers/assinaturaController.js`
  - `getMinhaAssinatura()` - Buscar dados da assinatura
  - `checkStatus()` - Verificar status da assinatura
  - `updatePlan()` - Mudar plano (upgrade/downgrade)
  - `getPagamentos()` - Histórico de pagamentos
  - `getUso()` - Estatísticas de uso (usuários, leads)
  - `validarNovoUsuario()` - Validar se pode criar usuário
  - `validarNovoLead()` - Validar se pode criar lead

#### Middleware
- `backend/src/middleware/checkSubscription.js`
  - `requireActiveSubscription()` - Bloquear acesso se assinatura inativa
  - `canCreateUser()` - Validar limite de usuários
  - `canCreateLead()` - Validar limite de leads
  - `checkSubscriptionWarning()` - Modo informativo (não bloqueia)
  - Cache de 5 minutos para otimização

#### Rotas
- `backend/src/routes/assinaturaRoutes.js`
  - GET `/api/assinatura` - Obter assinatura
  - GET `/api/assinatura/status` - Status da assinatura
  - GET `/api/assinatura/pagamentos` - Histórico de pagamentos
  - GET `/api/assinatura/uso` - Informações de uso
  - GET `/api/assinatura/validar-usuario` - Validar criação de usuário
  - GET `/api/assinatura/validar-lead` - Validar criação de lead
  - PUT `/api/assinatura/plano` - Atualizar plano

- `backend/src/index.js` (modificado)
  - Adiciona rota `/api/assinatura`

### Frontend do CFLOW Gestor

#### Páginas
- `frontend/src/pages/MinhaAssinatura.jsx`
  - Exibição de dados do plano atual
  - Gráficos de uso (usuários, leads)
  - Histórico de pagamentos
  - Modal de upgrade/downgrade de plano
  - Alertas de trial e inadimplência
  - Download/cópia de boletos e PIX

#### API
- `frontend/src/api/api.js` (modificado)
  - Adiciona `assinaturaAPI` com todas as funções

#### Componentes
- `frontend/src/components/Navbar.jsx` (modificado)
  - Adiciona menu "Minha Assinatura"
  - Ícone de cartão de crédito

#### Rotas
- `frontend/src/App.jsx` (modificado)
  - Adiciona rota protegida `/assinatura`

### Netlify Functions do CFLOW Admin SaaS

#### Funções API
- `netlify/functions/get-subscription.js`
  - Retorna dados completos da assinatura de uma empresa
  - Inclui últimos 5 pagamentos
  - Calcula dias até vencimento
  - Identifica status (ativa, trial, overdue, etc)

- `netlify/functions/check-subscription-status.js`
  - Valida se assinatura está ativa
  - Verifica se trial expirou
  - Valida limites de usuários/leads
  - Retorna mensagens contextuais

- `netlify/functions/update-subscription-plan.js`
  - Permite upgrade/downgrade de plano
  - Valida se empresa tem usuários demais para downgrade
  - Atualiza no ASAAS e no banco de dados
  - Registra mudança em `webhook_logs` para auditoria

## 🔧 Configuração

### 1. Variáveis de Ambiente

#### CFLOW Gestor (.env)
```env
# Database
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua_service_key_aqui

# Admin SaaS Integration
ADMIN_SAAS_URL=https://cflow-admin-saas.netlify.app
ADMIN_API_KEY=chave_secreta_para_autenticacao

# Frontend
VITE_API_URL=http://localhost:3001/api
```

#### CFLOW Admin SaaS (.env no Netlify)
```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua_service_key_aqui

# ASAAS
ASAAS_API_KEY=sua_api_key_asaas
ASAAS_ENV=sandbox  # ou 'production'
ASAAS_WEBHOOK_TOKEN=token_secreto_webhooks

# API Security
ADMIN_API_KEY=chave_secreta_para_autenticacao  # Mesma do Gestor
```

### 2. Executar Migrações do Banco de Dados

#### Passo 1: Migração Multi-tenancy
```sql
-- Execute no SQL Editor do Supabase
-- Arquivo: cflow-gestor/backend/database/migrations/001_add_multitenancy.sql
```

**O que faz**:
- Cria tabela `companies`
- Adiciona `company_id` em `usuarios` e `clientes`
- Migra dados existentes para empresa padrão
- Habilita Row Level Security

#### Passo 2: Integração Admin SaaS
```sql
-- Execute no SQL Editor do Supabase
-- Arquivo: cflow-gestor/backend/database/migrations/002_integrate_with_admin_saas.sql
```

**O que faz**:
- Vincula `companies` com `subscriptions`
- Cria funções de validação (`can_create_user`, `can_create_lead`)
- Implementa triggers de sincronização
- Cria views unificadas

### 3. Instalar Dependências

#### CFLOW Gestor Backend
```bash
cd cflow-gestor/backend
npm install axios  # Se ainda não estiver instalado
```

#### CFLOW Admin SaaS
```bash
cd cflow-admin-saas
npm install @supabase/supabase-js node-fetch  # Se ainda não estiverem instalados
```

### 4. Deploy

#### CFLOW Gestor
```bash
# Backend
cd cflow-gestor/backend
npm start

# Frontend
cd cflow-gestor/frontend
npm run dev
```

#### CFLOW Admin SaaS
```bash
cd cflow-admin-saas
netlify deploy --prod
```

## 🔐 Segurança

### Autenticação entre Sistemas

Todas as requisições do CFLOW Gestor para o Admin SaaS são autenticadas via **API Key**:

```javascript
headers: {
  'X-Api-Key': process.env.ADMIN_API_KEY
}
```

### Row Level Security (RLS)

Todas as tabelas possuem RLS habilitado:
- `companies`
- `usuarios`
- `clientes`
- `subscriptions`
- `payments`

### Validações Implementadas

1. **Limite de Usuários**:
   ```sql
   SELECT can_create_user('company-uuid');
   -- Retorna true/false baseado no plano
   ```

2. **Limite de Leads**:
   ```sql
   SELECT can_create_lead('company-uuid');
   -- Retorna true/false se há limite configurado
   ```

3. **Status da Assinatura**:
   ```sql
   SELECT * FROM get_subscription_status('company-uuid');
   -- Retorna status completo: ACTIVE, TRIAL, OVERDUE, etc
   ```

## 📊 Fluxo de Dados

### Cenário 1: Cliente Acessa "Minha Assinatura"

```
1. Cliente clica em "Minha Assinatura" no menu
   ↓
2. React carrega MinhaAssinatura.jsx
   ↓
3. Componente chama assinaturaAPI.getMinhaAssinatura()
   ↓
4. Backend (assinaturaController.js) recebe requisição
   ↓
5. Controller chama Admin SaaS API (get-subscription)
   ↓
6. Admin SaaS busca dados no Supabase
   - View v_companies_subscriptions
   - Últimos 5 pagamentos
   - Calcula dias até vencimento
   ↓
7. Retorna JSON com todos os dados
   ↓
8. Frontend exibe:
   - Plano atual
   - Uso (usuários, leads)
   - Pagamentos
   - Opções de upgrade
```

### Cenário 2: Cliente Faz Upgrade de Plano

```
1. Cliente seleciona novo plano e confirma
   ↓
2. Frontend chama assinaturaAPI.updatePlan(planId, false)
   ↓
3. Backend valida requisição
   ↓
4. Chama Admin SaaS: update-subscription-plan
   ↓
5. Admin SaaS:
   - Valida se pode fazer downgrade (check usuários)
   - Atualiza no ASAAS (muda valor da assinatura)
   - Atualiza no Supabase (subscriptions)
   - Trigger atualiza limites em companies
   - Registra em webhook_logs (auditoria)
   ↓
6. Retorna sucesso
   ↓
7. Frontend recarrega dados e exibe mensagem
```

### Cenário 3: Middleware Valida Acesso

```
1. Usuário tenta acessar qualquer rota protegida
   ↓
2. Middleware requireActiveSubscription é executado
   ↓
3. Busca company_id do usuário autenticado (req.usuario)
   ↓
4. Verifica cache (TTL 5 minutos)
   ↓
5. Se não está em cache:
   - Chama Admin SaaS: check-subscription-status
   - Salva resultado no cache
   ↓
6. Valida status retornado:
   - Se ACTIVE ou TRIAL → permite acesso
   - Se OVERDUE, CANCELLED, EXPIRED → bloqueia (HTTP 402)
   ↓
7. Adiciona dados da assinatura em req.subscription
   ↓
8. Continua para o controller
```

## 🧪 Testes

### Teste 1: Verificar Integração do Banco

```sql
-- Verificar empresas criadas
SELECT * FROM companies;

-- Verificar usuários com company_id
SELECT id, nome, email, company_id FROM usuarios;

-- Verificar assinaturas vinculadas
SELECT * FROM v_companies_subscriptions;

-- Testar função de validação
SELECT can_create_user('company-uuid-aqui');
```

### Teste 2: Testar API do Admin SaaS

```bash
# Testar get-subscription
curl -X POST https://cflow-admin-saas.netlify.app/.netlify/functions/get-subscription \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: sua_api_key" \
  -d '{"company_id": "uuid-da-empresa"}'

# Testar check-subscription-status
curl -X POST https://cflow-admin-saas.netlify.app/.netlify/functions/check-subscription-status \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: sua_api_key" \
  -d '{"company_id": "uuid-da-empresa"}'
```

### Teste 3: Testar Frontend

1. Acesse `http://localhost:3000/assinatura`
2. Verifique se aparecem:
   - ✅ Dados do plano atual
   - ✅ Gráficos de uso
   - ✅ Histórico de pagamentos
   - ✅ Botão "Mudar Plano"
3. Clique em "Mudar Plano" e teste upgrade
4. Verifique se os dados atualizam após mudança

## 📈 Monitoramento

### Logs de Webhook

Todos os eventos importantes são registrados:

```sql
SELECT
  event_type,
  payload,
  processed,
  created_at
FROM webhook_logs
WHERE event_type = 'SUBSCRIPTION_PLAN_CHANGED'
ORDER BY created_at DESC
LIMIT 10;
```

### Métricas de Uso

```sql
-- Uso por empresa
SELECT * FROM v_company_stats;

-- MRR (Monthly Recurring Revenue)
SELECT * FROM v_mrr_report;

-- Pagamentos do mês
SELECT * FROM v_payment_summary
WHERE month = DATE_TRUNC('month', CURRENT_DATE);
```

## 🔄 Próximas Melhorias Sugeridas

1. **Notificações por Email**
   - Avisar cliente quando trial está acabando
   - Enviar lembrete de pagamento
   - Confirmar upgrade/downgrade de plano

2. **Webhooks do ASAAS**
   - Implementar processamento completo de todos os eventos
   - Atualizar status automaticamente

3. **Análise de Uso**
   - Dashboard de métricas para o cliente
   - Gráficos de tendência de uso
   - Alertas de aproximação de limites

4. **Testes Automatizados**
   - Unit tests para controllers
   - Integration tests para APIs
   - E2E tests para fluxos completos

## 📞 Suporte

Para problemas ou dúvidas:

1. **Erros de Migração**: Consulte [migrations/README.md](backend/database/migrations/README.md)
2. **Erros de API**: Verifique logs no Netlify Functions
3. **Erros de Banco**: Consulte logs no Supabase Dashboard
4. **Documentação ASAAS**: https://docs.asaas.com

## ✅ Checklist de Implementação

- [x] Migrações do banco de dados executadas
- [x] Variáveis de ambiente configuradas
- [x] Funções Netlify deployadas
- [x] Backend do Gestor atualizado
- [x] Frontend do Gestor atualizado
- [x] Testes de integração executados
- [x] Documentação criada
- [ ] Configurar webhooks do ASAAS
- [ ] Testar em produção
- [ ] Treinar usuários

---

**Documentação criada para integração CFLOW Gestor + Admin SaaS** 🚀

Versão: 1.0.0
Data: Novembro 2024
Autor: Claude Code
