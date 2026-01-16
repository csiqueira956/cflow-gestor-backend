import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';
import Invoice from '../models/Invoice.js';

/**
 * Buscar assinatura ativa da empresa logada
 * GET /api/subscription
 */
export const getMySubscription = async (req, res) => {
  try {
    const { companyId } = req;

    const subscription = await Subscription.findActiveByCompanyId(companyId);

    if (!subscription) {
      return res.status(404).json({
        error: 'Assinatura não encontrada',
        message: 'Esta empresa não possui uma assinatura ativa'
      });
    }

    return res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao buscar assinatura',
      message: error.message
    });
  }
};

/**
 * Criar trial gratuito
 * POST /api/subscription/trial
 */
export const createTrial = async (req, res) => {
  try {
    const { companyId } = req;
    const { planId } = req.body; // Opcional - padrão é plano básico

    // Verificar se já tem assinatura
    const hasActive = await Subscription.isActive(companyId);

    if (hasActive) {
      return res.status(400).json({
        error: 'Assinatura já existe',
        message: 'Esta empresa já possui uma assinatura ativa'
      });
    }

    const subscription = await Subscription.createTrial(companyId, planId);

    return res.status(201).json({
      success: true,
      message: 'Trial de 14 dias iniciado com sucesso!',
      data: subscription
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao criar trial',
      message: error.message
    });
  }
};

/**
 * Fazer upgrade de plano
 * POST /api/subscription/upgrade
 */
export const upgrade = async (req, res) => {
  try {
    const { companyId } = req;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        error: 'Plano não informado',
        message: 'Informe o ID do novo plano'
      });
    }

    // Buscar assinatura atual
    const currentSub = await Subscription.findActiveByCompanyId(companyId);

    if (!currentSub) {
      return res.status(404).json({
        error: 'Assinatura não encontrada',
        message: 'Crie uma assinatura antes de fazer upgrade'
      });
    }

    // Verificar se é realmente upgrade
    const comparison = await Plan.compare(currentSub.plan_id, planId);

    if (!comparison.isUpgrade) {
      return res.status(400).json({
        error: 'Plano inferior',
        message: 'Use o endpoint /downgrade para reduzir seu plano'
      });
    }

    // Fazer upgrade
    const updatedSub = await Subscription.changePlan(
      currentSub.id,
      companyId,
      planId,
      req.user.id
    );

    // TODO: Criar cobrança proporcional no gateway de pagamento

    return res.json({
      success: true,
      message: 'Upgrade realizado com sucesso!',
      data: {
        subscription: updatedSub,
        comparison
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao fazer upgrade',
      message: error.message
    });
  }
};

/**
 * Fazer downgrade de plano
 * POST /api/subscription/downgrade
 */
export const downgrade = async (req, res) => {
  try {
    const { companyId } = req;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        error: 'Plano não informado',
        message: 'Informe o ID do novo plano'
      });
    }

    // Buscar assinatura atual
    const currentSub = await Subscription.findActiveByCompanyId(companyId);

    if (!currentSub) {
      return res.status(404).json({
        error: 'Assinatura não encontrada'
      });
    }

    // Verificar se é realmente downgrade
    const comparison = await Plan.compare(currentSub.plan_id, planId);

    if (comparison.isUpgrade) {
      return res.status(400).json({
        error: 'Plano superior',
        message: 'Use o endpoint /upgrade para aumentar seu plano'
      });
    }

    // Fazer downgrade
    const updatedSub = await Subscription.changePlan(
      currentSub.id,
      companyId,
      planId,
      req.user.id
    );

    return res.json({
      success: true,
      message: 'Downgrade agendado para o fim do período atual',
      data: {
        subscription: updatedSub,
        comparison,
        effectiveDate: updatedSub.current_period_end
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao fazer downgrade',
      message: error.message
    });
  }
};

/**
 * Cancelar assinatura
 * POST /api/subscription/cancel
 */
