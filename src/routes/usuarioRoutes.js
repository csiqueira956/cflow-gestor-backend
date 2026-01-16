import express from 'express';
import {
  listarVendedores,
  listarGerentes,
  listarUsuarios,
  buscarUsuario,
  criarUsuario,
  atualizarUsuario,
  deletarUsuario,
  registrarVendedor
} from '../controllers/usuarioController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';
import { validateVendedorRegister, validateUserUpdate, sanitizeInput } from '../middleware/validation.js';

const router = express.Router();

// Aplicar sanitização em todas as rotas
router.use(sanitizeInput);

// Rota pública de registro de vendedor (via convite do WhatsApp)
router.post('/vendedores/registrar', validateVendedorRegister, registrarVendedor);

// Todas as rotas abaixo requerem autenticação, isolamento multi-tenant e permissão de admin
router.use(authenticateToken);
router.use(tenantMiddleware);
router.use(isAdmin);

// Rotas de usuários (apenas admin)
router.get('/vendedores', listarVendedores);
router.get('/gerentes', listarGerentes);
router.get('/', listarUsuarios);
router.post('/', criarUsuario);
router.get('/:id', buscarUsuario);
router.put('/:id', validateUserUpdate, atualizarUsuario);
router.delete('/:id', deletarUsuario);

export default router;
