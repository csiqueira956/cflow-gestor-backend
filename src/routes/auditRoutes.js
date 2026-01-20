import express from 'express';
import { getAuditLogs } from '../services/auditService.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Listar logs de auditoria (apenas admin)
router.get('/', authenticateToken, isAdmin, getAuditLogs);

export default router;
