import bcrypt from 'bcryptjs';
import Usuario from '../models/Usuario.js';
import { generateToken } from '../middleware/auth.js';
import pool from '../config/database.js';

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
  try {
    const { email, senha } = req.body;

    // Validação básica
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const usuario = await Usuario.findByEmail(email);
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Buscar dados completos do usuário com equipe
    const usuarioCompleto = await Usuario.findById(usuario.id);

    // Gerar token JWT
    const token = generateToken({
      id: usuario.id,
      email: usuario.email,
      role: usuario.role,
      equipe_id: usuario.equipe_id
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
  try {
    const { token, novaSenha } = req.body;

    if (!token || !novaSenha) {
      return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    }

    const PasswordReset = (await import('../models/PasswordReset.js')).default;

    // Verificar token
    const resetData = await PasswordReset.verifyToken(token);

    if (!resetData) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    // Hash da nova senha
    const senha_hash = await bcrypt.hash(novaSenha, 10);

    // Atualizar senha do usuário
    const query = 'UPDATE usuarios SET senha_hash = $1 WHERE id = $2';
    await pool.query(query, [senha_hash, resetData.user_id]);

    // Marcar token como usado
    await PasswordReset.markAsUsed(token);

    res.json({ message: 'Senha alterada com sucesso! Você já pode fazer login.' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ error: 'Erro ao resetar senha' });
  }
};
