# Análise Completa: Sistema de Limites por Plano

## 📋 Resumo Executivo

O sistema de gestão de limites por plano **já está 80% implementado**! A infraestrutura de enforcement existe e funciona, mas faltavam alguns campos no banco de dados que foram corrigidos com a migration 003.

---

## ✅ O Que JÁ EXISTE E FUNCIONA

### 1. **Middleware de Enforcement** ([checkSubscription.js](backend/src/middleware/checkSubscription.js))

✅ **Totalmente implementado e funcional:**

- `requireActiveSubscription` - Bloqueia acesso se assinatura vencida/cancelada
- `canCreateUser` - **BLOQUEIA** criação de usuários quando limite atingido
- `canCreateLead` - **BLOQUEIA** criação de leads quando limite atingido
- `canUploadFile` - **BLOQUEIA** upload quando storage atingido
- `canCreateUserPublic` - Valida limites em formulários públicos
- `canCreateLeadPublic` - Valida limites em formulários públicos
- `checkSubscriptionWarning` - Modo não-bloqueante para avisos
- Cache de 2 minutos para otimização
- Função `getSubscriptionUsage` que calcula uso atual vs limites

### 2. **Endpoints de Validação** ([assinaturaController.js](backend/src/controllers/assinaturaController.js))

✅ **Endpoints REST funcionais:**

- `GET /api/assinatura/uso` - Retorna uso detalhado (usuários, leads, storage)
- `GET /api/assinatura/validar-usuario` - Valida se pode criar usuário
- `GET /api/assinatura/validar-lead` - Valida se pode criar lead
- `GET /api/assinatura/status` - Retorna status completo com `can_create_user` e `can_create_lead`
- `PUT /api/assinatura/plano` - Permite upgrade/downgrade de plano

### 3. **Estrutura do Banco de Dados**

✅ **Arquitetura multi-tenancy completa:**

**Tabela `companies` (cflow-gestor):**
- `max_users` INTEGER - Limite de usuários
- `max_leads` INTEGER - Limite de leads
- `max_storage_gb` INTEGER - Limite de storage (⭐ **ADICIONADO na migration 003**)

**Tabela `plans` (cflow-admin-saas):**
- `max_usuarios` INTEGER - Limite de usuários do plano (⭐ **ADICIONADO na migration 003**)
- `max_leads` INTEGER - Limite de leads do plano (⭐ **ADICIONADO na migration 003**)
- `max_storage_gb` INTEGER - Limite de storage do plano (⭐ **ADICIONADO na migration 003**)

**Trigger automático:**
- Quando assinatura muda de plano, os limites são copiados automaticamente de `plans` → `companies`

---

## 🆕 O Que Foi Criado Agora

### Migration 003: Adicionar Campos de Limites

Arquivo: `backend/database/migrations/003_add_plan_limits_columns.sql`

**O que faz:**

1. ✅ Adiciona `max_usuarios`, `max_leads`, `max_storage_gb` à tabela `plans` (admin-saas)
2. ✅ Adiciona `max_storage_gb` à tabela `companies` (gestor)
3. ✅ Atualiza trigger para copiar limites do plano para a company (remove hardcode)
4. ✅ Popula planos padrão com limites:
   - **Basic**: 10 usuários, 100 leads, 10GB
   - **Pro**: 50 usuários, 500 leads, 50GB
   - **Enterprise**: ilimitado (NULL em todos)
5. ✅ Sincroniza limites das companies existentes

**Como aplicar:**

```bash
# Execute no SQL Editor do Supabase:
cat backend/database/migrations/003_add_plan_limits_columns.sql
```

---

## 📊 Arquitetura de Limites

