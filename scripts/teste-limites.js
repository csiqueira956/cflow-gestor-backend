/**
 * Script de Teste Automatizado - Sistema de Limites
 * Execute: node scripts/teste-limites.js
 *
 * Pré-requisitos:
 * - Backend rodando em http://localhost:5000
 * - Migration 003 aplicada
 * - Token JWT válido (configure abaixo)
 */

import axios from 'axios';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// Configuração
const API_URL = 'http://localhost:5000/api';
const TOKEN = process.env.TEST_TOKEN || 'SEU_TOKEN_AQUI'; // Configure via env ou substitua

// Cliente HTTP
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
});

let testsPassed = 0;
let testsFailed = 0;

// Helpers
function log(msg, color = RESET) {
  console.log(`${color}${msg}${RESET}`);
}

function test(name, passed, details = '') {
  if (passed) {
    log(`✓ ${name}`, GREEN);
    if (details) log(`  ${details}`, BLUE);
    testsPassed++;
  } else {
    log(`✗ ${name}`, RED);
    if (details) log(`  ${details}`, YELLOW);
    testsFailed++;
  }
}

// Testes
async function runTests() {
  log('\n🧪 Iniciando Testes do Sistema de Limites\n', BLUE);

  try {
    // Teste 1: Endpoint de Uso
    log('1️⃣  Testando endpoint GET /assinatura/uso...', YELLOW);
    try {
      const response = await api.get('/assinatura/uso');
      const { usage } = response.data;

      test('Endpoint /uso responde', response.status === 200);
      test('Retorna dados de usuários', usage?.usuarios?.total !== undefined);
      test('Retorna dados de leads', usage?.leads?.total !== undefined);
      test('Retorna limites de usuários', usage?.usuarios?.limite !== undefined);
      test('Retorna limites de leads', usage?.leads?.limite !== undefined);

      log(`  Uso atual: ${usage.usuarios.total}/${usage.usuarios.limite} usuários, ${usage.leads.total}/${usage.leads.limite || '∞'} leads`, BLUE);
    } catch (error) {
      test('Endpoint /uso responde', false, error.message);
    }

    // Teste 2: Endpoint de Validação de Usuário
    log('\n2️⃣  Testando endpoint GET /assinatura/validar-usuario...', YELLOW);
    try {
      const response = await api.get('/assinatura/validar-usuario');
      test('Endpoint /validar-usuario responde', response.status === 200);
      test('Retorna can_create', response.data.can_create !== undefined);
      log(`  Pode criar usuário: ${response.data.can_create ? 'SIM' : 'NÃO'}`, BLUE);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error === 'Limite de usuários atingido') {
        test('Endpoint /validar-usuario bloqueia corretamente', true, 'Limite atingido (esperado)');
      } else {
        test('Endpoint /validar-usuario responde', false, error.message);
      }
    }

    // Teste 3: Endpoint de Validação de Lead
    log('\n3️⃣  Testando endpoint GET /assinatura/validar-lead...', YELLOW);
    try {
      const response = await api.get('/assinatura/validar-lead');
      test('Endpoint /validar-lead responde', response.status === 200);
      test('Retorna can_create', response.data.can_create !== undefined);
      log(`  Pode criar lead: ${response.data.can_create ? 'SIM' : 'NÃO'}`, BLUE);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error === 'Limite de leads atingido') {
        test('Endpoint /validar-lead bloqueia corretamente', true, 'Limite atingido (esperado)');
      } else {
        test('Endpoint /validar-lead responde', false, error.message);
      }
    }

    // Teste 4: Status da Assinatura
    log('\n4️⃣  Testando endpoint GET /assinatura/status...', YELLOW);
    try {
      const response = await api.get('/assinatura/status');
      test('Endpoint /status responde', response.status === 200);
      test('Retorna can_create_user', response.data.can_create_user !== undefined);
      test('Retorna can_create_lead', response.data.can_create_lead !== undefined);
      test('Retorna status da assinatura', response.data.status !== undefined);

      log(`  Status: ${response.data.status}`, BLUE);
      log(`  Pode criar usuário: ${response.data.can_create_user}`, BLUE);
      log(`  Pode criar lead: ${response.data.can_create_lead}`, BLUE);
    } catch (error) {
      test('Endpoint /status responde', false, error.message);
    }

    // Teste 5: Performance - Cache
    log('\n5️⃣  Testando cache de performance...', YELLOW);
    try {
      const start1 = Date.now();
      await api.get('/assinatura/uso');
      const time1 = Date.now() - start1;

      // Aguardar 100ms
      await new Promise(resolve => setTimeout(resolve, 100));

      const start2 = Date.now();
      await api.get('/assinatura/uso');
      const time2 = Date.now() - start2;

      test('Cache melhora performance', time2 < time1, `1ª chamada: ${time1}ms, 2ª chamada: ${time2}ms`);
    } catch (error) {
      test('Cache funciona', false, error.message);
    }

    // Teste 6: Estrutura de Resposta
    log('\n6️⃣  Validando estrutura de dados...', YELLOW);
    try {
      const response = await api.get('/assinatura/uso');
      const { usage } = response.data;

      test('Usuários tem campo total', typeof usage.usuarios.total === 'number');
      test('Usuários tem campo limite', usage.usuarios.limite !== undefined);
      test('Usuários tem campo restantes', typeof usage.usuarios.restantes === 'number');
      test('Usuários tem campo vendedores', typeof usage.usuarios.vendedores === 'number');
      test('Usuários tem campo admins', typeof usage.usuarios.admins === 'number');

      test('Leads tem campo total', typeof usage.leads.total === 'number');
      test('Leads tem campo limite', usage.leads.limite !== undefined);

      test('Storage tem campo used_gb', typeof usage.storage.used_gb === 'number');
    } catch (error) {
      test('Estrutura de dados válida', false, error.message);
    }

    // Resumo
    log('\n' + '='.repeat(60), BLUE);
    log('\n📊 RESUMO DOS TESTES\n', BLUE);
    log(`${GREEN}✓ Testes aprovados: ${testsPassed}${RESET}`);
    log(`${RED}✗ Testes reprovados: ${testsFailed}${RESET}`);

    const total = testsPassed + testsFailed;
    const percentage = Math.round((testsPassed / total) * 100);

    log(`\n${percentage}% de aprovação (${testsPassed}/${total})\n`);

    if (testsFailed === 0) {
      log('🎉 TODOS OS TESTES PASSARAM!', GREEN);
      log('Sistema de limites está funcionando perfeitamente.\n', GREEN);
    } else {
      log('⚠️  ALGUNS TESTES FALHARAM', YELLOW);
      log('Revise os erros acima e consulte a documentação.\n', YELLOW);
      log('Dica: Verifique se migration 003 foi aplicada:', BLUE);
      log('  node scripts/verificar-migration-003.js\n');
    }

  } catch (error) {
    log('\n❌ ERRO FATAL AO EXECUTAR TESTES', RED);
    log(`\n${error.message}\n`, RED);

    if (error.message.includes('ECONNREFUSED')) {
      log('⚠️  Backend não está rodando!', YELLOW);
      log('Execute: cd backend && npm run dev\n');
    } else if (error.response?.status === 401) {
      log('⚠️  Token JWT inválido!', YELLOW);
      log('Configure TOKEN no arquivo ou via variável de ambiente TEST_TOKEN\n');
    }
  }
}

// Validar configuração
if (TOKEN === 'SEU_TOKEN_AQUI') {
  log('\n⚠️  ATENÇÃO: Configure o TOKEN antes de executar os testes!\n', YELLOW);
  log('Opção 1: Edite este arquivo e substitua SEU_TOKEN_AQUI\n');
  log('Opção 2: Execute: TEST_TOKEN=seu_token node scripts/teste-limites.js\n');
  process.exit(1);
}

// Executar
runTests();
