import crypto from 'crypto';
import pool from '../config/database.js';

class Usuario {
  // Criar novo usuário
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async create({ nome, email, senha_hash, role = 'vendedor', tipo_usuario, percentual_comissao, celular, equipe_id }, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para criar usuário');
    }

    // Gerar link público único se for vendedor
    const link_publico = role === 'vendedor' ? crypto.randomBytes(16).toString('hex') : null;

    const query = `
      INSERT INTO usuarios (nome, email, senha_hash, role, tipo_usuario, percentual_comissao, celular, equipe_id, link_publico, company_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, nome, email, role, tipo_usuario, percentual_comissao, celular, equipe_id, link_publico, company_id, created_at
    `;
    const values = [nome, email, senha_hash, role, tipo_usuario, percentual_comissao, celular, equipe_id, link_publico, companyId];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Buscar usuário por email (usado no login - sem filtro de company)
  static async findByEmail(email) {
    const query = 'SELECT * FROM usuarios WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  // Buscar usuário por ID
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async findById(id, companyId = null) {
    let query = `
      SELECT u.id, u.nome, u.email, u.role, u.link_publico, u.tipo_usuario,
             u.percentual_comissao, u.celular, u.equipe_id, u.foto_perfil, u.company_id, u.created_at,
             e.nome as equipe_nome
      FROM usuarios u
      LEFT JOIN equipes e ON u.equipe_id = e.id
      WHERE u.id = $1
    `;
    const params = [id];

    if (companyId) {
      query += ' AND u.company_id = $2';
      params.push(companyId);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  // Buscar usuário por link público (usado para cadastro público - sem filtro de company)
  static async findByLinkPublico(link_publico) {
    const query = `
      SELECT u.id, u.nome, u.email, u.role, u.link_publico, u.tipo_usuario,
             u.percentual_comissao, u.celular, u.equipe_id, u.company_id, u.created_at,
             e.nome as equipe_nome
      FROM usuarios u
      LEFT JOIN equipes e ON u.equipe_id = e.id
      WHERE u.link_publico = $1 AND u.role = 'vendedor'
    `;
    const result = await pool.query(query, [link_publico]);
    return result.rows[0];
  }

  // Listar todos os vendedores
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async listVendedores(companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para listar vendedores');
    }

    const query = `
      SELECT u.id, u.nome, u.email, u.role, u.tipo_usuario, u.percentual_comissao, u.celular, u.equipe, u.equipe_id,
             e.nome as equipe_nome, u.created_at
      FROM usuarios u
      LEFT JOIN equipes e ON u.equipe_id = e.id
      WHERE u.role = 'vendedor' AND u.company_id = $1
      ORDER BY u.nome
    `;
    const result = await pool.query(query, [companyId]);
    return result.rows;
  }

  // Listar todos os gerentes
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async listGerentes(companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para listar gerentes');
    }

    const query = `
      SELECT u.id, u.nome, u.email, u.role, u.tipo_usuario, u.percentual_comissao, u.celular, u.equipe, u.equipe_id,
             e.nome as equipe_nome, u.created_at
      FROM usuarios u
      LEFT JOIN equipes e ON u.equipe_id = e.id
      WHERE u.role = 'gerente' AND u.company_id = $1
      ORDER BY u.nome
    `;
    const result = await pool.query(query, [companyId]);
    return result.rows;
  }

  // Listar vendedores e gerentes (não-admins)
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async listUsuarios(companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para listar usuários');
    }

    const query = `
      SELECT u.id, u.nome, u.email, u.role, u.tipo_usuario, u.percentual_comissao, u.celular, u.equipe, u.equipe_id,
             e.nome as equipe_nome, u.created_at
      FROM usuarios u
      LEFT JOIN equipes e ON u.equipe_id = e.id
      WHERE u.role IN ('vendedor', 'gerente') AND u.company_id = $1
      ORDER BY u.role DESC, u.nome
    `;
    const result = await pool.query(query, [companyId]);
    return result.rows;
  }

