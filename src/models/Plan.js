import pool from '../config/database.js';

class Plan {
  /**
   * Listar todos os planos ativos
   */
  static async listActive() {
    const query = `
      SELECT
        id, name, slug, description, price, billing_cycle,
        max_users, max_leads, max_storage_gb, max_equipes,
        features, is_popular, display_order,
        created_at
      FROM plans
      WHERE active = true
      ORDER BY display_order ASC, price ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Buscar plano por ID
   */
  static async findById(id) {
    const query = `
      SELECT
        id, name, slug, description, price, billing_cycle,
        max_users, max_leads, max_storage_gb, max_equipes,
        features, active, is_popular, display_order,
        created_at, updated_at
      FROM plans
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Buscar plano por slug
   */
  static async findBySlug(slug) {
    const query = `
      SELECT
        id, name, slug, description, price, billing_cycle,
        max_users, max_leads, max_storage_gb, max_equipes,
        features, active, is_popular, display_order,
        created_at, updated_at
      FROM plans
      WHERE slug = $1 AND active = true
    `;

    const result = await pool.query(query, [slug]);
    return result.rows[0];
  }

  /**
   * Criar novo plano (admin)
   */
  static async create({
    name,
    slug,
    description,
    price,
    billingCycle = 'monthly',
    maxUsers,
    maxLeads,
    maxStorageGb,
    maxEquipes,
    features = [],
    isPopular = false
  }) {
    const query = `
      INSERT INTO plans (
        name, slug, description, price, billing_cycle,
        max_users, max_leads, max_storage_gb, max_equipes,
        features, is_popular
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      name,
      slug,
      description,
      price,
      billingCycle,
      maxUsers,
      maxLeads,
      maxStorageGb,
      maxEquipes,
      JSON.stringify(features),
      isPopular
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Atualizar plano (admin)
   */
  static async update(id, updates) {
    const allowedFields = [
      'name',
      'description',
      'price',
      'billing_cycle',
      'max_users',
      'max_leads',
      'max_storage_gb',
      'max_equipes',
      'features',
      'active',
      'is_popular',
      'display_order'
    ];

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach((key) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        setClause.push(`${snakeKey} = $${paramIndex++}`);
        values.push(
          snakeKey === 'features' ? JSON.stringify(updates[key]) : updates[key]
        );
      }
    });

    if (setClause.length === 0) {
      throw new Error('Nenhum campo válido para atualizar');
    }

    values.push(id);

    const query = `
      UPDATE plans
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Comparar dois planos (para upgrade/downgrade)
   */
  static async compare(planId1, planId2) {
    const query = `
      SELECT
        id, name, slug, price,
        max_users, max_leads, max_storage_gb, max_equipes
      FROM plans
      WHERE id IN ($1, $2)
    `;

    const result = await pool.query(query, [planId1, planId2]);

    if (result.rows.length !== 2) {
      throw new Error('Um ou ambos os planos não foram encontrados');
    }

    const [plan1, plan2] = result.rows;

    return {
      plan1,
      plan2,
      isUpgrade: plan2.price > plan1.price,
      priceDiff: Math.abs(plan2.price - plan1.price),
      limitChanges: {
        users: plan2.max_users - plan1.max_users,
        leads: plan2.max_leads - plan1.max_leads,
        storage: plan2.max_storage_gb - plan1.max_storage_gb,
        equipes: plan2.max_equipes - plan1.max_equipes
      }
    };
  }
}

export default Plan;
