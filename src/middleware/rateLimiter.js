import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

// Rate limiter geral para todas as rotas
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limite de 100 requisições por janela
  message: {
    error: 'Muitas requisições deste IP, por favor tente novamente mais tarde.'
  },
  standardHeaders: true, // Retorna info no `RateLimit-*` headers
  legacyHeaders: false, // Desabilita `X-RateLimit-*` headers
  // Função para pular rate limiting em desenvolvimento
  skip: (req) => process.env.NODE_ENV === 'development' && req.ip === '::1' || req.ip === '127.0.0.1'
});

// Rate limiter específico para login (mais restritivo)
export const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS) || 5, // Máximo 5 tentativas
  message: {
    error: 'Muitas tentativas de login falhadas. Por favor, aguarde 15 minutos antes de tentar novamente.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Somente conta tentativas de login falhadas
  skipSuccessfulRequests: true,
});

// Rate limiter para recuperação de senha
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo 3 tentativas por hora
  message: {
    error: 'Muitas solicitações de recuperação de senha. Por favor, aguarde 1 hora antes de tentar novamente.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para criação de recursos (POST)
export const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // Máximo 10 criações por minuto
  message: {
    error: 'Muitas tentativas de criação. Por favor, aguarde um momento.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
