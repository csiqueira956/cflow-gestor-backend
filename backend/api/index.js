import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../src/config/database.js';

// Configuração de variáveis de ambiente
dotenv.config();

const app = express();

// Middlewares de Segurança
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://cflow-gestor-frontend.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rota raiz
app.get('/', (_req, res) => {
  res.json({
    message: 'API Gestor de Consórcios - SaaS',
    version: '2.0.0',
    status: 'OK'
  });
});

// Rota de planos (direta, sem router externo)
app.get('/api/plans', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id, name, slug, description, price, billing_cycle,
        max_users, max_leads, max_storage_gb, max_equipes,
        features, is_popular, display_order,
        created_at
      FROM plans
      WHERE active = true
      ORDER BY display_order ASC, price ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erro ao listar planos:', error);
    res.status(500).json({
      error: 'Erro ao listar planos',
      message: error.message
    });
  }
});

// Webhook health check
app.get('/api/webhooks/health', (_req, res) => {
  res.json({ status: 'OK', service: 'webhooks' });
});

// ============================================
// ROTAS DE AUTENTICAÇÃO
// ============================================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('📥 Tentativa de login:', req.body.email);
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ Usuário não encontrado');
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const usuario = result.rows[0];

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      console.log('❌ Senha inválida');
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar token JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        role: usuario.role,
        company_id: usuario.company_id
      },
      process.env.JWT_SECRET || 'secret-default',
      { expiresIn: '7d' }
    );

    console.log('✅ Login bem-sucedido:', usuario.nome);

    res.json({
      message: 'Login realizado com sucesso',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        company_id: usuario.company_id,
        foto_perfil: usuario.foto_perfil
      }
    });
  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({ error: 'Erro ao realizar login', message: error.message });
  }
});

// Verificar token (me)
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    // Verificar e decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');

    // Buscar usuário atualizado no banco
    const result = await pool.query(
      'SELECT id, nome, email, role, company_id, foto_perfil FROM usuarios WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao verificar token:', error);
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
});

