#!/usr/bin/env node

/**
 * Script de Verificação de Isolamento de Dados (company_id)
 *
 * Este script verifica se todas as queries no banco de dados
 * estão corretamente isoladas por company_id
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../database/gestor-consorcios.db');
const db = new Database(dbPath, { readonly: true });

console.log('🔍 VERIFICAÇÃO DE ISOLAMENTO DE DADOS (company_id)');
console.log('='.repeat(80));
console.log('');

// 1. Verificar se as colunas company_id existem
console.log('1️⃣  Verificando colunas company_id nas tabelas...\n');

const tables = ['equipes', 'administradoras', 'metas', 'clientes', 'usuarios', 'comissoes', 'assinaturas'];
const missingColumns = [];

tables.forEach(table => {
  try {
    const result = db.prepare(`PRAGMA table_info(${table})`).all();
    const hasCompanyId = result.some(col => col.name === 'company_id');

    if (hasCompanyId) {
      console.log(`   ✅ ${table.padEnd(20)} - company_id presente`);
    } else {
      console.log(`   ❌ ${table.padEnd(20)} - company_id AUSENTE`);
      missingColumns.push(table);
    }
  } catch (error) {
    console.log(`   ⚠️  ${table.padEnd(20)} - Tabela não existe`);
  }
});

console.log('');

if (missingColumns.length > 0) {
  console.log('❌ ERRO: As seguintes tabelas não têm company_id:');
  missingColumns.forEach(t => console.log(`   - ${t}`));
  console.log('Execute o script de migração: scripts/add-company-id-to-tables.sql');
  process.exit(1);
}

// 2. Verificar índices
console.log('2️⃣  Verificando índices em company_id...\n');

tables.forEach(table => {
  try {
    const indexes = db.prepare(`PRAGMA index_list(${table})`).all();
    const companyIdIndex = indexes.find(idx => idx.name.includes('company_id'));

    if (companyIdIndex) {
      console.log(`   ✅ ${table.padEnd(20)} - Índice presente (${companyIdIndex.name})`);
    } else {
      console.log(`   ⚠️  ${table.padEnd(20)} - Índice ausente (recomendado)`);
    }
  } catch (error) {
    console.log(`   ⚠️  ${table.padEnd(20)} - Erro ao verificar índices`);
  }
});

console.log('');

// 3. Verificar distribuição de dados por empresa
console.log('3️⃣  Verificando distribuição de dados por empresa...\n');

tables.forEach(table => {
  try {
    const counts = db.prepare(`
      SELECT company_id, COUNT(*) as total
      FROM ${table}
      WHERE company_id IS NOT NULL
      GROUP BY company_id
      ORDER BY company_id
    `).all();

    if (counts.length > 0) {
      console.log(`   📊 ${table}:`);
      counts.forEach(row => {
        console.log(`      Empresa ${row.company_id}: ${row.total} registro(s)`);
      });

      // Verificar se há registros sem company_id
      const nullCount = db.prepare(`
        SELECT COUNT(*) as total
        FROM ${table}
        WHERE company_id IS NULL
      `).get();

      if (nullCount.total > 0) {
        console.log(`      ⚠️  ${nullCount.total} registro(s) SEM company_id (VULNERÁVEL!)`);
      }
    } else {
      console.log(`   ⚪ ${table}: Sem dados`);
    }
  } catch (error) {
    console.log(`   ⚠️  ${table}: Erro ao contar registros`);
  }
});

console.log('');

// 4. Verificar foreign keys
console.log('4️⃣  Verificando foreign keys...\n');

const fkCheck = db.prepare('PRAGMA foreign_keys').get();
console.log(`   Foreign keys estão: ${fkCheck.foreign_keys === 1 ? '✅ ATIVADAS' : '❌ DESATIVADAS'}`);

if (fkCheck.foreign_keys !== 1) {
  console.log('   ⚠️  RECOMENDAÇÃO: Ativar foreign keys no banco');
}

console.log('');

// 5. Testar query de isolamento
console.log('5️⃣  Testando isolamento de queries...\n');

const companies = db.prepare('SELECT DISTINCT id FROM empresas ORDER BY id').all();

if (companies.length >= 2) {
  const company1 = companies[0].id;
  const company2 = companies[1].id;

  console.log(`   Testando isolamento entre Empresa ${company1} e Empresa ${company2}...\n`);

  tables.forEach(table => {
    try {
      // Contar registros da empresa 1
      const count1 = db.prepare(`
        SELECT COUNT(*) as total
        FROM ${table}
        WHERE company_id = ?
      `).get(company1);

      // Contar registros da empresa 2
      const count2 = db.prepare(`
        SELECT COUNT(*) as total
        FROM ${table}
        WHERE company_id = ?
      `).get(company2);

      // Contar total (sem filtro)
      const countTotal = db.prepare(`
        SELECT COUNT(*) as total
        FROM ${table}
      `).get();

      const isolated = (count1.total + count2.total <= countTotal.total);
      const status = isolated ? '✅' : '❌';

      console.log(`   ${status} ${table.padEnd(20)} - Emp1: ${count1.total}, Emp2: ${count2.total}, Total: ${countTotal.total}`);

    } catch (error) {
      console.log(`   ⚠️  ${table.padEnd(20)} - Erro ao testar isolamento`);
    }
  });
} else {
  console.log('   ⚠️  Menos de 2 empresas cadastradas. Crie pelo menos 2 empresas para testar.');
}

console.log('');

// 6. Resumo final
console.log('='.repeat(80));
console.log('📋 RESUMO DA VERIFICAÇÃO');
console.log('='.repeat(80));

if (missingColumns.length === 0) {
  console.log('✅ Todas as tabelas têm a coluna company_id');
} else {
  console.log(`❌ ${missingColumns.length} tabela(s) sem company_id`);
}

if (fkCheck.foreign_keys === 1) {
  console.log('✅ Foreign keys estão ativadas');
} else {
  console.log('⚠️  Foreign keys estão desativadas (recomendado ativar)');
}

console.log('');
console.log('💡 PRÓXIMOS PASSOS:');
console.log('');
console.log('1. Revisar o arquivo SECURITY_AUDIT.md para mais detalhes');
console.log('2. Testar manualmente com 2 contas trial diferentes');
console.log('3. Corrigir a VULNERABILIDADE CRÍTICA em assinaturaController.js');
console.log('4. Implementar rate limiting para rotas de autenticação');
console.log('');
console.log('='.repeat(80));

db.close();
