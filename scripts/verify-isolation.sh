#!/bin/bash

# Script de Verificação de Isolamento de Dados (company_id)
#
# Este script verifica se todas as queries no banco de dados
# estão corretamente isoladas por company_id

DB_PATH="database/gestor-consorcios.db"

echo "🔍 VERIFICAÇÃO DE ISOLAMENTO DE DADOS (company_id)"
echo "================================================================================"
echo ""

# 1. Verificar se as colunas company_id existem
echo "1️⃣  Verificando colunas company_id nas tabelas..."
echo ""

check_column() {
  local table=$1
  local result=$(sqlite3 "$DB_PATH" "PRAGMA table_info($table);" 2>/dev/null | grep -c "company_id")

  if [ $result -gt 0 ]; then
    printf "   ✅ %-20s - company_id presente\n" "$table"
    return 0
  else
    printf "   ❌ %-20s - company_id AUSENTE\n" "$table"
    return 1
  fi
}

tables=("equipes" "administradoras" "metas" "clientes" "usuarios" "comissoes" "assinaturas")
missing=0

for table in "${tables[@]}"; do
  check_column "$table" || missing=$((missing + 1))
done

echo ""

if [ $missing -gt 0 ]; then
  echo "❌ ERRO: $missing tabela(s) não têm company_id"
  echo "Execute o script de migração: sqlite3 $DB_PATH < scripts/add-company-id-to-tables.sql"
  exit 1
fi

# 2. Verificar índices
echo "2️⃣  Verificando índices em company_id..."
echo ""

for table in "${tables[@]}"; do
  idx_count=$(sqlite3 "$DB_PATH" "PRAGMA index_list($table);" 2>/dev/null | grep -c "company_id")

  if [ $idx_count -gt 0 ]; then
    printf "   ✅ %-20s - Índice presente\n" "$table"
  else
    printf "   ⚠️  %-20s - Índice ausente (recomendado)\n" "$table"
  fi
done

echo ""

# 3. Verificar distribuição de dados por empresa
echo "3️⃣  Verificando distribuição de dados por empresa..."
echo ""

for table in "${tables[@]}"; do
  echo "   📊 $table:"

  # Contar por company_id
  sqlite3 "$DB_PATH" "SELECT company_id, COUNT(*) as total FROM $table WHERE company_id IS NOT NULL GROUP BY company_id ORDER BY company_id;" 2>/dev/null | while IFS='|' read -r company_id total; do
    echo "      Empresa $company_id: $total registro(s)"
  done

  # Verificar registros NULL
  null_count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $table WHERE company_id IS NULL;" 2>/dev/null)

  if [ "$null_count" -gt 0 ]; then
    echo "      ⚠️  $null_count registro(s) SEM company_id (VULNERÁVEL!)"
  fi

  # Se não houver dados
  total_count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $table;" 2>/dev/null)
  if [ "$total_count" -eq 0 ]; then
    echo "      ⚪ Sem dados"
  fi
done

echo ""

# 4. Verificar foreign keys
echo "4️⃣  Verificando foreign keys..."
echo ""

fk_status=$(sqlite3 "$DB_PATH" "PRAGMA foreign_keys;")

if [ "$fk_status" = "1" ]; then
  echo "   ✅ Foreign keys estão ATIVADAS"
else
  echo "   ❌ Foreign keys estão DESATIVADAS"
  echo "   ⚠️  RECOMENDAÇÃO: Ativar foreign keys no banco"
fi

echo ""

# 5. Testar query de isolamento
echo "5️⃣  Testando isolamento de queries..."
echo ""

# Pegar IDs das empresas
companies=$(sqlite3 "$DB_PATH" "SELECT DISTINCT id FROM empresas ORDER BY id LIMIT 2;" 2>/dev/null)
company_count=$(echo "$companies" | wc -l | tr -d ' ')

if [ "$company_count" -ge 2 ]; then
  company1=$(echo "$companies" | sed -n '1p')
  company2=$(echo "$companies" | sed -n '2p')

  echo "   Testando isolamento entre Empresa $company1 e Empresa $company2..."
  echo ""

  for table in "${tables[@]}"; do
    count1=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $table WHERE company_id = $company1;" 2>/dev/null)
    count2=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $table WHERE company_id = $company2;" 2>/dev/null)
    total=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $table;" 2>/dev/null)

    if [ $((count1 + count2)) -le $total ]; then
      status="✅"
    else
      status="❌"
    fi

    printf "   %s %-20s - Emp1: %d, Emp2: %d, Total: %d\n" "$status" "$table" "$count1" "$count2" "$total"
  done
else
  echo "   ⚠️  Menos de 2 empresas cadastradas. Crie pelo menos 2 empresas para testar."
fi

echo ""

# 6. Resumo final
echo "================================================================================"
echo "📋 RESUMO DA VERIFICAÇÃO"
echo "================================================================================"

if [ $missing -eq 0 ]; then
  echo "✅ Todas as tabelas têm a coluna company_id"
else
  echo "❌ $missing tabela(s) sem company_id"
fi

if [ "$fk_status" = "1" ]; then
  echo "✅ Foreign keys estão ativadas"
else
  echo "⚠️  Foreign keys estão desativadas (recomendado ativar)"
fi

echo ""
echo "💡 PRÓXIMOS PASSOS:"
echo ""
echo "1. Revisar o arquivo SECURITY_AUDIT.md para mais detalhes"
echo "2. Testar manualmente com 2 contas trial diferentes"
echo "3. Corrigir a VULNERABILIDADE CRÍTICA em assinaturaController.js"
echo "4. Implementar rate limiting para rotas de autenticação"
echo ""
echo "================================================================================"
