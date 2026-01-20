import bcrypt from 'bcryptjs';
import Usuario from '../models/Usuario.js';
import { generateToken } from '../middleware/auth.js';
import pool from '../config/database.js';
import { registerSession, registerLogout } from './sessionController.js';
import { logAudit, AuditAction, getClientInfo } from '../services/auditService.js';

// Registro de novo usuário
// SEGURANÇA: Esta rota é pública - role é sempre 'vendedor'
// Para criar usuários com outros roles, use as rotas protegidas de admin
export const register = async (req, res) => {
  try {
    const { nome, email, senha, tipo_usuario, percentual_comissao, celular, equipe } = req.body;

    // Validação básica
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Verificar se o email já existe
    const usuarioExistente = await Usuario.findByEmail(email);
    if (usuarioExistente) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const senha_hash = await bcrypt.hash(senha, 10);

    // SEGURANÇA: Role é sempre 'vendedor' para registro público
    // Roles privilegiados (admin, gerente, super_admin) só podem ser atribuídos por admin
    const novoUsuario = await Usuario.create({
      nome,
      email,
      senha_hash,
      role: 'vendedor', // Forçado por segurança - ignora qualquer role do body
      tipo_usuario,
      percentual_comissao,
      celular,
      equipe_id: equipe ? parseInt(equipe, 10) : null
    });

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      usuario: {
        id: novoUsuario.id,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        role: novoUsuario.role
      }
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
};

// Login de usuário
export const login = async (req, res) => {
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const { email, senha } = req.body;

    // Validação básica
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const usuario = await Usuario.findByEmail(email);
    if (!usuario) {
      // Audit: tentativa de login com email não existente
      await logAudit({
        action: AuditAction.LOGIN_FAILED,
        details: { email, reason: 'email_not_found' },
        ipAddress,
        userAgent
      });
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      // Audit: tentativa de login com senha incorreta
      await logAudit({
        userId: usuario.id,
        companyId: usuario.company_id,
        action: AuditAction.LOGIN_FAILED,
        details: { reason: 'invalid_password' },
        ipAddress,
        userAgent
      });
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Buscar dados completos do usuário com equipe
    const usuarioCompleto = await Usuario.findById(usuario.id);

    // Buscar token_version atual
    const versionResult = await pool.query(
      'SELECT token_version FROM usuarios WHERE id = $1',
      [usuario.id]
    );
    const tokenVersion = versionResult.rows[0]?.token_version || 0;

    // Gerar token JWT com token_version
    const token = generateToken({
      id: usuario.id,
      email: usuario.email,
      role: usuario.role,
      company_id: usuario.company_id,
      equipe_id: usuario.equipe_id,
      token_version: tokenVersion
    });

    // Registrar sessão de login
    await registerSession(usuario.id, usuario.company_id, ipAddress, userAgent);

    // Audit: login bem sucedido
    await logAudit({
      userId: usuario.id,
      companyId: usuario.company_id,
      action: AuditAction.LOGIN,
      entityType: 'user',
      entityId: usuario.id.toString(),
      ipAddress,
      userAgent
    });

    res.json({
      message: 'Login realizado com sucesso',
      token,
      usuario: {
        id: usuarioCompleto.id,
        nome: usuarioCompleto.nome,
        email: usuarioCompleto.email,
        role: usuarioCompleto.role,
        link_publico: usuarioCompleto.link_publico,
        foto_perfil: usuarioCompleto.foto_perfil,
        equipe_id: usuarioCompleto.equipe_id,
        equipe_nome: usuarioCompleto.equipe_nome
      }
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

// Logout de usuário
export const logout = async (req, res) => {
  try {
    const { ipAddress, userAgent } = getClientInfo(req);

    await registerLogout(req.user.id);

    // Audit: logout
    await logAudit({
      userId: req.user.id,
      companyId: req.user.company_id,
      action: AuditAction.LOGOUT,
      entityType: 'user',
      entityId: req.user.id.toString(),
      ipAddress,
      userAgent
    });

    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    res.status(500).json({ error: 'Erro ao fazer logout' });
  }
};

// Verificar token (rota protegida de teste)
export const verificarToken = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user.id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      link_publico: usuario.link_publico,
      foto_perfil: usuario.foto_perfil,
      celular: usuario.celular,
      equipe_id: usuario.equipe_id,
      equipe_nome: usuario.equipe_nome
    });
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    res.status(500).json({ error: 'Erro ao verificar token' });
  }
};

// Atualizar perfil do usuário logado
export const updateProfile = async (req, res) => {
  try {
    const { nome, celular, foto_perfil } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const usuarioAtualizado = await Usuario.updateProfile(req.user.id, {
      nome,
      celular,
      foto_perfil
    });

    res.json({
      message: 'Perfil atualizado com sucesso',
      usuario: {
        id: usuarioAtualizado.id,
        nome: usuarioAtualizado.nome,
        email: usuarioAtualizado.email,
        role: usuarioAtualizado.role,
        link_publico: usuarioAtualizado.link_publico,
        foto_perfil: usuarioAtualizado.foto_perfil,
        celular: usuarioAtualizado.celular,
        equipe_id: usuarioAtualizado.equipe_id,
        equipe_nome: usuarioAtualizado.equipe_nome
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
};

// Solicitar recuperação de senha
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório' });
    }

    // Buscar usuário por email
    const usuario = await Usuario.findByEmail(email);

    // Sempre retorna sucesso (segurança: não revelar se email existe)
    if (!usuario) {
      return res.json({
        message: 'Se o e-mail existir em nossa base, você receberá instruções de recuperação.'
      });
    }

    // Importar PasswordReset e emailService dinamicamente
    const PasswordReset = (await import('../models/PasswordReset.js')).default;
    const { sendPasswordResetEmail } = await import('../services/emailService.js');

    // Criar token de reset
    const resetToken = await PasswordReset.createToken(usuario.id, usuario.email);

    // Enviar email com link de reset
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/resetar-senha?token=${resetToken.token}`;

    await sendPasswordResetEmail(usuario.email, usuario.nome, resetUrl);

    res.json({
      message: 'Se o e-mail existir em nossa base, você receberá instruções de recuperação.'
    });
  } catch (error) {
    console.error('Erro ao solicitar reset de senha:', error);
    res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
};

// Verificar token de reset
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    const PasswordReset = (await import('../models/PasswordReset.js')).default;

    const resetData = await PasswordReset.verifyToken(token);

    if (!resetData) {
      return res.status(400).json({
        error: 'Token inválido ou expirado',
        valid: false
      });
    }

    res.json({
      valid: true,
      email: resetData.email,
      nome: resetData.nome
    });
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    res.status(500).json({ error: 'Erro ao verificar token' });
  }
};

// Resetar senha
export const resetPassword = async (req, res) => {
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const { token, novaSenha } = req.body;

    if (!token || !novaSenha) {
      return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    }

    if (novaSenha.length < 8) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });
    }

    const PasswordReset = (await import('../models/PasswordReset.js')).default;

    // Verificar token
    const resetData = await PasswordReset.verifyToken(token);

    if (!resetData) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    // Hash da nova senha
    const senha_hash = await bcrypt.hash(novaSenha, 10);

    // Atualizar senha e incrementar token_version para invalidar sessões antigas
    const query = 'UPDATE usuarios SET senha_hash = $1, token_version = COALESCE(token_version, 0) + 1 WHERE id = $2';
    await pool.query(query, [senha_hash, resetData.user_id]);

    // Marcar token como usado
    await PasswordReset.markAsUsed(token);

    // Audit: reset de senha
    await logAudit({
      userId: resetData.user_id,
      action: AuditAction.PASSWORD_RESET,
      entityType: 'user',
      entityId: resetData.user_id.toString(),
      details: { method: 'reset_link' },
      ipAddress,
      userAgent
    });

    res.json({ message: 'Senha alterada com sucesso! Você já pode fazer login.' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ error: 'Erro ao resetar senha' });
  }
};
