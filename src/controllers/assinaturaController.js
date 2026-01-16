import axios from 'axios';
import { getSubscriptionStatus } from '../middleware/checkSubscription.js';
import pool from '../config/database.js';

// Configuração da API do Admin SaaS
const ADMIN_SAAS_URL = process.env.ADMIN_SAAS_URL || 'https://cflow-admin-saas.netlify.app';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

/**
 * Fazer requisição à API do Admin SaaS
 */
async function callAdminSaasAPI(endpoint, data) {
  try {
    const response = await axios.post(
      `${ADMIN_SAAS_URL}/.netlify/functions/${endpoint}`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': ADMIN_API_KEY
        },
        timeout: 10000 // 10 segundos
      }
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || error.response.data.message || 'Erro na API Admin SaaS');
    }

    throw new Error('Erro ao conectar com o serviço de assinaturas');
  }
}

/**
 * Obter dados da assinatura da empresa do usuário logado
 * GET /api/assinatura
 */
export const getMinhaAssinatura = async (req, res) => {
  try {
    const companyId = req.usuario.company_id;

    if (!companyId) {
      return res.status(400).json({
        error: 'Usuário não está vinculado a uma empresa'
      });
    }

    // Importar pool do banco de dados
    const pool = (await import('../config/database.js')).default;

    // Buscar assinatura local
    const assinaturaQuery = `
      SELECT
        a.*,
        p.nome as plan_name,
        p.descricao as plan_descricao,
        p.tipo_cobranca as billing_type,
        p.preco_fixo as plan_price,
        p.preco_por_usuario as price_per_user,
        p.max_usuarios,
        p.max_leads,
        p.max_storage_gb,
        p.features
      FROM assinaturas a
      LEFT JOIN planos p ON p.id = a.plano_id
      WHERE a.company_id = ?
    `;

    const result = await pool.query(assinaturaQuery, [companyId]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        error: 'Assinatura não encontrada'
      });
    }

    const subscription = result.rows[0];

    // Buscar planos disponíveis
    const planosResult = await pool.query('SELECT * FROM planos WHERE ativo = true ORDER BY preco_fixo');

    res.json({
      success: true,
      subscription: {
        subscription_id: subscription.id,
        company_id: subscription.company_id,
        status: subscription.status,
        plan_id: subscription.plano_id,
        plan_name: subscription.plan_name,
        plan_description: subscription.plan_descricao,
        billing_type: subscription.billing_type,
        plan_price: subscription.plan_price,
        price_per_user: subscription.price_per_user,
        max_users: subscription.max_usuarios,
        max_leads: subscription.max_leads,
        max_storage_gb: subscription.max_storage_gb,
        features: subscription.features ? JSON.parse(subscription.features) : [],
        valor_mensal: subscription.valor_mensal,
        usuarios_contratados: subscription.usuarios_contratados,
        data_inicio: subscription.data_inicio,
        trial_end_date: subscription.data_fim_trial,
        next_due_date: subscription.data_proximo_vencimento,
        created_at: subscription.created_at
      },
      available_plans: planosResult.rows || []
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao obter dados da assinatura',
      message: error.message
    });
  }
};

/**
 * Verificar status da assinatura
 * GET /api/assinatura/status
 */
export const checkStatus = async (req, res) => {
  try {
    const companyId = req.usuario?.company_id || req.user?.company_id;

    if (!companyId) {
      return res.status(400).json({
        error: 'Usuário não está vinculado a uma empresa'
      });
    }

    // Usar o middleware otimizado
    const usage = await getSubscriptionStatus(companyId);

    if (!usage) {
      return res.json({
        can_access: false,
        status: 'NOT_FOUND',
        message: 'Assinatura não encontrada'
      });
    }

    // Verificar se assinatura está ativa
    const isActive = usage.subscription_status === 'ACTIVE' || usage.subscription_status === 'TRIAL';

    if (usage.subscription_status === 'CANCELLED' || usage.subscription_status === 'EXPIRED') {
      return res.json({
        can_access: false,
        status: usage.subscription_status,
        message: 'Assinatura inativa'
      });
    }

    if (usage.subscription_status === 'OVERDUE') {
      return res.json({
        can_access: false,
        status: 'OVERDUE',
        message: 'Assinatura vencida. Regularize seu pagamento.',
        data_vencimento: usage.data_vencimento
      });
    }

    // Verificar limites
    const canCreateUser = usage.limits.max_usuarios ? usage.usage.usuarios < usage.limits.max_usuarios : true;
    const canCreateLead = usage.limits.max_leads ? usage.usage.leads < usage.limits.max_leads : true;

    res.json({
      can_access: isActive,
      status: usage.subscription_status,
      can_create_user: canCreateUser,
      can_create_lead: canCreateLead,
      limits: usage.limits,
      usage: usage.usage,
      plano_nome: usage.plano_nome
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao verificar status da assinatura',
      message: error.message
    });
  }
};

/**
 * Atualizar plano da assinatura (upgrade/downgrade)
 * PUT /api/assinatura/plano
 */
export const updatePlan = async (req, res) => {
  try {
    const companyId = req.usuario.company_id;
    const { new_plan_id, validate_only } = req.body;

    if (!companyId) {
      return res.status(400).json({
        error: 'Usuário não está vinculado a uma empresa'
      });
    }

    if (!new_plan_id) {
      return res.status(400).json({
        error: 'ID do novo plano é obrigatório'
      });
    }

    // Importar pool do banco de dados
    const pool = (await import('../config/database.js')).default;

    // Buscar novo plano
    const planoResult = await pool.query('SELECT * FROM planos WHERE id = ? AND ativo = true', [new_plan_id]);

    if (!planoResult.rows || planoResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Plano não encontrado'
      });
    }

    const newPlan = planoResult.rows[0];

    // Se for apenas validação
    if (validate_only) {
      return res.json({
        can_change: true,
        validation: {
          success: true
        },
        plan: newPlan
      });
    }

    // Atualizar assinatura
    await pool.query(
      'UPDATE assinaturas SET plano_id = ?, valor_mensal = ?, updated_at = CURRENT_TIMESTAMP WHERE company_id = ?',
      [new_plan_id, newPlan.preco_fixo, companyId]
    );

    res.json({
      success: true,
      message: 'Plano atualizado com sucesso',
      data: {
        new_plan_id,
        new_plan_name: newPlan.nome
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao atualizar plano da assinatura',
      message: error.message
    });
  }
};

/**
 * Obter histórico de pagamentos
 * GET /api/assinatura/pagamentos
 */
