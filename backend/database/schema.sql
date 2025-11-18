-- Schema para o banco de dados PostgreSQL (Supabase)
-- Execute este script no SQL Editor do Supabase

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'vendedor' CHECK (role IN ('admin', 'vendedor')),
  tipo_usuario VARCHAR(50) CHECK (tipo_usuario IN ('interno', 'externo', 'parceiro')),
  percentual_comissao DECIMAL(5, 2),
  celular VARCHAR(20),
  equipe VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(11) UNIQUE,
  telefone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  valor_carta DECIMAL(10, 2),
  administradora VARCHAR(100),
  grupo VARCHAR(50),
  cota VARCHAR(50),
  observacao TEXT,
  etapa VARCHAR(50) NOT NULL DEFAULT 'novo_contato' CHECK (
    etapa IN ('novo_contato', 'proposta_enviada', 'negociacao', 'fechado', 'perdido')
  ),
  vendedor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de comissões
CREATE TABLE IF NOT EXISTS comissoes (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vendedor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  valor_venda DECIMAL(10, 2) NOT NULL,
  percentual_comissao DECIMAL(5, 2) NOT NULL,
  valor_comissao DECIMAL(10, 2) NOT NULL,
  numero_parcelas INTEGER DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (
    status IN ('pendente', 'em_pagamento', 'pago', 'cancelado')
  ),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de parcelas de comissão
CREATE TABLE IF NOT EXISTS parcelas_comissao (
  id SERIAL PRIMARY KEY,
  comissao_id INTEGER NOT NULL REFERENCES comissoes(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor_parcela DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE,
  data_pagamento DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (
    status IN ('pendente', 'pago', 'cancelado')
  ),
  observacao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(comissao_id, numero_parcela)
);

-- Índices para melhorar performance
CREATE INDEX idx_clientes_vendedor_id ON clientes(vendedor_id);
CREATE INDEX idx_clientes_etapa ON clientes(etapa);
CREATE INDEX idx_clientes_cpf ON clientes(cpf);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_comissoes_cliente_id ON comissoes(cliente_id);
CREATE INDEX idx_comissoes_vendedor_id ON comissoes(vendedor_id);
CREATE INDEX idx_comissoes_status ON comissoes(status);
CREATE INDEX idx_parcelas_comissao_id ON parcelas_comissao(comissao_id);
CREATE INDEX idx_parcelas_status ON parcelas_comissao(status);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON clientes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comissoes_updated_at
BEFORE UPDATE ON comissoes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parcelas_comissao_updated_at
BEFORE UPDATE ON parcelas_comissao
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Inserir usuário admin padrão (senha: admin123)
-- IMPORTANTE: Troque a senha após o primeiro login!
INSERT INTO usuarios (nome, email, senha_hash, role)
VALUES ('Administrador', 'admin@gestorconsorcios.com', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Inserir usuário vendedor de exemplo (senha: vendedor123)
INSERT INTO usuarios (nome, email, senha_hash, role)
VALUES ('Vendedor Exemplo', 'vendedor@gestorconsorcios.com', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'vendedor')
ON CONFLICT (email) DO NOTHING;

-- Dados de exemplo (opcional)
-- Inserir clientes de exemplo para o vendedor
-- INSERT INTO clientes (nome, cpf, telefone, email, valor_carta, administradora, grupo, cota, observacao, etapa, vendedor_id)
-- VALUES
--   ('João Silva', '12345678901', '(11) 98765-4321', 'joao@email.com', 25000.00, 'Honda', 'H001', '123', 'Cliente interessado em carro', 'novo_contato', 2),
--   ('Maria Santos', '98765432109', '(11) 91234-5678', 'maria@email.com', 30000.00, 'Embracon', 'E001', '456', 'Primeira proposta enviada', 'proposta_enviada', 2);
