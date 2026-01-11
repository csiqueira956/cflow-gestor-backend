import pool from '../config/database.js';

/**
 * Controller de Webhooks do Asaas
 * Recebe e processa eventos de pagamento automaticamente
 */

/**
 * Validar assinatura do webhook Asaas (se configurado)
 * O Asaas envia um token de acesso que pode ser validado
 */
const validarAssinaturaAsaas = (req) => {
  // O Asaas pode enviar um header personalizado para validação
  // Exemplo: asaas-access-token
  const token = req.headers['asaas-access-token'] || req.query.access_token;
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

  if (expectedToken && token !== expectedToken) {
    return false;
  }

  return true;
};

/**
 * Processar evento de pagamento confirmado
 * Atualiza assinatura para ACTIVE e define nova data de vencimento
 */
const processarPagamentoConfirmado = async (payload, webhookEventId) => {
  try {
    console.log('💳 Processando pagamento confirmado:', payload.payment?.id);

    const payment = payload.payment;
    const paymentId = payment.id;
    const externalReference = payment.externalReference; // company_id

    if (!externalReference) {
      console.warn('⚠️  Pagamento sem externalReference');
      return { success: false, message: 'ExternalReference não encontrado' };
    }

    // Buscar empresa e assinatura
    const companyResult = await pool.query(
      'SELECT id, nome FROM empresas WHERE id = $1',
      [externalReference]
    );

    if (!companyResult.rows || companyResult.rows.length === 0) {
      console.warn('⚠️  Empresa não encontrada:', externalReference);
      return { success: false, message: 'Empresa não encontrada' };
    }

    const company = companyResult.rows[0];

    // Buscar assinatura
    const assinaturaResult = await pool.query(
      'SELECT id FROM assinaturas WHERE company_id = $1',
      [company.id]
    );
    const assinaturaId = assinaturaResult.rows[0]?.id;

    // Atualizar assinatura
    const hoje = new Date();
    const proximoVencimento = new Date(hoje);
    proximoVencimento.setMonth(proximoVencimento.getMonth() + 1);

    await pool.query(`
      UPDATE assinaturas
      SET
        status = 'ACTIVE',
        data_vencimento = $1,
        updated_at = NOW()
      WHERE company_id = $2
    `, [proximoVencimento, company.id]);

    // Registrar pagamento
    await pool.query(`
      INSERT INTO pagamentos (
        company_id,
        assinatura_id,
        valor,
        status,
        metodo_pagamento,
        asaas_payment_id,
        asaas_invoice_url,
        data_pagamento,
        webhook_event_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      company.id,
      assinaturaId,
      payment.value || 0,
      'paid',
      payment.billingType || 'UNDEFINED',
      paymentId,
      payment.invoiceUrl,
      payment.paymentDate || payment.confirmedDate || new Date(),
      webhookEventId
    ]);

    // Criar notificação de pagamento confirmado
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
      company.id,
      'sistema',
      '✅ Pagamento Confirmado',
      `Seu pagamento de R$ ${(payment.value || 0).toFixed(2)} foi confirmado. Sua assinatura foi renovada até ${proximoVencimento.toLocaleDateString('pt-BR')}.`,
      'normal',
      'pagamento',
      JSON.stringify({
        payment_id: paymentId,
        valor: payment.value,
        data_pagamento: payment.paymentDate || payment.confirmedDate,
        proximo_vencimento: proximoVencimento
      }),
      '/minha-assinatura',
      'Ver Assinatura'
    ]);

    console.log(`✅ Pagamento processado para ${company.nome}`);

    return { success: true, message: 'Pagamento confirmado processado' };

  } catch (error) {
    console.error('❌ Erro ao processar pagamento confirmado:', error);
    throw error;
  }
};

/**
 * Processar evento de pagamento recebido
 * Similar ao confirmado, mas pode ter tratamento diferente
 */
const processarPagamentoRecebido = async (payload, webhookEventId) => {
  // Para Asaas, PAYMENT_RECEIVED geralmente é o mesmo que PAYMENT_CONFIRMED
  return processarPagamentoConfirmado(payload, webhookEventId);
};

/**
 * Processar evento de pagamento vencido
 * Atualiza status para OVERDUE
 */
const processarPagamentoVencido = async (payload, webhookEventId) => {
  try {
    console.log('⏰ Processando pagamento vencido:', payload.payment?.id);

    const payment = payload.payment;
    const externalReference = payment.externalReference;

    if (!externalReference) {
      return { success: false, message: 'ExternalReference não encontrado' };
    }

    // Atualizar assinatura para OVERDUE
    await pool.query(`
      UPDATE assinaturas
      SET
        status = 'OVERDUE',
        updated_at = NOW()
      WHERE company_id = $1
    `, [externalReference]);

    // Buscar nome da empresa
    const companyResult = await pool.query(
      'SELECT nome FROM empresas WHERE id = $1',
      [externalReference]
    );
    const companyNome = companyResult.rows[0]?.nome || 'Empresa';

    // Criar notificação de pagamento vencido
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
      externalReference,
      'vencimento_atrasado',
      '🚨 Pagamento Vencido',
      'Seu pagamento está vencido. Regularize sua situação para continuar usando o sistema.',
      'urgente',
      'pagamento',
      JSON.stringify({
        payment_id: payment.id,
        valor: payment.value,
        data_vencimento: payment.dueDate
      }),
      '/minha-assinatura',
      'Regularizar Pagamento'
    ]);

    console.log(`✅ Pagamento vencido processado para ${companyNome}`);

    return { success: true, message: 'Pagamento vencido processado' };

  } catch (error) {
    console.error('❌ Erro ao processar pagamento vencido:', error);
    throw error;
  }
};

/**
 * Processar evento de assinatura cancelada
 */
const processarAssinaturaCancelada = async (payload, webhookEventId) => {
  try {
    console.log('❌ Processando assinatura cancelada:', payload.subscription?.id);

    const subscription = payload.subscription;
    const externalReference = subscription.externalReference;

    if (!externalReference) {
      return { success: false, message: 'ExternalReference não encontrado' };
    }

    // Atualizar assinatura para CANCELLED
    await pool.query(`
      UPDATE assinaturas
      SET
        status = 'CANCELLED',
        asaas_subscription_id = NULL,
        updated_at = NOW()
      WHERE company_id = $1
    `, [externalReference]);

    // Criar notificação
    await pool.query(`
      INSERT INTO notifications (
        company_id,
        tipo,
        titulo,
        mensagem,
        prioridade,
        categoria,
        action_url,
        action_label
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      externalReference,
      'sistema',
      '❌ Assinatura Cancelada',
      'Sua assinatura foi cancelada. Entre em contato se precisar reativar.',
      'alta',
      'assinatura',
      '/minha-assinatura',
      'Contatar Suporte'
    ]);

    console.log('✅ Assinatura cancelada processada');

    return { success: true, message: 'Assinatura cancelada processada' };

  } catch (error) {
    console.error('❌ Erro ao processar cancelamento:', error);
    throw error;
  }
};