  // Listar TODOS os vendedores (apenas para super_admin)
  static async listAllVendedores() {
    const query = `
      SELECT u.id, u.nome, u.email, u.role, u.tipo_usuario, u.percentual_comissao, u.celular, u.equipe, u.equipe_id,
             e.nome as equipe_nome, c.nome as empresa_nome, u.created_at
      FROM usuarios u
      LEFT JOIN equipes e ON u.equipe_id = e.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.role = 'vendedor'
      ORDER BY c.nome, u.nome
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Listar TODOS os gerentes (apenas para super_admin)
  static async listAllGerentes() {
    const query = `
      SELECT u.id, u.nome, u.email, u.role, u.tipo_usuario, u.percentual_comissao, u.celular, u.equipe, u.equipe_id,
             e.nome as equipe_nome, c.nome as empresa_nome, u.created_at
      FROM usuarios u
      LEFT JOIN equipes e ON u.equipe_id = e.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.role = 'gerente'
      ORDER BY c.nome, u.nome
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Listar TODOS os usuários não-admin (apenas para super_admin)
  static async listAllUsuarios() {
    const query = `
      SELECT u.id, u.nome, u.email, u.role, u.tipo_usuario, u.percentual_comissao, u.celular, u.equipe, u.equipe_id,
             e.nome as equipe_nome, c.nome as empresa_nome, u.created_at
      FROM usuarios u
      LEFT JOIN equipes e ON u.equipe_id = e.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.role IN ('vendedor', 'gerente')
      ORDER BY c.nome, u.role DESC, u.nome
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Buscar vendedores por equipe_id
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async findVendedoresByEquipeId(equipe_id, companyId = null) {
    let query = `
      SELECT id, nome, email, role, tipo_usuario, percentual_comissao, celular, equipe, equipe_id, created_at
      FROM usuarios
      WHERE equipe_id = $1 AND role = 'vendedor'
    `;
    const params = [equipe_id];

    if (companyId) {
      query += ' AND company_id = $2';
      params.push(companyId);
    }

    query += ' ORDER BY nome';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Atualizar usuário
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async update(id, { nome, email, role, tipo_usuario, percentual_comissao, celular, equipe_id, senha_hash }, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para atualizar usuário');
    }

    // Preparar query dinamicamente baseado nos campos fornecidos
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (nome !== undefined) {
      updates.push(`nome = $${paramCount++}`);
      values.push(nome);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (tipo_usuario !== undefined) {
      updates.push(`tipo_usuario = $${paramCount++}`);
      values.push(tipo_usuario);
    }
    if (percentual_comissao !== undefined) {
      updates.push(`percentual_comissao = $${paramCount++}`);
      values.push(percentual_comissao);
    }
    if (celular !== undefined) {
      updates.push(`celular = $${paramCount++}`);
      values.push(celular);
    }
    // IMPORTANTE: Usar APENAS equipe_id, ignorar equipe (coluna legado)
    if (equipe_id !== undefined) {
      updates.push(`equipe_id = $${paramCount++}`);
      values.push(equipe_id);
    }
    if (senha_hash !== undefined) {
      updates.push(`senha_hash = $${paramCount++}`);
      values.push(senha_hash);
    }

    values.push(id);
    values.push(companyId);

    const query = `
      UPDATE usuarios
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
      RETURNING id, nome, email, role, tipo_usuario, percentual_comissao, celular, equipe_id, created_at
    `;

    const result = await pool.query(query, values);

    return result.rows[0];
  }

  // Atualizar perfil do usuário (não atualiza equipe_id - apenas admin pode alterar)
  static async updateProfile(id, { nome, celular, foto_perfil }) {
    const query = `
      UPDATE usuarios
      SET nome = $1, celular = $2, foto_perfil = $3
      WHERE id = $4
    `;
    const values = [nome, celular, foto_perfil, id];
    await pool.query(query, values);

    // Buscar o registro atualizado com JOIN para pegar o nome da equipe
    const selectQuery = `
      SELECT u.id, u.nome, u.email, u.role, u.link_publico, u.tipo_usuario,
             u.percentual_comissao, u.celular, u.equipe_id, u.foto_perfil, u.created_at,
             e.nome as equipe_nome
      FROM usuarios u
      LEFT JOIN equipes e ON u.equipe_id = e.id
      WHERE u.id = $1
    `;
    const result = await pool.query(selectQuery, [id]);
    return result.rows[0];
  }

  // Deletar usuário
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async delete(id, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para deletar usuário');
    }

    const query = 'DELETE FROM usuarios WHERE id = $1 AND company_id = $2 RETURNING id';
    const result = await pool.query(query, [id, companyId]);
    return result.rows[0];
  }
}

export default Usuario;
