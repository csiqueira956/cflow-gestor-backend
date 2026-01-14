import pool from '../config/database.js';

// Estatísticas gerais do dashboard
export const estatisticasDashboard = async (req, res) => {
  try {
    const { role, equipe_id, company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    // 1. Buscar meta geral (soma de todas as metas do mês atual)
    const mesAtual = new Date().toISOString().slice(0, 7); // formato YYYY-MM

    const metaQuery = `
      SELECT COALESCE(SUM(valor_meta), 0) as meta_geral
      FROM metas
      WHERE mes_referencia = $1 AND company_id = $2
    `;
    const metaResult = await pool.query(metaQuery, [mesAtual, companyId]);
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
             AND m.mes_referencia = $1
             AND m.company_id = $4),
            0
          ) as meta_equipe
        FROM equipes e
        LEFT JOIN usuarios u ON u.equipe_id = e.id
        LEFT JOIN clientes c ON c.vendedor_id = u.id AND c.etapa = 'fechado' AND c.company_id = $4
        WHERE e.id = $2 AND e.company_id = $4
        GROUP BY e.id, e.nome
        ORDER BY total_vendido DESC
      `;
      vendasParams = [mesAtual, equipe_id, companyId, companyId];
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
             AND m.mes_referencia = $1
             AND m.company_id = $4),
            0
          ) as meta_equipe
        FROM equipes e
        LEFT JOIN usuarios u ON u.equipe_id = e.id
        LEFT JOIN clientes c ON c.vendedor_id = u.id AND c.etapa = 'fechado' AND c.company_id = $4
        WHERE e.id = $2 AND e.company_id = $4
        GROUP BY e.id, e.nome
        ORDER BY total_vendido DESC
      `;
      vendasParams = [mesAtual, equipe_id, companyId, companyId];
    } else {
      // Admin vê todas as equipes da empresa
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
             AND m.mes_referencia = $1
             AND m.company_id = $2),
            0
          ) as meta_equipe
        FROM equipes e
        LEFT JOIN usuarios u ON u.equipe_id = e.id
        LEFT JOIN clientes c ON c.vendedor_id = u.id AND c.etapa = 'fechado' AND c.company_id = $2
        WHERE e.company_id = $2
        GROUP BY e.id, e.nome
        ORDER BY total_vendido DESC
      `;
      vendasParams = [mesAtual, companyId];
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

    // 6. KPI - Taxa de Conversão do Funil (filtrado por empresa)
    const funil = await pool.query(`
      SELECT etapa, COUNT(*) as total
      FROM clientes
      WHERE company_id = $1
      GROUP BY etapa
    `, [companyId]);

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

    // 7. KPI - Ticket Médio (filtrado por empresa)
    const ticketMedioQuery = await pool.query(`
      SELECT AVG(CAST(valor_carta AS REAL)) as ticket_medio
      FROM clientes
      WHERE etapa = 'fechado' AND valor_carta IS NOT NULL AND valor_carta != '' AND company_id = $1
    `, [companyId]);
    const ticketMedio = parseFloat(ticketMedioQuery.rows[0]?.ticket_medio) || 0;

    // 8. KPI - Pipeline Value (valor em negociação) - filtrado por empresa
    const pipelineQuery = await pool.query(`
      SELECT
        COALESCE(SUM(CAST(valor_carta AS REAL)), 0) as pipeline_negociacao,
        COUNT(*) as qtd_negociacao
      FROM clientes
      WHERE etapa = 'negociacao' AND valor_carta IS NOT NULL AND valor_carta != '' AND company_id = $1
    `, [companyId]);

    const pipelinePropostaQuery = await pool.query(`
      SELECT
        COALESCE(SUM(CAST(valor_carta AS REAL)), 0) as pipeline_proposta,
        COUNT(*) as qtd_proposta
      FROM clientes
      WHERE etapa = 'proposta_enviada' AND valor_carta IS NOT NULL AND valor_carta != '' AND company_id = $1
    `, [companyId]);

    const pipelineValue = {
      em_negociacao: parseFloat(pipelineQuery.rows[0]?.pipeline_negociacao) || 0,
      qtd_negociacao: parseInt(pipelineQuery.rows[0]?.qtd_negociacao) || 0,
      proposta_enviada: parseFloat(pipelinePropostaQuery.rows[0]?.pipeline_proposta) || 0,
      qtd_proposta: parseInt(pipelinePropostaQuery.rows[0]?.qtd_proposta) || 0,
      total: (parseFloat(pipelineQuery.rows[0]?.pipeline_negociacao) || 0) +
             (parseFloat(pipelinePropostaQuery.rows[0]?.pipeline_proposta) || 0)
    };

    // 9. KPI - Ranking de Vendedores (filtrado por empresa)
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
        LEFT JOIN clientes c ON c.vendedor_id = u.id AND c.etapa = 'fechado' AND c.company_id = $2
        WHERE u.id = $1 AND u.company_id = $2
        GROUP BY u.id, u.nome
      `;
      rankingParams = [req.user.id, companyId];
    } else if (role === 'gerente') {
      // Gerente vê ranking de sua equipe
      rankingQuery = `
        SELECT
          u.id,
          u.nome,
          COUNT(c.id) as total_vendas,
          COALESCE(SUM(CAST(c.valor_carta AS REAL)), 0) as total_valor
        FROM usuarios u
        LEFT JOIN clientes c ON c.vendedor_id = u.id AND c.etapa = 'fechado' AND c.company_id = $2
        WHERE u.equipe_id = $1 AND u.role = 'vendedor' AND u.company_id = $2
        GROUP BY u.id, u.nome
        ORDER BY total_valor DESC
        LIMIT 10
      `;
      rankingParams = [equipe_id, companyId];
    } else {
      // Admin vê top 10 vendedores da empresa
      rankingQuery = `
        SELECT
          u.id,
          u.nome,
          e.nome as equipe_nome,
          COUNT(c.id) as total_vendas,
          COALESCE(SUM(CAST(c.valor_carta AS REAL)), 0) as total_valor
        FROM usuarios u
        LEFT JOIN equipes e ON u.equipe_id = e.id
        LEFT JOIN clientes c ON c.vendedor_id = u.id AND c.etapa = 'fechado' AND c.company_id = $1
        WHERE u.role = 'vendedor' AND u.company_id = $1
        GROUP BY u.id, u.nome, e.nome
        ORDER BY total_valor DESC
        LIMIT 10
      `;
      rankingParams = [companyId];
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
