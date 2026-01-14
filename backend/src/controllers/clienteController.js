import Cliente from '../models/Cliente.js';
import { enviarEmailCadastroCliente, enviarEmailNotificacaoVendedor } from '../services/emailService.js';

// Validação básica de CPF
const validarCPF = (cpf) => {
  cpf = cpf.replace(/[^\d]/g, '');
  if (cpf.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  return true;
};

// Listar clientes
export const listarClientes = async (req, res) => {
  try {
    const { role, id: userId, equipe_id, company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    let clientes;

    if (role === 'vendedor') {
      // Vendedor vê apenas seus próprios clientes
      clientes = await Cliente.list(companyId, userId);
    } else if (role === 'gerente') {
      // Gerente vê clientes de todos os vendedores da sua equipe
      if (!equipe_id) {
        return res.status(403).json({ error: 'Gerente sem equipe associada' });
      }
      const Usuario = (await import('../models/Usuario.js')).default;
      const vendedoresEquipe = await Usuario.findVendedoresByEquipeId(equipe_id);
      const vendedoresIds = vendedoresEquipe.map(v => v.id);

      // Buscar clientes de todos os vendedores da equipe
      clientes = await Cliente.listByVendedores(companyId, vendedoresIds);
    } else {
      // Admin vê todos os clientes da empresa
      clientes = await Cliente.list(companyId, null);
    }

    res.json({
      clientes,
      total: clientes.length
    });
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro ao listar clientes' });
  }
};

// Buscar cliente por ID
export const buscarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: vendedorId, equipe_id, company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    // SEGURANÇA: Aplicar escopo correto por role
    let vendedorIdFiltro = null;
    let vendedoresIds = null;

    if (role === 'vendedor') {
      vendedorIdFiltro = vendedorId;
    } else if (role === 'gerente') {
      // Gerente só pode ver clientes da sua equipe
      if (!equipe_id) {
        return res.status(403).json({ error: 'Gerente sem equipe associada' });
      }
      const Usuario = (await import('../models/Usuario.js')).default;
      const vendedoresEquipe = await Usuario.findVendedoresByEquipeId(equipe_id);
      vendedoresIds = vendedoresEquipe.map(v => v.id);
    }
    // Admin e super_admin podem ver qualquer cliente

    const cliente = await Cliente.findById(id, companyId, vendedorIdFiltro);

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // SEGURANÇA: Verificar se gerente pode acessar este cliente
    if (role === 'gerente' && vendedoresIds && !vendedoresIds.includes(cliente.vendedor_id)) {
      return res.status(403).json({ error: 'Sem permissão para acessar este cliente' });
    }

    res.json(cliente);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
};

// Criar novo cliente
export const criarCliente = async (req, res) => {
  try {
    const { nome, cpf, telefone, email, valor_carta, administradora, grupo, cota, observacao, etapa } = req.body;
    const { id: vendedorId, company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    // Validações
    if (!nome || !telefone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
    }

    // Validar CPF apenas se fornecido
    if (cpf && !validarCPF(cpf)) {
      return res.status(400).json({ error: 'CPF inválido' });
    }

    const clienteData = {
      nome,
      cpf: cpf ? cpf.replace(/[^\d]/g, '') : null, // Remove formatação se fornecido
      telefone,
      email,
      valor_carta,
      administradora,
      grupo,
      cota,
      observacao,
      etapa: etapa || 'novo_contato', // Usa a etapa fornecida ou 'novo_contato' como padrão
      vendedor_id: vendedorId
    };

    const novoCliente = await Cliente.create(clienteData, companyId);

    res.status(201).json({
      message: 'Cliente criado com sucesso',
      cliente: novoCliente
    });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
};

// Atualizar cliente
export const atualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: vendedorId, equipe_id, company_id } = req.user;
    const companyId = req.companyId || company_id;
    const clienteData = req.body;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    // Validar CPF se fornecido
    if (clienteData.cpf && !validarCPF(clienteData.cpf)) {
      return res.status(400).json({ error: 'CPF inválido' });
    }

    // Remove formatação do CPF
    if (clienteData.cpf) {
      clienteData.cpf = clienteData.cpf.replace(/[^\d]/g, '');
    }

    // SEGURANÇA: Aplicar escopo correto por role
    let vendedorIdFiltro = null;
    let vendedoresIds = null;

    if (role === 'vendedor') {
      vendedorIdFiltro = vendedorId;
    } else if (role === 'gerente') {
      // Gerente só pode editar clientes da sua equipe
      if (!equipe_id) {
        return res.status(403).json({ error: 'Gerente sem equipe associada' });
      }
      const Usuario = (await import('../models/Usuario.js')).default;
      const vendedoresEquipe = await Usuario.findVendedoresByEquipeId(equipe_id);
      vendedoresIds = vendedoresEquipe.map(v => v.id);

      // Buscar cliente primeiro para verificar permissão
      const clienteExistente = await Cliente.findById(id, companyId, null);
      if (!clienteExistente) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }
      if (!vendedoresIds.includes(clienteExistente.vendedor_id)) {
        return res.status(403).json({ error: 'Sem permissão para editar este cliente' });
      }
    }

    const clienteAtualizado = await Cliente.update(id, clienteData, companyId, vendedorIdFiltro);

    if (!clienteAtualizado) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json({
      message: 'Cliente atualizado com sucesso',
      cliente: clienteAtualizado
    });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
};

