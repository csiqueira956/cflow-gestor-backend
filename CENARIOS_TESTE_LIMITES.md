# 🧪 Cenários de Teste - Sistema de Limites

## Objetivo

Validar que o sistema de limites está funcionando corretamente em todos os cenários possíveis.

---

## 📋 Pré-requisitos

- ✅ Migration 003 aplicada no Supabase
- ✅ Backend rodando: `cd backend && npm run dev`
- ✅ Frontend rodando: `cd frontend && npm run dev`
- ✅ Token JWT válido para testes

---

## 🎯 Cenários de Teste

### Cenário 1: Visualizar Limites no Frontend ✅

**Objetivo**: Verificar se UsageIndicator mostra limites corretamente

**Passos:**
1. Acesse: http://localhost:3000
2. Faça login como admin
3. Navegue até "Minha Assinatura" ou verifique navbar

**Resultado Esperado:**
- ✅ Barras de progresso aparecem
- ✅ Valores mostrados: "X / Y usuários", "X / Y leads"
- ✅ Cores corretas:
  - Verde: < 50%
  - Amarelo: 50-74%
  - Laranja: 75-89%
  - Vermelho: ≥ 90%

**Validação:**
```javascript
// No console do navegador
localStorage.getItem('token') // Deve ter token
// Network tab → XHR → Ver chamada para /api/assinatura/uso
```

---

### Cenário 2: Bloqueio ao Criar Usuário Além do Limite ❌

**Objetivo**: Verificar bloqueio quando limite de usuários atingido

**Setup:**
```sql
-- No Supabase, configure company de teste com limite baixo
UPDATE companies
SET max_users = 2
WHERE id = 'SEU_COMPANY_ID';

-- Verifique quantos usuários já existem
SELECT COUNT(*) FROM usuarios WHERE company_id = 'SEU_COMPANY_ID';
-- Se já tem 2, pule para teste. Se tem 1, crie mais 1 primeiro.
```

**Passos:**
1. Tente criar 3º usuário via interface
2. Ou via API:

```bash
curl -X POST http://localhost:5000/api/vendedores/registrar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "nome": "Teste Bloqueio",
    "email": "bloqueio@teste.com",
    "senha": "senha123",
    "convite_id": "UUID_ADMIN"
  }'
```

**Resultado Esperado:**
```json
{
  "error": "Limite de usuários atingido",
  "message": "Você atingiu o limite de 2 usuários do plano Basic. Faça upgrade para adicionar mais usuários.",
  "current_users": 2,
  "max_users": 2
}
```

**Status HTTP:** 403 Forbidden

---

### Cenário 3: Bloqueio ao Criar Lead Além do Limite ❌

**Objetivo**: Verificar bloqueio quando limite de leads atingido

**Setup:**
```sql
-- Configure company com limite de 5 leads
UPDATE companies
SET max_leads = 5
WHERE id = 'SEU_COMPANY_ID';

-- Conte leads atuais
SELECT COUNT(*) FROM clientes WHERE company_id = 'SEU_COMPANY_ID';
```

**Passos:**
1. Crie leads até atingir o limite (5)
2. Tente criar 6º lead:

```bash
curl -X POST http://localhost:5000/api/clientes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "nome": "Lead Bloqueado",
    "cpf": "12345678901",
    "telefone_celular": "11999999999"
  }'
```

**Resultado Esperado:**
```json
{
  "error": "Limite de leads atingido",
  "message": "Você atingiu o limite de 5 leads do plano Basic. Faça upgrade para adicionar mais leads.",
  "current_leads": 5,
  "max_leads": 5
}
```

**Status HTTP:** 403 Forbidden

---

### Cenário 4: Alerta Visual Quando ≥90% do Limite ⚠️

**Objetivo**: Verificar alerta laranja quando próximo ao limite

**Setup:**
```sql
-- Configure: 10 usuários max, criar 9 (90%)
UPDATE companies SET max_users = 10 WHERE id = 'SEU_COMPANY_ID';

-- Conte usuários
SELECT COUNT(*) FROM usuarios WHERE company_id = 'SEU_COMPANY_ID';
-- Ajuste para ter exatamente 9
```

**Passos:**
1. Acesse dashboard ou página de assinatura
2. Observe UsageIndicator

