-- Schema para SQLite
-- Banco de dados local sem necessidade de servidor externo

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendedor' CHECK (role IN ('admin', 'vendedor')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  valor_carta REAL,
  administradora TEXT,
  grupo TEXT,
  cota TEXT,
  observacao TEXT,
  etapa TEXT NOT NULL DEFAULT 'novo_contato' CHECK (
    etapa IN ('novo_contato', 'proposta_enviada', 'negociacao', 'fechado', 'em_comissionamento', 'perdido')
  ),
  vendedor_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendedor_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_clientes_vendedor_id ON clientes(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_clientes_etapa ON clientes(etapa);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER IF NOT EXISTS update_clientes_updated_at
AFTER UPDATE ON clientes
FOR EACH ROW
BEGIN
  UPDATE clientes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Inserir usuário admin padrão (senha: admin123)
-- IMPORTANTE: Troque a senha após o primeiro login!
INSERT OR IGNORE INTO usuarios (nome, email, senha_hash, role)
VALUES ('Administrador', 'admin@gestorconsorcios.com', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'admin');

-- Inserir usuário vendedor de exemplo (senha: vendedor123)
INSERT OR IGNORE INTO usuarios (nome, email, senha_hash, role)
VALUES ('Vendedor Exemplo', 'vendedor@gestorconsorcios.com', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'vendedor');

-- Tabela de comissões
CREATE TABLE IF NOT EXISTS comissoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  vendedor_id INTEGER NOT NULL,
  valor_venda REAL NOT NULL,
  percentual_comissao REAL NOT NULL,
  valor_comissao REAL NOT NULL,
  numero_parcelas INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_pagamento', 'pago')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (vendedor_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabela de parcelas de comissão
CREATE TABLE IF NOT EXISTS parcelas_comissao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comissao_id INTEGER NOT NULL,
  numero_parcela INTEGER NOT NULL,
  valor_parcela REAL NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
  observacao TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comissao_id) REFERENCES comissoes(id) ON DELETE CASCADE
);

-- Índices para comissões
CREATE INDEX IF NOT EXISTS idx_comissoes_cliente_id ON comissoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_vendedor_id ON comissoes(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_status ON comissoes(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_comissao_comissao_id ON parcelas_comissao(comissao_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_comissao_status ON parcelas_comissao(status);

-- Trigger para atualizar updated_at em comissões
CREATE TRIGGER IF NOT EXISTS update_comissoes_updated_at
AFTER UPDATE ON comissoes
FOR EACH ROW
BEGIN
  UPDATE comissoes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