export const getPagamentos = async (req, res) => {
  try {
    const companyId = req.usuario?.company_id || req.user?.company_id;

    if (!companyId) {
      return res.status(400).json({
        error: 'Usuário não está vinculado a uma empresa'
      });
    }

    // Buscar pagamentos (PostgreSQL syntax com $1)
    const pagamentosResult = await pool.query(
      'SELECT * FROM pagamentos WHERE company_id = $1 ORDER BY data_vencimento DESC LIMIT 12',
      [companyId]
    );

    // Usar middleware otimizado para status da assinatura
    const usageData = await getSubscriptionStatus(companyId);

    res.json({
      success: true,
      payments: pagamentosResult.rows || [],
      subscription_status: usageData?.subscription_status || 'UNKNOWN'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao obter histórico de pagamentos',
      message: error.message
    });
  }
};

/**
 * Obter informações de uso (usuários, leads, etc)
 * GET /api/assinatura/uso
 */
export const getUso = async (req, res) => {
  try {
    const companyId = req.usuario?.company_id || req.user?.company_id;

    if (!companyId) {
      return res.status(400).json({
        error: 'Usuário não está vinculado a uma empresa'
      });
    }

    // Usar o middleware otimizado para obter dados de assinatura e uso
    const usageData = await getSubscriptionStatus(companyId);

    if (!usageData) {
      return res.status(404).json({
        error: 'Assinatura não encontrada'
      });
    }

    // Buscar detalhamento por role (vendedores e admins)
    const vendedoresResult = await pool.query(
      'SELECT COUNT(*) as total FROM usuarios WHERE company_id = $1 AND role = $2',
      [companyId, 'vendedor']
    );

    const adminsResult = await pool.query(
      'SELECT COUNT(*) as total FROM usuarios WHERE company_id = $1 AND role = $2',
      [companyId, 'admin']
    );

    res.json({
      success: true,
      usage: {
        usuarios: {
          total: usageData.usage.usuarios,
          vendedores: parseInt(vendedoresResult.rows[0].total) || 0,
          admins: parseInt(adminsResult.rows[0].total) || 0,
          limite: usageData.limits.max_usuarios,
          restantes: usageData.limits.max_usuarios - usageData.usage.usuarios
        },
        leads: {
          total: usageData.usage.leads,
          limite: usageData.limits.max_leads || null,
          restantes: usageData.limits.max_leads
            ? usageData.limits.max_leads - usageData.usage.leads
            : null
        },
        storage: {
          used_gb: usageData.usage.storage_gb,
          limit_gb: usageData.limits.max_storage_gb || null,
          remaining_gb: usageData.limits.max_storage_gb
            ? usageData.limits.max_storage_gb - usageData.usage.storage_gb
            : null
        }
      },
      plan: {
        name: usageData.plano_nome,
        status: usageData.subscription_status
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao obter informações de uso',
      message: error.message
    });
  }
};

/**
 * Validar se pode criar novo usuário
 * GET /api/assinatura/validar-usuario
 */
export const validarNovoUsuario = async (req, res) => {
  try {
    const companyId = req.usuario.company_id;

    if (!companyId) {
      return res.status(400).json({
        error: 'Usuário não está vinculado a uma empresa'
      });
    }

    // Importar pool do banco de dados
    const pool = (await import('../config/database.js')).default;

    // Buscar assinatura
    const assinaturaResult = await pool.query(
      'SELECT a.*, p.max_usuarios FROM assinaturas a LEFT JOIN planos p ON p.id = a.plano_id WHERE a.company_id = ?',
      [companyId]
    );

    const subscription = assinaturaResult.rows[0];

    if (!subscription || subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED') {
      return res.status(402).json({
        error: 'Assinatura inativa',
        message: 'Assinatura cancelada ou expirada'
      });
    }

    // Buscar contagem de usuários
    const usersCountResult = await pool.query(
      'SELECT COUNT(*) as total FROM usuarios WHERE company_id = ?',
      [companyId]
    );

    const currentUsers = usersCountResult.rows[0]?.total || 0;
    const maxUsers = subscription.max_usuarios;

    if (maxUsers && currentUsers >= maxUsers) {
      return res.status(400).json({
        error: 'Limite de usuários atingido',
        message: `Você atingiu o limite de ${maxUsers} usuários do seu plano`
      });
    }

    res.json({
      success: true,
      can_create: true,
      message: 'Pode criar novo usuário'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao validar criação de usuário',
      message: error.message
    });
  }
};

/**
 * Validar se pode criar novo lead
 * GET /api/assinatura/validar-lead
 */
export const validarNovoLead = async (req, res) => {
  try {
    const companyId = req.usuario.company_id;

    if (!companyId) {
      return res.status(400).json({
        error: 'Usuário não está vinculado a uma empresa'
      });
    }

    // Importar pool do banco de dados
    const pool = (await import('../config/database.js')).default;

    // Buscar assinatura
    const assinaturaResult = await pool.query(
      'SELECT a.*, p.max_leads FROM assinaturas a LEFT JOIN planos p ON p.id = a.plano_id WHERE a.company_id = ?',
      [companyId]
    );

    const subscription = assinaturaResult.rows[0];

    if (!subscription || subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED') {
      return res.status(402).json({
        error: 'Assinatura inativa',
        message: 'Assinatura cancelada ou expirada'
      });
    }

    // Se plano não tem limite de leads
    if (!subscription.max_leads) {
      return res.json({
        success: true,
        can_create: true,
        message: 'Pode criar novo lead'
      });
    }

    // Buscar contagem de leads
    const leadsCountResult = await pool.query(
      'SELECT COUNT(*) as total FROM clientes WHERE company_id = ?',
      [companyId]
    );

    const currentLeads = leadsCountResult.rows[0]?.total || 0;
    const maxLeads = subscription.max_leads;

    if (currentLeads >= maxLeads) {
      return res.status(400).json({
        error: 'Limite de leads atingido',
        message: `Você atingiu o limite de ${maxLeads} leads do seu plano`
      });
    }

    res.json({
      success: true,
      can_create: true,
      message: 'Pode criar novo lead'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao validar criação de lead',
      message: error.message
    });
  }
};

/**
 * SUPER ADMIN: Listar todas as empresas e suas assinaturas
 * GET /api/admin/assinaturas/todas
 * ATENÇÃO: Esta rota é EXCLUSIVA para super_admin (admins da plataforma SaaS)
 */
export const getAllCompaniesSubscriptions = async (req, res) => {
  try {
    // SEGURANÇA: Verificar se é SUPER ADMIN (admin da plataforma SaaS)
    if (req.usuario.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado. Esta funcionalidade é restrita aos super administradores da plataforma.'
      });
    }

    // Importar pool do banco de dados
    const pool = (await import('../config/database.js')).default;

    // Query para buscar todas as empresas com suas assinaturas e planos
    const companiesQuery = `
      SELECT DISTINCT
        u.company_id,
        (SELECT nome FROM usuarios WHERE company_id = u.company_id AND role = 'admin' LIMIT 1) as company_nome,
        (SELECT email FROM usuarios WHERE company_id = u.company_id AND role = 'admin' LIMIT 1) as company_email,
        e.status as empresa_status,
        e.telefone as empresa_telefone,
        e.cidade as empresa_cidade,
        e.estado as empresa_estado,
        a.id as subscription_id,
        a.status as subscription_status,
        a.data_inicio,
        a.data_fim_trial,
        a.data_proximo_vencimento,
        a.valor_mensal,
        a.usuarios_contratados,
        p.id as plan_id,
        p.nome as plan_name,
        p.tipo_cobranca as billing_type,
        p.preco_fixo as plan_price,
        p.preco_por_usuario as price_per_user,
        p.max_usuarios,
        p.max_leads,
        p.max_storage_gb
      FROM usuarios u
      LEFT JOIN empresas e ON e.id = u.company_id
      LEFT JOIN assinaturas a ON a.company_id = u.company_id
      LEFT JOIN planos p ON p.id = a.plano_id
      WHERE u.company_id IS NOT NULL
      GROUP BY u.company_id
      ORDER BY u.company_id
    `;

    const companiesResult = await pool.query(companiesQuery);
    const companies = companiesResult.rows || [];

    // Para cada empresa, buscar contagens de uso
    const companiesWithSubscriptions = await Promise.all(
      companies.map(async (company) => {
        try {
          // Buscar contagem de usuários
          const usersCountResult = await pool.query(
            'SELECT COUNT(*) as total FROM usuarios WHERE company_id = ?',
            [company.company_id]
          );

          // Buscar contagem de leads
          const leadsCountResult = await pool.query(
            'SELECT COUNT(*) as total FROM clientes WHERE company_id = ?',
            [company.company_id]
          );

          const currentUsers = usersCountResult.rows[0]?.total || 0;
          const currentLeads = leadsCountResult.rows[0]?.total || 0;

          // Calcular dias até vencimento
          const nextDueDate = company.data_proximo_vencimento;
          const daysUntilDue = nextDueDate
            ? Math.ceil((new Date(nextDueDate) - new Date()) / (1000 * 60 * 60 * 24))
            : null;

          // Calcular dias até fim do trial
          const trialEndDate = company.data_fim_trial;
          const daysUntilTrialEnd = trialEndDate
            ? Math.ceil((new Date(trialEndDate) - new Date()) / (1000 * 60 * 60 * 24))
            : null;

          return {
            company_id: company.company_id,
            company_nome: company.company_nome,
            company_email: company.company_email,
            company_telefone: company.empresa_telefone,
            company_cidade: company.empresa_cidade,
            company_estado: company.empresa_estado,
            company_status: company.empresa_status || 'ACTIVE',
            subscription_id: company.subscription_id,
            subscription_status: company.subscription_status || 'NO_SUBSCRIPTION',
            plan_id: company.plan_id,
            plan_name: company.plan_name || 'Sem plano',
            plan_price: company.plan_price || 0,
            billing_type: company.billing_type || 'FIXED',
            price_per_user: company.price_per_user || 0,
            max_users: company.max_usuarios,
            current_users: currentUsers,
            total_users: currentUsers,
            max_leads: company.max_leads,
            current_leads: currentLeads,
            total_leads: currentLeads,
            max_storage_gb: company.max_storage_gb,
            next_due_date: nextDueDate,
            days_until_due: daysUntilDue,
            trial_end_date: trialEndDate,
            days_until_trial_end: daysUntilTrialEnd,
            valor_mensal: company.valor_mensal || 0,
            monthly_revenue: company.valor_mensal || 0,
            usuarios_contratados: company.usuarios_contratados || 1,
            created_at: company.data_inicio
          };
        } catch (error) {
          return {
            company_id: company.company_id,
            company_nome: company.company_nome,
            company_email: company.company_email,
            subscription_status: 'ERROR',
            plan_name: 'Erro ao carregar',
            error: error.message
          };
        }
      })
    );

    // Calcular métricas do dashboard
    const metrics = {
      totalCompanies: companiesWithSubscriptions.length,
      activeSubscriptions: companiesWithSubscriptions.filter(c => c.subscription_status === 'ACTIVE').length,
      trialSubscriptions: companiesWithSubscriptions.filter(c => c.subscription_status === 'TRIAL').length,
      overdueSubscriptions: companiesWithSubscriptions.filter(c => c.days_until_due !== null && c.days_until_due < 0).length,
      monthlyRevenue: companiesWithSubscriptions.reduce((sum, c) => sum + (c.monthly_revenue || 0), 0)
    };

    res.json({
      success: true,
      companies: companiesWithSubscriptions,
      total: companiesWithSubscriptions.length,
      metrics: metrics
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao listar assinaturas',
      message: error.message
    });
  }
};

