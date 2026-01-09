// CFLOW Gestor API - v1.0.1
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
import assinaturaRoutes from './routes/assinaturaRoutes.js';
import adminAssinaturaRoutes from './routes/adminAssinaturaRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { initSubscriptionScheduler } from './services/subscriptionScheduler.js';

// Configuração de variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Detectar ambiente Vercel
const isVercel = process.env.VERCEL === '1';

// Middlewares de Segurança
app.use(helmet()); // Adiciona headers de segurança HTTP

// CORS configurado para desenvolvimento e produção
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:5173', // CFLOW Gestor frontend dev
  'http://localhost:5174', // Admin SaaS frontend dev
  process.env.ADMIN_SAAS_URL || 'http://localhost:8888',
  'https://cflow-gestor-frontend.vercel.app' // Produção
];

// Adicionar domínios de produção extras se existirem
if (process.env.PRODUCTION_FRONTEND_URL) {
  allowedOrigins.push(process.env.PRODUCTION_FRONTEND_URL);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

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
app.use('/api/assinatura', assinaturaRoutes);
app.use('/api/admin', adminAssinaturaRoutes);
app.use('/api/webhooks', webhookRoutes); // Webhooks do ASAAS
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes); // Analytics e KPIs

// Rota de teste
app.get('/', (req, res) => {
  res.json({
    message: 'API Gestor de Consórcios',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      clientes: '/api/clientes',
      usuarios: '/api/usuarios',
      formularios: '/api/formularios',
      comissoes: '/api/comissoes',
      equipes: '/api/equipes',
      administradoras: '/api/administradoras',
      metas: '/api/metas',
      assinatura: '/api/assinatura'
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

// Inicialização do servidor (não executa na Vercel - ambiente serverless)
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);

    // Inicializar scheduler de assinaturas (apenas em servidor tradicional)
    // O scheduler não funciona em serverless - usar Vercel Cron Jobs se necessário
    initSubscriptionScheduler();
  });
}

export default app;
