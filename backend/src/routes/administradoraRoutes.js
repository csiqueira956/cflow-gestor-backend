import express from 'express';
import {
  listarAdministradoras,
  buscarAdministradora,
  criarAdministradora,
  atualizarAdministradora,
  deletarAdministradora
} from '../controllers/administradoraController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas de administradoras requerem autenticação e permissão de admin
router.use(authenticateToken);
router.use(isAdmin);

// Rotas de administradoras (apenas admin)
router.get('/', listarAdministradoras);
router.get('/:id', buscarAdministradora);
router.post('/', criarAdministradora);
router.put('/:id', atualizarAdministradora);
router.delete('/:id', deletarAdministradora);

export default router;
