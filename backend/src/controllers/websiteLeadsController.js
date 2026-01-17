import pool from '../config/database.js';

// ==========================================
// ROTA PÚBLICA - Receber lead do site
// ==========================================
export const criarLead = async (req, res) => {
  try {
    const {
      nome,
      email,
      telefone,
      empresa,
      tamanho_equipe,
      mensagem,
      utm_source,
      utm_medium,
      utm_campaign
    } = req.body;

    // Validação básica
    if (!nome || !email) {
      return res.status(400).json({
        error: 'Nome e email são obrigatórios'
      });
    }

    // Capturar IP e User Agent
    const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const user_agent = req.headers['user-agent'];

    const result = await pool.query(
      `INSERT INTO website_leads
        (nome, email, telefone, empresa, tamanho_equipe, mensagem,
         utm_source, utm_medium, utm_campaign, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, nome, email, created_at`,
      [nome, email, telefone, empresa, tamanho_equipe, mensagem,
       utm_source, utm_medium, utm_campaign, ip_address, user_agent]
    );

    res.status(201).json({
      success: true,
      message: 'Obrigado pelo contato! Em breve entraremos em contato.',
      lead: {
        id: result.rows[0].id,
        nome: result.rows[0].nome
      }
    });

  } catch (error) {
    console.error('Erro ao criar lead:', error);
    res.status(500).json({
      error: 'Erro ao processar sua solicitação. Tente novamente.'
    });
  }
};

// ==========================================
// ROTAS DE SUPER ADMIN - Gerenciar leads
// ==========================================

// Listar todos os leads
export const listarLeads = async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 20,
      busca,
      ordenar = 'created_at',
      direcao = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Construir query dinamicamente
    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` WHERE status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (busca) {
      const buscaCondition = status ? ' AND' : ' WHERE';
      whereClause += `${buscaCondition} (nome ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR empresa ILIKE $${paramIndex})`;
      params.push(`%${busca}%`);
      paramIndex++;
    }

    // Ordenação segura (whitelist)
    const ordenacaoPermitida = ['created_at', 'nome', 'email', 'status', 'empresa'];
    const direcaoPermitida = ['ASC', 'DESC'];
    const ordenarFinal = ordenacaoPermitida.includes(ordenar) ? ordenar : 'created_at';
    const direcaoFinal = direcaoPermitida.includes(direcao.toUpperCase()) ? direcao.toUpperCase() : 'DESC';

    // Query principal
    const leadsQuery = `
      SELECT
        wl.*,
        u.nome as vendedor_nome,
        c.nome as empresa_nome
      FROM website_leads wl
      LEFT JOIN usuarios u ON wl.atribuido_a_vendedor_id = u.id
      LEFT JOIN companies c ON wl.atribuido_a_empresa_id = c.id
      ${whereClause}
      ORDER BY ${ordenarFinal} ${direcaoFinal}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    // Query de contagem
    const countQuery = `SELECT COUNT(*) FROM website_leads ${whereClause}`;
    const countParams = params.slice(0, -2); // Remove limit e offset

    const [leadsResult, countResult] = await Promise.all([
      pool.query(leadsQuery, params),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      leads: leadsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar leads:', error);
    res.status(500).json({ error: 'Erro ao buscar leads' });
  }
};

// Obter estatísticas dos leads
export const getLeadsStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'novo') as novos,
        COUNT(*) FILTER (WHERE status = 'em_analise') as em_analise,
        COUNT(*) FILTER (WHERE status = 'contatado') as contatados,
        COUNT(*) FILTER (WHERE status = 'convertido') as convertidos,
        COUNT(*) FILTER (WHERE status = 'descartado') as descartados,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as ultimos_7_dias,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as ultimos_30_dias
      FROM website_leads
    `;

    const result = await pool.query(statsQuery);

    res.json({
      stats: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

// Obter detalhes de um lead
export const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        wl.*,
        u.nome as vendedor_nome,
        c.nome as empresa_nome
       FROM website_leads wl
       LEFT JOIN usuarios u ON wl.atribuido_a_vendedor_id = u.id
       LEFT JOIN companies c ON wl.atribuido_a_empresa_id = c.id
       WHERE wl.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    res.json({ lead: result.rows[0] });

  } catch (error) {
    console.error('Erro ao buscar lead:', error);
    res.status(500).json({ error: 'Erro ao buscar lead' });
  }
};

// Atualizar status do lead
export const atualizarStatusLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notas } = req.body;

    const statusPermitidos = ['novo', 'em_analise', 'contatado', 'convertido', 'descartado'];
    if (!statusPermitidos.includes(status)) {
      return res.status(400).json({
        error: 'Status inválido',
        statusPermitidos
      });
    }

    const result = await pool.query(
      `UPDATE website_leads
       SET status = $1, notas = COALESCE($2, notas)
       WHERE id = $3
       RETURNING *`,
      [status, notas, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    res.json({
      message: 'Status atualizado com sucesso',
      lead: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar lead:', error);
    res.status(500).json({ error: 'Erro ao atualizar lead' });
  }
};

// Atribuir lead a um vendedor/empresa
export const atribuirLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendedor_id, empresa_id } = req.body;

    const result = await pool.query(
      `UPDATE website_leads
       SET
         atribuido_a_vendedor_id = $1,
         atribuido_a_empresa_id = $2,
         status = CASE WHEN status = 'novo' THEN 'em_analise' ELSE status END
       WHERE id = $3
       RETURNING *`,
      [vendedor_id, empresa_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    res.json({
      message: 'Lead atribuído com sucesso',
      lead: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atribuir lead:', error);
    res.status(500).json({ error: 'Erro ao atribuir lead' });
  }
};

// Deletar lead
export const deletarLead = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM website_leads WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    res.json({ message: 'Lead excluído com sucesso' });

  } catch (error) {
    console.error('Erro ao deletar lead:', error);
    res.status(500).json({ error: 'Erro ao deletar lead' });
  }
};
