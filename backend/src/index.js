import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import clienteRoutes from './routes/clienteRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import formularioPublicoRoutes from './routes/formularioPublicoRoutes.js';
import comissaoRoutes from './routes/comissaoRoutes.js';
import equipeRoutes from './routes/equipeRoutes.js';
import administradoraRoutes from './routes/administradoraRoutes.js';
import metaRoutes from './routes/metaRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import planRoutes from './routes/planRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import { generalLimiter } from './middleware/rateLimiter.js';

// Configuração de variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de Segurança
app.use(helmet()); // Adiciona headers de segurança HTTP
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
})); // CORS configurado com origem específica

app.use(express.json({ limit: '10mb' })); // Parser de JSON com limite de 10MB
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parser de URL encoded

// Rate Limiting global (protege contra abuso)
app.use(generalLimiter);

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/formularios', formularioPublicoRoutes);
app.use('/api/comissoes', comissaoRoutes);
app.use('/api/equipes', equipeRoutes);
app.use('/api/administradoras', administradoraRoutes);
app.use('/api/metas', metaRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Rotas SaaS (planos, assinaturas, billing)
app.use('/api/plans', planRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/webhooks', webhookRoutes); // Webhooks do gateway (sem auth)

// Rota de teste
app.get('/', (req, res) => {
  res.json({
    message: 'API Gestor de Consórcios - SaaS',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      clientes: '/api/clientes',
      usuarios: '/api/usuarios',
      formularios: '/api/formularios',
      comissoes: '/api/comissoes',
      equipes: '/api/equipes',
      administradoras: '/api/administradoras',
      metas: '/api/metas',
      dashboard: '/api/dashboard',
      plans: '/api/plans',
      subscription: '/api/subscription',
      billing: '/api/billing',
      webhooks: '/api/webhooks'
    }
  });
});

// Rota mockada de grupos (opcional)
app.get('/api/grupos', (req, res) => {
  res.json({
    grupos: [
      { id: 1, administradora: 'Honda', grupo: 'H001', cotas_disponiveis: 25 },
      { id: 2, administradora: 'Embracon', grupo: 'E001', cotas_disponiveis: 15 },
      { id: 3, administradora: 'Porto Seguro', grupo: 'PS001', cotas_disponiveis: 30 },
      { id: 4, administradora: 'Rodobens', grupo: 'R001', cotas_disponiveis: 20 }
    ]
  });
});

// Tratamento de erros 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Tratamento de erros gerais
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Para desenvolvimento local
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
  });
}

// Para Vercel (serverless)
export default app;
