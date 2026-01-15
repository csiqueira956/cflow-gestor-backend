import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import pool from '../src/config/database.js';

// Configuração de variáveis de ambiente (DEVE ser chamado primeiro)
dotenv.config();

// Versão da API: 1.0.5 - Estrutura padronizada com wrapper data

// Configuração do Asaas (após dotenv)
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

const asaasAPI = axios.create({
  baseURL: ASAAS_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'access_token': ASAAS_API_KEY
  },
  timeout: 30000
});

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
      'SELECT id, nome, email, role, company_id, foto_perfil, link_publico FROM usuarios WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    let usuario = result.rows[0];

    // Se não tem link_publico, gerar um
    if (!usuario.link_publico) {
      const linkPublico = usuario.nome.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Math.random().toString(36).substring(2, 8);

      await pool.query(
        'UPDATE usuarios SET link_publico = $1 WHERE id = $2',
        [linkPublico, usuario.id]
      );

      usuario.link_publico = linkPublico;
    }

    res.json(usuario);
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

      // 2. Gerar link público único
      const linkPublico = nome.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]/g, '-') // Substitui caracteres especiais por hífen
        .replace(/-+/g, '-') // Remove hífens duplicados
        .replace(/^-|-$/g, '') // Remove hífens no início/fim
        + '-' + Math.random().toString(36).substring(2, 8); // Adiciona código único

      // 3. Criar usuário admin
      const userResult = await pool.query(
        `INSERT INTO usuarios (nome, email, senha_hash, role, company_id, link_publico, created_at)
         VALUES ($1, $2, $3, 'admin', $4, $5, NOW())
         RETURNING id, nome, email, role, company_id, link_publico`,
        [nome, email, senha_hash, company_id, linkPublico]
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
      data: {
        totalClientes: 0,
        totalLeads: 0,
        totalVendas: 0,
        taxaConversao: 0,
        mes_referencia: mesReferencia,
        meta_geral: 0,
        total_vendido_geral: 0,
        percentual_atingido_geral: 0,
        vendas_por_equipe: []
      }
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
      data: {
        estatisticas: [
          { etapa: 'novo_contato', total: 0 },
          { etapa: 'proposta_enviada', total: 0 },
          { etapa: 'negociacao', total: 0 },
          { etapa: 'fechado', total: 0 },
          { etapa: 'perdido', total: 0 }
        ]
      }
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

    // Buscar assinatura da empresa com todos os dados do plano
    const result = await pool.query(`
      SELECT s.*,
             p.name as plan_name,
             p.price as plan_price,
             p.billing_cycle,
             p.max_users,
             p.max_leads,
             p.max_storage_gb,
             p.max_equipes,
             p.features
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.company_id = $1
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [decoded.company_id]);

    // Se não tem assinatura, retorna null (não é erro, apenas não tem assinatura ainda)
    const subscription = result.rows.length > 0 ? result.rows[0] : null;

    // Retorna estrutura esperada pelo frontend
    res.json({
      data: {
        subscription: subscription
      }
    });
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error);
    res.status(500).json({ error: 'Erro ao buscar assinatura' });
  }
});

// Subscription - Estatísticas de uso (usuários, leads, etc.)
app.get('/api/subscription/usage', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const companyId = decoded.company_id;

    // Contar usuários da empresa
    const usersResult = await pool.query(
      'SELECT COUNT(*) as count FROM usuarios WHERE company_id = $1',
      [companyId]
    );

    // Contar clientes/leads da empresa
    const leadsResult = await pool.query(
      'SELECT COUNT(*) as count FROM clientes WHERE company_id = $1',
      [companyId]
    );

    // Contar equipes da empresa
    const equipesResult = await pool.query(
      'SELECT COUNT(*) as count FROM equipes WHERE company_id = $1',
      [companyId]
    );

    // Buscar limites do plano atual
    const planResult = await pool.query(`
      SELECT p.max_users, p.max_leads, p.max_storage_gb, p.max_equipes
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.company_id = $1
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [companyId]);

    const limits = planResult.rows[0] || {
      max_users: 5,
      max_leads: 100,
      max_storage_gb: 1,
      max_equipes: 1
    };

    res.json({
      data: {
        usage: {
          users: parseInt(usersResult.rows[0].count),
          leads: parseInt(leadsResult.rows[0].count),
          equipes: parseInt(equipesResult.rows[0].count),
          storage_gb: 0 // Pode ser implementado futuramente
        },
        limits: {
          max_users: limits.max_users,
          max_leads: limits.max_leads,
          max_storage_gb: limits.max_storage_gb,
          max_equipes: limits.max_equipes
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar uso:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas de uso' });
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
// ROTAS DE CLIENTES
// ============================================

// Cadastro público de cliente (via link público do vendedor)
app.post('/api/clientes/publico/:linkPublico', async (req, res) => {
  try {
    const { linkPublico } = req.params;
    const clienteData = req.body;

    console.log('📥 Cadastro público recebido para link:', linkPublico);

    // Buscar vendedor pelo link público
    const vendedorResult = await pool.query(
      'SELECT id, company_id, nome FROM usuarios WHERE link_publico = $1',
      [linkPublico]
    );

    if (vendedorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Link público não encontrado' });
    }

    const vendedor = vendedorResult.rows[0];

    // Inserir cliente associado ao vendedor e empresa
    const telefone = clienteData.telefone_celular || clienteData.telefone || '';
    const result = await pool.query(
      `INSERT INTO clientes (
        nome, cpf, email, telefone, telefone_celular,
        vendedor_id, company_id, etapa, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'novo_contato', NOW(), NOW())
      RETURNING id, nome, email`,
      [
        clienteData.nome,
        clienteData.cpf || null,
        clienteData.email || null,
        telefone,
        clienteData.telefone_celular || null,
        vendedor.id,
        vendedor.company_id
      ]
    );

    console.log('✅ Cliente cadastrado via link público:', result.rows[0]);

    res.status(201).json({
      success: true,
      message: 'Cadastro realizado com sucesso!',
      data: {
        cliente: result.rows[0],
        vendedor_nome: vendedor.nome
      }
    });
  } catch (error) {
    console.error('❌ Erro ao cadastrar cliente público:', error);
    res.status(500).json({ error: 'Erro ao processar cadastro' });
  }
});

app.get('/api/clientes', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const { role, id: userId, equipe_id } = decoded;

    // Query base com JOIN para pegar dados do vendedor
    let query = `
      SELECT c.*, u.nome as vendedor_nome, u.equipe_id as vendedor_equipe_id
      FROM clientes c
      LEFT JOIN usuarios u ON c.vendedor_id = u.id
      WHERE c.company_id = $1
    `;
    const values = [decoded.company_id];

    // SEGURANÇA: Filtrar por role
    if (role === 'vendedor') {
      // Vendedor vê apenas seus próprios clientes
      query += ` AND c.vendedor_id = $2`;
      values.push(userId);
    } else if (role === 'gerente') {
      // Gerente vê clientes de vendedores da sua equipe
      if (equipe_id) {
        query += ` AND u.equipe_id = $2`;
        values.push(equipe_id);
      } else {
        // Se gerente não tem equipe, só vê seus próprios clientes
        query += ` AND c.vendedor_id = $2`;
        values.push(userId);
      }
    }
    // Admin e super_admin veem todos os clientes da empresa (sem filtro adicional)

    query += ` ORDER BY c.created_at DESC`;

    const result = await pool.query(query, values);

    res.json({ data: { clientes: result.rows } });
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro ao listar clientes' });
  }
});

app.get('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const { role, id: userId, equipe_id } = decoded;

    // Buscar cliente com dados do vendedor
    const result = await pool.query(
      `SELECT c.*, u.equipe_id as vendedor_equipe_id
       FROM clientes c
       LEFT JOIN usuarios u ON c.vendedor_id = u.id
       WHERE c.id = $1 AND c.company_id = $2`,
      [id, decoded.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const cliente = result.rows[0];

    // SEGURANÇA: Verificar permissão por role
    if (role === 'vendedor' && cliente.vendedor_id !== userId) {
      return res.status(403).json({ error: 'Sem permissão para acessar este cliente' });
    }
    if (role === 'gerente' && equipe_id && cliente.vendedor_equipe_id !== equipe_id) {
      return res.status(403).json({ error: 'Sem permissão para acessar este cliente' });
    }

    res.json({ data: { cliente } });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
});

app.post('/api/clientes', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const clienteData = req.body;
    const telefone = clienteData.telefone_celular || clienteData.telefone || '';

    const result = await pool.query(
      `INSERT INTO clientes (
        nome, cpf, email, telefone, telefone_celular,
        vendedor_id, company_id, etapa, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'novo_contato', NOW(), NOW())
      RETURNING *`,
      [
        clienteData.nome,
        clienteData.cpf || null,
        clienteData.email || null,
        telefone,
        clienteData.telefone_celular || null,
        decoded.id,
        decoded.company_id
      ]
    );

    res.status(201).json({ data: { cliente: result.rows[0] } });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const { role, id: userId, equipe_id } = decoded;
    const c = req.body;

    // SEGURANÇA: Verificar permissão antes de atualizar
    const clienteCheck = await pool.query(
      `SELECT c.vendedor_id, u.equipe_id as vendedor_equipe_id
       FROM clientes c
       LEFT JOIN usuarios u ON c.vendedor_id = u.id
       WHERE c.id = $1 AND c.company_id = $2`,
      [id, decoded.company_id]
    );

    if (clienteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const cliente = clienteCheck.rows[0];
    if (role === 'vendedor' && cliente.vendedor_id !== userId) {
      return res.status(403).json({ error: 'Sem permissão para editar este cliente' });
    }
    if (role === 'gerente' && equipe_id && cliente.vendedor_equipe_id !== equipe_id) {
      return res.status(403).json({ error: 'Sem permissão para editar este cliente' });
    }

    const result = await pool.query(
      `UPDATE clientes SET
        nome = COALESCE($1, nome),
        cpf = COALESCE($2, cpf),
        email = COALESCE($3, email),
        telefone = COALESCE($4, telefone),
        telefone_celular = COALESCE($5, telefone_celular),
        etapa = COALESCE($6, etapa),
        data_nascimento = COALESCE($7, data_nascimento),
        estado_civil = COALESCE($8, estado_civil),
        nacionalidade = COALESCE($9, nacionalidade),
        cidade_nascimento = COALESCE($10, cidade_nascimento),
        nome_mae = COALESCE($11, nome_mae),
        profissao = COALESCE($12, profissao),
        remuneracao = COALESCE($13, remuneracao),
        telefone_residencial = COALESCE($14, telefone_residencial),
        telefone_comercial = COALESCE($15, telefone_comercial),
        celular_2 = COALESCE($16, celular_2),
        tipo_documento = COALESCE($17, tipo_documento),
        numero_documento = COALESCE($18, numero_documento),
        orgao_emissor = COALESCE($19, orgao_emissor),
        data_emissao = COALESCE($20, data_emissao),
        cpf_conjuge = COALESCE($21, cpf_conjuge),
        nome_conjuge = COALESCE($22, nome_conjuge),
        valor_carta = COALESCE($23, valor_carta),
        administradora = COALESCE($24, administradora),
        grupo = COALESCE($25, grupo),
        cota = COALESCE($26, cota),
        aceita_seguro = COALESCE($27, aceita_seguro),
        cep = COALESCE($28, cep),
        tipo_logradouro = COALESCE($29, tipo_logradouro),
        endereco = COALESCE($30, endereco),
        numero_endereco = COALESCE($31, numero_endereco),
        complemento = COALESCE($32, complemento),
        bairro = COALESCE($33, bairro),
        cidade = COALESCE($34, cidade),
        estado = COALESCE($35, estado),
        observacoes = COALESCE($36, observacoes),
        updated_at = NOW()
      WHERE id = $37 AND company_id = $38
      RETURNING *`,
      [
        c.nome,
        c.cpf,
        c.email,
        c.telefone,
        c.telefone_celular,
        c.etapa,
        c.data_nascimento || null,
        c.estado_civil,
        c.nacionalidade,
        c.cidade_nascimento,
        c.nome_mae,
        c.profissao,
        c.remuneracao ? parseFloat(c.remuneracao) : null,
        c.telefone_residencial,
        c.telefone_comercial,
        c.celular_2,
        c.tipo_documento,
        c.numero_documento,
        c.orgao_emissor,
        c.data_emissao || null,
        c.cpf_conjuge,
        c.nome_conjuge,
        c.valor_carta ? parseFloat(c.valor_carta) : null,
        c.administradora,
        c.grupo,
        c.cota,
        c.aceita_seguro,
        c.cep,
        c.tipo_logradouro,
        c.endereco,
        c.numero_endereco,
        c.complemento,
        c.bairro,
        c.cidade,
        c.estado,
        c.observacoes,
        id,
        decoded.company_id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json({ data: { cliente: result.rows[0] } });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

app.patch('/api/clientes/:id/etapa', async (req, res) => {
  try {
    const { id } = req.params;
    const { etapa } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const { role, id: userId, equipe_id } = decoded;

    // SEGURANÇA: Verificar permissão antes de atualizar etapa
    const clienteCheck = await pool.query(
      `SELECT c.vendedor_id, u.equipe_id as vendedor_equipe_id
       FROM clientes c
       LEFT JOIN usuarios u ON c.vendedor_id = u.id
       WHERE c.id = $1 AND c.company_id = $2`,
      [id, decoded.company_id]
    );

    if (clienteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const cliente = clienteCheck.rows[0];
    if (role === 'vendedor' && cliente.vendedor_id !== userId) {
      return res.status(403).json({ error: 'Sem permissão para alterar este cliente' });
    }
    if (role === 'gerente' && equipe_id && cliente.vendedor_equipe_id !== equipe_id) {
      return res.status(403).json({ error: 'Sem permissão para alterar este cliente' });
    }

    const result = await pool.query(
      `UPDATE clientes SET etapa = $1, updated_at = NOW()
       WHERE id = $2 AND company_id = $3
       RETURNING *`,
      [etapa, id, decoded.company_id]
    );

    res.json({ data: { cliente: result.rows[0] } });
  } catch (error) {
    console.error('Erro ao atualizar etapa:', error);
    res.status(500).json({ error: 'Erro ao atualizar etapa' });
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const { role, id: userId, equipe_id } = decoded;

    // SEGURANÇA: Verificar permissão antes de deletar
    const clienteCheck = await pool.query(
      `SELECT c.vendedor_id, u.equipe_id as vendedor_equipe_id
       FROM clientes c
       LEFT JOIN usuarios u ON c.vendedor_id = u.id
       WHERE c.id = $1 AND c.company_id = $2`,
      [id, decoded.company_id]
    );

    if (clienteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const cliente = clienteCheck.rows[0];
    if (role === 'vendedor' && cliente.vendedor_id !== userId) {
      return res.status(403).json({ error: 'Sem permissão para deletar este cliente' });
    }
    if (role === 'gerente' && equipe_id && cliente.vendedor_equipe_id !== equipe_id) {
      return res.status(403).json({ error: 'Sem permissão para deletar este cliente' });
    }

    await pool.query(
      'DELETE FROM clientes WHERE id = $1 AND company_id = $2',
      [id, decoded.company_id]
    );

    res.json({ message: 'Cliente deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    res.status(500).json({ error: 'Erro ao deletar cliente' });
  }
});

// ============================================
// ROTAS DE COMISSÕES (REAL)
// ============================================

// Listar comissões (com filtro por role)
app.get('/api/comissoes', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const { role, id: userId, equipe_id } = decoded;

    // Query base
    let query = `
      SELECT c.*,
             cl.nome as cliente_nome,
             cl.cpf as cliente_cpf,
             cl.telefone_celular as cliente_telefone,
             u.nome as vendedor_nome,
             u.email as vendedor_email,
             u.equipe_id as vendedor_equipe_id
      FROM comissoes c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN usuarios u ON c.vendedor_id = u.id
      WHERE c.company_id = $1
    `;
    const values = [decoded.company_id];
    let paramCount = 2;

    // SEGURANÇA: Filtrar por role
    if (role === 'vendedor') {
      query += ` AND c.vendedor_id = $${paramCount}`;
      values.push(userId);
      paramCount++;
    } else if (role === 'gerente') {
      if (equipe_id) {
        query += ` AND u.equipe_id = $${paramCount}`;
        values.push(equipe_id);
        paramCount++;
      } else {
        query += ` AND c.vendedor_id = $${paramCount}`;
        values.push(userId);
        paramCount++;
      }
    }

    // Filtros opcionais (apenas admin/super_admin)
    if (req.query.vendedor_id && (role === 'admin' || role === 'super_admin')) {
      query += ` AND c.vendedor_id = $${paramCount}`;
      values.push(req.query.vendedor_id);
      paramCount++;
    }

    if (req.query.status) {
      query += ` AND c.status = $${paramCount}`;
      values.push(req.query.status);
      paramCount++;
    }

    query += ' ORDER BY c.created_at DESC';

    const result = await pool.query(query, values);

    res.json({ data: { comissoes: result.rows } });
  } catch (error) {
    console.error('Erro ao listar comissões:', error);
    res.status(500).json({ error: 'Erro ao listar comissões' });
  }
});

// Estatísticas de comissões (DEVE vir ANTES de /api/comissoes/:id)
app.get('/api/comissoes/estatisticas', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');

    const result = await pool.query(`
      SELECT
        COUNT(*) as total_comissoes,
        COALESCE(SUM(valor_comissao), 0) as total_valor,
        COALESCE(SUM(CASE WHEN status = 'pago' THEN valor_comissao ELSE 0 END), 0) as total_pago,
        COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor_comissao ELSE 0 END), 0) as total_pendente,
        COALESCE(SUM(CASE WHEN status = 'em_pagamento' THEN valor_comissao ELSE 0 END), 0) as total_em_pagamento
      FROM comissoes
      WHERE company_id = $1
    `, [decoded.company_id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Buscar comissão por ID (com parcelas)
app.get('/api/comissoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const { role, id: userId, equipe_id } = decoded;

    // Buscar comissão
    const comissaoResult = await pool.query(`
      SELECT c.*,
             cl.nome as cliente_nome,
             u.nome as vendedor_nome,
             u.equipe_id as vendedor_equipe_id
      FROM comissoes c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN usuarios u ON c.vendedor_id = u.id
      WHERE c.id = $1 AND c.company_id = $2
    `, [id, decoded.company_id]);

    if (comissaoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Comissão não encontrada' });
    }

    const comissao = comissaoResult.rows[0];

    // SEGURANÇA: Verificar permissão
    if (role === 'vendedor' && comissao.vendedor_id !== userId) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta comissão' });
    }
    if (role === 'gerente' && equipe_id && comissao.vendedor_equipe_id !== equipe_id) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta comissão' });
    }

    // Buscar parcelas
    const parcelasResult = await pool.query(`
      SELECT * FROM parcelas_comissao
      WHERE comissao_id = $1
      ORDER BY numero_parcela ASC
    `, [id]);

    comissao.parcelas = parcelasResult.rows;

    res.json({ data: { comissao } });
  } catch (error) {
    console.error('Erro ao buscar comissão:', error);
    res.status(500).json({ error: 'Erro ao buscar comissão' });
  }
});

// Criar comissão (apenas admin)
app.post('/api/comissoes', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');

    // SEGURANÇA: Apenas admin pode criar comissões
    if (!['admin', 'super_admin'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Sem permissão para criar comissões' });
    }

    const {
      cliente_id,
      vendedor_id,
      valor_venda,
      percentual_comissao,
      numero_parcelas = 1
    } = req.body;

    // Validações
    if (!cliente_id || !vendedor_id || !valor_venda || !percentual_comissao) {
      return res.status(400).json({ error: 'cliente_id, vendedor_id, valor_venda e percentual_comissao são obrigatórios' });
    }

    // Calcular valor da comissão
    const valor_comissao = (parseFloat(valor_venda) * parseFloat(percentual_comissao)) / 100;

    // Criar comissão
    const comissaoResult = await pool.query(`
      INSERT INTO comissoes (
        cliente_id, vendedor_id, valor_venda, percentual_comissao,
        valor_comissao, numero_parcelas, status, company_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pendente', $7, NOW(), NOW())
      RETURNING *
    `, [cliente_id, vendedor_id, valor_venda, percentual_comissao, valor_comissao, numero_parcelas, decoded.company_id]);

    const comissao = comissaoResult.rows[0];

    // Criar parcelas
    const valorParcela = valor_comissao / numero_parcelas;
    const parcelas = [];

    for (let i = 1; i <= numero_parcelas; i++) {
      const dataVencimento = new Date();
      dataVencimento.setMonth(dataVencimento.getMonth() + i);
      dataVencimento.setDate(10);

      const parcelaResult = await pool.query(`
        INSERT INTO parcelas_comissao (
          comissao_id, numero_parcela, valor_parcela,
          data_vencimento, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'pendente', NOW(), NOW())
        RETURNING *
      `, [comissao.id, i, valorParcela, dataVencimento.toISOString().split('T')[0]]);

      parcelas.push(parcelaResult.rows[0]);
    }

    // Atualizar etapa do cliente para "em_comissionamento"
    await pool.query(
      `UPDATE clientes SET etapa = 'em_comissionamento', updated_at = NOW() WHERE id = $1`,
      [cliente_id]
    );

    comissao.parcelas = parcelas;

    res.status(201).json({
      message: 'Comissão criada com sucesso',
      data: { comissao }
    });
  } catch (error) {
    console.error('Erro ao criar comissão:', error);
    res.status(500).json({ error: 'Erro ao criar comissão' });
  }
});

// Atualizar comissão (apenas admin)
app.put('/api/comissoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');

    // SEGURANÇA: Apenas admin pode atualizar comissões
    if (!['admin', 'super_admin'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Sem permissão para atualizar comissões' });
    }

    const { status, numero_parcelas } = req.body;

    // Verificar se comissão existe e pertence à empresa
    const existingResult = await pool.query(
      'SELECT * FROM comissoes WHERE id = $1 AND company_id = $2',
      [id, decoded.company_id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Comissão não encontrada' });
    }

    const comissao = existingResult.rows[0];

    // Se mudou o número de parcelas, recriar parcelas
    if (numero_parcelas && numero_parcelas !== comissao.numero_parcelas) {
      // Deletar parcelas antigas
      await pool.query('DELETE FROM parcelas_comissao WHERE comissao_id = $1', [id]);

      // Criar novas parcelas
      const valorParcela = comissao.valor_comissao / numero_parcelas;

      for (let i = 1; i <= numero_parcelas; i++) {
        const dataVencimento = new Date();
        dataVencimento.setMonth(dataVencimento.getMonth() + i);
        dataVencimento.setDate(10);

        await pool.query(`
          INSERT INTO parcelas_comissao (
            comissao_id, numero_parcela, valor_parcela,
            data_vencimento, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, 'pendente', NOW(), NOW())
        `, [id, i, valorParcela, dataVencimento.toISOString().split('T')[0]]);
      }

      // Atualizar número de parcelas na comissão
      await pool.query(
        'UPDATE comissoes SET numero_parcelas = $1, updated_at = NOW() WHERE id = $2',
        [numero_parcelas, id]
      );
    }

    // Atualizar status se fornecido
    if (status) {
      await pool.query(
        'UPDATE comissoes SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, id]
      );
    }

    // Buscar comissão atualizada com parcelas
    const updatedResult = await pool.query(
      'SELECT * FROM comissoes WHERE id = $1',
      [id]
    );

    const parcelasResult = await pool.query(
      'SELECT * FROM parcelas_comissao WHERE comissao_id = $1 ORDER BY numero_parcela ASC',
      [id]
    );

    const updatedComissao = updatedResult.rows[0];
    updatedComissao.parcelas = parcelasResult.rows;

    res.json({
      message: 'Comissão atualizada com sucesso',
      data: { comissao: updatedComissao }
    });
  } catch (error) {
    console.error('Erro ao atualizar comissão:', error);
    res.status(500).json({ error: 'Erro ao atualizar comissão' });
  }
});

// Atualizar parcela individual
app.put('/api/comissoes/parcelas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');

    // SEGURANÇA: Apenas admin pode atualizar parcelas
    if (!['admin', 'super_admin'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Sem permissão para atualizar parcelas' });
    }

    const { valor_parcela, data_vencimento, data_pagamento, status, observacao } = req.body;

    // Verificar se parcela existe e pertence à empresa
    const parcelaResult = await pool.query(
      `SELECT p.*, c.company_id
       FROM parcelas_comissao p
       JOIN comissoes c ON p.comissao_id = c.id
       WHERE p.id = $1`,
      [id]
    );

    if (parcelaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parcela não encontrada' });
    }

    if (parcelaResult.rows[0].company_id !== decoded.company_id) {
      return res.status(403).json({ error: 'Sem permissão para atualizar esta parcela' });
    }

    // Atualizar parcela
    const updateResult = await pool.query(`
      UPDATE parcelas_comissao SET
        valor_parcela = COALESCE($1, valor_parcela),
        data_vencimento = COALESCE($2, data_vencimento),
        data_pagamento = $3,
        status = COALESCE($4, status),
        observacao = COALESCE($5, observacao),
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [valor_parcela, data_vencimento, data_pagamento || null, status, observacao, id]);

    res.json({
      message: 'Parcela atualizada com sucesso',
      parcela: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar parcela:', error);
    res.status(500).json({ error: 'Erro ao atualizar parcela' });
  }
});

// Deletar comissão (apenas admin)
app.delete('/api/comissoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');

    // SEGURANÇA: Apenas admin pode deletar comissões
    if (!['admin', 'super_admin'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Sem permissão para deletar comissões' });
    }

    // Verificar se comissão existe e pertence à empresa
    const existingResult = await pool.query(
      'SELECT * FROM comissoes WHERE id = $1 AND company_id = $2',
      [id, decoded.company_id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Comissão não encontrada' });
    }

    // Deletar parcelas primeiro (ou usar CASCADE)
    await pool.query('DELETE FROM parcelas_comissao WHERE comissao_id = $1', [id]);

    // Deletar comissão
    await pool.query('DELETE FROM comissoes WHERE id = $1', [id]);

    res.json({ message: 'Comissão deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar comissão:', error);
    res.status(500).json({ error: 'Erro ao deletar comissão' });
  }
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

    // Super admin pode ver todos os vendedores
    if (decoded.role === 'super_admin' && !decoded.company_id) {
      const result = await pool.query(`
        SELECT u.id, u.nome, u.email, u.role, u.tipo_usuario, u.percentual_comissao,
               u.celular, u.equipe_id, e.nome as equipe_nome, c.nome as empresa_nome, u.created_at
        FROM usuarios u
        LEFT JOIN equipes e ON u.equipe_id = e.id
        LEFT JOIN companies c ON u.company_id = c.id
        WHERE u.role = 'vendedor'
        ORDER BY c.nome, u.nome
      `);
      return res.json({ data: { vendedores: result.rows } });
    }

    // Buscar vendedores da mesma empresa
    const result = await pool.query(`
      SELECT u.id, u.nome, u.email, u.role, u.tipo_usuario, u.percentual_comissao,
             u.celular, u.equipe_id, e.nome as equipe_nome, u.created_at
      FROM usuarios u
      LEFT JOIN equipes e ON u.equipe_id = e.id
      WHERE u.company_id = $1 AND u.role = 'vendedor'
      ORDER BY u.nome
    `, [decoded.company_id]);

    res.json({ data: { vendedores: result.rows } });
  } catch (error) {
    console.error('Erro ao listar vendedores:', error);
    res.status(500).json({ error: 'Erro ao listar vendedores' });
  }
});

// ============================================
// ROTAS DE EQUIPES
// ============================================

app.get('/api/equipes', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');

    // Super admin pode ver todas as equipes
    if (decoded.role === 'super_admin' && !decoded.company_id) {
      const result = await pool.query(`
        SELECT e.*, c.nome as empresa_nome
        FROM equipes e
        LEFT JOIN companies c ON e.company_id = c.id
        ORDER BY c.nome ASC, e.nome ASC
      `);
      return res.json({ data: { equipes: result.rows } });
    }

    const result = await pool.query(
      'SELECT * FROM equipes WHERE company_id = $1 ORDER BY nome ASC',
      [decoded.company_id]
    );
    res.json({ data: { equipes: result.rows } });
  } catch (error) {
    console.error('Erro ao listar equipes:', error);
    res.status(500).json({ error: 'Erro ao listar equipes' });
  }
});

app.post('/api/equipes', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const { nome, descricao } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const result = await pool.query(
      'INSERT INTO equipes (nome, descricao, company_id) VALUES ($1, $2, $3) RETURNING *',
      [nome, descricao, decoded.company_id]
    );

    res.status(201).json({ message: 'Equipe criada', equipe: result.rows[0] });
  } catch (error) {
    console.error('Erro ao criar equipe:', error);
    res.status(500).json({ error: 'Erro ao criar equipe' });
  }
});

app.put('/api/equipes/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const { id } = req.params;
    const { nome, descricao } = req.body;

    const result = await pool.query(
      'UPDATE equipes SET nome = $1, descricao = $2, updated_at = NOW() WHERE id = $3 AND company_id = $4 RETURNING *',
      [nome, descricao, id, decoded.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipe não encontrada' });
    }

    res.json({ message: 'Equipe atualizada', equipe: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar equipe:', error);
    res.status(500).json({ error: 'Erro ao atualizar equipe' });
  }
});

app.delete('/api/equipes/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM equipes WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, decoded.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipe não encontrada' });
    }

    res.json({ message: 'Equipe deletada' });
  } catch (error) {
    console.error('Erro ao deletar equipe:', error);
    res.status(500).json({ error: 'Erro ao deletar equipe' });
  }
});

// ============================================
// ROTAS DE ADMINISTRADORAS
// ============================================

app.get('/api/administradoras', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');

    // Super admin pode ver todas as administradoras
    if (decoded.role === 'super_admin' && !decoded.company_id) {
      const result = await pool.query(`
        SELECT a.*, c.nome as empresa_nome
        FROM administradoras a
        LEFT JOIN companies c ON a.company_id = c.id
        ORDER BY c.nome ASC, a.nome ASC
      `);
      return res.json({ data: { administradoras: result.rows } });
    }

    const result = await pool.query(
      'SELECT * FROM administradoras WHERE company_id = $1 ORDER BY nome ASC',
      [decoded.company_id]
    );
    res.json({ data: { administradoras: result.rows } });
  } catch (error) {
    console.error('Erro ao listar administradoras:', error);
    res.status(500).json({ error: 'Erro ao listar administradoras' });
  }
});

app.post('/api/administradoras', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const { nome, nome_contato, celular, comissionamento_recebido, comissionamento_pago } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const result = await pool.query(
      `INSERT INTO administradoras (nome, nome_contato, celular, comissionamento_recebido, comissionamento_pago, company_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nome, nome_contato, celular, comissionamento_recebido, comissionamento_pago, decoded.company_id]
    );

    res.status(201).json({ message: 'Administradora criada', administradora: result.rows[0] });
  } catch (error) {
    console.error('Erro ao criar administradora:', error);
    res.status(500).json({ error: 'Erro ao criar administradora' });
  }
});

app.put('/api/administradoras/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const { id } = req.params;
    const { nome, nome_contato, celular, comissionamento_recebido, comissionamento_pago } = req.body;

    const result = await pool.query(
      `UPDATE administradoras SET nome = $1, nome_contato = $2, celular = $3,
       comissionamento_recebido = $4, comissionamento_pago = $5, updated_at = NOW()
       WHERE id = $6 AND company_id = $7 RETURNING *`,
      [nome, nome_contato, celular, comissionamento_recebido, comissionamento_pago, id, decoded.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Administradora não encontrada' });
    }

    res.json({ message: 'Administradora atualizada', administradora: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar administradora:', error);
    res.status(500).json({ error: 'Erro ao atualizar administradora' });
  }
});

app.delete('/api/administradoras/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM administradoras WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, decoded.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Administradora não encontrada' });
    }

    res.json({ message: 'Administradora deletada' });
  } catch (error) {
    console.error('Erro ao deletar administradora:', error);
    res.status(500).json({ error: 'Erro ao deletar administradora' });
  }
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
// ROTAS DE SUPER ADMIN
// ============================================

// Middleware para verificar super_admin
const verifySuperAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');

    if (decoded.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Apenas super administradores podem acessar este recurso.'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

// Listar todas as empresas e suas assinaturas
app.get('/api/admin/assinaturas/todas', verifySuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.nome,
        c.email,
        c.cnpj,
        c.created_at,
        s.status as subscription_status,
        s.current_period_end,
        s.trial_ends_at,
        p.name as plan_name,
        p.price as plan_price
      FROM companies c
      LEFT JOIN subscriptions s ON c.id = s.company_id
      LEFT JOIN plans p ON s.plan_id = p.id
      ORDER BY c.created_at DESC
    `);

    res.json({ empresas: result.rows });
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({ error: 'Erro ao listar empresas' });
  }
});

// Listar planos disponíveis
app.get('/api/admin/assinaturas/planos', verifySuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, slug, description, price, billing_cycle,
             max_users, max_leads, max_storage_gb, max_equipes,
             features, is_popular, active
      FROM plans
      ORDER BY display_order ASC, price ASC
    `);

    res.json({ planos: result.rows });
  } catch (error) {
    console.error('Erro ao listar planos:', error);
    res.status(500).json({ error: 'Erro ao listar planos' });
  }
});

// Obter detalhes de uma empresa específica
app.get('/api/admin/assinaturas/empresa/:companyId', verifySuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;

    const companyResult = await pool.query(`
      SELECT c.*, s.status as subscription_status, s.current_period_end,
             s.trial_ends_at, p.name as plan_name, p.price as plan_price
      FROM companies c
      LEFT JOIN subscriptions s ON c.id = s.company_id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE c.id = $1
    `, [companyId]);

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    const usersResult = await pool.query(
      'SELECT id, nome, email, role, created_at FROM usuarios WHERE company_id = $1',
      [companyId]
    );

    res.json({
      empresa: companyResult.rows[0],
      usuarios: usersResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    res.status(500).json({ error: 'Erro ao buscar empresa' });
  }
});

// Alterar status da assinatura
app.post('/api/admin/assinaturas/alterar-status', verifySuperAdmin, async (req, res) => {
  try {
    const { companyId, status, planId } = req.body;

    if (!companyId || !status) {
      return res.status(400).json({ error: 'companyId e status são obrigatórios' });
    }

    const updateFields = ['status = $1', 'updated_at = NOW()'];
    const values = [status];
    let paramIndex = 2;

    if (planId) {
      updateFields.push(`plan_id = $${paramIndex}`);
      values.push(planId);
      paramIndex++;
    }

    values.push(companyId);

    const result = await pool.query(`
      UPDATE subscriptions
      SET ${updateFields.join(', ')}
      WHERE company_id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    res.json({
      message: 'Status alterado com sucesso',
      subscription: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    res.status(500).json({ error: 'Erro ao alterar status' });
  }
});

// Criar nova empresa
app.post('/api/admin/assinaturas/criar-empresa', verifySuperAdmin, async (req, res) => {
  try {
    const { nome, email, cnpj, planId, adminNome, adminEmail, adminSenha } = req.body;

    if (!nome || !email || !adminNome || !adminEmail || !adminSenha) {
      return res.status(400).json({ error: 'Campos obrigatórios: nome, email, adminNome, adminEmail, adminSenha' });
    }

    await pool.query('BEGIN');

    try {
      // Criar empresa
      const companyResult = await pool.query(
        `INSERT INTO companies (nome, email, cnpj, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        [nome, email, cnpj || null]
      );

      const company_id = companyResult.rows[0].id;

      // Criar usuário admin
      const senha_hash = await bcrypt.hash(adminSenha, 10);
      const linkPublico = adminNome.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Math.random().toString(36).substring(2, 8);

      await pool.query(
        `INSERT INTO usuarios (nome, email, senha_hash, role, company_id, link_publico, created_at)
         VALUES ($1, $2, $3, 'admin', $4, $5, NOW())`,
        [adminNome, adminEmail, senha_hash, company_id, linkPublico]
      );

      // Criar assinatura
      if (planId) {
        await pool.query(
          `INSERT INTO subscriptions (company_id, plan_id, status, current_period_start, current_period_end)
           VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '1 month')`,
          [company_id, planId]
        );
      }

      await pool.query('COMMIT');

      res.status(201).json({
        message: 'Empresa criada com sucesso',
        company_id
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    res.status(500).json({ error: 'Erro ao criar empresa', message: error.message });
  }
});

// Excluir empresa
app.delete('/api/admin/assinaturas/empresa/:companyId', verifySuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;

    await pool.query('BEGIN');

    try {
      // Deletar em ordem para respeitar foreign keys
      await pool.query('DELETE FROM subscriptions WHERE company_id = $1', [companyId]);
      await pool.query('DELETE FROM clientes WHERE company_id = $1', [companyId]);
      await pool.query('DELETE FROM usuarios WHERE company_id = $1', [companyId]);
      await pool.query('DELETE FROM companies WHERE id = $1', [companyId]);

      await pool.query('COMMIT');

      res.json({ message: 'Empresa excluída com sucesso' });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Erro ao excluir empresa:', error);
    res.status(500).json({ error: 'Erro ao excluir empresa' });
  }
});

// ============================================
// ROTAS DE COBRANÇA (ASAAS)
// ============================================

// Gerar cobrança via Asaas (Cartão, Boleto, PIX)
app.post('/api/admin/assinaturas/empresa/:companyId/gerar-cobranca', verifySuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { valor, descricao, tipo, vencimentoDias = 3 } = req.body;

    if (!valor || !descricao) {
      return res.status(400).json({ error: 'Valor e descrição são obrigatórios' });
    }

    // Buscar dados da empresa
    const empresaResult = await pool.query(
      'SELECT id, nome, email, cnpj, asaas_customer_id FROM companies WHERE id = $1',
      [companyId]
    );

    if (empresaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    const empresa = empresaResult.rows[0];
    let customerId = empresa.asaas_customer_id;

    // Criar cliente no Asaas se não existir
    if (!customerId) {
      try {
        const customerResponse = await asaasAPI.post('/customers', {
          name: empresa.nome,
          email: empresa.email,
          cpfCnpj: empresa.cnpj || '00000000000',
          notificationDisabled: false
        });
        customerId = customerResponse.data.id;

        // Salvar customer_id na empresa
        await pool.query(
          'UPDATE companies SET asaas_customer_id = $1 WHERE id = $2',
          [customerId, companyId]
        );
      } catch (asaasError) {
        console.error('Erro ao criar cliente Asaas:', asaasError.response?.data || asaasError.message);
        return res.status(500).json({
          error: 'Erro ao criar cliente no gateway de pagamento',
          details: asaasError.response?.data?.errors?.[0]?.description
        });
      }
    }

    // Calcular data de vencimento
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + vencimentoDias);

    // Criar cobrança no Asaas
    const billingType = tipo === 'pix' ? 'PIX' : tipo === 'boleto' ? 'BOLETO' : 'UNDEFINED';

    const paymentData = {
      customer: customerId,
      billingType: billingType,
      dueDate: dueDate.toISOString().split('T')[0],
      value: parseFloat(valor),
      description: descricao,
      externalReference: `company_${companyId}_${Date.now()}`,
      postalService: false
    };

    const paymentResponse = await asaasAPI.post('/payments', paymentData);
    const payment = paymentResponse.data;

    // Se for PIX, buscar QR Code
    let pixData = null;
    if (billingType === 'PIX') {
      try {
        const pixResponse = await asaasAPI.get(`/payments/${payment.id}/pixQrCode`);
        pixData = {
          qrCode: pixResponse.data.encodedImage,
          payload: pixResponse.data.payload,
          expirationDate: pixResponse.data.expirationDate
        };
      } catch (pixError) {
        console.error('Erro ao gerar QR Code PIX:', pixError.message);
      }
    }

    // Salvar cobrança no banco
    await pool.query(`
      INSERT INTO pagamentos (company_id, asaas_payment_id, valor, status, tipo, descricao, vencimento, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [companyId, payment.id, valor, payment.status, billingType, descricao, dueDate]);

    res.json({
      message: 'Cobrança gerada com sucesso',
      payment: {
        id: payment.id,
        status: payment.status,
        value: payment.value,
        dueDate: payment.dueDate,
        billingType: payment.billingType,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
        pix: pixData
      }
    });

  } catch (error) {
    console.error('Erro ao gerar cobrança:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Erro ao gerar cobrança',
      details: error.response?.data?.errors?.[0]?.description || error.message
    });
  }
});

// Listar histórico de pagamentos da empresa
app.get('/api/admin/assinaturas/empresa/:companyId/pagamentos', verifySuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;

    // Buscar pagamentos do banco local
    const pagamentosResult = await pool.query(`
      SELECT id, asaas_payment_id, valor, status, tipo, descricao, vencimento, created_at
      FROM pagamentos
      WHERE company_id = $1
      ORDER BY created_at DESC
    `, [companyId]);

    // Se a empresa tem customer_id, buscar também do Asaas
    const empresaResult = await pool.query(
      'SELECT asaas_customer_id FROM companies WHERE id = $1',
      [companyId]
    );

    let asaasPayments = [];
    if (empresaResult.rows[0]?.asaas_customer_id) {
      try {
        const asaasResponse = await asaasAPI.get('/payments', {
          params: {
            customer: empresaResult.rows[0].asaas_customer_id,
            limit: 100
          }
        });
        asaasPayments = asaasResponse.data.data || [];
      } catch (asaasError) {
        console.error('Erro ao buscar pagamentos Asaas:', asaasError.message);
      }
    }

    res.json({
      pagamentos: pagamentosResult.rows,
      asaasPayments: asaasPayments
    });

  } catch (error) {
    console.error('Erro ao listar pagamentos:', error);
    res.status(500).json({ error: 'Erro ao listar pagamentos' });
  }
});

// Consultar status de um pagamento específico
app.get('/api/admin/pagamentos/:paymentId/status', verifySuperAdmin, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const asaasResponse = await asaasAPI.get(`/payments/${paymentId}`);
    const payment = asaasResponse.data;

    // Atualizar status no banco local
    await pool.query(
      'UPDATE pagamentos SET status = $1, updated_at = NOW() WHERE asaas_payment_id = $2',
      [payment.status, paymentId]
    );

    res.json({
      id: payment.id,
      status: payment.status,
      value: payment.value,
      netValue: payment.netValue,
      dueDate: payment.dueDate,
      paymentDate: payment.paymentDate,
      billingType: payment.billingType,
      invoiceUrl: payment.invoiceUrl,
      bankSlipUrl: payment.bankSlipUrl
    });

  } catch (error) {
    console.error('Erro ao consultar pagamento:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao consultar status do pagamento' });
  }
});

// ============================================
// ASSINATURAS RECORRENTES (ASAAS)
// ============================================

// Criar assinatura recorrente para uma empresa
app.post('/api/admin/assinaturas/empresa/:companyId/assinatura-recorrente', verifySuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { planId, billingType = 'BOLETO', nextDueDate, discount } = req.body;

    // Buscar dados da empresa
    const empresaResult = await pool.query(
      'SELECT id, nome, email, cnpj, asaas_customer_id FROM companies WHERE id = $1',
      [companyId]
    );

    if (empresaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    const empresa = empresaResult.rows[0];

    // Buscar plano
    const planoResult = await pool.query(
      'SELECT id, name, price, billing_cycle FROM plans WHERE id = $1',
      [planId]
    );

    if (planoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    const plano = planoResult.rows[0];
    let customerId = empresa.asaas_customer_id;

    // Criar cliente no Asaas se não existir
    if (!customerId) {
      try {
        const customerResponse = await asaasAPI.post('/customers', {
          name: empresa.nome,
          email: empresa.email,
          cpfCnpj: empresa.cnpj || '00000000000',
          notificationDisabled: false
        });
        customerId = customerResponse.data.id;

        await pool.query(
          'UPDATE companies SET asaas_customer_id = $1 WHERE id = $2',
          [customerId, companyId]
        );
      } catch (asaasError) {
        console.error('Erro ao criar cliente Asaas:', asaasError.response?.data || asaasError.message);
        return res.status(500).json({
          error: 'Erro ao criar cliente no gateway de pagamento',
          details: asaasError.response?.data?.errors?.[0]?.description
        });
      }
    }

    // Calcular data do próximo vencimento (primeiro dia do próximo mês se não informado)
    let dueDate = nextDueDate;
    if (!dueDate) {
      const today = new Date();
      dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split('T')[0];
    }

    // Criar assinatura recorrente no Asaas
    const subscriptionData = {
      customer: customerId,
      billingType: billingType, // BOLETO, CREDIT_CARD, PIX, UNDEFINED
      cycle: plano.billing_cycle === 'yearly' ? 'YEARLY' : 'MONTHLY',
      value: parseFloat(plano.price),
      nextDueDate: dueDate,
      description: `Assinatura ${plano.name} - ${empresa.nome}`,
      externalReference: `company_${companyId}_plan_${planId}`,
      // Configurações de multa e juros
      fine: { value: 2 }, // 2% de multa
      interest: { value: 1 }, // 1% de juros ao mês
    };

    // Adicionar desconto se informado
    if (discount && discount.value > 0) {
      subscriptionData.discount = {
        value: discount.value,
        dueDateLimitDays: discount.dueDateLimitDays || 0,
        type: discount.type || 'FIXED' // FIXED ou PERCENTAGE
      };
    }

    const subscriptionResponse = await asaasAPI.post('/subscriptions', subscriptionData);
    const asaasSubscription = subscriptionResponse.data;

    // Atualizar assinatura no banco local
    await pool.query(`
      UPDATE subscriptions SET
        asaas_subscription_id = $1,
        status = 'active',
        plan_id = $2,
        current_period_start = NOW(),
        current_period_end = NOW() + INTERVAL '1 month',
        updated_at = NOW()
      WHERE company_id = $3
    `, [asaasSubscription.id, planId, companyId]);

    res.json({
      message: 'Assinatura recorrente criada com sucesso',
      subscription: {
        id: asaasSubscription.id,
        status: asaasSubscription.status,
        value: asaasSubscription.value,
        cycle: asaasSubscription.cycle,
        nextDueDate: asaasSubscription.nextDueDate,
        billingType: asaasSubscription.billingType,
        description: asaasSubscription.description
      }
    });

  } catch (error) {
    console.error('Erro ao criar assinatura recorrente:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Erro ao criar assinatura recorrente',
      details: error.response?.data?.errors?.[0]?.description || error.message
    });
  }
});

// Cancelar assinatura recorrente
app.post('/api/admin/assinaturas/empresa/:companyId/cancelar-assinatura', verifySuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;

    // Buscar assinatura
    const subscriptionResult = await pool.query(
      'SELECT asaas_subscription_id FROM subscriptions WHERE company_id = $1',
      [companyId]
    );

    if (subscriptionResult.rows.length === 0 || !subscriptionResult.rows[0].asaas_subscription_id) {
      return res.status(404).json({ error: 'Assinatura não encontrada ou não possui assinatura no Asaas' });
    }

    const asaasSubscriptionId = subscriptionResult.rows[0].asaas_subscription_id;

    // Cancelar no Asaas
    await asaasAPI.delete(`/subscriptions/${asaasSubscriptionId}`);

    // Atualizar status local
    await pool.query(`
      UPDATE subscriptions SET
        status = 'canceled',
        asaas_subscription_id = NULL,
        canceled_at = NOW(),
        updated_at = NOW()
      WHERE company_id = $1
    `, [companyId]);

    res.json({ message: 'Assinatura cancelada com sucesso' });

  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Erro ao cancelar assinatura',
      details: error.response?.data?.errors?.[0]?.description || error.message
    });
  }
});

// Atualizar assinatura recorrente (mudar plano, valor, etc)
app.put('/api/admin/assinaturas/empresa/:companyId/assinatura-recorrente', verifySuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { planId, billingType, nextDueDate, updatePendingPayments = false } = req.body;

    // Buscar assinatura
    const subscriptionResult = await pool.query(
      'SELECT asaas_subscription_id FROM subscriptions WHERE company_id = $1',
      [companyId]
    );

    if (subscriptionResult.rows.length === 0 || !subscriptionResult.rows[0].asaas_subscription_id) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    const asaasSubscriptionId = subscriptionResult.rows[0].asaas_subscription_id;

    // Buscar novo plano se informado
    let updateData = {};
    if (planId) {
      const planoResult = await pool.query(
        'SELECT id, name, price, billing_cycle FROM plans WHERE id = $1',
        [planId]
      );

      if (planoResult.rows.length === 0) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      const plano = planoResult.rows[0];
      updateData.value = parseFloat(plano.price);
      updateData.cycle = plano.billing_cycle === 'yearly' ? 'YEARLY' : 'MONTHLY';
      updateData.description = `Assinatura ${plano.name}`;
    }

    if (billingType) {
      updateData.billingType = billingType;
    }

    if (nextDueDate) {
      updateData.nextDueDate = nextDueDate;
    }

    updateData.updatePendingPayments = updatePendingPayments;

    // Atualizar no Asaas
    const asaasResponse = await asaasAPI.put(`/subscriptions/${asaasSubscriptionId}`, updateData);

    // Atualizar no banco local
    if (planId) {
      await pool.query(`
        UPDATE subscriptions SET
          plan_id = $1,
          updated_at = NOW()
        WHERE company_id = $2
      `, [planId, companyId]);
    }

    res.json({
      message: 'Assinatura atualizada com sucesso',
      subscription: asaasResponse.data
    });

  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Erro ao atualizar assinatura',
      details: error.response?.data?.errors?.[0]?.description || error.message
    });
  }
});

// Obter detalhes da assinatura no Asaas
app.get('/api/admin/assinaturas/empresa/:companyId/assinatura-recorrente', verifySuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;

    // Buscar assinatura
    const subscriptionResult = await pool.query(
      'SELECT asaas_subscription_id, plan_id, status FROM subscriptions WHERE company_id = $1',
      [companyId]
    );

    if (subscriptionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    const localSubscription = subscriptionResult.rows[0];

    // Se não tem assinatura no Asaas, retornar apenas dados locais
    if (!localSubscription.asaas_subscription_id) {
      return res.json({
        local: localSubscription,
        asaas: null,
        message: 'Empresa não possui assinatura recorrente no Asaas'
      });
    }

    // Buscar detalhes no Asaas
    const asaasResponse = await asaasAPI.get(`/subscriptions/${localSubscription.asaas_subscription_id}`);

    // Buscar pagamentos da assinatura
    const paymentsResponse = await asaasAPI.get('/payments', {
      params: {
        subscription: localSubscription.asaas_subscription_id,
        limit: 12
      }
    });

    res.json({
      local: localSubscription,
      asaas: asaasResponse.data,
      payments: paymentsResponse.data.data || []
    });

  } catch (error) {
    console.error('Erro ao buscar assinatura:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Erro ao buscar detalhes da assinatura',
      details: error.response?.data?.errors?.[0]?.description || error.message
    });
  }
});

// Listar faturas pendentes de uma assinatura
app.get('/api/admin/assinaturas/empresa/:companyId/faturas-pendentes', verifySuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;

    const subscriptionResult = await pool.query(
      'SELECT asaas_subscription_id FROM subscriptions WHERE company_id = $1',
      [companyId]
    );

    if (subscriptionResult.rows.length === 0 || !subscriptionResult.rows[0].asaas_subscription_id) {
      return res.json({ payments: [] });
    }

    const asaasResponse = await asaasAPI.get('/payments', {
      params: {
        subscription: subscriptionResult.rows[0].asaas_subscription_id,
        status: 'PENDING'
      }
    });

    res.json({ payments: asaasResponse.data.data || [] });

  } catch (error) {
    console.error('Erro ao buscar faturas pendentes:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao buscar faturas pendentes' });
  }
});

// ============================================
// CRUD DE PLANOS (SUPER ADMIN)
// ============================================

// Criar novo plano
app.post('/api/admin/assinaturas/planos', verifySuperAdmin, async (req, res) => {
  try {
    const { name, slug, description, price, billing_cycle, max_users, max_leads, max_storage_gb, max_equipes, features, is_popular } = req.body;

    if (!name || !slug || price === undefined) {
      return res.status(400).json({ error: 'name, slug e price são obrigatórios' });
    }

    const result = await pool.query(`
      INSERT INTO plans (name, slug, description, price, billing_cycle, max_users, max_leads, max_storage_gb, max_equipes, features, is_popular, active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW())
      RETURNING *
    `, [name, slug, description, price, billing_cycle || 'monthly', max_users || 5, max_leads || 100, max_storage_gb || 1, max_equipes || 1, JSON.stringify(features || []), is_popular || false]);

    res.status(201).json({
      message: 'Plano criado com sucesso',
      plano: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao criar plano:', error);
    res.status(500).json({ error: 'Erro ao criar plano', message: error.message });
  }
});

// Atualizar plano
app.put('/api/admin/assinaturas/planos/:planoId', verifySuperAdmin, async (req, res) => {
  try {
    const { planoId } = req.params;
    const { name, slug, description, price, billing_cycle, max_users, max_leads, max_storage_gb, max_equipes, features, is_popular, active } = req.body;

    const result = await pool.query(`
      UPDATE plans SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        description = COALESCE($3, description),
        price = COALESCE($4, price),
        billing_cycle = COALESCE($5, billing_cycle),
        max_users = COALESCE($6, max_users),
        max_leads = COALESCE($7, max_leads),
        max_storage_gb = COALESCE($8, max_storage_gb),
        max_equipes = COALESCE($9, max_equipes),
        features = COALESCE($10, features),
        is_popular = COALESCE($11, is_popular),
        active = COALESCE($12, active),
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [name, slug, description, price, billing_cycle, max_users, max_leads, max_storage_gb, max_equipes, features ? JSON.stringify(features) : null, is_popular, active, planoId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    res.json({
      message: 'Plano atualizado com sucesso',
      plano: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    res.status(500).json({ error: 'Erro ao atualizar plano' });
  }
});

// Excluir plano
app.delete('/api/admin/assinaturas/planos/:planoId', verifySuperAdmin, async (req, res) => {
  try {
    const { planoId } = req.params;

    // Verificar se há assinaturas usando este plano
    const subscriptionsCheck = await pool.query(
      'SELECT COUNT(*) FROM subscriptions WHERE plan_id = $1',
      [planoId]
    );

    if (parseInt(subscriptionsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir este plano',
        message: 'Existem assinaturas ativas usando este plano. Desative o plano ou migre as assinaturas primeiro.'
      });
    }

    await pool.query('DELETE FROM plans WHERE id = $1', [planoId]);

    res.json({ message: 'Plano excluído com sucesso' });

  } catch (error) {
    console.error('Erro ao excluir plano:', error);
    res.status(500).json({ error: 'Erro ao excluir plano' });
  }
});

// ============================================
// GERENCIAMENTO DE USUÁRIOS (SUPER ADMIN)
// ============================================

// Listar usuários de uma empresa
app.get('/api/admin/empresas/:companyId/usuarios', verifySuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;

    const result = await pool.query(`
      SELECT id, nome, email, role, created_at
      FROM usuarios
      WHERE company_id = $1
      ORDER BY created_at DESC
    `, [companyId]);

    res.json({ usuarios: result.rows });

  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// Criar usuário em uma empresa
app.post('/api/admin/empresas/:companyId/usuarios', verifySuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { nome, email, senha, role = 'vendedor' } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'nome, email e senha são obrigatórios' });
    }

    // Verificar se email já existe
    const emailCheck = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Este email já está em uso' });
    }

    const senha_hash = await bcrypt.hash(senha, 10);
    const linkPublico = nome.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substring(2, 8);

    const result = await pool.query(`
      INSERT INTO usuarios (nome, email, senha_hash, role, company_id, link_publico, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, nome, email, role, created_at
    `, [nome, email, senha_hash, role, companyId, linkPublico]);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      usuario: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// Atualizar usuário
app.put('/api/admin/usuarios/:usuarioId', verifySuperAdmin, async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { nome, email, role } = req.body;

    const result = await pool.query(`
      UPDATE usuarios SET
        nome = COALESCE($1, nome),
        email = COALESCE($2, email),
        role = COALESCE($3, role),
        updated_at = NOW()
      WHERE id = $4
      RETURNING id, nome, email, role
    `, [nome, email, role, usuarioId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      message: 'Usuário atualizado com sucesso',
      usuario: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// Resetar senha de usuário
app.post('/api/admin/usuarios/:usuarioId/resetar-senha', verifySuperAdmin, async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { novaSenha } = req.body;

    // Se não informar nova senha, gera uma aleatória
    const senha = novaSenha || Math.random().toString(36).substring(2, 10);
    const senha_hash = await bcrypt.hash(senha, 10);

    const result = await pool.query(
      'UPDATE usuarios SET senha_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING email, nome',
      [senha_hash, usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      message: 'Senha resetada com sucesso',
      usuario: result.rows[0],
      novaSenha: senha // Apenas retorna se foi gerada automaticamente
    });

  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ error: 'Erro ao resetar senha' });
  }
});

// Excluir usuário
app.delete('/api/admin/usuarios/:usuarioId', verifySuperAdmin, async (req, res) => {
  try {
    const { usuarioId } = req.params;

    // Verificar se é o único admin da empresa
    const userCheck = await pool.query(
      'SELECT company_id, role FROM usuarios WHERE id = $1',
      [usuarioId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const { company_id, role } = userCheck.rows[0];

    if (role === 'admin') {
      const adminCount = await pool.query(
        "SELECT COUNT(*) FROM usuarios WHERE company_id = $1 AND role = 'admin'",
        [company_id]
      );

      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({
          error: 'Não é possível excluir o único administrador da empresa'
        });
      }
    }

    await pool.query('DELETE FROM usuarios WHERE id = $1', [usuarioId]);

    res.json({ message: 'Usuário excluído com sucesso' });

  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

// Atualizar empresa
app.put('/api/admin/assinaturas/empresa/:companyId', verifySuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { nome, email, cnpj, telefone } = req.body;

    const result = await pool.query(`
      UPDATE companies SET
        nome = COALESCE($1, nome),
        email = COALESCE($2, email),
        cnpj = COALESCE($3, cnpj),
        telefone = COALESCE($4, telefone),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [nome, email, cnpj, telefone, companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    res.json({
      message: 'Empresa atualizada com sucesso',
      empresa: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    res.status(500).json({ error: 'Erro ao atualizar empresa' });
  }
});

// ============================================
// ROTAS DE SESSÕES E MONITORAMENTO (SUPER ADMIN)
// ============================================

// Função auxiliar para formatar duração
function formatDuration(minutes) {
  if (!minutes || minutes < 0) return '0min';
  const mins = Math.round(minutes);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hours < 24) return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

// Listar usuários online
app.get('/api/admin/sessions/online', verifySuperAdmin, async (req, res) => {
  try {
    const minutesThreshold = parseInt(req.query.minutes) || 5;

    const query = `
      SELECT
        u.id,
        u.nome,
        u.email,
        u.role,
        u.last_login,
        u.last_activity,
        c.nome as empresa_nome,
        c.id as company_id,
        s.login_at as session_start,
        s.ip_address,
        CASE
          WHEN u.last_activity > NOW() - INTERVAL '${minutesThreshold} minutes' THEN true
          ELSE false
        END as is_online,
        EXTRACT(EPOCH FROM (NOW() - s.login_at)) / 60 as session_duration_minutes
      FROM usuarios u
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN user_sessions s ON u.id = s.user_id AND s.is_active = true
      WHERE u.role != 'super_admin'
      ORDER BY u.last_activity DESC NULLS LAST
    `;

    const result = await pool.query(query);

    const users = result.rows.map(user => ({
      ...user,
      session_duration_formatted: user.session_duration_minutes
        ? formatDuration(user.session_duration_minutes)
        : null
    }));

    const online = users.filter(u => u.is_online);
    const offline = users.filter(u => !u.is_online);

    res.json({
      online: { count: online.length, users: online },
      offline: { count: offline.length, users: offline },
      total: users.length
    });
  } catch (error) {
    console.error('Erro ao buscar usuários online:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários online' });
  }
});

// Estatísticas de sessões
app.get('/api/admin/sessions/stats', verifySuperAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const onlineNow = await pool.query(`
      SELECT COUNT(*) as count FROM usuarios
      WHERE last_activity > NOW() - INTERVAL '5 minutes' AND role != 'super_admin'
    `);

    const totalSessions = await pool.query(`
      SELECT COUNT(*) as count FROM user_sessions WHERE login_at > NOW() - INTERVAL '${days} days'
    `);

    const avgDuration = await pool.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(logout_at, NOW()) - login_at)) / 60) as avg_minutes
      FROM user_sessions WHERE login_at > NOW() - INTERVAL '${days} days'
    `);

    const sessionsPerDay = await pool.query(`
      SELECT DATE(login_at) as date, COUNT(*) as sessions, COUNT(DISTINCT user_id) as unique_users
      FROM user_sessions WHERE login_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(login_at) ORDER BY date DESC
    `);

    const mostActiveUsers = await pool.query(`
      SELECT u.id, u.nome, u.email, c.nome as empresa_nome,
        COUNT(s.id) as total_sessions,
        SUM(EXTRACT(EPOCH FROM (COALESCE(s.logout_at, NOW()) - s.login_at)) / 60) as total_minutes
      FROM usuarios u
      LEFT JOIN user_sessions s ON u.id = s.user_id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE s.login_at > NOW() - INTERVAL '${days} days' AND u.role != 'super_admin'
      GROUP BY u.id, u.nome, u.email, c.nome
      ORDER BY total_minutes DESC LIMIT 10
    `);

    res.json({
      online_now: parseInt(onlineNow.rows[0].count),
      total_sessions: parseInt(totalSessions.rows[0].count),
      avg_session_minutes: Math.round(avgDuration.rows[0].avg_minutes || 0),
      avg_session_formatted: formatDuration(avgDuration.rows[0].avg_minutes || 0),
      sessions_per_day: sessionsPerDay.rows,
      most_active_users: mostActiveUsers.rows.map(u => ({
        ...u,
        total_time_formatted: formatDuration(u.total_minutes)
      })),
      period_days: days
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas de sessões' });
  }
});

// Histórico de sessões de um usuário
app.get('/api/admin/sessions/user/:userId', verifySuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const query = `
      SELECT s.id, s.login_at, s.logout_at, s.last_activity, s.ip_address, s.is_active,
        EXTRACT(EPOCH FROM (COALESCE(s.logout_at, NOW()) - s.login_at)) / 60 as duration_minutes,
        u.nome as usuario_nome, c.nome as empresa_nome
      FROM user_sessions s
      JOIN usuarios u ON s.user_id = u.id
      LEFT JOIN companies c ON s.company_id = c.id
      WHERE s.user_id = $1
      ORDER BY s.login_at DESC LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);

    const sessions = result.rows.map(session => ({
      ...session,
      duration_formatted: formatDuration(session.duration_minutes)
    }));

    res.json({ sessions });
  } catch (error) {
    console.error('Erro ao buscar histórico de sessões:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico de sessões' });
  }
});

// ============================================
// ROTAS DE BILLING (INTEGRAÇÃO ASAAS)
// ============================================

// Listar faturas/pagamentos da empresa
app.get('/api/billing/invoices', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const companyId = decoded.company_id;

    // Buscar asaas_customer_id da empresa
    const companyResult = await pool.query(
      'SELECT asaas_customer_id FROM companies WHERE id = $1',
      [companyId]
    );

    if (!companyResult.rows[0]?.asaas_customer_id) {
      return res.json({ data: [] });
    }

    const asaasCustomerId = companyResult.rows[0].asaas_customer_id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // Buscar pagamentos no Asaas
    const asaasResponse = await asaasAPI.get('/payments', {
      params: {
        customer: asaasCustomerId,
        limit,
        offset
      }
    });

    const invoices = (asaasResponse.data.data || []).map(payment => ({
      id: payment.id,
      description: payment.description || 'Assinatura',
      amount: payment.value,
      status: mapAsaasStatus(payment.status),
      due_date: payment.dueDate,
      created_at: payment.dateCreated,
      paid_at: payment.paymentDate,
      gateway_invoice_url: payment.invoiceUrl,
      boleto_url: payment.bankSlipUrl,
      pix_qrcode: payment.pixQrCodeUrl
    }));

    res.json({ data: invoices });

  } catch (error) {
    console.error('Erro ao listar faturas:', error.response?.data || error.message);
    // Retorna array vazio em caso de erro para não quebrar o frontend
    res.json({ data: [] });
  }
});

// Estatísticas de billing
app.get('/api/billing/stats', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const companyId = decoded.company_id;

    // Buscar asaas_customer_id da empresa
    const companyResult = await pool.query(
      'SELECT asaas_customer_id FROM companies WHERE id = $1',
      [companyId]
    );

    if (!companyResult.rows[0]?.asaas_customer_id) {
      return res.json({
        data: {
          total_paid: 0,
          total_pending: 0,
          overdue_amount: 0,
          invoice_count: 0
        }
      });
    }

    const asaasCustomerId = companyResult.rows[0].asaas_customer_id;

    // Buscar todos os pagamentos para calcular estatísticas
    const asaasResponse = await asaasAPI.get('/payments', {
      params: {
        customer: asaasCustomerId,
        limit: 100
      }
    });

    const payments = asaasResponse.data.data || [];
    const now = new Date();

    let total_paid = 0;
    let total_pending = 0;
    let overdue_amount = 0;

    payments.forEach(payment => {
      if (payment.status === 'CONFIRMED' || payment.status === 'RECEIVED') {
        total_paid += payment.value;
      } else if (payment.status === 'PENDING' || payment.status === 'AWAITING_RISK_ANALYSIS') {
        total_pending += payment.value;
        // Verificar se está vencido
        if (new Date(payment.dueDate) < now) {
          overdue_amount += payment.value;
        }
      } else if (payment.status === 'OVERDUE') {
        overdue_amount += payment.value;
      }
    });

    res.json({
      data: {
        total_paid,
        total_pending,
        overdue_amount,
        invoice_count: payments.length
      }
    });

  } catch (error) {
    console.error('Erro ao buscar stats:', error.response?.data || error.message);
    res.json({
      data: {
        total_paid: 0,
        total_pending: 0,
        overdue_amount: 0,
        invoice_count: 0
      }
    });
  }
});

// Próxima fatura
app.get('/api/billing/next', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const companyId = decoded.company_id;

    // Buscar asaas_customer_id da empresa
    const companyResult = await pool.query(
      'SELECT asaas_customer_id FROM companies WHERE id = $1',
      [companyId]
    );

    if (!companyResult.rows[0]?.asaas_customer_id) {
      return res.json({ data: null });
    }

    const asaasCustomerId = companyResult.rows[0].asaas_customer_id;

    // Buscar próximo pagamento pendente
    const asaasResponse = await asaasAPI.get('/payments', {
      params: {
        customer: asaasCustomerId,
        status: 'PENDING',
        limit: 1,
        order: 'asc',
        orderBy: 'dueDate'
      }
    });

    const nextPayment = asaasResponse.data.data?.[0];

    if (!nextPayment) {
      return res.json({ data: null });
    }

    res.json({
      data: {
        id: nextPayment.id,
        description: nextPayment.description || 'Assinatura',
        amount: nextPayment.value,
        due_date: nextPayment.dueDate,
        gateway_invoice_url: nextPayment.invoiceUrl,
        boleto_url: nextPayment.bankSlipUrl,
        pix_qrcode: nextPayment.pixQrCodeUrl
      }
    });

  } catch (error) {
    console.error('Erro ao buscar próxima fatura:', error.response?.data || error.message);
    res.json({ data: null });
  }
});

// Faturas vencidas
app.get('/api/billing/overdue', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const companyId = decoded.company_id;

    const companyResult = await pool.query(
      'SELECT asaas_customer_id FROM companies WHERE id = $1',
      [companyId]
    );

    if (!companyResult.rows[0]?.asaas_customer_id) {
      return res.json({ data: [] });
    }

    const asaasCustomerId = companyResult.rows[0].asaas_customer_id;

    const asaasResponse = await asaasAPI.get('/payments', {
      params: {
        customer: asaasCustomerId,
        status: 'OVERDUE',
        limit: 20
      }
    });

    const overduePayments = (asaasResponse.data.data || []).map(payment => ({
      id: payment.id,
      description: payment.description || 'Assinatura',
      amount: payment.value,
      due_date: payment.dueDate,
      gateway_invoice_url: payment.invoiceUrl
    }));

    res.json({ data: overduePayments });

  } catch (error) {
    console.error('Erro ao buscar faturas vencidas:', error.response?.data || error.message);
    res.json({ data: [] });
  }
});

// Faturas próximas de vencer
app.get('/api/billing/upcoming', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const companyId = decoded.company_id;
    const days = parseInt(req.query.days) || 7;

    const companyResult = await pool.query(
      'SELECT asaas_customer_id FROM companies WHERE id = $1',
      [companyId]
    );

    if (!companyResult.rows[0]?.asaas_customer_id) {
      return res.json({ data: [] });
    }

    const asaasCustomerId = companyResult.rows[0].asaas_customer_id;

    // Calcular data limite
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + days);

    const asaasResponse = await asaasAPI.get('/payments', {
      params: {
        customer: asaasCustomerId,
        status: 'PENDING',
        'dueDate[le]': limitDate.toISOString().split('T')[0],
        limit: 10
      }
    });

    const upcomingPayments = (asaasResponse.data.data || []).map(payment => ({
      id: payment.id,
      description: payment.description || 'Assinatura',
      amount: payment.value,
      due_date: payment.dueDate,
      gateway_invoice_url: payment.invoiceUrl
    }));

    res.json({ data: upcomingPayments });

  } catch (error) {
    console.error('Erro ao buscar faturas próximas:', error.response?.data || error.message);
    res.json({ data: [] });
  }
});

// Dashboard de billing
app.get('/api/billing/dashboard', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-default');
    const companyId = decoded.company_id;

    const companyResult = await pool.query(
      'SELECT asaas_customer_id FROM companies WHERE id = $1',
      [companyId]
    );

    if (!companyResult.rows[0]?.asaas_customer_id) {
      return res.json({
        data: {
          total_revenue: 0,
          monthly_revenue: 0,
          pending_amount: 0,
          overdue_count: 0
        }
      });
    }

    const asaasCustomerId = companyResult.rows[0].asaas_customer_id;

    // Buscar pagamentos do mês atual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const asaasResponse = await asaasAPI.get('/payments', {
      params: {
        customer: asaasCustomerId,
        limit: 100
      }
    });

    const payments = asaasResponse.data.data || [];

    let total_revenue = 0;
    let monthly_revenue = 0;
    let pending_amount = 0;
    let overdue_count = 0;

    payments.forEach(payment => {
      if (payment.status === 'CONFIRMED' || payment.status === 'RECEIVED') {
        total_revenue += payment.value;
        if (payment.paymentDate >= firstDayOfMonth) {
          monthly_revenue += payment.value;
        }
      } else if (payment.status === 'PENDING') {
        pending_amount += payment.value;
      } else if (payment.status === 'OVERDUE') {
        overdue_count++;
      }
    });

    res.json({
      data: {
        total_revenue,
        monthly_revenue,
        pending_amount,
        overdue_count
      }
    });

  } catch (error) {
    console.error('Erro ao buscar dashboard:', error.response?.data || error.message);
    res.json({
      data: {
        total_revenue: 0,
        monthly_revenue: 0,
        pending_amount: 0,
        overdue_count: 0
      }
    });
  }
});

// Função auxiliar para mapear status do Asaas
function mapAsaasStatus(asaasStatus) {
  const statusMap = {
    'PENDING': 'pending',
    'AWAITING_RISK_ANALYSIS': 'pending',
    'CONFIRMED': 'paid',
    'RECEIVED': 'paid',
    'OVERDUE': 'failed',
    'REFUNDED': 'cancelled',
    'RECEIVED_IN_CASH': 'paid',
    'REFUND_REQUESTED': 'cancelled',
    'CHARGEBACK_REQUESTED': 'failed',
    'CHARGEBACK_DISPUTE': 'failed',
    'AWAITING_CHARGEBACK_REVERSAL': 'pending',
    'DUNNING_REQUESTED': 'failed',
    'DUNNING_RECEIVED': 'paid',
    'AWAITING_RISK_ANALYSIS': 'pending'
  };
  return statusMap[asaasStatus] || 'pending';
}

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
