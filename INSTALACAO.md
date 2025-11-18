# Guia Rápido de Instalação - Gestor de Consórcios

## Passo a Passo para Rodar Localmente

### 1. Preparar o Banco de Dados (Supabase)

1. Acesse [https://supabase.com](https://supabase.com) e crie uma conta gratuita
2. Crie um novo projeto
3. Acesse **SQL Editor** no menu lateral
4. Copie todo o conteúdo do arquivo `backend/database/schema.sql`
5. Cole no editor SQL e clique em **Run**
6. Aguarde a criação das tabelas
7. Copie a **Database URL**:
   - Vá em **Settings** > **Database**
   - Na seção **Connection String**, copie a URI (modo Postgres)
   - Exemplo: `postgresql://postgres:[senha]@db.xxx.supabase.co:5432/postgres`

### 2. Configurar o Backend

```bash
# Navegar para a pasta backend
cd backend

# Instalar dependências
npm install

# Criar arquivo .env
cp .env.example .env
```

Edite o arquivo `.env` e configure:

```env
PORT=3001
DATABASE_URL=sua_url_do_supabase_aqui
JWT_SECRET=cole_o_hash_gerado_abaixo
NODE_ENV=development
```

Para gerar o JWT_SECRET, rode:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Configurar o Frontend

```bash
# Navegar para a pasta frontend (em outro terminal)
cd frontend

# Instalar dependências
npm install

# Criar arquivo .env
cp .env.example .env
```

O arquivo `.env` deve conter:
```env
VITE_API_URL=http://localhost:3001/api
```

### 4. Iniciar a Aplicação

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Você verá:
```
🚀 Servidor rodando na porta 3001
📍 URL: http://localhost:3001
✅ Conectado ao banco de dados PostgreSQL
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

### 5. Acessar a Aplicação

1. Abra seu navegador em: `http://localhost:3000`
2. Faça login com uma das credenciais de teste:

**Administrador:**
- Email: `admin@gestorconsorcios.com`
- Senha: `admin123`

**Vendedor:**
- Email: `vendedor@gestorconsorcios.com`
- Senha: `vendedor123`

## Troubleshooting (Resolução de Problemas)

### Erro: "Cannot connect to database"
- Verifique se a `DATABASE_URL` está correta no `.env`
- Confirme que o projeto do Supabase está ativo
- Teste a conexão no Supabase Dashboard

### Erro: "Port 3000 already in use"
- Outro processo está usando a porta 3000
- Finalize o processo ou altere a porta em `vite.config.js`

### Erro: "Token inválido"
- Limpe o localStorage do navegador
- Faça logout e login novamente
- Verifique se o `JWT_SECRET` está configurado

### Erro ao instalar dependências
```bash
# Limpe o cache do npm
npm cache clean --force

# Delete node_modules e reinstale
rm -rf node_modules
npm install
```

## Estrutura de Pastas

```
gestor-consorcios/
├── backend/              # API Node.js
│   ├── src/
│   │   ├── config/      # Configuração do DB
│   │   ├── controllers/ # Lógica de negócio
│   │   ├── middleware/  # JWT Auth
│   │   ├── models/      # Modelos
│   │   ├── routes/      # Rotas da API
│   │   └── index.js     # Servidor
│   ├── database/
│   │   └── schema.sql   # Script SQL
│   └── package.json
│
└── frontend/            # App React
    ├── src/
    │   ├── api/        # Cliente HTTP
    │   ├── components/ # Componentes React
    │   ├── context/    # Context API
    │   ├── pages/      # Páginas
    │   └── App.jsx
    └── package.json
```

## Próximos Passos

1. Explore o sistema criando novos clientes
2. Teste o Kanban arrastando cards entre colunas
3. Se for admin, crie novos vendedores
4. Personalize o código conforme sua necessidade

## Precisa de Ajuda?

- Consulte o `README.md` principal
- Verifique os comentários no código
- Abra uma issue no repositório
