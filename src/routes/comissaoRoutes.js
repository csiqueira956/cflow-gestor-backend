import express from 'express';
import {
  listarComissoes,
  buscarComissao,
  criarComissao,
  atualizarComissao,
  deletarComissao,
  atualizarParcela,
  estatisticas
} from '../controllers/comissaoController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';

const router = express.Router();

// Todas as rotas de comissões requerem autenticação e isolamento multi-tenant
router.use(authenticateToken);
router.use(tenantMiddleware);

// Rotas acessíveis por todos os usuários autenticados
router.get('/', listarComissoes);
router.get('/estatisticas', estatisticas);
router.get('/:id', buscarComissao);

// Rotas apenas para admin
router.post('/', isAdmin, criarComissao);
router.put('/:id', isAdmin, atualizarComissao);
router.delete('/:id', isAdmin, deletarComissao);
router.put('/parcelas/:id', isAdmin, atualizarParcela);

export default router;
