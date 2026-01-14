/**
 * Middleware de Isolamento Multi-Tenant
 *
 * Garante que cada empresa (tenant) só acessa seus próprios dados.
 * Injeta o company_id do usuário logado em todas as requisições.
 */

/**
 * Middleware principal de tenant
 * Deve ser usado APÓS o middleware de autenticação (verifyToken)
 */
export const tenantMiddleware = (req, res, next) => {
  try {
    // Verificar se o usuário está autenticado
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Não autenticado',
        message: 'Faça login para continuar'
      });
    }

    // Super admin pode não ter company_id e acessa tudo
    if (req.user.role === 'super_admin') {
      req.isSuperAdmin = true;
      req.companyId = req.user.company_id || null;
      req.tenant = {
        companyId: req.user.company_id || null,
        userId: req.user.id,
        userRole: req.user.role
      };
      return next();
    }

    // Verificar se o usuário tem company_id (obrigatório para não-super_admin)
    if (!req.user.company_id) {
      return res.status(403).json({
        error: 'Empresa não identificada',
        message: 'Usuário não está vinculado a nenhuma empresa'
      });
    }

    // Injetar company_id no request para uso nos controllers
    req.companyId = req.user.company_id;
    req.tenant = {
      companyId: req.user.company_id,
      userId: req.user.id,
      userRole: req.user.role
    };

    next();
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao processar tenant',
      message: error.message
    });
  }
};

/**
 * Middleware para validar acesso a recurso específico
 * Verifica se o recurso pertence ao tenant atual
 */
export const validateTenantAccess = (resourceCompanyId) => {
  return (req, res, next) => {
    if (!req.companyId) {
      return res.status(403).json({
        error: 'Tenant não identificado',
        message: 'Company ID não encontrado no request'
      });
    }

    // Comparar company_id (pode ser UUID ou string)
    const reqCompanyId = String(req.companyId);
    const resCompanyId = String(resourceCompanyId);

    if (reqCompanyId !== resCompanyId) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Você não tem permissão para acessar este recurso'
      });
    }

    next();
  };
};

/**
 * Helper para adicionar WHERE company_id em queries
 * Garante que todas as queries filtram por tenant
 */
export const addTenantFilter = (query, companyId, paramIndex = 1) => {
  const hasWhere = query.toUpperCase().includes('WHERE');
  const connector = hasWhere ? 'AND' : 'WHERE';

  return {
    query: `${query} ${connector} company_id = $${paramIndex}`,
    companyId
  };
};

/**
 * Middleware para verificar limites do plano
 * Bloqueia ações se os limites foram atingidos
 */
export const checkPlanLimits = (limitType) => {
  return async (req, res, next) => {
    try {
      const { companyId } = req;

      // Buscar empresa com limites atuais
      const companyQuery = `
        SELECT
          c.*,
          s.status as subscription_status,
          p.max_users,
          p.max_leads,
          p.max_storage_gb,
          p.max_equipes
        FROM companies c
        LEFT JOIN subscriptions s ON c.id = s.company_id AND s.status IN ('active', 'trialing')
        LEFT JOIN plans p ON s.plan_id = p.id
        WHERE c.id = $1
        LIMIT 1
      `;

      const pool = (await import('../config/database.js')).default;
      const result = await pool.query(companyQuery, [companyId]);
      const company = result.rows[0];

      if (!company) {
        return res.status(404).json({
          error: 'Empresa não encontrada'
        });
      }

      // Verificar se tem assinatura ativa
      if (!company.subscription_status || company.subscription_status === 'cancelled') {
        return res.status(403).json({
          error: 'Assinatura inativa',
          message: 'Sua assinatura está inativa. Por favor, regularize seu pagamento.',
          action: 'upgrade'
        });
      }

      // Verificar limite específico
      let limitExceeded = false;
      let limitMessage = '';

      switch (limitType) {
        case 'users':
          if (company.current_users_count >= company.max_users) {
            limitExceeded = true;
            limitMessage = `Limite de ${company.max_users} usuários atingido`;
          }
          break;

        case 'leads':
          if (company.current_leads_count >= company.max_leads) {
            limitExceeded = true;
            limitMessage = `Limite de ${company.max_leads} leads atingido`;
          }
          break;

        case 'storage':
          if (company.current_storage_used_gb >= company.max_storage_gb) {
            limitExceeded = true;
            limitMessage = `Limite de ${company.max_storage_gb}GB de armazenamento atingido`;
          }
          break;

        default:
          break;
      }

      if (limitExceeded) {
        return res.status(403).json({
          error: 'Limite do plano atingido',
          message: limitMessage,
          action: 'upgrade',
          upgradeUrl: '/assinatura/upgrade'
        });
      }

      // Anexar informações do plano ao request
      req.companyPlan = {
        maxUsers: company.max_users,
        maxLeads: company.max_leads,
        maxStorage: company.max_storage_gb,
        maxEquipes: company.max_equipes,
        currentUsers: company.current_users_count,
        currentLeads: company.current_leads_count,
        currentStorage: company.current_storage_used_gb
      };

      next();
    } catch {
      next(); // Continuar em caso de erro (não bloquear operação)
    }
  };
};

/**
 * Middleware opcional para super admins
 * Permite acesso cross-tenant para super admins
 */
export const allowSuperAdmin = (req, _res, next) => {
  if (req.user && req.user.role === 'super_admin') {
    req.isSuperAdmin = true;
  }
  next();
};

export default {
  tenantMiddleware,
  validateTenantAccess,
  addTenantFilter,
  checkPlanLimits,
  allowSuperAdmin
};
