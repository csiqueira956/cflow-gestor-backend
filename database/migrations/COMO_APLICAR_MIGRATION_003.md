# 🚀 Como Aplicar a Migration 003 no Supabase

## Passo a Passo

### 1. Acesse o Supabase Dashboard

```
https://app.supabase.com
```

1. Faça login
2. Selecione seu projeto (CFLOW Gestor)
3. No menu lateral, clique em **SQL Editor**

### 2. Crie Nova Query

1. Clique em **"+ New query"**
2. Dê um nome: `003_add_plan_limits_columns`

### 3. Cole o Conteúdo da Migration

Copie TODO o conteúdo do arquivo:
```
backend/database/migrations/003_add_plan_limits_columns.sql
```

E cole no SQL Editor.

### 4. Execute a Migration

1. Clique em **"Run"** (ou pressione Ctrl/Cmd + Enter)
2. Aguarde a execução (deve levar ~5 segundos)
3. Verifique se apareceu: ✅ **Success. No rows returned**

### 5. Verifique os Resultados

Você deve ver 2 tabelas de resultado na parte inferior:

#### Tabela 1: Planos com Limites
```
| name       | max_usuarios | max_leads | max_storage_gb |
|------------|--------------|-----------|----------------|
| Basic      | 10           | 100       | 10             |
| Pro        | 50           | 500       | 50             |
| Enterprise | NULL         | NULL      | NULL           |
```

#### Tabela 2: Companies com Limites Atualizados
```
| company_nome | max_users | max_leads | max_storage_gb | plan_name |
|--------------|-----------|-----------|----------------|-----------|
| ...          | 10        | 100       | 10             | Basic     |
```

### 6. Validação Manual (Opcional)

Execute estas queries para confirmar:

```sql
-- Verificar estrutura da tabela plans
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'plans'
  AND column_name IN ('max_usuarios', 'max_leads', 'max_storage_gb')
ORDER BY column_name;

-- Resultado esperado:
-- max_leads       | integer | YES
-- max_storage_gb  | integer | YES
-- max_usuarios    | integer | YES
```

```sql
-- Verificar estrutura da tabela companies
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'companies'
  AND column_name = 'max_storage_gb';

-- Resultado esperado:
-- max_storage_gb  | integer | YES
```

---

## ⚠️ Possíveis Problemas

### Problema 1: Erro "column already exists"

**Causa**: Migration já foi aplicada anteriormente.

**Solução**: Tudo bem! Os campos já existem. Pule para a validação.

### Problema 2: Erro "table plans does not exist"

**Causa**: Você está no banco errado ou as migrations anteriores não foram aplicadas.

**Solução**:
1. Confirme que está no projeto correto do Supabase
2. Execute primeiro: `001_add_multitenancy.sql` e `002_integrate_with_admin_saas.sql`

### Problema 3: Erro "permission denied"

**Causa**: Usuário sem permissões suficientes.

**Solução**:
1. Use o SQL Editor do Supabase (tem permissões de service_role)
2. OU conecte via psql com credenciais de service_role

---

## ✅ Confirmação de Sucesso

Após executar a migration, você deve ter:

1. ✅ Tabela `plans` com 3 novas colunas
2. ✅ Tabela `companies` com 1 nova coluna
3. ✅ Trigger `update_company_limits_on_subscription_change` atualizado
4. ✅ Planos Basic, Pro e Enterprise com limites definidos
5. ✅ Companies existentes sincronizadas com limites dos seus planos

---

## 🧪 Teste Rápido

Após aplicar, teste se funciona:

```bash
# No terminal do backend
cd backend
npm run dev

# Em outro terminal, teste o endpoint
curl -X GET http://localhost:5000/api/assinatura/uso \
  -H "Authorization: Bearer SEU_TOKEN"

# Deve retornar limites corretamente:
{
  "usage": {
    "usuarios": { "limite": 10, ... },
    "leads": { "limite": 100, ... },
    "storage": { "limit_gb": 10, ... }
  }
}
```

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs de erro do Supabase
2. Confirme que as migrations anteriores (001 e 002) foram aplicadas
3. Consulte: [ANALISE_SISTEMA_LIMITES.md](../../ANALISE_SISTEMA_LIMITES.md)
