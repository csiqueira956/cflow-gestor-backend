import { body, validationResult } from 'express-validator';

// Middleware para verificar erros de validação
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array()
    });
  }
  next();
};

// Validações para registro de usuário
export const validateRegister = [
  body('nome')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Nome deve ter entre 3 e 100 caracteres')
    .matches(/^[a-záàâãéèêíïóôõöúçñ\s]+$/i)
    .withMessage('Nome deve conter apenas letras'),

  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('E-mail inválido'),

  body('senha')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número'),

  body('celular')
    .optional()
    .matches(/^(\(?\d{2}\)?\s?)?9?\d{4}-?\d{4}$/)
    .withMessage('Celular inválido'),

  validate
];

// Validações para login
export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('E-mail inválido'),

  body('senha')
    .notEmpty()
    .withMessage('Senha é obrigatória'),

  validate
];

// Validações para atualização de perfil
export const validateProfileUpdate = [
  body('nome')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Nome deve ter entre 3 e 100 caracteres'),

  body('celular')
    .optional()
    .matches(/^(\(?\d{2}\)?\s?)?9?\d{4}-?\d{4}$/)
    .withMessage('Celular inválido'),

  body('foto_perfil')
    .optional()
    .isBase64()
    .withMessage('Foto de perfil deve estar em formato base64'),

  validate
];

// Validações para criação de cliente
export const validateClientCreate = [
  body('nome')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Nome deve ter entre 3 e 100 caracteres'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('E-mail inválido'),

  body('telefone')
    .optional()
    .matches(/^(\(?\d{2}\)?\s?)?9?\d{4}-?\d{4}$/)
    .withMessage('Telefone inválido'),

  body('cpf')
    .optional()
    .matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/)
    .withMessage('CPF inválido'),

  validate
];

// Validação genérica para IDs
export const validateId = [
  body('id')
    .isInt({ min: 1 })
    .withMessage('ID deve ser um número inteiro positivo'),

  validate
];

// Validações para atualização de usuário (admin)
export const validateUserUpdate = [
  body('nome')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Nome deve ter entre 3 e 100 caracteres')
    .matches(/^[a-záàâãéèêíïóôõöúçñ\s]+$/i)
    .withMessage('Nome deve conter apenas letras'),

  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('E-mail inválido'),

  body('role')
    .optional()
    .isIn(['vendedor', 'gerente', 'admin'])
    .withMessage('Role deve ser vendedor, gerente ou admin'),

  body('tipo_usuario')
    .optional()
    .isIn(['vendedor', 'closer', 'gerente'])
    .withMessage('Tipo de usuário deve ser vendedor, closer ou gerente'),

  body('percentual_comissao')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Percentual de comissão deve ser entre 0 e 100'),

  body('celular')
    .optional()
    .matches(/^(\(?\d{2}\)?\s?)?9?\d{4}-?\d{4}$/)
    .withMessage('Celular inválido'),

  body('equipe')
    .optional()
    .custom((value) => {
      if (value === null || value === '' || value === undefined) return true;
      const num = parseInt(value, 10);
      return !isNaN(num) && num > 0;
    })
    .withMessage('Equipe deve ser um ID válido'),

  body('senha')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres'),

  validate
];

// Validações para registro de vendedor (público via convite)
export const validateVendedorRegister = [
  body('nome')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Nome deve ter entre 3 e 100 caracteres')
    .matches(/^[a-záàâãéèêíïóôõöúçñ\s]+$/i)
    .withMessage('Nome deve conter apenas letras'),

  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('E-mail inválido'),

  body('celular')
    .matches(/^(\(?\d{2}\)?\s?)?9?\d{4}-?\d{4}$/)
    .withMessage('Celular inválido'),

  body('senha')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres'),

  body('convite_id')
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage('ID de convite inválido'),

  validate
];

// Validações para reset de senha
export const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Token é obrigatório'),

  body('novaSenha')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres'),

  validate
];

// Validações para solicitação de recuperação de senha
export const validateForgotPassword = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('E-mail inválido'),

  validate
];

// Sanitização geral para prevenir XSS
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove tags HTML
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        obj[key] = obj[key].replace(/<[^>]+>/g, '');
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};
