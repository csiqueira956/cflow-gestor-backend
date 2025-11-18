-- Criar tabela para rastrear formulários públicos
CREATE TABLE IF NOT EXISTS formularios_publicos (
  id SERIAL PRIMARY KEY,
  token VARCHAR(100) UNIQUE NOT NULL,
  vendedor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(255),
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  total_preenchimentos INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- Criar índice
CREATE INDEX idx_formularios_publicos_token ON formularios_publicos(token);
CREATE INDEX idx_formularios_publicos_vendedor ON formularios_publicos(vendedor_id);
