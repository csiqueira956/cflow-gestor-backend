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
import { canCreateLead, canCreateLeadPublic, requireActiveSubscription } from '../middleware/checkSubscription.js';

const router = express.Router();

// Rota pública para cadastro via link público (DEVE vir ANTES da autenticação)
router.post('/publico/:linkPublico', canCreateLeadPublic, criarClientePublico);

// Todas as outras rotas de clientes requerem autenticação e assinatura ativa
router.use(authenticateToken);
router.use(requireActiveSubscription);

// Rotas de clientes
router.get('/', listarClientes);
router.get('/estatisticas', estatisticas);
router.get('/:id', buscarCliente);
router.post('/', canCreateLead, criarCliente);
router.put('/:id', atualizarCliente);
router.patch('/:id/etapa', atualizarEtapa);
router.delete('/:id', deletarCliente);

export default router;
