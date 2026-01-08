# Registro Automático de Admin com Empresa

## O que mudou?

Agora, ao registrar um usuário com `role: 'admin'`, **a empresa é criada automaticamente** junto com o usuário.

Isso garante que **todo banco de dados fica dividido** por empresa desde o momento do cadastro.

## Como funciona

### 1. Registrar Admin (cria empresa automaticamente)

**Endpoint**: `POST /api/auth/register`

**Body**:
```json
{
  "nome": "João Silva",
  "email": "joao@email.com",
  "senha": "senha123",
  "role": "admin",
  "empresa_nome": "Minha Empresa Ltda",
  "empresa_email": "contato@minhaempresa.com",
  "empresa_telefone": "(11) 98765-4321"
}
```

**Campos obrigatórios para admin**:
- `nome` - Nome do usuário admin
- `email` - Email do usuário admin
- `senha` - Senha do usuário admin
- `role` - DEVE ser `"admin"`
- `empresa_nome` - Nome da empresa (OBRIGATÓRIO para admins)

**Campos opcionais**:
- `empresa_email` - Email da empresa (se não fornecido, usa o email do admin)
- `empresa_telefone` - Telefone da empresa

**Resposta de sucesso**:
```json
{
  "message": "Admin e empresa criados com sucesso",
  "usuario": {
    "id": 15,
    "nome": "João Silva",
    "email": "joao@email.com",
    "role": "admin",
    "company_id": 8
  },
  "empresa": {
    "id": 8,
    "nome": "Minha Empresa Ltda"
  }
}
```

**O que acontece automaticamente**:
1. ✅ Cria a empresa na tabela `empresas`
2. ✅ Cria o usuário admin vinculado à empresa (`company_id`)
3. ✅ Cria uma assinatura TRIAL de 14 dias
4. ✅ Empresa fica com status `ACTIVE`

### 2. Registrar Vendedor/Gerente (requer company_id existente)

**Endpoint**: `POST /api/auth/register`

**Body**:
```json
{
  "nome": "Maria Santos",
  "email": "maria@email.com",
  "senha": "senha123",
  "role": "vendedor",
  "company_id": 8,
  "tipo_usuario": "interno",
  "percentual_comissao": 5.0,
  "celular": "(11) 91234-5678",
  "equipe": 3
}
```

**Para vendedores/gerentes**:
- `company_id` - ID da empresa existente (OBRIGATÓRIO)
- NÃO informar `empresa_nome` (será ignorado)

## Isolamento de Dados

### Como funciona o isolamento

Quando um admin é criado:
```
Empresa ID 8 criada
   └─ Admin criado com company_id = 8
   └─ Assinatura TRIAL criada para empresa 8
```

Quando vendedores são criados para essa empresa:
```
Empresa ID 8
   ├─ Admin (company_id = 8)
   ├─ Vendedor 1 (company_id = 8)
   └─ Vendedor 2 (company_id = 8)
```

### Todas as tabelas são isoladas

Quando qualquer usuário da Empresa 8 faz queries:
- `equipes` - Só vê equipes da Empresa 8
- `administradoras` - Só vê administradoras da Empresa 8
- `metas` - Só vê metas da Empresa 8
- `clientes` - Só vê clientes da Empresa 8
- `comissoes` - Só vê comissões da Empresa 8
- `usuarios` - Só vê usuários da Empresa 8

**IMPOSSÍVEL** ver dados de outras empresas!

## Exemplos de Uso

### Exemplo 1: Criar Admin Completo

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Carlos Admin",
    "email": "carlos@empresa.com",
    "senha": "SenhaSegura123",
    "role": "admin",
    "empresa_nome": "Empresa XYZ",
    "empresa_email": "contato@xyz.com",
    "empresa_telefone": "(11) 3456-7890"
  }'
```

**Resultado**:
- Empresa "Empresa XYZ" criada (ID: 9)
- Admin "Carlos Admin" criado (company_id: 9)
- Assinatura TRIAL de 14 dias criada

### Exemplo 2: Adicionar Vendedor à Empresa

Primeiro, o admin faz login e cria um vendedor:

```bash
# 1. Login do admin (pegar token)
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "carlos@empresa.com", "senha": "SenhaSegura123"}' \
  | jq -r '.token')

# 2. Criar vendedor (company_id é herdado do token)
curl -X POST http://localhost:3001/api/usuarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nome": "Vendedor José",
    "email": "jose@empresa.com",
    "senha": "senha123",
    "role": "vendedor",
    "tipo_usuario": "interno",
    "percentual_comissao": 5.0
  }'
```

### Exemplo 3: Criar Múltiplas Empresas

```bash
# Empresa 1
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Admin Empresa A",
    "email": "admin@empresaa.com",
    "senha": "senha123",
    "role": "admin",
    "empresa_nome": "Empresa A"
  }'

# Empresa 2
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Admin Empresa B",
    "email": "admin@empresab.com",
    "senha": "senha123",
    "role": "admin",
    "empresa_nome": "Empresa B"
  }'

