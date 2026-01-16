# 🐘 Guia de Migração para PostgreSQL

Guia completo para migrar o **Gestor de Consórcios** de SQLite (desenvolvimento) para PostgreSQL (produção).

---

## 📋 Por Que Migrar?

### Limitações do SQLite em Produção

| Aspecto | SQLite | PostgreSQL |
|---------|--------|------------|
| **Concorrência** | 1 escrita por vez | Milhares simultâneas |
| **Tamanho** | Limite ~140TB (prático: 1GB) | Ilimitado |
| **Usuários simultâneos** | ~10 | 1000+ |
| **Backup em produção** | Requer lock | Online/sem downtime |
| **Escalabilidade** | ❌ Vertical limitada | ✅ Horizontal |
| **ACID completo** | ⚠️ Limitado | ✅ Total |

**Conclusão**: SQLite é **perfeito para desenvolvimento**, mas PostgreSQL é **essencial para produção**.

---

## 🎯 Quando Migrar?

**Antes do deploy em produção!**

Migre SQLite → PostgreSQL:
- ✅ Antes de qualquer usuário real
- ✅ Antes de dados importantes
- ✅ Durante testes de preparação para produção

**Não migre** se:
- ⚠️ Apenas desenvolvimento local
- ⚠️ Protótipo sem deploy

---

## 🚀 Opções de Hospedagem PostgreSQL

### 1. Supabase (Recomendado) ⭐

**Por quê escolher:**
- ✅ **Gratuito** até 500MB + 2GB bandwidth
- ✅ Setup em 5 minutos
- ✅ Backups automáticos
- ✅ Dashboard SQL online
- ✅ Autenticação incluída (opcional)
- ✅ API REST automática (opcional)

**Limitações Free Tier:**
- 500MB storage
- 2GB bandwidth/mês
- Pausado após 7 dias de inatividade (reativa automaticamente)

**Custo pago:** $25/mês (8GB database, 50GB bandwidth)

**Ideal para:** Startups, MVPs, projetos pequenos/médios

---

### 2. Render (PostgreSQL Managed)

**Por quê escolher:**
- ✅ Integração perfeita se backend está no Render
- ✅ Backups automáticos diários
- ✅ Zero configuração de rede

**Limitações Free Tier:**
- ❌ Não tem tier gratuito para PostgreSQL

**Custo:** $7/mês (256MB RAM, 1GB storage)

**Ideal para:** Se backend já está no Render

---

### 3. Railway

**Por quê escolher:**
- ✅ $5 grátis/mês (sem cartão)
- ✅ Deploy instantâneo
- ✅ CLI poderosa

**Limitações:**
- Após $5 grátis: $0.000231/GB-hora (~$5-10/mês)

**Ideal para:** Desenvolvedores que preferem CLI

---

### 4. Heroku Postgres

**Por quê escolher:**
- ✅ Tier gratuito (hobby-dev)
- ✅ Fácil integração com Heroku dynos

**Limitações Free:**
- 10.000 rows limit
- 20 conexões
- Sem backups automáticos

**Custo pago:** $9/mês (10M rows, backups)

**Ideal para:** Apps Heroku, prototipagem

---

### 5. AWS RDS / Google Cloud SQL / Azure

**Por quê escolher:**
- ✅ Máxima escalabilidade
- ✅ SLA 99.95%
- ✅ Controle total

**Custo:** $15-50/mês (t3.micro/db-f1-micro)

**Ideal para:** Apps enterprise, alto tráfego

---

### 6. PostgreSQL Auto-hospedado (VPS)

**Por quê escolher:**
- ✅ Controle total
- ✅ Custo fixo ($5-20/mês VPS)

**Desvantagens:**
- ❌ Você gerencia tudo (backups, updates, segurança)
- ❌ Requer conhecimento de DevOps

**Ideal para:** Quem já tem VPS ou quer controle máximo

---

## 🏆 Recomendação por Caso de Uso

