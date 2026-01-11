# Dashboard de Analytics - Guia Completo

## Resumo da Implementação

O Dashboard de Analytics foi implementado para fornecer insights detalhados sobre o desempenho do sistema SaaS, incluindo:

- ✅ MRR (Monthly Recurring Revenue)
- ✅ Taxa de Conversão (Trial → Active)
- ✅ Churn Rate (Taxa de Cancelamento)
- ✅ Funil de Vendas
- ✅ Métricas Gerais (Overview)
- ✅ Gráficos Interativos com Recharts

---

## Estrutura de Arquivos

### Backend

1. **`backend/src/controllers/analyticsController.js`** - Controller com 5 endpoints de métricas
2. **`backend/src/routes/analyticsRoutes.js`** - Rotas de API protegidas (super_admin)
3. **`backend/src/index.js`** - Registro das rotas de analytics

### Frontend

1. **`cflow-admin-saas/src/components/AnalyticsDashboard.jsx`** - Componente principal do dashboard
2. **`cflow-admin-saas/src/pages/AdminAnalytics.jsx`** - Página do dashboard
3. **`cflow-admin-saas/src/App.jsx`** - Rotas da aplicação
4. **`cflow-admin-saas/src/pages/AdminAssinaturas.jsx`** - Integração do botão Analytics

---

## Endpoints da API

Todos os endpoints requerem autenticação (Bearer token) e permissão de **super_admin**.

### 1. Overview Geral
```
GET /api/analytics/overview
```

**Resposta:**
```json
{
  "success": true,
  "total_empresas": 50,
  "assinaturas_por_status": {
    "ACTIVE": 35,
    "TRIAL": 10,
    "OVERDUE": 3,
    "CANCELLED": 2
  },
  "receita_total": 15000.00,
  "total_pagamentos": 120,
  "novos_clientes_mes": 8
}
```

---

### 2. MRR (Monthly Recurring Revenue)
```
GET /api/analytics/mrr?periodo=12
```

**Parâmetros:**
- `periodo` (opcional): Número de meses para o histórico (padrão: 12)

**Resposta:**
```json
{
  "success": true,
  "mrr_atual": 25000.00,
  "total_assinaturas_ativas": 35,
  "historico": [
    {
      "mes": "2024-01-01T00:00:00.000Z",
      "mrr": 20000.00,
      "mrr_trial": 1500.00,
      "total_assinaturas": 30,
      "crescimento_percentual": "5.50"
    },
    ...
  ]
}
```

**Cálculo:**
- MRR Atual = Soma do valor de todas as assinaturas ACTIVE
- Crescimento = ((MRR atual - MRR anterior) / MRR anterior) * 100

---

### 3. Taxa de Conversão
```
GET /api/analytics/conversao?periodo=12
```

**Parâmetros:**
- `periodo` (opcional): Número de meses para o histórico (padrão: 12)

**Resposta:**
```json
{
  "success": true,
  "taxa_conversao_geral": "75.50",
  "total_trials": 40,
  "total_convertidos": 30,
  "historico": [
    {
      "mes": "2024-01-01T00:00:00.000Z",
      "trials_iniciados": 10,
      "trials_convertidos": 8,
      "taxa_conversao": "80.00"
    },
    ...
  ]
}
```

**Cálculo:**
- Taxa de Conversão = (Trials Convertidos / Total Trials) * 100
- Conta apenas assinaturas que tinham `trial_end_date` definido

---

### 4. Churn Rate
```
GET /api/analytics/churn?periodo=12
```

**Parâmetros:**
- `periodo` (opcional): Número de meses para o histórico (padrão: 12)

**Resposta:**
```json
{
  "success": true,
  "churn_rate_geral": "5.25",
  "total_cancelamentos": 5,
  "total_assinaturas": 95,
  "historico": [
    {
      "mes": "2024-01-01T00:00:00.000Z",
      "cancelamentos": 2,
      "assinaturas_ativas_inicio_mes": 40,
      "churn_rate": "5.00"
    },
    ...
  ]
}
```

**Cálculo:**
- Churn Rate = (Cancelamentos / Assinaturas Ativas no Início do Mês) * 100

---

### 5. Funil de Vendas
```
GET /api/analytics/funil
```

**Resposta:**
```json
{
  "success": true,
  "funil": {
    "total_leads": 100,
    "em_trial": 15,
    "ativos": 70,
    "cancelados": 15,
    "taxa_ativacao": "70.00"
  }
}
```

**Cálculo:**
- Taxa de Ativação = (Ativos / Total Leads) * 100

---

## Componentes do Frontend

### AnalyticsDashboard.jsx

Componente principal que exibe todos os gráficos e métricas.

**Recursos:**
- Seletor de período (3, 6, 12, 24 meses)
- 4 cards de métricas principais
- Gráfico de linha para MRR
- Gráfico de barras para conversão
- Gráfico de linha para churn
- Gráfico de pizza para funil de vendas
- Atualização automática ao mudar período

**Bibliotecas usadas:**
- `recharts` - Gráficos interativos
- `react-hot-toast` - Notificações
- `react-router-dom` - Navegação

---

## Como Acessar

### No Admin SaaS

