import pool from '../config/database.js';

class Subscription {
  /**
   * Buscar assinatura ativa da empresa
   */
  static async findActiveByCompanyId(companyId) {
    const query = `
      SELECT
        s.*,
        p.name as plan_name,
        p.slug as plan_slug,
        p.price as plan_price,
        p.billing_cycle,
        p.max_users,
        p.max_leads,
        p.max_storage_gb,
        p.max_equipes,
        p.features as plan_features
      FROM subscriptions s
      INNER JOIN plans p ON s.plan_id = p.id
      WHERE s.company_id = $1
        AND s.status IN ('active', 'trialing')
      ORDER BY s.created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [companyId]);
    return result.rows[0];
  }

  /**
   * Buscar assinatura por ID
   */
  static async findById(id, companyId = null) {
    let query = `
      SELECT
        s.*,
        p.name as plan_name,
        p.slug as plan_slug,
        p.price as plan_price,
        p.billing_cycle,
        p.max_users,
        p.max_leads,
        p.max_storage_gb,
        p.max_equipes,
        p.features as plan_features
      FROM subscriptions s
      INNER JOIN plans p ON s.plan_id = p.id
      WHERE s.id = $1
    `;

    const params = [id];

    // Filtrar por company_id se fornecido (segurança multi-tenant)
    if (companyId) {
      query += ` AND s.company_id = $2`;
      params.push(companyId);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Criar nova assinatura (trial automático)
   */
  static async createTrial(companyId, planId = null) {
    const query = `SELECT create_trial_subscription($1, $2) as subscription_id`;
    const result = await pool.query(query, [companyId, planId]);
    const subscriptionId = result.rows[0].subscription_id;

    // Buscar a assinatura criada
    return await this.findById(subscriptionId);
  }

  /**
   * Criar assinatura paga
   */
  static async create({
    companyId,
    planId,
    status = 'pending',
    gatewaySubscriptionId = null,
    gatewayCustomerId = null,
    trialEndsAt = null
  }) {
    // Buscar billing_cycle do plano
    const planResult = await pool.query(
      'SELECT billing_cycle FROM plans WHERE id = $1',
      [planId]
    );

    if (planResult.rows.length === 0) {
      throw new Error('Plano não encontrado');
    }

    const billingCycle = planResult.rows[0].billing_cycle;

    const query = `
      INSERT INTO subscriptions (
        company_id,
        plan_id,
        status,
        current_period_start,
        current_period_end,
        trial_ends_at,
        gateway_subscription_id,
        gateway_customer_id
      )
      VALUES (
        $1, $2, $3, NOW(),
        calculate_period_end(NOW(), $4),
        $5, $6, $7
      )
      RETURNING *
    `;

    const values = [
      companyId,
      planId,
      status,
      billingCycle,
      trialEndsAt,
      gatewaySubscriptionId,
      gatewayCustomerId
    ];

    const result = await pool.query(query, values);
    const subscription = result.rows[0];

    // Registrar no histórico
    await pool.query(
      `
      INSERT INTO subscription_history (
        subscription_id, company_id, event_type,
        new_plan_id, new_status, description
      )
      VALUES ($1, $2, 'created', $3, $4, $5)
    `,
      [
        subscription.id,
        companyId,
        planId,
        status,
        `Assinatura criada com status: ${status}`
      ]
    );

    return await this.findById(subscription.id);
  }

  /**
   * Ativar assinatura (após pagamento)
   */
  static async activate(subscriptionId, companyId) {
    const query = `
      UPDATE subscriptions
      SET status = 'active'
      WHERE id = $1 AND company_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [subscriptionId, companyId]);

    if (result.rows.length === 0) {
      throw new Error('Assinatura não encontrada');
    }

    // Registrar no histórico
    await pool.query(
      `
      INSERT INTO subscription_history (
        subscription_id, company_id, event_type,
        old_status, new_status, description
      )
      VALUES ($1, $2, 'activated', 'pending', 'active', 'Pagamento confirmado')
    `,
      [subscriptionId, companyId]
    );

