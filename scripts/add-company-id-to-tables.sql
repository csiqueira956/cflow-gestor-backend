-- Migração: Adicionar company_id para isolamento multi-tenant
-- Data: 2025-11-19
-- Objetivo: Garantir isolamento completo de dados entre empresas

-- 1. Adicionar company_id na tabela equipes
ALTER TABLE equipes ADD COLUMN company_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE;
CREATE INDEX idx_equipes_company_id ON equipes(company_id);

-- 2. Adicionar company_id na tabela administradoras
ALTER TABLE administradoras ADD COLUMN company_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE;
CREATE INDEX idx_administradoras_company_id ON administradoras(company_id);

-- 3. Adicionar company_id na tabela metas
ALTER TABLE metas ADD COLUMN company_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE;
CREATE INDEX idx_metas_company_id ON metas(company_id);

-- 4. Adicionar company_id na tabela clientes (se não existir)
-- Nota: Verificar se já existe antes de executar
-- ALTER TABLE clientes ADD COLUMN company_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE;
-- CREATE INDEX idx_clientes_company_id ON clientes(company_id);

-- 5. Adicionar company_id na tabela comissoes
ALTER TABLE comissoes ADD COLUMN company_id INTEGER DEFAULT 1;
CREATE INDEX idx_comissoes_company_id ON comissoes(company_id);

-- 6. Adicionar company_id na tabela formularios_publicos (se não existir)
-- ALTER TABLE formularios_publicos ADD COLUMN company_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE;
-- CREATE INDEX idx_formularios_publicos_company_id ON formularios_publicos(company_id);

-- 7. Atualizar registros existentes para usar company_id=1 (empresa padrão)
-- IMPORTANTE: Isso atribui todos os dados existentes para a empresa ID 1
UPDATE equipes SET company_id = 1 WHERE company_id IS NULL;
UPDATE administradoras SET company_id = 1 WHERE company_id IS NULL;
UPDATE metas SET company_id = 1 WHERE company_id IS NULL;
UPDATE comissoes SET company_id = 1 WHERE company_id IS NULL;
UPDATE clientes SET company_id = 1 WHERE company_id IS NULL;
UPDATE usuarios SET company_id = 1 WHERE company_id IS NULL;

-- 8. Tornar company_id NOT NULL (após atualizar dados existentes)
-- Nota: SQLite não suporta ALTER COLUMN, então precisamos:
-- 1. Criar nova tabela com NOT NULL
-- 2. Copiar dados
-- 3. Dropar tabela antiga
-- 4. Renomear nova tabela
-- Por enquanto, deixamos como NULL permitido e adicionamos validação no backend

PRAGMA foreign_keys=ON;
