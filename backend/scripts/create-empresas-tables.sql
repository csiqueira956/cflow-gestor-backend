-- Tabela de Empresas
CREATE TABLE IF NOT EXISTS empresas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  cnpj TEXT UNIQUE,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Planos/Pacotes
CREATE TABLE IF NOT EXISTS planos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  tipo_cobranca TEXT NOT NULL DEFAULT 'FIXED' CHECK(tipo_cobranca IN ('FIXED', 'PER_USER')),
  preco_fixo REAL DEFAULT 0,
  preco_por_usuario REAL DEFAULT 0,
  max_usuarios INTEGER,
  max_leads INTEGER,
  max_storage_gb INTEGER,
  features TEXT, -- JSON string com features
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Assinaturas
CREATE TABLE IF NOT EXISTS assinaturas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL UNIQUE,
  plano_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'TRIAL' CHECK(status IN ('ACTIVE', 'TRIAL', 'OVERDUE', 'CANCELLED', 'EXPIRED')),
  data_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_fim_trial DATETIME,
  data_proximo_vencimento DATETIME,
  data_cancelamento DATETIME,
  valor_mensal REAL NOT NULL DEFAULT 0,
  usuarios_contratados INTEGER DEFAULT 1,
  observacoes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plano_id) REFERENCES planos(id) ON DELETE RESTRICT
);

-- Tabela de Histórico de Pagamentos
CREATE TABLE IF NOT EXISTS pagamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assinatura_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  valor REAL NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')),
  metodo_pagamento TEXT,
  referencia_externa TEXT,
  observacoes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assinatura_id) REFERENCES assinaturas(id) ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_empresas_status ON empresas(status);
CREATE INDEX IF NOT EXISTS idx_empresas_email ON empresas(email);
CREATE INDEX IF NOT EXISTS idx_assinaturas_company ON assinaturas(company_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON assinaturas(status);
CREATE INDEX IF NOT EXISTS idx_assinaturas_plano ON assinaturas(plano_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_assinatura ON pagamentos(assinatura_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_company ON pagamentos(company_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);

-- Inserir planos padrão
INSERT OR IGNORE INTO planos (id, nome, descricao, tipo_cobranca, preco_fixo, preco_por_usuario, max_usuarios, max_leads, max_storage_gb, features) VALUES
(1, 'Básico', 'Plano básico com recursos essenciais', 'FIXED', 99.90, 0, 5, 100, 5, '["CRM básico", "Relatórios simples", "Suporte email"]'),
(2, 'Profissional', 'Plano profissional com recursos avançados', 'FIXED', 299.90, 0, 20, 500, 20, '["CRM completo", "Relatórios avançados", "Suporte prioritário", "Integrações"]'),
(3, 'Empresarial', 'Plano empresarial ilimitado', 'PER_USER', 0, 42.90, NULL, NULL, 100, '["CRM completo", "Relatórios personalizados", "Suporte 24/7", "API", "White label"]'),
(4, 'Trial', 'Plano de teste gratuito por 14 dias', 'FIXED', 0, 0, 3, 50, 2, '["CRM básico", "Relatórios simples"]');

-- Criar empresa demo (company_id = 1) se não existir
INSERT OR IGNORE INTO empresas (id, nome, email, status) VALUES
(1, 'Empresa Demo', 'admin@gestorconsorcios.com', 'ACTIVE');

-- Criar assinatura para empresa demo se não existir
INSERT OR IGNORE INTO assinaturas (company_id, plano_id, status, data_fim_trial, valor_mensal, usuarios_contratados) VALUES
(1, 4, 'TRIAL', datetime('now', '+14 days'), 0, 3);