/**
 * Endpoint principal que recebe webhooks do Asaas
 * POST /api/webhooks/asaas
 */
export const receberWebhookAsaas = async (req, res) => {
  let webhookEventId = null;

  try {
    console.log('\n🔔 ========== WEBHOOK ASAAS RECEBIDO ==========');
    console.log('Event Type:', req.body.event);
    console.log('Payload:', JSON.stringify(req.body, null, 2));

    // Validar assinatura (se configurado)
    if (process.env.ASAAS_WEBHOOK_TOKEN && !validarAssinaturaAsaas(req)) {
      console.error('❌ Assinatura inválida');
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    const { event, payment, subscription } = req.body;
    const eventId = req.body.id || `${event}_${Date.now()}`;

    // Registrar evento no banco
    const webhookResult = await pool.query(`
      INSERT INTO webhook_events (
        event_id,
        event_type,
        payment_id,
        subscription_id,
        payload,
        status,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      eventId,
      event,
      payment?.id,
      subscription?.id,
      JSON.stringify(req.body),
      'processing',
      req.ip,
      req.headers['user-agent']
    ]);

    webhookEventId = webhookResult.rows[0].id;

    // Processar evento baseado no tipo
    let resultado;

    switch (event) {
      case 'PAYMENT_CONFIRMED':
        resultado = await processarPagamentoConfirmado(req.body, webhookEventId);
        break;

      case 'PAYMENT_RECEIVED':
        resultado = await processarPagamentoRecebido(req.body, webhookEventId);
        break;

      case 'PAYMENT_OVERDUE':
        resultado = await processarPagamentoVencido(req.body, webhookEventId);
        break;

      case 'SUBSCRIPTION_CANCELLED':
        resultado = await processarAssinaturaCancelada(req.body, webhookEventId);
        break;

      default:
        console.log(`ℹ️  Evento ${event} não possui handler específico`);
        resultado = { success: true, message: 'Evento registrado mas não processado' };
    }

    // Atualizar status do webhook event
    await pool.query(`
      UPDATE webhook_events
      SET
        status = $1,
        processed_at = NOW(),
        company_id = (
          SELECT id FROM empresas
          WHERE id = $2::INTEGER
          LIMIT 1
        )
      WHERE id = $3
    `, [
      resultado.success ? 'processed' : 'failed',
      payment?.externalReference || subscription?.externalReference,
      webhookEventId
    ]);

    console.log('✅ Webhook processado com sucesso');
    console.log('========================================\n');

    // Asaas espera resposta 200 OK
    return res.status(200).json({
      success: true,
      message: 'Webhook processado',
      event_id: eventId
    });

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);

    // Registrar erro no banco
    if (webhookEventId) {
      await pool.query(`
        UPDATE webhook_events
        SET
          status = 'failed',
          error_message = $1,
          retry_count = retry_count + 1
        WHERE id = $2
      `, [error.message, webhookEventId]);
    }

    // Retornar 200 mesmo com erro para não fazer Asaas retentar imediatamente
    return res.status(200).json({
      success: false,
      message: 'Erro ao processar webhook',
      error: error.message
    });
  }
};

/**
 * Listar logs de webhooks (apenas super admin)
 * GET /api/webhooks/logs
 */
export const listarWebhookLogs = async (req, res) => {
  try {
    const { limit = 50, offset = 0, event_type, status } = req.query;

    let query = `
      SELECT
        we.*,
        e.nome as company_nome
      FROM webhook_events we
      LEFT JOIN empresas e ON e.id = we.company_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (event_type) {
      query += ` AND we.event_type = $${paramCount}`;
      params.push(event_type);
      paramCount++;
    }

    if (status) {
      query += ` AND we.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY we.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Contar total
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM webhook_events'
    );

    res.json({
      success: true,
      logs: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Erro ao listar webhook logs:', error);
    res.status(500).json({
      error: 'Erro ao listar logs',
      message: error.message
    });
  }
};

/**
 * Reprocessar webhook que falhou
 * POST /api/webhooks/reprocess/:id
 */
export const reprocessarWebhook = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar webhook event
    const result = await pool.query(
      'SELECT * FROM webhook_events WHERE id = $1',
      [id]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook não encontrado' });
    }

    const webhookEvent = result.rows[0];

    // Atualizar status para processing
    await pool.query(
      'UPDATE webhook_events SET status = $1 WHERE id = $2',
      ['processing', id]
    );

    // Reprocessar
    const payload = webhookEvent.payload;
    let resultado;

    switch (webhookEvent.event_type) {
      case 'PAYMENT_CONFIRMED':
        resultado = await processarPagamentoConfirmado(payload, id);
        break;
      case 'PAYMENT_RECEIVED':
        resultado = await processarPagamentoRecebido(payload, id);
        break;
      case 'PAYMENT_OVERDUE':
        resultado = await processarPagamentoVencido(payload, id);
        break;
      case 'SUBSCRIPTION_CANCELLED':
        resultado = await processarAssinaturaCancelada(payload, id);
        break;
      default:
        resultado = { success: false, message: 'Tipo de evento não suportado' };
    }

    // Atualizar status
    await pool.query(`
      UPDATE webhook_events
      SET
        status = $1,
        processed_at = NOW(),
        error_message = $2,
        retry_count = retry_count + 1
      WHERE id = $3
    `, [
      resultado.success ? 'processed' : 'failed',
      resultado.message,
      id
    ]);

    res.json({
      success: resultado.success,
      message: 'Webhook reprocessado',
      resultado
    });

  } catch (error) {
    console.error('Erro ao reprocessar webhook:', error);
    res.status(500).json({
      error: 'Erro ao reprocessar webhook',
      message: error.message
    });
  }
};