| Caso de Uso | Recomendação | Custo Mensal |
|-------------|--------------|--------------|
| **MVP/Startup** | Supabase Free | R$ 0 |
| **App pequeno** | Render | R$ 35 ($7) |
| **App médio** | Supabase Pro | R$ 125 ($25) |
| **App grande** | AWS RDS | R$ 150+ ($30+) |

---

## 📦 Opção 1: Migração para Supabase (RECOMENDADO)

### Passo 1: Criar Projeto Supabase

**1.1 Criar conta:**
```bash
# Acesse
https://supabase.com

# Crie conta (recomendado: GitHub OAuth)
```

**1.2 Criar projeto:**
- Dashboard → New Project
- **Organization:** Create new (ex: "Minha Empresa")
- **Project Name:** `gestor-consorcios-prod`
- **Database Password:** Gere senha forte (SALVE EM LOCAL SEGURO!)
  ```bash
  # Gerar senha forte (32 caracteres):
  openssl rand -base64 32
  ```
- **Region:** `South America (São Paulo)` (latência menor para Brasil)
- **Pricing Plan:** Free

**1.3 Aguardar criação** (1-2 minutos)

---

### Passo 2: Obter Credenciais

**2.1 Acessar configurações:**
- Project Settings (ícone engrenagem) → Database

**2.2 Copiar Connection String:**

Procure por **Connection string** e copie o formato **URI**:

```
postgresql://postgres:[SEU-PASSWORD]@db.xxxxxxxxxxxxxx.supabase.co:5432/postgres
```

**Exemplo:**
```
postgresql://postgres:SuaSenhaAqui123@db.abcdefghijk.supabase.co:5432/postgres
```

⚠️ **IMPORTANTE:** Substitua `[SEU-PASSWORD]` pela senha que você definiu no passo 1.2!

---

### Passo 3: Configurar Projeto Local

**3.1 Instalar dependência PostgreSQL:**
```bash
cd backend
npm install pg
```

**3.2 Atualizar `backend/.env`:**

Substitua a linha `DATABASE_URL`:

```env
# ANTES (SQLite):
# DATABASE_URL=./database/gestor-consorcios.db

# DEPOIS (PostgreSQL/Supabase):
DATABASE_URL=postgresql://postgres:SUA_SENHA@db.xxxxx.supabase.co:5432/postgres
```

---

### Passo 4: Criar Tabelas no PostgreSQL

**4.1 Acessar SQL Editor no Supabase:**
- Dashboard Supabase → SQL Editor → New Query

**4.2 Executar script de criação de tabelas:**

Copie e cole este SQL:

