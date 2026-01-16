import express from 'express';
import { asaasWebhook, webhookHealth } from '../controllers/webhookController.js';
import { validateAsaasWebhook } from '../middleware/webhookSignature.js';

const router = express.Router();

// Health check (sem autenticação)
router.get('/health', webhookHealth);

// Webhook do Asaas (com validação de token)
// O middleware validateAsaasWebhook verifica o header 'asaas-access-token'
// Configure ASAAS_WEBHOOK_TOKEN no .env com o mesmo token do painel Asaas
router.post('/asaas', validateAsaasWebhook, asaasWebhook);

export default router;
