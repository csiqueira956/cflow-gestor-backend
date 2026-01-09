-- Script para corrigir strings vazias em campos numéricos
-- Execute este script no SQL Editor do Supabase

-- Verificar tipo dos campos
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'clientes' AND column_name = 'valor_carta';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'metas' AND column_name = 'valor_meta';

-- Se valor_carta for TEXT ou VARCHAR, corrigir strings vazias
UPDATE clientes
SET valor_carta = NULL
WHERE CAST(valor_carta AS TEXT) = '' OR valor_carta IS NULL;

-- Se valor_meta for TEXT ou VARCHAR, corrigir strings vazias
UPDATE metas
SET valor_meta = NULL
WHERE CAST(valor_meta AS TEXT) = '' OR valor_meta IS NULL;
