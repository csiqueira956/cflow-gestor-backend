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
    const { role, id: userId, equipe_id } = req.user;

    let clientes;

    if (role === 'vendedor') {
      // Vendedor vê apenas seus próprios clientes
      clientes = await Cliente.list(userId);
    } else if (role === 'gerente') {
      // Gerente vê clientes de todos os vendedores da sua equipe
      if (!equipe_id) {
        return res.status(403).json({ error: 'Gerente sem equipe associada' });
      }
      const Usuario = (await import('../models/Usuario.js')).default;
      const vendedoresEquipe = await Usuario.findVendedoresByEquipeId(equipe_id);
      const vendedoresIds = vendedoresEquipe.map(v => v.id);

      // Buscar clientes de todos os vendedores da equipe
      clientes = await Cliente.listByVendedores(vendedoresIds);
    } else {
      // Admin vê todos os clientes
      clientes = await Cliente.list(null);
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
    const { role, id: vendedorId } = req.user;

    const vendedorIdFiltro = role === 'vendedor' ? vendedorId : null;

    const cliente = await Cliente.findById(id, vendedorIdFiltro);

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
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
    const { id: vendedorId } = req.user;

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

    const novoCliente = await Cliente.create(clienteData);

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
    const { role, id: vendedorId } = req.user;
    const clienteData = req.body;

    // Validar CPF se fornecido
    if (clienteData.cpf && !validarCPF(clienteData.cpf)) {
      return res.status(400).json({ error: 'CPF inválido' });
    }

    // Remove formatação do CPF
    if (clienteData.cpf) {
      clienteData.cpf = clienteData.cpf.replace(/[^\d]/g, '');
    }

    const vendedorIdFiltro = role === 'vendedor' ? vendedorId : null;

    const clienteAtualizado = await Cliente.update(id, clienteData, vendedorIdFiltro);

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
    const { role, id: vendedorId } = req.user;

    if (!etapa) {
      return res.status(400).json({ error: 'Etapa é obrigatória' });
    }

    const etapasValidas = ['novo_contato', 'proposta_enviada', 'negociacao', 'fechado', 'perdido'];
    if (!etapasValidas.includes(etapa)) {
      return res.status(400).json({ error: 'Etapa inválida' });
    }

    const vendedorIdFiltro = role === 'vendedor' ? vendedorId : null;

    const clienteAtualizado = await Cliente.updateEtapa(id, etapa, vendedorIdFiltro);

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
    const { role, id: vendedorId } = req.user;

    const vendedorIdFiltro = role === 'vendedor' ? vendedorId : null;

    const clienteDeletado = await Cliente.delete(id, vendedorIdFiltro);

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
    const { role, id: vendedorId } = req.user;
    const vendedorIdFiltro = role === 'vendedor' ? vendedorId : null;

    const estatisticas = await Cliente.estatisticasPorEtapa(vendedorIdFiltro);

    res.json({ estatisticas });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

// Criar cliente via link público (sem autenticação)
export const criarClientePublico = async (req, res) => {
  try {
    console.log('📝 Recebida requisição pública de cadastro');
    console.log('Link público:', req.params.linkPublico);

    const { linkPublico } = req.params;
    const formData = req.body;

    console.log('Dados recebidos:', {
      nome: formData.nome,
      cpf: formData.cpf,
      telefone_celular: formData.telefone_celular,
      email: formData.email
    });

    // Buscar vendedor pelo link público
    const Usuario = (await import('../models/Usuario.js')).default;
    const vendedor = await Usuario.findByLinkPublico(linkPublico);

    if (!vendedor) {
      console.error('❌ Link público inválido:', linkPublico);
      return res.status(404).json({ error: 'Link de cadastro inválido ou expirado' });
    }

    console.log('✅ Vendedor encontrado:', vendedor.nome);

    // Validações básicas
    if (!formData.nome || !formData.cpf || !formData.telefone_celular) {
      console.error('❌ Campos obrigatórios faltando');
      return res.status(400).json({ error: 'Nome, CPF e telefone são obrigatórios' });
    }

    // Validar CPF
    if (!validarCPF(formData.cpf)) {
      console.error('❌ CPF inválido:', formData.cpf);
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

    console.log('💾 Criando cliente com dados:', {
      nome: clienteData.nome,
      cpf: clienteData.cpf,
      telefone: clienteData.telefone,
      vendedor_id: clienteData.vendedor_id
    });

    const novoCliente = await Cliente.create(clienteData);

    console.log('✅ Cliente criado com sucesso:', novoCliente.id);

    // Enviar emails em paralelo (não bloqueia a resposta)
    Promise.all([
      // Email para o cliente com cópia do formulário
      enviarEmailCadastroCliente(clienteData),
      // Email para o vendedor com notificação
      enviarEmailNotificacaoVendedor(vendedor.email, vendedor.nome, clienteData)
    ]).then(([resultCliente, resultVendedor]) => {
      if (resultCliente.success) {
        console.log('📧 Email enviado para o cliente');
      }
      if (resultVendedor.success) {
        console.log('📧 Email enviado para o vendedor');
      }
    }).catch(error => {
      console.error('⚠️  Erro ao enviar emails (não crítico):', error);
    });

    res.status(201).json({
      message: 'Cadastro realizado com sucesso! Em breve entraremos em contato.',
      cliente: {
        id: novoCliente.id,
        nome: novoCliente.nome
      }
    });
  } catch (error) {
    console.error('❌ Erro ao criar cliente público:', error);
    res.status(500).json({ error: 'Erro ao realizar cadastro. Tente novamente.' });
  }
};
