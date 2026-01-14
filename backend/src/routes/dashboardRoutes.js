import express from 'express';
import { estatisticasDashboard } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';

const router = express.Router();

// Todas as rotas requerem autenticação e isolamento multi-tenant
router.use(authenticateToken);
router.use(tenantMiddleware);

// Rota de estatísticas do dashboard
router.get('/estatisticas', estatisticasDashboard);

export default router;
