import pool from '../config/database.js';

// Estatísticas gerais do dashboard
export const estatisticasDashboard = async (req, res) => {
  try {
    const { role, equipe_id } = req.user;

    // 1. Buscar meta geral (soma de todas as metas do mês atual)
    const mesAtual = new Date().toISOString().slice(0, 7); // formato YYYY-MM

    const metaQuery = `
      SELECT COALESCE(SUM(valor_meta), 0) as meta_geral
      FROM metas
      WHERE mes_referencia = ?
    `;
    const metaResult = await pool.query(metaQuery, [mesAtual]);
    const metaGeral = parseFloat(metaResult.rows[0].meta_geral) || 0;

    // 2. Buscar vendas e metas por equipe
    let vendasPorEquipeQuery;
    let vendasParams;

    if (role === 'vendedor') {
      // Vendedor vê apenas sua própria equipe
      vendasPorEquipeQuery = `
        SELECT
          e.id as equipe_id,
          e.nome as equipe_nome,
          COALESCE(SUM(CAST(c.valor_carta AS REAL)), 0) as total_vendido,
          COUNT(c.id) as total_vendas,
          COALESCE(
            (SELECT SUM(m.valor_meta)
             FROM metas m
             WHERE m.equipe_id = e.id
             AND m.mes_referencia = ?),
            0
          ) as meta_equipe
        FROM equipes e
        LEFT JOIN usuarios u ON u.equipe_id = e.id
        LEFT JOIN clientes c ON c.vendedor_id = u.id AND c.etapa = 'fechado'
        WHERE e.id = ?
        GROUP BY e.id, e.nome
        ORDER BY total_vendido DESC
      `;
      vendasParams = [mesAtual, equipe_id];
    } else if (role === 'gerente') {
      // Gerente vê apenas sua equipe
      vendasPorEquipeQuery = `
        SELECT
          e.id as equipe_id,
          e.nome as equipe_nome,
          COALESCE(SUM(CAST(c.valor_carta AS REAL)), 0) as total_vendido,
          COUNT(c.id) as total_vendas,
          COALESCE(
            (SELECT SUM(m.valor_meta)
             FROM metas m
             WHERE m.equipe_id = e.id
             AND m.mes_referencia = ?),
            0
          ) as meta_equipe
        FROM equipes e
        LEFT JOIN usuarios u ON u.equipe_id = e.id
        LEFT JOIN clientes c ON c.vendedor_id = u.id AND c.etapa = 'fechado'
        WHERE e.id = ?
        GROUP BY e.id, e.nome
        ORDER BY total_vendido DESC
      `;
      vendasParams = [mesAtual, equipe_id];
    } else {
      // Admin vê todas as equipes
      vendasPorEquipeQuery = `
        SELECT
          e.id as equipe_id,
          e.nome as equipe_nome,
          COALESCE(SUM(CAST(c.valor_carta AS REAL)), 0) as total_vendido,
          COUNT(c.id) as total_vendas,
          COALESCE(
            (SELECT SUM(m.valor_meta)
             FROM metas m
             WHERE m.equipe_id = e.id
             AND m.mes_referencia = ?),
            0
          ) as meta_equipe
        FROM equipes e
        LEFT JOIN usuarios u ON u.equipe_id = e.id
        LEFT JOIN clientes c ON c.vendedor_id = u.id AND c.etapa = 'fechado'
        GROUP BY e.id, e.nome
        ORDER BY total_vendido DESC
      `;
      vendasParams = [mesAtual];
    }

    const vendasResult = await pool.query(vendasPorEquipeQuery, vendasParams);

    // 3. Calcular totais e percentuais
    const vendasPorEquipe = vendasResult.rows.map(equipe => {
      const totalVendido = parseFloat(equipe.total_vendido) || 0;
      const metaEquipe = parseFloat(equipe.meta_equipe) || 0;
      const percentualAtingido = metaEquipe > 0
        ? ((totalVendido / metaEquipe) * 100).toFixed(2)
        : 0;

      return {
        equipe_id: equipe.equipe_id,
        equipe_nome: equipe.equipe_nome,
        total_vendido: totalVendido,
        total_vendas: parseInt(equipe.total_vendas) || 0,
        meta_equipe: metaEquipe,
        percentual_atingido: parseFloat(percentualAtingido),
        percentual_contribuicao: metaGeral > 0
          ? ((totalVendido / metaGeral) * 100).toFixed(2)
          : 0
      };
    });

    // 4. Calcular total vendido geral
    const totalVendidoGeral = vendasPorEquipe.reduce((acc, equipe) =>
      acc + equipe.total_vendido, 0
    );

    // 5. Calcular percentual atingido geral
    const percentualAtingidoGeral = metaGeral > 0
      ? ((totalVendidoGeral / metaGeral) * 100).toFixed(2)
      : 0;

    // 6. KPI - Taxa de Conversão do Funil
    const funil = await pool.query(`
      SELECT etapa, COUNT(*) as total
      FROM clientes
      GROUP BY etapa
    `);

    const funnelData = {
      novo_contato: 0,
      proposta_enviada: 0,
      negociacao: 0,
      fechado: 0,
      perdido: 0
    };

    funil.rows.forEach(row => {
      funnelData[row.etapa] = parseInt(row.total);
    });

    const totalContatos = funnelData.novo_contato + funnelData.proposta_enviada +
                         funnelData.negociacao + funnelData.fechado + funnelData.perdido;

    const taxaConversao = {
      proposta: totalContatos > 0 ? ((funnelData.proposta_enviada / totalContatos) * 100).toFixed(2) : 0,
      negociacao: totalContatos > 0 ? ((funnelData.negociacao / totalContatos) * 100).toFixed(2) : 0,
      fechamento: totalContatos > 0 ? ((funnelData.fechado / totalContatos) * 100).toFixed(2) : 0,
      perda: totalContatos > 0 ? ((funnelData.perdido / totalContatos) * 100).toFixed(2) : 0
    };

    // 7. KPI - Ticket Médio
    const ticketMedioQuery = await pool.query(`
      SELECT AVG(CAST(valor_carta AS REAL)) as ticket_medio
      FROM clientes
      WHERE etapa = 'fechado' AND valor_carta IS NOT NULL AND valor_carta != ''
    `);
    const ticketMedio = parseFloat(ticketMedioQuery.rows[0]?.ticket_medio) || 0;

    // 8. KPI - Pipeline Value (valor em negociação)
    const pipelineQuery = await pool.query(`
      SELECT
        COALESCE(SUM(CAST(valor_carta AS REAL)), 0) as pipeline_negociacao,
        COUNT(*) as qtd_negociacao
      FROM clientes
      WHERE etapa = 'negociacao' AND valor_carta IS NOT NULL AND valor_carta != ''
    `);

    const pipelinePropostaQuery = await pool.query(`
      SELECT
        COALESCE(SUM(CAST(valor_carta AS REAL)), 0) as pipeline_proposta,
        COUNT(*) as qtd_proposta
      FROM clientes
      WHERE etapa = 'proposta_enviada' AND valor_carta IS NOT NULL AND valor_carta != ''
    `);

    const pipelineValue = {
      em_negociacao: parseFloat(pipelineQuery.rows[0]?.pipeline_negociacao) || 0,
      qtd_negociacao: parseInt(pipelineQuery.rows[0]?.qtd_negociacao) || 0,
      proposta_enviada: parseFloat(pipelinePropostaQuery.rows[0]?.pipeline_proposta) || 0,
      qtd_proposta: parseInt(pipelinePropostaQuery.rows[0]?.qtd_proposta) || 0,
      total: (parseFloat(pipelineQuery.rows[0]?.pipeline_negociacao) || 0) +
             (parseFloat(pipelinePropostaQuery.rows[0]?.pipeline_proposta) || 0)
    };

    // 9. KPI - Ranking de Vendedores
    let rankingQuery;
    let rankingParams;

    if (role === 'vendedor') {
      // Vendedor vê apenas seu próprio desempenho
      rankingQuery = `
        SELECT
          u.id,
          u.nome,
          COUNT(c.id) as total_vendas,
          COALESCE(SUM(CAST(c.valor_carta AS REAL)), 0) as total_valor
        FROM usuarios u
        LEFT JOIN clientes c ON c.vendedor_id = u.id AND c.etapa = 'fechado'
        WHERE u.id = ?
        GROUP BY u.id, u.nome
      `;
      rankingParams = [req.user.id];
    } else if (role === 'gerente') {
      // Gerente vê ranking de sua equipe
      rankingQuery = `
        SELECT
          u.id,
          u.nome,
          COUNT(c.id) as total_vendas,
          COALESCE(SUM(CAST(c.valor_carta AS REAL)), 0) as total_valor
        FROM usuarios u
        LEFT JOIN clientes c ON c.vendedor_id = u.id AND c.etapa = 'fechado'
        WHERE u.equipe_id = ? AND u.role = 'vendedor'
        GROUP BY u.id, u.nome
        ORDER BY total_valor DESC
        LIMIT 10
      `;
      rankingParams = [equipe_id];
    } else {
      // Admin vê top 10 vendedores
      rankingQuery = `
        SELECT
          u.id,
          u.nome,
          e.nome as equipe_nome,
          COUNT(c.id) as total_vendas,
          COALESCE(SUM(CAST(c.valor_carta AS REAL)), 0) as total_valor
        FROM usuarios u
        LEFT JOIN equipes e ON u.equipe_id = e.id
        LEFT JOIN clientes c ON c.vendedor_id = u.id AND c.etapa = 'fechado'
        WHERE u.role = 'vendedor'
        GROUP BY u.id, u.nome, e.nome
        ORDER BY total_valor DESC
        LIMIT 10
      `;
      rankingParams = [];
    }

    const rankingResult = await pool.query(rankingQuery, rankingParams);
    const rankingVendedores = rankingResult.rows.map(v => ({
      id: v.id,
      nome: v.nome,
      equipe_nome: v.equipe_nome || '',
      total_vendas: parseInt(v.total_vendas) || 0,
      total_valor: parseFloat(v.total_valor) || 0
    }));

    res.json({
      meta_geral: metaGeral,
      total_vendido_geral: totalVendidoGeral,
      percentual_atingido_geral: parseFloat(percentualAtingidoGeral),
      vendas_por_equipe: vendasPorEquipe,
      mes_referencia: mesAtual,
      // Novos KPIs da Fase 1
      taxa_conversao: taxaConversao,
      ticket_medio: ticketMedio,
      pipeline_value: pipelineValue,
      ranking_vendedores: rankingVendedores
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas do dashboard' });
  }
};
