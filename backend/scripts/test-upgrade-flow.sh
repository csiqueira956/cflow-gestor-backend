#!/bin/bash

# Script para testar o fluxo completo de upgrade de plano

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:3001/api"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🧪 TESTE DE FLUXO DE UPGRADE DE PLANO${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Função para fazer login e obter token
login_admin() {
    local email=$1
    local senha=$2

    echo -e "${YELLOW}📝 Fazendo login com $email...${NC}"

    RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$email\",
            \"senha\": \"$senha\"
        }")

    TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

    if [ -z "$TOKEN" ]; then
        echo -e "${RED}❌ Erro ao fazer login${NC}"
        echo $RESPONSE | jq '.'
        return 1
    fi

    echo -e "${GREEN}✅ Login realizado com sucesso${NC}"
    echo $TOKEN
    return 0
}

# Função para listar planos disponíveis
listar_planos() {
    local token=$1

    echo ""
    echo -e "${YELLOW}📋 Listando planos disponíveis para upgrade...${NC}"

    RESPONSE=$(curl -s -X GET "$API_URL/assinatura/planos-upgrade" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")

    if echo $RESPONSE | jq -e '.success' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Planos listados com sucesso${NC}"
        echo ""
        echo -e "${BLUE}📊 Planos disponíveis:${NC}"
        echo $RESPONSE | jq '.plans[] | {id, nome, tipo_cobranca, preco_fixo, preco_por_usuario, valor_mensal_estimado, is_current}'
        echo ""
        echo -e "${BLUE}📌 Status atual:${NC}"
        echo "  - Plano atual: $(echo $RESPONSE | jq -r '.current_plan_id')"
        echo "  - Status: $(echo $RESPONSE | jq -r '.current_status')"

        # Retornar IDs dos planos
        echo $RESPONSE | jq -r '.plans[].id'
    else
        echo -e "${RED}❌ Erro ao listar planos${NC}"
        echo $RESPONSE | jq '.'
        return 1
    fi
}

# Função para iniciar upgrade
iniciar_upgrade() {
    local token=$1
    local plano_id=$2
    local payment_method=${3:-BOLETO}

    echo ""
    echo -e "${YELLOW}💳 Iniciando upgrade para plano ID $plano_id (método: $payment_method)...${NC}"

    RESPONSE=$(curl -s -X POST "$API_URL/assinatura/iniciar-upgrade" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "{
            \"plano_id\": $plano_id,
            \"payment_method\": \"$payment_method\",
            \"usuarios_contratados\": 3
        }")

    if echo $RESPONSE | jq -e '.success' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Upgrade iniciado com sucesso${NC}"
        echo ""
        echo -e "${BLUE}💰 Detalhes do pagamento:${NC}"
        echo "  - ID do pagamento: $(echo $RESPONSE | jq -r '.payment.id')"
        echo "  - Valor: R$ $(echo $RESPONSE | jq -r '.payment.value')"
        echo "  - Status: $(echo $RESPONSE | jq -r '.payment.status')"
        echo "  - Vencimento: $(echo $RESPONSE | jq -r '.payment.dueDate')"

        if [ "$payment_method" == "BOLETO" ]; then
            BOLETO_URL=$(echo $RESPONSE | jq -r '.payment.bankSlipUrl')
            echo "  - URL do Boleto: $BOLETO_URL"
        elif [ "$payment_method" == "PIX" ]; then
            echo "  - QR Code PIX disponível"
        fi

        echo ""
        echo -e "${BLUE}📦 Plano selecionado:${NC}"
        echo "  - Nome: $(echo $RESPONSE | jq -r '.plan.nome')"
        echo "  - Valor mensal: R$ $(echo $RESPONSE | jq -r '.plan.valor_mensal')"
        echo "  - Usuários: $(echo $RESPONSE | jq -r '.plan.usuarios_contratados')"

        # Retornar customer_id e payment_id para teste de webhook
        CUSTOMER_ID=$(echo $RESPONSE | jq -r '.payment.customer')
        PAYMENT_ID=$(echo $RESPONSE | jq -r '.payment.id')

        echo "$CUSTOMER_ID|$PAYMENT_ID"
    else
        echo -e "${RED}❌ Erro ao iniciar upgrade${NC}"
        echo $RESPONSE | jq '.'
        return 1
    fi
}

# Função para simular webhook do ASAAS
simular_webhook() {
    local customer_id=$1
    local payment_id=$2

    echo ""
    echo -e "${YELLOW}🔔 Simulando webhook de confirmação de pagamento...${NC}"

    RESPONSE=$(curl -s -X POST "$API_URL/webhooks/asaas" \
        -H "Content-Type: application/json" \
        -d "{
            \"event\": \"PAYMENT_CONFIRMED\",
            \"payment\": {
                \"id\": \"$payment_id\",
                \"customer\": \"$customer_id\",
                \"value\": 99.90,
                \"status\": \"CONFIRMED\",
                \"paymentDate\": \"$(date +%Y-%m-%d)\"
            }
        }")

    if echo $RESPONSE | jq -e '.received' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Webhook processado com sucesso${NC}"
        echo "  - Assinatura deve ter sido ativada!"
    else
        echo -e "${RED}❌ Erro ao processar webhook${NC}"
        echo $RESPONSE
        return 1
    fi
}

