import pool from '../config/database.js';

class Equipe {
  // Criar nova equipe
  static async create(equipeData) {
    const { nome, descricao, company_id } = equipeData;

    const query = `
      INSERT INTO equipes (nome, descricao, company_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [nome, descricao, company_id];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Listar todas as equipes (filtrado por company_id)
  static async list(company_id) {
    const query = `
      SELECT * FROM equipes
      WHERE company_id = $1
      ORDER BY nome ASC
    `;

    const result = await pool.query(query, [company_id]);
    return result.rows;
  }

  // Buscar equipe por ID (filtrado por company_id para segurança)
  static async findById(id, company_id) {
    const query = `
      SELECT * FROM equipes
      WHERE id = $1 AND company_id = $2
    `;

    const result = await pool.query(query, [id, company_id]);
    return result.rows[0];
  }

  // Buscar equipe por nome (filtrado por company_id)
  static async findByNome(nome, company_id) {
    const query = `
      SELECT * FROM equipes
      WHERE nome = $1 AND company_id = $2
    `;

    const result = await pool.query(query, [nome, company_id]);
    return result.rows[0];
  }

  // Atualizar equipe (filtrado por company_id para segurança)
  static async update(id, equipeData, company_id) {
    const { nome, descricao } = equipeData;

    const query = `
      UPDATE equipes
      SET nome = $1, descricao = $2, updated_at = NOW()
      WHERE id = $3 AND company_id = $4
      RETURNING *
    `;

    const values = [nome, descricao, id, company_id];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Deletar equipe (filtrado por company_id para segurança)
  static async delete(id, company_id) {
    const query = `
      DELETE FROM equipes
      WHERE id = $1 AND company_id = $2
      RETURNING id
    `;

    const result = await pool.query(query, [id, company_id]);
    return result.rows[0];
  }
}

export default Equipe;
