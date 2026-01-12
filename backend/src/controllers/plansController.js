import Plan from '../models/Plan.js';

/**
 * Listar todos os planos ativos
 * GET /api/plans
 */
export const listPlans = async (req, res) => {
  try {
    const plans = await Plan.listActive();

    return res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('❌ Erro ao listar planos:', error);
    return res.status(500).json({
      error: 'Erro ao listar planos',
      message: error.message
    });
  }
};

/**
 * Buscar plano por ID ou slug
 * GET /api/plans/:idOrSlug
 */
export const getPlan = async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    // Verificar se é UUID ou slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrSlug
    );

    const plan = isUUID
      ? await Plan.findById(idOrSlug)
      : await Plan.findBySlug(idOrSlug);

    if (!plan) {
      return res.status(404).json({
        error: 'Plano não encontrado'
      });
    }

    return res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('❌ Erro ao buscar plano:', error);
    return res.status(500).json({
      error: 'Erro ao buscar plano',
      message: error.message
    });
  }
};

/**
 * Comparar dois planos (para decisão de upgrade/downgrade)
 * GET /api/plans/compare/:planId1/:planId2
 */
export const comparePlans = async (req, res) => {
  try {
    const { planId1, planId2 } = req.params;

    const comparison = await Plan.compare(planId1, planId2);

    return res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('❌ Erro ao comparar planos:', error);
    return res.status(500).json({
      error: 'Erro ao comparar planos',
      message: error.message
    });
  }
};

/**
 * Criar plano (apenas super admin)
 * POST /api/plans
 */
export const createPlan = async (req, res) => {
  try {
    // Verificar se é super admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Apenas super admins podem criar planos'
      });
    }

    const planData = req.body;
    const plan = await Plan.create(planData);

    return res.status(201).json({
      success: true,
      message: 'Plano criado com sucesso',
      data: plan
    });
  } catch (error) {
    console.error('❌ Erro ao criar plano:', error);

    if (error.code === '23505') {
      // Unique violation
      return res.status(400).json({
        error: 'Plano já existe',
        message: 'Já existe um plano com este nome ou slug'
      });
    }

    return res.status(500).json({
      error: 'Erro ao criar plano',
      message: error.message
    });
  }
};

/**
 * Atualizar plano (apenas super admin)
 * PUT /api/plans/:id
 */
export const updatePlan = async (req, res) => {
  try {
    // Verificar se é super admin
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Apenas super admins podem atualizar planos'
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const plan = await Plan.update(id, updates);

    if (!plan) {
      return res.status(404).json({
        error: 'Plano não encontrado'
      });
    }

    return res.json({
      success: true,
      message: 'Plano atualizado com sucesso',
      data: plan
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar plano:', error);
    return res.status(500).json({
      error: 'Erro ao atualizar plano',
      message: error.message
    });
  }
};

export default {
  listPlans,
  getPlan,
  comparePlans,
  createPlan,
  updatePlan
};
