import express from 'express';
import {
  getAllCompaniesSubscriptions,
  getCompanySubscriptionDetails,
  changeSubscriptionStatus,
  createCompany,
  updateCompany,
  deleteCompany,
  getAvailablePlans,
  createPlan,
  editPlan,
  deletePlan,
  gerarCobrancaCartao,
  getCompanyPagamentos
} from '../controllers/assinaturaController.js';
import {
  alterarSenha,
  listarUsuariosEmpresa,
  criarUsuarioEmpresa,
  atualizarUsuario,
  excluirUsuario,
  resetarSenhaUsuario
} from '../controllers/adminController.js';
import { authenticateToken, isSuperAdmin } from '../middleware/auth.js';
import { executarVerificacoesAutomaticas } from '../services/notificationService.js';

const router = express.Router();

// === ROTAS DE SUPER ADMIN (gerenciamento de todas as assinaturas) ===
// Todas requerem autenticação e privilégio de SUPER ADMIN
// IMPORTANTE: Apenas super_admin pode acessar estas rotas (não admin comum)

// Listar todas as empresas e suas assinaturas
router.get('/assinaturas/todas', authenticateToken, isSuperAdmin, getAllCompaniesSubscriptions);

// Obter detalhes completos de uma empresa específica
router.get('/assinaturas/empresa/:companyId', authenticateToken, isSuperAdmin, getCompanySubscriptionDetails);

// Listar planos disponíveis
router.get('/assinaturas/planos', authenticateToken, isSuperAdmin, getAvailablePlans);

// Alterar status da assinatura manualmente
router.post('/assinaturas/alterar-status', authenticateToken, isSuperAdmin, changeSubscriptionStatus);

// Criar nova empresa com assinatura
router.post('/assinaturas/criar-empresa', authenticateToken, isSuperAdmin, createCompany);

// Atualizar dados da empresa
router.put('/assinaturas/empresa/:companyId', authenticateToken, isSuperAdmin, updateCompany);

// Excluir empresa
router.delete('/assinaturas/empresa/:companyId', authenticateToken, isSuperAdmin, deleteCompany);

// Gerar cobrança via cartão de crédito
router.post('/assinaturas/empresa/:companyId/gerar-cobranca-cartao', authenticateToken, isSuperAdmin, gerarCobrancaCartao);

// Obter histórico de pagamentos de uma empresa
router.get('/assinaturas/empresa/:companyId/pagamentos', authenticateToken, isSuperAdmin, getCompanyPagamentos);

// === ROTAS DE GERENCIAMENTO DE PLANOS ===

// Criar novo plano
router.post('/assinaturas/planos', authenticateToken, isSuperAdmin, createPlan);

// Editar plano
router.put('/assinaturas/planos/:planoId', authenticateToken, isSuperAdmin, editPlan);

// Excluir plano
router.delete('/assinaturas/planos/:planoId', authenticateToken, isSuperAdmin, deletePlan);

// Alterar senha do super admin
router.put('/alterar-senha', authenticateToken, isSuperAdmin, alterarSenha);

// === ROTAS DE GERENCIAMENTO DE USUÁRIOS ===

// Listar usuários de uma empresa
router.get('/empresas/:companyId/usuarios', authenticateToken, isSuperAdmin, listarUsuariosEmpresa);

// Criar novo usuário para uma empresa
router.post('/empresas/:companyId/usuarios', authenticateToken, isSuperAdmin, criarUsuarioEmpresa);

// Atualizar usuário
router.put('/usuarios/:usuarioId', authenticateToken, isSuperAdmin, atualizarUsuario);

// Excluir usuário
router.delete('/usuarios/:usuarioId', authenticateToken, isSuperAdmin, excluirUsuario);

// Resetar senha de usuário
router.post('/usuarios/:usuarioId/resetar-senha', authenticateToken, isSuperAdmin, resetarSenhaUsuario);

// === ROTAS DE NOTIFICAÇÕES (SUPER ADMIN) ===

// Executar verificações automáticas de notificações
router.post('/notifications/run-checks', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const resultado = await executarVerificacoesAutomaticas();
    res.json({
      success: true,
      message: 'Verificações automáticas executadas com sucesso',
      resultado
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro ao executar verificações automáticas',
      message: error.message
    });
  }
});

export default router;
