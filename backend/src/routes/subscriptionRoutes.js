import express from 'express';
import {
  getMySubscription,
  createTrial,
  upgrade,
  downgrade,
  cancel,
  reactivate,
  getHistory,
  getSummary
} from '../controllers/subscriptionController.js';
import { authenticateToken } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';

const router = express.Router();

// Todas as rotas requerem autenticação e tenant
router.use(authenticateToken);
router.use(tenantMiddleware);

// Rotas de assinatura
router.get('/', getMySubscription); // Buscar assinatura ativa
router.get('/summary', getSummary); // Resumo da assinatura (dashboard)
router.get('/history', getHistory); // Histórico de mudanças

router.post('/trial', createTrial); // Criar trial gratuito
router.post('/upgrade', upgrade); // Fazer upgrade
router.post('/downgrade', downgrade); // Fazer downgrade
router.post('/cancel', cancel); // Cancelar assinatura
router.post('/reactivate', reactivate); // Reativar assinatura

export default router;
