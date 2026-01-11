import express from 'express';
import {
  calcularMRR,
  calcularTaxaConversao,
  calcularChurnRate,
  obterOverview,
  obterFunilVendas
} from '../controllers/analyticsController.js';
import { authenticateToken, isSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * ROTAS DE ANALYTICS
 *
 * Todas as rotas requerem autenticação e permissão de super admin
 *
 * Endpoints disponíveis:
 * - GET /overview - Métricas gerais do dashboard
 * - GET /mrr - Monthly Recurring Revenue
 * - GET /conversao - Taxa de conversão Trial → Active
 * - GET /churn - Taxa de cancelamento
 * - GET /funil - Funil de vendas
 */

// Middleware: todas as rotas exigem super admin
router.use(authenticateToken, isSuperAdmin);

// Métricas gerais
router.get('/overview', obterOverview);

// MRR (Monthly Recurring Revenue)
router.get('/mrr', calcularMRR);

// Taxa de conversão
router.get('/conversao', calcularTaxaConversao);

// Churn rate
router.get('/churn', calcularChurnRate);

// Funil de vendas
router.get('/funil', obterFunilVendas);

export default router;
