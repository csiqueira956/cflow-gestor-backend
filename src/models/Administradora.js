import pool from '../config/database.js';

class Administradora {
  // Criar nova administradora
  static async create(administradoraData) {
    const {
      nome,
      nome_contato,
      celular,
      comissionamento_recebido,
      comissionamento_pago,
      company_id
    } = administradoraData;

    const query = `
      INSERT INTO administradoras (
        nome,
        nome_contato,
        celular,
        comissionamento_recebido,
        comissionamento_pago,
        company_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      nome,
      nome_contato,
      celular,
      comissionamento_recebido,
      comissionamento_pago,
      company_id
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Listar todas as administradoras (filtrado por company_id)
  static async list(company_id) {
    const query = `
      SELECT * FROM administradoras
      WHERE company_id = $1
      ORDER BY nome ASC
    `;

    const result = await pool.query(query, [company_id]);
    return result.rows;
  }

  // Buscar administradora por ID (filtrado por company_id para segurança)
  static async findById(id, company_id) {
    const query = `
      SELECT * FROM administradoras
      WHERE id = $1 AND company_id = $2
    `;

    const result = await pool.query(query, [id, company_id]);
    return result.rows[0];
  }

  // Atualizar administradora (filtrado por company_id para segurança)
  static async update(id, administradoraData, company_id) {
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
      WHERE id = $6 AND company_id = $7
      RETURNING *
    `;

    const values = [
      nome,
      nome_contato,
      celular,
      comissionamento_recebido,
      comissionamento_pago,
      id,
      company_id
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Deletar administradora (filtrado por company_id para segurança)
  static async delete(id, company_id) {
    const query = `
      DELETE FROM administradoras
      WHERE id = $1 AND company_id = $2
      RETURNING id
    `;

    const result = await pool.query(query, [id, company_id]);
    return result.rows[0];
  }
}

export default Administradora;
