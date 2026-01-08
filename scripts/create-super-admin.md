# Como Criar um Super Admin

## O que é um Super Admin?

- **`admin`**: Administrador de uma empresa específica. Pode gerenciar apenas sua própria empresa.
- **`super_admin`**: Administrador da plataforma SaaS. Pode gerenciar TODAS as empresas.

## Rotas Exclusivas de Super Admin

As seguintes rotas **SOMENTE** funcionam com `super_admin`:

1. `GET /api/admin/assinaturas/todas` - Ver todas as empresas e assinaturas
2. `GET /api/admin/assinaturas/empresa/:companyId` - Ver detalhes de qualquer empresa
3. `POST /api/admin/assinaturas/alterar-status` - Alterar status de assinatura
4. `POST /api/admin/assinaturas/criar-empresa` - Criar nova empresa
5. `GET /api/admin/assinaturas/planos` - Listar planos

## Como Criar um Super Admin

### Opção 1: Direto no Banco de Dados (Desenvolvimento)

```bash
cd /Users/caiquesiqueira/Documents/Projetos/cflow-gestor/backend

# Conectar ao banco SQLite
sqlite3 database/gestor-consorcios.db

# Atualizar um usuário existente para super_admin
UPDATE usuarios
SET role = 'super_admin'
WHERE email = 'seu-email@example.com';

# Verificar
SELECT id, nome, email, role, company_id FROM usuarios WHERE role = 'super_admin';

# Sair
.quit
```

### Opção 2: Script Automatizado

Crie um arquivo `scripts/create-super-admin.js`:

```javascript
#!/usr/bin/env node

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../database/gestor-consorcios.db');
const db = new Database(dbPath);

async function createSuperAdmin() {
  const email = process.argv[2];
  const nome = process.argv[3];
  const senha = process.argv[4];

  if (!email || !nome || !senha) {
    console.log('Uso: node create-super-admin.js <email> <nome> <senha>');
    console.log('Exemplo: node create-super-admin.js admin@platform.com "Super Admin" senha123');
    process.exit(1);
  }

  // Verificar se já existe
  const existing = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);

  if (existing) {
    console.log('❌ Já existe um usuário com este email. Atualizando para super_admin...');
    db.prepare('UPDATE usuarios SET role = ? WHERE email = ?').run('super_admin', email);
    console.log('✅ Usuário atualizado para super_admin!');
  } else {
    // Criar novo
    const senhaHash = await bcrypt.hash(senha, 10);

    db.prepare(`
      INSERT INTO usuarios (nome, email, senha_hash, role, company_id)
      VALUES (?, ?, ?, 'super_admin', NULL)
    `).run(nome, email, senhaHash);

    console.log('✅ Super admin criado com sucesso!');
  }

  // Mostrar informações
  const superAdmin = db.prepare('SELECT id, nome, email, role FROM usuarios WHERE email = ?').get(email);
  console.log('\nInformações do Super Admin:');
  console.log('ID:', superAdmin.id);
  console.log('Nome:', superAdmin.nome);
  console.log('Email:', superAdmin.email);
  console.log('Role:', superAdmin.role);

  db.close();
}

createSuperAdmin();
```

Execute:
```bash
node scripts/create-super-admin.js admin@platform.com "Super Admin" SenhaSegura123
```

### Opção 3: Via SQL (Produção)

```sql
-- Criar super admin diretamente
INSERT INTO usuarios (nome, email, senha_hash, role, company_id)
VALUES (
  'Super Admin',
  'admin@platform.com',
  '$2a$10$...',  -- Hash bcrypt da senha
  'super_admin',
  NULL  -- Super admin não pertence a nenhuma empresa específica
);
```

## Como Fazer Login como Super Admin

```bash
# Login via API
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@platform.com",
    "senha": "SenhaSegura123"
  }'
```

O token retornado terá `role: "super_admin"` e permitirá acesso às rotas restritas.

## Testando Permissões

### 1. Como Super Admin (deve funcionar):

```bash
# Login como super admin
TOKEN_SUPER="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." # Token do super admin

# Listar todas as empresas
curl -X GET http://localhost:3001/api/admin/assinaturas/todas \
  -H "Authorization: Bearer $TOKEN_SUPER"

# ✅ Deve retornar lista de todas as empresas
```

### 2. Como Admin Normal (deve falhar):

```bash
# Login como admin normal
TOKEN_ADMIN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." # Token do admin

# Tentar listar todas as empresas
curl -X GET http://localhost:3001/api/admin/assinaturas/todas \
  -H "Authorization: Bearer $TOKEN_ADMIN"

# ❌ Deve retornar 403:
# {
#   "error": "Acesso negado. Esta funcionalidade é restrita aos super administradores da plataforma."
# }
```

## Segurança

### Boas Práticas:

1. **Criar apenas 1-2 super admins** - Mínimo necessário
2. **Usar senhas muito fortes** - Mínimo 16 caracteres, complexas
3. **Ativar 2FA** (futuro) - Autenticação de dois fatores
4. **Logs de auditoria** - Registrar todas as ações de super admin
5. **IPs permitidos** - Restringir acesso por IP (produção)
6. **Rotação de senhas** - Trocar senhas regularmente

### Exemplo de Senha Forte:

```javascript
// Gerar senha forte
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
// Exemplo: 8X2jK9mP4nQ7rS1tU5vW3xY6zA
```

## Diferenças de Permissão

| Funcionalidade | Super Admin | Admin | Gerente | Vendedor |
|---------------|-------------|-------|---------|----------|
| Ver própria empresa | ✅ | ✅ | ✅ | ✅ |
| Ver todas empresas | ✅ | ❌ | ❌ | ❌ |
| Gerenciar própria assinatura | ✅ | ✅ | ❌ | ❌ |
| Gerenciar todas assinaturas | ✅ | ❌ | ❌ | ❌ |
| Criar novas empresas | ✅ | ❌ | ❌ | ❌ |
| Alterar planos | ✅ | ✅ (próprio) | ❌ | ❌ |
| Ver estatísticas dashboard | ✅ | ✅ | ✅ (equipe) | ✅ (próprio) |

## Troubleshooting

### Problema: "Acesso negado" mesmo sendo super admin

```bash
# Verificar role no banco
sqlite3 database/gestor-consorcios.db "SELECT id, email, role FROM usuarios WHERE email = 'seu@email.com';"

# Se role não for 'super_admin', atualizar:
sqlite3 database/gestor-consorcios.db "UPDATE usuarios SET role = 'super_admin' WHERE email = 'seu@email.com';"
```

### Problema: Token não reflete mudanças de role

```bash
# Fazer logout e login novamente para gerar novo token
# O role é incluído no JWT no momento do login
```

## Migração: Converter Admin Existente

Se você já tem um admin e quer convertê-lo para super_admin:

```sql
-- Ver admins atuais
SELECT id, nome, email, role, company_id FROM usuarios WHERE role = 'admin';

-- Converter admin específico para super_admin
UPDATE usuarios
SET role = 'super_admin',
    company_id = NULL  -- Super admin não pertence a empresa específica
WHERE id = 1;  -- ID do admin que quer converter
```

## Notas Importantes

1. **Super admin não precisa de company_id** - Pode ser NULL pois acessa todas empresas
2. **Admin normal DEVE ter company_id** - Pertence a uma empresa específica
3. **Não confundir roles** - `admin` e `super_admin` são diferentes
4. **JWT deve ser regenerado** - Após mudar role, fazer logout/login
