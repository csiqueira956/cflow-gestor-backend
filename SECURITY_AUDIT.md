# Auditoria de Segurança - CFlow Gestor
**Data:** 2025-11-19
**Status:** Correções aplicadas + Novas vulnerabilidades identificadas

---

## 1. GUIA DE VERIFICAÇÃO - Isolamento de Dados (company_id)

### Como Confirmar que o Vazamento foi Corrigido

#### Teste 1: Criar Duas Contas Trial Diferentes

```bash
# 1. Criar primeira conta trial via Admin SaaS
# - Acesse o Admin SaaS
# - Crie conta "Empresa A" com email admin-a@teste.com

# 2. Criar segunda conta trial
# - Crie conta "Empresa B" com email admin-b@teste.com

# 3. Logar na Empresa A e adicionar dados de teste
# - Login com admin-a@teste.com
# - Criar 2 equipes: "Equipe Vendas A", "Equipe Marketing A"
# - Criar 2 administradoras: "Administradora A1", "Administradora A2"
# - Criar 2 clientes: "Cliente A1", "Cliente A2"
# - Criar 2 metas para o mês atual
# - Criar 1 comissão

# 4. Logar na Empresa B e adicionar dados diferentes
# - Login com admin-b@teste.com
# - Criar 2 equipes: "Equipe Vendas B", "Equipe Marketing B"
# - Criar 2 administradoras: "Administradora B1", "Administradora B2"
# - Criar 2 clientes: "Cliente B1", "Cliente B2"
# - Criar 2 metas para o mês atual
# - Criar 1 comissão

# 5. VERIFICAÇÃO - Logar novamente na Empresa A
# - Listar equipes: DEVE mostrar APENAS "Equipe Vendas A" e "Equipe Marketing A"
# - Listar administradoras: DEVE mostrar APENAS "Administradora A1" e "Administradora A2"
# - Listar clientes: DEVE mostrar APENAS "Cliente A1" e "Cliente A2"
# - Listar metas: DEVE mostrar APENAS as 2 metas da Empresa A
# - Listar comissões: DEVE mostrar APENAS a comissão da Empresa A
# - Dashboard: DEVE mostrar APENAS dados da Empresa A

# 6. VERIFICAÇÃO - Logar novamente na Empresa B
# - Repetir verificação acima, mas esperando ver APENAS dados da Empresa B
```

#### Teste 2: Verificar Queries no Banco de Dados

```bash
# Conectar ao banco SQLite
cd /Users/caiquesiqueira/Documents/Projetos/cflow-gestor/backend
sqlite3 database/gestor-consorcios.db

# Verificar que todas as tabelas têm company_id
.schema equipes
.schema administradoras
.schema metas
.schema clientes
.schema usuarios
.schema comissoes

# Verificar distribuição de dados por company_id
SELECT 'equipes' as tabela, company_id, COUNT(*) as total FROM equipes GROUP BY company_id;
SELECT 'administradoras' as tabela, company_id, COUNT(*) as total FROM administradoras GROUP BY company_id;
SELECT 'metas' as tabela, company_id, COUNT(*) as total FROM metas GROUP BY company_id;
SELECT 'clientes' as tabela, company_id, COUNT(*) as total FROM clientes GROUP BY company_id;
SELECT 'usuarios' as tabela, company_id, COUNT(*) as total FROM usuarios GROUP BY company_id;
SELECT 'comissoes' as tabela, company_id, COUNT(*) as total FROM comissoes GROUP BY company_id;

# Sair
.quit
```

#### Teste 3: Testar APIs Diretamente (com cURL ou Postman)

```bash
# 1. Fazer login e pegar token da Empresa A
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin-a@teste.com","senha":"SuaSenha123"}'

# Copiar o token retornado, exemplo: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 2. Testar listagem de clientes (deve retornar apenas clientes da Empresa A)
curl -X GET http://localhost:3001/api/clientes \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Verificar que o JSON retornado contém APENAS clientes da Empresa A

# 3. Repetir para outras entidades
curl -X GET http://localhost:3001/api/equipes \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

curl -X GET http://localhost:3001/api/administradoras \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

curl -X GET http://localhost:3001/api/metas \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

curl -X GET http://localhost:3001/api/comissoes \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

curl -X GET http://localhost:3001/api/dashboard/estatisticas \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# 4. Fazer login na Empresa B e repetir os testes
# Deve retornar APENAS dados da Empresa B
```

---

## 2. VULNERABILIDADES IDENTIFICADAS

### 🔴 CRÍTICO - Admin Cross-Company Access

**Localização:** [assinaturaController.js](backend/src/controllers/assinaturaController.js)

**Problema:** Administradores de uma empresa podem acessar e manipular dados de OUTRAS empresas através das rotas admin.