/**
 * SUPER ADMIN: Obter detalhes completos de uma empresa específica
 * GET /api/admin/assinaturas/empresa/:companyId
 * ATENÇÃO: Esta rota é EXCLUSIVA para super_admin (admins da plataforma SaaS)
 */
export const getCompanySubscriptionDetails = async (req, res) => {
  try {
    // SEGURANÇA: Verificar se é SUPER ADMIN (admin da plataforma SaaS)
    if (req.usuario.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado. Esta funcionalidade é restrita aos super administradores da plataforma.'
      });
    }

    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        error: 'ID da empresa é obrigatório'
      });
    }

    // Importar pool do banco de dados
    const pool = (await import('../config/database.js')).default;

    // Buscar assinatura completa
    const assinaturaQuery = `
      SELECT
        a.*,
        p.nome as plan_name,
        p.descricao as plan_descricao,
        p.tipo_cobranca as billing_type,
        p.preco_fixo as plan_price,
        p.preco_por_usuario as price_per_user,
        p.max_usuarios,
        p.max_leads,
        p.max_storage_gb,
        p.features
      FROM assinaturas a
      LEFT JOIN planos p ON p.id = a.plano_id
      WHERE a.company_id = ?
    `;

    const assinaturaResult = await pool.query(assinaturaQuery, [companyId]);
    const subscription = assinaturaResult.rows[0] || null;

    // Buscar planos disponíveis
    const planosResult = await pool.query('SELECT * FROM planos WHERE ativo = true ORDER BY preco_fixo');

    // Buscar estatísticas de uso
    const usuariosResult = await pool.query(
      'SELECT COUNT(*) as total FROM usuarios WHERE company_id = ?',
      [companyId]
    );

    const leadsResult = await pool.query(
      'SELECT COUNT(*) as total FROM clientes WHERE company_id = ?',
      [companyId]
    );

    const vendedoresResult = await pool.query(
      'SELECT COUNT(*) as total FROM usuarios WHERE company_id = ? AND role = ?',
      [companyId, 'vendedor']
    );

    const adminsResult = await pool.query(
      'SELECT COUNT(*) as total FROM usuarios WHERE company_id = ? AND role = ?',
      [companyId, 'admin']
    );

    // Buscar pagamentos recentes
    const pagamentosResult = await pool.query(
      'SELECT * FROM pagamentos WHERE company_id = ? ORDER BY data_vencimento DESC LIMIT 6',
      [companyId]
    );

    res.json({
      success: true,
      subscription: subscription ? {
        subscription_id: subscription.id,
        company_id: subscription.company_id,
        status: subscription.status,
        plan_id: subscription.plano_id,
        plan_name: subscription.plan_name,
        billing_type: subscription.billing_type,
        plan_price: subscription.plan_price,
        price_per_user: subscription.price_per_user,
        max_users: subscription.max_usuarios,
        max_leads: subscription.max_leads,
        valor_mensal: subscription.valor_mensal,
        usuarios_contratados: subscription.usuarios_contratados,
        data_inicio: subscription.data_inicio,
        trial_end_date: subscription.data_fim_trial,
        next_due_date: subscription.data_proximo_vencimento
      } : null,
      available_plans: planosResult.rows || [],
      usage: {
        usuarios: {
          total: usuariosResult.rows[0]?.total || 0,
          vendedores: vendedoresResult.rows[0]?.total || 0,
          admins: adminsResult.rows[0]?.total || 0,
          limite: subscription?.max_usuarios
        },
        leads: {
          total: leadsResult.rows[0]?.total || 0,
          limite: subscription?.max_leads
        },
        storage: {
          used: 0, // TODO: Implementar cálculo real
          limit: subscription?.max_usuarios ? subscription.max_usuarios * 10 : 0
        }
      },
      recent_payments: pagamentosResult.rows || []
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao obter detalhes da empresa',
      message: error.message
    });
  }
};

