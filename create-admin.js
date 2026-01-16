import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./database/gestor-consorcios.db');

const senha = 'Admin@2024';
const senhaHash = bcrypt.hashSync(senha, 10);

// Primeiro, criar/verificar empresa
db.serialize(() => {
  // Verificar se empresa existe
  db.get('SELECT id FROM empresas WHERE email = ?', ['admin@cflow.com.br'], (err, empresa) => {
    if (err) {
      console.error('Erro:', err);
      db.close();
      return;
    }

    const processarUsuario = (companyId) => {
      // Verificar se usuário existe
      db.get('SELECT id FROM usuarios WHERE email = ?', ['admin@cflow.com.br'], (err, usuario) => {
        if (err) {
          console.error('Erro:', err);
          db.close();
          return;
        }

        if (usuario) {
          // Atualizar senha
          db.run('UPDATE usuarios SET senha_hash = ? WHERE email = ?', [senhaHash, 'admin@cflow.com.br'], (err) => {
            if (err) {
              console.error('Erro ao atualizar:', err);
            } else {
              console.log('✅ Usuário atualizado!');
            }
            exibirCredenciais();
            db.close();
          });
        } else {
          // Criar novo usuário
          db.run(
            'INSERT INTO usuarios (nome, email, senha_hash, role, company_id) VALUES (?, ?, ?, ?, ?)',
            ['Administrador CFLOW', 'admin@cflow.com.br', senhaHash, 'admin', companyId],
            (err) => {
              if (err) {
                console.error('Erro ao criar usuário:', err);
              } else {
                console.log('✅ Usuário criado com sucesso!');
              }
              exibirCredenciais();
              db.close();
            }
          );
        }
      });
    };

    if (empresa) {
      processarUsuario(empresa.id);
    } else {
      // Criar empresa
      db.run(
        'INSERT INTO empresas (nome, email, status) VALUES (?, ?, ?)',
        ['CFLOW Admin', 'admin@cflow.com.br', 'ACTIVE'],
        function(err) {
          if (err) {
            console.error('Erro ao criar empresa:', err);
            db.close();
            return;
          }
          processarUsuario(this.lastID);
        }
      );
    }
  });
});

function exibirCredenciais() {
  console.log('\n📧 CREDENCIAIS DE ACESSO:');
  console.log('   Email: admin@cflow.com.br');
  console.log('   Senha: Admin@2024');
  console.log('\n🔗 Use essas credenciais em:');
  console.log('   • http://localhost:5173 (CFLOW Gestor)');
  console.log('   • http://localhost:5174 (Admin SaaS)');
  console.log('\n');
}
