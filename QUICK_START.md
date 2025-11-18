# 🚀 Quick Start - Gestor de Consórcios

Guia rápido para começar a usar o sistema em **5 minutos**.

---

## ⚡ Instalação Rápida

### Passo 1: Clone e Execute Setup

**Linux/macOS:**
```bash
git clone <url-do-repositorio>
cd gestor-consorcios
chmod +x setup.sh
./setup.sh
```

**Windows (PowerShell como Administrador):**
```powershell
git clone <url-do-repositorio>
cd gestor-consorcios
.\setup.ps1
```

O script irá:
- ✅ Instalar todas as dependências
- ✅ Criar arquivos `.env` configurados
- ✅ Configurar banco de dados

---

### Passo 2: Inicie os Servidores

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Você verá:
```
🚀 Servidor rodando na porta 3001
📍 URL: http://localhost:3001
✅ Conectado ao banco de dados SQLite local
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Você verá:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

---

### Passo 3: Acesse e Teste

1. **Abra o navegador**: http://localhost:3000

2. **Faça login com credenciais de teste:**
   - **Admin**: `admin@gestorconsorcios.com` / `admin123`
   - **Vendedor**: `vendedor@gestorconsorcios.com` / `vendedor123`

3. **Explore o sistema:**
   - 📊 Dashboard com métricas
   - 🎯 Kanban de vendas (arraste e solte!)
   - 💰 Sistema de comissões
   - 👥 Gestão de clientes

---

## 🔧 Configuração Opcional (Recomendada)

### Habilitar Recuperação de Senha

Para testar a recuperação de senha, configure o email:

**1. Obtenha uma senha de app do Gmail:**
- Acesse: https://myaccount.google.com/apppasswords
- Ative verificação em 2 etapas
- Gere uma senha de app

**2. Edite `backend/.env`:**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=xxxx-xxxx-xxxx-xxxx  # Senha de app (16 caracteres)
EMAIL_FROM_NAME=Gestor de Consórcios
EMAIL_FROM_EMAIL=seu-email@gmail.com
```

**3. Reinicie o backend** (Ctrl+C e `npm run dev` novamente)

**4. Teste:**
- Acesse: http://localhost:3000/esqueci-senha
- Digite seu email
- Verifique sua caixa de entrada

---

## 📚 Próximos Passos

### Para Desenvolvedores

```bash
# Ver estrutura do projeto
tree -I 'node_modules'

# Rodar com hot reload (já habilitado)
# Backend: nodemon detecta mudanças automaticamente
# Frontend: Vite hot reload automático

# Acessar banco de dados SQLite
cd backend/database
sqlite3 gestor-consorcios.db
> .tables
> SELECT * FROM usuarios;
```

### Para Testes

1. **Leia o guia completo**: [GUIA_DE_TESTES.md](GUIA_DE_TESTES.md)
2. **Teste funcionalidades principais:**
   - Login/Logout
   - CRUD de clientes
   - Drag & drop no Kanban
   - Recuperação de senha
   - Documentos legais

### Para Deploy em Produção

1. **Configure PostgreSQL**: [MIGRATION_POSTGRESQL.md](MIGRATION_POSTGRESQL.md)
2. **Configure email profissional**: [CONFIGURACAO_SMTP.md](CONFIGURACAO_SMTP.md)
3. **Siga o guia de deploy**: [DEPLOY_PRODUCTION.md](DEPLOY_PRODUCTION.md)

---

## 🐛 Problemas Comuns

### Porta 3001 já em uso

```bash
# Linux/macOS
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Porta 3000 já em uso

```bash
# Linux/macOS
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Erro "Cannot find module"

```bash
# Reinstale dependências
cd backend && rm -rf node_modules && npm install
cd ../frontend && rm -rf node_modules && npm install
```

### Banco de dados corrompido

```bash
# Delete e reinicie (dados de teste serão recriados)
rm backend/database/gestor-consorcios.db
# Reinicie o backend - tabelas serão criadas automaticamente
```

---

## 🎯 Funcionalidades Principais

### 1. Dashboard
- Métricas em tempo real
- Cards clicáveis
- Filtros por vendedor (admin)

### 2. Kanban de Vendas
- 5 colunas: Novo Contato → Proposta → Negociação → Fechado → Perdido
- **Arraste e solte** clientes entre colunas
- **Cadastro rápido** direto no Kanban
- Modal de detalhes por cliente

### 3. Gestão de Clientes
- Cadastro completo com todos os dados
- Validação de CPF
- Máscaras de telefone e valores
- Filtros e busca

### 4. Sistema de Comissões
- CRUD completo
- Parcelamento automático
- Controle de pagamentos
- Datas de vencimento

### 5. Formulários Públicos
- Link único por vendedor
- Captação de leads sem login
- Notificação por email
- Integração automática com o sistema

### 6. Recuperação de Senha 🆕
- Solicite por email
- Token seguro (1 hora)
- Email HTML profissional
- Uso único

---

## 🔐 Segurança (v2.0)

O sistema implementa:

✅ **Autenticação JWT** com tokens seguros
✅ **Rate Limiting** (5 tentativas de login/15min)
✅ **Criptografia bcrypt** para senhas
✅ **Validação de inputs** (XSS protection)
✅ **Headers HTTP seguros** (Helmet.js)
✅ **Tokens de recuperação** criptografados
✅ **CORS configurado** corretamente
✅ **LGPD compliant** (Documentos legais)

---

## 📱 Acesso

| Serviço | URL Local | Produção |
|---------|-----------|----------|
| Frontend | http://localhost:3000 | Configurar no deploy |
| Backend API | http://localhost:3001 | Configurar no deploy |
| Banco SQLite | `backend/database/gestor-consorcios.db` | PostgreSQL |

---

## 🆘 Precisa de Ajuda?

1. **Documentação completa**: Veja [README.md](README.md)
2. **Guia de testes**: [GUIA_DE_TESTES.md](GUIA_DE_TESTES.md)
3. **Configurar email**: [CONFIGURACAO_SMTP.md](CONFIGURACAO_SMTP.md)
4. **Deploy produção**: [DEPLOY_PRODUCTION.md](DEPLOY_PRODUCTION.md)
5. **Changelog**: [CHANGELOG.md](CHANGELOG.md)

---

## ✅ Checklist de Validação

Depois de iniciar, valide se tudo está funcionando:

- [ ] Backend rodando em http://localhost:3001
- [ ] Frontend rodando em http://localhost:3000
- [ ] Login funciona (admin@gestorconsorcios.com / admin123)
- [ ] Dashboard carrega com métricas
- [ ] Kanban exibe colunas
- [ ] Drag & drop funciona
- [ ] Modal de cadastro abre
- [ ] Documentos legais acessíveis (/termos-de-uso, /politica-privacidade)
- [ ] Toggle de senha funciona
- [ ] Link "Esqueci minha senha" aparece

Se todos os itens estão ✅, você está pronto! 🎉

---

## 🚀 Boa Sorte!

**Dica**: Abra o DevTools (F12) no navegador para ver logs e debugar se necessário.

**Versão**: 2.0.0
**Última atualização**: ${new Date().toLocaleDateString('pt-BR')}
