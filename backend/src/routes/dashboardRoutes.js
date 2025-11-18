import express from 'express';
import { estatisticasDashboard } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rota de estatísticas do dashboard
router.get('/estatisticas', estatisticasDashboard);

export default router;
