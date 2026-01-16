import Atividade from '../models/Atividade.js';

// Listar atividades de um cliente
export const listarAtividades = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const companyId = req.user.company_id;

    const atividades = await Atividade.listByCliente(clienteId, companyId);

    res.json({
      success: true,
      data: atividades
    });
  } catch (error) {
    console.error('Erro ao listar atividades:', error);
    res.status(500).json({
      error: 'Erro ao listar atividades',
      message: error.message
    });
  }
};

// Criar nova atividade
export const criarAtividade = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const companyId = req.user.company_id;
    const usuarioId = req.user.id;

    const { tipo, titulo, descricao, resultado, proximo_followup, data_atividade } = req.body;

    // Validação
    if (!tipo || !titulo) {
      return res.status(400).json({
        error: 'Tipo e título são obrigatórios'
      });
    }

    const tiposValidos = ['ligacao', 'email', 'whatsapp', 'visita', 'reuniao', 'proposta', 'outro'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({
        error: 'Tipo de atividade inválido',
        tiposValidos
      });
    }

    const atividade = await Atividade.create({
      cliente_id: clienteId,
      usuario_id: usuarioId,
      tipo,
      titulo,
      descricao,
      resultado,
      proximo_followup,
      data_atividade
    }, companyId);

    res.status(201).json({
      success: true,
      message: 'Atividade registrada com sucesso',
      data: atividade
    });
  } catch (error) {
    console.error('Erro ao criar atividade:', error);
    res.status(500).json({
      error: 'Erro ao criar atividade',
      message: error.message
    });
  }
};

// Buscar atividade por ID
export const buscarAtividade = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const atividade = await Atividade.findById(id, companyId);

    if (!atividade) {
      return res.status(404).json({
        error: 'Atividade não encontrada'
      });
    }

    res.json({
      success: true,
      data: atividade
    });
  } catch (error) {
    console.error('Erro ao buscar atividade:', error);
    res.status(500).json({
      error: 'Erro ao buscar atividade',
      message: error.message
    });
  }
};

// Atualizar atividade
export const atualizarAtividade = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const { tipo, titulo, descricao, resultado, proximo_followup, data_atividade } = req.body;

    const atividade = await Atividade.update(id, {
      tipo,
      titulo,
      descricao,
      resultado,
      proximo_followup,
      data_atividade
    }, companyId);

    if (!atividade) {
      return res.status(404).json({
        error: 'Atividade não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Atividade atualizada com sucesso',
      data: atividade
    });
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    res.status(500).json({
      error: 'Erro ao atualizar atividade',
      message: error.message
    });
  }
};

// Deletar atividade
export const deletarAtividade = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const atividade = await Atividade.delete(id, companyId);

    if (!atividade) {
      return res.status(404).json({
        error: 'Atividade não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Atividade excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar atividade:', error);
    res.status(500).json({
      error: 'Erro ao deletar atividade',
      message: error.message
    });
  }
};

// Listar próximos follow-ups
export const listarProximosFollowups = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { dias = 7 } = req.query;

    const followups = await Atividade.listProximosFollowups(companyId, parseInt(dias));

    res.json({
      success: true,
      data: followups
    });
  } catch (error) {
    console.error('Erro ao listar próximos follow-ups:', error);
    res.status(500).json({
      error: 'Erro ao listar próximos follow-ups',
      message: error.message
    });
  }
};

// Listar follow-ups atrasados
export const listarFollowupsAtrasados = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const followups = await Atividade.listFollowupsAtrasados(companyId);

    res.json({
      success: true,
      data: followups
    });
  } catch (error) {
    console.error('Erro ao listar follow-ups atrasados:', error);
    res.status(500).json({
      error: 'Erro ao listar follow-ups atrasados',
      message: error.message
    });
  }
};

// Estatísticas de atividades
export const estatisticasAtividades = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const usuarioId = req.user.role === 'vendedor' ? req.user.id : null;

    const estatisticas = await Atividade.estatisticas(companyId, usuarioId);

    res.json({
      success: true,
      data: estatisticas
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      error: 'Erro ao buscar estatísticas',
      message: error.message
    });
  }
};
