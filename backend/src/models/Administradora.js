import pool from '../config/database.js';

class Administradora {
  // Criar nova administradora
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async create(administradoraData, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para criar administradora');
    }

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
      companyId
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Listar todas as administradoras
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async list(companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para listar administradoras');
    }

    const query = `
      SELECT * FROM administradoras
      WHERE company_id = $1
      ORDER BY nome ASC
    `;

    const result = await pool.query(query, [companyId]);
    return result.rows;
  }

  // Buscar administradora por ID
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async findById(id, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para buscar administradora');
    }

    const query = `
      SELECT * FROM administradoras
      WHERE id = $1 AND company_id = $2
    `;

    const result = await pool.query(query, [id, companyId]);
    return result.rows[0];
  }

  // Atualizar administradora
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async update(id, administradoraData, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para atualizar administradora');
    }

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
      companyId
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Deletar administradora
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async delete(id, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para deletar administradora');
    }

    const query = `
      DELETE FROM administradoras
      WHERE id = $1 AND company_id = $2
      RETURNING id
    `;

    const result = await pool.query(query, [id, companyId]);
    return result.rows[0];
  }
}

export default Administradora;
