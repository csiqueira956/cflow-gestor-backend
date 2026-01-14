import bcrypt from 'bcryptjs';
import Usuario from '../models/Usuario.js';

// Listar todos os vendedores (apenas admin)
export const listarVendedores = async (req, res) => {
  try {
    const { company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    const vendedores = await Usuario.listVendedores(companyId);
    res.json({
      vendedores,
      total: vendedores.length
    });
  } catch (error) {
    console.error('Erro ao listar vendedores:', error);
    res.status(500).json({ error: 'Erro ao listar vendedores' });
  }
};

// Listar todos os gerentes (apenas admin)
export const listarGerentes = async (req, res) => {
  try {
    const { company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    const gerentes = await Usuario.listGerentes(companyId);
    res.json({
      gerentes,
      total: gerentes.length
    });
  } catch (error) {
    console.error('Erro ao listar gerentes:', error);
    res.status(500).json({ error: 'Erro ao listar gerentes' });
  }
};

// Listar todos os usuários não-admin (vendedores e gerentes)
export const listarUsuarios = async (req, res) => {
  try {
    const { company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    const usuarios = await Usuario.listUsuarios(companyId);
    res.json({
      usuarios,
      total: usuarios.length
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
};

// Buscar usuário por ID (apenas admin)
export const buscarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    const usuario = await Usuario.findById(id, companyId);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
};

// Atualizar usuário (apenas admin)
export const atualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    const { nome, email, role, tipo_usuario, percentual_comissao, celular, equipe, senha } = req.body;

    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    // Preparar dados para atualização (equipe do frontend é equipe_id)
    const dadosAtualizacao = {
      nome,
      email,
      role,
      tipo_usuario,
      percentual_comissao,
      celular,
      equipe_id: equipe ? parseInt(equipe, 10) : null  // Converter para inteiro ou null
    };

    // Se uma nova senha foi fornecida, hash ela
    if (senha) {
      const senhaHash = await bcrypt.hash(senha, 10);
      dadosAtualizacao.senha_hash = senhaHash;
    }

    const usuarioAtualizado = await Usuario.update(id, dadosAtualizacao, companyId);

    if (!usuarioAtualizado) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      message: 'Usuário atualizado com sucesso',
      usuario: usuarioAtualizado
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
};

// Deletar usuário (apenas admin)
export const deletarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    // Verificar se o usuário existe
    const usuario = await Usuario.findById(id, companyId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const usuarioDeletado = await Usuario.delete(id, companyId);

    if (!usuarioDeletado) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);

    // Verificar se é erro de foreign key
    if (error.message && error.message.includes('FOREIGN KEY')) {
      return res.status(400).json({
        error: 'Não é possível deletar este usuário pois existem registros vinculados a ele (clientes, comissões, etc.)'
      });
    }

    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
};

// Registrar vendedor (rota pública - via convite do WhatsApp)
export const registrarVendedor = async (req, res) => {
  try {
    const { nome, email, celular, senha, convite_id } = req.body;

    // Validações
    if (!nome || !email || !celular || !senha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    }

    // Verificar se o convite_id existe e é válido
    if (!convite_id) {
      return res.status(400).json({ error: 'ID de convite inválido' });
    }

    // Buscar vendedor que enviou o convite (sem filtro de company pois é público)
    const vendedorConvite = await Usuario.findById(convite_id);
    if (!vendedorConvite) {
      return res.status(400).json({ error: 'Convite inválido' });
    }

    // Verificar se o email já existe
    const usuarioExistente = await Usuario.findByEmail(email);
    if (usuarioExistente) {
      return res.status(400).json({ error: 'Este email já está cadastrado' });
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Criar novo vendedor com o company_id do vendedor que enviou o convite
    const novoVendedor = await Usuario.create({
      nome,
      email,
      senha_hash: senhaHash,
      celular,
      role: 'vendedor',
      tipo_usuario: 'vendedor',
      percentual_comissao: 0,
      equipe_id: vendedorConvite.equipe_id // Herdar a equipe do vendedor que enviou o convite
    }, vendedorConvite.company_id);

    // Remover senha_hash antes de retornar
    delete novoVendedor.senha_hash;

    res.status(201).json({
      message: 'Vendedor registrado com sucesso',
      usuario: novoVendedor
    });
  } catch (error) {
    console.error('Erro ao registrar vendedor:', error);
    res.status(500).json({ error: 'Erro ao registrar vendedor. Tente novamente.' });
  }
};