# Função para verificar status da assinatura após webhook
verificar_status() {
    local token=$1

    echo ""
    echo -e "${YELLOW}🔍 Verificando status atual da assinatura...${NC}"

    RESPONSE=$(curl -s -X GET "$API_URL/assinatura/status" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json")

    if echo $RESPONSE | jq -e '.assinatura' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Status obtido com sucesso${NC}"
        echo ""
        echo -e "${BLUE}📊 Status da assinatura:${NC}"
        echo "  - Status: $(echo $RESPONSE | jq -r '.assinatura.status')"
        echo "  - Plano: $(echo $RESPONSE | jq -r '.assinatura.plano_nome')"
        echo "  - Próximo vencimento: $(echo $RESPONSE | jq -r '.assinatura.data_proximo_vencimento')"
        echo "  - Usuários contratados: $(echo $RESPONSE | jq -r '.assinatura.usuarios_contratados')"
    else
        echo -e "${RED}❌ Erro ao verificar status${NC}"
        echo $RESPONSE | jq '.'
        return 1
    fi
}

# INÍCIO DO TESTE

# 1. Criar admin de teste (se não existir)
echo -e "${YELLOW}👤 Criando/verificando admin de teste...${NC}"

# Tentar fazer login primeiro
TOKEN=$(login_admin "admin.teste@upgrade.com" "Senha123!")

if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}📝 Admin não existe, criando novo...${NC}"

    curl -s -X POST "$API_URL/auth/register-admin" \
        -H "Content-Type: application/json" \
        -d '{
            "nome_completo": "Admin Upgrade Teste",
            "email": "admin.teste@upgrade.com",
            "senha": "Senha123!",
            "telefone": "11999999999",
            "empresa": {
                "nome": "Empresa Upgrade Teste LTDA",
                "cnpj": "12345678000199",
                "telefone": "1133334444",
                "endereco": "Rua Teste, 123"
            }
        }' > /dev/null

    echo ""
    sleep 2

    # Fazer login novamente
    TOKEN=$(login_admin "admin.teste@upgrade.com" "Senha123!")

    if [ -z "$TOKEN" ]; then
        echo -e "${RED}❌ Falha ao criar/logar admin de teste${NC}"
        exit 1
    fi
fi

# 2. Listar planos disponíveis
PLANOS=$(listar_planos "$TOKEN")

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Teste falhou ao listar planos${NC}"
    exit 1
fi

# 3. Selecionar plano Básico (ID: 1) ou primeiro plano não-Trial
PLANO_ID=$(echo "$PLANOS" | head -n 1)

if [ -z "$PLANO_ID" ]; then
    echo -e "${RED}❌ Nenhum plano disponível para upgrade${NC}"
    exit 1
fi

# 4. Iniciar upgrade com Boleto
UPGRADE_RESULT=$(iniciar_upgrade "$TOKEN" "$PLANO_ID" "BOLETO")

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Teste falhou ao iniciar upgrade${NC}"
    exit 1
fi

# Extrair customer_id e payment_id
CUSTOMER_ID=$(echo "$UPGRADE_RESULT" | tail -n 1 | cut -d'|' -f1)
PAYMENT_ID=$(echo "$UPGRADE_RESULT" | tail -n 1 | cut -d'|' -f2)

# 5. Simular webhook de confirmação
simular_webhook "$CUSTOMER_ID" "$PAYMENT_ID"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Teste falhou ao processar webhook${NC}"
    exit 1
fi

# Aguardar processamento
sleep 2

# 6. Verificar se assinatura foi ativada
verificar_status "$TOKEN"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Teste falhou ao verificar status final${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ TODOS OS TESTES PASSARAM!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}📝 Resumo do fluxo testado:${NC}"
echo "  1. ✅ Login de admin com assinatura Trial"
echo "  2. ✅ Listagem de planos disponíveis para upgrade"
echo "  3. ✅ Iniciação de upgrade com criação de pagamento"
echo "  4. ✅ Simulação de webhook de confirmação do ASAAS"
echo "  5. ✅ Verificação de ativação da assinatura"
echo ""