// Atualizar etapa do cliente (para Kanban)
export const atualizarEtapa = async (req, res) => {
  try {
    const { id } = req.params;
    const { etapa } = req.body;
    const { role, id: vendedorId, equipe_id, company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    if (!etapa) {
      return res.status(400).json({ error: 'Etapa é obrigatória' });
    }

    const etapasValidas = ['novo_contato', 'proposta_enviada', 'negociacao', 'fechado', 'perdido'];
    if (!etapasValidas.includes(etapa)) {
      return res.status(400).json({ error: 'Etapa inválida' });
    }

    // SEGURANÇA: Aplicar escopo correto por role
    let vendedorIdFiltro = null;

    if (role === 'vendedor') {
      vendedorIdFiltro = vendedorId;
    } else if (role === 'gerente') {
      // Gerente só pode atualizar etapa de clientes da sua equipe
      if (!equipe_id) {
        return res.status(403).json({ error: 'Gerente sem equipe associada' });
      }
      const Usuario = (await import('../models/Usuario.js')).default;
      const vendedoresEquipe = await Usuario.findVendedoresByEquipeId(equipe_id);
      const vendedoresIds = vendedoresEquipe.map(v => v.id);

      // Buscar cliente primeiro para verificar permissão
      const clienteExistente = await Cliente.findById(id, companyId, null);
      if (!clienteExistente) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }
      if (!vendedoresIds.includes(clienteExistente.vendedor_id)) {
        return res.status(403).json({ error: 'Sem permissão para editar este cliente' });
      }
    }

    const clienteAtualizado = await Cliente.updateEtapa(id, etapa, companyId, vendedorIdFiltro);

    if (!clienteAtualizado) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json({
      message: 'Etapa atualizada com sucesso',
      cliente: clienteAtualizado
    });
  } catch (error) {
    console.error('Erro ao atualizar etapa:', error);
    res.status(500).json({ error: 'Erro ao atualizar etapa' });
  }
};

// Deletar cliente
export const deletarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: vendedorId, equipe_id, company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    // SEGURANÇA: Aplicar escopo correto por role
    let vendedorIdFiltro = null;

    if (role === 'vendedor') {
      vendedorIdFiltro = vendedorId;
    } else if (role === 'gerente') {
      // Gerente só pode deletar clientes da sua equipe
      if (!equipe_id) {
        return res.status(403).json({ error: 'Gerente sem equipe associada' });
      }
      const Usuario = (await import('../models/Usuario.js')).default;
      const vendedoresEquipe = await Usuario.findVendedoresByEquipeId(equipe_id);
      const vendedoresIds = vendedoresEquipe.map(v => v.id);

      // Buscar cliente primeiro para verificar permissão
      const clienteExistente = await Cliente.findById(id, companyId, null);
      if (!clienteExistente) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }
      if (!vendedoresIds.includes(clienteExistente.vendedor_id)) {
        return res.status(403).json({ error: 'Sem permissão para deletar este cliente' });
      }
    }

    const clienteDeletado = await Cliente.delete(id, companyId, vendedorIdFiltro);

    if (!clienteDeletado) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json({ message: 'Cliente deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    res.status(500).json({ error: 'Erro ao deletar cliente' });
  }
};