**Resultado Esperado:**
- ✅ Barra de progresso LARANJA ou VERMELHA
- ✅ Alerta visível abaixo das barras:
  ```
  ⚠️ Você está próximo do limite!
  Considere fazer upgrade do seu plano para não interromper seu trabalho.
  ```
- ✅ Texto mostra: "9 / 10" com cor de alerta

---

### Cenário 5: Plano Ilimitado (Enterprise) ∞

**Objetivo**: Verificar que plano Enterprise não tem limites

**Setup:**
```sql
-- Mudar company para plano Enterprise
UPDATE companies c
SET max_users = NULL,
    max_leads = NULL,
    max_storage_gb = NULL
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
WHERE c.subscription_id = s.id
  AND c.id = 'SEU_COMPANY_ID';
```

**Passos:**
1. Verifique UsageIndicator
2. Tente criar muitos usuários (ex: 50)

**Resultado Esperado:**
- ✅ UsageIndicator mostra "∞" ou não mostra limite
- ✅ Criação de usuários/leads NÃO é bloqueada
- ✅ Nenhum alerta aparece

---

### Cenário 6: Sincronização Automática ao Mudar Plano 🔄

**Objetivo**: Verificar que limites são atualizados quando plano muda

**Setup:**
```sql
-- Company atual: Basic (10 users)
SELECT c.nome, c.max_users, p.name
FROM companies c
JOIN subscriptions s ON c.subscription_id = s.id
JOIN plans p ON s.plan_id = p.id
WHERE c.id = 'SEU_COMPANY_ID';
-- Resultado: Basic, max_users = 10
```

**Passos:**
1. Fazer upgrade para Pro:

```sql
-- Pegar ID do plano Pro
SELECT id FROM plans WHERE name = 'Pro';

-- Atualizar subscription
UPDATE subscriptions
SET plan_id = 'UUID_PLANO_PRO'
WHERE id = (SELECT subscription_id FROM companies WHERE id = 'SEU_COMPANY_ID');
```

2. Verificar se company foi atualizada automaticamente:

```sql
SELECT c.nome, c.max_users, c.max_leads, p.name
FROM companies c
JOIN subscriptions s ON c.subscription_id = s.id
JOIN plans p ON s.plan_id = p.id
WHERE c.id = 'SEU_COMPANY_ID';
```

**Resultado Esperado:**
```
| nome     | max_users | max_leads | name |
|----------|-----------|-----------|------|
| Empresa  | 50        | 500       | Pro  |
```

- ✅ max_users mudou de 10 → 50
- ✅ max_leads mudou de 100 → 500
- ✅ Trigger funcionou automaticamente

---

### Cenário 7: Validação Prévia (Endpoint /validar-usuario) ✔️

**Objetivo**: Testar endpoint de validação antes de criar usuário

