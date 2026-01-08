# Sistema de Upgrade e Pagamento de Planos

## Visão Geral

Sistema completo implementado para permitir que usuários escolham um plano e iniciem o pagamento através do gateway ASAAS.

## Arquivos Criados/Modificados

### 1. Serviço ASAAS
**Arquivo**: `src/services/asaasService.js`

Integração completa com o gateway de pagamento ASAAS:
- `createOrGetCustomer()` - Criar/buscar cliente no ASAAS
- `createPayment()` - Criar cobrança única (Boleto)
- `createPixPayment()` - Criar cobrança PIX
- `checkPaymentStatus()` - Verificar status de pagamento
- `createSubscription()` - Criar assinatura recorrente
- `cancelSubscription()` - Cancelar assinatura
- `getSubscriptionPayments()` - Listar pagamentos

### 2. Controllers de Assinatura
**Arquivo**: `src/controllers/assinaturaController.js`

Três novas funções adicionadas:

#### a) `getPlansForUpgrade()`
- Endpoint: `GET /api/assinatura/planos-upgrade`
- Descrição: Lista planos disponíveis para upgrade
- Retorna:
  - Plano atual do usuário
  - Status da assinatura
  - Lista de planos (exceto Trial)
  - Valor mensal estimado para cada plano

#### b) `initiateUpgrade()`
- Endpoint: `POST /api/assinatura/iniciar-upgrade`
- Descrição: Inicia processo de upgrade com pagamento
- Parâmetros:
  ```json
  {
    "plano_id": 1,
    "payment_method": "BOLETO",  // ou "PIX"
    "usuarios_contratados": 3
  }
  ```
- Retorna:
  - Dados do pagamento (ID, URL do boleto, QR code PIX)
  - Detalhes do plano selecionado
  - Valor mensal

#### c) `asaasWebhook()`
- Endpoint: `POST /api/webhooks/asaas`
- Descrição: Recebe confirmação de pagamento do ASAAS
- Processa eventos:
  - `PAYMENT_RECEIVED`
  - `PAYMENT_CONFIRMED`
- Ação: Atualiza status da assinatura de TRIAL → ACTIVE

### 3. Rotas de Assinatura
**Arquivo**: `src/routes/assinaturaRoutes.js`

Novas rotas adicionadas:
```javascript
GET  /api/assinatura/planos-upgrade    // Listar planos
POST /api/assinatura/iniciar-upgrade   // Iniciar upgrade
```

### 4. Rotas de Webhook
**Arquivo**: `src/routes/webhookRoutes.js` (NOVO)

Nova rota criada:
```javascript
POST /api/webhooks/asaas  // Webhook ASAAS (sem autenticação)
```

### 5. Registro de Rotas
**Arquivo**: `src/index.js`

Webhook registrado:
```javascript
app.use('/api/webhooks', webhookRoutes);
```

## Fluxo de Uso

### 1. Usuário Consulta Planos Disponíveis

```bash
curl -X GET http://localhost:3001/api/assinatura/planos-upgrade \
  -H "Authorization: Bearer {token}"
```

Resposta:
```json
{
  "success": true,
  "current_plan_id": 4,
  "current_status": "TRIAL",
  "plans": [
    {
      "id": 1,
      "nome": "Básico",
      "tipo_cobranca": "FIXED",
      "preco_fixo": 99.9,
      "max_usuarios": 5,
      "max_leads": 1000,
      "valor_mensal_estimado": 99.9,
      "is_current": false
    }
  ]
}
```

### 2. Usuário Inicia Upgrade

```bash
curl -X POST http://localhost:3001/api/assinatura/iniciar-upgrade \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "plano_id": 1,
    "payment_method": "BOLETO",
    "usuarios_contratados": 3
  }'
```

