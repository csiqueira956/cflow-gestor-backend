import pool from '../config/database.js';
import Subscription from '../models/Subscription.js';
import Invoice from '../models/Invoice.js';

/**
 * Webhook do Asaas para notificações de pagamento
 * POST /api/webhooks/asaas
 */
export const asaasWebhook = async (req, res) => {
  try {
    const event = req.body;

    // Salvar evento no banco
    await pool.query(
      `INSERT INTO webhook_events (gateway, event_type, event_id, payload, processed)
       VALUES ($1, $2, $3, $4, $5)`,
      ['asaas', event.event, event.id || Date.now().toString(), JSON.stringify(event), false]
    );

    // Processar evento
    await processAsaasEvent(event);

    // Marcar como processado
    await pool.query(
      `UPDATE webhook_events
       SET processed = true, processed_at = NOW()
       WHERE event_id = $1`,
      [event.id || Date.now().toString()]
    );

    // Responder 200 para Asaas saber que recebemos
    return res.status(200).json({ received: true });
  } catch (error) {
    // Salvar erro no banco
    try {
      await pool.query(
        `UPDATE webhook_events
         SET error_message = $1, retry_count = retry_count + 1
         WHERE event_id = $2`,
        [error.message, req.body.id || Date.now().toString()]
      );
    } catch (dbError) {
      // Erro silencioso ao salvar log
    }

    // Sempre responder 200 para não ficar retentando
    return res.status(200).json({ error: error.message });
  }
};

/**
 * Processar diferentes tipos de eventos do Asaas
 */
async function processAsaasEvent(event) {
  const { event: eventType, payment } = event;

  if (!payment) {
    return;
  }

  switch (eventType) {
    case 'PAYMENT_CREATED':
      await handlePaymentCreated(payment);
      break;

    case 'PAYMENT_UPDATED':
      await handlePaymentUpdated(payment);
      break;

    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
      await handlePaymentConfirmed(payment);
      break;

    case 'PAYMENT_OVERDUE':
      await handlePaymentOverdue(payment);
      break;

    case 'PAYMENT_DELETED':
    case 'PAYMENT_REFUNDED':
      await handlePaymentCancelled(payment);
      break;

    default:
      // Evento não tratado
      break;
  }
}

/**
 * Pagamento criado
 */
async function handlePaymentCreated(payment) {
  const invoiceResult = await pool.query(
    'SELECT * FROM invoices WHERE gateway_invoice_id = $1',
    [payment.id]
  );

  if (invoiceResult.rows.length === 0) {
    return;
  }

  const invoice = invoiceResult.rows[0];

  await pool.query(
    `UPDATE invoices
     SET gateway_invoice_url = $1, gateway_pdf_url = $2
     WHERE id = $3`,
    [payment.invoiceUrl, payment.bankSlipUrl, invoice.id]
  );
}

/**
 * Pagamento atualizado
 */
async function handlePaymentUpdated(payment) {
  // Apenas log interno, sem ação necessária
}

/**
 * Pagamento confirmado/recebido
 */
async function handlePaymentConfirmed(payment) {
  const invoiceResult = await pool.query(
    'SELECT * FROM invoices WHERE gateway_invoice_id = $1',
    [payment.id]
  );

  if (invoiceResult.rows.length === 0) {
    return;
  }

  const invoice = invoiceResult.rows[0];

  await Invoice.markAsPaid(invoice.id, invoice.company_id);

  const subscription = await Subscription.findById(invoice.subscription_id);

  if (!subscription) {
    return;
  }

  if (subscription.status === 'trialing' || subscription.status === 'pending') {
    await Subscription.activate(subscription.id, subscription.company_id);
  }

  if (subscription.status === 'past_due') {
    await pool.query(
      `UPDATE subscriptions SET status = 'active' WHERE id = $1`,
      [subscription.id]
    );
  }
}

/**
 * Pagamento vencido
 */
async function handlePaymentOverdue(payment) {
  const invoiceResult = await pool.query(
    'SELECT * FROM invoices WHERE gateway_invoice_id = $1',
    [payment.id]
  );

  if (invoiceResult.rows.length === 0) {
    return;
  }

  const invoice = invoiceResult.rows[0];

  await Invoice.markAsFailed(invoice.id, invoice.company_id);

  const subscription = await Subscription.findById(invoice.subscription_id);

  if (subscription && subscription.status === 'active') {
    await pool.query(
      `UPDATE subscriptions SET status = 'past_due' WHERE id = $1`,
      [subscription.id]
    );

    await pool.query(
      `INSERT INTO subscription_history (
        subscription_id, company_id, event_type,
        old_status, new_status, description
      ) VALUES ($1, $2, 'overdue', 'active', 'past_due', 'Pagamento vencido')`,
      [subscription.id, subscription.company_id]
    );
  }
}

/**
 * Pagamento cancelado/reembolsado
 */
async function handlePaymentCancelled(payment) {
  const invoiceResult = await pool.query(
    'SELECT * FROM invoices WHERE gateway_invoice_id = $1',
    [payment.id]
  );

  if (invoiceResult.rows.length === 0) {
    return;
  }

  const invoice = invoiceResult.rows[0];

  await Invoice.cancel(invoice.id, invoice.company_id);
}

/**
 * Health check do webhook
 * GET /api/webhooks/health
 */
export const webhookHealth = (req, res) => {
  return res.json({
    status: 'ok',
    message: 'Webhook endpoint funcionando',
    timestamp: new Date().toISOString()
  });
};

export default {
  asaasWebhook,
  webhookHealth
};
