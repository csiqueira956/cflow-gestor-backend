import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Debug: mostrar configuração
console.log('🔍 Configuração do banco:');
console.log('  PGHOST:', process.env.PGHOST || '(usando DATABASE_URL)');
console.log('  PGUSER:', process.env.PGUSER || '(usando DATABASE_URL)');

// Configuração do pool PostgreSQL para Supabase (otimizado para serverless)
const poolConfig = {
  ssl: {
    rejectUnauthorized: false
  },
  max: 3, // Menos conexões para serverless
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 60000, // 60 segundos de timeout
};

// Usar variáveis PG separadas se disponíveis, senão usar DATABASE_URL
if (process.env.PGHOST) {
  poolConfig.host = process.env.PGHOST;
  poolConfig.port = parseInt(process.env.PGPORT || '5432');
  poolConfig.database = process.env.PGDATABASE || 'postgres';
  poolConfig.user = process.env.PGUSER;
  poolConfig.password = process.env.PGPASSWORD;
  console.log('  Modo: Variáveis PG separadas');
} else {
  poolConfig.connectionString = process.env.DATABASE_URL;
  console.log('  Modo: DATABASE_URL');
  console.log('  URL:', (process.env.DATABASE_URL || '').replace(/:[^:@]+@/, ':***@'));
}

const pgPool = new Pool(poolConfig);

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
      console.error('📝 Query completa:', convertedText || text);
      console.error('📊 Params:', JSON.stringify(params));
      if (error.position) {
        console.error('🎯 Posição do erro:', error.position);
        console.error('🔍 Trecho próximo ao erro:', (convertedText || text).substring(parseInt(error.position) - 50, parseInt(error.position) + 50));
      }
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
