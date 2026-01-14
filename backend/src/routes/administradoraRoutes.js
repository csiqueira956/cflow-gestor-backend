import express from 'express';
import {
  listarAdministradoras,
  buscarAdministradora,
  criarAdministradora,
  atualizarAdministradora,
  deletarAdministradora
} from '../controllers/administradoraController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';

const router = express.Router();

// Todas as rotas de administradoras requerem autenticação, isolamento multi-tenant e permissão de admin
router.use(authenticateToken);
router.use(tenantMiddleware);
router.use(isAdmin);

// Rotas de administradoras (apenas admin)
router.get('/', listarAdministradoras);
router.get('/:id', buscarAdministradora);
router.post('/', criarAdministradora);
router.put('/:id', atualizarAdministradora);
router.delete('/:id', deletarAdministradora);

export default router;
