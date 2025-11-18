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

const router = express.Router();

// Rota pública para cadastro via link público (DEVE vir ANTES da autenticação)
router.post('/publico/:linkPublico', criarClientePublico);

// Todas as outras rotas de clientes requerem autenticação
router.use(authenticateToken);

// Rotas de clientes
router.get('/', listarClientes);
router.get('/estatisticas', estatisticas);
router.get('/:id', buscarCliente);
router.post('/', criarCliente);
router.put('/:id', atualizarCliente);
router.patch('/:id/etapa', atualizarEtapa);
router.delete('/:id', deletarCliente);

export default router;