**Rotas Afetadas:**
- `GET /api/admin/assinaturas/todas` (linha 546-681)
- `GET /api/admin/assinaturas/empresa/:companyId` (linha 687-804)
- `POST /api/admin/assinaturas/alterar-status` (linha 810-862)
- `POST /api/admin/assinaturas/criar-empresa` (linha 868-1028)

**Código Vulnerável:**
```javascript
// Linha 546-553
export const getAllCompaniesSubscriptions = async (req, res) => {
  try {
    // Verificar se é admin
    if (req.usuario.role !== 'admin') {
      return res.status(403).json({
        error: 'Acesso negado. Apenas administradores podem acessar.'
      });
    }
    // ❌ PROBLEMA: Qualquer admin de qualquer empresa pode ver TODAS as empresas!
```

**Impacto:**
- Admin da Empresa A pode ver assinaturas, pagamentos e dados da Empresa B
- Admin pode alterar status de assinaturas de outras empresas
- Vazamento de informações financeiras sensíveis entre empresas

**Solução Recomendada:**
```javascript
// Opção 1: Criar role SUPER_ADMIN para admins da plataforma SaaS
export const getAllCompaniesSubscriptions = async (req, res) => {
  try {
    // Verificar se é SUPER_ADMIN (admin da plataforma SaaS)
    if (req.usuario.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado. Apenas super administradores.'
      });
    }
    // ...
  }
}

// Opção 2: Remover essas rotas do app principal e criar API separada
// Criar um painel admin separado que não usa o mesmo JWT
```

**Severidade:** 🔴 CRÍTICA
**Prioridade:** URGENTE - Corrigir antes de produção

---

### 🟡 MÉDIA - Rate Limiting Ausente

**Problema:** Não há proteção contra brute force em rotas de autenticação

**Rotas Afetadas:**
- `POST /api/auth/login`
- `POST /api/auth/request-password-reset`
- `POST /api/auth/reset-password`

**Impacto:**
- Ataques de força bruta em senhas
- DoS por requisições massivas

**Solução Recomendada:**
```bash
npm install express-rate-limit
```

```javascript
// backend/src/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 tentativas
  message: 'Muitas solicitações de reset. Tente novamente em 1 hora.',
});
```

```javascript
// Aplicar nas rotas
import { loginLimiter, resetPasswordLimiter } from '../middleware/rateLimiter.js';

router.post('/login', loginLimiter, login);
router.post('/request-password-reset', resetPasswordLimiter, requestPasswordReset);
```

**Severidade:** 🟡 MÉDIA
**Prioridade:** ALTA

---

### 🟡 MÉDIA - Vazamento de Informação em Mensagens de Erro

**Localização:** Vários controllers

**Problema:** Mensagens de erro revelam se emails/usuários existem no sistema

**Exemplos:**
```javascript
// authController.js linha 19
if (usuarioExistente) {
  return res.status(400).json({ error: 'Email já cadastrado' });
  // ❌ Revela que o email existe
}

// assinaturaController.js linha 919
if (emailCheck.rows && emailCheck.rows.length > 0) {
  return res.status(400).json({
    error: 'Já existe uma empresa com este email'
  });
  // ❌ Permite enumerar emails de empresas
}
```

**Impacto:**
- Permite enumerar usuários e emails cadastrados
- Facilita ataques de phishing direcionados

**Solução Recomendada:**
```javascript
// Usar mensagens genéricas
return res.status(400).json({
  error: 'Dados inválidos. Verifique as informações fornecidas.'
});

// Para password reset, já está correto (linha 191):
return res.json({
  message: 'Se o e-mail existir em nossa base, você receberá instruções de recuperação.'
});
```

**Severidade:** 🟡 MÉDIA
**Prioridade:** MÉDIA

---

### 🟢 BAIXA - Validação de Input Básica

**Problema:** Validações são feitas manualmente, propenso a erros

**Solução Recomendada:**
```bash
npm install joi
```

```javascript
// backend/src/validators/auth.validator.js
import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  senha: Joi.string().min(6).required()
});

export const registerSchema = Joi.object({
  nome: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  senha: Joi.string().min(6).pattern(/^(?=.*[A-Z])(?=.*[0-9])/).required()
    .messages({
      'string.pattern.base': 'Senha deve conter pelo menos uma letra maiúscula e um número'
    }),
  celular: Joi.string().pattern(/^\d{10,11}$/).optional()
});

// Middleware de validação
export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: error.details[0].message
    });
  }
  next();
};
```

**Severidade:** 🟢 BAIXA
**Prioridade:** BAIXA

---

### 🟢 BAIXA - JWT Secret Strength

**Problema:** Verificar se JWT_SECRET é forte o suficiente

**Localização:** `.env`

**Recomendação:**
```bash
# Gerar secret forte
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Adicionar ao .env
JWT_SECRET=sua_chave_super_secreta_gerada_aqui_com_64_bytes
```

**Severidade:** 🟢 BAIXA
**Prioridade:** MÉDIA

---

