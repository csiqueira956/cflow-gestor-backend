import express from 'express';
import {
  criarLead,
  listarLeads,
  getLeadsStats,
  getLeadById,
  atualizarStatusLead,
  atribuirLead,
  deletarLead
} from '../controllers/websiteLeadsController.js';
import { authenticateToken, isSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// ==========================================
// ROTA PÚBLICA - Receber leads do site
// ==========================================
router.post('/', criarLead);

// ==========================================
// ROTAS DE SUPER ADMIN - Gerenciar leads
// ==========================================

// Estatísticas dos leads
router.get('/stats', authenticateToken, isSuperAdmin, getLeadsStats);

// Listar todos os leads
router.get('/', authenticateToken, isSuperAdmin, listarLeads);

// Obter detalhes de um lead
router.get('/:id', authenticateToken, isSuperAdmin, getLeadById);

// Atualizar status do lead
router.patch('/:id/status', authenticateToken, isSuperAdmin, atualizarStatusLead);

// Atribuir lead a vendedor/empresa
router.patch('/:id/atribuir', authenticateToken, isSuperAdmin, atribuirLead);

// Deletar lead
router.delete('/:id', authenticateToken, isSuperAdmin, deletarLead);

export default router;
