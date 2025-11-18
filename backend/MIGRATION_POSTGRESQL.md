# Migração para PostgreSQL

Este guia descreve como migrar o projeto de SQLite para PostgreSQL em produção.

## 1. Pré-requisitos

- PostgreSQL instalado (versão 13 ou superior)
- Acesso ao banco de dados PostgreSQL
- Backup do banco SQLite atual

## 2. Configurar PostgreSQL

### Opção A: PostgreSQL Local

```bash
# Instalar PostgreSQL (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib

# Criar banco de dados
sudo -u postgres createdb gestor_consorcios

# Criar usuário
sudo -u postgres psql
CREATE USER gestor_user WITH PASSWORD 'sua_senha_segura';
GRANT ALL PRIVILEGES ON DATABASE gestor_consorcios TO gestor_user;
```

### Opção B: PostgreSQL na Nuvem (Supabase/Heroku/AWS RDS)

1. Criar projeto no Supabase (recomendado para startups)
2. Obter a URL de conexão
3. Adicionar ao .env

## 3. Atualizar Dependências

```bash
cd backend
npm install pg
npm uninstall sqlite3
```

## 4. Atualizar .env

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/gestor_consorcios
# ou Supabase:
DATABASE_URL=postgresql://postgres:[senha]@db.[projeto].supabase.co:5432/postgres
```

## 5. Criar Schema PostgreSQL

Execute os comandos SQL em `scripts/init-postgresql.sql` (arquivo a ser criado):

```sql
-- Tabela de equipes
CREATE TABLE IF NOT EXISTS equipes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'vendedor',
  tipo_usuario VARCHAR(50),
  percentual_comissao DECIMAL(5,2),
  celular VARCHAR(20),
  equipe_id INTEGER REFERENCES equipes(id),
  link_publico VARCHAR(255) UNIQUE,
  foto_perfil TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Continuar com demais tabelas...
```

## 6. Migrar Dados

Use a ferramenta `pgloader` para migrar dados automaticamente:

```bash
# Instalar pgloader
sudo apt-get install pgloader

# Migrar
pgloader sqlite://./database/gestor-consorcios.db postgresql://usuario:senha@localhost/gestor_consorcios
```

## 7. Atualizar database.js

O arquivo `src/config/database.js` já suporta PostgreSQL.
Basta configurar a `DATABASE_URL` no `.env`.

## 8. Testar

```bash
npm run dev
# Verificar logs para confirmar conexão PostgreSQL
```

## 9. Deploy em Produção

### Heroku
```bash
heroku create nome-do-app
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

### Render
1. Conectar repositório GitHub
2. Criar PostgreSQL database
3. Configurar variáveis de ambiente
4. Deploy automático

## 10. Backup e Restore

```bash
# Backup
pg_dump -U usuario gestor_consorcios > backup.sql

# Restore
psql -U usuario gestor_consorcios < backup.sql
```

## Custos Estimados

- **Supabase**: Gratuito até 500MB + 2GB transferência
- **Heroku Postgres**: $0 (hobby-dev) até $50/mês
- **Render**: $7/mês (PostgreSQL)
- **AWS RDS**: ~$15-30/mês (t3.micro)

## Recomendação

Para começar: **Supabase** (gratuito, fácil, escalável)
