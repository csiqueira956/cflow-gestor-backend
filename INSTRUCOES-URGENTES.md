# ⚡ Instruções Urgentes - Corrigir Erros

**Data:** 10 de Janeiro de 2026 - 20:05

---

## ✅ SQL Corrigido - Execute Agora!

O erro era que `company_id` precisa ser **UUID**, não INTEGER.

### 📋 **Passo a Passo:**

1. **Acesse o Supabase:**
   - https://supabase.com/dashboard
   - Selecione o projeto: `cflow-gestor`

2. **Vá em "SQL Editor"**
   - Menu lateral esquerdo → **SQL Editor**

3. **Copie e cole este SQL:**

```sql
-- Criar tabela notifications (CORRIGIDO - company_id UUID)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT,
  icone VARCHAR(50),
  cor VARCHAR(20),
  link VARCHAR(500),
  lida BOOLEAN DEFAULT false,
  lida_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  lida_em TIMESTAMP,
  expira_em TIMESTAMP,
  metadados JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_lida ON notifications(lida);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expira_em ON notifications(expira_em);
```

4. **Clique em "RUN"**

5. **Esperado:**
   ```
   Success. No rows returned
   ```

---

## 🧪 Verificar se Funcionou

Execute este SQL para confirmar:

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
```

**Esperado:** Deve listar todas as colunas, incluindo:
- `company_id` → tipo: `uuid` ✅

---

## 🎯 Testar no Sistema

Após executar o SQL:

1. **Acesse:** https://cflow-gestor-frontend.vercel.app
2. **Faça login**
3. **Clique no sino 🔔**
4. **Abra Console (F12)**
5. **Esperado:**
   - ✅ SEM erro 500 em `/api/notifications/unread-count`
   - ✅ Retorna: `{"success": true, "count": 0}`

---

## 🔴 Se Ainda Der Erro

**Se aparecer outro erro:**

1. **Copie a mensagem de erro completa**
2. **Me envie aqui**
3. **Vou corrigir imediatamente**

---

## 📋 Próximo Problema: "Erro ao cadastrar cliente"

Após resolver as notificações, vamos investigar o erro do formulário.

**Precisarei que você:**

1. Acesse: https://vercel.com/caiques-projects-9d471ca7/cflow-gestor-backend/logs
2. Filtre: últimos 30 minutos
3. Procure: "Erro ao submeter formulário"
4. Me envie o log completo

**OU:**

Teste manualmente e capture o erro:

1. Abra um formulário público
2. Preencha e envie
3. Console (F12) → Aba "Network"
4. Clique na requisição `POST submit`
5. Copie a resposta (aba "Response")
6. Me envie

---

## ⏱️ Resumo

1. ✅ **AGORA:** Execute o SQL corrigido no Supabase
2. 🧪 **Depois:** Teste as notificações
3. 🔍 **Próximo:** Capturar logs do erro "cadastrar cliente"

---

**Me avise quando executar o SQL e qual foi o resultado!** 🚀
