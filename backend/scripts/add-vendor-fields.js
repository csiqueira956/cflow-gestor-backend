import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../database/gestor-consorcios.db');

console.log('🔧 Adicionando novos campos de vendedor na tabela usuarios...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao abrir banco:', err);
    process.exit(1);
  }
  console.log('✅ Banco de dados aberto');
});

db.serialize(() => {
  // Adicionar coluna tipo_usuario
  db.run(`ALTER TABLE usuarios ADD COLUMN tipo_usuario TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Erro ao adicionar coluna tipo_usuario:', err);
    } else if (err) {
      console.log('ℹ️  Coluna tipo_usuario já existe');
    } else {
      console.log('✅ Coluna tipo_usuario adicionada');
    }
  });

  // Adicionar coluna percentual_comissao
  db.run(`ALTER TABLE usuarios ADD COLUMN percentual_comissao REAL`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Erro ao adicionar coluna percentual_comissao:', err);
    } else if (err) {
      console.log('ℹ️  Coluna percentual_comissao já existe');
    } else {
      console.log('✅ Coluna percentual_comissao adicionada');
    }
  });

  // Adicionar coluna celular
  db.run(`ALTER TABLE usuarios ADD COLUMN celular TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Erro ao adicionar coluna celular:', err);
    } else if (err) {
      console.log('ℹ️  Coluna celular já existe');
    } else {
      console.log('✅ Coluna celular adicionada');
    }
  });

  // Adicionar coluna equipe
  db.run(`ALTER TABLE usuarios ADD COLUMN equipe TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Erro ao adicionar coluna equipe:', err);
    } else if (err) {
      console.log('ℹ️  Coluna equipe já existe');
    } else {
      console.log('✅ Coluna equipe adicionada');
    }

    // Fechar conexão após última operação
    setTimeout(() => {
      console.log('\n✨ Migração concluída!');
      db.close();
    }, 100);
  });
});
