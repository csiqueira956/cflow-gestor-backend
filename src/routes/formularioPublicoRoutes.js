import express from 'express';
import {
  criarFormulario,
  listarFormularios,
  buscarFormulario,
  submeterFormulario,
  toggleAtivo,
  deletarFormulario,
} from '../controllers/formularioPublicoController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Rotas protegidas (requerem autenticação)
router.post('/', authenticateToken, criarFormulario);
router.get('/', authenticateToken, listarFormularios);
router.patch('/:id/toggle', authenticateToken, toggleAtivo);
router.delete('/:id', authenticateToken, deletarFormulario);

// Rotas públicas (não requerem autenticação)
router.get('/:token', buscarFormulario);
router.post('/:token/submit', submeterFormulario);

export default router;
