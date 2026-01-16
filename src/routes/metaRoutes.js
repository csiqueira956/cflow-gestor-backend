import express from 'express';
import {
  listarMetas,
  buscarMeta,
  criarMeta,
  atualizarMeta,
  deletarMeta
} from '../controllers/metaController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';

const router = express.Router();

// Todas as rotas de metas requerem autenticação, isolamento multi-tenant e permissão de admin
router.use(authenticateToken);
router.use(tenantMiddleware);
router.use(isAdmin);

// Rotas de metas (apenas admin)
router.get('/', listarMetas);
router.get('/:id', buscarMeta);
router.post('/', criarMeta);
router.put('/:id', atualizarMeta);
router.delete('/:id', deletarMeta);

export default router;
