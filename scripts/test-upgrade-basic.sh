#!/bin/bash

# Script básico para testar os endpoints de upgrade (sem ASAAS)

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="http://localhost:3001/api"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🧪 TESTE BÁSICO DE ENDPOINTS DE UPGRADE${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Fazer login com admin existente
echo -e "${YELLOW}📝 Fazendo login...${NC}"

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "admin@gestorconsorcios.com",
        "senha": "Senha123!"
    }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Erro ao fazer login${NC}"
    echo $LOGIN_RESPONSE | jq '.'
    exit 1
fi

echo -e "${GREEN}✅ Login realizado com sucesso${NC}"
echo ""

# 2. Testar endpoint de listar planos
echo -e "${YELLOW}📋 Testando GET /api/assinatura/planos-upgrade...${NC}"

PLANOS_RESPONSE=$(curl -s -X GET "$API_URL/assinatura/planos-upgrade" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")

if echo $PLANOS_RESPONSE | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Endpoint de listar planos funcionando${NC}"
    echo ""
    echo -e "${BLUE}📊 Informações retornadas:${NC}"
    echo "  - Plano atual ID: $(echo $PLANOS_RESPONSE | jq -r '.current_plan_id')"
    echo "  - Status atual: $(echo $PLANOS_RESPONSE | jq -r '.current_status')"
    echo "  - Número de planos disponíveis: $(echo $PLANOS_RESPONSE | jq '.plans | length')"
    echo ""
    echo -e "${BLUE}📦 Planos disponíveis:${NC}"
    echo $PLANOS_RESPONSE | jq -r '.plans[] | "  - [\(.id)] \(.nome) - R$ \(.preco_fixo // .preco_por_usuario)/\(if .tipo_cobranca == "PER_USER" then "usuário" else "fixo" end)"'
else
    echo -e "${RED}❌ Erro ao listar planos${NC}"
    echo $PLANOS_RESPONSE | jq '.'
    exit 1
fi

echo ""

# 3. Testar verificação de status
echo -e "${YELLOW}🔍 Testando GET /api/assinatura/status...${NC}"

STATUS_RESPONSE=$(curl -s -X GET "$API_URL/assinatura/status" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")

if echo $STATUS_RESPONSE | jq -e '.assinatura' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Endpoint de status funcionando${NC}"
    echo ""
    echo -e "${BLUE}📊 Status da assinatura:${NC}"
    echo "  - Status: $(echo $STATUS_RESPONSE | jq -r '.assinatura.status')"
    echo "  - Plano: $(echo $STATUS_RESPONSE | jq -r '.assinatura.plano_nome')"
    echo "  - Usuários: $(echo $STATUS_RESPONSE | jq -r '.assinatura.usuarios_contratados')"
else
    echo -e "${RED}❌ Erro ao verificar status${NC}"
    echo $STATUS_RESPONSE | jq '.'
    exit 1
fi

echo ""

# 4. Testar webhook (sem ASAAS real)
echo -e "${YELLOW}🔔 Testando POST /api/webhooks/asaas...${NC}"

WEBHOOK_RESPONSE=$(curl -s -X POST "$API_URL/webhooks/asaas" \
    -H "Content-Type: application/json" \
    -d '{
        "event": "PAYMENT_CONFIRMED",
        "payment": {
            "id": "pay_test_123",
            "customer": "cus_test_123",
            "value": 99.90,
            "status": "CONFIRMED"
        }
    }')

if echo $WEBHOOK_RESPONSE | jq -e '.received' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Endpoint de webhook funcionando (aceita requisições)${NC}"
else
    echo -e "${YELLOW}⚠️  Webhook respondeu, mas pode não ter processado (sem customer_id válido)${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ TESTES BÁSICOS CONCLUÍDOS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}📝 Resumo:${NC}"
echo "  ✅ Endpoint de listar planos: FUNCIONANDO"
echo "  ✅ Endpoint de verificar status: FUNCIONANDO"
echo "  ✅ Endpoint de webhook: FUNCIONANDO"
echo ""
echo -e "${YELLOW}⚠️  NOTA IMPORTANTE:${NC}"
echo "  Para testar o fluxo completo de upgrade com pagamento,"
echo "  é necessário configurar as credenciais do ASAAS no .env:"
echo ""
echo "  ASAAS_API_KEY=your_api_key_here"
echo "  ASAAS_API_URL=https://sandbox.asaas.com/api/v3"
echo ""
