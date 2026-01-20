import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../config/database.js';

dotenv.config();

// Middleware para verificar autenticação JWT
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar token_version para invalidar sessões antigas
    const userResult = await pool.query(
      'SELECT token_version, ativo FROM usuarios WHERE id = $1',
      [decoded.id]
    );

    if (!userResult.rows[0]) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    if (!userResult.rows[0].ativo) {
      return res.status(401).json({ error: 'Usuário desativado' });
    }

    // Se token_version no token não corresponder ao do banco, sessão foi invalidada
    const currentVersion = userResult.rows[0].token_version || 0;
    const tokenVersion = decoded.token_version || 0;

    if (tokenVersion < currentVersion) {
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }

    req.user = decoded; // { id, email, role, company_id, token_version }

    // Atualizar última atividade (async, não bloqueia a request)
    updateUserActivity(decoded.id).catch(() => {});

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
};

// Função para atualizar última atividade do usuário
async function updateUserActivity(userId) {
  try {
    await pool.query(
      `UPDATE usuarios SET last_activity = NOW() WHERE id = $1`,
      [userId]
    );
    await pool.query(
      `UPDATE user_sessions SET last_activity = NOW() WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
  } catch (error) {
    // Silently fail - não deve impactar a request
  }
}

// Middleware para verificar se o usuário é admin da empresa
export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// Middleware para verificar se o usuário é super_admin (acesso cross-tenant)
export const isSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      error: 'Acesso negado',
      message: 'Apenas super administradores podem acessar este recurso.'
    });
  }
  req.isSuperAdmin = true;
  next();
};

// Middleware para verificar se é admin OU super_admin
export const isAdminOrSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// Gerar token JWT (inclui token_version para invalidação de sessões)
export const generateToken = (payload) => {
  // Garantir que token_version está incluído
  const tokenPayload = {
    ...payload,
    token_version: payload.token_version || 0
  };

  return jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    expiresIn: '24h' // Token expira em 24 horas (segurança)
  });
};
