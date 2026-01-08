import bcrypt from 'bcryptjs';
import Usuario from '../models/Usuario.js';

// Listar todos os vendedores (apenas admin)
export const listarVendedores = async (req, res) => {
  try {
    const { company_id } = req.user;
    const vendedores = await Usuario.listVendedores(company_id);
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
    const gerentes = await Usuario.listGerentes(company_id);
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
    const usuarios = await Usuario.listUsuarios(company_id);
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
    const usuario = await Usuario.findById(id);

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

    console.log('\n');
    console.log('═'.repeat(80));
    console.log('🔴🔴🔴 req.body COMPLETO RAW:');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('═'.repeat(80));
    console.log('\n');

    const { nome, email, role, tipo_usuario, percentual_comissao, celular, equipe, senha } = req.body;

    console.log('📝 Atualizando usuário ID:', id);
    console.log('🔴 Campo req.body.equipe TIPO:', typeof equipe, 'VALOR:', JSON.stringify(equipe));
    console.log('Dados recebidos:', { nome, email, role, tipo_usuario, percentual_comissao, celular, equipe_id: equipe, temSenha: !!senha });

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
      console.log('🔐 Nova senha fornecida, fazendo hash...');
      const senhaHash = await bcrypt.hash(senha, 10);
      dadosAtualizacao.senha_hash = senhaHash;
    }

    console.log('Dados para atualização:', { ...dadosAtualizacao, senha_hash: dadosAtualizacao.senha_hash ? '[HASH]' : undefined });

    const usuarioAtualizado = await Usuario.update(id, dadosAtualizacao);

    console.log('✅ Usuário atualizado com sucesso:', usuarioAtualizado?.nome);

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

    console.log('🗑️ Tentando deletar usuário ID:', id);

    // Verificar se o usuário existe
    const usuario = await Usuario.findById(id);
    if (!usuario) {
      console.log('❌ Usuário não encontrado');
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    console.log('Deletando usuário:', usuario.nome);

    const usuarioDeletado = await Usuario.delete(id);

    if (!usuarioDeletado) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    console.log('✅ Usuário deletado com sucesso');
    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao deletar usuário:', error);
    console.error('Detalhes do erro:', error.message);

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

    console.log('📝 Tentando registrar novo vendedor:', { nome, email, celular, convite_id });

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

    // Criar novo vendedor
    const novoVendedor = await Usuario.create({
      nome,
      email,
      senha_hash: senhaHash,
      celular,
      role: 'vendedor',
      tipo_usuario: 'vendedor',
      percentual_comissao: 0,
      equipe_id: vendedorConvite.equipe_id, // Herdar a equipe do vendedor que enviou o convite
      company_id: vendedorConvite.company_id // Herdar a empresa do vendedor que enviou o convite
    });

    console.log('✅ Vendedor registrado com sucesso:', novoVendedor.nome);

    // Remover senha_hash antes de retornar
    delete novoVendedor.senha_hash;

    res.status(201).json({
      message: 'Vendedor registrado com sucesso',
      usuario: novoVendedor
    });
  } catch (error) {
    console.error('❌ Erro ao registrar vendedor:', error);
    res.status(500).json({ error: 'Erro ao registrar vendedor. Tente novamente.' });
  }
};
