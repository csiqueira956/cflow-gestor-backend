-- Schema COMPLETO para o banco de dados PostgreSQL (Supabase)
-- Execute este script no SQL Editor do Supabase

-- Deletar tabelas antigas se existirem
DROP TABLE IF EXISTS clientes CASCADE;

-- Tabela de clientes COMPLETA
CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,

  -- Dados Básicos (já existentes)
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(11) UNIQUE NOT NULL,
  email VARCHAR(255),

  -- Dados Pessoais Adicionais
  data_nascimento DATE,
  estado_civil VARCHAR(50), -- Solteiro, Casado, Divorciado, Viúvo, União Estável, etc
  nacionalidade VARCHAR(100),
  cidade_nascimento VARCHAR(100),
  nome_mae VARCHAR(255),
  profissao VARCHAR(100),
  remuneracao DECIMAL(10, 2),

  -- Contatos
  telefone_residencial VARCHAR(20),
  telefone_comercial VARCHAR(20),
  telefone_celular VARCHAR(20) NOT NULL,
  telefone_celular_2 VARCHAR(20),

  -- Documentação
  tipo_documento VARCHAR(100),
  numero_documento VARCHAR(50),
  orgao_emissor VARCHAR(50),
  data_emissao DATE,

  -- Dados do Cônjuge
  cpf_conjuge VARCHAR(11),
  nome_conjuge VARCHAR(255),

  -- Endereço Completo
  cep VARCHAR(9),
  tipo_logradouro VARCHAR(50),
  endereco VARCHAR(255),
  numero_endereco VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),

  -- Dados de Pagamento - 1ª Parcela
  forma_pagamento_primeira VARCHAR(50), -- Boleto, Cartão de Crédito
  data_pre_datado DATE,
  valor_cheque DECIMAL(10, 2),
  numero_cheque VARCHAR(50),
  data_vencimento_cheque DATE,
  banco_cheque VARCHAR(100),
  agencia_cheque VARCHAR(20),
  conta_cheque VARCHAR(30),

  -- Dados de Pagamento - 2ª Parcela em diante
  forma_pagamento_demais VARCHAR(50), -- Débito Automático, Boleto, Cartão
  nome_correntista VARCHAR(255),
  cpf_correntista VARCHAR(11),
  banco_debito VARCHAR(100),
  agencia_debito VARCHAR(20),
  conta_debito VARCHAR(30),

  -- Seguro
  aceita_seguro BOOLEAN DEFAULT false,

  -- Dados do Consórcio (já existentes)
  valor_carta DECIMAL(10, 2),
  administradora VARCHAR(100),
  grupo VARCHAR(50),
  cota VARCHAR(50),
  observacao TEXT,

  -- Controle de Vendas
  etapa VARCHAR(50) NOT NULL DEFAULT 'novo_contato' CHECK (
    etapa IN ('novo_contato', 'proposta_enviada', 'negociacao', 'fechado', 'perdido')
  ),
  vendedor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para Segundo Titular (opcional)
CREATE TABLE clientes_segundo_titular (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,

  -- Dados Pessoais
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(11) NOT NULL,
  data_nascimento DATE,
  estado_civil VARCHAR(50),
  email VARCHAR(255),

  -- Contatos
  telefone_residencial VARCHAR(20),
  telefone_comercial VARCHAR(20),
  telefone_celular VARCHAR(20) NOT NULL,
  telefone_celular_2 VARCHAR(20),

  -- Documentação
  tipo_documento VARCHAR(100),
  numero_documento VARCHAR(50),
  orgao_emissor VARCHAR(50),
  data_emissao DATE,

  -- Dados Adicionais
  nacionalidade VARCHAR(100),
  cidade_nascimento VARCHAR(100),
  nome_mae VARCHAR(255),
  profissao VARCHAR(100),
  remuneracao DECIMAL(10, 2),

  -- Dados do Cônjuge
  cpf_conjuge VARCHAR(11),
  nome_conjuge VARCHAR(255),

  -- Endereço
  cep VARCHAR(9),
  tipo_logradouro VARCHAR(50),
  endereco VARCHAR(255),
  numero_endereco VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance
CREATE INDEX idx_clientes_vendedor_id ON clientes(vendedor_id);
CREATE INDEX idx_clientes_etapa ON clientes(etapa);
CREATE INDEX idx_clientes_cpf ON clientes(cpf);
CREATE INDEX idx_clientes_data_nascimento ON clientes(data_nascimento);
CREATE INDEX idx_clientes_estado_civil ON clientes(estado_civil);
CREATE INDEX idx_clientes_segundo_titular_cliente_id ON clientes_segundo_titular(cliente_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON clientes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
