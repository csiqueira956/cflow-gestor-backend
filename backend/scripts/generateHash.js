// Script para gerar hash de senha para inserir no banco de dados
import bcrypt from 'bcryptjs';

const senhas = {
  admin123: '',
  vendedor123: ''
};

// Gerar hashes
for (const [senha, hash] of Object.entries(senhas)) {
  const hashGerado = bcrypt.hashSync(senha, 10);
  console.log(`Senha: ${senha}`);
  console.log(`Hash: ${hashGerado}`);
  console.log('---');
}
