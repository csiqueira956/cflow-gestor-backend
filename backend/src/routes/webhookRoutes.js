import express from 'express';
import { asaasWebhook, webhookHealth } from '../controllers/webhookController.js';

const router = express.Router();

// Health check (sem autenticação)
router.get('/health', webhookHealth);

// Webhook do Asaas (sem autenticação - vem do gateway)
router.post('/asaas', asaasWebhook);

export default router;
