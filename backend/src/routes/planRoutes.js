import express from 'express';
import {
  listPlans,
  getPlan,
  comparePlans,
  createPlan,
  updatePlan
} from '../controllers/plansController.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

// Rotas públicas (sem autenticação)
router.get('/', listPlans); // Listar planos ativos
router.get('/:idOrSlug', getPlan); // Buscar plano específico
router.get('/compare/:planId1/:planId2', comparePlans); // Comparar planos

// Rotas privadas (apenas super admin)
router.post('/', verifyToken, createPlan); // Criar plano
router.put('/:id', verifyToken, updatePlan); // Atualizar plano

export default router;
