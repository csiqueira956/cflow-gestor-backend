-- Migration: Adicionar role 'gerente' e campo equipe_id (SQLite compatible)
-- Data: 2025-11-07

-- SQLite não suporta ALTER TABLE ADD COLUMN IF NOT EXISTS diretamente
-- Mas podemos usar uma abordagem diferente

-- 1. Adicionar coluna equipe_id que referencia a tabela equipes
-- SQLite permite ADD COLUMN, mas não tem IF NOT EXISTS
-- Vamos tentar adicionar, e se falhar, ignoramos
PRAGMA foreign_keys = OFF;

-- Criar tabela temporária com a nova estrutura
CREATE TABLE IF NOT EXISTS usuarios_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendedor' CHECK(role IN ('admin', 'gerente', 'vendedor')),
  tipo_usuario TEXT,
  percentual_comissao REAL,
  celular TEXT,
  equipe TEXT,  -- Manter por compatibilidade
  equipe_id INTEGER REFERENCES equipes(id) ON DELETE SET NULL,  -- Nova coluna
  link_publico TEXT UNIQUE,
  foto_perfil TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copiar dados da tabela antiga para a nova (se a nova for diferente)
INSERT OR IGNORE INTO usuarios_new (id, nome, email, senha_hash, role, tipo_usuario, percentual_comissao, celular, equipe, link_publico, foto_perfil, created_at)
SELECT id, nome, email, senha_hash, role, tipo_usuario, percentual_comissao, celular, equipe, link_publico, foto_perfil, created_at
FROM usuarios;

-- Remover tabela antiga e renomear
DROP TABLE IF EXISTS usuarios_old_backup;
ALTER TABLE usuarios RENAME TO usuarios_old_backup;
ALTER TABLE usuarios_new RENAME TO usuarios;

PRAGMA foreign_keys = ON;

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_usuarios_equipe_id ON usuarios(equipe_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
