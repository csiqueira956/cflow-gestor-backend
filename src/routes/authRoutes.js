import express from 'express';
import {
  register,
  login,
  logout,
  verificarToken,
  updateProfile,
  requestPasswordReset,
  verifyResetToken,
  resetPassword
} from '../controllers/authController.js';
import { logoutAllSessions, forceLogoutUser } from '../controllers/sessionController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { loginLimiter, createLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validateForgotPassword,
  validatePasswordReset,
  sanitizeInput
} from '../middleware/validation.js';

const router = express.Router();

// Aplicar sanitização em todas as rotas
router.use(sanitizeInput);

// Rotas públicas
router.post('/register', createLimiter, validateRegister, register);
router.post('/login', loginLimiter, validateLogin, login);

// Rotas de recuperação de senha (todas com rate limiting para prevenir brute force)
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, requestPasswordReset);
router.get('/verify-reset-token/:token', passwordResetLimiter, verifyResetToken);
router.post('/reset-password', passwordResetLimiter, validatePasswordReset, resetPassword);

// Rotas protegidas
router.get('/me', authenticateToken, verificarToken);
router.put('/me', authenticateToken, validateProfileUpdate, updateProfile);
router.post('/logout', authenticateToken, logout);
router.post('/logout-all', authenticateToken, logoutAllSessions);
router.post('/force-logout/:userId', authenticateToken, isAdmin, forceLogoutUser);

export default router;