/**
 * SUPER ADMIN: Alterar status da assinatura manualmente
 * POST /api/admin/assinaturas/alterar-status
 * ATENÇÃO: Esta rota é EXCLUSIVA para super_admin (admins da plataforma SaaS)
 */
export const changeSubscriptionStatus = async (req, res) => {
  try {
    // SEGURANÇA: Verificar se é SUPER ADMIN (admin da plataforma SaaS)
    if (req.usuario.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado. Esta funcionalidade é restrita aos super administradores da plataforma.'
      });
    }

    const { company_id, status } = req.body;

    if (!company_id || !status) {
      return res.status(400).json({
        error: 'ID da empresa e novo status são obrigatórios'
      });
    }

    // Validar status
    const validStatuses = ['ACTIVE', 'TRIAL', 'OVERDUE', 'CANCELLED', 'EXPIRED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Status inválido. Use: ${validStatuses.join(', ')}`
      });
    }

    // Importar pool do banco de dados
    const pool = (await import('../config/database.js')).default;

    // Atualizar status
    await pool.query(
      'UPDATE assinaturas SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE company_id = ?',
      [status, company_id]
    );

    res.json({
      success: true,
      message: `Status da empresa ${company_id} alterado para ${status}`,
      data: {
        company_id,
        new_status: status,
        changed_at: new Date().toISOString(),
        changed_by: req.usuario.id
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao alterar status da assinatura',
      message: error.message
    });
  }
};

/**
 * SUPER ADMIN: Criar nova empresa com assinatura
 * POST /api/admin/assinaturas/criar-empresa
 * ATENÇÃO: Esta rota é EXCLUSIVA para super_admin (admins da plataforma SaaS)
 */
