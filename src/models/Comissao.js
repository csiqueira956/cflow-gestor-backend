import pool from '../config/database.js';

class Comissao {
  // Criar nova comissão
  static async create(comissaoData) {
    const {
      cliente_id,
      vendedor_id,
      valor_venda,
      percentual_comissao,
      valor_comissao,
      numero_parcelas = 1,
      status = 'pendente',
      company_id
    } = comissaoData;

    const query = `
      INSERT INTO comissoes (
        cliente_id, vendedor_id, valor_venda, percentual_comissao,
        valor_comissao, numero_parcelas, status, company_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      cliente_id,
      vendedor_id,
      valor_venda,
      percentual_comissao,
      valor_comissao,
      numero_parcelas,
      status,
      company_id
    ];

    const result = await pool.query(query, values);

    // Buscar a comissão recém-criada com joins
    return await this.findById(result.rows[0].id, company_id);
  }

  // Listar comissões (filtrado por company_id)
  static async list(company_id, filters = {}) {
    try {
      let query = `
        SELECT
          c.*,
          cl.nome as cliente_nome,
          u.nome as vendedor_nome
        FROM comissoes c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        LEFT JOIN usuarios u ON c.vendedor_id = u.id
        WHERE c.company_id = $1
      `;

      const values = [company_id];
      let paramCount = 2;

      if (filters.vendedor_id) {
        query += ` AND c.vendedor_id = $${paramCount}`;
        values.push(filters.vendedor_id);
        paramCount++;
      }

      if (filters.status) {
        query += ` AND c.status = $${paramCount}`;
        values.push(filters.status);
        paramCount++;
      }

      query += ' ORDER BY c.created_at DESC';

      const result = await pool.query(query, values);
      const comissoes = result.rows;

      // Buscar parcelas para cada comissão
      for (const comissao of comissoes) {
        const parcelasResult = await pool.query(
          'SELECT * FROM parcelas_comissao WHERE comissao_id = $1 ORDER BY numero_parcela ASC',
          [comissao.id]
        );
        comissao.parcelas = parcelasResult.rows;
      }

      return comissoes;
    } catch (error) {
      console.error('❌ ERRO em Comissao.list():', error);
      throw error;
    }
  }

  // Buscar comissão por ID com suas parcelas (filtrado por company_id)
  static async findById(id, company_id) {
    const comissaoQuery = `
      SELECT
        c.*,
        cl.nome as cliente_nome,
        cl.cpf as cliente_cpf,
        cl.telefone_celular as cliente_telefone,
        u.nome as vendedor_nome,
        u.email as vendedor_email
      FROM comissoes c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN usuarios u ON c.vendedor_id = u.id
      WHERE c.id = $1 AND c.company_id = $2
    `;

    const parcelasQuery = `
      SELECT * FROM parcelas_comissao
      WHERE comissao_id = $1
      ORDER BY numero_parcela ASC
    `;

    const [comissaoResult, parcelasResult] = await Promise.all([
      pool.query(comissaoQuery, [id, company_id]),
      pool.query(parcelasQuery, [id])
    ]);

    if (comissaoResult.rows.length === 0) {
      return null;
    }

    const comissao = comissaoResult.rows[0];
    comissao.parcelas = parcelasResult.rows;

    return comissao;
  }

  // Atualizar comissão (filtrado por company_id)
  static async update(id, comissaoData, company_id) {
    const {
      numero_parcelas,
      status
    } = comissaoData;

    const query = `
      UPDATE comissoes
      SET numero_parcelas = $1, status = $2, updated_at = NOW()
      WHERE id = $3 AND company_id = $4
      RETURNING *
    `;

    const values = [numero_parcelas, status, id, company_id];

    await pool.query(query, values);

    // Buscar comissão atualizada com joins
    return await this.findById(id, company_id);
  }

  // Deletar comissão (filtrado por company_id)
  static async delete(id, company_id) {
    const query = 'DELETE FROM comissoes WHERE id = $1 AND company_id = $2 RETURNING id';
    const result = await pool.query(query, [id, company_id]);
    return result.rows[0] || { id };
  }

  // Criar parcela de comissão
  static async createParcela(parcelaData) {
    const {
      comissao_id,
      numero_parcela,
      valor_parcela,
      data_vencimento,
      data_pagamento,
      status = 'pendente',
      observacao
    } = parcelaData;

    const query = `
      INSERT INTO parcelas_comissao (
        comissao_id, numero_parcela, valor_parcela,
        data_vencimento, data_pagamento, status, observacao
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      comissao_id,
      numero_parcela,
      valor_parcela,
      data_vencimento,
      data_pagamento,
      status,
      observacao
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Atualizar parcela
  static async updateParcela(id, parcelaData) {
    const {
      valor_parcela,
      data_vencimento,
      data_pagamento,
      status,
      observacao
    } = parcelaData;

    const query = `
      UPDATE parcelas_comissao
      SET valor_parcela = $1, data_vencimento = $2, data_pagamento = $3,
          status = $4, observacao = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;

    const values = [
      valor_parcela,
      data_vencimento,
      data_pagamento,
      status,
      observacao,
      id
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Deletar parcela
  static async deleteParcela(id) {
    const query = 'DELETE FROM parcelas_comissao WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0] || { id };
  }

  // Buscar parcelas por comissão
  static async findParcelasByComissaoId(comissaoId) {
    const query = `
      SELECT * FROM parcelas_comissao
      WHERE comissao_id = $1
      ORDER BY numero_parcela ASC
    `;

    const result = await pool.query(query, [comissaoId]);
    return result.rows;
  }

  // Estatísticas de comissões por vendedor (filtrado por company_id)
  static async estatisticasPorVendedor(company_id) {
    const query = `
      SELECT
        u.id as vendedor_id,
        u.nome as vendedor_nome,
        COUNT(c.id) as total_comissoes,
        COALESCE(SUM(c.valor_comissao), 0) as total_valor,
        COALESCE(SUM(CASE WHEN c.status = 'pago' THEN c.valor_comissao ELSE 0 END), 0) as total_pago,
        COALESCE(SUM(CASE WHEN c.status IN ('pendente', 'em_pagamento') THEN c.valor_comissao ELSE 0 END), 0) as total_pendente
      FROM usuarios u
      LEFT JOIN comissoes c ON u.id = c.vendedor_id AND c.company_id = $1
      WHERE u.role = 'vendedor' AND u.company_id = $2
      GROUP BY u.id, u.nome
      ORDER BY total_valor DESC
    `;

    const result = await pool.query(query, [company_id, company_id]);
    return result.rows;
  }
}

export default Comissao;