// Registro (para o fluxo de cadastro SaaS)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nome, email, senha, nomeEmpresa, cnpj, planId } = req.body;

    // Validação
    if (!nome || !email || !senha || !nomeEmpresa) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Verificar se email já existe
    const emailCheck = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const senha_hash = await bcrypt.hash(senha, 10);

    // Iniciar transação
    await pool.query('BEGIN');

    try {
      // 1. Criar empresa
      const companyResult = await pool.query(
        `INSERT INTO companies (nome, email, cnpj, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        [nomeEmpresa, email, cnpj || null]
      );

      const company_id = companyResult.rows[0].id;

      // 2. Criar usuário admin
      const userResult = await pool.query(
        `INSERT INTO usuarios (nome, email, senha_hash, role, company_id, created_at)
         VALUES ($1, $2, $3, 'admin', $4, NOW())
         RETURNING id, nome, email, role, company_id`,
        [nome, email, senha_hash, company_id]
      );

      const usuario = userResult.rows[0];

      // 3. Criar trial de 14 dias
      const plan_id = planId || (await pool.query(
        "SELECT id FROM plans WHERE slug = 'basico' LIMIT 1"
      )).rows[0]?.id;

      if (plan_id) {
        await pool.query(
          `INSERT INTO subscriptions (
            company_id, plan_id, status,
            current_period_start, current_period_end, trial_ends_at
          ) VALUES ($1, $2, 'trialing', NOW(), NOW() + INTERVAL '1 month', NOW() + INTERVAL '14 days')`,
          [company_id, plan_id]
        );
      }

      await pool.query('COMMIT');

      // Gerar token
      const token = jwt.sign(
        {
          id: usuario.id,
          email: usuario.email,
          role: usuario.role,
          company_id: usuario.company_id
        },
        process.env.JWT_SECRET || 'secret-default',
        { expiresIn: '7d' }
      );

      console.log('✅ Usuário criado com sucesso:', usuario.email);

      res.status(201).json({
        message: 'Usuário criado com sucesso',
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role,
          company_id: usuario.company_id
        }
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('❌ Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao registrar usuário', message: error.message });
  }
});

// ============================================
// ROTAS DE DASHBOARD E ESTATÍSTICAS
// ============================================

// Dashboard - Estatísticas gerais
app.get('/api/dashboard/estatisticas', async (req, res) => {
  try {
    // Retorna estrutura esperada pelo frontend com valores default
    const now = new Date();
    const mesReferencia = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    res.json({
      totalClientes: 0,
      totalLeads: 0,
      totalVendas: 0,
      taxaConversao: 0,
      mes_referencia: mesReferencia,
      meta_geral: 0,
      total_vendido_geral: 0,
      percentual_atingido_geral: 0,
      vendas_por_equipe: []
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Clientes - Estatísticas
app.get('/api/clientes/estatisticas', async (req, res) => {
  try {
    // Retorna estrutura esperada pelo frontend: array de estatísticas por etapa
    res.json({
      estatisticas: [
        { etapa: 'novo_contato', total: 0 },
        { etapa: 'proposta_enviada', total: 0 },
        { etapa: 'negociacao', total: 0 },
        { etapa: 'fechado', total: 0 },
        { etapa: 'perdido', total: 0 }
      ]
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Subscription - Summary (para dashboard de billing)
app.get('/api/subscription/summary', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');

    // Buscar assinatura da empresa
    const result = await pool.query(`
      SELECT s.*, p.name as plan_name, p.price, p.billing_cycle
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.company_id = $1
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [decoded.company_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    // Retorna estrutura esperada pelo frontend
    res.json({
      data: {
        subscription: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error);
    res.status(500).json({ error: 'Erro ao buscar assinatura' });
  }
});

// Subscription - Criar trial (chamado após registro, mas o trial já é criado no register)
app.post('/api/subscription/trial', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');

    // Verificar se já existe trial
    const existingTrial = await pool.query(
      'SELECT id FROM subscriptions WHERE company_id = $1',
      [decoded.company_id]
    );

    if (existingTrial.rows.length > 0) {
      // Já tem trial, retorna sucesso
      return res.json({
        message: 'Trial já existe',
        subscription_id: existingTrial.rows[0].id
      });
    }

    // Criar trial de 14 dias
    const plan = await pool.query(
      "SELECT id FROM plans WHERE slug = 'basico' LIMIT 1"
    );

    if (plan.rows.length === 0) {
      return res.status(404).json({ error: 'Plano básico não encontrado' });
    }

    const result = await pool.query(
      `INSERT INTO subscriptions (
        company_id, plan_id, status,
        current_period_start, current_period_end, trial_ends_at
      ) VALUES ($1, $2, 'trialing', NOW(), NOW() + INTERVAL '1 month', NOW() + INTERVAL '14 days')
      RETURNING id`,
      [decoded.company_id, plan.rows[0].id]
    );

    res.json({
      message: 'Trial criado com sucesso',
      subscription_id: result.rows[0].id
    });
  } catch (error) {
    console.error('Erro ao criar trial:', error);
    res.status(500).json({ error: 'Erro ao criar trial' });
  }
});

// ============================================
// ROTAS AUXILIARES
// ============================================

// Notificações - Contagem de não lidas
app.get('/api/notifications/unread-count', (_req, res) => {
  res.json({ count: 0 });
});

// Rota mockada de grupos
app.get('/api/grupos', (_req, res) => {
  res.json({
    grupos: [
      { id: 1, administradora: 'Honda', grupo: 'H001', cotas_disponiveis: 25 },
      { id: 2, administradora: 'Embracon', grupo: 'E001', cotas_disponiveis: 15 },
      { id: 3, administradora: 'Porto Seguro', grupo: 'PS001', cotas_disponiveis: 30 },
      { id: 4, administradora: 'Rodobens', grupo: 'R001', cotas_disponiveis: 20 }
    ]
  });
});

// ============================================
// ROTAS DE CLIENTES (MOCK)
// ============================================

app.get('/api/clientes', (_req, res) => {
  res.json({ data: { clientes: [] } });
});

app.get('/api/clientes/:id', (_req, res) => {
  res.status(404).json({ error: 'Cliente não encontrado' });
});

app.post('/api/clientes', (_req, res) => {
  res.status(201).json({ message: 'Cliente criado', id: 1 });
});

app.put('/api/clientes/:id', (_req, res) => {
  res.json({ message: 'Cliente atualizado' });
});

app.patch('/api/clientes/:id/etapa', (_req, res) => {
  res.json({ message: 'Etapa atualizada' });
});

app.delete('/api/clientes/:id', (_req, res) => {
  res.json({ message: 'Cliente deletado' });
});

// ============================================
// ROTAS DE COMISSÕES (MOCK)
// ============================================