export const createCompany = async (req, res) => {
  try {
    // SEGURANÇA: Verificar se é SUPER ADMIN (admin da plataforma SaaS)
    if (req.usuario.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado. Esta funcionalidade é restrita aos super administradores da plataforma.'
      });
    }

    const {
      nome,
      email,
      cnpj,
      telefone,
      endereco,
      cidade,
      estado,
      cep,
      plano_id,
      usuarios_contratados,
      admin_nome,
      admin_email
    } = req.body;

    // Validações básicas
    if (!nome || !email) {
      return res.status(400).json({
        error: 'Nome e email da empresa são obrigatórios'
      });
    }

    if (!admin_nome || !admin_email) {
      return res.status(400).json({
        error: 'Nome e email do administrador são obrigatórios'
      });
    }

    if (!plano_id) {
      return res.status(400).json({
        error: 'Plano é obrigatório'
      });
    }

    const pool = (await import('../config/database.js')).default;

    // Verificar se email da empresa já existe
    const emailCheck = await pool.query(
      'SELECT id FROM empresas WHERE email = ?',
      [email]
    );

    if (emailCheck.rows && emailCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'Já existe uma empresa com este email'
      });
    }

    // Verificar se email do admin já existe
    const adminEmailCheck = await pool.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [admin_email]
    );

    if (adminEmailCheck.rows && adminEmailCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'Já existe um usuário com este email'
      });
    }

    // Buscar dados do plano
    const planoResult = await pool.query(
      'SELECT * FROM planos WHERE id = ?',
      [plano_id]
    );

    if (!planoResult.rows || planoResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Plano não encontrado'
      });
    }

    const plano = planoResult.rows[0];

    // Criar empresa
    const empresaResult = await pool.query(
      `INSERT INTO empresas (nome, email, cnpj, telefone, endereco, cidade, estado, cep, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [nome, email, cnpj || null, telefone || null, endereco || null, cidade || null, estado || null, cep || null]
    );

    const company_id = empresaResult.lastID;

    // Gerar senha padrão (será necessário trocar no primeiro login)
    const bcrypt = (await import('bcryptjs')).default;
    const senha_default = 'Mudar@123'; // Senha padrão
    const senha_hash = await bcrypt.hash(senha_default, 10);

    // Criar usuário admin da empresa
    await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, role, company_id)
       VALUES (?, ?, ?, 'admin', ?)`,
      [admin_nome, admin_email, senha_hash, company_id]
    );

    // Calcular valor mensal
    let valor_mensal = 0;
    const users_count = usuarios_contratados || 1;

    if (plano.tipo_cobranca === 'FIXED') {
      valor_mensal = plano.preco_fixo;
    } else if (plano.tipo_cobranca === 'PER_USER') {
      valor_mensal = plano.preco_por_usuario * users_count;
    }

    // Determinar status inicial e datas
    let status = 'ACTIVE';
    let data_fim_trial = null;
    let data_proximo_vencimento = null;

    if (plano.nome === 'Trial' || plano_id === 4) {
      status = 'TRIAL';
      // Trial de 14 dias
      const now = new Date();
      data_fim_trial = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)).toISOString();
    } else {
      // Primeiro vencimento em 30 dias
      const now = new Date();
      data_proximo_vencimento = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString();
    }

    // Criar assinatura
    await pool.query(
      `INSERT INTO assinaturas (company_id, plano_id, status, data_fim_trial, data_proximo_vencimento, valor_mensal, usuarios_contratados)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [company_id, plano_id, status, data_fim_trial, data_proximo_vencimento, valor_mensal, users_count]
    );

    res.status(201).json({
      success: true,
      message: 'Empresa criada com sucesso',
      data: {
        company_id,
        nome,
        email,
        plano: plano.nome,
        valor_mensal,
        status,
        admin_email,
        senha_padrao: senha_default,
        aviso: 'O administrador deve trocar a senha no primeiro login'
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao criar empresa',
      message: error.message
    });
  }
};

/**
 * SUPER ADMIN: Atualizar dados da empresa
 * PUT /api/admin/assinaturas/empresa/:companyId
 * ATENÇÃO: Esta rota é EXCLUSIVA para super_admin (admins da plataforma SaaS)
 */
export const updateCompany = async (req, res) => {
  try {
    // SEGURANÇA: Verificar se é SUPER ADMIN (admin da plataforma SaaS)
    if (req.usuario.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado. Esta funcionalidade é restrita aos super administradores da plataforma.'
      });
    }

    const { companyId } = req.params;
    const {
      nome,
      email,
      cnpj,
      telefone,
      endereco,
      cidade,
      estado,
      cep,
      plano_id,
      usuarios_contratados
    } = req.body;

    if (!companyId) {
      return res.status(400).json({
        error: 'ID da empresa é obrigatório'
      });
    }

    const pool = (await import('../config/database.js')).default;

    // Verificar se empresa existe
    const empresaCheck = await pool.query(
      'SELECT id FROM empresas WHERE id = ?',
      [companyId]
    );

    if (!empresaCheck.rows || empresaCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Empresa não encontrada'
      });
    }

    // Verificar se email já está em uso por outra empresa
    if (email) {
      const emailCheck = await pool.query(
        'SELECT id FROM empresas WHERE email = ? AND id != ?',
        [email, companyId]
      );

      if (emailCheck.rows && emailCheck.rows.length > 0) {
        return res.status(400).json({
          error: 'Já existe outra empresa com este email'
        });
      }
    }

    // Atualizar dados da empresa
    await pool.run(
      `UPDATE empresas
       SET nome = COALESCE(?, nome),
           email = COALESCE(?, email),
           cnpj = ?,
           telefone = ?,
           endereco = ?,
           cidade = ?,
           estado = ?,
           cep = ?
       WHERE id = ?`,
      [nome, email, cnpj, telefone, endereco, cidade, estado, cep, companyId]
    );

    // Se plano_id foi fornecido, atualizar assinatura
    if (plano_id) {
      // Converter plano_id para inteiro
      const planoIdInt = parseInt(plano_id, 10);

      // Buscar dados do plano
      const planoResult = await pool.query(
        'SELECT * FROM planos WHERE id = ?',
        [planoIdInt]
      );

      if (!planoResult.rows || planoResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Plano não encontrado'
        });
      }

      const plano = planoResult.rows[0];

      // Calcular novo valor mensal
      let valor_mensal = 0;
      // Converter usuarios_contratados para inteiro, com valor padrão de 1
      const users_count = usuarios_contratados ? parseInt(usuarios_contratados, 10) : 1;

      if (plano.tipo_cobranca === 'FIXED') {
        valor_mensal = plano.preco_fixo;
      } else if (plano.tipo_cobranca === 'PER_USER') {
        valor_mensal = plano.preco_por_usuario * users_count;
      }

      // Atualizar assinatura
      await pool.run(
        `UPDATE assinaturas
         SET plano_id = ?,
             valor_mensal = ?,
             usuarios_contratados = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = ?`,
        [planoIdInt, valor_mensal, users_count, companyId]
      );
    }

    res.json({
      success: true,
      message: 'Empresa atualizada com sucesso',
      data: {
        company_id: companyId
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao atualizar empresa',
      message: error.message
    });
  }
};

/**
 * SUPER ADMIN: Excluir empresa
 * DELETE /api/admin/assinaturas/empresa/:companyId
 * ATENÇÃO: Esta rota é EXCLUSIVA para super_admin (admins da plataforma SaaS)
 */
export const deleteCompany = async (req, res) => {
  try {
    // SEGURANÇA: Verificar se é SUPER ADMIN (admin da plataforma SaaS)
    if (req.usuario.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado. Esta funcionalidade é restrita aos super administradores da plataforma.'
      });
    }

    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        error: 'ID da empresa é obrigatório'
      });
    }

    const pool = (await import('../config/database.js')).default;

    // Verificar se empresa existe
    const empresaCheck = await pool.query(
      'SELECT id, nome FROM empresas WHERE id = ?',
      [companyId]
    );

    if (!empresaCheck.rows || empresaCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Empresa não encontrada'
      });
    }

    const empresa = empresaCheck.rows[0];

    // Excluir em cascata: assinatura, usuários, etc.
    // 1. Excluir pagamentos
    await pool.run('DELETE FROM pagamentos WHERE company_id = ?', [companyId]);

    // 2. Excluir assinatura
    await pool.run('DELETE FROM assinaturas WHERE company_id = ?', [companyId]);

    // 3. Excluir clientes/leads
    await pool.run('DELETE FROM clientes WHERE company_id = ?', [companyId]);

    // 4. Excluir usuários
    await pool.run('DELETE FROM usuarios WHERE company_id = ?', [companyId]);

    // 5. Excluir empresa
    await pool.run('DELETE FROM empresas WHERE id = ?', [companyId]);

    res.json({
      success: true,
      message: `Empresa "${empresa.nome}" excluída com sucesso`
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao excluir empresa',
      message: error.message
    });
  }
};

/**
 * SUPER ADMIN: Criar novo plano
 * POST /api/admin/assinaturas/planos
 * ATENÇÃO: Esta rota é EXCLUSIVA para super_admin (admins da plataforma SaaS)
 */
export const createPlan = async (req, res) => {
  try {
    // SEGURANÇA: Verificar se é SUPER ADMIN
    if (req.usuario.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado. Esta funcionalidade é restrita aos super administradores da plataforma.'
      });
    }

    const {
      nome,
      descricao,
      tipo_cobranca,
      preco_fixo,
      preco_por_usuario,
      max_usuarios,
      max_leads,
      max_storage_gb,
      features
    } = req.body;

    // Validações
    if (!nome || !tipo_cobranca) {
      return res.status(400).json({
        error: 'Nome e tipo de cobrança são obrigatórios'
      });
    }

    if (!['FIXED', 'PER_USER'].includes(tipo_cobranca)) {
      return res.status(400).json({
        error: 'Tipo de cobrança inválido. Use: FIXED ou PER_USER'
      });
    }

    const pool = (await import('../config/database.js')).default;

    // Criar plano
    const result = await pool.run(
      `INSERT INTO planos (nome, descricao, tipo_cobranca, preco_fixo, preco_por_usuario, max_usuarios, max_leads, max_storage_gb, features, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        nome,
        descricao || null,
        tipo_cobranca,
        preco_fixo || 0,
        preco_por_usuario || 0,
        max_usuarios || null,
        max_leads || null,
        max_storage_gb || null,
        features ? JSON.stringify(features) : null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Plano criado com sucesso',
      plano: {
        id: result.lastID,
        nome,
        descricao,
        tipo_cobranca,
        preco_fixo,
        preco_por_usuario,
        max_usuarios,
        max_leads,
        max_storage_gb
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao criar plano',
      message: error.message
    });
  }
};

