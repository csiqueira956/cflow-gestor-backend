import express from 'express';
import {
  register,
  login,
  verificarToken,
  updateProfile,
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  createTrialAccount,
  activateAccount
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loginLimiter, createLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Rotas públicas
router.post('/register', createLimiter, register);
router.post('/login', loginLimiter, login);

// Rotas de recuperação de senha
router.post('/forgot-password', passwordResetLimiter, requestPasswordReset);
router.get('/verify-reset-token/:token', verifyResetToken);
router.post('/reset-password', resetPassword);

// Rotas de trial (públicas - chamadas pela Netlify Function)
router.post('/create-trial-account', createTrialAccount);
router.post('/activate-account', activateAccount);

// Rotas protegidas
router.get('/me', authenticateToken, verificarToken);
router.put('/me', authenticateToken, updateProfile);

export default router;
