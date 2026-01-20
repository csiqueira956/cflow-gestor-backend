import pool from '../config/database.js';

// Tipos de ações para audit log
export const AuditAction = {
  // Autenticação
  LOGIN: 'LOGIN',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  LOGOUT_ALL: 'LOGOUT_ALL',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET: 'PASSWORD_RESET',

  // Usuários
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  USER_ACTIVATE: 'USER_ACTIVATE',
  USER_DEACTIVATE: 'USER_DEACTIVATE',

  // Vendedores
  VENDEDOR_CREATE: 'VENDEDOR_CREATE',
  VENDEDOR_UPDATE: 'VENDEDOR_UPDATE',
  VENDEDOR_DELETE: 'VENDEDOR_DELETE',

  // Propostas
  PROPOSTA_CREATE: 'PROPOSTA_CREATE',
  PROPOSTA_UPDATE: 'PROPOSTA_UPDATE',
  PROPOSTA_DELETE: 'PROPOSTA_DELETE',
  PROPOSTA_STATUS_CHANGE: 'PROPOSTA_STATUS_CHANGE',

  // Financeiro
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  SUBSCRIPTION_CHANGE: 'SUBSCRIPTION_CHANGE',

  // Admin
  COMPANY_CREATE: 'COMPANY_CREATE',
  COMPANY_UPDATE: 'COMPANY_UPDATE',
  SETTINGS_CHANGE: 'SETTINGS_CHANGE',
  FORCE_LOGOUT: 'FORCE_LOGOUT'
};

/**
 * Registra uma ação no audit log
 * @param {Object} params
 * @param {number} params.userId - ID do usuário que realizou a ação
 * @param {string} params.companyId - ID da empresa
 * @param {string} params.action - Tipo de ação (use AuditAction)
 * @param {string} params.entityType - Tipo de entidade afetada
 * @param {string} params.entityId - ID da entidade afetada
 * @param {Object} params.details - Detalhes adicionais
 * @param {string} params.ipAddress - IP do cliente
 * @param {string} params.userAgent - User agent do cliente
 */
export const logAudit = async ({
  userId,
  companyId,
  action,
  entityType = null,
  entityId = null,
  details = null,
  ipAddress = null,
  userAgent = null
}) => {
  try {
    // Sanitizar detalhes para remover dados sensíveis
    const sanitizedDetails = details ? sanitizeDetails(details) : null;

    await pool.query(
      `INSERT INTO audit_logs (user_id, company_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, companyId, action, entityType, entityId, sanitizedDetails ? JSON.stringify(sanitizedDetails) : null, ipAddress, userAgent]
    );
  } catch (error) {
    // Log silencioso - não deve falhar a operação principal
    console.error('Erro ao registrar audit log:', error.message);
  }
};

/**
 * Remove dados sensíveis dos detalhes antes de salvar
 */
const sanitizeDetails = (details) => {
  const sensitiveKeys = ['senha', 'password', 'token', 'secret', 'apiKey', 'api_key'];
  const sanitized = { ...details };

  const sanitizeObject = (obj) => {
    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  sanitizeObject(sanitized);
  return sanitized;
};

/**
 * Buscar logs de auditoria com filtros
 */
export const getAuditLogs = async (req, res) => {
  try {
    const {
      userId,
      action,
      entityType,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.query;

    let whereClause = [];
    let params = [];
    let paramIndex = 1;

    // Filtro por empresa (não super_admin só vê sua empresa)
    if (req.user.role !== 'super_admin') {
      whereClause.push(`a.company_id = $${paramIndex}`);
      params.push(req.user.company_id);
      paramIndex++;
    }

    if (userId) {
      whereClause.push(`a.user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    if (action) {
      whereClause.push(`a.action = $${paramIndex}`);
      params.push(action);
      paramIndex++;
    }

    if (entityType) {
      whereClause.push(`a.entity_type = $${paramIndex}`);
      params.push(entityType);
      paramIndex++;
    }

    if (startDate) {
      whereClause.push(`a.created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause.push(`a.created_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    const query = `
      SELECT
        a.id,
        a.action,
        a.entity_type,
        a.entity_id,
        a.details,
        a.ip_address,
        a.created_at,
        u.nome as user_name,
        u.email as user_email,
        c.nome as company_name
      FROM audit_logs a
      LEFT JOIN usuarios u ON a.user_id = u.id
      LEFT JOIN companies c ON a.company_id = c.id
      ${whereSQL}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Contar total
    const countQuery = `SELECT COUNT(*) FROM audit_logs a ${whereSQL}`;
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Erro ao buscar audit logs:', error);
    res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
  }
};

/**
 * Middleware helper para extrair IP e User Agent
 */
export const getClientInfo = (req) => {
  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.connection?.remoteAddress
    || req.socket?.remoteAddress
    || null;

  const userAgent = req.headers['user-agent'] || null;

  return { ipAddress, userAgent };
};

export default {
  AuditAction,
  logAudit,
  getAuditLogs,
  getClientInfo
};
