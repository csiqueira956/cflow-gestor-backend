import pool from '../config/database.js';

/**
 * Middleware de Verificação de Assinatura - Versão otimizada
 * Consulta direto no banco ao invés de fazer chamadas HTTP externas
 */

// Cache de assinatura para reduzir queries
const subscriptionCache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos

/**
 * Buscar informações de assinatura e uso da empresa
 */
async function getSubscriptionUsage(companyId) {
  try {
    // Verificar cache
    const cached = subscriptionCache.get(companyId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Buscar assinatura e plano
    const assinaturaResult = await pool.query(`
      SELECT
        a.id as assinatura_id,
        a.status as subscription_status,
        a.data_proximo_vencimento as data_vencimento,
        a.data_fim_trial as trial_end_date,
        p.nome as plano_nome,
        p.max_usuarios,
        p.max_leads,
        p.max_storage_gb
      FROM assinaturas a
      LEFT JOIN planos p ON p.id = a.plano_id
      WHERE a.company_id = $1
    `, [companyId]);

    if (!assinaturaResult.rows || assinaturaResult.rows.length === 0) {
      return null;
    }

    const subscription = assinaturaResult.rows[0];

    // Contar usuários ativos
    const usuariosResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM usuarios
      WHERE company_id = $1
    `, [companyId]);

    // Contar leads
    const leadsResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM clientes
      WHERE company_id = $1
    `, [companyId]);

    // Calcular storage usado (em GB)
    // TODO: Implementar cálculo real quando houver upload de arquivos
    const storageUsed = 0;

    const usage = {
      subscription_status: subscription.subscription_status,
      plano_nome: subscription.plano_nome,
      data_vencimento: subscription.data_vencimento,
      trial_end_date: subscription.trial_end_date,
      limits: {
        max_usuarios: subscription.max_usuarios,
        max_leads: subscription.max_leads,
        max_storage_gb: subscription.max_storage_gb
      },
      usage: {
        usuarios: parseInt(usuariosResult.rows[0].total),
        leads: parseInt(leadsResult.rows[0].total),
        storage_gb: storageUsed
      }
    };

    // Salvar no cache
    subscriptionCache.set(companyId, {
      data: usage,
      timestamp: Date.now()
    });

    return usage;
  } catch (error) {
    console.error('Erro ao buscar uso da assinatura:', error);
    throw error;
  }
}

/**
 * Middleware: Verificar se assinatura está ativa
 * Bloqueia acesso se status = OVERDUE ou CANCELLED
 */
export const requireActiveSubscription = async (req, res, next) => {
  try {
    // Super admin não tem restrições
    if (req.user?.role === 'super_admin' || req.usuario?.role === 'super_admin') {
      return next();
    }

    const companyId = req.user?.company_id || req.usuario?.company_id;

    if (!companyId) {
      return res.status(400).json({
        error: 'Usuário não vinculado a uma empresa',
        message: 'Entre em contato com o suporte'
      });
    }

    const usage = await getSubscriptionUsage(companyId);

    if (!usage) {
      return res.status(403).json({
        error: 'Assinatura não encontrada',
        code: 'NO_SUBSCRIPTION',
        action_required: true
      });
    }

    // Verificar se assinatura está vencida ou cancelada
    if (usage.subscription_status === 'OVERDUE') {
      return res.status(402).json({
        error: 'Assinatura vencida',
        status: 'OVERDUE',
        message: 'Assinatura vencida. Regularize seu pagamento para continuar usando o sistema.',
        details: {
          data_vencimento: usage.data_vencimento,
          is_overdue: true
        },
        action_required: true
      });
    }

    if (usage.subscription_status === 'CANCELLED') {
      return res.status(402).json({
        error: 'Assinatura cancelada',
        status: 'CANCELLED',
        message: 'Assinatura cancelada. Entre em contato com o suporte.',
        action_required: true
      });
    }

    // Adicionar info de assinatura no request
    req.subscription = {
      status: usage.subscription_status,
      details: {
        plano_nome: usage.plano_nome,
        is_trial: usage.subscription_status === 'TRIAL',
        is_overdue: usage.subscription_status === 'OVERDUE',
        data_vencimento: usage.data_vencimento,
        limits: usage.limits,
        usage: usage.usage
      }
    };

    next();
  } catch (error) {
    console.error('Erro ao verificar assinatura:', error);

    // Em modo degradado, permitir acesso mas logar
    console.warn('ATENÇÃO: Permitindo acesso em modo degradado');
    req.subscription = {
      status: 'UNKNOWN',
      error: true,
      message: 'Erro ao verificar assinatura'
    };

    next();
  }
};

/**
 * Middleware: Verificar se pode criar usuário (rota pública)
 */
