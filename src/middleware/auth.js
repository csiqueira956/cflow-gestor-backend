import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../config/database.js';

dotenv.config();

// Middleware para verificar autenticação JWT
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }

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

// Gerar token JWT
export const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d' // Token expira em 7 dias
  });
};
