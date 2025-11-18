# CFLOW Gestor - Sistema de Gestão de Vendas de Consórcios

Sistema completo de gestão de vendas de consórcios com funcionalidades de CRM, kanban de vendas, gerenciamento de comissões, formulários públicos e conformidade LGPD.

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18-blue.svg)](https://react.dev/)

---

## 📋 Sobre este Repositório

Este é o repositório do **CFLOW Gestor**, a ferramenta principal de gestão de vendas de consórcios.

> **Nota**: Este repositório foi separado do monorepo original `gestor-consorcios`. Outros componentes:
> - **Landing Page**: Repositório `cflow-website`
> - **Admin SaaS + Pagamentos**: Repositório `cflow-admin-saas`

---

## 🚀 Quick Start

### Opção 1: Setup Automático (Recomendado)

```bash
# Linux/macOS
./setup.sh

# Windows
.\setup.ps1

# Inicie backend e frontend
npm run dev  # Inicia ambos automaticamente

# Acesse http://localhost:3000
# Login: admin@gestorconsorcios.com / admin123
```

### Opção 2: Docker (Ainda mais fácil! 🐳)

```bash
# Inicia backend, frontend e PostgreSQL
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

### Opção 3: Manual (Para desenvolvedores)

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env
npm run dev

# 2. Frontend (novo terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

Acesse: http://localhost:3000

---

## 🎯 Visão Geral

### O que é o CFLOW Gestor?

O CFLOW Gestor é uma **ferramenta SaaS** para vendedores e gerentes de consórcios que precisam:

- 📊 Gerenciar leads e clientes (CRM completo)
- 🎯 Visualizar funil de vendas (Kanban drag-and-drop)
- 💰 Calcular e controlar comissões automaticamente
- 📝 Capturar leads via formulários públicos personalizados
- 📈 Acompanhar metas e estatísticas de vendas
- 👥 Gerenciar equipes e vendedores
- 🏢 Controlar administradoras de consórcio

---

## ✨ Funcionalidades Principais

### 1. CRM Completo
- ✅ Cadastro detalhado de clientes
- ✅ Histórico de interações
- ✅ Campos personalizados (administradora, tipo de cota, etc.)
- ✅ Busca e filtros avançados
- ✅ Estatísticas por vendedor

### 2. Kanban Visual de Vendas
- ✅ Arraste e solte clientes entre etapas
- ✅ 4 etapas customizáveis: Novo Contato → Proposta Enviada → Negociação → Fechado/Perdido
- ✅ Contador de clientes por etapa
- ✅ Interface responsiva e intuitiva

### 3. Gestão de Comissões
- ✅ Cálculo automático de comissões
- ✅ Parcelamento de comissões (até 60x)
- ✅ Controle de pagamentos por parcela
- ✅ Status: Pendente / Pago / Cancelado
- ✅ Estatísticas de comissões recebidas

### 4. Formulários Públicos para Captação de Leads
- ✅ Link único por vendedor
- ✅ Landing page personalizada
- ✅ Captura automática de leads
- ✅ Notificações em tempo real

### 5. Dashboard e Relatórios
- ✅ Métricas de vendas em tempo real
- ✅ Estatísticas por vendedor e equipe
- ✅ Filtros por período
- ✅ Exportação de relatórios

### 6. Gestão de Equipes e Administradoras
- ✅ Criar e gerenciar equipes de vendas
- ✅ Cadastrar administradoras de consórcio
- ✅ Definir metas individuais e de equipe

---

## 🔒 Segurança e Conformidade

### Recursos de Segurança v2.0

- ✅ **Autenticação JWT** com tokens de longa duração
- ✅ **Rate Limiting** anti-brute force (10 tentativas/15min)
- ✅ **Hash de senhas** com bcrypt (10 rounds)
- ✅ **Helmet.js** para headers HTTP seguros
- ✅ **CORS** configurado para ambientes específicos
- ✅ **Validação de inputs** com express-validator
- ✅ **Sanitização SQL** (parameterized queries)
- ✅ **Recuperação de senha** com tokens de expiração
- ✅ **HTTPS** recomendado em produção

### Conformidade LGPD (80%)

- ✅ Termos de Uso e Política de Privacidade
- ✅ Consentimento explícito para uso de dados
- ✅ Criptografia de dados sensíveis
- ⏳ Funcionalidade de exportação de dados (em desenvolvimento)
- ⏳ Funcionalidade de exclusão de conta (em desenvolvimento)

---

## 🛠 Tecnologias Utilizadas

### Backend
| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Node.js | 18+ | Runtime JavaScript |
| Express | 4.18 | Framework web |
| PostgreSQL | 15+ | Banco de dados (produção) |
| SQLite | 3.x | Banco de dados (desenvolvimento) |
| JWT | 9.0 | Autenticação |
| bcryptjs | 2.4 | Hash de senhas |
| Helmet | 8.1 | Segurança HTTP |
| Nodemailer | 7.0 | Envio de emails |

### Frontend
| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| React | 18.2 | UI Library |
| Vite | 5.0 | Build tool |
| React Router | 6.20 | Navegação SPA |
| Tailwind CSS | 3.3 | Estilização |
| Axios | 1.6 | HTTP client |
| @hello-pangea/dnd | 16.5 | Drag & Drop |
| Zustand | 4.4 | State management |

### DevOps
- Docker & Docker Compose
- GitHub Actions (CI/CD)
- Netlify / Vercel / Render (deploy)

---

## 📦 Instalação

### Pré-requisitos

- Node.js 18+ ([Baixar](https://nodejs.org/))
- npm 9+ (vem com Node.js)
- PostgreSQL 15+ (produção) ou SQLite (desenvolvimento)
- Git

### Instalação Detalhada

Consulte o arquivo [INSTALACAO.md](INSTALACAO.md) para guia completo.

---

## 📚 Documentação Completa

- [QUICK_START.md](QUICK_START.md) - Setup em 5 minutos
- [GUIA_DE_TESTES.md](GUIA_DE_TESTES.md) - 11 cenários de teste
- [CONFIGURACAO_SMTP.md](CONFIGURACAO_SMTP.md) - Configurar email
- [DOCKER.md](DOCKER.md) - Guia completo de Docker
- [DEPLOY_PRODUCTION.md](DEPLOY_PRODUCTION.md) - Deploy em produção
- [MIGRATION_POSTGRESQL.md](MIGRATION_POSTGRESQL.md) - Migrar para PostgreSQL
- [FAQ.md](FAQ.md) - 34 perguntas frequentes
- [CONTRIBUTING.md](CONTRIBUTING.md) - Como contribuir
- [CHANGELOG.md](CHANGELOG.md) - Histórico de versões
- [docs/API.md](docs/API.md) - Documentação da API REST

---

## ⚙️ Configuração

### Variáveis de Ambiente

#### Backend (.env)
```env
NODE_ENV=development
PORT=5000
DATABASE_TYPE=sqlite  # ou postgresql
DATABASE_URL=sqlite:./database.sqlite  # ou postgresql://...
JWT_SECRET=seu_jwt_secret_super_seguro
JWT_EXPIRE=30d

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASSWORD=sua_senha_app
EMAIL_FROM=noreply@gestorconsorcios.com
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🚀 Deploy

### Deploy Rápido

**Backend**: Render, Railway, Fly.io
**Frontend**: Vercel, Netlify, GitHub Pages
**Database**: Render PostgreSQL, Supabase, Neon

Consulte [DEPLOY_PRODUCTION.md](DEPLOY_PRODUCTION.md) para guias completos.

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Consulte [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE).

---

## 🆘 Suporte

- 📖 [FAQ](FAQ.md) - Perguntas frequentes
- 📧 Email: suporte@cflowgestor.com
- 💬 Issues: [GitHub Issues](../../issues)

---

## 📊 Status do Projeto

**Versão Atual**: 2.0.0
**Status**: ✅ Pronto para produção
**Última atualização**: Novembro 2024

---

**Desenvolvido com ❤️ para facilitar a gestão de vendas de consórcios**