// Estatísticas por etapa
export const estatisticas = async (req, res) => {
  try {
    const { role, id: vendedorId, equipe_id, company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    // SEGURANÇA: Aplicar escopo correto por role
    let vendedorIdFiltro = null;
    let vendedoresIds = null;

    if (role === 'vendedor') {
      vendedorIdFiltro = vendedorId;
    } else if (role === 'gerente') {
      // Gerente vê estatísticas de toda sua equipe
      if (equipe_id) {
        const Usuario = (await import('../models/Usuario.js')).default;
        const vendedoresEquipe = await Usuario.findVendedoresByEquipeId(equipe_id);
        vendedoresIds = vendedoresEquipe.map(v => v.id);
      } else {
        // Se gerente não tem equipe, vê apenas suas próprias estatísticas
        vendedorIdFiltro = vendedorId;
      }
    }
    // Admin e super_admin veem todas as estatísticas da empresa

    const estatisticas = await Cliente.estatisticasPorEtapa(companyId, vendedorIdFiltro, vendedoresIds);

    res.json({ estatisticas });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

// Criar cliente via link público (sem autenticação)
export const criarClientePublico = async (req, res) => {
  try {
    const { linkPublico } = req.params;
    const formData = req.body;

    // Buscar vendedor pelo link público
    const Usuario = (await import('../models/Usuario.js')).default;
    const vendedor = await Usuario.findByLinkPublico(linkPublico);

    if (!vendedor) {
      return res.status(404).json({ error: 'Link de cadastro inválido ou expirado' });
    }

    // Validações básicas
    if (!formData.nome || !formData.cpf || !formData.telefone_celular) {
      return res.status(400).json({ error: 'Nome, CPF e telefone são obrigatórios' });
    }

    // Validar CPF
    if (!validarCPF(formData.cpf)) {
      return res.status(400).json({ error: 'CPF inválido' });
    }

    // Preparar dados do cliente com TODOS os campos do formulário
    const clienteData = {
      // Dados Básicos
      nome: formData.nome,
      cpf: formData.cpf.replace(/[^\d]/g, ''), // Remove formatação
      telefone: formData.telefone_celular, // Mapear para o campo 'telefone' antigo
      email: formData.email,

      // Dados Pessoais
      data_nascimento: formData.data_nascimento,
      estado_civil: formData.estado_civil,
      nacionalidade: formData.nacionalidade,
      cidade_nascimento: formData.cidade_nascimento,
      nome_mae: formData.nome_mae,
      profissao: formData.profissao,
      remuneracao: formData.remuneracao,

      // Contatos
      telefone_residencial: formData.telefone_residencial,
      telefone_comercial: formData.telefone_comercial,
      telefone_celular: formData.telefone_celular,
      telefone_celular_2: formData.telefone_celular_2,

      // Documentação
      tipo_documento: formData.tipo_documento,
      numero_documento: formData.numero_documento,
      orgao_emissor: formData.orgao_emissor,
      data_emissao: formData.data_emissao,

      // Dados do Cônjuge
      cpf_conjuge: formData.cpf_conjuge ? formData.cpf_conjuge.replace(/[^\d]/g, '') : null,
      nome_conjuge: formData.nome_conjuge,

      // Endereço
      cep: formData.cep,
      tipo_logradouro: formData.tipo_logradouro,
      endereco: formData.endereco,
      numero_endereco: formData.numero_endereco,
      complemento: formData.complemento,
      bairro: formData.bairro,
      cidade: formData.cidade,
      estado: formData.estado,

      // Pagamento - 1ª Parcela
      forma_pagamento_primeira: formData.forma_pagamento_primeira,
      data_pre_datado: formData.data_pre_datado,
      valor_cheque: formData.valor_cheque,
      numero_cheque: formData.numero_cheque,
      data_vencimento_cheque: formData.data_vencimento_cheque,
      banco_cheque: formData.banco_cheque,
      agencia_cheque: formData.agencia_cheque,
      conta_cheque: formData.conta_cheque,

      // Pagamento - Demais Parcelas
      forma_pagamento_demais: formData.forma_pagamento_demais,
      nome_correntista: formData.nome_correntista,
      cpf_correntista: formData.cpf_correntista ? formData.cpf_correntista.replace(/[^\d]/g, '') : null,
      banco_debito: formData.banco_debito,
      agencia_debito: formData.agencia_debito,
      conta_debito: formData.conta_debito,

      // Seguro
      aceita_seguro: formData.aceita_seguro ? 1 : 0,

      // Dados do Consórcio
      valor_carta: formData.valor_carta,
      administradora: formData.administradora,
      grupo: formData.grupo,
      cota: formData.cota,
      observacao: formData.observacao,

      // Controle
      etapa: 'novo_contato',
      vendedor_id: vendedor.id
    };

    // Usar o company_id do vendedor para multi-tenancy
    const companyId = vendedor.company_id;
    if (!companyId) {
      return res.status(500).json({ error: 'Erro de configuração do vendedor' });
    }

    const novoCliente = await Cliente.create(clienteData, companyId);

    // Enviar emails em paralelo (não bloqueia a resposta)
    Promise.all([
      // Email para o cliente com cópia do formulário
      enviarEmailCadastroCliente(clienteData),
      // Email para o vendedor com notificação
      enviarEmailNotificacaoVendedor(vendedor.email, vendedor.nome, clienteData)
    ]).catch(error => {
      console.error('Erro ao enviar emails:', error);
    });

    res.status(201).json({
      message: 'Cadastro realizado com sucesso! Em breve entraremos em contato.',
      cliente: {
        id: novoCliente.id,
        nome: novoCliente.nome
      }
    });
  } catch (error) {
    console.error('Erro ao criar cliente público:', error);
    res.status(500).json({ error: 'Erro ao realizar cadastro. Tente novamente.' });
  }
};