1. Faça login como **super_admin**
2. Na página de Assinaturas, clique no botão verde **"Analytics"** no header
3. Ou acesse diretamente: `http://localhost:5174/admin/analytics`

### Credenciais de Teste

```
Email: admin@cflow.com.br
Senha: admin123
```

---

## Exemplos de Uso

### Buscar MRR dos últimos 6 meses

```bash
curl -X GET "http://localhost:3001/api/analytics/mrr?periodo=6" \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Buscar Taxa de Conversão

```bash
curl -X GET "http://localhost:3001/api/analytics/conversao" \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Buscar Overview Geral

```bash
curl -X GET "http://localhost:3001/api/analytics/overview" \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## Gráficos Disponíveis

### 1. MRR - Monthly Recurring Revenue
- Tipo: Gráfico de Linha
- Mostra: Evolução da receita mensal recorrente
- Cores: Azul (MRR) e Verde (MRR Trial)

### 2. Taxa de Conversão
- Tipo: Gráfico de Barras
- Mostra: Trials iniciados vs convertidos por mês
- Cores: Azul (Iniciados) e Verde (Convertidos)

### 3. Churn Rate
- Tipo: Gráfico de Linha
- Mostra: Percentual de cancelamento por mês
- Cor: Vermelho

### 4. Funil de Vendas
- Tipo: Gráfico de Pizza + Cards
- Mostra: Distribuição de leads, trials, ativos e cancelados
- Cores: Azul, Amarelo, Verde, Vermelho

---

## Segurança

### Autenticação

Todos os endpoints de analytics requerem:
- Token JWT válido no header `Authorization: Bearer TOKEN`
- Usuário com `role = 'super_admin'`

### Middleware de Proteção

```javascript
router.use(authenticateToken, isSuperAdmin);
```

Se o usuário não for super_admin, retorna `403 Forbidden`.

---

## Otimizações e Performance

### Queries SQL Otimizadas

- Uso de `DATE_TRUNC` para agrupamento por mês
- Índices nas colunas: `created_at`, `updated_at`, `status`
- Filtros com `FILTER (WHERE ...)` para melhor performance

### Cache no Frontend

- Dados carregados uma vez ao abrir o dashboard
- Atualização apenas ao mudar filtro de período

### Lazy Loading

- Componente de Analytics carregado apenas quando acessado
- Reduz bundle size inicial

---

## Próximas Melhorias Recomendadas

### 1. LTV (Lifetime Value)
Calcular o valor médio de vida do cliente.

### 2. CAC (Customer Acquisition Cost)
Integrar com custos de marketing para calcular CAC.

### 3. Export para PDF/Excel
Permitir exportar relatórios de analytics.

### 4. Comparação de Períodos
Comparar métricas de dois períodos diferentes.

### 5. Alertas Automáticos
Notificar admins quando churn rate ou conversão estiver fora do normal.

### 6. Segmentação por Plano
Analisar métricas separadas por tipo de plano.

### 7. Cohort Analysis
Análise de coortes de clientes por mês de cadastro.

---

## Troubleshooting

### Erro: "Token inválido ou expirado"

**Solução:** Faça login novamente para obter um token válido.

### Erro: "Erro ao carregar dados de analytics"

**Solução:**
1. Verifique se o backend está rodando na porta 3001
2. Confirme que você está logado como super_admin
3. Verifique o console do navegador para mais detalhes

### Gráficos não aparecem

**Solução:**
1. Verifique se a biblioteca `recharts` está instalada:
```bash
npm list recharts
```

2. Se não estiver instalada:
```bash
npm install recharts
```

### Dados vazios no gráfico

**Solução:**
- Certifique-se de que há dados no banco de dados
- Verifique se as tabelas `assinaturas` e `pagamentos` possuem registros
- Tente mudar o período de análise

---

## Estrutura do Banco de Dados

### Tabelas Utilizadas

1. **empresas** - Cadastro de empresas
2. **assinaturas** - Status e valores das assinaturas
3. **pagamentos** - Histórico de pagamentos

### Campos Importantes

**assinaturas:**
- `status` - ACTIVE, TRIAL, OVERDUE, CANCELLED
- `valor` - Valor da assinatura
- `created_at` - Data de criação
- `updated_at` - Data de atualização
- `trial_end_date` - Data de fim do trial

**pagamentos:**
- `valor` - Valor do pagamento
- `status` - paid, confirmed, received, etc.
- `data_pagamento` - Data do pagamento

---

## Checklist de Implementação

- [x] Criar controller de analytics
- [x] Criar rotas de analytics
- [x] Integrar rotas no index.js
- [x] Instalar recharts no frontend
- [x] Criar componente AnalyticsDashboard
- [x] Criar página AdminAnalytics
- [x] Adicionar rotas no App.jsx
- [x] Adicionar botão no AdminAssinaturas
- [x] Testar todos os endpoints
- [x] Documentar funcionalidades

---

## Suporte

Para dúvidas ou problemas:

1. Verifique esta documentação
2. Revise os logs do backend
3. Inspecione o console do navegador
4. Consulte a documentação do Recharts: https://recharts.org/

---

**Dashboard de Analytics - Implementado com sucesso!** 📊
