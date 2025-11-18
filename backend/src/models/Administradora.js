import pool from '../config/database.js';

class Administradora {
  // Criar nova administradora
  static async create(administradoraData) {
    const {
      nome,
      nome_contato,
      celular,
      comissionamento_recebido,
      comissionamento_pago
    } = administradoraData;

    const query = `
      INSERT INTO administradoras (
        nome,
        nome_contato,
        celular,
        comissionamento_recebido,
        comissionamento_pago
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      nome,
      nome_contato,
      celular,
      comissionamento_recebido,
      comissionamento_pago
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Listar todas as administradoras
  static async list() {
    const query = `
      SELECT * FROM administradoras
      ORDER BY nome ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  // Buscar administradora por ID
  static async findById(id) {
    const query = `
      SELECT * FROM administradoras
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Atualizar administradora
  static async update(id, administradoraData) {
    const {
      nome,
      nome_contato,
      celular,
      comissionamento_recebido,
      comissionamento_pago
    } = administradoraData;

    const query = `
      UPDATE administradoras
      SET nome = $1,
          nome_contato = $2,
          celular = $3,
          comissionamento_recebido = $4,
          comissionamento_pago = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;

    const values = [
      nome,
      nome_contato,
      celular,
      comissionamento_recebido,
      comissionamento_pago,
      id
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Deletar administradora
  static async delete(id) {
    const query = `
      DELETE FROM administradoras
      WHERE id = $1
      RETURNING id
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

export default Administradora;
