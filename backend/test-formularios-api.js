// Script para testar a API de formulários públicos
import fetch from 'node-fetch';

const BACKEND_URL = 'https://cflow-gestor-backend.vercel.app';

async function testFormulariosAPI() {
  console.log('🧪 Testando API de Formulários Públicos\n');
  console.log('Backend URL:', BACKEND_URL);
  console.log('-----------------------------------\n');

  // Teste 1: Endpoint raiz
  try {
    console.log('1️⃣ Testando endpoint raiz (/)...');
    const response = await fetch(`${BACKEND_URL}/`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📦 Response:', JSON.stringify(data, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.log('');
  }

  // Teste 2: Listar formulários (precisa de token JWT - esperamos 401)
  try {
    console.log('2️⃣ Testando GET /api/formularios (sem auth)...');
    const response = await fetch(`${BACKEND_URL}/api/formularios`);
    console.log('✅ Status:', response.status, response.statusText);
    const data = await response.json();
    console.log('📦 Response:', JSON.stringify(data, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.log('');
  }

  // Teste 3: Buscar formulário por token inválido (público)
  try {
    console.log('3️⃣ Testando GET /api/formularios/token-invalido (público)...');
    const response = await fetch(`${BACKEND_URL}/api/formularios/token-invalido`);
    console.log('✅ Status:', response.status, response.statusText);
    const data = await response.json();
    console.log('📦 Response:', JSON.stringify(data, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.log('');
  }

  // Teste 4: Endpoint de notificações (para diagnosticar o /api/api/)
  try {
    console.log('4️⃣ Testando GET /api/notifications/unread-count...');
    const response = await fetch(`${BACKEND_URL}/api/notifications/unread-count`);
    console.log('✅ Status:', response.status, response.statusText);
    const text = await response.text();
    console.log('📦 Response:', text);
    console.log('');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.log('');
  }

  // Teste 5: Testar o endpoint com /api/api/ duplicado (bug do frontend)
  try {
    console.log('5️⃣ Testando GET /api/api/notifications/unread-count (duplicado)...');
    const response = await fetch(`${BACKEND_URL}/api/api/notifications/unread-count`);
    console.log('✅ Status:', response.status, response.statusText);
    const data = await response.json();
    console.log('📦 Response:', JSON.stringify(data, null, 2));
    console.log('');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.log('');
  }

  console.log('-----------------------------------');
  console.log('✅ Testes concluídos!');
}

testFormulariosAPI().catch(console.error);
