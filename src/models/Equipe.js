import pool from '../config/database.js';

class Equipe {
  // Criar nova equipe
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async create(equipeData, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para criar equipe');
    }

    const { nome, descricao } = equipeData;

    const query = `
      INSERT INTO equipes (nome, descricao, company_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [nome, descricao, companyId];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Listar todas as equipes
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async list(companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para listar equipes');
    }

    const query = `
      SELECT * FROM equipes
      WHERE company_id = $1
      ORDER BY nome ASC
    `;

    const result = await pool.query(query, [companyId]);
    return result.rows;
  }

  // Listar TODAS as equipes (apenas para super_admin)
  static async listAll() {
    const query = `
      SELECT e.*, c.nome as empresa_nome
      FROM equipes e
      LEFT JOIN companies c ON e.company_id = c.id
      ORDER BY c.nome ASC, e.nome ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  // Buscar equipe por ID
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async findById(id, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para buscar equipe');
    }

    const query = `
      SELECT * FROM equipes
      WHERE id = $1 AND company_id = $2
    `;

    const result = await pool.query(query, [id, companyId]);
    return result.rows[0];
  }

  // Buscar equipe por nome
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async findByNome(nome, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para buscar equipe');
    }

    const query = `
      SELECT * FROM equipes
      WHERE nome = $1 AND company_id = $2
    `;

    const result = await pool.query(query, [nome, companyId]);
    return result.rows[0];
  }

  // Atualizar equipe
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async update(id, equipeData, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para atualizar equipe');
    }

    const { nome, descricao } = equipeData;

    const query = `
      UPDATE equipes
      SET nome = $1, descricao = $2, updated_at = NOW()
      WHERE id = $3 AND company_id = $4
      RETURNING *
    `;

    const values = [nome, descricao, id, companyId];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Deletar equipe
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async delete(id, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para deletar equipe');
    }

    const query = `
      DELETE FROM equipes
      WHERE id = $1 AND company_id = $2
      RETURNING id
    `;

    const result = await pool.query(query, [id, companyId]);
    return result.rows[0];
  }
}

export default Equipe;