```sql
-- ============================================
-- GESTOR DE CONSÓRCIOS - SCHEMA POSTGRESQL
-- ============================================

-- 1. Tabela de Equipes
CREATE TABLE IF NOT EXISTS equipes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'vendedor',
  tipo_usuario VARCHAR(50),
  percentual_comissao DECIMAL(5,2),
  celular VARCHAR(20),
  equipe_id INTEGER REFERENCES equipes(id) ON DELETE SET NULL,
  link_publico VARCHAR(255) UNIQUE,
  foto_perfil TEXT,
  reset_token VARCHAR(255),
  reset_token_expiry TIMESTAMP,
  reset_token_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE,
  email VARCHAR(255),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  data_nascimento DATE,
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  profissao VARCHAR(100),
  renda_mensal DECIMAL(12,2),
  estado_civil VARCHAR(50),
  observacoes TEXT,
  etapa_funil VARCHAR(50) NOT NULL DEFAULT 'novo_contato',
  vendedor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  origem VARCHAR(50),
  data_contato DATE,
  proxima_acao TEXT,
  prioridade VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Comissões
CREATE TABLE IF NOT EXISTS comissoes (
  id SERIAL PRIMARY KEY,
  vendedor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  valor_total DECIMAL(12,2) NOT NULL,
  percentual DECIMAL(5,2) NOT NULL,
  numero_parcelas INTEGER NOT NULL DEFAULT 1,
  tipo VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pendente',
  data_venda DATE,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela de Parcelas de Comissão
CREATE TABLE IF NOT EXISTS parcelas_comissao (
  id SERIAL PRIMARY KEY,
  comissao_id INTEGER NOT NULL REFERENCES comissoes(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status VARCHAR(50) DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabela de Vendas
CREATE TABLE IF NOT EXISTS vendas (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vendedor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_consorcio VARCHAR(50),
  valor_credito DECIMAL(12,2),
  valor_parcela DECIMAL(12,2),
  prazo_meses INTEGER,
  taxa_administracao DECIMAL(5,2),
  data_venda DATE,
  status VARCHAR(50) DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_equipe ON usuarios(equipe_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_link ON usuarios(link_publico);

CREATE INDEX IF NOT EXISTS idx_clientes_vendedor ON clientes(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_clientes_etapa ON clientes(etapa_funil);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(cpf);

CREATE INDEX IF NOT EXISTS idx_comissoes_vendedor ON comissoes(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_cliente ON comissoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_status ON comissoes(status);

CREATE INDEX IF NOT EXISTS idx_parcelas_comissao ON parcelas_comissao(comissao_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas_comissao(status);

CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor ON vendas(vendedor_id);

-- ============================================
-- TRIGGERS PARA AUTO-UPDATE DE TIMESTAMPS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_equipes_updated_at BEFORE UPDATE ON equipes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DADOS INICIAIS (EQUIPES E USUÁRIOS DE TESTE)
-- ============================================

-- Equipe padrão
INSERT INTO equipes (nome, descricao) VALUES
('Equipe Principal', 'Equipe padrão do sistema')
ON CONFLICT (nome) DO NOTHING;

-- Admin padrão (senha: admin123)
INSERT INTO usuarios (nome, email, senha_hash, role, equipe_id) VALUES
(
  'Administrador',
  'admin@gestorconsorcios.com',
  '$2a$10$YourHashedPasswordHere',  -- Você deve gerar o hash da senha
  'admin',
  1
)
ON CONFLICT (email) DO NOTHING;

-- Vendedor de teste (senha: vendedor123)
INSERT INTO usuarios (nome, email, senha_hash, role, tipo_usuario, percentual_comissao, celular, equipe_id, link_publico) VALUES
(
  'João Vendedor',
  'vendedor@gestorconsorcios.com',
  '$2a$10$YourHashedPasswordHere',  -- Você deve gerar o hash da senha
  'vendedor',
  'interno',
  5.00,
  '(11) 98765-4321',
  1,
  'joao-vendedor'
)
ON CONFLICT (email) DO NOTHING;
```

**4.3 Executar (clique em "Run" ou Ctrl+Enter)**

✅ Você verá: "Success. No rows returned"

---

### Passo 5: Migrar Dados do SQLite (Se Houver)

**Se você já tem dados no SQLite que quer migrar:**

#### Opção A: Ferramenta `pgloader` (Recomendado)

**5.1 Instalar pgloader:**

**Linux/macOS:**
```bash
# Ubuntu/Debian
sudo apt-get install pgloader

# macOS (Homebrew)
brew install pgloader
```

**Windows:**
```powershell
# Usar Docker
docker pull dimitri/pgloader
```

**5.2 Migrar dados:**
```bash
# Formato:
pgloader sqlite://CAMINHO_SQLITE postgresql://USER:PASS@HOST:PORT/DB

# Exemplo real:
pgloader \
  sqlite://backend/database/gestor-consorcios.db \
  postgresql://postgres:SuaSenha@db.xxxxx.supabase.co:5432/postgres
```

**5.3 Verificar migração:**
- Acesse Supabase → Table Editor
- Verifique se dados estão presentes

---

#### Opção B: Exportar/Importar Manual (Pequenos Volumes)

**5.1 Exportar dados do SQLite:**
```bash
# Backend deve estar rodando
node -e "
const db = require('./src/config/database.js');
db.query('SELECT * FROM clientes').then(console.log);
"
```

**5.2 Inserir no PostgreSQL via Supabase SQL Editor**

---

### Passo 6: Testar Conexão

