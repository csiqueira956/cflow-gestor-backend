import pool from '../config/database.js';

/**
 * Listar notificações da empresa do usuário logado
 * GET /api/notifications
 */
export const listarNotificacoes = async (req, res) => {
  try {
    const companyId = req.usuario?.company_id || req.user?.company_id;
    const { apenas_nao_lidas } = req.query;

    if (!companyId) {
      return res.status(400).json({
        error: 'Company ID não encontrado'
      });
    }

    let query = `
      SELECT
        n.*,
        u.nome as lida_por_nome
      FROM notifications n
      LEFT JOIN usuarios u ON u.id = n.lida_por
      WHERE n.company_id = $1
        AND (n.expira_em IS NULL OR n.expira_em > NOW())
    `;

    const params = [companyId];

    // Filtrar apenas não lidas se solicitado
    if (apenas_nao_lidas === 'true') {
      query += ` AND n.lida = false`;
    }

    query += ` ORDER BY n.created_at DESC LIMIT 50`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      notifications: result.rows || [],
      total: result.rows?.length || 0
    });

  } catch (error) {
    console.error('Erro ao listar notificações:', error);
    res.status(500).json({
      error: 'Erro ao listar notificações',
      message: error.message
    });
  }
};

/**
 * Contar notificações não lidas
 * GET /api/notifications/unread-count
 */
export const contarNaoLidas = async (req, res) => {
  try {
    const companyId = req.usuario?.company_id || req.user?.company_id;

    if (!companyId) {
      return res.status(400).json({
        error: 'Company ID não encontrado'
      });
    }

    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM notifications
       WHERE company_id = $1
         AND lida = false
         AND (expira_em IS NULL OR expira_em > NOW())`,
      [companyId]
    );

    const count = parseInt(result.rows[0]?.count || 0);

    res.json({
      success: true,
      count
    });

  } catch (error) {
    console.error('Erro ao contar notificações não lidas:', error);
    res.status(500).json({
      error: 'Erro ao contar notificações',
      message: error.message
    });
  }
};

/**
 * Marcar notificação como lida
 * PUT /api/notifications/:id/read
 */
export const marcarComoLida = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.usuario?.company_id || req.user?.company_id;
    const userId = req.usuario?.id || req.user?.id;

    if (!companyId) {
      return res.status(400).json({
        error: 'Company ID não encontrado'
      });
    }

    // Verificar se a notificação pertence à empresa
    const checkResult = await pool.query(
      'SELECT id FROM notifications WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Notificação não encontrada'
      });
    }

    // Marcar como lida
    const result = await pool.query(
      `UPDATE notifications
       SET lida = true,
           lida_em = NOW(),
           lida_por = $1,
           updated_at = NOW()
       WHERE id = $2 AND company_id = $3
       RETURNING *`,
      [userId, id, companyId]
    );

    res.json({
      success: true,
      notification: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({
      error: 'Erro ao marcar notificação como lida',
      message: error.message
    });
  }
};

/**
 * Marcar todas as notificações como lidas
 * PUT /api/notifications/read-all
 */
export const marcarTodasComoLidas = async (req, res) => {
  try {
    const companyId = req.usuario?.company_id || req.user?.company_id;
    const userId = req.usuario?.id || req.user?.id;

    if (!companyId) {
      return res.status(400).json({
        error: 'Company ID não encontrado'
      });
    }

    const result = await pool.query(
      `UPDATE notifications
       SET lida = true,
           lida_em = NOW(),
           lida_por = $1,
           updated_at = NOW()
       WHERE company_id = $2
         AND lida = false
         AND (expira_em IS NULL OR expira_em > NOW())
       RETURNING id`,
      [userId, companyId]
    );

    res.json({
      success: true,
      message: 'Todas as notificações foram marcadas como lidas',
      count: result.rows?.length || 0
    });

  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    res.status(500).json({
      error: 'Erro ao marcar notificações como lidas',
      message: error.message
    });
  }
};

/**
 * Criar notificação (uso interno/admin)
 * POST /api/notifications
 */
export const criarNotificacao = async (req, res) => {
  try {
    const {
      company_id,
      tipo,
      titulo,
      mensagem,
      prioridade = 'normal',
      categoria = 'assinatura',
      dados_extras = null,
      action_url = null,
      action_label = null,
      expira_em = null
    } = req.body;

    // Validações
    if (!company_id || !tipo || !titulo || !mensagem) {
      return res.status(400).json({
        error: 'Campos obrigatórios: company_id, tipo, titulo, mensagem'
      });
    }

    const result = await pool.query(
      `INSERT INTO notifications (
        company_id, tipo, titulo, mensagem, prioridade, categoria,
        dados_extras, action_url, action_label, expira_em
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        company_id,
        tipo,
        titulo,
        mensagem,
        prioridade,
        categoria,
        dados_extras ? JSON.stringify(dados_extras) : null,
        action_url,
        action_label,
        expira_em
      ]
    );

    res.status(201).json({
      success: true,
      notification: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    res.status(500).json({
      error: 'Erro ao criar notificação',
      message: error.message
    });
  }
};

/**
 * Deletar notificação
 * DELETE /api/notifications/:id
 */
export const deletarNotificacao = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.usuario?.company_id || req.user?.company_id;

    if (!companyId) {
      return res.status(400).json({
        error: 'Company ID não encontrado'
      });
    }

    // Verificar se a notificação pertence à empresa
    const checkResult = await pool.query(
      'SELECT id FROM notifications WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Notificação não encontrada'
      });
    }

    await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    res.json({
      success: true,
      message: 'Notificação excluída com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar notificação:', error);
    res.status(500).json({
      error: 'Erro ao deletar notificação',
      message: error.message
    });
  }
};
