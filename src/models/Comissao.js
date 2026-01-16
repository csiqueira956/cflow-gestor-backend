import pool from '../config/database.js';

class Comissao {
  // Criar nova comissão
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async create(comissaoData, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para criar comissão');
    }

    const {
      cliente_id,
      vendedor_id,
      valor_venda,
      percentual_comissao,
      valor_comissao,
      numero_parcelas = 1,
      status = 'pendente'
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
      companyId
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Listar comissões (com filtros opcionais)
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async list(companyId, filters = {}) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para listar comissões');
    }

    console.log('🔧 Comissao.list() INICIADO com filtros:', filters);

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

      const values = [companyId];
      let paramCount = 2;

      if (filters.vendedor_id) {
        query += ` AND c.vendedor_id = $${paramCount}`;
        values.push(filters.vendedor_id);
        paramCount++;
      }

      // Filtro por equipe (para gerentes verem toda sua equipe)
      if (filters.equipe_id) {
        query += ` AND u.equipe_id = $${paramCount}`;
        values.push(filters.equipe_id);
        paramCount++;
      }

      if (filters.status) {
        query += ` AND c.status = $${paramCount}`;
        values.push(filters.status);
        paramCount++;
      }

      query += ' ORDER BY c.created_at DESC';

      console.log('🔧 Executando query:', query);
      console.log('🔧 Com valores:', values);

      const result = await pool.query(query, values);
      const comissoes = result.rows;

      console.log('🔧 Query executada com sucesso. Resultados:', comissoes ? comissoes.length : 0);

      // Buscar parcelas para cada comissão
      for (const comissao of comissoes) {
        const parcelasResult = await pool.query(
          'SELECT * FROM parcelas_comissao WHERE comissao_id = $1 ORDER BY numero_parcela ASC',
          [comissao.id]
        );
        comissao.parcelas = parcelasResult.rows;
      }

      console.log('🔧 Parcelas adicionadas às comissões');

      return comissoes;
    } catch (error) {
      console.error('❌ ERRO em Comissao.list():', error);
      throw error;
    }
  }

  // Buscar comissão por ID com suas parcelas
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async findById(id, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para buscar comissão');
    }

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
      pool.query(comissaoQuery, [id, companyId]),
      pool.query(parcelasQuery, [id])
    ]);

    const comissao = comissaoResult.rows[0];

    if (!comissao) {
      return null;
    }

    comissao.parcelas = parcelasResult.rows;

    return comissao;
  }

  // Atualizar comissão
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async update(id, comissaoData, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para atualizar comissão');
    }

    const {
      numero_parcelas,
      status
    } = comissaoData;

    const query = `
      UPDATE comissoes
      SET numero_parcelas = $1, status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND company_id = $4
      RETURNING *
    `;

    const values = [numero_parcelas, status, id, companyId];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Deletar comissão
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async delete(id, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para deletar comissão');
    }

    // Primeiro deletar as parcelas associadas
    await pool.query('DELETE FROM parcelas_comissao WHERE comissao_id = $1', [id]);

    const query = `
      DELETE FROM comissoes
      WHERE id = $1 AND company_id = $2
      RETURNING id
    `;
    const result = await pool.query(query, [id, companyId]);
    return result.rows[0];
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
          status = $4, observacao = $5, updated_at = CURRENT_TIMESTAMP
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
    return result.rows[0];
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

  // Buscar parcela por ID
  static async findParcelaById(id) {
    const query = 'SELECT * FROM parcelas_comissao WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Estatísticas de comissões por vendedor
  // IMPORTANTE: company_id é obrigatório para isolamento multi-tenant
  static async estatisticasPorVendedor(companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para buscar estatísticas');
    }

    const query = `
      SELECT
        u.id as vendedor_id,
        u.nome as vendedor_nome,
        COUNT(c.id) as total_comissoes,
        COALESCE(SUM(c.valor_comissao), 0) as total_valor,
        COALESCE(SUM(CASE WHEN c.status = 'pago' THEN c.valor_comissao ELSE 0 END), 0) as total_pago,
        COALESCE(SUM(CASE WHEN c.status = 'pendente' OR c.status = 'em_pagamento' THEN c.valor_comissao ELSE 0 END), 0) as total_pendente
      FROM usuarios u
      LEFT JOIN comissoes c ON u.id = c.vendedor_id AND c.company_id = $1
      WHERE u.role = 'vendedor' AND u.company_id = $1
      GROUP BY u.id, u.nome
      ORDER BY total_valor DESC
    `;

    const result = await pool.query(query, [companyId]);
    return result.rows;
  }
}

export default Comissao;
