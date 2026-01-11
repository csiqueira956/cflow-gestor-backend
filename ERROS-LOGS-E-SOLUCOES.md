# 🔴 Erros nos Logs do Vercel - Diagnóstico e Soluções

**Data:** 10 de Janeiro de 2026 - 20:00
**Status:** 🔧 EM CORREÇÃO

---

## 📋 Resumo dos Erros Identificados

| # | Erro | Impacto | Status |
|---|------|---------|--------|
| 1 | `relation "notifications" does not exist` | ⚠️  Alto - Notificações quebradas | 🔧 Corrigindo |
| 2 | "Erro ao cadastrar cliente" | ⚠️  Médio - Submit formulário falhando | 🔍 Investigando |

---

## 🔴 Erro #1: Tabela `notifications` não existe

### 📊 Logs do Erro
```
GET /api/notifications/unread-count → 500
Erro: relation "notifications" does not exist
```

**Arquivo:** [notificationController.js:68-74](backend/src/controllers/notificationController.js#L68-L74)

**Causa Raiz:**
A tabela `notifications` nunca foi criada no Supabase PostgreSQL.

### ✅ Solução

1. **Executar SQL no Supabase:**

Acesse: https://supabase.com/dashboard/project/[SEU_PROJECT_ID]/editor

Execute o script: [create-notifications-table.sql](backend/create-notifications-table.sql)

```sql
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

CREATE INDEX idx_notifications_company_id ON notifications(company_id);
CREATE INDEX idx_notifications_lida ON notifications(lida);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_expira_em ON notifications(expira_em);
```

**⚠️ IMPORTANTE:** `company_id` é do tipo **UUID**, não INTEGER!

2. **Verificar se criou corretamente:**

Execute: [verificar-tabelas.sql](backend/verificar-tabelas.sql)

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'notifications';
```

**Esperado:** Deve retornar 1 linha com `notifications`

### 🧪 Como Testar Após Criar a Tabela

1. Acesse: https://cflow-gestor-frontend.vercel.app
2. Faça login
3. Clique no sino 🔔 de notificações
4. Abra Console (F12)
5. **Esperado:** SEM erro 500 em `/api/notifications/unread-count`
6. **Esperado:** Retorna `{"success": true, "count": 0}`

---

## 🔴 Erro #2: "Erro ao cadastrar cliente"

### 📊 Logs do Erro
```
Mensagem: "Erro ao cadastrar cliente. Tente novamente."
```

**Arquivo:** Formulário público não consegue submeter dados

**Possíveis Causas:**
1. Erro ao criar cliente no banco
2. Erro de validação de dados
3. Erro ao incrementar contador de formulários
4. Erro ao enviar emails (não deveria bloquear)

### 🔍 Investigação Necessária

**Ações:**
1. Verificar logs completos do backend no Vercel
2. Testar rota manualmente com Postman/Thunder Client
3. Verificar se tabela `clientes` tem todas as colunas necessárias

**Rota:**
```
POST /api/formularios/:token/submit
```

**Payload Esperado:**
```json
{
  "nome": "João Silva",
  "cpf": "123.456.789-00",
  "email": "joao@example.com",
  "telefone_celular": "(11) 98765-4321",
  "data_nascimento": "1990-01-15",
  ...
}
```

### 🧪 Como Testar

1. Acesse um formulário público (ex: `https://cflow-gestor-frontend.vercel.app/formulario/ABC123`)
2. Preencha os campos obrigatórios:
   - Nome completo
   - CPF
   - Telefone celular
3. Clique em "Enviar"
4. Abra Console (F12) → Aba "Network"
5. Procure a requisição `POST submit`
6. Veja o erro retornado

---

## 📊 Checklist de Correções

### Imediato (fazer agora)
- [ ] ✅ Criar tabela `notifications` no Supabase
- [ ] 🧪 Testar notificações após criar tabela
- [ ] 🔍 Capturar logs detalhados do erro "cadastrar cliente"
- [ ] 🔍 Verificar schema da tabela `clientes`

### Após Correções
- [ ] ✅ Notificações funcionando (sem erro 500)
- [ ] ✅ Formulário público submetendo com sucesso
- [ ] ✅ Emails sendo enviados (verificar logs)
- [ ] ✅ Cliente aparecendo na lista de clientes

---

## 🚀 Próximos Passos

### 1. Executar SQL no Supabase (PRIORITÁRIO)

**Tempo:** 2 minutos

1. Acesse: https://supabase.com/dashboard
2. Vá em "SQL Editor"
3. Copie e execute: [create-notifications-table.sql](backend/create-notifications-table.sql)
4. Clique em "RUN"
5. **Esperado:** `Success. No rows returned`

### 2. Capturar Logs Detalhados do Submit

**Tempo:** 3 minutos

1. Acesse: https://vercel.com/[seu-usuario]/cflow-gestor-backend/logs
2. Filtre por: últimos 30 minutos
3. Procure por: "Erro ao submeter formulário"
4. Copie o stack trace completo
5. Me envie o erro

### 3. Testar Notificações

Após criar a tabela:

1. Acesse o sistema
2. Clique no sino 🔔
3. Console (F12) → SEM erros 500
4. Confirme que funciona

---

## 📞 Se Precisar de Ajuda

**Se encontrar problemas:**

1. **Erro ao executar SQL:**
   - Verifique se você tem permissões de admin no Supabase
   - Copie a mensagem de erro exata
   - Me envie

2. **Erro persiste após criar tabela:**
   - Aguarde 30 segundos (cache do Vercel)
   - Recarregue a página com Ctrl+F5
   - Teste novamente

3. **Formulário ainda não submete:**
   - Capture os logs do backend
   - Abra Console (F12) → Aba Network
   - Copie a resposta do erro
   - Me envie

---

## 🎯 Impacto das Correções

**Quando corrigido:**
- ✅ Notificações funcionando normalmente
- ✅ Formulários públicos aceitando submissões
- ✅ Clientes sendo cadastrados automaticamente
- ✅ Emails enviados para vendedor e cliente
- ✅ Sistema 100% funcional

---

**⏱️ AÇÃO IMEDIATA: Execute o SQL para criar a tabela `notifications`!**
