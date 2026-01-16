import express from 'express';
import {
  getMinhaAssinatura,
  checkStatus,
  updatePlan,
  getPagamentos,
  getUso,
  validarNovoUsuario,
  validarNovoLead,
  getAllCompaniesSubscriptions,
  getCompanySubscriptionDetails,
  changeSubscriptionStatus,
  getPlansForUpgrade,
  initiateUpgrade
} from '../controllers/assinaturaController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkSubscriptionWarning } from '../middleware/checkSubscription.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';

const router = express.Router();

// Todas as rotas de assinatura requerem autenticação e isolamento multi-tenant
// Usar checkSubscriptionWarning para adicionar info da assinatura sem bloquear acesso

// === ROTAS DE CLIENTE (usuário visualizando sua própria assinatura) ===

// Obter dados da assinatura da empresa
router.get('/', authenticateToken, tenantMiddleware, checkSubscriptionWarning, getMinhaAssinatura);

// Verificar status da assinatura
router.get('/status', authenticateToken, tenantMiddleware, checkStatus);

// Obter histórico de pagamentos
router.get('/pagamentos', authenticateToken, tenantMiddleware, getPagamentos);

// Obter informações de uso (usuários, leads, etc)
router.get('/uso', authenticateToken, tenantMiddleware, getUso);

// Validar se pode criar novo usuário
router.get('/validar-usuario', authenticateToken, tenantMiddleware, validarNovoUsuario);

// Validar se pode criar novo lead
router.get('/validar-lead', authenticateToken, tenantMiddleware, validarNovoLead);

// Listar planos disponíveis para upgrade
router.get('/planos-upgrade', authenticateToken, tenantMiddleware, getPlansForUpgrade);

// Iniciar processo de upgrade de plano com pagamento
router.post('/iniciar-upgrade', authenticateToken, tenantMiddleware, initiateUpgrade);

// Atualizar plano (upgrade/downgrade) - mantido para compatibilidade
router.put('/plano', authenticateToken, tenantMiddleware, updatePlan);

export default router;
