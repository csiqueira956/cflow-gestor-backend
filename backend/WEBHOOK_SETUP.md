# Guia de Configuração de Webhooks Asaas

## 📋 Resumo da Implementação

O sistema de webhooks foi implementado para automatizar o processamento de pagamentos do Asaas, incluindo:

- ✅ Confirmação automática de pagamentos
- ✅ Renovação automática de assinaturas
- ✅ Notificações de vencimento e atraso
- ✅ Registro completo de eventos (audit trail)
- ✅ Reprocessamento de webhooks que falharam
- ✅ Painel administrativo para visualizar logs

---

## 🗄️ Estrutura do Banco de Dados

### Novas Tabelas Criadas

1. **webhook_events** - Registra todos os eventos recebidos
2. **pagamentos** - Histórico de pagamentos das assinaturas

Execute os scripts SQL na ordem:

```bash
# 1. Criar tabela de eventos de webhook
psql -U seu_usuario -d seu_banco -f backend/database/add-webhook-events-table.sql

# 2. Criar tabela de pagamentos
psql -U seu_usuario -d seu_banco -f backend/database/add-pagamentos-table.sql
```

---

## 🔧 Configuração do Backend

### 1. Variáveis de Ambiente

Adicione ao seu `.env`:

```env
# Token de validação do webhook (opcional mas recomendado)
ASAAS_WEBHOOK_TOKEN=seu_token_secreto_aqui
```

### 2. Endpoint do Webhook

O webhook está disponível em:
```
POST https://seu-dominio.com/api/webhooks/asaas
```

**IMPORTANTE:** Esta rota é pública (não requer autenticação) pois é chamada pelo Asaas.

---

## 🌐 Configuração no Painel do Asaas

### Passo 1: Acessar Configurações de Webhook

1. Faça login no painel do Asaas
2. Vá em **Configurações** → **Integrações** → **Webhooks**
3. Clique em **+ Novo Webhook**

### Passo 2: Configurar URL e Eventos

Configure os seguintes campos:

**URL do Webhook:**
```
https://seu-dominio-backend.com/api/webhooks/asaas
```

**Eventos a serem monitorados:**
- ✅ `PAYMENT_CONFIRMED` - Pagamento confirmado
- ✅ `PAYMENT_RECEIVED` - Pagamento recebido
- ✅ `PAYMENT_OVERDUE` - Pagamento vencido
- ✅ `SUBSCRIPTION_CANCELLED` - Assinatura cancelada

**Token de Autenticação (Opcional):**
```
seu_token_secreto_aqui
```
Este deve ser o mesmo valor definido em `ASAAS_WEBHOOK_TOKEN`.

### Passo 3: Envio de Teste

O Asaas permite enviar um webhook de teste. Use esta funcionalidade para verificar se a URL está acessível.

---

## 🧪 Testando os Webhooks

### Teste Manual com cURL

Você pode simular um webhook do Asaas:

```bash
curl -X POST https://seu-dominio.com/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: seu_token_secreto_aqui" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_123456789",
      "value": 99.90,
      "billingType": "CREDIT_CARD",
      "status": "CONFIRMED",
      "externalReference": "1",
      "paymentDate": "2024-01-15",
      "confirmedDate": "2024-01-15T10:30:00.000Z",
      "invoiceUrl": "https://www.asaas.com/i/123456"
    }
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Webhook processado",
  "event_id": "PAYMENT_CONFIRMED_1705316400000"
}
```

### Validando o Processamento

Após enviar o webhook, verifique:

1. **No banco de dados:**
```sql
-- Verificar evento registrado
SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 1;

-- Verificar pagamento criado
SELECT * FROM pagamentos ORDER BY created_at DESC LIMIT 1;

-- Verificar assinatura atualizada
SELECT status, data_vencimento FROM assinaturas WHERE company_id = 1;

-- Verificar notificação criada
SELECT * FROM notifications WHERE company_id = 1 ORDER BY created_at DESC LIMIT 1;
```

2. **No painel administrativo:**
   - Acesse o Admin SaaS
   - Clique no botão **"Logs Webhook"**
   - Verifique se o evento aparece na lista
   - Status deve ser **"Processado"**

---

## 📊 Funcionalidades do Painel Admin

### Visualizar Logs de Webhook

1. Acesse o painel administrativo (Admin SaaS)
2. Clique no botão **"Logs Webhook"** no header
3. Visualize todos os webhooks recebidos com:
   - Tipo de evento
   - Status (Processado, Falhou, Pendente)
   - Empresa relacionada
   - Data de recebimento
   - Mensagens de erro (se houver)

### Filtrar Logs

Use os filtros disponíveis:
- **Status:** Todos, Processado, Falhou, Pendente
- **Tipo de Evento:** Todos, PAYMENT_CONFIRMED, PAYMENT_RECEIVED, etc.

### Visualizar Payload Completo

Clique em **"Ver Payload"** para inspecionar o JSON completo recebido do Asaas.

### Reprocessar Webhooks que Falharam

Se um webhook falhou, você pode reprocessá-lo:
1. Localize o webhook com status **"Falhou"**
2. Clique em **"Reprocessar"**
3. O sistema tentará processar novamente

