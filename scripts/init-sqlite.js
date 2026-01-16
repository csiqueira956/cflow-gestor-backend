import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminhos
const dbPath = path.join(__dirname, '../database/gestor-consorcios.db');
const schemaPath = path.join(__dirname, '../database/schema-sqlite.sql');

console.log('🔧 Inicializando banco de dados SQLite...');
console.log(`📁 Banco: ${dbPath}`);
console.log(`📄 Schema: ${schemaPath}`);

// Ler o schema SQL
const schema = fs.readFileSync(schemaPath, 'utf8');

// Criar/abrir banco de dados
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao criar banco:', err);
    process.exit(1);
  }
  console.log('✅ Banco de dados criado/aberto com sucesso');
});

// Executar schema
db.exec(schema, (err) => {
  if (err) {
    console.error('❌ Erro ao executar schema:', err);
    process.exit(1);
  }

  console.log('✅ Schema executado com sucesso!');
  console.log('\n📊 Tabelas criadas:');
  console.log('  - usuarios');
  console.log('  - clientes');
  console.log('\n👤 Usuários padrão criados:');
  console.log('  Admin: admin@gestorconsorcios.com / admin123');
  console.log('  Vendedor: vendedor@gestorconsorcios.com / vendedor123');
  console.log('\n✨ Banco de dados pronto para uso!');

  db.close((err) => {
    if (err) {
      console.error('❌ Erro ao fechar banco:', err);
    }
    process.exit(0);
  });
});
