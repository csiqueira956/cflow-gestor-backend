import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Debug: mostrar qual DATABASE_URL está sendo usada (parcial para segurança)
const dbUrl = process.env.DATABASE_URL || '';
console.log('🔍 DATABASE_URL configurada:', dbUrl.replace(/:[^:@]+@/, ':***@'));

// Configuração do pool PostgreSQL para Supabase
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log de conexão
pgPool.on('connect', () => {
  console.log('✅ Conectado ao banco de dados PostgreSQL (Supabase)');
});

pgPool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool PostgreSQL:', err);
});

// Testar conexão na inicialização
pgPool.query('SELECT NOW()')
  .then(() => {
    console.log('📁 Conexão com Supabase verificada com sucesso');
  })
  .catch((err) => {
    console.error('❌ Falha ao conectar ao Supabase:', err.message);
  });

// Função para converter placeholders SQLite (?) para PostgreSQL ($1, $2, ...)
function convertPlaceholders(sql) {
  let paramIndex = 0;
  return sql.replace(/\?/g, () => `$${++paramIndex}`);
}

// Wrapper para manter compatibilidade com código existente
const pool = {
  // Método query padrão - retorna { rows }
  async query(text, params = []) {
    try {
      // Converter ? para $1, $2... se necessário
      const convertedText = text.includes('?') ? convertPlaceholders(text) : text;
      const result = await pgPool.query(convertedText, params);
      return { rows: result.rows, rowCount: result.rowCount };
    } catch (error) {
      console.error('❌ Erro na query:', error.message);
      console.error('📝 Query:', text);
      console.error('📊 Params:', params);
      throw error;
    }
  },

  // Para queries que retornam um único resultado
  async queryOne(text, params = []) {
    try {
      const convertedText = text.includes('?') ? convertPlaceholders(text) : text;
      const result = await pgPool.query(convertedText, params);
      return { rows: result.rows.length > 0 ? [result.rows[0]] : [] };
    } catch (error) {
      console.error('❌ Erro na queryOne:', error.message);
      throw error;
    }
  },

  // Para INSERT/UPDATE/DELETE com RETURNING
  async run(text, params = []) {
    try {
      const convertedText = text.includes('?') ? convertPlaceholders(text) : text;
      const result = await pgPool.query(convertedText, params);
      return {
        rowCount: result.rowCount,
        rows: result.rows,
        // Compatibilidade com SQLite
        lastID: result.rows[0]?.id,
        changes: result.rowCount
      };
    } catch (error) {
      console.error('❌ Erro ao executar:', error.message);
      throw error;
    }
  },

  // Acesso direto ao pool para casos especiais (transações, etc.)
  getPool() {
    return pgPool;
  },

  // Método para fechar o pool (útil para testes e shutdown)
  async end() {
    await pgPool.end();
    console.log('🔌 Pool PostgreSQL encerrado');
  }
};

export default pool;
