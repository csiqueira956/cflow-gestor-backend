import Invoice from '../models/Invoice.js';
import Subscription from '../models/Subscription.js';

/**
 * Listar faturas da empresa
 * GET /api/billing/invoices
 */
export const listInvoices = async (req, res) => {
  try {
    const { companyId } = req;
    const {
      status,
      limit = 50,
      offset = 0
    } = req.query;

    const invoices = await Invoice.listByCompanyId(companyId, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return res.json({
      success: true,
      data: invoices,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: invoices.length
      }
    });
  } catch (error) {
    console.error('❌ Erro ao listar faturas:', error);
    return res.status(500).json({
      error: 'Erro ao listar faturas',
      message: error.message
    });
  }
};

/**
 * Buscar fatura por ID
 * GET /api/billing/invoices/:id
 */
export const getInvoice = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;

    const invoice = await Invoice.findById(id, companyId);

    if (!invoice) {
      return res.status(404).json({
        error: 'Fatura não encontrada'
      });
    }

    return res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('❌ Erro ao buscar fatura:', error);
    return res.status(500).json({
      error: 'Erro ao buscar fatura',
      message: error.message
    });
  }
};

/**
 * Buscar estatísticas de faturamento
 * GET /api/billing/stats
 */
export const getStats = async (req, res) => {
  try {
    const { companyId } = req;

    const stats = await Invoice.getStats(companyId);

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    return res.status(500).json({
      error: 'Erro ao buscar estatísticas',
      message: error.message
    });
  }
};

/**
 * Buscar próxima fatura pendente
 * GET /api/billing/next
 */
export const getNextInvoice = async (req, res) => {
  try {
    const { companyId } = req;

    const invoice = await Invoice.getNextPending(companyId);

    if (!invoice) {
      return res.status(404).json({
        error: 'Nenhuma fatura pendente',
        message: 'Não há faturas pendentes no momento'
      });
    }

    return res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('❌ Erro ao buscar próxima fatura:', error);
    return res.status(500).json({
      error: 'Erro ao buscar próxima fatura',
      message: error.message
    });
  }
};

/**
 * Buscar faturas vencidas
 * GET /api/billing/overdue
 */
export const getOverdueInvoices = async (req, res) => {
  try {
    const { companyId } = req;

    const invoices = await Invoice.findOverdue(companyId);

    return res.json({
      success: true,
      data: invoices,
      count: invoices.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar faturas vencidas:', error);
    return res.status(500).json({
      error: 'Erro ao buscar faturas vencidas',
      message: error.message
    });
  }
};

/**
 * Buscar faturas próximas do vencimento
 * GET /api/billing/upcoming
 */
export const getUpcomingInvoices = async (req, res) => {
  try {
    const { companyId } = req;
    const { days = 7 } = req.query;

    const invoices = await Invoice.findUpcoming(parseInt(days), companyId);

    return res.json({
      success: true,
      data: invoices,
      count: invoices.length,
      days: parseInt(days)
    });
  } catch (error) {
    console.error('❌ Erro ao buscar faturas próximas:', error);
    return res.status(500).json({
      error: 'Erro ao buscar faturas próximas',
      message: error.message
    });
  }
};

/**
 * Gerar nova fatura manualmente (admin)
 * POST /api/billing/invoices
 */
export const createInvoice = async (req, res) => {
  try {
    const { companyId } = req;

    // Apenas admins podem criar faturas manualmente
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Apenas administradores podem criar faturas manualmente'
      });
    }

    const { amount, dueDate, description } = req.body;

    if (!amount || !dueDate) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Informe amount e dueDate'
      });
    }

    // Buscar assinatura ativa
    const subscription = await Subscription.findActiveByCompanyId(companyId);

    if (!subscription) {
      return res.status(404).json({
        error: 'Assinatura não encontrada',
        message: 'Esta empresa não possui assinatura ativa'
      });
    }

    const invoice = await Invoice.create({
      subscriptionId: subscription.id,
      companyId,
      amount,
      dueDate,
      description
    });

    return res.status(201).json({
      success: true,
      message: 'Fatura criada com sucesso',
      data: invoice
    });
  } catch (error) {
    console.error('❌ Erro ao criar fatura:', error);
    return res.status(500).json({
      error: 'Erro ao criar fatura',
      message: error.message
    });
  }
};

/**
 * Cancelar fatura (admin)
 * DELETE /api/billing/invoices/:id
 */
export const cancelInvoice = async (req, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;

    // Apenas admins podem cancelar faturas
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Apenas administradores podem cancelar faturas'
      });
    }

    const invoice = await Invoice.cancel(id, companyId);

    return res.json({
      success: true,
      message: 'Fatura cancelada com sucesso',
      data: invoice
    });
  } catch (error) {
    console.error('❌ Erro ao cancelar fatura:', error);

    if (error.message === 'Fatura não encontrada') {
      return res.status(404).json({
        error: error.message
      });
    }

    return res.status(500).json({
      error: 'Erro ao cancelar fatura',
      message: error.message
    });
  }
};

/**
 * Dashboard de billing (resumo geral)
 * GET /api/billing/dashboard
 */
export const getDashboard = async (req, res) => {
  try {
    const { companyId } = req;

    // Buscar assinatura
    const subscription = await Subscription.findActiveByCompanyId(companyId);

    // Buscar estatísticas
    const stats = await Invoice.getStats(companyId);

    // Buscar próxima fatura
    const nextInvoice = await Invoice.getNextPending(companyId);

    // Buscar faturas vencidas
    const overdueInvoices = await Invoice.findOverdue(companyId);

    // Buscar faturas próximas (7 dias)
    const upcomingInvoices = await Invoice.findUpcoming(7, companyId);

    return res.json({
      success: true,
      data: {
        subscription,
        stats,
        nextInvoice,
        overdueInvoices,
        upcomingInvoices: upcomingInvoices.slice(0, 3), // Apenas próximas 3
        hasOverdue: overdueInvoices.length > 0,
        hasUpcoming: upcomingInvoices.length > 0
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar dashboard:', error);
    return res.status(500).json({
      error: 'Erro ao buscar dashboard',
      message: error.message
    });
  }
};

export default {
  listInvoices,
  getInvoice,
  getStats,
  getNextInvoice,
  getOverdueInvoices,
  getUpcomingInvoices,
  createInvoice,
  cancelInvoice,
  getDashboard
};
