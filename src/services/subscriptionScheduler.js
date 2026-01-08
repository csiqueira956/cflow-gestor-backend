import cron from 'node-cron';
import pool from '../config/database.js';
import { clearSubscriptionCache } from '../middleware/checkSubscription.js';

/**
 * Scheduler para gerenciar assinaturas
 * - Verifica assinaturas vencidas e marca como OVERDUE
 * - Verifica trials expirados e marca como EXPIRED
 * - Executa todos os dias às 00:00 (meia-noite)
 */

/**
 * Atualizar assinaturas vencidas para OVERDUE
 */
export async function checkOverdueSubscriptions() {
  try {
    console.log('🔄 [SCHEDULER] Verificando assinaturas vencidas...');

    const now = new Date().toISOString();

    // Buscar assinaturas ACTIVE com data de vencimento passada
    const overdueResult = await pool.query(`
      SELECT
        a.id,
        a.company_id,
        a.status,
        a.data_proximo_vencimento
      FROM assinaturas a
      WHERE a.status = 'ACTIVE'
        AND a.data_proximo_vencimento IS NOT NULL
        AND a.data_proximo_vencimento < $1
    `, [now]);

    const overdueSubscriptions = overdueResult.rows || [];

    if (overdueSubscriptions.length === 0) {
      console.log('✅ [SCHEDULER] Nenhuma assinatura vencida encontrada');
      return { updated: 0 };
    }

    console.log(`⚠️  [SCHEDULER] Encontradas ${overdueSubscriptions.length} assinaturas vencidas`);

    // Atualizar status para OVERDUE
    let updated = 0;
    for (const subscription of overdueSubscriptions) {
      try {
        await pool.query(`
          UPDATE assinaturas
          SET status = 'OVERDUE',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [subscription.id]);

        // Limpar cache da assinatura
        clearSubscriptionCache(subscription.company_id);

        console.log(`  ↳ Empresa ${subscription.company_id}: ACTIVE → OVERDUE (vencimento: ${subscription.data_proximo_vencimento})`);
        updated++;
      } catch (error) {
        console.error(`  ✗ Erro ao atualizar empresa ${subscription.company_id}:`, error.message);
      }
    }

    console.log(`✅ [SCHEDULER] ${updated} assinaturas marcadas como OVERDUE`);
    return { updated };

  } catch (error) {
    console.error('❌ [SCHEDULER] Erro ao verificar assinaturas vencidas:', error);
    throw error;
  }
}

/**
 * Verificar e expirar trials que acabaram
 */
export async function checkExpiredTrials() {
  try {
    console.log('🔄 [SCHEDULER] Verificando trials expirados...');

    const now = new Date().toISOString();

    // Buscar assinaturas TRIAL com data de fim do trial passada
    const expiredTrialsResult = await pool.query(`
      SELECT
        a.id,
        a.company_id,
        a.status,
        a.data_fim_trial
      FROM assinaturas a
      WHERE a.status = 'TRIAL'
        AND a.data_fim_trial IS NOT NULL
        AND a.data_fim_trial < $1
    `, [now]);

    const expiredTrials = expiredTrialsResult.rows || [];

    if (expiredTrials.length === 0) {
      console.log('✅ [SCHEDULER] Nenhum trial expirado encontrado');
      return { updated: 0 };
    }

    console.log(`⚠️  [SCHEDULER] Encontrados ${expiredTrials.length} trials expirados`);

    // Atualizar status para EXPIRED
    let updated = 0;
    for (const subscription of expiredTrials) {
      try {
        await pool.query(`
          UPDATE assinaturas
          SET status = 'EXPIRED',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [subscription.id]);

        // Limpar cache da assinatura
        clearSubscriptionCache(subscription.company_id);

        console.log(`  ↳ Empresa ${subscription.company_id}: TRIAL → EXPIRED (trial fim: ${subscription.data_fim_trial})`);
        updated++;
      } catch (error) {
        console.error(`  ✗ Erro ao atualizar empresa ${subscription.company_id}:`, error.message);
      }
    }

    console.log(`✅ [SCHEDULER] ${updated} trials marcados como EXPIRED`);
    return { updated };

  } catch (error) {
    console.error('❌ [SCHEDULER] Erro ao verificar trials expirados:', error);
    throw error;
  }
}

/**
 * Função principal de verificação de assinaturas
 */
export async function checkAllSubscriptions() {
  try {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🕐 [SCHEDULER] Iniciando verificação de assinaturas');
    console.log(`⏰ Horário: ${new Date().toLocaleString('pt-BR')}`);
    console.log('═══════════════════════════════════════════════════════\n');

    const overdueResult = await checkOverdueSubscriptions();
    const expiredResult = await checkExpiredTrials();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ [SCHEDULER] Verificação concluída');
    console.log(`  ↳ Assinaturas vencidas: ${overdueResult.updated}`);
    console.log(`  ↳ Trials expirados: ${expiredResult.updated}`);
    console.log('═══════════════════════════════════════════════════════\n');

    return {
      success: true,
      overdue: overdueResult.updated,
      expired: expiredResult.updated,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ [SCHEDULER] Erro na verificação de assinaturas:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Inicializar schedulers
 */
export function initSubscriptionScheduler() {
  console.log('⏰ Inicializando scheduler de assinaturas...');

  // Executar todos os dias à meia-noite (00:00)
  cron.schedule('0 0 * * *', async () => {
    await checkAllSubscriptions();
  });

  // Executar também a cada 6 horas (para desenvolvimento/monitoramento)
  // Remover em produção se necessário
  cron.schedule('0 */6 * * *', async () => {
    console.log('\n🔄 [SCHEDULER] Verificação periódica (a cada 6 horas)');
    await checkAllSubscriptions();
  });

  console.log('✅ Scheduler de assinaturas iniciado');
  console.log('  ↳ Verificação diária: 00:00 (meia-noite)');
  console.log('  ↳ Verificação periódica: a cada 6 horas');

  // Executar uma vez ao iniciar (para testes)
  setTimeout(async () => {
    console.log('\n🚀 Executando verificação inicial de assinaturas...');
    await checkAllSubscriptions();
  }, 5000); // Aguarda 5 segundos após inicialização
}

export default {
  initSubscriptionScheduler,
  checkAllSubscriptions,
  checkOverdueSubscriptions,
  checkExpiredTrials
};
