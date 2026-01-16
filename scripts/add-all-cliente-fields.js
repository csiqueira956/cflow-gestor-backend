import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../database/gestor-consorcios.db');
const db = new Database(dbPath);

console.log('📝 Adicionando campos completos à tabela clientes...');

try {
  // Adicionar campos de Dados Pessoais
  db.exec(`
    ALTER TABLE clientes ADD COLUMN data_nascimento TEXT;
    ALTER TABLE clientes ADD COLUMN estado_civil TEXT;
    ALTER TABLE clientes ADD COLUMN nacionalidade TEXT DEFAULT 'Brasil';
    ALTER TABLE clientes ADD COLUMN cidade_nascimento TEXT;
    ALTER TABLE clientes ADD COLUMN nome_mae TEXT;
    ALTER TABLE clientes ADD COLUMN profissao TEXT;
    ALTER TABLE clientes ADD COLUMN remuneracao REAL;
  `);
  console.log('✅ Campos de dados pessoais adicionados');

  // Adicionar campos de Contatos
  db.exec(`
    ALTER TABLE clientes ADD COLUMN telefone_residencial TEXT;
    ALTER TABLE clientes ADD COLUMN telefone_comercial TEXT;
    ALTER TABLE clientes ADD COLUMN telefone_celular TEXT;
    ALTER TABLE clientes ADD COLUMN telefone_celular_2 TEXT;
  `);
  console.log('✅ Campos de contatos adicionados');

  // Adicionar campos de Documentação
  db.exec(`
    ALTER TABLE clientes ADD COLUMN tipo_documento TEXT DEFAULT 'RG';
    ALTER TABLE clientes ADD COLUMN numero_documento TEXT;
    ALTER TABLE clientes ADD COLUMN orgao_emissor TEXT;
    ALTER TABLE clientes ADD COLUMN data_emissao TEXT;
  `);
  console.log('✅ Campos de documentação adicionados');

  // Adicionar campos de Cônjuge
  db.exec(`
    ALTER TABLE clientes ADD COLUMN cpf_conjuge TEXT;
    ALTER TABLE clientes ADD COLUMN nome_conjuge TEXT;
  `);
  console.log('✅ Campos de cônjuge adicionados');

  // Adicionar campos de Endereço
  db.exec(`
    ALTER TABLE clientes ADD COLUMN cep TEXT;
    ALTER TABLE clientes ADD COLUMN tipo_logradouro TEXT DEFAULT 'Rua';
    ALTER TABLE clientes ADD COLUMN endereco TEXT;
    ALTER TABLE clientes ADD COLUMN numero_endereco TEXT;
    ALTER TABLE clientes ADD COLUMN complemento TEXT;
    ALTER TABLE clientes ADD COLUMN bairro TEXT;
    ALTER TABLE clientes ADD COLUMN cidade TEXT;
    ALTER TABLE clientes ADD COLUMN estado TEXT;
  `);
  console.log('✅ Campos de endereço adicionados');

  // Adicionar campos de Pagamento - 1ª Parcela
  db.exec(`
    ALTER TABLE clientes ADD COLUMN forma_pagamento_primeira TEXT DEFAULT 'Boleto';
    ALTER TABLE clientes ADD COLUMN data_pre_datado TEXT;
    ALTER TABLE clientes ADD COLUMN valor_cheque REAL;
    ALTER TABLE clientes ADD COLUMN numero_cheque TEXT;
    ALTER TABLE clientes ADD COLUMN data_vencimento_cheque TEXT;
    ALTER TABLE clientes ADD COLUMN banco_cheque TEXT;
    ALTER TABLE clientes ADD COLUMN agencia_cheque TEXT;
    ALTER TABLE clientes ADD COLUMN conta_cheque TEXT;
  `);
  console.log('✅ Campos de pagamento (1ª parcela) adicionados');

  // Adicionar campos de Pagamento - Demais Parcelas
  db.exec(`
    ALTER TABLE clientes ADD COLUMN forma_pagamento_demais TEXT DEFAULT 'Boleto';
    ALTER TABLE clientes ADD COLUMN nome_correntista TEXT;
    ALTER TABLE clientes ADD COLUMN cpf_correntista TEXT;
    ALTER TABLE clientes ADD COLUMN banco_debito TEXT;
    ALTER TABLE clientes ADD COLUMN agencia_debito TEXT;
    ALTER TABLE clientes ADD COLUMN conta_debito TEXT;
  `);
  console.log('✅ Campos de pagamento (demais parcelas) adicionados');

  // Adicionar campo de Seguro
  db.exec(`
    ALTER TABLE clientes ADD COLUMN aceita_seguro INTEGER DEFAULT 0;
  `);
  console.log('✅ Campo de seguro adicionado');

  console.log('✅ Migração concluída com sucesso!');
  console.log('📊 Agora a tabela clientes pode armazenar TODOS os campos do formulário');
} catch (error) {
  console.error('❌ Erro na migração:', error.message);
  process.exit(1);
} finally {
  db.close();
}