# Empresa 3
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Admin Empresa C",
    "email": "admin@empresac.com",
    "senha": "senha123",
    "role": "admin",
    "empresa_nome": "Empresa C"
  }'
```

**Resultado**: 3 empresas totalmente isoladas, cada uma com seu admin e trial de 14 dias.

## Validações

### Erros Comuns

#### 1. Admin sem empresa_nome
```json
{
  "error": "Para criar um admin, é necessário informar o nome da empresa (empresa_nome)"
}
```

**Solução**: Adicionar `empresa_nome` no body.

#### 2. Email de empresa duplicado
```json
{
  "error": "Já existe uma empresa com este email"
}
```

**Solução**: Usar outro email para a empresa.

#### 3. Email de usuário duplicado
```json
{
  "error": "Email já cadastrado"
}
```

**Solução**: Usar outro email para o usuário.

## Diferenças: Admin vs Super Admin

### Admin (admin)
- ✅ Criado via `/api/auth/register` com `role: "admin"`
- ✅ Cria empresa automaticamente
- ✅ Vinculado a UMA empresa específica (`company_id`)
- ✅ Pode gerenciar APENAS sua própria empresa
- ✅ Recebe assinatura TRIAL de 14 dias
- ❌ NÃO pode ver dados de outras empresas
- ❌ NÃO pode criar outras empresas

### Super Admin (super_admin)
- ✅ Criado manualmente (ver `scripts/create-super-admin.md`)
- ✅ NÃO vinculado a nenhuma empresa (`company_id = NULL`)
- ✅ Pode gerenciar TODAS as empresas
- ✅ Acesso às rotas `/api/admin/assinaturas/*`
- ✅ Pode criar novas empresas
- ✅ Pode alterar status de assinaturas
- ⚠️  Use apenas 1-2 super admins (mínimo necessário)

## Verificar Isolamento

Execute o script de verificação:

```bash
cd /Users/caiquesiqueira/Documents/Projetos/cflow-gestor/backend
node scripts/verify-data-isolation.js
```

Ou use o script bash:

```bash
bash scripts/verify-isolation.sh
```

**Resultado esperado**: ✅ Todos os testes passam, confirma isolamento perfeito.

## Fluxo Completo: Do Zero à Empresa Funcionando

### 1. Criar Admin + Empresa
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Ana Silva",
    "email": "ana@minhaempresa.com",
    "senha": "SenhaForte123",
    "role": "admin",
    "empresa_nome": "Minha Startup"
  }'
```

### 2. Login do Admin
```bash
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ana@minhaempresa.com", "senha": "SenhaForte123"}' \
  | jq -r '.token')
```

### 3. Criar Equipe
```bash
curl -X POST http://localhost:3001/api/equipes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"nome": "Equipe Vendas", "descricao": "Time de vendas"}'
```

### 4. Criar Vendedor
```bash
curl -X POST http://localhost:3001/api/usuarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nome": "Pedro Vendedor",
    "email": "pedro@minhaempresa.com",
    "senha": "senha123",
    "role": "vendedor",
    "tipo_usuario": "interno",
    "percentual_comissao": 5.0,
    "equipe": 1
  }'
```

### 5. Criar Meta
```bash
curl -X POST http://localhost:3001/api/metas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "mes_referencia": "2025-01",
    "valor_meta": 100000,
    "descricao": "Meta Janeiro 2025"
  }'
```

**Pronto!** Empresa funcionando com isolamento total de dados.

## Segurança

### Boas Práticas

1. **Senhas Fortes** - Mínimo 8 caracteres, letras e números
2. **Emails Únicos** - Cada admin precisa de email único
3. **Validar Empresa** - Sempre verificar se empresa_nome foi fornecido
4. **Trial Automático** - Todos admins começam com 14 dias trial
5. **Isolamento Garantido** - Cada empresa só vê seus dados

### Logs

Os logs mostram claramente quando empresa é criada:

```
🏢 Criando empresa automaticamente para novo admin
✅ Empresa criada - ID: 10
✅ Assinatura trial criada para a empresa
✅ Usuário admin criado - ID: 25, Company: 10
```

## Troubleshooting

### Problema: Admin criado mas sem company_id

**Diagnóstico**:
```bash
sqlite3 database/gestor-consorcios.db "SELECT id, nome, email, role, company_id FROM usuarios WHERE email = 'admin@email.com';"
```

**Solução**: O admin DEVE ter company_id. Se não tiver, foi criado de forma incorreta.

### Problema: Vendedor vendo dados de outra empresa

**Diagnóstico**:
```bash
node scripts/verify-data-isolation.js
```

**Solução**: Se aparecer ❌, há queries sem filtro de company_id. Revisar controllers.

## Conclusão

Com esta implementação:
- ✅ Admins criam empresas automaticamente
- ✅ Banco de dados fica totalmente dividido
- ✅ Isolamento completo entre empresas
- ✅ Trial de 14 dias automático
- ✅ Segurança multi-tenant garantida

**Impossível** um admin ver dados de outra empresa!
