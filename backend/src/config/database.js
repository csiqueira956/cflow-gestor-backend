import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Force rebuild - v2

const { Pool } = pg;

// Configuração otimizada para Vercel Serverless
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  },
  // Configurações otimizadas para serverless
  max: 1, // Máximo de 1 conexão por função serverless
  idleTimeoutMillis: 0, // Não manter conexões idle
  connectionTimeoutMillis: 30000, // Timeout de 30 segundos (para cold starts)
  allowExitOnIdle: true, // Permite que o pool feche quando idle
  keepAlive: true, // Mantém conexão ativa
  keepAliveInitialDelayMillis: 10000
});

// Log de conexão
pool.on('connect', () => {
  console.log('✅ Conectado ao banco de dados PostgreSQL (Supabase)');
});

pool.on('error', (err) => {
  console.error('❌ Erro no pool do PostgreSQL:', err);
});

// Wrapper para queries com logs (sem expor dados sensíveis em produção)
const query = async (text, params) => {
  try {
    // Apenas log em desenvolvimento, sem expor parâmetros sensíveis
    if (process.env.NODE_ENV !== 'production') {
      console.log('📝 Query:', text.substring(0, 100) + '...');
    }
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('❌ Erro na query:', error.message);
    throw error;
  }
};

export default {
  query,
  pool
};
