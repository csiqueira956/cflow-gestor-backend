import express from 'express';
import {
  receberWebhookAsaas,
  listarWebhookLogs,
  reprocessarWebhook
} from '../controllers/webhookController.js';
import { authenticateToken, isSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * ROTAS DE WEBHOOK
 *
 * Endpoint público (sem autenticação):
 * - POST /asaas - Recebe webhooks do Asaas
 *
 * Endpoints protegidos (super admin):
 * - GET /logs - Lista logs de webhooks
 * - POST /reprocess/:id - Reprocessa webhook que falhou
 */

// Endpoint público para receber webhooks do Asaas
// IMPORTANTE: Esta rota NÃO requer autenticação pois é chamada pelo Asaas
router.post('/asaas', receberWebhookAsaas);

// Rotas protegidas - apenas super admin
router.get('/logs', authenticateToken, isSuperAdmin, listarWebhookLogs);
router.post('/reprocess/:id', authenticateToken, isSuperAdmin, reprocessarWebhook);

export default router;