app.get('/api/comissoes', (_req, res) => {
  res.json({ data: { comissoes: [] } });
});

app.get('/api/comissoes/:id', (_req, res) => {
  res.status(404).json({ error: 'Comissão não encontrada' });
});

app.post('/api/comissoes', (_req, res) => {
  res.status(201).json({ message: 'Comissão criada', id: 1 });
});

app.put('/api/comissoes/:id', (_req, res) => {
  res.json({ message: 'Comissão atualizada' });
});

app.delete('/api/comissoes/:id', (_req, res) => {
  res.json({ message: 'Comissão deletada' });
});

app.get('/api/comissoes/estatisticas', (_req, res) => {
  res.json({
    total_comissoes: 0,
    total_pago: 0,
    total_pendente: 0
  });
});

// ============================================
// ROTAS DE USUÁRIOS (MOCK)
// ============================================

// Listar todos os usuários
app.get('/api/usuarios', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');

    // Buscar usuários da mesma empresa
    const result = await pool.query(
      'SELECT id, nome, email, role, created_at FROM usuarios WHERE company_id = $1 ORDER BY created_at DESC',
      [decoded.company_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// Listar vendedores
app.get('/api/usuarios/vendedores', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');

    // Buscar vendedores da mesma empresa
    const result = await pool.query(
      "SELECT id, nome, email, role, created_at FROM usuarios WHERE company_id = $1 AND role = 'vendedor' ORDER BY nome",
      [decoded.company_id]
    );

    res.json({ data: { vendedores: result.rows } });
  } catch (error) {
    console.error('Erro ao listar vendedores:', error);
    res.status(500).json({ error: 'Erro ao listar vendedores' });
  }
});

// ============================================
// ROTAS DE EQUIPES (MOCK)
// ============================================

app.get('/api/equipes', (_req, res) => {
  res.json({ data: { equipes: [] } });
});

app.post('/api/equipes', (_req, res) => {
  res.status(201).json({ message: 'Equipe criada', id: 1 });
});

app.put('/api/equipes/:id', (_req, res) => {
  res.json({ message: 'Equipe atualizada' });
});

app.delete('/api/equipes/:id', (_req, res) => {
  res.json({ message: 'Equipe deletada' });
});

// ============================================
// ROTAS DE ADMINISTRADORAS (MOCK)
// ============================================

app.get('/api/administradoras', (_req, res) => {
  res.json({ data: { administradoras: [] } });
});

app.post('/api/administradoras', (_req, res) => {
  res.status(201).json({ message: 'Administradora criada', id: 1 });
});

app.put('/api/administradoras/:id', (_req, res) => {
  res.json({ message: 'Administradora atualizada' });
});

app.delete('/api/administradoras/:id', (_req, res) => {
  res.json({ message: 'Administradora deletada' });
});

// ============================================
// ROTAS DE METAS (MOCK)
// ============================================

app.get('/api/metas', (_req, res) => {
  res.json({ data: { metas: [] } });
});

app.post('/api/metas', (_req, res) => {
  res.status(201).json({ message: 'Meta criada', id: 1 });
});

app.put('/api/metas/:id', (_req, res) => {
  res.json({ message: 'Meta atualizada' });
});

app.delete('/api/metas/:id', (_req, res) => {
  res.json({ message: 'Meta deletada' });
});

// ============================================
// ROTAS DE BILLING (MOCK)
// ============================================

app.get('/api/billing/invoices', (_req, res) => {
  res.json({ data: [] });
});

app.get('/api/billing/stats', (_req, res) => {
  res.json({
    data: {
      total_invoices: 0,
      paid_invoices: 0,
      pending_invoices: 0,
      overdue_invoices: 0,
      total_amount: 0,
      paid_amount: 0,
      pending_amount: 0
    }
  });
});

app.get('/api/billing/next', (_req, res) => {
  res.json({ data: null });
});

app.get('/api/billing/overdue', (_req, res) => {
  res.json({ data: [] });
});

app.get('/api/billing/upcoming', (_req, res) => {
  res.json({ data: [] });
});

app.get('/api/billing/dashboard', (_req, res) => {
  res.json({
    data: {
      total_revenue: 0,
      monthly_revenue: 0,
      active_subscriptions: 0,
      churn_rate: 0
    }
  });
});

// Tratamento de erros 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ error: 'Erro interno do servidor', message: err.message });
});

// Para Vercel (serverless)
export default app;
