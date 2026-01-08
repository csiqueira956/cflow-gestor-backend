import bcrypt from 'bcryptjs';
import Usuario from '../models/Usuario.js';
import { generateToken } from '../middleware/auth.js';
import pool from '../config/database.js';

// Registro de novo usuário
export const register = async (req, res) => {
  try {
    const {
      nome,
      email,
      senha,
      role,
      tipo_usuario,
      percentual_comissao,
      celular,
      equipe,
      company_id,  // Para vendedores/gerentes que já têm empresa
      empresa_nome,  // Para admins - nome da nova empresa
      empresa_email,
      empresa_telefone
    } = req.body;

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

    let finalCompanyId = company_id;

    // Se for admin, criar empresa automaticamente
    if (role === 'admin') {
      console.log('🏢 Criando empresa automaticamente para novo admin');

      // Validar dados da empresa
      if (!empresa_nome) {
        return res.status(400).json({
          error: 'Para criar um admin, é necessário informar o nome da empresa (empresa_nome)'
        });
      }

      // Verificar se email da empresa já existe (se fornecido)
      if (empresa_email) {
        const empresaExistente = await pool.query(
          'SELECT id FROM empresas WHERE email = ?',
          [empresa_email]
        );

        if (empresaExistente.rows && empresaExistente.rows.length > 0) {
          return res.status(400).json({
            error: 'Já existe uma empresa com este email'
          });
        }
      }

      // Criar empresa
      const empresaResult = await pool.run(
        `INSERT INTO empresas (nome, email, telefone, status)
         VALUES (?, ?, ?, 'ACTIVE')`,
        [empresa_nome, empresa_email || email, empresa_telefone || null]
      );

      finalCompanyId = empresaResult.lastID;
      console.log('✅ Empresa criada - ID:', finalCompanyId);

      // Criar assinatura trial padrão (14 dias)
      const planoResult = await pool.query(
        'SELECT * FROM planos WHERE nome = ? OR id = ? LIMIT 1',
        ['Trial', 4]
      );

      if (planoResult.rows && planoResult.rows.length > 0) {
        const plano = planoResult.rows[0];
        const now = new Date();
        const data_fim_trial = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)).toISOString();

        await pool.run(
          `INSERT INTO assinaturas (
            company_id, plano_id, status, data_fim_trial,
            valor_mensal, usuarios_contratados
          )
           VALUES (?, ?, 'TRIAL', ?, 0, 1)`,
          [finalCompanyId, plano.id, data_fim_trial]
        );

        console.log('✅ Assinatura trial criada para a empresa');
      }
    }

    // Criar usuário (equipe é o equipe_id)
    const novoUsuario = await Usuario.create({
      nome,
      email,
      senha_hash,
      role: role || 'vendedor',
      tipo_usuario,
      percentual_comissao,
      celular,
      equipe_id: equipe ? parseInt(equipe, 10) : null,  // Converter para inteiro ou null
      company_id: finalCompanyId
    });

    console.log(`✅ Usuário ${role || 'vendedor'} criado - ID: ${novoUsuario.id}, Company: ${finalCompanyId || 'null'}`);

    res.status(201).json({
      message: role === 'admin'
        ? 'Admin e empresa criados com sucesso'
        : 'Usuário criado com sucesso',
      usuario: {
        id: novoUsuario.id,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        role: novoUsuario.role,
        company_id: novoUsuario.company_id
      },
      ...(role === 'admin' && {
        empresa: {
          id: finalCompanyId,
          nome: empresa_nome
        }
      })
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
};

// Login de usuário
export const login = async (req, res) => {
  try {
    console.log('📥 Tentativa de login recebida:', { email: req.body.email });
    const { email, senha } = req.body;

    // Validação básica
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const usuario = await Usuario.findByEmail(email);
    console.log('🔍 Usuário encontrado:', usuario ? 'SIM' : 'NÃO');
    if (!usuario) {
      console.log('❌ Usuário não encontrado');
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    console.log('🔐 Senha válida:', senhaValida ? 'SIM' : 'NÃO');
    if (!senhaValida) {
      console.log('❌ Senha inválida');
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Buscar dados completos do usuário com equipe
    const usuarioCompleto = await Usuario.findById(usuario.id);

    // Gerar token JWT
    const token = generateToken({
      id: usuario.id,
      email: usuario.email,
      role: usuario.role,
      equipe_id: usuario.equipe_id,
      company_id: usuario.company_id || 1  // Default to 1 for single-tenant setup
    });

    console.log('✅ Login bem-sucedido para:', usuario.nome);
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
    console.log('📝 Atualizando perfil do usuário:', req.user.id);
    const { nome, celular, foto_perfil } = req.body;
    console.log('Dados recebidos:', { nome, celular: celular?.substring(0, 5) + '...', foto_perfil: foto_perfil ? 'Foto presente' : 'Sem foto' });

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const usuarioAtualizado = await Usuario.updateProfile(req.user.id, {
      nome,
      celular,
      foto_perfil
    });

    console.log('✅ Perfil atualizado com sucesso:', usuarioAtualizado.nome);

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
    console.error('❌ Erro ao atualizar perfil:', error);
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

    console.log('📧 Email de recuperação enviado para:', email);

    res.json({
      message: 'Se o e-mail existir em nossa base, você receberá instruções de recuperação.'
    });
  } catch (error) {
    console.error('❌ Erro ao solicitar reset de senha:', error);
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
    console.error('❌ Erro ao verificar token:', error);
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

    console.log('🔐 Senha resetada com sucesso para:', resetData.email);

    res.json({ message: 'Senha alterada com sucesso! Você já pode fazer login.' });
  } catch (error) {
    console.error('❌ Erro ao resetar senha:', error);
    res.status(500).json({ error: 'Erro ao resetar senha' });
  }
};

/**
 * Criar conta trial - ROTA PÚBLICA (chamada pela Netlify Function)
 * POST /api/auth/create-trial-account
 * Cria empresa, usuário admin e assinatura trial automaticamente
 */
export const createTrialAccount = async (req, res) => {
  try {
    console.log('🆕 Criando conta trial:', req.body);

    const {
      nome,           // Nome da empresa
      email,          // Email da empresa
      telefone,
      admin_nome,     // Nome do usuário admin
      admin_email,    // Email do usuário admin
      asaas_customer_id,  // ID do cliente no ASAAS
      asaas_subscription_id // ID da assinatura no ASAAS
    } = req.body;

    // Validações básicas
    if (!nome || !email || !admin_nome || !admin_email) {
      return res.status(400).json({
        error: 'Dados obrigatórios: nome, email, admin_nome, admin_email'
      });
    }

    // Verificar se email da empresa já existe
    const emailCheck = await pool.query(
      'SELECT id FROM empresas WHERE email = ?',
      [email]
    );

    if (emailCheck.rows && emailCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'Já existe uma empresa com este email'
      });
    }

    // Verificar se email do admin já existe
    const adminEmailCheck = await pool.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [admin_email]
    );

    if (adminEmailCheck.rows && adminEmailCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'Já existe um usuário com este email'
      });
    }

    // Buscar plano Trial (id 4)
    const planoResult = await pool.query(
      'SELECT * FROM planos WHERE nome = ? OR id = ? LIMIT 1',
      ['Trial', 4]
    );

    if (!planoResult.rows || planoResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Plano Trial não encontrado no banco de dados'
      });
    }

    const plano = planoResult.rows[0];

    // 1. Criar empresa
    const empresaResult = await pool.run(
      `INSERT INTO empresas (nome, email, telefone, status)
       VALUES (?, ?, ?, 'ACTIVE')`,
      [nome, email, telefone || null]
    );

    const company_id = empresaResult.lastID;
    console.log('✅ Empresa criada - ID:', company_id);

    // 2. Gerar token de ativação (válido por 7 dias)
    const crypto = await import('crypto');
    const activation_token = crypto.randomBytes(32).toString('hex');
    const token_expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias

    // 3. Criar usuário admin SEM SENHA (será definida na ativação)
    const usuarioResult = await pool.run(
      `INSERT INTO usuarios (nome, email, senha_hash, role, company_id, activation_token, token_expires)
       VALUES (?, ?, ?, 'admin', ?, ?, ?)`,
      [admin_nome, admin_email, '', company_id, activation_token, token_expires]
    );

    const usuario_id = usuarioResult.lastID;
    console.log('✅ Usuário admin criado - ID:', usuario_id);

    // 4. Criar assinatura trial (14 dias)
    const now = new Date();
    const data_fim_trial = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)).toISOString();

    await pool.run(
      `INSERT INTO assinaturas (
        company_id, plano_id, status, data_fim_trial,
        valor_mensal, usuarios_contratados,
        asaas_customer_id, asaas_subscription_id
      )
       VALUES (?, ?, 'TRIAL', ?, 0, 1, ?, ?)`,
      [company_id, plano.id, data_fim_trial, asaas_customer_id, asaas_subscription_id]
    );

    console.log('✅ Assinatura trial criada');

    // 5. Retornar dados para a Netlify Function enviar email
    res.status(201).json({
      success: true,
      message: 'Conta trial criada com sucesso',
      data: {
        company_id,
        usuario_id,
        activation_token,
        token_expires,
        activation_link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/ativar-conta?token=${activation_token}`,
        trial_expires: data_fim_trial,
        plano: plano.nome
      }
    });

  } catch (error) {
    console.error('❌ Erro ao criar conta trial:', error);
    res.status(500).json({
      error: 'Erro ao criar conta trial',
      message: error.message
    });
  }
};

/**
 * Ativar conta trial com token
 * POST /api/auth/activate-account
 * Usuário define senha e ativa sua conta
 */
export const activateAccount = async (req, res) => {
  try {
    console.log('🔓 Ativando conta com token');

    const { token, senha } = req.body;

    if (!token || !senha) {
      return res.status(400).json({
        error: 'Token e senha são obrigatórios'
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({
        error: 'Senha deve ter no mínimo 6 caracteres'
      });
    }

    // Buscar usuário pelo token
    const userResult = await pool.query(
      `SELECT id, nome, email, company_id, role, token_expires
       FROM usuarios
       WHERE activation_token = ?`,
      [token]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Token inválido ou já utilizado'
      });
    }

    const usuario = userResult.rows[0];

    // Verificar se token expirou
    const now = new Date();
    const expires = new Date(usuario.token_expires);

    if (now > expires) {
      return res.status(400).json({
        error: 'Token expirado. Solicite um novo link de ativação.'
      });
    }

    // Hash da senha
    const senha_hash = await bcrypt.hash(senha, 10);

    // Atualizar usuário: definir senha e limpar token
    await pool.query(
      `UPDATE usuarios
       SET senha_hash = ?, activation_token = NULL, token_expires = NULL
       WHERE id = ?`,
      [senha_hash, usuario.id]
    );

    console.log('✅ Conta ativada com sucesso:', usuario.email);

    // Gerar token JWT para login automático
    const jwtToken = generateToken({
      id: usuario.id,
      email: usuario.email,
      role: usuario.role,
      company_id: usuario.company_id
    });

    res.json({
      success: true,
      message: 'Conta ativada com sucesso!',
      token: jwtToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        company_id: usuario.company_id
      }
    });

  } catch (error) {
    console.error('❌ Erro ao ativar conta:', error);
    res.status(500).json({
      error: 'Erro ao ativar conta',
      message: error.message
    });
  }
};
