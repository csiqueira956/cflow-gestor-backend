-- Schema para o banco de dados PostgreSQL (Supabase)
-- Execute este script no SQL Editor do Supabase
-- Este script é seguro para executar múltiplas vezes

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'vendedor' CHECK (role IN ('admin', 'vendedor')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(11) UNIQUE NOT NULL,
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

-- Índices para melhorar performance (ignora se já existem)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clientes_vendedor_id') THEN
    CREATE INDEX idx_clientes_vendedor_id ON clientes(vendedor_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clientes_etapa') THEN
    CREATE INDEX idx_clientes_etapa ON clientes(etapa);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clientes_cpf') THEN
    CREATE INDEX idx_clientes_cpf ON clientes(cpf);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_usuarios_email') THEN
    CREATE INDEX idx_usuarios_email ON usuarios(email);
  END IF;
END $$;

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

-- Inserir usuário admin padrão (senha: admin123)
-- IMPORTANTE: Troque a senha após o primeiro login!
INSERT INTO usuarios (nome, email, senha_hash, role)
VALUES ('Administrador', 'admin@gestorconsorcios.com', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Inserir usuário vendedor de exemplo (senha: vendedor123)
INSERT INTO usuarios (nome, email, senha_hash, role)
VALUES ('Vendedor Exemplo', 'vendedor@gestorconsorcios.com', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'vendedor')
ON CONFLICT (email) DO NOTHING;