Resposta:
```json
{
  "success": true,
  "message": "Upgrade iniciado! Complete o pagamento para ativar.",
  "payment": {
    "id": "pay_xxx",
    "status": "PENDING",
    "value": 99.9,
    "dueDate": "2025-11-22",
    "bankSlipUrl": "https://www.asaas.com/boleto/xxx"
  },
  "plan": {
    "id": 1,
    "nome": "Básico",
    "valor_mensal": 99.9,
    "usuarios_contratados": 3
  }
}
```

### 3. ASAAS Envia Confirmação de Pagamento

Quando o pagamento é confirmado, ASAAS automaticamente envia:

```bash
POST http://localhost:3001/api/webhooks/asaas
Content-Type: application/json

{
  "event": "PAYMENT_CONFIRMED",
  "payment": {
    "id": "pay_xxx",
    "customer": "cus_xxx",
    "value": 99.9,
    "status": "CONFIRMED",
    "paymentDate": "2025-11-20"
  }
}
```

O sistema automaticamente:
1. Localiza a assinatura pelo `customer_id`
2. Atualiza status de `TRIAL` → `ACTIVE`
3. Define próxima data de vencimento (+1 mês)

## Configuração Necessária

### Variáveis de Ambiente

Adicionar ao arquivo `.env`:

```env
# ASAAS Payment Gateway
ASAAS_API_KEY=your_api_key_here
ASAAS_API_URL=https://sandbox.asaas.com/api/v3

# Para produção, usar:
# ASAAS_API_URL=https://api.asaas.com/v3
```

### Como Obter Credenciais ASAAS

1. Cadastrar em https://www.asaas.com
2. Acessar "Minha Conta" > "Integrações" > "API"
3. Copiar a "Chave de API"
4. Configurar webhook em "Integrações" > "Webhooks":
   - URL: `https://seu-dominio.com/api/webhooks/asaas`
   - Eventos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`

## Segurança

- ✅ Rotas de assinatura protegidas com JWT
- ✅ Webhook SEM autenticação (chamado pelo ASAAS)
- ✅ Rate limiting global aplicado
- ✅ Validação de company_id para isolamento de dados
- ✅ Cálculo de preços server-side
- ✅ Validação de plano válido antes de upgrade

## Planos Disponíveis (Banco de Dados)

| ID | Nome | Tipo | Preço |
|----|------|------|-------|
| 1 | Básico | FIXED | R$ 99,90/mês |
| 2 | Profissional | FIXED | R$ 299,90/mês |
| 3 | Empresarial | PER_USER | R$ 42,90/usuário |
| 4 | Trial | FIXED | R$ 0,00 (14 dias) |

## Status de Implementação

✅ **COMPLETO** - Sistema pronto para uso

- [x] Serviço ASAAS criado
- [x] Endpoint de listagem de planos
- [x] Endpoint de iniciar upgrade
- [x] Webhook de confirmação de pagamento
- [x] Integração com gateway ASAAS
- [x] Suporte a Boleto e PIX
- [x] Ativação automática via webhook
- [x] Documentação completa

## Próximos Passos (Frontend)

1. Criar tela de seleção de planos
2. Exibir comparação de features
3. Mostrar dados de pagamento (boleto/PIX)
4. Feedback de confirmação após pagamento
5. Notificar usuário quando assinatura for ativada

## Testando sem ASAAS (Desenvolvimento)

Para testar localmente sem configurar ASAAS:

```bash
# 1. Listar planos (funciona sem ASAAS)
curl -X GET http://localhost:3001/api/assinatura/planos-upgrade \
  -H "Authorization: Bearer {token}"

# 2. Simular webhook de pagamento
curl -X POST http://localhost:3001/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_test_123",
      "customer": "cus_xxx",  # Usar customer_id real da assinatura
      "value": 99.90,
      "status": "CONFIRMED"
    }
  }'
```

---

**Data de Implementação**: 19/11/2025
**Autor**: Sistema de Upgrade e Pagamento - CFlow Gestor
