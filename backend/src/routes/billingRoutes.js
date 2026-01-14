import express from 'express';
import {
  listInvoices,
  getInvoice,
  getStats,
  getNextInvoice,
  getOverdueInvoices,
  getUpcomingInvoices,
  createInvoice,
  cancelInvoice,
  getDashboard
} from '../controllers/billingController.js';
import { authenticateToken } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';

const router = express.Router();

// Todas as rotas requerem autenticação e tenant
router.use(authenticateToken);
router.use(tenantMiddleware);

// Dashboard geral
router.get('/dashboard', getDashboard);

// Estatísticas
router.get('/stats', getStats);

// Faturas
router.get('/invoices', listInvoices); // Listar faturas
router.get('/invoices/next', getNextInvoice); // Próxima fatura
router.get('/invoices/overdue', getOverdueInvoices); // Faturas vencidas
router.get('/invoices/upcoming', getUpcomingInvoices); // Faturas próximas
router.get('/invoices/:id', getInvoice); // Buscar fatura específica

// Ações (apenas admin)
router.post('/invoices', createInvoice); // Criar fatura manualmente
router.delete('/invoices/:id', cancelInvoice); // Cancelar fatura

export default router;