    return await this.findById(subscriptionId);
  }

  /**
   * Fazer upgrade/downgrade de plano
   */
  static async changePlan(subscriptionId, companyId, newPlanId, userId = null) {
    // Buscar assinatura atual
    const currentSub = await this.findById(subscriptionId, companyId);

    if (!currentSub) {
      throw new Error('Assinatura não encontrada');
    }

    const oldPlanId = currentSub.plan_id;

    // Atualizar plano
    const query = `
      UPDATE subscriptions
      SET plan_id = $1
      WHERE id = $2 AND company_id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [newPlanId, subscriptionId, companyId]);

    // Determinar se é upgrade ou downgrade
    const planComparison = await pool.query(
      'SELECT price FROM plans WHERE id IN ($1, $2)',
      [oldPlanId, newPlanId]
    );

    const isUpgrade =
      planComparison.rows.find((p) => p.id === newPlanId).price >
      planComparison.rows.find((p) => p.id === oldPlanId).price;

    // Registrar no histórico
    await pool.query(
      `
      INSERT INTO subscription_history (
        subscription_id, company_id, event_type,
        old_plan_id, new_plan_id, changed_by_user_id, description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        subscriptionId,
        companyId,
        isUpgrade ? 'upgraded' : 'downgraded',
        oldPlanId,
        newPlanId,
        userId,
        `Plano ${isUpgrade ? 'atualizado' : 'reduzido'}`
      ]
    );

    return await this.findById(subscriptionId);
  }

  /**
   * Cancelar assinatura
   */
  static async cancel(subscriptionId, companyId, immediate = false, userId = null) {
    const query = immediate
      ? `
        UPDATE subscriptions
        SET status = 'cancelled', cancelled_at = NOW()
        WHERE id = $1 AND company_id = $2
        RETURNING *
      `
      : `
        UPDATE subscriptions
        SET cancel_at_period_end = true, cancelled_at = NOW()
        WHERE id = $1 AND company_id = $2
        RETURNING *
      `;

    const result = await pool.query(query, [subscriptionId, companyId]);

    if (result.rows.length === 0) {
      throw new Error('Assinatura não encontrada');
    }

    // Registrar no histórico
    await pool.query(
      `
      INSERT INTO subscription_history (
        subscription_id, company_id, event_type,
        old_status, new_status, changed_by_user_id, description
      )
      VALUES ($1, $2, 'cancelled', 'active', 'cancelled', $3, $4)
    `,
      [
        subscriptionId,
        companyId,
        userId,
        immediate
          ? 'Cancelamento imediato'
          : 'Cancelamento agendado para fim do período'
      ]
    );

    return await this.findById(subscriptionId);
  }

  /**
   * Reativar assinatura cancelada
   */
  static async reactivate(subscriptionId, companyId, userId = null) {
    const query = `
      UPDATE subscriptions
      SET
        status = 'active',
        cancel_at_period_end = false,
        cancelled_at = NULL
      WHERE id = $1 AND company_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [subscriptionId, companyId]);

    if (result.rows.length === 0) {
      throw new Error('Assinatura não encontrada');
    }

    // Registrar no histórico
    await pool.query(
      `
      INSERT INTO subscription_history (
        subscription_id, company_id, event_type,
        old_status, new_status, changed_by_user_id, description
      )
      VALUES ($1, $2, 'renewed', 'cancelled', 'active', $3, 'Assinatura reativada')
    `,
      [subscriptionId, companyId, userId]
    );

    return await this.findById(subscriptionId);
  }

  /**
   * Renovar assinatura (criar novo período)
   */
  static async renew(subscriptionId, companyId) {
    const query = `
      UPDATE subscriptions
      SET
        current_period_start = current_period_end,
        current_period_end = calculate_period_end(current_period_end, (
          SELECT billing_cycle FROM plans WHERE id = plan_id
        ))
      WHERE id = $1 AND company_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [subscriptionId, companyId]);

    if (result.rows.length === 0) {
      throw new Error('Assinatura não encontrada');
    }

    // Registrar no histórico
    await pool.query(
      `
      INSERT INTO subscription_history (
        subscription_id, company_id, event_type, description
      )
      VALUES ($1, $2, 'renewed', 'Assinatura renovada automaticamente')
    `,
      [subscriptionId, companyId]
    );

    return await this.findById(subscriptionId);
  }

  /**
   * Listar histórico da assinatura
   */
  static async getHistory(subscriptionId, companyId) {
    const query = `
      SELECT
        sh.*,
        u.nome as changed_by_user_name,
        old_plan.name as old_plan_name,
        new_plan.name as new_plan_name
      FROM subscription_history sh
      LEFT JOIN usuarios u ON sh.changed_by_user_id = u.id
      LEFT JOIN plans old_plan ON sh.old_plan_id = old_plan.id
      LEFT JOIN plans new_plan ON sh.new_plan_id = new_plan.id
      WHERE sh.subscription_id = $1 AND sh.company_id = $2
      ORDER BY sh.created_at DESC
    `;

    const result = await pool.query(query, [subscriptionId, companyId]);
    return result.rows;
  }

  /**
   * Verificar se assinatura está em trial
   */
  static async isInTrial(subscriptionId) {
    const query = `
      SELECT
        status,
        trial_ends_at,
        trial_ends_at > NOW() as is_trial_active
      FROM subscriptions
      WHERE id = $1
    `;

    const result = await pool.query(query, [subscriptionId]);
    const sub = result.rows[0];

    return sub && sub.status === 'trialing' && sub.is_trial_active;
  }

  /**
   * Verificar se assinatura está ativa (incluindo trial)
   */
  static async isActive(companyId) {
    const query = `
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE company_id = $1
        AND status IN ('active', 'trialing')
    `;

    const result = await pool.query(query, [companyId]);
    return parseInt(result.rows[0].count) > 0;
  }
}

export default Subscription;
