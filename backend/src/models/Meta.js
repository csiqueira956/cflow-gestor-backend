import pool from '../config/database.js';

class Meta {
  // Criar nova meta
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async create(metaData, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para criar meta');
    }

    const {
      titulo,
      descricao,
      tipo,
      vendedor_id,
      equipe_id,
      valor_meta,
      mes_referencia,
      status = 'ativa'
    } = metaData;

    const query = `
      INSERT INTO metas (
        titulo,
        descricao,
        tipo,
        vendedor_id,
        equipe_id,
        valor_meta,
        mes_referencia,
        status,
        company_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      titulo,
      descricao,
      tipo,
      vendedor_id || null,
      equipe_id || null,
      valor_meta,
      mes_referencia,
      status,
      companyId
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Listar todas as metas
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async list(companyId, filtros = {}) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para listar metas');
    }

    let query = `
      SELECT
        m.*,
        u.nome as vendedor_nome,
        e.nome as equipe_nome
      FROM metas m
      LEFT JOIN usuarios u ON m.vendedor_id = u.id
      LEFT JOIN equipes e ON m.equipe_id = e.id
      WHERE m.company_id = $1
    `;

    const values = [companyId];
    let paramCount = 2;

    if (filtros.tipo) {
      query += ` AND m.tipo = $${paramCount}`;
      values.push(filtros.tipo);
      paramCount++;
    }

    if (filtros.vendedor_id) {
      query += ` AND m.vendedor_id = $${paramCount}`;
      values.push(filtros.vendedor_id);
      paramCount++;
    }

    if (filtros.equipe_id) {
      query += ` AND m.equipe_id = $${paramCount}`;
      values.push(filtros.equipe_id);
      paramCount++;
    }

    if (filtros.mes_referencia) {
      query += ` AND m.mes_referencia = $${paramCount}`;
      values.push(filtros.mes_referencia);
      paramCount++;
    }

    if (filtros.status) {
      query += ` AND m.status = $${paramCount}`;
      values.push(filtros.status);
      paramCount++;
    }

    query += ` ORDER BY m.mes_referencia DESC, m.created_at DESC`;

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Buscar meta por ID
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async findById(id, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para buscar meta');
    }

    const query = `
      SELECT
        m.*,
        u.nome as vendedor_nome,
        e.nome as equipe_nome
      FROM metas m
      LEFT JOIN usuarios u ON m.vendedor_id = u.id
      LEFT JOIN equipes e ON m.equipe_id = e.id
      WHERE m.id = $1 AND m.company_id = $2
    `;

    const result = await pool.query(query, [id, companyId]);
    return result.rows[0];
  }

  // Atualizar meta
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async update(id, metaData, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para atualizar meta');
    }

    const {
      titulo,
      descricao,
      tipo,
      vendedor_id,
      equipe_id,
      valor_meta,
      mes_referencia,
      status
    } = metaData;

    const query = `
      UPDATE metas
      SET titulo = $1,
          descricao = $2,
          tipo = $3,
          vendedor_id = $4,
          equipe_id = $5,
          valor_meta = $6,
          mes_referencia = $7,
          status = $8,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND company_id = $10
      RETURNING *
    `;

    const values = [
      titulo,
      descricao,
      tipo,
      vendedor_id || null,
      equipe_id || null,
      valor_meta,
      mes_referencia,
      status,
      id,
      companyId
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Deletar meta
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async delete(id, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para deletar meta');
    }

    const query = `
      DELETE FROM metas
      WHERE id = $1 AND company_id = $2
      RETURNING id
    `;

    const result = await pool.query(query, [id, companyId]);
    return result.rows[0];
  }
}

export default Meta;