/**
 * SUPER ADMIN: Editar detalhes do plano
 * PUT /api/admin/assinaturas/planos/:planoId
 * ATENÇÃO: Esta rota é EXCLUSIVA para super_admin (admins da plataforma SaaS)
 */
export const editPlan = async (req, res) => {
  try {
    // SEGURANÇA: Verificar se é SUPER ADMIN
    if (req.usuario.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado. Esta funcionalidade é restrita aos super administradores da plataforma.'
      });
    }

    const { planoId } = req.params;
    const {
      nome,
      descricao,
      tipo_cobranca,
      preco_fixo,
      preco_por_usuario,
      max_usuarios,
      max_leads,
      max_storage_gb,
      features,
      ativo
    } = req.body;

    if (!planoId) {
      return res.status(400).json({
        error: 'ID do plano é obrigatório'
      });
    }

    const pool = (await import('../config/database.js')).default;

    // Verificar se plano existe
    const planoCheck = await pool.query(
      'SELECT id FROM planos WHERE id = ?',
      [planoId]
    );

    if (!planoCheck.rows || planoCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Plano não encontrado'
      });
    }

    // Atualizar plano
    await pool.run(
      `UPDATE planos
       SET nome = COALESCE(?, nome),
           descricao = COALESCE(?, descricao),
           tipo_cobranca = COALESCE(?, tipo_cobranca),
           preco_fixo = COALESCE(?, preco_fixo),
           preco_por_usuario = COALESCE(?, preco_por_usuario),
           max_usuarios = ?,
           max_leads = ?,
           max_storage_gb = ?,
           features = ?,
           ativo = COALESCE(?, ativo)
       WHERE id = ?`,
      [
        nome,
        descricao,
        tipo_cobranca,
        preco_fixo,
        preco_por_usuario,
        max_usuarios,
        max_leads,
        max_storage_gb,
        features ? JSON.stringify(features) : null,
        ativo,
        planoId
      ]
    );

    res.json({
      success: true,
      message: 'Plano atualizado com sucesso'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao atualizar plano',
      message: error.message
    });
  }
};

/**
 * SUPER ADMIN: Excluir plano
 * DELETE /api/admin/assinaturas/planos/:planoId
 * ATENÇÃO: Esta rota é EXCLUSIVA para super_admin (admins da plataforma SaaS)
 */
export const deletePlan = async (req, res) => {
  try {
    // SEGURANÇA: Verificar se é SUPER ADMIN
    if (req.usuario.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado. Esta funcionalidade é restrita aos super administradores da plataforma.'
      });
    }

    const { planoId } = req.params;

    if (!planoId) {
      return res.status(400).json({
        error: 'ID do plano é obrigatório'
      });
    }

    const pool = (await import('../config/database.js')).default;

    // Verificar se plano existe
    const planoCheck = await pool.query(
      'SELECT id, nome FROM planos WHERE id = ?',
      [planoId]
    );

    if (!planoCheck.rows || planoCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Plano não encontrado'
      });
    }

    const plano = planoCheck.rows[0];

    // Verificar se há assinaturas usando este plano
    const assinaturasCheck = await pool.query(
      'SELECT COUNT(*) as total FROM assinaturas WHERE plano_id = ?',
      [planoId]
    );

    const totalAssinaturas = assinaturasCheck.rows[0]?.total || 0;

    if (totalAssinaturas > 0) {
      // Desativar ao invés de excluir
      await pool.run('UPDATE planos SET ativo = false WHERE id = ?', [planoId]);

      return res.json({
        success: true,
        message: `Plano "${plano.nome}" desativado (${totalAssinaturas} assinaturas ativas)`,
        action: 'deactivated'
      });
    }

    // Se não há assinaturas, pode excluir
    await pool.run('DELETE FROM planos WHERE id = ?', [planoId]);

    res.json({
      success: true,
      message: `Plano "${plano.nome}" excluído com sucesso`,
      action: 'deleted'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao excluir plano',
      message: error.message
    });
  }
};

/**
 * SUPER ADMIN: Gerar link de pagamento via cartão de crédito
 * POST /api/admin/assinaturas/empresa/:companyId/gerar-cobranca-cartao
 * ATENÇÃO: Esta rota é EXCLUSIVA para super_admin (admins da plataforma SaaS)
 */
