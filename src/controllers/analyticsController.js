import pool from '../config/database.js';

/**
 * Controller de Analytics
 * Métricas e KPIs para o dashboard administrativo
 */

/**
 * Calcular MRR (Monthly Recurring Revenue)
 * GET /api/analytics/mrr
 */
export const calcularMRR = async (req, res) => {
  try {
    const { periodo = 12 } = req.query; // Últimos 12 meses por padrão

    // Buscar assinaturas ativas e seus valores
    const result = await pool.query(`
      SELECT
        DATE_TRUNC('month', created_at) as mes,
        COUNT(*) as total_assinaturas,
        SUM(CASE WHEN status = 'ACTIVE' THEN valor ELSE 0 END) as mrr,
        SUM(CASE WHEN status = 'TRIAL' THEN valor ELSE 0 END) as mrr_trial
      FROM assinaturas
      WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '${parseInt(periodo)} months')
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mes DESC
    `);

    // Calcular MRR total atual
    const mrrAtualResult = await pool.query(`
      SELECT
        COUNT(*) as total_assinaturas_ativas,
        SUM(valor) as mrr_atual
      FROM assinaturas
      WHERE status = 'ACTIVE'
    `);

    const mrrAtual = mrrAtualResult.rows[0] || { mrr_atual: 0, total_assinaturas_ativas: 0 };

    // Calcular crescimento mês a mês
    const historico = result.rows.map((row, index) => {
      const mesAnterior = result.rows[index + 1];
      const crescimento = mesAnterior
        ? ((parseFloat(row.mrr) - parseFloat(mesAnterior.mrr)) / parseFloat(mesAnterior.mrr)) * 100
        : 0;

      return {
        mes: row.mes,
        mrr: parseFloat(row.mrr) || 0,
        mrr_trial: parseFloat(row.mrr_trial) || 0,
        total_assinaturas: parseInt(row.total_assinaturas),
        crescimento_percentual: crescimento.toFixed(2)
      };
    });

    res.json({
      success: true,
      mrr_atual: parseFloat(mrrAtual.mrr_atual) || 0,
      total_assinaturas_ativas: parseInt(mrrAtual.total_assinaturas_ativas) || 0,
      historico: historico.reverse() // Ordem cronológica
    });

  } catch (error) {
    console.error('Erro ao calcular MRR:', error);
    res.status(500).json({
      error: 'Erro ao calcular MRR',
      message: error.message
    });
  }
};

/**
 * Calcular taxa de conversão (Trial → Active)
 * GET /api/analytics/conversao
 */
export const calcularTaxaConversao = async (req, res) => {
  try {
    const { periodo = 12 } = req.query;

    // Buscar conversões por mês
    const result = await pool.query(`
      SELECT
        DATE_TRUNC('month', created_at) as mes,
        COUNT(*) FILTER (WHERE status = 'TRIAL') as trials_iniciados,
        COUNT(*) FILTER (WHERE status = 'ACTIVE' AND trial_end_date IS NOT NULL) as trials_convertidos,
        CASE
          WHEN COUNT(*) FILTER (WHERE status = 'TRIAL') > 0
          THEN (COUNT(*) FILTER (WHERE status = 'ACTIVE' AND trial_end_date IS NOT NULL)::FLOAT / COUNT(*) FILTER (WHERE status = 'TRIAL')::FLOAT) * 100
          ELSE 0
        END as taxa_conversao
      FROM assinaturas
      WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '${parseInt(periodo)} months')
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mes DESC
    `);

    // Taxa de conversão geral
    const taxaGeralResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('TRIAL', 'ACTIVE') AND trial_end_date IS NOT NULL) as total_trials,
        COUNT(*) FILTER (WHERE status = 'ACTIVE' AND trial_end_date IS NOT NULL) as total_convertidos,
        CASE
          WHEN COUNT(*) FILTER (WHERE status IN ('TRIAL', 'ACTIVE') AND trial_end_date IS NOT NULL) > 0
          THEN (COUNT(*) FILTER (WHERE status = 'ACTIVE' AND trial_end_date IS NOT NULL)::FLOAT / COUNT(*) FILTER (WHERE status IN ('TRIAL', 'ACTIVE') AND trial_end_date IS NOT NULL)::FLOAT) * 100
          ELSE 0
        END as taxa_conversao_geral
      FROM assinaturas
    `);

    const taxaGeral = taxaGeralResult.rows[0] || { taxa_conversao_geral: 0, total_trials: 0, total_convertidos: 0 };

    res.json({
      success: true,
      taxa_conversao_geral: parseFloat(taxaGeral.taxa_conversao_geral).toFixed(2),
      total_trials: parseInt(taxaGeral.total_trials),
      total_convertidos: parseInt(taxaGeral.total_convertidos),
      historico: result.rows.map(row => ({
        mes: row.mes,
        trials_iniciados: parseInt(row.trials_iniciados),
        trials_convertidos: parseInt(row.trials_convertidos),
        taxa_conversao: parseFloat(row.taxa_conversao).toFixed(2)
      })).reverse()
    });

  } catch (error) {
    console.error('Erro ao calcular taxa de conversão:', error);
    res.status(500).json({
      error: 'Erro ao calcular taxa de conversão',
      message: error.message
    });
  }
};

/**
 * Calcular Churn Rate (Taxa de Cancelamento)
 * GET /api/analytics/churn
 */
export const calcularChurnRate = async (req, res) => {
  try {
    const { periodo = 12 } = req.query;

    // Buscar churn por mês
    const result = await pool.query(`
      SELECT
        DATE_TRUNC('month', updated_at) as mes,
        COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelamentos,
        (
          SELECT COUNT(*)
          FROM assinaturas a2
          WHERE a2.status = 'ACTIVE'
          AND DATE_TRUNC('month', a2.created_at) <= DATE_TRUNC('month', a1.updated_at)
        ) as assinaturas_ativas_inicio_mes,
        CASE
          WHEN (
            SELECT COUNT(*)
            FROM assinaturas a2
            WHERE a2.status = 'ACTIVE'
            AND DATE_TRUNC('month', a2.created_at) <= DATE_TRUNC('month', a1.updated_at)
          ) > 0
          THEN (COUNT(*) FILTER (WHERE status = 'CANCELLED')::FLOAT / (
            SELECT COUNT(*)
            FROM assinaturas a2
            WHERE a2.status = 'ACTIVE'
            AND DATE_TRUNC('month', a2.created_at) <= DATE_TRUNC('month', a1.updated_at)
          )::FLOAT) * 100
          ELSE 0
        END as churn_rate
      FROM assinaturas a1
      WHERE updated_at >= DATE_TRUNC('month', NOW() - INTERVAL '${parseInt(periodo)} months')
      GROUP BY DATE_TRUNC('month', updated_at)
      ORDER BY mes DESC
    `);

    // Churn rate geral
    const churnGeralResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'CANCELLED') as total_cancelamentos,
        COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'CANCELLED', 'OVERDUE')) as total_assinaturas,
        CASE
          WHEN COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'CANCELLED', 'OVERDUE')) > 0
          THEN (COUNT(*) FILTER (WHERE status = 'CANCELLED')::FLOAT / COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'CANCELLED', 'OVERDUE'))::FLOAT) * 100
          ELSE 0
        END as churn_rate_geral
      FROM assinaturas
    `);

    const churnGeral = churnGeralResult.rows[0] || { churn_rate_geral: 0, total_cancelamentos: 0, total_assinaturas: 0 };

    res.json({
      success: true,
      churn_rate_geral: parseFloat(churnGeral.churn_rate_geral).toFixed(2),
      total_cancelamentos: parseInt(churnGeral.total_cancelamentos),
      total_assinaturas: parseInt(churnGeral.total_assinaturas),
      historico: result.rows.map(row => ({
        mes: row.mes,
        cancelamentos: parseInt(row.cancelamentos),
        assinaturas_ativas_inicio_mes: parseInt(row.assinaturas_ativas_inicio_mes),
        churn_rate: parseFloat(row.churn_rate).toFixed(2)
      })).reverse()
    });

  } catch (error) {
    console.error('Erro ao calcular churn rate:', error);
    res.status(500).json({
      error: 'Erro ao calcular churn rate',
      message: error.message
    });
  }
};

