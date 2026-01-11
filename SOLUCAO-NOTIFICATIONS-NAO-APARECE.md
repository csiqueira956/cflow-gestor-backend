# 🔧 Solução: Backend não vê tabela `notifications`

**Problema:** SQL executou com sucesso ("Success. No rows returned"), mas backend continua retornando:
```
relation "notifications" does not exist
```

---

## 🔍 Diagnóstico

Execute este SQL no Supabase para diagnosticar:

### 1️⃣ **Verificar se a tabela existe:**

```sql
SELECT
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'notifications';
```

**Resultado esperado:**
```
table_schema | table_name    | table_type
-------------|---------------|------------
public       | notifications | BASE TABLE
```

**Se retornar 0 linhas:** A tabela NÃO foi criada (execute o SQL novamente)

**Se retornar com schema diferente de `public`:** Esse é o problema!

---

### 2️⃣ **Verificar todas as tabelas no schema public:**

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Esperado:** Deve aparecer `notifications` na lista junto com `companies`, `usuarios`, `clientes`, etc.

---

### 3️⃣ **Verificar qual database está conectado:**

```sql
SELECT current_database(), current_schema();
```

**Esperado:**
```
current_database | current_schema
-----------------|---------------
postgres         | public
```

---

## ✅ Soluções Possíveis

### **Solução 1: Recriar a tabela explicitamente no schema public**

Se a tabela não apareceu, execute:

```sql
-- Dropar se existir em outro lugar
DROP TABLE IF EXISTS notifications CASCADE;

-- Criar explicitamente no schema public
CREATE TABLE public.notifications (
  id SERIAL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT,
  icone VARCHAR(50),
  cor VARCHAR(20),
  link VARCHAR(500),
  lida BOOLEAN DEFAULT false,
  lida_por INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
  lida_em TIMESTAMP,
  expira_em TIMESTAMP,
  metadados JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX idx_notifications_lida ON public.notifications(lida);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_expira_em ON public.notifications(expira_em);
```

---

### **Solução 2: Verificar se você está no projeto correto**

No Supabase:

1. **Verifique o Project URL** no canto superior esquerdo
2. Confirme que é o mesmo projeto do `DATABASE_URL` no Vercel
3. Vá em **Settings → Database** e compare:
   - Host
   - Database name
   - Port

---

### **Solução 3: Forçar restart das funções Vercel**

Após criar a tabela, as funções serverless do Vercel podem estar em cache.

**Opção A: Trigger deploy vazio**

```bash
cd /Users/caiquesiqueira/Documents/Projetos/cflow-gestor/backend
echo "# Deploy trigger: $(date +%s)" >> src/index.js
git add src/index.js
git commit -m "chore: Force redeploy to clear serverless cache"
git push
```

**Opção B: Restart manual no Vercel**

1. Acesse: https://vercel.com/caiques-projects-9d471ca7/cflow-gestor-backend
2. Vá em **Deployments**
3. Clique nos **3 pontinhos** do deployment ativo
4. **Redeploy**

---

### **Solução 4: Verificar se DATABASE_URL está correto**

No Vercel:

1. Acesse: https://vercel.com/caiques-projects-9d471ca7/cflow-gestor-backend/settings/environment-variables
2. Verifique se `DATABASE_URL` aponta para o Supabase correto
3. Compare com a connection string do Supabase:
   - Supabase → **Settings → Database → Connection String**
   - Modo: **Transaction pooler** (porta 6543)

---

## 🧪 Como Testar Após Aplicar Solução

### Teste 1: Verificar tabela existe
```sql
SELECT COUNT(*) FROM public.notifications;
```
**Esperado:** `0` (sem erros)

### Teste 2: Inserir registro teste
```sql
INSERT INTO public.notifications (company_id, tipo, titulo, mensagem)
VALUES (
  (SELECT id FROM companies LIMIT 1),
  'teste',
  'Teste de notificação',
  'Se você vê isso, funcionou!'
);
```
**Esperado:** `INSERT 0 1`

### Teste 3: Consultar
```sql
SELECT * FROM public.notifications;
```
**Esperado:** Deve retornar 1 linha

### Teste 4: Testar no sistema
1. Acesse: https://cflow-gestor-frontend.vercel.app
2. Faça login
3. Clique no sino 🔔
4. Abra Console (F12)
5. **Esperado:** SEM erro 500

---

## 📋 Checklist

Execute nesta ordem:

- [ ] 1. Execute SQL de diagnóstico (query 1, 2, 3)
- [ ] 2. Verifique se tabela aparece em `public.notifications`
- [ ] 3. Se NÃO aparecer: Execute SQL de recriação (Solução 1)
- [ ] 4. Verifique se está no projeto Supabase correto (Solução 2)
- [ ] 5. Force redeploy do backend (Solução 3)
- [ ] 6. Aguarde 2 minutos para deploy concluir
- [ ] 7. Teste no sistema (abra o sino 🔔)
- [ ] 8. Verifique logs do Vercel (deve parar de aparecer erro 500)

---

## 🚨 Se Nada Funcionar

**Me envie:**

1. **Resultado do SQL de diagnóstico:**
   ```sql
   SELECT table_schema, table_name
   FROM information_schema.tables
   WHERE table_name = 'notifications';
   ```

2. **Connection String do Supabase:**
   - Supabase → Settings → Database → Connection String (Transaction pooler)
   - **CENSURE A SENHA** antes de enviar!

3. **DATABASE_URL do Vercel:**
   - Vercel → Settings → Environment Variables
   - **CENSURE A SENHA** antes de enviar!

4. **Screenshot do Supabase:**
   - Mostrando a lista de tabelas no SQL Editor

---

**⏱️ Comece pelo diagnóstico (SQL queries 1, 2, 3) e me envie os resultados!**