export const gerarCobrancaCartao = async (req, res) => {
  try {
    // SEGURANÇA: Verificar se é SUPER ADMIN
    if (req.usuario.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado. Esta funcionalidade é restrita aos super administradores da plataforma.'
      });
    }

    const { companyId } = req.params;
    const { valor, descricao, dueDays } = req.body;

    if (!companyId || !valor) {
      return res.status(400).json({
        error: 'ID da empresa e valor são obrigatórios'
      });
    }

    const pool = (await import('../config/database.js')).default;
    const asaasService = (await import('../services/asaasService.js')).default;

    // Buscar dados da empresa
    const empresaResult = await pool.query(
      'SELECT id, nome, email, cnpj, telefone FROM empresas WHERE id = ?',
      [companyId]
    );

    if (!empresaResult.rows || empresaResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Empresa não encontrada'
      });
    }

    const empresa = empresaResult.rows[0];

    // Buscar ou criar cliente no ASAAS
    let customerId;

    // Verificar se empresa já tem customer_id no ASAAS
    const assinaturaResult = await pool.query(
      'SELECT asaas_customer_id FROM assinaturas WHERE company_id = ?',
      [companyId]
    );

    if (assinaturaResult.rows && assinaturaResult.rows.length > 0 && assinaturaResult.rows[0].asaas_customer_id) {
      customerId = assinaturaResult.rows[0].asaas_customer_id;
    } else {
      // Criar novo cliente no ASAAS
      const customer = await asaasService.createOrGetCustomer({
        nome: empresa.nome,
        email: empresa.email,
        cpfCnpj: empresa.cnpj || '00000000000000',
        telefone: empresa.telefone
      });

      customerId = customer.id;

      // Salvar customer_id na assinatura
      await pool.run(
        'UPDATE assinaturas SET asaas_customer_id = ? WHERE company_id = ?',
        [customerId, companyId]
      );
    }

    // Gerar link de pagamento via cartão
    const descricaoFinal = descricao || `Cobrança - ${empresa.nome}`;

    const payment = await asaasService.createPaymentLink(
      customerId,
      parseFloat(valor),
      descricaoFinal,
      {
        dueDays: dueDays || 7,
        billingType: 'UNDEFINED', // Permite escolher entre cartão, boleto e PIX
        externalReference: `ADMIN-${companyId}-${Date.now()}`
      }
    );

    // Registrar pagamento no banco
    await pool.run(
      `INSERT INTO pagamentos (company_id, asaas_payment_id, valor, status, tipo, descricao, created_at)
       VALUES (?, ?, ?, 'PENDING', 'LINK_PAGAMENTO', ?, CURRENT_TIMESTAMP)`,
      [companyId, payment.id, valor, descricaoFinal]
    );

    res.json({
      success: true,
      message: 'Link de pagamento gerado com sucesso',
      payment: {
        id: payment.id,
        paymentLink: payment.paymentLink,
        invoiceUrl: payment.invoiceUrl,
        value: payment.value,
        dueDate: payment.dueDate,
        status: payment.status
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao gerar link de pagamento',
      message: error.message
    });
  }
};

/**
 * SUPER ADMIN: Obter histórico de pagamentos de uma empresa
 * GET /api/admin/assinaturas/empresa/:companyId/pagamentos
 * ATENÇÃO: Esta rota é EXCLUSIVA para super_admin (admins da plataforma SaaS)
 */
export const getCompanyPagamentos = async (req, res) => {
  try {
    // SEGURANÇA: Verificar se é SUPER ADMIN
    if (req.usuario.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado. Esta funcionalidade é restrita aos super administradores da plataforma.'
      });
    }

    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        error: 'ID da empresa é obrigatório'
      });
    }

    const pool = (await import('../config/database.js')).default;

    // Verificar se a empresa existe
    const empresaResult = await pool.query(
      'SELECT id, nome FROM empresas WHERE id = ?',
      [companyId]
    );

    if (!empresaResult.rows || empresaResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Empresa não encontrada'
      });
    }

    // Buscar todos os pagamentos da empresa
    const pagamentosResult = await pool.query(
      `SELECT
        p.*,
        pl.nome as plan_name
      FROM pagamentos p
      LEFT JOIN planos pl ON pl.id = p.plano_id
      WHERE p.company_id = ?
      ORDER BY p.data_criacao DESC`,
      [companyId]
    );

    // Buscar status da assinatura
    const assinaturaResult = await pool.query(
      'SELECT status, plano_id FROM assinaturas WHERE company_id = ?',
      [companyId]
    );

    res.json({
      success: true,
      empresa: empresaResult.rows[0],
      payments: pagamentosResult.rows || [],
      subscription_status: assinaturaResult.rows[0]?.status || 'UNKNOWN',
      total: pagamentosResult.rows?.length || 0
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao obter histórico de pagamentos',
      message: error.message
    });
  }
};

/**
 * SUPER ADMIN: Listar planos disponíveis
 * GET /api/admin/assinaturas/planos
 * ATENÇÃO: Esta rota é EXCLUSIVA para super_admin (admins da plataforma SaaS)
 */
export const getAvailablePlans = async (req, res) => {
  try {
    // SEGURANÇA: Verificar se é SUPER ADMIN (admin da plataforma SaaS)
    if (req.usuario.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado. Esta funcionalidade é restrita aos super administradores da plataforma.'
      });
    }

    const pool = (await import('../config/database.js')).default;

    const planosResult = await pool.query(
      'SELECT * FROM planos ORDER BY ativo DESC, preco_fixo, preco_por_usuario'
    );

    res.json({
      success: true,
      planos: planosResult.rows || []
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao buscar planos',
      message: error.message
    });
  }
};

/**
 * Listar planos disponíveis para upgrade (para usuários normais)
 * GET /api/assinatura/planos-upgrade
 */
export const getPlansForUpgrade = async (req, res) => {
  try {
    const companyId = req.usuario.company_id;

    if (!companyId) {
      return res.status(400).json({
        error: 'Usuário não está vinculado a uma empresa'
      });
    }

    const pool = (await import('../config/database.js')).default;

    // Buscar assinatura atual
    const assinaturaResult = await pool.query(
      'SELECT * FROM assinaturas WHERE company_id = ?',
      [companyId]
    );

    if (!assinaturaResult.rows || assinaturaResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Assinatura não encontrada'
      });
    }

    const assinaturaAtual = assinaturaResult.rows[0];

    // Buscar todos os planos ativos (exceto Trial)
    const planosResult = await pool.query(
      'SELECT * FROM planos WHERE ativo = true AND nome != ? ORDER BY preco_fixo, preco_por_usuario',
      ['Trial']
    );

    // Formatar planos com informações úteis
    const planosDisponiveis = (planosResult.rows || []).map(plano => {
      let valor_mensal = plano.preco_fixo;

      if (plano.tipo_cobranca === 'PER_USER') {
        valor_mensal = plano.preco_por_usuario * (assinaturaAtual.usuarios_contratados || 1);
      }

      return {
        id: plano.id,
        nome: plano.nome,
        descricao: plano.descricao,
        tipo_cobranca: plano.tipo_cobranca,
        preco_fixo: plano.preco_fixo,
        preco_por_usuario: plano.preco_por_usuario,
        max_usuarios: plano.max_usuarios,
        max_leads: plano.max_leads,
        max_storage_gb: plano.max_storage_gb,
        features: plano.features ? JSON.parse(plano.features) : [],
        valor_mensal_estimado: valor_mensal,
        is_current: plano.id === assinaturaAtual.plano_id
      };
    });

    res.json({
      success: true,
      current_plan_id: assinaturaAtual.plano_id,
      current_status: assinaturaAtual.status,
      plans: planosDisponiveis
    });

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao buscar planos disponíveis',
      message: error.message
    });
  }
};