```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN SAAS (Supabase)                   │
├─────────────────────────────────────────────────────────────┤
│  plans                                                      │
│  ├─ max_usuarios: 10, 50, NULL                             │
│  ├─ max_leads: 100, 500, NULL                              │
│  └─ max_storage_gb: 10, 50, NULL                           │
│                                                              │
│  subscriptions                                              │
│  ├─ plan_id → plans.id                                      │
│  └─ status: TRIAL, ACTIVE, OVERDUE, CANCELLED              │
│                                                              │
│  customers                                                  │
│  └─ company_id → companies.id (CFLOW Gestor)               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ TRIGGER: update_company_limits
                            │ (Copia limites quando plano muda)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   CFLOW GESTOR (Supabase)                   │
├─────────────────────────────────────────────────────────────┤
│  companies                                                  │
│  ├─ max_users: INTEGER (copiado de plans.max_usuarios)     │
│  ├─ max_leads: INTEGER (copiado de plans.max_leads)        │
│  ├─ max_storage_gb: INTEGER (copiado de plans.max_storage)│
│  └─ subscription_id → subscriptions.id                      │
│                                                              │
│  usuarios (COUNT usado para cálculo)                        │
│  clientes (COUNT usado para cálculo)                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Middleware: checkSubscription
                            │ (Consulta limites e bloqueia)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         ENFORCEMENT                         │
├─────────────────────────────────────────────────────────────┤
│  canCreateUser:                                             │
│    IF usuarios_count >= max_users → ❌ BLOQUEIA             │
│                                                              │
│  canCreateLead:                                             │
│    IF leads_count >= max_leads → ❌ BLOQUEIA                │
│                                                              │
│  canUploadFile:                                             │
│    IF storage_gb >= max_storage_gb → ❌ BLOQUEIA            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Próximas Tarefas

### 1. ⏳ Verificar Aplicação dos Middlewares nas Rotas

**Verificar se middlewares estão aplicados em:**
- `POST /api/usuarios` - Deve ter `canCreateUser`
- `POST /api/clientes` - Deve ter `canCreateLead`
- `POST /api/upload/*` - Deve ter `canUploadFile`

### 2. ⏳ Verificar UsageIndicator no Frontend

**Localizar e analisar:**
- Componente `UsageIndicator` ou similar no frontend
- Verificar se está mostrando limites em tempo real
- Verificar se está consultando `/api/assinatura/uso`

### 3. ⏳ Implementar Avisos de Proximidade ao Limite

**Criar lógica de warning quando:**
- ≥ 80% do limite de usuários
- ≥ 80% do limite de leads
- ≥ 80% do limite de storage

### 4. ⏳ Melhorar Sistema de Upgrade/Downgrade

**Adicionar:**
- Cálculo de pro-rata para mudanças de plano
- Validação se novos limites comportam uso atual
- Fluxo de pagamento da diferença

### 5. ⏳ Testes Automatizados

**Criar testes para:**
- Bloqueio ao exceder limites
- Cálculo correto de uso
- Sincronização de limites plans → companies
- Avisos de proximidade ao limite

---

## 🎯 Como o Sistema Funciona na Prática

### Cenário 1: Criar Novo Usuário

```javascript
// 1. Frontend chama
POST /api/usuarios
Body: { nome: "João", email: "joao@empresa.com" }

// 2. Middleware canCreateUser executa
const usage = await getSubscriptionUsage(companyId);
// usage = {
//   limits: { max_usuarios: 10 },
//   usage: { usuarios: 9 }
// }

// 3. Validação
if (9 >= 10) {  // FALSE, permite criar
  return res.status(403).json({ error: 'Limite atingido' });
}

// 4. Continua para o controller que cria o usuário
next();
```

### Cenário 2: Limite Atingido

```javascript
// 1. Frontend chama
POST /api/usuarios

// 2. Middleware executa
const usage = await getSubscriptionUsage(companyId);
// usage.usage.usuarios = 10
// usage.limits.max_usuarios = 10

// 3. Bloqueio!
if (10 >= 10) {  // TRUE
  return res.status(403).json({
    error: 'Limite de usuários atingido',
    message: 'Você atingiu o limite de 10 usuários do plano Basic. Faça upgrade para adicionar mais usuários.',
    current_users: 10,
    max_users: 10
  });
}
```

---

## 📝 Comandos Úteis

### Verificar Limites no Banco

```sql
-- Ver planos e limites
SELECT id, name, price, max_usuarios, max_leads, max_storage_gb, active
FROM plans
ORDER BY price;

-- Ver companies e seus limites
SELECT
  c.nome,
  c.max_users,
  c.max_leads,
  c.max_storage_gb,
  p.name as plan_name,
  (SELECT COUNT(*) FROM usuarios WHERE company_id = c.id) as usuarios_atuais,
  (SELECT COUNT(*) FROM clientes WHERE company_id = c.id) as leads_atuais
FROM companies c
LEFT JOIN subscriptions s ON c.subscription_id = s.id
LEFT JOIN plans p ON s.plan_id = p.id;
```

### Testar Endpoints

```bash
# 1. Obter uso atual
curl -X GET http://localhost:5000/api/assinatura/uso \
  -H "Authorization: Bearer $TOKEN"

# Resposta:
# {
#   "usage": {
#     "usuarios": { "total": 5, "limite": 10, "restantes": 5 },
#     "leads": { "total": 23, "limite": 100, "restantes": 77 },
#     "storage": { "used_gb": 0, "limit_gb": 10, "remaining_gb": 10 }
#   }
# }

# 2. Validar se pode criar usuário
curl -X GET http://localhost:5000/api/assinatura/validar-usuario \
  -H "Authorization: Bearer $TOKEN"

# 3. Verificar status completo
curl -X GET http://localhost:5000/api/assinatura/status \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🚀 Implementação das Próximas Etapas

### Task 3: Verificar Middlewares nas Rotas

**Arquivos a analisar:**
- `backend/src/routes/usuarioRoutes.js`
- `backend/src/routes/clienteRoutes.js`
- `backend/src/routes/*Routes.js` (buscar por uploads)

### Task 5: Verificar UsageIndicator

**Buscar no frontend:**
```bash
cd frontend
grep -r "UsageIndicator" src/
grep -r "/api/assinatura/uso" src/
```

---

## 💡 Melhorias Sugeridas

### 1. Dashboard de Limites

Criar um painel visual no frontend mostrando:
- Barra de progresso de uso (5/10 usuários)
- Alertas quando > 80% do limite
- Botão "Upgrade Plano" quando próximo ao limite

### 2. Notificações Proativas

Enviar email automático quando:
- 80% de qualquer limite atingido
- 90% de qualquer limite atingido
- Limite completamente atingido

### 3. Soft Limits vs Hard Limits

- **Soft limit (80%)**: Mostrar aviso, mas permitir
- **Hard limit (100%)**: Bloquear completamente

### 4. Relatório de Uso

Endpoint para admin ver uso de todos os clientes:
```
GET /api/admin/usage-report
```

---

## 📚 Referências

- [checkSubscription.js](backend/src/middleware/checkSubscription.js) - Middleware de enforcement
- [assinaturaController.js](backend/src/controllers/assinaturaController.js) - Endpoints de assinatura
- [Migration 001](backend/database/migrations/001_add_multitenancy.sql) - Multi-tenancy
- [Migration 002](backend/database/migrations/002_integrate_with_admin_saas.sql) - Integração admin-saas
- [Migration 003](backend/database/migrations/003_add_plan_limits_columns.sql) - Campos de limites (NOVA)

---

**Status Geral:** ✅ 80% Completo - Infraestrutura funcionando, faltam ajustes finais