---

## 🔄 Fluxo de Processamento

### PAYMENT_CONFIRMED / PAYMENT_RECEIVED

1. ✅ Registra evento na tabela `webhook_events`
2. ✅ Busca empresa pelo `externalReference`
3. ✅ Atualiza status da assinatura para `ACTIVE`
4. ✅ Define nova data de vencimento (+30 dias)
5. ✅ Registra pagamento na tabela `pagamentos`
6. ✅ Cria notificação para o cliente

### PAYMENT_OVERDUE

1. ✅ Registra evento na tabela `webhook_events`
2. ✅ Atualiza status da assinatura para `OVERDUE`
3. ✅ Cria notificação de urgência para o cliente

### SUBSCRIPTION_CANCELLED

1. ✅ Registra evento na tabela `webhook_events`
2. ✅ Atualiza status da assinatura para `CANCELLED`
3. ✅ Limpa ID de assinatura do Asaas
4. ✅ Cria notificação informando o cancelamento

---

## 🛡️ Segurança

### Validação de Token

O sistema valida o token enviado pelo Asaas de duas formas:

1. **Header:** `asaas-access-token`
2. **Query param:** `?access_token=...`

Se `ASAAS_WEBHOOK_TOKEN` estiver configurado, o webhook será rejeitado com `401 Unauthorized` se o token não corresponder.

### Prevenção de Duplicação

O sistema verifica se já existe um webhook com o mesmo `event_id` antes de processar, evitando duplicações.

### Tratamento de Erros

- Todos os erros são capturados e registrados
- Webhooks que falharem ficam com status `failed`
- A mensagem de erro é armazenada para debugging
- Sistema retorna `200 OK` mesmo em erros para não fazer o Asaas retentar indefinidamente

---

## 📝 Logs e Monitoramento

### Logs do Backend

O backend imprime logs detalhados no console:

```
🔔 ========== WEBHOOK ASAAS RECEBIDO ==========
Event Type: PAYMENT_CONFIRMED
Payload: {...}
💳 Processando pagamento confirmado: pay_123456789
✅ Pagamento processado para Empresa XYZ
✅ Webhook processado com sucesso
========================================
```

### Visualização no Admin

Todos os webhooks são salvos no banco e podem ser visualizados no painel admin em tempo real.

---

## 🔍 Troubleshooting

### Webhook não está sendo recebido

1. Verifique se a URL está acessível publicamente
2. Teste com cURL do próprio servidor Asaas
3. Verifique se há firewall bloqueando
4. Confirme que a rota `/api/webhooks/asaas` está registrada

### Webhook recebido mas status "failed"

1. Acesse o painel admin → Logs Webhook
2. Clique no webhook com erro
3. Veja a mensagem de erro
4. Corrija o problema
5. Clique em "Reprocessar"

### Assinatura não foi atualizada

1. Verifique se o `externalReference` no pagamento corresponde ao `company_id`
2. Confirme que a empresa existe no banco
3. Verifique logs do backend para ver detalhes do erro

### Notificação não aparece para o cliente

1. Verifique se a notificação foi criada na tabela `notifications`
2. Confirme que o `company_id` está correto
3. Verifique se o cliente está logado e o sistema de notificações está funcionando

---

## 🎯 Próximos Passos Recomendados

### 1. Configurar HTTPS

Webhooks devem sempre usar HTTPS em produção:
```bash
# Usando Certbot (Let's Encrypt)
sudo certbot --nginx -d seu-dominio.com
```

### 2. Monitoramento Automático

Configure alertas para webhooks que falharem:
- Email para admin quando webhook falha
- Slack/Discord notification
- Dashboard de métricas (sucessos vs falhas)

### 3. Rate Limiting

Adicione rate limiting para proteger contra ataques:
```javascript
import rateLimit from 'express-rate-limit';

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100 // máximo 100 requests por minuto
});

router.post('/asaas', webhookLimiter, receberWebhookAsaas);
```

### 4. Retry Automático

Implemente retry automático para webhooks que falharam:
```javascript
// Cron job que roda a cada hora
cron.schedule('0 * * * *', async () => {
  const failedWebhooks = await buscarWebhooksFalhados();
  for (const webhook of failedWebhooks) {
    await reprocessarWebhook(webhook.id);
  }
});
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do backend
2. Acesse o painel admin → Logs Webhook
3. Revise este guia
4. Consulte a documentação do Asaas: https://docs.asaas.com/reference/webhooks

---

## ✅ Checklist de Implementação

- [ ] Executar migrations do banco de dados
- [ ] Configurar `ASAAS_WEBHOOK_TOKEN` no `.env`
- [ ] Registrar webhook no painel do Asaas
- [ ] Testar com webhook de teste do Asaas
- [ ] Testar com cURL manual
- [ ] Verificar logs no painel admin
- [ ] Confirmar que assinatura foi atualizada
- [ ] Confirmar que pagamento foi registrado
- [ ] Confirmar que notificação foi criada
- [ ] Testar reprocessamento de webhook falho
- [ ] Configurar HTTPS em produção
- [ ] Adicionar monitoramento (opcional)

---

**Sistema de Webhooks Asaas - Implementado com sucesso! 🎉**