export const canCreateUserPublic = async (req, res, next) => {
  try {
    const { convite_id } = req.body;

    if (!convite_id) {
      return res.status(400).json({
        error: 'ID de convite é obrigatório'
      });
    }

    // Buscar o usuário que enviou o convite
    const usuarioResult = await pool.query(`
      SELECT company_id FROM usuarios WHERE id = $1
    `, [convite_id]);

    if (!usuarioResult.rows || usuarioResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Convite inválido'
      });
    }

    const companyId = usuarioResult.rows[0].company_id;
    const usage = await getSubscriptionUsage(companyId);

    if (!usage) {
      return res.status(402).json({
        error: 'Assinatura inativa',
        message: 'A empresa não possui assinatura ativa.'
      });
    }

    if (usage.subscription_status !== 'ACTIVE' && usage.subscription_status !== 'TRIAL') {
      return res.status(402).json({
        error: 'Assinatura inativa',
        message: 'A empresa não possui assinatura ativa.'
      });
    }

    if (usage.usage.usuarios >= usage.limits.max_usuarios) {
      return res.status(403).json({
        error: 'Limite de usuários atingido',
        message: 'A empresa atingiu o limite de usuários do plano.',
        current_users: usage.usage.usuarios,
        max_users: usage.limits.max_usuarios
      });
    }

    next();
  } catch (error) {
    console.error('Erro ao verificar limite de usuários (público):', error);
    return res.status(500).json({
      error: 'Erro ao verificar limite de usuários'
    });
  }
};

/**
 * Middleware: Verificar se pode criar usuário (autenticado)
 */
export const canCreateUser = async (req, res, next) => {
  try {
    // Super admin não tem restrições
    if (req.user?.role === 'super_admin' || req.usuario?.role === 'super_admin') {
      return next();
    }

    const companyId = req.user?.company_id || req.usuario?.company_id;

    if (!companyId) {
      return res.status(400).json({
        error: 'Usuário não vinculado a uma empresa'
      });
    }

    const usage = await getSubscriptionUsage(companyId);

    if (!usage) {
      return res.status(402).json({
        error: 'Assinatura inativa'
      });
    }

    if (usage.subscription_status !== 'ACTIVE' && usage.subscription_status !== 'TRIAL') {
      return res.status(402).json({
        error: 'Assinatura inativa',
        message: 'Sua assinatura não está ativa.'
      });
    }

    if (usage.usage.usuarios >= usage.limits.max_usuarios) {
      return res.status(403).json({
        error: 'Limite de usuários atingido',
        message: `Você atingiu o limite de ${usage.limits.max_usuarios} usuários do plano ${usage.plano_nome}. Faça upgrade para adicionar mais usuários.`,
        current_users: usage.usage.usuarios,
        max_users: usage.limits.max_usuarios
      });
    }

    next();
  } catch (error) {
    console.error('Erro ao verificar limite de usuários:', error);
    return res.status(500).json({
      error: 'Erro ao verificar limite de usuários'
    });
  }
};

/**
 * Middleware: Verificar se pode criar lead (rota pública)
 */
export const canCreateLeadPublic = async (req, res, next) => {
  try {
    const { linkPublico } = req.params;

    if (!linkPublico) {
      return res.status(400).json({
        error: 'Link público é obrigatório'
      });
    }

    // Buscar vendedor pelo link público
    const usuarioResult = await pool.query(`
      SELECT company_id FROM usuarios WHERE link_publico = $1
    `, [linkPublico]);

    if (!usuarioResult.rows || usuarioResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Link de cadastro inválido ou expirado'
      });
    }

    const companyId = usuarioResult.rows[0].company_id;
    const usage = await getSubscriptionUsage(companyId);

    if (!usage) {
      return res.status(402).json({
        error: 'Assinatura inativa',
        message: 'A empresa não possui assinatura ativa.'
      });
    }

    if (usage.subscription_status !== 'ACTIVE' && usage.subscription_status !== 'TRIAL') {
      return res.status(402).json({
        error: 'Assinatura inativa',
        message: 'A empresa não possui assinatura ativa.'
      });
    }

    if (usage.usage.leads >= usage.limits.max_leads) {
      return res.status(403).json({
        error: 'Limite de leads atingido',
        message: 'A empresa atingiu o limite de leads do plano.',
        current_leads: usage.usage.leads,
        max_leads: usage.limits.max_leads
      });
    }

    next();
  } catch (error) {
    console.error('Erro ao verificar limite de leads (público):', error);
    return res.status(500).json({
      error: 'Erro ao verificar limite de leads'
    });
  }
};

/**
 * Middleware: Verificar se pode criar lead (autenticado)
 */
