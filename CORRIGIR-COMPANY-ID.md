# 🔴 URGENTE - Vendedor Sem company_id

**Erro:** `null value in column "company_id" of relation "clientes" violates not-null constraint`

**Problema:** O vendedor associado ao formulário **NÃO TEM `company_id`** definido.

---

## 🔍 **DIAGNÓSTICO**

Execute este SQL no Supabase para verificar:

```sql
-- Ver se o vendedor tem company_id
SELECT
  u.id,
  u.nome,
  u.email,
  u.company_id,
  CASE
    WHEN u.company_id IS NULL THEN '❌ SEM COMPANY_ID'
    ELSE '✅ TEM COMPANY_ID'
  END as status
FROM usuarios u
WHERE u.id = 1;
```

**Se retornar `company_id: null`** → Esse é o problema!

---

## ✅ **SOLUÇÃO RÁPIDA**

### **Opção A: Atualizar o vendedor com company_id**

Execute este SQL:

```sql
-- Atualizar vendedor com a primeira company disponível
UPDATE usuarios
SET company_id = (SELECT id FROM companies LIMIT 1)
WHERE id = 1;

-- Verificar se atualizou
SELECT id, nome, company_id FROM usuarios WHERE id = 1;
```

**Esperado:** Deve retornar o vendedor com `company_id` preenchido

---

### **Opção B: Verificar se existe company**

Se o SQL acima der erro, pode ser que não exista nenhuma company. Execute:

```sql
-- Ver se existe alguma company
SELECT * FROM companies;
```

**Se retornar 0 linhas:** Precisa criar uma company primeiro!

**Execute:**
```sql
-- Criar company
INSERT INTO companies (nome, cnpj, email, telefone, plano_id)
VALUES (
  'Empresa Teste',
  '12.345.678/0001-90',
  'contato@empresa.com',
  '(11) 99999-9999',
  1  -- ID do plano (assumindo que existe plano_id=1)
)
RETURNING id, nome;

-- Depois atualizar o vendedor
UPDATE usuarios
SET company_id = (SELECT id FROM companies ORDER BY created_at DESC LIMIT 1)
WHERE id = 1;
```

---

## 🧪 **APÓS EXECUTAR O SQL:**

1. **Recarregue** a página do formulário

2. **Preencha** novamente os campos:
   - Nome: João da Silva
   - CPF: 123.456.789-00
   - Email: teste@example.com
   - Celular: (11) 98765-4321

3. **Clique em "Enviar"**

4. **Esperado:**
   ```
   ✅ "Formulário enviado com sucesso!"
   ```

---

## 📊 **Por Que Isso Aconteceu?**

O sistema CFLOW é multi-tenant (várias empresas no mesmo banco).

Cada registro precisa estar associado a uma `company`:
- `usuarios` → tem `company_id`
- `clientes` → tem `company_id`
- `formularios_publicos` → vendedor tem `company_id`

Quando o formulário é submetido:
1. Busca o vendedor do formulário
2. Pega o `company_id` do vendedor
3. Salva o cliente com esse `company_id`

**Se o vendedor não tem `company_id` → ERRO!**

---

## 🎯 **Próximos Passos**

1. **Execute** o SQL de diagnóstico (Opção A)
2. **Se necessário**, crie a company (Opção B)
3. **Teste** o formulário novamente
4. **Me avise** o resultado!

---

**Execute o SQL e me diga o que retornou!** 🔍