/**
 * Iniciar processo de upgrade de plano com pagamento
 * POST /api/assinatura/iniciar-upgrade
 */
export const initiateUpgrade = async (req, res) => {
  try {
    const companyId = req.usuario.company_id;
    const { plano_id, payment_method, usuarios_contratados } = req.body;

    if (!companyId) {
      return res.status(400).json({
        error: 'Usuário não está vinculado a uma empresa'
      });
    }

    if (!plano_id) {
      return res.status(400).json({
        error: 'ID do plano é obrigatório'
      });
    }

    const pool = (await import('../config/database.js')).default;
    const asaasService = (await import('../services/asaasService.js')).default;

    // Buscar empresa
    const empresaResult = await pool.query(
      'SELECT * FROM empresas WHERE id = ?',
      [companyId]
    );

    if (!empresaResult.rows || empresaResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Empresa não encontrada'
      });
    }

    const empresa = empresaResult.rows[0];

    // Buscar assinatura atual
    const assinaturaResult = await pool.query(
      'SELECT * FROM assinaturas WHERE company_id = ?',
      [companyId]
    );

    if (!assinaturaResult.rows || assinaturaResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Assinatura não encontrada'
      });
    }

    const assinaturaAtual = assinaturaResult.rows[0];

    // Buscar novo plano
    const planoResult = await pool.query(
      'SELECT * FROM planos WHERE id = ? AND ativo = true',
      [plano_id]
    );

    if (!planoResult.rows || planoResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Plano não encontrado'
      });
    }

    const novoPlano = planoResult.rows[0];

    // Calcular valor mensal
    let valor_mensal = novoPlano.preco_fixo || 0;
    const usuarios = usuarios_contratados || assinaturaAtual.usuarios_contratados || 1;

    if (novoPlano.tipo_cobranca === 'PER_USER') {
      valor_mensal = novoPlano.preco_por_usuario * usuarios;
    }

    // Criar ou obter cliente no ASAAS
    const customer = await asaasService.createOrGetCustomer({
      nome: empresa.nome,
      email: empresa.email,
      cpfCnpj: empresa.cnpj || '00000000000',
      telefone: empresa.telefone,
      asaas_customer_id: assinaturaAtual.asaas_customer_id
    });

    // Atualizar assinatura com customer_id
    await pool.run(
      'UPDATE assinaturas SET asaas_customer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE company_id = ?',
      [customer.id, companyId]
    );

    // Criar cobrança/pagamento no ASAAS
    let paymentData;

    if (payment_method === 'PIX') {
      paymentData = await asaasService.createPixPayment(
        customer.id,
        valor_mensal,
        `Upgrade para ${novoPlano.nome} - ${empresa.nome}`
      );
    } else {
      // Default: Boleto
      paymentData = await asaasService.createPayment(
        customer.id,
        valor_mensal,
        `Upgrade para ${novoPlano.nome} - ${empresa.nome}`
      );
    }

    // Salvar informações do upgrade pendente (status ainda TRIAL ou atual)
    await pool.run(
      `UPDATE assinaturas
       SET plano_id = ?,
           valor_mensal = ?,
           usuarios_contratados = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE company_id = ?`,
      [plano_id, valor_mensal, usuarios, companyId]
    );

    // Retornar dados do pagamento para o frontend
    const response = {
      success: true,
      message: 'Upgrade iniciado com sucesso',
      payment: {
        id: paymentData.id,
        status: paymentData.status,
        value: paymentData.value,
        due_date: paymentData.dueDate,
        payment_method: payment_method || 'BOLETO'
      },
      plan: {
        id: novoPlano.id,
        nome: novoPlano.nome,
        valor_mensal: valor_mensal
      }
    };

    // Adicionar informações específicas do método de pagamento
    if (payment_method === 'PIX' && paymentData.pix) {
      response.payment.pix = {
        qr_code: paymentData.pix.qrCode,
        payload: paymentData.pix.payload,
        expiration_date: paymentData.pix.expirationDate
      };
    } else if (paymentData.bankSlipUrl) {
      response.payment.boleto_url = paymentData.bankSlipUrl;
      response.payment.invoice_url = paymentData.invoiceUrl;
    }

    res.json(response);

  } catch (error) {
    res.status(500).json({
      error: 'Erro ao iniciar upgrade de plano',
      message: error.message
    });
  }
};

/**
 * Webhook do ASAAS para confirmar pagamentos
 * POST /api/webhooks/asaas
 */
export const asaasWebhook = async (req, res) => {
  try {
    const { event, payment } = req.body;

    if (!event || !payment) {
      return res.status(400).json({
        error: 'Dados inválidos do webhook'
      });
    }

    // Processar apenas pagamentos confirmados
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const pool = (await import('../config/database.js')).default;

      // Buscar assinatura pelo customer_id
      const assinaturaResult = await pool.query(
        'SELECT * FROM assinaturas WHERE asaas_customer_id = ?',
        [payment.customer]
      );

      if (!assinaturaResult.rows || assinaturaResult.rows.length === 0) {
        return res.status(200).json({ received: true });
      }

      const assinatura = assinaturaResult.rows[0];

      // Atualizar status da assinatura para ACTIVE
      const now = new Date();
      const proximoVencimento = new Date(now);
      proximoVencimento.setMonth(proximoVencimento.getMonth() + 1);

      await pool.run(
        `UPDATE assinaturas
         SET status = 'ACTIVE',
             data_proximo_vencimento = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE company_id = ?`,
        [proximoVencimento.toISOString(), assinatura.company_id]
      );
    }

    // Sempre retornar 200 para o webhook
    res.status(200).json({ received: true });

  } catch (error) {
    // Mesmo com erro, retornar 200 para não reprocessar
    res.status(200).json({ received: true, error: error.message });
  }
};
