import express from 'express';
import {
  listarNotificacoes,
  contarNaoLidas,
  marcarComoLida,
  marcarTodasComoLidas,
  criarNotificacao,
  deletarNotificacao
} from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// === ROTAS DE NOTIFICAÇÕES ===

// Listar notificações da empresa
router.get('/', listarNotificacoes);

// Contar notificações não lidas
router.get('/unread-count', contarNaoLidas);

// Marcar notificação como lida
router.put('/:id/read', marcarComoLida);

// Marcar todas as notificações como lidas
router.put('/read-all', marcarTodasComoLidas);

// Criar notificação (uso interno/admin)
router.post('/', criarNotificacao);

// Deletar notificação
router.delete('/:id', deletarNotificacao);

export default router;
