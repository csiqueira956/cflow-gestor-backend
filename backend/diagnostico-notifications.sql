-- DIAGNÓSTICO: Por que o backend não vê a tabela notifications?

-- 1. Verificar se a tabela existe e em qual schema
SELECT
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'notifications';

-- 2. Verificar TODAS as tabelas no schema public
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 3. Verificar a estrutura da tabela notifications (se existir)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- 4. Verificar qual é o schema padrão (search_path)
SHOW search_path;

-- 5. Verificar qual database estamos conectados
SELECT current_database();

-- 6. Tentar acessar a tabela diretamente
SELECT COUNT(*) as total_notifications FROM notifications;

-- 7. Tentar com schema explícito
SELECT COUNT(*) as total_notifications_public FROM public.notifications;
