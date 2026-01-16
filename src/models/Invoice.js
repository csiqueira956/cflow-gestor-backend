import pool from '../config/database.js';

class Invoice {
  /**
   * Criar nova fatura
   */
  static async create({
    subscriptionId,
    companyId,
    amount,
    dueDate,
    description = null,
    gatewayInvoiceId = null,
    gatewayInvoiceUrl = null,
    gatewayPdfUrl = null
  }) {
    const query = `
      INSERT INTO invoices (
        subscription_id,
        company_id,
        amount,
        due_date,
        description,
        gateway_invoice_id,
        gateway_invoice_url,
        gateway_pdf_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      subscriptionId,
      companyId,
      amount,
      dueDate,
      description,
      gatewayInvoiceId,
      gatewayInvoiceUrl,
      gatewayPdfUrl
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Buscar fatura por ID
   */
  static async findById(id, companyId = null) {
    let query = `
      SELECT
        i.*,
        s.plan_id,
        p.name as plan_name
      FROM invoices i
      INNER JOIN subscriptions s ON i.subscription_id = s.id
      INNER JOIN plans p ON s.plan_id = p.id
      WHERE i.id = $1
    `;

    const params = [id];

    if (companyId) {
      query += ` AND i.company_id = $2`;
      params.push(companyId);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Buscar fatura por gateway_invoice_id
   */
  static async findByGatewayId(gatewayInvoiceId) {
    const query = `
      SELECT * FROM invoices
      WHERE gateway_invoice_id = $1
    `;

    const result = await pool.query(query, [gatewayInvoiceId]);
    return result.rows[0];
  }

  /**
   * Listar faturas de uma empresa
   */
  static async listByCompanyId(companyId, { status = null, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT
        i.*,
        s.plan_id,
        p.name as plan_name,
        p.slug as plan_slug
      FROM invoices i
      INNER JOIN subscriptions s ON i.subscription_id = s.id
      INNER JOIN plans p ON s.plan_id = p.id
      WHERE i.company_id = $1
    `;

    const params = [companyId];
    let paramIndex = 2;

    if (status) {
      query += ` AND i.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Listar faturas de uma assinatura
   */
  static async listBySubscriptionId(subscriptionId, companyId) {
    const query = `
      SELECT * FROM invoices
      WHERE subscription_id = $1 AND company_id = $2
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [subscriptionId, companyId]);
    return result.rows;
  }

  /**
   * Marcar fatura como paga
   */
  static async markAsPaid(id, companyId) {
    const query = `
      UPDATE invoices
      SET
        status = 'paid',
        paid_at = NOW()
      WHERE id = $1 AND company_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [id, companyId]);

    if (result.rows.length === 0) {
      throw new Error('Fatura não encontrada');
    }

    return result.rows[0];
  }

  /**
   * Marcar fatura como falha
   */
  static async markAsFailed(id, companyId) {
    const query = `
      UPDATE invoices
      SET
        status = 'failed',
        attempt_count = attempt_count + 1,
        last_attempt_at = NOW()
      WHERE id = $1 AND company_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [id, companyId]);

    if (result.rows.length === 0) {
      throw new Error('Fatura não encontrada');
    }

    return result.rows[0];
  }

  /**
   * Cancelar fatura
   */
  static async cancel(id, companyId) {
    const query = `
      UPDATE invoices
      SET status = 'cancelled'
      WHERE id = $1 AND company_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [id, companyId]);

    if (result.rows.length === 0) {
      throw new Error('Fatura não encontrada');
    }

    return result.rows[0];
  }

  /**
   * Atualizar URLs do gateway (boleto, pix, etc)
   */
  static async updateGatewayUrls(id, { invoiceUrl, pdfUrl }) {
    const query = `
      UPDATE invoices
      SET
        gateway_invoice_url = COALESCE($2, gateway_invoice_url),
        gateway_pdf_url = COALESCE($3, gateway_pdf_url)
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id, invoiceUrl, pdfUrl]);
    return result.rows[0];
  }

  /**
   * Buscar faturas vencidas
   */
  static async findOverdue(companyId = null) {
    let query = `
      SELECT
        i.*,
        s.company_id,
        c.nome as company_name,
        c.email as company_email
      FROM invoices i
      INNER JOIN subscriptions s ON i.subscription_id = s.id
      INNER JOIN companies c ON i.company_id = c.id
      WHERE i.status = 'pending'
        AND i.due_date < CURRENT_DATE
    `;

    const params = [];

    if (companyId) {
      query += ` AND i.company_id = $1`;
      params.push(companyId);
    }

    query += ` ORDER BY i.due_date ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Buscar faturas próximas do vencimento
   */
  static async findUpcoming(days = 7, companyId = null) {
    let query = `
      SELECT
        i.*,
        s.company_id,
        c.nome as company_name,
        c.email as company_email,
        p.name as plan_name
      FROM invoices i
      INNER JOIN subscriptions s ON i.subscription_id = s.id
      INNER JOIN companies c ON i.company_id = c.id
      INNER JOIN plans p ON s.plan_id = p.id
      WHERE i.status = 'pending'
        AND i.due_date >= CURRENT_DATE
        AND i.due_date <= CURRENT_DATE + INTERVAL '${days} days'
    `;

    const params = [];

    if (companyId) {
      query += ` AND i.company_id = $1`;
      params.push(companyId);
    }

    query += ` ORDER BY i.due_date ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Estatísticas de faturas de uma empresa
   */
  static async getStats(companyId) {
    const query = `
      SELECT
        COUNT(*) as total_invoices,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE status = 'pending' AND due_date < CURRENT_DATE) as overdue_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as total_paid,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as total_pending,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending' AND due_date < CURRENT_DATE), 0) as total_overdue
      FROM invoices
      WHERE company_id = $1
    `;

    const result = await pool.query(query, [companyId]);
    return result.rows[0];
  }

  /**
   * Obter próxima fatura pendente
   */
  static async getNextPending(companyId) {
    const query = `
      SELECT * FROM invoices
      WHERE company_id = $1 AND status = 'pending'
      ORDER BY due_date ASC
      LIMIT 1
    `;

    const result = await pool.query(query, [companyId]);
    return result.rows[0];
  }
}

export default Invoice;
