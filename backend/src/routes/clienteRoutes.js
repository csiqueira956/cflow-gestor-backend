import express from 'express';
import {
  listarClientes,
  buscarCliente,
  criarCliente,
  atualizarCliente,
  atualizarEtapa,
  deletarCliente,
  estatisticas,
  criarClientePublico
} from '../controllers/clienteController.js';
import { authenticateToken } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';

const router = express.Router();

// Rota pública para cadastro via link público (DEVE vir ANTES da autenticação)
router.post('/publico/:linkPublico', criarClientePublico);

// Todas as outras rotas de clientes requerem autenticação e isolamento multi-tenant
router.use(authenticateToken);
router.use(tenantMiddleware);

// Rotas de clientes
router.get('/', listarClientes);
router.get('/estatisticas', estatisticas);
router.get('/:id', buscarCliente);
router.post('/', criarCliente);
router.put('/:id', atualizarCliente);
router.patch('/:id/etapa', atualizarEtapa);
router.delete('/:id', deletarCliente);

export default router;
