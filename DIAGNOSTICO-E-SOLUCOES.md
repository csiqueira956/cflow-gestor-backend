# 🔍 Diagnóstico e Soluções - CFLOW Gestor

## ✅ Status do Backend

**Backend Vercel:** https://cflow-gestor-backend.vercel.app
- ✅ API está online e respondendo corretamente
- ✅ Endpoints `/api/formularios` funcionando (retorna 401 sem auth, como esperado)
- ✅ Rotas configuradas corretamente no [index.js](backend/src/index.js)

---

## ❌ Problema 1: Erro 404 com `/api/api/` (Path Duplicado)

### Sintoma
Os logs do Vercel mostram requisições para:
```
GET /api/api/notifications/unread-count -> 404
```

### Diagnóstico
O frontend está fazendo requisições com o prefixo `/api/` duplicado. Isso acontece quando:
- O frontend tem uma `baseURL` do axios configurada com `/api`
- E depois adiciona `/api/notifications/...` nas chamadas

### Solução
**No código do FRONTEND**, localize a configuração do axios (geralmente em `src/services/api.js` ou similar):

```javascript
// ❌ ERRADO - causa duplicação
const api = axios.create({
  baseURL: '/api'  // ou process.env.VITE_API_URL + '/api'
});

// Depois quando você faz:
api.get('/api/notifications/unread-count')  // Resulta em /api/api/notifications/...

// ✅ CORRETO - Escolha UMA das opções:

// Opção 1: baseURL com /api, rotas SEM /api
const api = axios.create({
  baseURL: process.env.VITE_API_URL + '/api'  // https://cflow-gestor-backend.vercel.app/api
});
api.get('/notifications/unread-count')  // ✅ /api/notifications/unread-count

// Opção 2: baseURL sem /api, rotas COM /api
const api = axios.create({
  baseURL: process.env.VITE_API_URL  // https://cflow-gestor-backend.vercel.app
});
api.get('/api/notifications/unread-count')  // ✅ /api/notifications/unread-count
```

### Arquivos para verificar no FRONTEND:
- `src/services/api.js`
- `src/config/axios.js`
- `src/api/index.js`
- Qualquer arquivo que configure o axios

---

## ❌ Problema 2: "Meu Link" não está gerando links

### Sintoma
A aba "Meu Link" não gera o link do formulário público.

### Diagnóstico
O backend precisa da variável `FRONTEND_URL` para gerar o link correto:

```javascript
// backend/src/controllers/formularioPublicoController.js (linha 20)
link: `${process.env.FRONTEND_URL}/formulario/${formulario.token}`
```

### Solução

#### 1. Verificar se FRONTEND_URL está configurada no Vercel

No dashboard do Vercel (projeto backend):
1. Acesse o projeto `cflow-gestor-backend`
2. Vá em **Settings** > **Environment Variables**
3. Verifique se existe a variável `FRONTEND_URL`

**Valor esperado:**
```
FRONTEND_URL = https://cflow-gestor-frontend.vercel.app
```

#### 2. Se não existir, adicione:
```bash
# No terminal (se tiver Vercel CLI instalado):
vercel env add FRONTEND_URL

# Ou adicione manualmente no dashboard do Vercel
```

#### 3. Depois de adicionar, faça redeploy:
```bash
# No repositório backend:
git commit --allow-empty -m "Trigger redeploy with FRONTEND_URL"
git push
```

Ou no dashboard do Vercel, clique em **Deployments** > **Redeploy**.

---

## 🧪 Como testar se está funcionando

### Teste 1: Verificar Backend
```bash
# Endpoint raiz
curl https://cflow-gestor-backend.vercel.app/

# Formulários (deve retornar 401 sem token)
curl https://cflow-gestor-backend.vercel.app/api/formularios

# Este deve retornar 404 (path errado)
curl https://cflow-gestor-backend.vercel.app/api/api/notifications/unread-count
```

### Teste 2: Criar Formulário Público

1. Faça login no sistema: https://cflow-gestor-frontend.vercel.app
2. Vá na aba "Meu Link"
3. Clique em "Criar Novo Link"
4. O sistema deve gerar um link no formato:
   ```
   https://cflow-gestor-frontend.vercel.app/formulario/[TOKEN-GERADO]
   ```

### Teste 3: Verificar Console do Navegador

Abra o DevTools (F12) e veja se há erros:
- ❌ Se aparecer erro `404` em `/api/api/...` → Problema de duplicação de path (ver Problema 1)
- ❌ Se o link gerado for `undefined/formulario/[TOKEN]` → Falta FRONTEND_URL no backend

---

## 📋 Checklist de Verificação

Backend (Vercel):
- [x] Deploy funcionando
- [x] Rotas `/api/formularios` configuradas
- [ ] FRONTEND_URL configurada nas variáveis de ambiente
- [ ] Redeploy após adicionar FRONTEND_URL

Frontend (Vercel):
- [ ] baseURL do axios configurada corretamente (SEM duplicação de /api/)
- [ ] VITE_API_URL apontando para https://cflow-gestor-backend.vercel.app
- [ ] Console do navegador SEM erros 404 em /api/api/

Database (Supabase):
- [x] Conexão funcionando
- [x] Tabela `formularios_publicos` existe
- [x] Queries corrigidas para PostgreSQL

---

## 🔗 Links Úteis

- **Backend:** https://cflow-gestor-backend.vercel.app
- **Frontend:** https://cflow-gestor-frontend.vercel.app
- **Dashboard Vercel Backend:** https://vercel.com/caiques-projects-9d471ca7/cflow-gestor-backend
- **Dashboard Vercel Frontend:** https://vercel.com/caiques-projects-9d471ca7/cflow-gestor-frontend
- **Supabase Dashboard:** https://supabase.com/dashboard/project/eirxxvnyjbdfkghlmszj

---

## 📞 Próximos Passos

1. **Corrigir o path duplicado `/api/api/` no frontend**
   - Localizar configuração do axios
   - Remover duplicação de prefixo

2. **Verificar e adicionar FRONTEND_URL no backend**
   - Acessar Vercel > Settings > Environment Variables
   - Adicionar: `FRONTEND_URL = https://cflow-gestor-frontend.vercel.app`
   - Fazer redeploy

3. **Testar "Meu Link"**
   - Login no sistema
   - Criar novo formulário público
   - Verificar se o link é gerado corretamente

4. **Verificar logs**
   - Backend: https://vercel.com/caiques-projects-9d471ca7/cflow-gestor-backend/logs
   - Frontend: Console do navegador (F12)
