-- Script para verificar se todas as tabelas necessárias existem no Supabase

SELECT
  table_name,
  CASE
    WHEN table_name IN ('notifications') THEN '❌ FALTANDO'
    ELSE '✅ OK'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verificar se a tabela notifications existe
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'notifications'
    )
    THEN '✅ Tabela notifications existe'
    ELSE '❌ Tabela notifications NÃO existe - PRECISA CRIAR'
  END as verificacao_notifications;

-- Listar todas as tabelas que existem
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
