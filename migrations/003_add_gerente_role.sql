-- Migration: Adicionar role 'gerente' e campo equipe_id
-- Data: 2025-11-07

-- 1. Adicionar coluna equipe_id que referencia a tabela equipes
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS equipe_id INTEGER REFERENCES equipes(id) ON DELETE SET NULL;

-- 2. Comentário na tabela para documentar mudança
COMMENT ON COLUMN usuarios.equipe_id IS 'Referência à equipe do usuário (gerentes e vendedores)';
COMMENT ON COLUMN usuarios.equipe IS 'DEPRECATED: Usar equipe_id. Campo texto mantido por compatibilidade.';

-- 3. Atualizar a constraint de role para aceitar 'gerente'
-- Primeiro remove a constraint antiga se existir
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;

-- Adiciona nova constraint com os 3 roles: admin, gerente, vendedor
ALTER TABLE usuarios ADD CONSTRAINT usuarios_role_check
  CHECK (role IN ('admin', 'gerente', 'vendedor'));

-- 4. Criar índice para melhor performance nas consultas por equipe
CREATE INDEX IF NOT EXISTS idx_usuarios_equipe_id ON usuarios(equipe_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);