**6.1 Reiniciar backend:**
```bash
cd backend
npm run dev
```

**6.2 Verificar logs:**

Você deve ver:
```
✅ Conectado ao PostgreSQL com sucesso
```

**Se ver erro:**
- Verifique `DATABASE_URL` no `.env`
- Teste a string de conexão no Supabase SQL Editor
- Verifique firewall (Supabase deve permitir conexões)

---

### Passo 7: Testar Funcionamento

**7.1 Iniciar frontend:**
```bash
cd frontend
npm run dev
```

**7.2 Testar funcionalidades:**
- [ ] Login funciona
- [ ] Criar cliente funciona
- [ ] Kanban carrega clientes
- [ ] Drag & drop salva no banco
- [ ] Comissões funcionam

---

## 📦 Opção 2: Migração para Render PostgreSQL

### Passo 1: Criar PostgreSQL no Render

**1.1 Acessar Render:**
- https://render.com → Dashboard

**1.2 Criar PostgreSQL:**
- New → PostgreSQL
- **Name:** `gestor-consorcios-db`
- **Database:** `gestor_consorcios`
- **User:** `gestor_user`
- **Region:** `Oregon (US West)` (melhor opção gratuita)
- **PostgreSQL Version:** 15
- **Plan:** Starter ($7/mês)

**1.3 Aguardar criação** (2-3 minutos)

---

### Passo 2: Obter Credenciais

**2.1 Acessar database criado:**
- Dashboard → gestor-consorcios-db → Info

**2.2 Copiar "Internal Database URL":**
```
postgresql://gestor_user:xxxx@dpg-xxxx-a.oregon-postgres.render.com/gestor_consorcios
```

⚠️ Use **Internal** se backend está no Render, **External** se backend está local/outro serviço

---

### Passo 3-7: Seguir mesmos passos do Supabase

- Passo 3: Configurar `.env` com a URL do Render
- Passo 4: Executar SQL (via `psql` ou ferramenta como TablePlus/DBeaver)
- Passo 5: Migrar dados (se necessário)
- Passo 6-7: Testar

---

## 🔧 Troubleshooting

### Erro: "Connection refused"

**Causa:** Firewall ou URL incorreta

**Solução:**
- Verifique se a URL está correta (copie novamente)
- Supabase: Verify que projeto não está pausado
- Teste conexão com ferramenta externa (TablePlus, DBeaver)

---

### Erro: "Password authentication failed"

**Causa:** Senha incorreta na URL

**Solução:**
- Verifique senha no `.env`
- Caracteres especiais devem ser URL-encoded:
  - `@` → `%40`
  - `#` → `%23`
  - `$` → `%24`
  - Exemplo: `senha@123` → `senha%40123`

---

### Erro: "Database does not exist"

**Causa:** Nome do banco incorreto

**Solução:**
- Supabase: sempre use `/postgres` no final da URL
- Render: use o nome exato do database criado

---

### Tabelas não são criadas

**Causa:** SQL não foi executado ou erro no script

**Solução:**
- Execute o SQL do Passo 4 manualmente
- Verifique logs de erro no SQL Editor
- Remova `ON CONFLICT` se dar erro

---

### Dados não foram migrados

**Causa:** pgloader falhou ou mapeamento incorreto

**Solução:**
```bash
# Verificar se tabelas estão vazias
psql $DATABASE_URL -c "SELECT COUNT(*) FROM clientes;"

# Repetir pgloader com verbose
pgloader --verbose sqlite://... postgresql://...
```

---

## 🔒 Segurança em Produção

### 1. Credenciais

✅ **NUNCA** commite `DATABASE_URL` no Git
✅ Use variáveis de ambiente
✅ Gere senhas fortes (32+ caracteres)

```bash
# Adicione ao .gitignore
echo ".env" >> .gitignore
echo "backend/.env" >> .gitignore
```

---

### 2. Conexões SSL

Em produção, sempre use SSL:

```env
# Supabase (SSL já habilitado)
DATABASE_URL=postgresql://...?sslmode=require

# Outros (adicione parâmetro)
DATABASE_URL=postgresql://...?sslmode=require
```

