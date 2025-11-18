import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../database/gestor-consorcios.db');

console.log('🔧 Corrigindo senhas dos usuários...\n');

// Gerar hashes para as senhas
const adminPassword = 'admin123';
const vendedorPassword = 'vendedor123';

const adminHash = bcrypt.hashSync(adminPassword, 10);
const vendedorHash = bcrypt.hashSync(vendedorPassword, 10);

console.log('✅ Hashes gerados:');
console.log(`Admin (${adminPassword}): ${adminHash}`);
console.log(`Vendedor (${vendedorPassword}): ${vendedorHash}\n`);

// Abrir banco de dados
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao abrir banco:', err);
    process.exit(1);
  }
});

// Atualizar senhas
db.serialize(() => {
  // Atualizar admin
  db.run(
    'UPDATE usuarios SET senha_hash = ? WHERE email = ?',
    [adminHash, 'admin@gestorconsorcios.com'],
    function(err) {
      if (err) {
        console.error('❌ Erro ao atualizar admin:', err);
      } else {
        console.log(`✅ Admin atualizado (${this.changes} registro)`);
      }
    }
  );

  // Atualizar vendedor
  db.run(
    'UPDATE usuarios SET senha_hash = ? WHERE email = ?',
    [vendedorHash, 'vendedor@gestorconsorcios.com'],
    function(err) {
      if (err) {
        console.error('❌ Erro ao atualizar vendedor:', err);
      } else {
        console.log(`✅ Vendedor atualizado (${this.changes} registro)`);
      }
    }
  );

  // Verificar usuários
  db.all('SELECT id, nome, email, role FROM usuarios', [], (err, rows) => {
    if (err) {
      console.error('❌ Erro ao listar usuários:', err);
    } else {
      console.log('\n📋 Usuários no banco:');
      rows.forEach(user => {
        console.log(`  ${user.id}. ${user.nome} (${user.email}) - ${user.role}`);
      });
    }

    console.log('\n✨ Senhas corrigidas com sucesso!');
    console.log('\n👤 Credenciais de acesso:');
    console.log('  Admin: admin@gestorconsorcios.com / admin123');
    console.log('  Vendedor: vendedor@gestorconsorcios.com / vendedor123\n');

    db.close();
  });
});
