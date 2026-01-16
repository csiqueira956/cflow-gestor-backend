import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

/**
 * Listar todos os usuários de uma empresa
 * GET /api/admin/empresas/:companyId/usuarios
 */
export const listarUsuariosEmpresa = async (req, res) => {
  try {
    const { companyId } = req.params;

    const { rows } = await pool.query(
      `SELECT
        id,
        nome,
        email,
        role,
        celular,
        created_at,
        equipe_id
      FROM usuarios
      WHERE company_id = ?
      ORDER BY created_at DESC`,
      [companyId]
    );

    return res.json({
      usuarios: rows
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao listar usuários'
    });
  }
};

/**
 * Criar novo usuário para uma empresa
 * POST /api/admin/empresas/:companyId/usuarios
 */
export const criarUsuarioEmpresa = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { nome, email, role, celular, senha } = req.body;

    // Validações
    if (!nome || !email || !role) {
      return res.status(400).json({
        error: 'Nome, email e role são obrigatórios'
      });
    }

    if (!['admin', 'gerente', 'vendedor'].includes(role)) {
      return res.status(400).json({
        error: 'Role inválida. Use: admin, gerente ou vendedor'
      });
    }

    // Verificar se email já existe
    const { rows: existingUser } = await pool.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        error: 'Email já cadastrado'
      });
    }

    // Gerar senha padrão se não fornecida
    const senhaFinal = senha || 'CFLOW@2024';
    const senhaHash = bcrypt.hashSync(senhaFinal, 10);

    // Inserir usuário
    const result = await pool.run(
      `INSERT INTO usuarios (nome, email, senha_hash, role, celular, company_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nome, email, senhaHash, role, celular || null, companyId]
    );

    return res.status(201).json({
      message: 'Usuário criado com sucesso',
      usuario: {
        id: result.lastID,
        nome,
        email,
        role,
        celular,
        senha_temporaria: senhaFinal
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao criar usuário'
    });
  }
};

/**
 * Atualizar dados do usuário
 * PUT /api/admin/usuarios/:usuarioId
 */
export const atualizarUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { nome, email, role, celular } = req.body;

    // Validações
    if (!nome || !email || !role) {
      return res.status(400).json({
        error: 'Nome, email e role são obrigatórios'
      });
    }

    if (!['admin', 'gerente', 'vendedor'].includes(role)) {
      return res.status(400).json({
        error: 'Role inválida. Use: admin, gerente ou vendedor'
      });
    }

    // Verificar se usuário existe
    const { rows: existingUser } = await pool.query(
      'SELECT id FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    if (existingUser.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado'
      });
    }

    // Verificar se email já está em uso por outro usuário
    const { rows: emailInUse } = await pool.query(
      'SELECT id FROM usuarios WHERE email = ? AND id != ?',
      [email, usuarioId]
    );

    if (emailInUse.length > 0) {
      return res.status(400).json({
        error: 'Email já cadastrado para outro usuário'
      });
    }

    // Atualizar usuário
    await pool.run(
      'UPDATE usuarios SET nome = ?, email = ?, role = ?, celular = ? WHERE id = ?',
      [nome, email, role, celular || null, usuarioId]
    );

    return res.json({
      message: 'Usuário atualizado com sucesso'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao atualizar usuário'
    });
  }
};

/**
 * Excluir usuário
 * DELETE /api/admin/usuarios/:usuarioId
 */
export const excluirUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;

    // Verificar se usuário existe
    const { rows: existingUser } = await pool.query(
      'SELECT id, email FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    if (existingUser.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado'
      });
    }

    // Excluir usuário
    await pool.run('DELETE FROM usuarios WHERE id = ?', [usuarioId]);

    return res.json({
      message: 'Usuário excluído com sucesso'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao excluir usuário'
    });
  }
};

/**
 * Resetar senha do usuário
 * POST /api/admin/usuarios/:usuarioId/resetar-senha
 */
export const resetarSenhaUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { senha } = req.body;

    // Gerar senha padrão se não fornecida
    const novaSenha = senha || 'CFLOW@2024';

    if (novaSenha.length < 8) {
      return res.status(400).json({
        error: 'A senha deve ter no mínimo 8 caracteres'
      });
    }

    // Verificar se usuário existe
    const { rows: existingUser } = await pool.query(
      'SELECT id, email FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    if (existingUser.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado'
      });
    }

    // Gerar hash da nova senha
    const senhaHash = bcrypt.hashSync(novaSenha, 10);

    // Atualizar senha
    await pool.run(
      'UPDATE usuarios SET senha_hash = ? WHERE id = ?',
      [senhaHash, usuarioId]
    );

    return res.json({
      message: 'Senha resetada com sucesso',
      senha_temporaria: novaSenha
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao resetar senha'
    });
  }
};

/**
 * Alterar senha do usuário autenticado (super admin)
 * PUT /api/admin/alterar-senha
 */
export const alterarSenha = async (req, res) => {
  try {
    const { senha_atual, senha_nova } = req.body;
    const usuarioId = req.usuario.id;

    // Validações
    if (!senha_atual || !senha_nova) {
      return res.status(400).json({
        error: 'Senha atual e nova senha são obrigatórias'
      });
    }

    if (senha_nova.length < 8) {
      return res.status(400).json({
        error: 'A nova senha deve ter no mínimo 8 caracteres'
      });
    }

    // Buscar usuário no banco
    const { rows } = await pool.query(
      'SELECT id, senha_hash FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado'
      });
    }

    const usuario = rows[0];

    // Verificar se a senha atual está correta
    const senhaValida = bcrypt.compareSync(senha_atual, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({
        error: 'Senha atual incorreta'
      });
    }

    // Gerar hash da nova senha
    const novaSenhaHash = bcrypt.hashSync(senha_nova, 10);

    // Atualizar senha no banco
    await pool.run(
      'UPDATE usuarios SET senha_hash = ? WHERE id = ?',
      [novaSenhaHash, usuarioId]
    );

    return res.json({
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao alterar senha'
    });
  }
};
