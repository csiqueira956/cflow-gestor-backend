import express from 'express';
import {
  listarEquipes,
  buscarEquipe,
  criarEquipe,
  atualizarEquipe,
  deletarEquipe
} from '../controllers/equipeController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas de equipes requerem autenticação e permissão de admin
router.use(authenticateToken);
router.use(isAdmin);

// Rotas de equipes (apenas admin)
router.get('/', listarEquipes);
router.get('/:id', buscarEquipe);
router.post('/', criarEquipe);
router.put('/:id', atualizarEquipe);
router.delete('/:id', deletarEquipe);

export default router;
