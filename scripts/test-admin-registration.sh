#!/bin/bash

# Script de Teste: Registro Automático de Admin com Empresa
# Testa se ao criar admin, a empresa é criada automaticamente

echo "🧪 TESTE: REGISTRO AUTOMÁTICO DE ADMIN + EMPRESA"
echo "================================================================================"
echo ""

API_URL="http://localhost:3001"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar
test_admin_registration() {
  local test_name=$1
  local email=$2
  local empresa_nome=$3

  echo -e "${YELLOW}📝 Teste: $test_name${NC}"
  echo ""

  # Criar admin
  echo "1️⃣  Criando admin com empresa..."
  RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"nome\": \"Admin Teste\",
      \"email\": \"$email\",
      \"senha\": \"senha123\",
      \"role\": \"admin\",
      \"empresa_nome\": \"$empresa_nome\",
      \"empresa_email\": \"contato@$empresa_nome.com\",
      \"empresa_telefone\": \"(11) 98765-4321\"
    }")

  # Verificar resposta
  if echo "$RESPONSE" | grep -q "Admin e empresa criados com sucesso"; then
    echo -e "   ${GREEN}✅ Admin e empresa criados${NC}"

    # Extrair IDs
    USUARIO_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    COMPANY_ID=$(echo "$RESPONSE" | grep -o '"company_id":[0-9]*' | cut -d':' -f2)

    echo "   👤 Usuário ID: $USUARIO_ID"
    echo "   🏢 Empresa ID: $COMPANY_ID"
    echo ""

    # Verificar no banco
    echo "2️⃣  Verificando no banco de dados..."

    # Verificar usuário
    USER_CHECK=$(sqlite3 database/gestor-consorcios.db "SELECT id, nome, email, role, company_id FROM usuarios WHERE id = $USUARIO_ID;")
    echo "   Usuário: $USER_CHECK"

    # Verificar empresa
    COMPANY_CHECK=$(sqlite3 database/gestor-consorcios.db "SELECT id, nome, email FROM empresas WHERE id = $COMPANY_ID;")
    echo "   Empresa: $COMPANY_CHECK"

    # Verificar assinatura
    SUBSCRIPTION_CHECK=$(sqlite3 database/gestor-consorcios.db "SELECT company_id, plano_id, status FROM assinaturas WHERE company_id = $COMPANY_ID;")
    echo "   Assinatura: $SUBSCRIPTION_CHECK"
    echo ""

    if [ -n "$SUBSCRIPTION_CHECK" ]; then
      echo -e "   ${GREEN}✅ Assinatura trial criada automaticamente${NC}"
    else
      echo -e "   ${RED}❌ Assinatura NÃO foi criada${NC}"
    fi

    echo ""

    # Login do admin
    echo "3️⃣  Testando login do admin..."
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$email\",
        \"senha\": \"senha123\"
      }")

    if echo "$LOGIN_RESPONSE" | grep -q "token"; then
      echo -e "   ${GREEN}✅ Login bem-sucedido${NC}"

      # Extrair token
      TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

      # Testar isolamento - listar equipes (deve estar vazio)
      echo ""
      echo "4️⃣  Testando isolamento de dados..."
      EQUIPES=$(curl -s -X GET "$API_URL/api/equipes" \
        -H "Authorization: Bearer $TOKEN")

      echo "   Equipes visíveis: $EQUIPES"

      if echo "$EQUIPES" | grep -q '"equipes":\[\]'; then
        echo -e "   ${GREEN}✅ Isolamento OK - Empresa nova sem dados${NC}"
      else
        echo -e "   ${RED}❌ ERRO - Empresa vendo dados de outras empresas!${NC}"
      fi

    else
      echo -e "   ${RED}❌ Login falhou${NC}"
      echo "   Resposta: $LOGIN_RESPONSE"
    fi

  else
    echo -e "   ${RED}❌ Falha ao criar admin${NC}"
    echo "   Resposta: $RESPONSE"
  fi

  echo ""
  echo "─────────────────────────────────────────────────────────────────────────────"
  echo ""
}

