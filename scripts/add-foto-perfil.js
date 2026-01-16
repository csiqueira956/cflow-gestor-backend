import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../database/gestor-consorcios.db');

console.log('🔧 Adicionando coluna foto_perfil na tabela usuarios...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao abrir banco:', err);
    process.exit(1);
  }
  console.log('✅ Banco de dados aberto');
});

db.serialize(() => {
  // Adicionar coluna foto_perfil
  db.run(`ALTER TABLE usuarios ADD COLUMN foto_perfil TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Erro ao adicionar coluna foto_perfil:', err);
    } else if (err) {
      console.log('ℹ️  Coluna foto_perfil já existe');
    } else {
      console.log('✅ Coluna foto_perfil adicionada');
    }

    setTimeout(() => {
      console.log('\n✨ Migração concluída!');
      db.close();
    }, 100);
  });
});
