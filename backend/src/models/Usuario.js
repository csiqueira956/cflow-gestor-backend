import crypto from 'crypto';
import pool from '../config/database.js';

class Usuario {
  // Criar novo usuário
  static async create({ nome, email, senha_hash, role = 'vendedor', tipo_usuario, percentual_comissao, celular, equipe_id }) {
    // Gerar link público único se for vendedor
    const link_publico = role === 'vendedor' ? crypto.randomBytes(16).toString('hex') : null;

    const query = `
      INSERT INTO usuarios (nome, email, senha_hash, role, tipo_usuario, percentual_comissao, celular, equipe_id, link_publico)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, nome, email, role, tipo_usuario, percentual_comissao, celular, equipe_id, link_publico, created_at
    `;
    const values = [nome, email, senha_hash, role, tipo_usuario, percentual_comissao, celular, equipe_id, link_publico];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Buscar usuário por email
  static async findByEmail(email) {
    const query = 'SELECT * FROM usuarios WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  // Buscar usuário por ID
  static async findById(id) {
    const query = `
      SELECT u.id, u.nome, u.email, u.role, u.link_publico, u.tipo_usuario,
             u.percentual_comissao, u.celular, u.equipe_id, u.foto_perfil, u.created_at,
             e.nome as equipe_nome
      FROM usuarios u
      LEFT JOIN equipes e ON u.equipe_id = e.id
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Buscar usuário por link público
  static async findByLinkPublico(link_publico) {
    const query = `
      SELECT u.id, u.nome, u.email, u.role, u.link_publico, u.tipo_usuario,
             u.percentual_comissao, u.celular, u.equipe_id, u.created_at,
             e.nome as equipe_nome
      FROM usuarios u
      LEFT JOIN equipes e ON u.equipe_id = e.id
      WHERE u.link_publico = $1 AND u.role = 'vendedor'
    `;
    const result = await pool.query(query, [link_publico]);
    return result.rows[0];
  }

  // Listar todos os vendedores
  static async listVendedores() {
    const query = `
      SELECT u.id, u.nome, u.email, u.role, u.tipo_usuario, u.percentual_comissao, u.celular, u.equipe, u.equipe_id,
             e.nome as equipe_nome, u.created_at
      FROM usuarios u
      LEFT JOIN equipes e ON u.equipe_id = e.id
      WHERE u.role = 'vendedor'
      ORDER BY u.nome
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Listar todos os gerentes
  static async listGerentes() {
    const query = `
      SELECT u.id, u.nome, u.email, u.role, u.tipo_usuario, u.percentual_comissao, u.celular, u.equipe, u.equipe_id,
             e.nome as equipe_nome, u.created_at
      FROM usuarios u
      LEFT JOIN equipes e ON u.equipe_id = e.id
      WHERE u.role = 'gerente'
      ORDER BY u.nome
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Listar vendedores e gerentes (não-admins)
  static async listUsuarios() {
    const query = `
      SELECT u.id, u.nome, u.email, u.role, u.tipo_usuario, u.percentual_comissao, u.celular, u.equipe, u.equipe_id,
             e.nome as equipe_nome, u.created_at
      FROM usuarios u
      LEFT JOIN equipes e ON u.equipe_id = e.id
      WHERE u.role IN ('vendedor', 'gerente')
      ORDER BY u.role DESC, u.nome
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Buscar vendedores por equipe_id
  static async findVendedoresByEquipeId(equipe_id) {
    const query = `
      SELECT id, nome, email, role, tipo_usuario, percentual_comissao, celular, equipe, equipe_id, created_at
      FROM usuarios
      WHERE equipe_id = $1 AND role = 'vendedor'
      ORDER BY nome
    `;
    const result = await pool.query(query, [equipe_id]);
    return result.rows;
  }

  // Atualizar usuário
  static async update(id, { nome, email, role, tipo_usuario, percentual_comissao, celular, equipe_id, senha_hash }) {
    console.log('🔧 Usuario.update - Dados recebidos:', { id, nome, email, role, tipo_usuario, percentual_comissao, celular, equipe_id, temSenha: !!senha_hash });

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

    const query = `
      UPDATE usuarios
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, nome, email, role, tipo_usuario, percentual_comissao, celular, equipe_id, created_at
    `;

    console.log('📝 SQL Query:', query);
    console.log('📝 SQL Values:', values);

    const result = await pool.query(query, values);

    console.log('✅ Usuario atualizado no banco:', result.rows[0]);

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
  static async delete(id) {
    const query = 'DELETE FROM usuarios WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

export default Usuario;
