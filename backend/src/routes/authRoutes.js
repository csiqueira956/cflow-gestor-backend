import express from 'express';
import {
  register,
  login,
  verificarToken,
  updateProfile,
  requestPasswordReset,
  verifyResetToken,
  resetPassword
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
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

export default router;
