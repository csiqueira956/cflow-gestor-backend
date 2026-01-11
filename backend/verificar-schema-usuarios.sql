-- Script para verificar schema da tabela usuarios no Supabase
-- Execute no SQL Editor do Supabase

-- 1. Verificar se a coluna 'ativo' existe e seu tipo
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'usuarios'
  AND column_name = 'ativo';

-- 2. Se não existir, criar a coluna como BOOLEAN
-- ALTER TABLE usuarios ADD COLUMN ativo BOOLEAN DEFAULT true;

-- 3. Se existir mas for INTEGER, converter para BOOLEAN
-- Para converter INTEGER (0/1) para BOOLEAN:
-- ALTER TABLE usuarios
-- ALTER COLUMN ativo TYPE BOOLEAN
-- USING CASE WHEN ativo = 1 THEN true ELSE false END;

-- 4. Verificar valores atuais da coluna ativo
SELECT
  id,
  nome,
  ativo,
  pg_typeof(ativo) as tipo_coluna
FROM usuarios
LIMIT 10;
