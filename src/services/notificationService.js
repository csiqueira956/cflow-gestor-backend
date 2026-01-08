import pool from '../config/database.js';

/**
 * Serviço de Notificações Automáticas
 * Gera notificações baseadas em eventos do sistema (vencimentos, limites, etc)
 */

/**
 * Verificar e criar notificações de vencimento próximo
 * Verifica assinaturas que vencem em 7, 3 e 1 dia(s) e cria notificações
 */
export const gerarNotificacoesVencimento = async () => {
  try {
    console.log('🔔 Iniciando verificação de vencimentos...');

    // Buscar assinaturas com vencimento próximo
    const result = await pool.query(`
      SELECT
        a.id as assinatura_id,
        a.company_id,
        a.status,
        a.data_vencimento,
        a.plano_id,
        e.nome as company_nome,
        p.nome as plano_nome,
        p.valor as plano_valor,
        DATE_PART('day', a.data_vencimento - NOW()) as dias_ate_vencimento
      FROM assinaturas a
      INNER JOIN empresas e ON e.id = a.company_id
      LEFT JOIN planos p ON p.id = a.plano_id
      WHERE a.status IN ('ACTIVE', 'TRIAL')
        AND a.data_vencimento IS NOT NULL
        AND a.data_vencimento >= NOW()
        AND DATE_PART('day', a.data_vencimento - NOW()) <= 7
      ORDER BY a.data_vencimento ASC
    `);

    const assinaturas = result.rows || [];
    console.log(`📊 Encontradas ${assinaturas.length} assinaturas com vencimento próximo`);

    let notificacoesCriadas = 0;

    for (const assinatura of assinaturas) {
      const diasRestantes = Math.ceil(assinatura.dias_ate_vencimento);

      // Determinar se deve criar notificação baseado nos dias restantes
      const deveNotificar = [7, 3, 1, 0].includes(diasRestantes);

      if (!deveNotificar) {
        continue;
      }

      // Verificar se já existe notificação similar recente (últimas 24h)
      const notificacaoExistente = await pool.query(`
        SELECT id FROM notifications
        WHERE company_id = $1
          AND tipo = $2
          AND created_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
      `, [assinatura.company_id, 'vencimento_proximo']);

      if (notificacaoExistente.rows && notificacaoExistente.rows.length > 0) {
        console.log(`⏭️  Notificação já existe para empresa ${assinatura.company_nome}`);
        continue;
      }

      // Criar notificação baseada nos dias restantes
      let titulo, mensagem, prioridade, actionLabel;

      if (diasRestantes === 0) {
        titulo = '⚠️ Sua assinatura vence hoje!';
        mensagem = `Sua assinatura do plano ${assinatura.plano_nome} vence hoje. Renove agora para não perder o acesso ao sistema.`;
        prioridade = 'urgente';
        actionLabel = 'Renovar Agora';
      } else if (diasRestantes === 1) {
        titulo = '⚠️ Assinatura vence amanhã';
        mensagem = `Sua assinatura do plano ${assinatura.plano_nome} vence amanhã. Renove para manter seu acesso.`;
        prioridade = 'alta';
        actionLabel = 'Renovar Assinatura';
      } else if (diasRestantes === 3) {
        titulo = '🔔 Assinatura vence em 3 dias';
        mensagem = `Sua assinatura do plano ${assinatura.plano_nome} vence em 3 dias. Renove antecipadamente e evite interrupções.`;
        prioridade = 'alta';
        actionLabel = 'Ver Detalhes';
      } else if (diasRestantes === 7) {
        titulo = '📅 Assinatura vence em 7 dias';
        mensagem = `Sua assinatura do plano ${assinatura.plano_nome} vence em 7 dias. Prepare-se para a renovação.`;
        prioridade = 'normal';
        actionLabel = 'Ver Planos';
      }

      // Criar notificação
      await pool.query(`
        INSERT INTO notifications (
          company_id,
          tipo,
          titulo,
          mensagem,
          prioridade,
          categoria,
          dados_extras,
          action_url,
          action_label,
          expira_em
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        assinatura.company_id,
        'vencimento_proximo',
        titulo,
        mensagem,
        prioridade,
        'assinatura',
        JSON.stringify({
          dias_restantes: diasRestantes,
          data_vencimento: assinatura.data_vencimento,
          plano_nome: assinatura.plano_nome,
          plano_valor: assinatura.plano_valor,
          status: assinatura.status
        }),
        '/minha-assinatura',
        actionLabel,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Expira em 30 dias
      ]);

      notificacoesCriadas++;
      console.log(`✅ Notificação criada para ${assinatura.company_nome} (${diasRestantes} dias)`);
    }

    console.log(`🎉 Processo concluído: ${notificacoesCriadas} notificações criadas`);

    return {
      success: true,
      assinaturas_verificadas: assinaturas.length,
      notificacoes_criadas: notificacoesCriadas
    };

  } catch (error) {
    console.error('❌ Erro ao gerar notificações de vencimento:', error);
    throw error;
  }
};

/**
 * Verificar e criar notificações de vencimento atrasado
 * Verifica assinaturas vencidas e cria notificações
 */
export const gerarNotificacoesVencimentoAtrasado = async () => {
  try {
    console.log('🔔 Iniciando verificação de vencimentos atrasados...');

    const result = await pool.query(`
      SELECT
        a.id as assinatura_id,
        a.company_id,
        a.status,
        a.data_vencimento,
        a.plano_id,
        e.nome as company_nome,
        p.nome as plano_nome,
        p.valor as plano_valor,
        DATE_PART('day', NOW() - a.data_vencimento) as dias_em_atraso
      FROM assinaturas a
      INNER JOIN empresas e ON e.id = a.company_id
      LEFT JOIN planos p ON p.id = a.plano_id
      WHERE a.status = 'OVERDUE'
        AND a.data_vencimento IS NOT NULL
        AND a.data_vencimento < NOW()
      ORDER BY a.data_vencimento ASC
    `);

    const assinaturas = result.rows || [];
    console.log(`📊 Encontradas ${assinaturas.length} assinaturas atrasadas`);

    let notificacoesCriadas = 0;

    for (const assinatura of assinaturas) {
      const diasAtraso = Math.ceil(assinatura.dias_em_atraso);

      // Verificar se já existe notificação similar recente (últimas 24h)
      const notificacaoExistente = await pool.query(`
        SELECT id FROM notifications
        WHERE company_id = $1
          AND tipo = 'vencimento_atrasado'
          AND created_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
      `, [assinatura.company_id]);

      if (notificacaoExistente.rows && notificacaoExistente.rows.length > 0) {
        continue;
      }

      // Criar notificação de atraso
      const titulo = '🚨 Assinatura em atraso';
      const mensagem = `Sua assinatura está ${diasAtraso} dia(s) em atraso. Regularize seu pagamento para continuar usando o sistema.`;

      await pool.query(`
        INSERT INTO notifications (
          company_id,
          tipo,
          titulo,
          mensagem,
          prioridade,
          categoria,
          dados_extras,
          action_url,
          action_label
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        assinatura.company_id,
        'vencimento_atrasado',
        titulo,
        mensagem,
        'urgente',
        'pagamento',
        JSON.stringify({
          dias_atraso: diasAtraso,
          data_vencimento: assinatura.data_vencimento,
          plano_nome: assinatura.plano_nome,
          plano_valor: assinatura.plano_valor
        }),
        '/minha-assinatura',
        'Regularizar Pagamento'
      ]);

      notificacoesCriadas++;
      console.log(`✅ Notificação de atraso criada para ${assinatura.company_nome}`);
    }

    console.log(`🎉 Processo concluído: ${notificacoesCriadas} notificações de atraso criadas`);

    return {
      success: true,
      assinaturas_verificadas: assinaturas.length,
      notificacoes_criadas: notificacoesCriadas
    };

  } catch (error) {
    console.error('❌ Erro ao gerar notificações de atraso:', error);
    throw error;
  }
};