**Passos:**
```bash
# Verificar se pode criar usuário
curl -X GET http://localhost:5000/api/assinatura/validar-usuario \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Resultado Esperado (OK):**
```json
{
  "success": true,
  "can_create": true,
  "message": "Pode criar novo usuário"
}
```

**Resultado Esperado (Bloqueado):**
```json
{
  "error": "Limite de usuários atingido",
  "message": "Você atingiu o limite de 10 usuários do seu plano"
}
```

**Status HTTP:** 200 (OK) ou 400 (bloqueado)

---

### Cenário 8: Cache de Performance ⚡

**Objetivo**: Verificar que cache evita queries excessivas ao banco

**Passos:**
1. Abra Network tab do navegador
2. Recarregue página 5 vezes seguidas
3. Observe chamadas para `/api/assinatura/uso`

**Resultado Esperado:**
- ✅ Primeira chamada: ~200-500ms (query no banco)
- ✅ Chamadas subsequentes (< 2min): instantâneas (cache)
- ✅ Após 2min: volta a fazer query real

**Validação Backend:**
```javascript
// Verificar logs do backend
console.log('Cache hit/miss ratio')
```

---

### Cenário 9: Super Admin Sem Restrições 👑

**Objetivo**: Verificar que super_admin não tem limites

**Setup:**
```sql
-- Criar usuário super_admin
INSERT INTO usuarios (nome, email, senha_hash, role)
VALUES ('Super Admin', 'super@admin.com', '$2a$10$...', 'super_admin');
```

**Passos:**
1. Faça login como super_admin
2. Tente criar usuários/leads sem limite

**Resultado Esperado:**
- ✅ Criação NÃO é bloqueada, mesmo excedendo limites
- ✅ Middleware detecta role e permite (`if (req.usuario?.role === 'super_admin')`)

---

### Cenário 10: Assinatura Vencida (OVERDUE) 🚫

**Objetivo**: Verificar bloqueio quando assinatura vencida

**Setup:**
```sql
-- Marcar subscription como OVERDUE
UPDATE subscriptions
SET status = 'OVERDUE'
WHERE id = (SELECT subscription_id FROM companies WHERE id = 'SEU_COMPANY_ID');
```

**Passos:**
1. Tente acessar qualquer rota protegida
2. Tente criar usuário/lead

**Resultado Esperado:**
```json
{
  "error": "Assinatura vencida",
  "status": "OVERDUE",
  "message": "Assinatura vencida. Regularize seu pagamento para continuar usando o sistema.",
  "details": {
    "data_vencimento": "2024-11-01",
    "is_overdue": true
  },
  "action_required": true
}
```

**Status HTTP:** 402 Payment Required

---

## 🔧 Script de Teste Automatizado

Execute todos os testes de uma vez:

```bash
cd backend
node scripts/teste-limites.js
```

---

## ✅ Checklist de Validação

Use este checklist após executar todos os testes:

- [ ] UsageIndicator mostra limites corretamente
- [ ] Barras de progresso com cores corretas
- [ ] Bloqueio ao exceder limite de usuários funciona
- [ ] Bloqueio ao exceder limite de leads funciona
- [ ] Alerta ≥90% aparece corretamente
- [ ] Plano ilimitado (Enterprise) não bloqueia
- [ ] Sincronização automática ao mudar plano funciona
- [ ] Endpoints de validação respondem corretamente
- [ ] Cache melhora performance
- [ ] Super admin não tem restrições
- [ ] Assinatura vencida bloqueia acesso

---

## 📊 Matriz de Testes

| Cenário | Plano | Usuários | Ação | Resultado Esperado |
|---------|-------|----------|------|--------------------|
| 1 | Basic | 5/10 | Ver dashboard | Barra verde, 50% |
| 2 | Basic | 10/10 | Criar usuário | ❌ Bloqueado |
| 3 | Basic | 9/10 | Criar usuário | ✅ Permitido |
| 4 | Basic | 90/100 leads | Ver alerta | ⚠️ Alerta laranja |
| 5 | Pro | 30/50 | Criar usuário | ✅ Permitido |
| 6 | Enterprise | 999/∞ | Criar usuário | ✅ Permitido |
| 7 | Basic | 10/10 | Upgrade → Pro | ✅ Limite = 50 |
| 8 | OVERDUE | - | Acessar | ❌ Bloqueado 402 |
| 9 | Basic | - | Super admin | ✅ Sem restrições |

---

## 🐛 Problemas Comuns e Soluções

### Problema: Bloqueio não funciona

**Diagnóstico:**
```bash
# Verificar se middleware está aplicado
grep -r "canCreateUser\|canCreateLead" backend/src/routes/

# Verificar limites no banco
SELECT c.nome, c.max_users, c.max_leads FROM companies c WHERE id = 'SEU_ID';
```

**Solução:**
- Confirme migration foi aplicada
- Verifique se limites estão definidos no banco
- Confira se middleware está na rota correta

### Problema: UsageIndicator não atualiza

**Diagnóstico:**
```bash
# Testar endpoint diretamente
curl http://localhost:5000/api/assinatura/uso -H "Authorization: Bearer TOKEN"
```

**Solução:**
- Verifique console do navegador (erros?)
- Confirme que backend está rodando
- Limpe cache do navegador

### Problema: Sincronização não funciona

**Diagnóstico:**
```sql
-- Verificar se trigger existe
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'subscriptions';
```

**Solução:**
- Re-aplique migration 003
- Verifique logs do Supabase
- Teste trigger manualmente

---

## 📞 Suporte

Se algum teste falhar:
1. Verifique migration foi aplicada: `node scripts/verificar-migration-003.js`
2. Consulte logs do backend
3. Verifique banco de dados diretamente
4. Revise documentação: [ANALISE_SISTEMA_LIMITES.md](ANALISE_SISTEMA_LIMITES.md)

---

**Após todos os testes passarem, o sistema está 100% validado! ✅**
