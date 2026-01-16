import pool from '../config/database.js';

class Atividade {
  // Criar nova atividade
  static async create(atividadeData, companyId) {
    if (!companyId) {
      throw new Error('company_id é obrigatório para criar atividade');
    }

    const {
      cliente_id,
      usuario_id,
      tipo,
      titulo,
      descricao,
      resultado,
      proximo_followup,
      data_atividade
    } = atividadeData;

    const query = `
      INSERT INTO atividades (
        cliente_id, usuario_id, company_id,
        tipo, titulo, descricao, resultado,
        proximo_followup, data_atividade
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, NOW()))
      RETURNING *
    `;

    const values = [
      cliente_id,
      usuario_id,
      companyId,
      tipo,
      titulo,
      descricao || null,
      resultado || 'pendente',
      proximo_followup || null,
      data_atividade || null
    ];

    const result = await pool.query(query, values);

    // Atualizar ultimo_followup no cliente
    await pool.query(
      `UPDATE clientes SET ultimo_followup = NOW() WHERE id = $1 AND company_id = $2`,
      [cliente_id, companyId]
    );

    return result.rows[0];
  }

  // Listar atividades de um cliente
  static async listByCliente(clienteId, companyId) {
    const query = `
      SELECT
        a.*,
        u.nome as usuario_nome
      FROM atividades a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.cliente_id = $1 AND a.company_id = $2
      ORDER BY a.data_atividade DESC
    `;

    const result = await pool.query(query, [clienteId, companyId]);
    return result.rows;
  }

  // Buscar atividade por ID
  static async findById(id, companyId) {
    const query = `
      SELECT
        a.*,
        u.nome as usuario_nome,
        c.nome as cliente_nome
      FROM atividades a
      JOIN usuarios u ON a.usuario_id = u.id
      JOIN clientes c ON a.cliente_id = c.id
      WHERE a.id = $1 AND a.company_id = $2
    `;

    const result = await pool.query(query, [id, companyId]);
    return result.rows[0];
  }

  // Atualizar atividade
  static async update(id, atividadeData, companyId) {
    const {
      tipo,
      titulo,
      descricao,
      resultado,
      proximo_followup,
      data_atividade
    } = atividadeData;

    const query = `
      UPDATE atividades
      SET
        tipo = COALESCE($1, tipo),
        titulo = COALESCE($2, titulo),
        descricao = $3,
        resultado = COALESCE($4, resultado),
        proximo_followup = $5,
        data_atividade = COALESCE($6, data_atividade)
      WHERE id = $7 AND company_id = $8
      RETURNING *
    `;

    const values = [
      tipo,
      titulo,
      descricao,
      resultado,
      proximo_followup || null,
      data_atividade,
      id,
      companyId
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Deletar atividade
  static async delete(id, companyId) {
    const query = `
      DELETE FROM atividades
      WHERE id = $1 AND company_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [id, companyId]);
    return result.rows[0];
  }

  // Listar próximos follow-ups agendados
  static async listProximosFollowups(companyId, dias = 7) {
    const query = `
      SELECT
        a.*,
        u.nome as usuario_nome,
        c.nome as cliente_nome,
        c.telefone_celular as cliente_telefone,
        c.etapa as cliente_etapa
      FROM atividades a
      JOIN usuarios u ON a.usuario_id = u.id
      JOIN clientes c ON a.cliente_id = c.id
      WHERE a.company_id = $1
        AND a.proximo_followup IS NOT NULL
        AND a.proximo_followup <= NOW() + INTERVAL '${dias} days'
        AND a.proximo_followup >= NOW()
      ORDER BY a.proximo_followup ASC
    `;

    const result = await pool.query(query, [companyId]);
    return result.rows;
  }

  // Listar follow-ups atrasados
  static async listFollowupsAtrasados(companyId) {
    const query = `
      SELECT
        a.*,
        u.nome as usuario_nome,
        c.nome as cliente_nome,
        c.telefone_celular as cliente_telefone,
        c.etapa as cliente_etapa
      FROM atividades a
      JOIN usuarios u ON a.usuario_id = u.id
      JOIN clientes c ON a.cliente_id = c.id
      WHERE a.company_id = $1
        AND a.proximo_followup IS NOT NULL
        AND a.proximo_followup < NOW()
      ORDER BY a.proximo_followup ASC
    `;

    const result = await pool.query(query, [companyId]);
    return result.rows;
  }

  // Estatísticas de atividades
  static async estatisticas(companyId, usuarioId = null) {
    let whereClause = 'WHERE a.company_id = $1';
    const values = [companyId];

    if (usuarioId) {
      whereClause += ' AND a.usuario_id = $2';
      values.push(usuarioId);
    }

    const query = `
      SELECT
        tipo,
        COUNT(*) as total,
        COUNT(CASE WHEN resultado = 'sucesso' THEN 1 END) as sucesso,
        COUNT(CASE WHEN resultado = 'sem_resposta' THEN 1 END) as sem_resposta,
        COUNT(CASE WHEN resultado = 'interessado' THEN 1 END) as interessado
      FROM atividades a
      ${whereClause}
      GROUP BY tipo
      ORDER BY total DESC
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Última atividade de um cliente
  static async ultimaAtividade(clienteId, companyId) {
    const query = `
      SELECT
        a.*,
        u.nome as usuario_nome
      FROM atividades a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.cliente_id = $1 AND a.company_id = $2
      ORDER BY a.data_atividade DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [clienteId, companyId]);
    return result.rows[0];
  }
}

export default Atividade;
