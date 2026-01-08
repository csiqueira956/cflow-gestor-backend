import express from 'express';
import {
  listarVendedores,
  listarGerentes,
  listarUsuarios,
  buscarUsuario,
  atualizarUsuario,
  deletarUsuario,
  registrarVendedor
} from '../controllers/usuarioController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { canCreateUserPublic, requireActiveSubscription } from '../middleware/checkSubscription.js';

const router = express.Router();

// Rota pública de registro de vendedor (via convite do WhatsApp)
router.post('/vendedores/registrar', canCreateUserPublic, registrarVendedor);

// Todas as rotas abaixo requerem autenticação, assinatura ativa e permissão de admin
router.use(authenticateToken);
router.use(requireActiveSubscription);
router.use(isAdmin);

// Rotas de usuários (apenas admin)
router.get('/vendedores', listarVendedores);
router.get('/gerentes', listarGerentes);
router.get('/', listarUsuarios);
router.get('/:id', buscarUsuario);
router.put('/:id', atualizarUsuario);
router.delete('/:id', deletarUsuario);

export default router;
