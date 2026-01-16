import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../database/gestor-consorcios.db');

console.log('🔧 Adicionando tabela formularios_publicos...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao abrir banco:', err);
    process.exit(1);
  }
  console.log('✅ Banco de dados aberto');
});

const sql = `
-- Criar tabela para rastrear formulários públicos
CREATE TABLE IF NOT EXISTS formularios_publicos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  vendedor_id INTEGER NOT NULL,
  titulo TEXT,
  descricao TEXT,
  ativo INTEGER DEFAULT 1,
  total_preenchimentos INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (vendedor_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_formularios_publicos_token ON formularios_publicos(token);
CREATE INDEX IF NOT EXISTS idx_formularios_publicos_vendedor ON formularios_publicos(vendedor_id);
`;

db.exec(sql, (err) => {
  if (err) {
    console.error('❌ Erro ao criar tabela:', err);
    process.exit(1);
  }

  console.log('✅ Tabela formularios_publicos criada com sucesso!');
  console.log('\n📊 Tabelas no banco:');

  db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
      console.error('❌ Erro ao listar tabelas:', err);
    } else {
      tables.forEach(table => {
        console.log(`  - ${table.name}`);
      });
    }

    console.log('\n✨ Migração concluída!');
    db.close();
  });
});
