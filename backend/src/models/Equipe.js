import pool from '../config/database.js';

class Equipe {
  // Criar nova equipe
  static async create(equipeData) {
    const { nome, descricao } = equipeData;

    const query = `
      INSERT INTO equipes (nome, descricao)
      VALUES ($1, $2)
      RETURNING *
    `;

    const values = [nome, descricao];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Listar todas as equipes
  static async list() {
    const query = `
      SELECT * FROM equipes
      ORDER BY nome ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  // Buscar equipe por ID
  static async findById(id) {
    const query = `
      SELECT * FROM equipes
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Buscar equipe por nome
  static async findByNome(nome) {
    const query = `
      SELECT * FROM equipes
      WHERE nome = $1
    `;

    const result = await pool.query(query, [nome]);
    return result.rows[0];
  }

  // Atualizar equipe
  static async update(id, equipeData) {
    const { nome, descricao } = equipeData;

    const query = `
      UPDATE equipes
      SET nome = $1, descricao = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const values = [nome, descricao, id];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Deletar equipe
  static async delete(id) {
    const query = `
      DELETE FROM equipes
      WHERE id = $1
      RETURNING id
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

export default Equipe;