/**
 * Buscar métricas gerais do dashboard
 * GET /api/analytics/overview
 */
export const obterOverview = async (req, res) => {
  try {
    // Total de empresas
    const empresasResult = await pool.query(`
      SELECT COUNT(*) as total FROM empresas
    `);

    // Assinaturas por status
    const assinaturasResult = await pool.query(`
      SELECT
        status,
        COUNT(*) as total
      FROM assinaturas
      GROUP BY status
    `);

    // Receita total (pagamentos confirmados)
    const receitaResult = await pool.query(`
      SELECT
        SUM(valor) as receita_total,
        COUNT(*) as total_pagamentos
      FROM pagamentos
      WHERE status IN ('paid', 'confirmed', 'received')
    `);

    // Novos clientes este mês
    const novosClientesResult = await pool.query(`
      SELECT COUNT(*) as novos_clientes
      FROM empresas
      WHERE created_at >= DATE_TRUNC('month', NOW())
    `);

    // Preparar resumo
    const assinaturasPorStatus = {};
    assinaturasResult.rows.forEach(row => {
      assinaturasPorStatus[row.status] = parseInt(row.total);
    });

    res.json({
      success: true,
      total_empresas: parseInt(empresasResult.rows[0]?.total || 0),
      assinaturas_por_status: assinaturasPorStatus,
      receita_total: parseFloat(receitaResult.rows[0]?.receita_total || 0),
      total_pagamentos: parseInt(receitaResult.rows[0]?.total_pagamentos || 0),
      novos_clientes_mes: parseInt(novosClientesResult.rows[0]?.novos_clientes || 0)
    });

  } catch (error) {
    console.error('Erro ao obter overview:', error);
    res.status(500).json({
      error: 'Erro ao obter overview',
      message: error.message
    });
  }
};

/**
 * Funil de vendas (Sales Funnel)
 * GET /api/analytics/funil
 */
export const obterFunilVendas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE status = 'TRIAL') as em_trial,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') as ativos,
        COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelados
      FROM assinaturas
    `);

    const dados = result.rows[0] || {};

    res.json({
      success: true,
      funil: {
        total_leads: parseInt(dados.total_leads || 0),
        em_trial: parseInt(dados.em_trial || 0),
        ativos: parseInt(dados.ativos || 0),
        cancelados: parseInt(dados.cancelados || 0),
        taxa_ativacao: dados.total_leads > 0
          ? ((parseInt(dados.ativos) / parseInt(dados.total_leads)) * 100).toFixed(2)
          : 0
      }
    });

  } catch (error) {
    console.error('Erro ao obter funil de vendas:', error);
    res.status(500).json({
      error: 'Erro ao obter funil de vendas',
      message: error.message
    });
  }
};
