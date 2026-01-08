import Comissao from '../models/Comissao.js';
import Cliente from '../models/Cliente.js';

// Listar comissões
export const listarComissoes = async (req, res) => {
  try {
    console.log('📋 Requisição para listar comissões recebida');
    console.log('👤 Usuário:', req.user);

    const { role, id: userId, company_id } = req.user;

    const filters = {};

    // Se não for admin, filtrar apenas comissões do próprio vendedor
    if (role !== 'admin') {
      filters.vendedor_id = userId;
    }

    // Aplicar filtros de query params se fornecidos
    if (req.query.vendedor_id) {
      filters.vendedor_id = req.query.vendedor_id;
    }

    if (req.query.status) {
      filters.status = req.query.status;
    }

    console.log('🔍 Filtros aplicados:', filters);
    console.log('📞 Chamando Comissao.list()...');

    const comissoes = await Comissao.list(company_id, filters);

    console.log('✅ Comissões retornadas:', comissoes.length);

    res.json({
      comissoes,
      total: comissoes.length
    });
  } catch (error) {
    console.error('Erro ao listar comissões:', error);
    res.status(500).json({ error: 'Erro ao listar comissões' });
  }
};

// Buscar comissão por ID
export const buscarComissao = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;
    const comissao = await Comissao.findById(id, company_id);

    if (!comissao) {
      return res.status(404).json({ error: 'Comissão não encontrada' });
    }

    // Verificar permissão (vendedor só pode ver suas próprias comissões)
    if (req.user.role !== 'admin' && comissao.vendedor_id !== req.user.id) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta comissão' });
    }

    res.json(comissao);
  } catch (error) {
    console.error('Erro ao buscar comissão:', error);
    res.status(500).json({ error: 'Erro ao buscar comissão' });
  }
};

// Criar comissão (apenas admin)
export const criarComissao = async (req, res) => {
  try {
    const {
      cliente_id,
      vendedor_id,
      valor_venda,
      percentual_comissao,
      numero_parcelas
    } = req.body;
    const { company_id } = req.user;

    if (!cliente_id || !vendedor_id || !valor_venda || !percentual_comissao) {
      return res.status(400).json({
        error: 'Cliente, vendedor, valor da venda e percentual de comissão são obrigatórios'
      });
    }

    // Calcular valor da comissão
    const valor_comissao = (valor_venda * percentual_comissao) / 100;

    const comissao = await Comissao.create({
      cliente_id,
      vendedor_id,
      valor_venda,
      percentual_comissao,
      valor_comissao,
      numero_parcelas: numero_parcelas || 1,
      status: 'pendente',
      company_id
    });

    // Criar as parcelas automaticamente
    if (numero_parcelas && numero_parcelas >= 1) {
      const valor_parcela = valor_comissao / numero_parcelas;
      const parcelas = [];

      // Data de vencimento da primeira parcela: próximo mês
      const dataBase = new Date();
      dataBase.setMonth(dataBase.getMonth() + 1);
      dataBase.setDate(10); // Dia 10 de cada mês

      for (let i = 1; i <= numero_parcelas; i++) {
        const dataVencimento = new Date(dataBase);
        dataVencimento.setMonth(dataBase.getMonth() + (i - 1));

        const parcela = await Comissao.createParcela({
          comissao_id: comissao.id,
          numero_parcela: i,
          valor_parcela: valor_parcela,
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          status: 'pendente'
        });
        parcelas.push(parcela);
      }

      comissao.parcelas = parcelas;
    }

    // Mover o cliente automaticamente para a etapa "em_comissionamento"
    try {
      await Cliente.updateEtapa(cliente_id, 'em_comissionamento', company_id);
    } catch (error) {
      console.error('Erro ao atualizar etapa do cliente:', error);
      // Não bloquear a criação da comissão se falhar ao atualizar a etapa
    }

    res.status(201).json({
      message: 'Comissão criada com sucesso',
      comissao
    });
  } catch (error) {
    console.error('Erro ao criar comissão:', error);
    res.status(500).json({ error: 'Erro ao criar comissão' });
  }
};

// Atualizar comissão (apenas admin)
export const atualizarComissao = async (req, res) => {
  try {
    const { id } = req.params;
    const { numero_parcelas, status } = req.body;
    const { company_id } = req.user;

    if (!numero_parcelas && !status) {
      return res.status(400).json({
        error: 'Pelo menos um campo deve ser fornecido para atualização'
      });
    }

    // Buscar comissão atual
    const comissaoAtual = await Comissao.findById(id, company_id);
    if (!comissaoAtual) {
      return res.status(404).json({ error: 'Comissão não encontrada' });
    }

    const comissaoAtualizada = await Comissao.update(id, {
      numero_parcelas: numero_parcelas || comissaoAtual.numero_parcelas,
      status: status || comissaoAtual.status
    }, company_id);

    // Se o número de parcelas mudou, recriar as parcelas
    if (numero_parcelas && numero_parcelas !== comissaoAtual.numero_parcelas) {
      // Deletar parcelas antigas
      const parcelasAntigas = await Comissao.findParcelasByComissaoId(id);
      for (const parcela of parcelasAntigas) {
        await Comissao.deleteParcela(parcela.id);
      }

      // Criar novas parcelas
      const valor_parcela = comissaoAtual.valor_comissao / numero_parcelas;

      // Data de vencimento da primeira parcela: próximo mês
      const dataBase = new Date();
      dataBase.setMonth(dataBase.getMonth() + 1);
      dataBase.setDate(10); // Dia 10 de cada mês

      for (let i = 1; i <= numero_parcelas; i++) {
        const dataVencimento = new Date(dataBase);
        dataVencimento.setMonth(dataBase.getMonth() + (i - 1));

        await Comissao.createParcela({
          comissao_id: id,
          numero_parcela: i,
          valor_parcela: valor_parcela,
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          status: 'pendente'
        });
      }
    }

    // Buscar comissão atualizada com parcelas
    const comissaoFinal = await Comissao.findById(id, company_id);

    res.json({
      message: 'Comissão atualizada com sucesso',
      comissao: comissaoFinal
    });
  } catch (error) {
    console.error('Erro ao atualizar comissão:', error);
    res.status(500).json({ error: 'Erro ao atualizar comissão' });
  }
};

// Deletar comissão (apenas admin)
export const deletarComissao = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;

    const comissaoDeletada = await Comissao.delete(id, company_id);

    if (!comissaoDeletada) {
      return res.status(404).json({ error: 'Comissão não encontrada' });
    }

    res.json({ message: 'Comissão deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar comissão:', error);
    res.status(500).json({ error: 'Erro ao deletar comissão' });
  }
};

// Atualizar parcela (apenas admin)
export const atualizarParcela = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      valor_parcela,
      data_vencimento,
      data_pagamento,
      status,
      observacao
    } = req.body;

    const parcelaAtualizada = await Comissao.updateParcela(id, {
      valor_parcela,
      data_vencimento,
      data_pagamento,
      status,
      observacao
    });

    if (!parcelaAtualizada) {
      return res.status(404).json({ error: 'Parcela não encontrada' });
    }

    res.json({
      message: 'Parcela atualizada com sucesso',
      parcela: parcelaAtualizada
    });
  } catch (error) {
    console.error('Erro ao atualizar parcela:', error);
    res.status(500).json({ error: 'Erro ao atualizar parcela' });
  }
};

// Estatísticas de comissões
export const estatisticas = async (req, res) => {
  try {
    const { company_id } = req.user;
    const stats = await Comissao.estatisticasPorVendedor(company_id);
    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};
