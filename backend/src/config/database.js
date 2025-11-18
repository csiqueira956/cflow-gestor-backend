import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho do banco de dados SQLite local
const dbPath = path.join(__dirname, '../../database/gestor-consorcios.db');

// Criar conexão com SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco SQLite:', err);
  } else {
    console.log('✅ Conectado ao banco de dados SQLite local');
    console.log(`📁 Arquivo do banco: ${dbPath}`);
  }
});

// Função para converter placeholders PostgreSQL ($1, $2) para SQLite (?)
const convertPostgresToSQLite = (query) => {
  // Substituir $1, $2, $3... por ?
  return query.replace(/\$\d+/g, '?');
};

// Criar interface compatível com pg Pool
// Isso permite que o código existente funcione sem mudanças
const pool = {
  query: promisify(db.all.bind(db)),

  // Método query que retorna resultado no formato pg
  async query(text, params = []) {
    try {
      // Converter sintaxe PostgreSQL para SQLite
      const sqliteQuery = convertPostgresToSQLite(text);
      const rows = await promisify(db.all.bind(db))(sqliteQuery, params);
      return { rows };
    } catch (error) {
      console.error('Erro na query:', error);
      throw error;
    }
  },

  // Para queries que retornam um único resultado
  async queryOne(text, params = []) {
    try {
      const sqliteQuery = convertPostgresToSQLite(text);
      const row = await promisify(db.get.bind(db))(sqliteQuery, params);
      return { rows: row ? [row] : [] };
    } catch (error) {
      console.error('Erro na query:', error);
      throw error;
    }
  },

  // Para INSERT/UPDATE/DELETE
  async run(text, params = []) {
    try {
      const sqliteQuery = convertPostgresToSQLite(text);
      const result = await promisify(db.run.bind(db))(sqliteQuery, params);
      return result;
    } catch (error) {
      console.error('Erro ao executar:', error);
      throw error;
    }
  }
};

export default pool;