export const cancel = async (req, res) => {
  try {
    const { companyId } = req;
    const { immediate = false } = req.body;

    // Buscar assinatura atual
    const currentSub = await Subscription.findActiveByCompanyId(companyId);

    if (!currentSub) {
      return res.status(404).json({
        error: 'Assinatura não encontrada'
      });
    }

    const cancelledSub = await Subscription.cancel(
      currentSub.id,
      companyId,
      immediate,
      req.user.id
    );

    return res.json({
      success: true,
      message: immediate
        ? 'Assinatura cancelada imediatamente'
        : 'Cancelamento agendado para o fim do período',
      data: {
        subscription: cancelledSub,
        effectiveDate: immediate ? new Date() : cancelledSub.current_period_end
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao cancelar assinatura',
      message: error.message
    });
  }
};

/**
 * Reativar assinatura cancelada
 * POST /api/subscription/reactivate
 */
export const reactivate = async (req, res) => {
  try {
    const { companyId } = req;

    // Buscar assinatura cancelada
    const query = `
      SELECT * FROM subscriptions
      WHERE company_id = $1
        AND (status = 'cancelled' OR cancel_at_period_end = true)
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const pool = (await import('../config/database.js')).default;
    const result = await pool.query(query, [companyId]);
    const cancelledSub = result.rows[0];

    if (!cancelledSub) {
      return res.status(404).json({
        error: 'Nenhuma assinatura cancelada encontrada'
      });
    }

    const reactivatedSub = await Subscription.reactivate(
      cancelledSub.id,
      companyId,
      req.user.id
    );

    return res.json({
      success: true,
      message: 'Assinatura reativada com sucesso!',
      data: reactivatedSub
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao reativar assinatura',
      message: error.message
    });
  }
};

/**
 * Buscar histórico da assinatura
 * GET /api/subscription/history
 */
export const getHistory = async (req, res) => {
  try {
    const { companyId } = req;

    const currentSub = await Subscription.findActiveByCompanyId(companyId);

    if (!currentSub) {
      return res.status(404).json({
        error: 'Assinatura não encontrada'
      });
    }

    const history = await Subscription.getHistory(currentSub.id, companyId);

    return res.json({
      success: true,
      data: history
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao buscar histórico',
      message: error.message
    });
  }
};

/**
 * Buscar resumo da assinatura (para dashboard)
 * GET /api/subscription/summary
 */
export const getSummary = async (req, res) => {
  try {
    const { companyId } = req;

    // Buscar assinatura
    const subscription = await Subscription.findActiveByCompanyId(companyId);

    if (!subscription) {
      return res.json({
        success: true,
        data: {
          hasSubscription: false,
          message: 'Nenhuma assinatura ativa'
        }
      });
    }

    // Buscar próxima fatura
    const nextInvoice = await Invoice.getNextPending(companyId);

    // Buscar estatísticas de faturas
    const invoiceStats = await Invoice.getStats(companyId);

    // Calcular dias restantes do trial
    let daysLeftInTrial = null;
    if (subscription.status === 'trialing' && subscription.trial_ends_at) {
      const trialEnd = new Date(subscription.trial_ends_at);
      const now = new Date();
      daysLeftInTrial = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    }

    // Calcular dias até próxima cobrança
    let daysUntilRenewal = null;
    if (subscription.current_period_end) {
      const periodEnd = new Date(subscription.current_period_end);
      const now = new Date();
      daysUntilRenewal = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24));
    }

    return res.json({
      success: true,
      data: {
        hasSubscription: true,
        subscription,
        nextInvoice,
        invoiceStats,
        daysLeftInTrial,
        daysUntilRenewal,
        isInTrial: subscription.status === 'trialing',
        isCancelled: subscription.cancel_at_period_end || subscription.status === 'cancelled'
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao buscar resumo',
      message: error.message
    });
  }
};

/**
 * Buscar uso atual da assinatura (limites)
 * GET /api/subscription/usage
 */
export const getUsage = async (req, res) => {
  try {
    const { companyId } = req;

    // Buscar assinatura
    const subscription = await Subscription.findActiveByCompanyId(companyId);

    if (!subscription) {
      return res.status(404).json({
        error: 'Assinatura não encontrada'
      });
    }

    // Buscar limites do plano
    const plan = await Plan.findById(subscription.plan_id);

    // Contar uso atual
    const pool = (await import('../config/database.js')).default;

    const [clientesResult] = await pool.query(
      'SELECT COUNT(*) as count FROM clientes WHERE company_id = $1',
      [companyId]
    );

    const [usuariosResult] = await pool.query(
      'SELECT COUNT(*) as count FROM usuarios WHERE company_id = $1',
      [companyId]
    );

    const clientesUsados = parseInt(clientesResult.rows[0]?.count || 0);
    const usuariosUsados = parseInt(usuariosResult.rows[0]?.count || 0);

    return res.json({
      success: true,
      data: {
        clientes: {
          usado: clientesUsados,
          limite: plan?.max_leads || 100,
          percentual: plan?.max_leads ? Math.round((clientesUsados / plan.max_leads) * 100) : 0
        },
        usuarios: {
          usado: usuariosUsados,
          limite: plan?.max_users || 5,
          percentual: plan?.max_users ? Math.round((usuariosUsados / plan.max_users) * 100) : 0
        },
        plan: {
          id: plan?.id,
          name: plan?.name,
          features: plan?.features || []
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao buscar uso',
      message: error.message
    });
  }
};

export default {
  getMySubscription,
  createTrial,
  upgrade,
  downgrade,
  cancel,
  reactivate,
  getHistory,
  getSummary,
  getUsage
};
