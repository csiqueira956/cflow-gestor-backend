import sqlite3 from 'sqlite3';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../database/gestor-consorcios.db');

console.log('🔧 Adicionando coluna link_publico na tabela usuarios...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao abrir banco:', err);
    process.exit(1);
  }
  console.log('✅ Banco de dados aberto');
});

db.serialize(() => {
  // Adicionar coluna se não existir (sem UNIQUE, pois SQLite não permite)
  db.run(`ALTER TABLE usuarios ADD COLUMN link_publico TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Erro ao adicionar coluna:', err);
      db.close();
      return;
    } else if (err) {
      console.log('ℹ️  Coluna link_publico já existe');
    } else {
      console.log('✅ Coluna link_publico adicionada');
    }

    // Criar índice UNIQUE
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_link_publico ON usuarios(link_publico)`, (err) => {
      if (err) {
        console.log('ℹ️  Índice único já existe ou erro:', err.message);
      } else {
        console.log('✅ Índice único criado para link_publico');
      }
    });
  });

  // Gerar links únicos para usuários existentes
  db.all('SELECT id, email FROM usuarios WHERE link_publico IS NULL', [], (err, users) => {
    if (err) {
      console.error('❌ Erro ao buscar usuários:', err);
      return;
    }

    if (users.length === 0) {
      console.log('✅ Todos os usuários já possuem link_publico');
      db.close();
      return;
    }

    console.log(`\n🔄 Gerando links para ${users.length} usuário(s)...\n`);

    let processed = 0;
    users.forEach(user => {
      const linkPublico = crypto.randomBytes(16).toString('hex');

      db.run(
        'UPDATE usuarios SET link_publico = ? WHERE id = ?',
        [linkPublico, user.id],
        function(err) {
          if (err) {
            console.error(`❌ Erro ao atualizar ${user.email}:`, err);
          } else {
            console.log(`✅ Link gerado para ${user.email}: /cadastro/${linkPublico}`);
          }

          processed++;
          if (processed === users.length) {
            console.log('\n✨ Migração concluída!');
            db.close();
          }
        }
      );
    });
  });
});
