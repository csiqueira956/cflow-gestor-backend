import express from 'express';
import {
  listarAtividades,
  criarAtividade,
  buscarAtividade,
  atualizarAtividade,
  deletarAtividade,
  listarProximosFollowups,
  listarFollowupsAtrasados,
  estatisticasAtividades
} from '../controllers/atividadeController.js';
import { authenticateToken } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';

const router = express.Router();

// Todas as rotas requerem autenticação e isolamento multi-tenant
router.use(authenticateToken);
router.use(tenantMiddleware);

// Rotas de follow-ups (antes das rotas com parâmetros)
router.get('/followups/proximos', listarProximosFollowups);
router.get('/followups/atrasados', listarFollowupsAtrasados);
router.get('/estatisticas', estatisticasAtividades);

// Rotas de atividades por cliente
router.get('/cliente/:clienteId', listarAtividades);
router.post('/cliente/:clienteId', criarAtividade);

// Rotas de atividade específica
router.get('/:id', buscarAtividade);
router.put('/:id', atualizarAtividade);
router.delete('/:id', deletarAtividade);

export default router;
