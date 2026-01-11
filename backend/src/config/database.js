import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configuração otimizada para Vercel Serverless
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Configurações otimizadas para serverless
  max: 1, // Máximo de 1 conexão por função serverless
  idleTimeoutMillis: 0, // Não manter conexões idle
  connectionTimeoutMillis: 10000, // Timeout de 10 segundos
});

// Log de conexão
pool.on('connect', () => {
  console.log('✅ Conectado ao banco de dados PostgreSQL (Supabase)');
});

pool.on('error', (err) => {
  console.error('❌ Erro no pool do PostgreSQL:', err);
});

// Wrapper para queries com logs
const query = async (text, params) => {
  try {
    console.log('📝 Query completa:', text);
    console.log('📊 Params:', JSON.stringify(params));
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
