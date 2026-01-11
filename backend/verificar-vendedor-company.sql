-- Verificar se o vendedor tem company_id

-- 1. Ver qual vendedor está associado ao formulário
SELECT
  f.id as formulario_id,
  f.token,
  f.vendedor_id,
  u.nome as vendedor_nome,
  u.email as vendedor_email,
  u.company_id,
  CASE
    WHEN u.company_id IS NULL THEN '❌ SEM COMPANY_ID'
    ELSE '✅ TEM COMPANY_ID'
  END as status_company
FROM formularios_publicos f
JOIN usuarios u ON u.id = f.vendedor_id
WHERE f.token = 'TESTE-5aa93135';

-- 2. Ver todos os usuários e seus company_id
SELECT
  id,
  nome,
  email,
  company_id,
  CASE
    WHEN company_id IS NULL THEN '❌ PRECISA ATUALIZAR'
    ELSE '✅ OK'
  END as status
FROM usuarios
ORDER BY id;

-- 3. Ver todas as companies
SELECT * FROM companies;

-- 4. SOLUÇÃO: Atualizar vendedor com company_id
-- (Execute este SQL SOMENTE se o vendedor não tiver company_id)
/*
UPDATE usuarios
SET company_id = (SELECT id FROM companies LIMIT 1)
WHERE id = 1 AND company_id IS NULL;
*/