# Teste 1: Admin básico
test_admin_registration \
  "Criar admin com empresa (completo)" \
  "teste1@empresa.com" \
  "Empresa Teste 1"

# Teste 2: Admin com dados mínimos
echo -e "${YELLOW}📝 Teste 2: Admin com dados mínimos (sem empresa_email)${NC}"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Admin Teste 2",
    "email": "teste2@empresa.com",
    "senha": "senha123",
    "role": "admin",
    "empresa_nome": "Empresa Teste 2"
  }')

if echo "$RESPONSE" | grep -q "Admin e empresa criados com sucesso"; then
  echo -e "   ${GREEN}✅ Admin criado com dados mínimos${NC}"
  echo "   (empresa_email foi preenchido com email do admin)"
else
  echo -e "   ${RED}❌ Falha${NC}"
  echo "   $RESPONSE"
fi

echo ""
echo "─────────────────────────────────────────────────────────────────────────────"
echo ""

# Teste 3: Erro - Admin sem empresa_nome
echo -e "${YELLOW}📝 Teste 3: ERRO ESPERADO - Admin sem empresa_nome${NC}"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Admin Teste 3",
    "email": "teste3@empresa.com",
    "senha": "senha123",
    "role": "admin"
  }')

if echo "$RESPONSE" | grep -q "é necessário informar o nome da empresa"; then
  echo -e "   ${GREEN}✅ Erro correto - Exigiu empresa_nome${NC}"
else
  echo -e "   ${RED}❌ ERRO - Deveria ter exigido empresa_nome${NC}"
  echo "   $RESPONSE"
fi

echo ""
echo "─────────────────────────────────────────────────────────────────────────────"
echo ""

# Teste 4: Verificar isolamento entre empresas
echo -e "${YELLOW}📝 Teste 4: Verificar isolamento entre múltiplas empresas${NC}"
echo ""

echo "Verificando quantas empresas existem agora..."
EMPRESAS_COUNT=$(sqlite3 database/gestor-consorcios.db "SELECT COUNT(*) FROM empresas;")
echo "Total de empresas: $EMPRESAS_COUNT"

if [ "$EMPRESAS_COUNT" -ge 2 ]; then
  echo ""
  echo "Listando empresas e seus admins:"
  sqlite3 database/gestor-consorcios.db "
    SELECT
      e.id as empresa_id,
      e.nome as empresa,
      u.id as admin_id,
      u.nome as admin,
      u.email
    FROM empresas e
    LEFT JOIN usuarios u ON u.company_id = e.id AND u.role = 'admin'
    ORDER BY e.id;
  " | while IFS='|' read -r emp_id emp_nome admin_id admin_nome email; do
    echo "   🏢 Empresa $emp_id: $emp_nome"
    echo "      👤 Admin $admin_id: $admin_nome ($email)"
  done

  echo ""
  echo -e "${GREEN}✅ Múltiplas empresas criadas com sucesso${NC}"
else
  echo -e "${YELLOW}⚠️  Execute o script novamente para criar mais empresas${NC}"
fi

echo ""
echo "================================================================================"
echo "📋 RESUMO DOS TESTES"
echo "================================================================================"
echo ""
echo "Total de empresas no banco: $EMPRESAS_COUNT"
echo "Total de admins no banco: $(sqlite3 database/gestor-consorcios.db "SELECT COUNT(*) FROM usuarios WHERE role = 'admin';")"
echo "Total de assinaturas trial: $(sqlite3 database/gestor-consorcios.db "SELECT COUNT(*) FROM assinaturas WHERE status = 'TRIAL';")"
echo ""
echo "💡 Para verificar isolamento completo, execute:"
echo "   node scripts/verify-data-isolation.js"
echo ""
echo "================================================================================"
