# ⚡ AÇÕES URGENTES - Execute Agora

**Data:** 10 de Janeiro de 2026 - 20:15

---

## 🎯 **O QUE VOCÊ PRECISA FAZER**

### ✅ **Passo 1: Execute Este SQL no Supabase**

1. **Acesse:** https://supabase.com/dashboard
2. **Vá em:** SQL Editor
3. **Cole e execute:**

```sql
-- Deletar e recriar do zero
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE public.notifications (
  id SERIAL PRIMARY KEY,
  company_id UUID NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT,
  icone VARCHAR(50),
  cor VARCHAR(20),
  link VARCHAR(500),
  lida BOOLEAN DEFAULT false,
  lida_por INTEGER,
  lida_em TIMESTAMP,
  expira_em TIMESTAMP,
  metadados JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.notifications
  ADD CONSTRAINT fk_notifications_company
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  ADD CONSTRAINT fk_notifications_lida_por
  FOREIGN KEY (lida_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;

CREATE INDEX idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX idx_notifications_lida ON public.notifications(lida);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_expira_em ON public.notifications(expira_em);

-- Inserir registro de teste
INSERT INTO public.notifications (company_id, tipo, titulo, mensagem)
VALUES (
  (SELECT id FROM companies LIMIT 1),
  'sistema',
  'Notificações ativadas',
  'Sistema de notificações está funcionando!'
);

-- Verificar
SELECT COUNT(*) as total FROM public.notifications;
```

4. **Clique em:** RUN
5. **Esperado:** Deve retornar `total: 1` no final

---

## 🚀 **Passo 2: Já Fiz Por Você!**

✅ Forcei redeploy do backend (commit `881b175`)
✅ Deploy está em andamento no Vercel
✅ Aguarde 2-3 minutos

---

## 🧪 **Passo 3: Teste Após 3 Minutos**

### Teste no SQL (confirmar tabela existe):
```sql
SELECT * FROM public.notifications;
```
**Esperado:** 1 registro

### Teste no Sistema:
1. Acesse: https://cflow-gestor-frontend.vercel.app
2. Faça login
3. Clique no sino 🔔
4. Abra Console (F12)
5. **Esperado:** SEM erro 500 em `/api/notifications/unread-count`

---

## 📊 **Status**

| Item | Status | Detalhes |
|------|--------|----------|
| SQL corrigido | ✅ | UUID em company_id |
| SQL forçado criado | ✅ | DROP + CREATE explícito |
| Redeploy backend | 🔄 | Em andamento (commit `881b175`) |
| Tabela notifications | ⏳ | **VOCÊ PRECISA EXECUTAR O SQL** |

---

## 🔴 **Se Der Erro ao Executar SQL**

**Me envie:**

1. **A mensagem de erro completa**
2. **Qual SQL você executou**
3. **Screenshot do erro**

**Possíveis erros:**

### Erro: "companies" não existe
```
Solução: Execute primeiro:
SELECT id FROM companies LIMIT 1;
```

Se retornar vazio, significa que não tem companies. Nesse caso, execute o SQL SEM o INSERT:

```sql
-- Apenas criar a tabela (sem inserir)
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE public.notifications (
  id SERIAL PRIMARY KEY,
  company_id UUID NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT,
  icone VARCHAR(50),
  cor VARCHAR(20),
  link VARCHAR(500),
  lida BOOLEAN DEFAULT false,
  lida_por INTEGER,
  lida_em TIMESTAMP,
  expira_em TIMESTAMP,
  metadados JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.notifications
  ADD CONSTRAINT fk_notifications_company
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  ADD CONSTRAINT fk_notifications_lida_por
  FOREIGN KEY (lida_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;

CREATE INDEX idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX idx_notifications_lida ON public.notifications(lida);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_expira_em ON public.notifications(expira_em);
```

---

## 📋 Resumo

1. ✅ **AGORA:** Execute o SQL no Supabase
2. ⏳ **AGUARDE:** 3 minutos para backend deploy concluir
3. 🧪 **TESTE:** Clique no sino 🔔 e veja se parou os erros 500
4. 📞 **ME AVISE:** O resultado (funcionou ou qual erro apareceu)

---

## 📚 **Arquivos Criados**

| Arquivo | Descrição |
|---------|-----------|
| [create-notifications-FORCE.sql](backend/create-notifications-FORCE.sql) | SQL completo para recriar tabela |
| [diagnostico-notifications.sql](backend/diagnostico-notifications.sql) | SQLs de diagnóstico |
| [SOLUCAO-NOTIFICATIONS-NAO-APARECE.md](SOLUCAO-NOTIFICATIONS-NAO-APARECE.md) | Guia completo de troubleshooting |
| [ACOES-URGENTES-AGORA.md](ACOES-URGENTES-AGORA.md) | Este arquivo |

---

**⏱️ EXECUTE O SQL AGORA E ME AVISE O RESULTADO EM 3 MINUTOS!** 🚀