---

### 3. Limite de Conexões

PostgreSQL tem limite de conexões (Supabase Free: ~60)

**Backend `src/config/database.js`:**
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Máximo 20 conexões simultâneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

### 4. Backups

**Supabase:**
- Free: Backups diários (últimos 7 dias)
- Pro: Point-in-time recovery (30 dias)

**Render:**
- Backups diários automáticos
- Retenção de 7 dias

**Manual:**
```bash
# Backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Agendar no cron (Linux)
0 2 * * * pg_dump $DATABASE_URL > /backups/backup-$(date +\%Y\%m\%d).sql
```

---

## 📊 Monitoramento

### Supabase Dashboard

- **Table Editor:** Visualizar dados
- **SQL Editor:** Queries manuais
- **Database → Usage:** Uso de storage
- **Logs:** Queries lentas

### Queries Úteis

**Ver todas as tabelas:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

**Contar registros:**
```sql
SELECT
  'clientes' as tabela, COUNT(*) FROM clientes
UNION ALL
SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL
SELECT 'comissoes', COUNT(*) FROM comissoes;
```

**Ver tamanho do banco:**
```sql
SELECT pg_size_pretty(pg_database_size('postgres'));
```

**Queries mais lentas:**
```sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 💰 Estimativa de Custos

### Cenário 1: Startup (até 1000 clientes)

- **Supabase Free:** R$ 0/mês
- **Storage:** < 100MB
- **Bandwidth:** < 1GB/mês

**Total: R$ 0/mês** ✅

---

### Cenário 2: Pequena Empresa (1000-10000 clientes)

- **Supabase Pro:** R$ 125/mês ($25)
- **Storage:** ~500MB
- **Bandwidth:** ~5GB/mês

**Total: R$ 125/mês** ✅

---

### Cenário 3: Média Empresa (10000-50000 clientes)

- **Render PostgreSQL:** R$ 175/mês ($35)
- **Storage:** ~2GB
- **Bandwidth:** ~20GB/mês

**Total: R$ 175/mês** ✅

---

### Cenário 4: Grande Empresa (50000+ clientes)

- **AWS RDS (t3.small):** R$ 250/mês ($50)
- **Storage:** 10GB+
- **Backups:** Incluídos

**Total: R$ 250/mês** ✅

---

## ✅ Checklist de Migração

Antes de considerar completo:

- [ ] PostgreSQL criado (Supabase/Render/outro)
- [ ] Credenciais obtidas e salvas em local seguro
- [ ] `backend/.env` atualizado com `DATABASE_URL`
- [ ] Dependência `pg` instalada (`npm install pg`)
- [ ] Script SQL de tabelas executado
- [ ] Dados migrados (se aplicável)
- [ ] Backend conecta com sucesso ao PostgreSQL
- [ ] Frontend funciona normalmente
- [ ] Login testado
- [ ] CRUD de clientes testado
- [ ] Kanban testado
- [ ] Comissões testadas
- [ ] Backup manual testado
- [ ] `.env` adicionado ao `.gitignore`

---

## 🚀 Próximos Passos

Após migração bem-sucedida:

1. **Deploy em produção**: Siga [DEPLOY_PRODUCTION.md](DEPLOY_PRODUCTION.md)
2. **Configure monitoramento**: Sentry, Logs
3. **Agende backups automáticos**
4. **Otimize queries** (adicione índices se necessário)
5. **Monitore uso** (Supabase Dashboard)

---

## 📚 Recursos Adicionais

- **Supabase Docs**: https://supabase.com/docs/guides/database
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **pgloader**: https://pgloader.io/
- **TablePlus** (GUI): https://tableplus.com/
- **DBeaver** (GUI gratuita): https://dbeaver.io/

---

**Versão**: 2.0.0
**Última atualização**: ${new Date().toLocaleDateString('pt-BR')}
**Status**: ✅ Guia Completo

---

*Dúvidas? Veja [FAQ.md](FAQ.md) seção 11 ou abra uma issue.*