### 🟢 BAIXA - CORS Configuration

**Problema:** Verificar se CORS está configurado corretamente

**Verificação Necessária:** Checar se há configuração CORS no app.js/server.js

**Recomendação:**
```javascript
import cors from 'cors';

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

**Severidade:** 🟢 BAIXA
**Prioridade:** MÉDIA

---

### 🟢 BAIXA - File Upload Security (se aplicável)

**Localização:** Upload de `foto_perfil` mencionado no código

**Verificações Necessárias:**
1. Validação de tipo de arquivo (apenas imagens)
2. Limite de tamanho
3. Sanitização de nome de arquivo
4. Armazenamento seguro

**Recomendação:** Se houver upload, implementar:
```javascript
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: './uploads/avatars/',
  filename: (req, file, cb) => {
    // Gerar nome único e seguro
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas!'));
    }
  }
});
```

**Severidade:** 🟢 BAIXA (se implementado)
**Prioridade:** BAIXA

---

## 3. PONTOS POSITIVOS IDENTIFICADOS

### ✅ Segurança Implementada Corretamente

1. **Parameterized Queries** - Uso correto de `$1, $2, ?` previne SQL Injection
2. **Password Hashing** - bcrypt com salt rounds adequado (10)
3. **JWT Authentication** - Implementação correta com expiração de 7 dias
4. **Password Reset Flow** - Usa tokens com expiração
5. **HTTPS Ready** - Código preparado para HTTPS
6. **Multi-Tenant Isolation** - company_id implementado corretamente (após correções)

---

## 4. CHECKLIST DE SEGURANÇA PARA PRODUÇÃO

### Antes do Deploy

- [ ] Corrigir VULNERABILIDADE CRÍTICA - Admin Cross-Company Access
- [ ] Implementar rate limiting em rotas de autenticação
- [ ] Revisar mensagens de erro para evitar vazamento de informação
- [ ] Verificar força do JWT_SECRET (64+ caracteres aleatórios)
- [ ] Configurar CORS adequadamente
- [ ] Implementar logging de segurança (tentativas de login, acessos negados)
- [ ] Configurar HTTPS/SSL
- [ ] Implementar backup automático do banco de dados
- [ ] Revisar e limitar permissões de usuários
- [ ] Testar todos os endpoints com ferramentas de segurança (OWASP ZAP, Burp Suite)
- [ ] Implementar monitoramento de segurança
- [ ] Configurar alertas para atividades suspeitas
- [ ] Revisar dependências com `npm audit`
- [ ] Implementar CSP (Content Security Policy)
- [ ] Adicionar headers de segurança (Helmet.js)

### Configurações de Ambiente

```bash
# .env (produção)
NODE_ENV=production
JWT_SECRET=[gerar_chave_forte_64_chars]
DATABASE_URL=[database_url_seguro]
FRONTEND_URL=https://seudominio.com
ADMIN_SAAS_URL=https://admin.seudominio.com
ADMIN_API_KEY=[gerar_chave_forte]

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session
SESSION_SECRET=[gerar_chave_forte]
SESSION_TIMEOUT=3600000
```

### Implementar Helmet.js

```bash
npm install helmet
```

```javascript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## 5. RECOMENDAÇÕES ADICIONAIS

### Logging de Segurança

```javascript
// backend/src/middleware/securityLogger.js
import fs from 'fs';
import path from 'path';

export const logSecurityEvent = (event, req, details = {}) => {
  const log = {
    timestamp: new Date().toISOString(),
    event,
    ip: req.ip,
    user: req.user?.email || 'anonymous',
    company_id: req.user?.company_id || null,
    ...details
  };

  const logPath = path.join(__dirname, '../logs/security.log');
  fs.appendFileSync(logPath, JSON.stringify(log) + '\n');

  // Em produção, enviar para serviço de logging (Datadog, Sentry, etc)
};

// Usar em pontos críticos
logSecurityEvent('LOGIN_SUCCESS', req, { email: usuario.email });
logSecurityEvent('LOGIN_FAILED', req, { email, reason: 'invalid_password' });
logSecurityEvent('UNAUTHORIZED_ACCESS', req, { endpoint: req.path });
```

### Monitoramento de Anomalias

1. Múltiplas tentativas de login falhas
2. Tentativas de acesso a dados de outras empresas
3. Acessos fora do horário comercial
4. Mudanças em dados sensíveis (assinaturas, usuários)

---

## 6. RECURSOS DE SEGURANÇA

### Ferramentas Recomendadas

- **OWASP ZAP** - Scanner de vulnerabilidades
- **npm audit** - Auditoria de dependências
- **Snyk** - Monitoramento contínuo de vulnerabilidades
- **SonarQube** - Análise de código
- **Burp Suite** - Testes de penetração

### Documentação

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Última atualização:** 2025-11-19
**Próxima revisão:** Após correção da vulnerabilidade crítica
