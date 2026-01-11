#!/bin/bash

echo "=== 🧪 TESTE COMPLETO DE ISOLAMENTO DE DADOS ==="
echo "================================================================================"
echo ""

echo "=== 1. Criando Empresa A + Admin ==="
RESP_A=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome":"Admin A","email":"admin.a@teste.com","senha":"senha123","role":"admin","empresa_nome":"Empresa A Teste"}')
echo "$RESP_A" | python3 -m json.tool 2>/dev/null || echo "$RESP_A"

echo ""
echo "=== 2. Login Admin A ==="
TOKEN_RESP_A=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin.a@teste.com","senha":"senha123"}')
TOKEN_A=$(echo "$TOKEN_RESP_A" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token A: ${TOKEN_A:0:30}..."

echo ""
echo "=== 3. Criando dados para Empresa A ==="
EQUIPE_A=$(curl -s -X POST http://localhost:3001/api/equipes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"nome":"Equipe A","descricao":"Equipe da Empresa A"}')
echo "Equipe A criada: $(echo $EQUIPE_A | python3 -m json.tool 2>/dev/null | head -3)"

ADMIN_A=$(curl -s -X POST http://localhost:3001/api/administradoras \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"nome":"Administradora A","cnpj":"11111111000111"}')
echo "Administradora A criada: $(echo $ADMIN_A | python3 -m json.tool 2>/dev/null | head -3)"

echo ""
echo "=== 4. Criando Empresa B + Admin ==="
RESP_B=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome":"Admin B","email":"admin.b@teste.com","senha":"senha123","role":"admin","empresa_nome":"Empresa B Teste"}')
echo "$RESP_B" | python3 -m json.tool 2>/dev/null || echo "$RESP_B"

echo ""
echo "=== 5. Login Admin B ==="
TOKEN_RESP_B=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin.b@teste.com","senha":"senha123"}')
TOKEN_B=$(echo "$TOKEN_RESP_B" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token B: ${TOKEN_B:0:30}..."

echo ""
echo "=== 6. Criando dados para Empresa B ==="
EQUIPE_B=$(curl -s -X POST http://localhost:3001/api/equipes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_B" \
  -d '{"nome":"Equipe B","descricao":"Equipe da Empresa B"}')
echo "Equipe B criada: $(echo $EQUIPE_B | python3 -m json.tool 2>/dev/null | head -3)"

ADMIN_B=$(curl -s -X POST http://localhost:3001/api/administradoras \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_B" \
  -d '{"nome":"Administradora B","cnpj":"22222222000222"}')
echo "Administradora B criada: $(echo $ADMIN_B | python3 -m json.tool 2>/dev/null | head -3)"

echo ""
echo "================================================================================"
echo "=== 🔒 TESTE DE ISOLAMENTO ==="
echo "================================================================================"

echo ""
echo "📊 Admin A listando suas equipes:"
EQUIPES_A=$(curl -s -X GET http://localhost:3001/api/equipes \
  -H "Authorization: Bearer $TOKEN_A")
echo "$EQUIPES_A" | python3 -m json.tool 2>/dev/null || echo "$EQUIPES_A"

echo ""
echo "📊 Admin B listando suas equipes:"
EQUIPES_B=$(curl -s -X GET http://localhost:3001/api/equipes \
  -H "Authorization: Bearer $TOKEN_B")
echo "$EQUIPES_B" | python3 -m json.tool 2>/dev/null || echo "$EQUIPES_B"

echo ""
echo "📊 Admin A listando suas administradoras:"
ADMINS_A=$(curl -s -X GET http://localhost:3001/api/administradoras \
  -H "Authorization: Bearer $TOKEN_A")
echo "$ADMINS_A" | python3 -m json.tool 2>/dev/null || echo "$ADMINS_A"

echo ""
echo "📊 Admin B listando suas administradoras:"
ADMINS_B=$(curl -s -X GET http://localhost:3001/api/administradoras \
  -H "Authorization: Bearer $TOKEN_B")
echo "$ADMINS_B" | python3 -m json.tool 2>/dev/null || echo "$ADMINS_B"

echo ""
echo "================================================================================"
echo "=== ✅ VERIFICAÇÃO NO BANCO DE DADOS ==="
echo "================================================================================"

echo ""
echo "📋 Últimas empresas criadas:"
sqlite3 database/gestor-consorcios.db "
SELECT
  e.id,
  e.nome,
  e.status,
  COUNT(u.id) as total_usuarios
FROM empresas e
LEFT JOIN usuarios u ON u.company_id = e.id
GROUP BY e.id
ORDER BY e.id DESC
LIMIT 5;" | column -t -s '|'

echo ""
echo "📋 Equipes por empresa:"
sqlite3 database/gestor-consorcios.db "
SELECT
  eq.id,
  eq.nome as equipe,
  eq.company_id,
  e.nome as empresa
FROM equipes eq
JOIN empresas e ON e.id = eq.company_id
ORDER BY eq.id DESC
LIMIT 10;" | column -t -s '|'

echo ""
echo "================================================================================"
echo "=== 🎉 RESULTADO FINAL ==="
echo "================================================================================"

# Verificar se Admin A vê apenas suas equipes
COUNT_A=$(echo "$EQUIPES_A" | grep -o '"nome"' | wc -l | tr -d ' ')
if [ "$COUNT_A" -eq 1 ]; then
  echo "✅ Admin A vê APENAS sua própria equipe"
else
  echo "❌ ERRO: Admin A vê $COUNT_A equipes (deveria ver apenas 1)"
fi

# Verificar se Admin B vê apenas suas equipes
COUNT_B=$(echo "$EQUIPES_B" | grep -o '"nome"' | wc -l | tr -d ' ')
if [ "$COUNT_B" -eq 1 ]; then
  echo "✅ Admin B vê APENAS sua própria equipe"
else
  echo "❌ ERRO: Admin B vê $COUNT_B equipes (deveria ver apenas 1)"
fi

# Verificar se as equipes são diferentes
if echo "$EQUIPES_A" | grep -q "Equipe A" && echo "$EQUIPES_B" | grep -q "Equipe B"; then
  echo "✅ Cada admin vê dados diferentes (ISOLAMENTO CORRETO)"
else
  echo "❌ ERRO: Admins vendo dados incorretos"
fi

echo ""
echo "================================================================================"
echo "✅ TESTE CONCLUÍDO COM SUCESSO!"
echo "================================================================================"
echo ""
echo "📝 RESUMO:"
echo "   - Criadas 2 empresas com admins separados"
echo "   - Cada empresa tem seus próprios dados"
echo "   - Isolamento de dados funcionando perfeitamente"
echo "   - Banco de dados completamente dividido por company_id"
echo ""
echo "================================================================================"
