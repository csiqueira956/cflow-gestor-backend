# 🔍 Capturar Erro "Cadastrar Cliente"

**Problema:** "Erro ao cadastrar cliente. Tente novamente."

O erro está acontecendo, mas não vejo o log completo do backend nos logs que você me enviou.

---

## 📋 **Como Capturar o Erro Completo**

### **Método 1: Logs do Vercel Backend (MAIS FÁCIL)**

1. **Acesse:** https://vercel.com/caiques-projects-9d471ca7/cflow-gestor-backend/logs

2. **Configure o filtro:**
   - **Time range:** Last 30 minutes
   - **Search:** Digite `"Erro ao submeter formulário"`

3. **Teste o formulário:**
   - Abra o formulário público em outra aba
   - Preencha os dados
   - Clique em "Enviar"
   - **AGUARDE** aparecer o erro

4. **Volte para os logs do Vercel:**
   - Clique em **Refresh** (atualizar)
   - Procure pelo log mais recente com "Erro ao submeter formulário"
   - **COPIE TODO O TEXTO** do erro (incluindo stack trace)
   - **ME ENVIE AQUI**

---

### **Método 2: Console do Navegador (ALTERNATIVO)**

1. **Abra o formulário público:**
   - Ex: `https://cflow-gestor-frontend.vercel.app/formulario/[TOKEN]`

2. **Abra Console (F12):**
   - Vá na aba **"Network"**
   - Deixe aberto

3. **Preencha o formulário:**
   - Nome: Teste
   - CPF: 123.456.789-00
   - Celular: (11) 98765-4321
   - Email: teste@example.com

4. **Clique em "Enviar"**

5. **Na aba Network:**
   - Procure pela requisição `POST submit`
   - Clique nela
   - Vá na aba **"Response"**
   - **COPIE O ERRO COMPLETO**
   - **ME ENVIE AQUI**

---

## 🔍 **O Que Estou Procurando**

Preciso ver **QUAL linha está falhando**:

### Possíveis causas:

1. **Erro ao buscar formulário:**
   ```
   "Formulário não encontrado" ou "Formulário desativado"
   ```

2. **Erro ao buscar vendedor:**
   ```
   "Vendedor não encontrado"
   ```

3. **Erro ao criar cliente no banco:**
   ```
   Stack trace com "Cliente.create" ou erro de SQL
   ```

4. **Erro de campo faltando:**
   ```
   "column X does not exist" ou "null value in column"
   ```

---

## 🧪 **Teste Manual Rápido**

Antes de capturar o erro, teste se o formulário está sendo encontrado:

### No Supabase SQL Editor:

```sql
-- Verificar se existe algum formulário ativo
SELECT id, token, titulo, ativo, vendedor_id
FROM formularios_publicos
WHERE ativo = true
ORDER BY created_at DESC
LIMIT 5;
```

**Esperado:** Deve retornar pelo menos 1 formulário ativo

### Teste com o token do formulário:

```sql
-- Substituir 'SEU_TOKEN' pelo token do formulário que você está testando
SELECT
  f.id,
  f.token,
  f.titulo,
  f.ativo,
  f.vendedor_id,
  u.nome as vendedor_nome,
  u.company_id
FROM formularios_publicos f
JOIN usuarios u ON u.id = f.vendedor_id
WHERE f.token = 'SEU_TOKEN';
```

**Esperado:** Deve retornar 1 linha com todos os dados

**Se retornar 0 linhas:** O token está errado ou o formulário foi deletado

---

## 📊 **Informações Úteis**

**Para me ajudar a diagnosticar, me envie:**

1. ✅ **URL completa do formulário** que você está testando
   - Ex: `https://cflow-gestor-frontend.vercel.app/formulario/abc123xyz`

2. ✅ **Token do formulário**
   - A parte depois de `/formulario/`

3. ✅ **Resultado do SQL** acima (teste com o token)

4. ✅ **Logs do backend** com o erro completo

5. ✅ **Resposta do POST submit** do Network (F12)

---

## ⚡ **Ações**

**O que fazer agora:**

1. Execute os SQLs de teste acima (verificar formulário existe)
2. Tente submeter o formulário novamente
3. Capture os logs do backend (Método 1)
4. OU capture a resposta do Network (Método 2)
5. Me envie tudo!

---

**Aguardando suas informações para diagnosticar!** 🔍
