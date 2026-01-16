-- SQL CORRIGIDO: Criar formulário de teste

-- Verificar estrutura da tabela primeiro
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'formularios_publicos'
ORDER BY ordinal_position;

-- Criar formulário de teste (versão corrigida)
INSERT INTO formularios_publicos (
  vendedor_id,
  token,
  titulo,
  descricao,
  ativo,
  created_at
)
SELECT
  u.id as vendedor_id,
  'TESTE-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8) as token,
  'Formulário de Teste - Cliente Público' as titulo,
  'Use este formulário para cadastrar novos clientes' as descricao,
  true as ativo,
  NOW() as created_at
FROM usuarios u
LIMIT 1
RETURNING
  id,
  token,
  titulo,
  ativo,
  'https://cflow-gestor-frontend.vercel.app/formulario/' || token as link_completo;