/**
 * Criar notificação de limite atingido
 */
export const criarNotificacaoLimite = async (companyId, tipoLimite, dadosLimite) => {
  try {
    const mensagens = {
      usuarios: {
        titulo: '⚠️ Limite de usuários atingido',
        mensagem: `Você atingiu o limite de ${dadosLimite.maximo} usuários do seu plano. Faça upgrade para adicionar mais usuários.`,
        actionLabel: 'Fazer Upgrade'
      },
      leads: {
        titulo: '⚠️ Limite de leads atingido',
        mensagem: `Você atingiu o limite de ${dadosLimite.maximo} leads do seu plano. Faça upgrade para adicionar mais leads.`,
        actionLabel: 'Fazer Upgrade'
      },
      storage: {
        titulo: '⚠️ Limite de armazenamento atingido',
        mensagem: `Você atingiu o limite de ${dadosLimite.maximo}GB de armazenamento. Faça upgrade para ter mais espaço.`,
        actionLabel: 'Fazer Upgrade'
      }
    };

    const config = mensagens[tipoLimite];

    if (!config) {
      throw new Error(`Tipo de limite inválido: ${tipoLimite}`);
    }

    // Verificar se já existe notificação similar nas últimas 6 horas
    const notificacaoExistente = await pool.query(`
      SELECT id FROM notifications
      WHERE company_id = $1
        AND tipo = 'limite_atingido'
        AND dados_extras->>'tipo_limite' = $2
        AND created_at > NOW() - INTERVAL '6 hours'
      LIMIT 1
    `, [companyId, tipoLimite]);

    if (notificacaoExistente.rows && notificacaoExistente.rows.length > 0) {
      return { success: true, message: 'Notificação similar já existe' };
    }

    await pool.query(`
      INSERT INTO notifications (
        company_id,
        tipo,
        titulo,
        mensagem,
        prioridade,
        categoria,
        dados_extras,
        action_url,
        action_label,
        expira_em
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      companyId,
      'limite_atingido',
      config.titulo,
      config.mensagem,
      'alta',
      'limite',
      JSON.stringify({
        tipo_limite: tipoLimite,
        ...dadosLimite
      }),
      '/minha-assinatura',
      config.actionLabel,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expira em 7 dias
    ]);

    console.log(`✅ Notificação de limite (${tipoLimite}) criada para company ${companyId}`);

    return { success: true };

  } catch (error) {
    console.error('❌ Erro ao criar notificação de limite:', error);
    throw error;
  }
};

/**
 * Executar todas as verificações de notificações automáticas
 */
export const executarVerificacoesAutomaticas = async () => {
  console.log('\n🤖 ======== INICIANDO VERIFICAÇÕES AUTOMÁTICAS ========\n');

  try {
    const resultadoVencimento = await gerarNotificacoesVencimento();
    const resultadoAtraso = await gerarNotificacoesVencimentoAtrasado();

    console.log('\n✅ ======== VERIFICAÇÕES CONCLUÍDAS ========');
    console.log(`📊 Vencimentos: ${resultadoVencimento.notificacoes_criadas} notificações`);
    console.log(`📊 Atrasos: ${resultadoAtraso.notificacoes_criadas} notificações\n`);

    return {
      success: true,
      vencimento: resultadoVencimento,
      atraso: resultadoAtraso
    };
  } catch (error) {
    console.error('\n❌ ======== ERRO NAS VERIFICAÇÕES ========');
    console.error(error);
    throw error;
  }
};