export const canCreateLead = async (req, res, next) => {
  try {
    // Super admin não tem restrições
    if (req.user?.role === 'super_admin' || req.usuario?.role === 'super_admin') {
      return next();
    }

    const companyId = req.user?.company_id || req.usuario?.company_id;

    if (!companyId) {
      return res.status(400).json({
        error: 'Usuário não vinculado a uma empresa'
      });
    }

    const usage = await getSubscriptionUsage(companyId);

    if (!usage) {
      return res.status(402).json({
        error: 'Assinatura inativa'
      });
    }

    if (usage.subscription_status !== 'ACTIVE' && usage.subscription_status !== 'TRIAL') {
      return res.status(402).json({
        error: 'Assinatura inativa',
        message: 'Sua assinatura não está ativa.'
      });
    }

    if (usage.usage.leads >= usage.limits.max_leads) {
      return res.status(403).json({
        error: 'Limite de leads atingido',
        message: `Você atingiu o limite de ${usage.limits.max_leads} leads do plano ${usage.plano_nome}. Faça upgrade para adicionar mais leads.`,
        current_leads: usage.usage.leads,
        max_leads: usage.limits.max_leads
      });
    }

    next();
  } catch (error) {
    console.error('Erro ao verificar limite de leads:', error);
    return res.status(500).json({
      error: 'Erro ao verificar limite de leads'
    });
  }
};

/**
 * Middleware: Verificar se pode fazer upload de arquivo
 */
export const canUploadFile = async (req, res, next) => {
  try {
    // Super admin não tem restrições
    if (req.user?.role === 'super_admin' || req.usuario?.role === 'super_admin') {
      return next();
    }

    const companyId = req.user?.company_id || req.usuario?.company_id;

    if (!companyId) {
      return res.status(400).json({
        error: 'Usuário não vinculado a uma empresa'
      });
    }

    const usage = await getSubscriptionUsage(companyId);

    if (!usage) {
      return res.status(402).json({
        error: 'Assinatura inativa'
      });
    }

    if (usage.subscription_status !== 'ACTIVE' && usage.subscription_status !== 'TRIAL') {
      return res.status(402).json({
        error: 'Assinatura inativa',
        message: 'Sua assinatura não está ativa.'
      });
    }

    // Tamanho do arquivo em MB
    const fileSize = req.file?.size || req.files?.[0]?.size || 0;
    const fileSizeMB = fileSize / (1024 * 1024);
    const newStorageGB = usage.usage.storage_gb + (fileSizeMB / 1024);

    if (newStorageGB > usage.limits.max_storage_gb) {
      return res.status(403).json({
        error: 'Limite de armazenamento atingido',
        message: `Você atingiu o limite de ${usage.limits.max_storage_gb}GB de armazenamento do plano ${usage.plano_nome}.`,
        current_storage_gb: usage.usage.storage_gb.toFixed(2),
        max_storage_gb: usage.limits.max_storage_gb
      });
    }

    next();
  } catch (error) {
    console.error('Erro ao verificar limite de armazenamento:', error);
    return res.status(500).json({
      error: 'Erro ao verificar limite de armazenamento'
    });
  }
};

/**
 * Middleware opcional: apenas avisar sobre assinatura, mas não bloquear
 */
export const checkSubscriptionWarning = async (req, res, next) => {
  try {
    const companyId = req.user?.company_id || req.usuario?.company_id;

    if (!companyId) {
      return next();
    }

    const usage = await getSubscriptionUsage(companyId);

    if (usage) {
      req.subscription = {
        status: usage.subscription_status,
        details: {
          plano_nome: usage.plano_nome,
          is_active: usage.subscription_status === 'ACTIVE' || usage.subscription_status === 'TRIAL',
          is_trial: usage.subscription_status === 'TRIAL',
          is_overdue: usage.subscription_status === 'OVERDUE',
          data_vencimento: usage.data_vencimento,
          limits: usage.limits,
          usage: usage.usage
        },
        warning: (usage.subscription_status !== 'ACTIVE' && usage.subscription_status !== 'TRIAL')
          ? 'Assinatura não está ativa'
          : null
      };
    }

    next();
  } catch (error) {
    console.error('Erro ao verificar assinatura (modo warning):', error);
    next();
  }
};

/**
 * Limpar cache de assinatura
 */
export const clearSubscriptionCache = (companyId) => {
  if (companyId) {
    subscriptionCache.delete(companyId);
  } else {
    subscriptionCache.clear();
  }
};

/**
 * Função auxiliar: Obter status de assinatura
 */
export const getSubscriptionStatus = async (companyId) => {
  return await getSubscriptionUsage(companyId);
};
