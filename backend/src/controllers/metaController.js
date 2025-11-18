import Meta from '../models/Meta.js';

// Listar todas as metas
export const listarMetas = async (req, res) => {
  try {
    const filtros = {
      tipo: req.query.tipo,
      vendedor_id: req.query.vendedor_id,
      equipe_id: req.query.equipe_id,
      mes_referencia: req.query.mes_referencia,
      status: req.query.status
    };

    const metas = await Meta.list(filtros);
    res.json({ metas });
  } catch (error) {
    console.error('Erro ao listar metas:', error);
    res.status(500).json({ error: 'Erro ao listar metas' });
  }
};

// Buscar meta por ID
export const buscarMeta = async (req, res) => {
  try {
    const { id } = req.params;
    const meta = await Meta.findById(id);

    if (!meta) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }

    res.json({ meta });
  } catch (error) {
    console.error('Erro ao buscar meta:', error);
    res.status(500).json({ error: 'Erro ao buscar meta' });
  }
};

// Criar nova meta
export const criarMeta = async (req, res) => {
  try {
    const {
      titulo,
      descricao,
      tipo,
      vendedor_id,
      equipe_id,
      valor_meta,
      mes_referencia,
      status
    } = req.body;

    // Validações
    if (!titulo || !tipo || !valor_meta || !mes_referencia) {
      return res.status(400).json({
        error: 'Título, tipo, valor da meta e mês de referência são obrigatórios'
      });
    }

    // Validar tipo
    if (!['vendedor', 'equipe'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo deve ser "vendedor" ou "equipe"' });
    }

    // Validar relacionamento
    if (tipo === 'vendedor' && !vendedor_id) {
      return res.status(400).json({ error: 'Vendedor é obrigatório para metas de vendedor' });
    }

    if (tipo === 'equipe' && !equipe_id) {
      return res.status(400).json({ error: 'Equipe é obrigatória para metas de equipe' });
    }

    // Validar valor_meta
    if (valor_meta <= 0) {
      return res.status(400).json({ error: 'Valor da meta deve ser maior que zero' });
    }

    // Validar formato mes_referencia (YYYY-MM)
    const mesRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!mesRegex.test(mes_referencia)) {
      return res.status(400).json({ error: 'Mês de referência deve estar no formato YYYY-MM' });
    }

    // Validar status se fornecido
    if (status && !['ativa', 'concluida', 'cancelada'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const novaMeta = await Meta.create({
      titulo,
      descricao,
      tipo,
      vendedor_id: tipo === 'vendedor' ? vendedor_id : null,
      equipe_id: tipo === 'equipe' ? equipe_id : null,
      valor_meta,
      mes_referencia,
      status: status || 'ativa'
    });

    res.status(201).json({ meta: novaMeta });
  } catch (error) {
    console.error('Erro ao criar meta:', error);
    res.status(500).json({ error: 'Erro ao criar meta' });
  }
};

// Atualizar meta
export const atualizarMeta = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      descricao,
      tipo,
      vendedor_id,
      equipe_id,
      valor_meta,
      mes_referencia,
      status
    } = req.body;

    // Verificar se meta existe
    const metaExistente = await Meta.findById(id);
    if (!metaExistente) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }

    // Validações
    if (!titulo || !tipo || !valor_meta || !mes_referencia) {
      return res.status(400).json({
        error: 'Título, tipo, valor da meta e mês de referência são obrigatórios'
      });
    }

    // Validar tipo
    if (!['vendedor', 'equipe'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo deve ser "vendedor" ou "equipe"' });
    }

    // Validar relacionamento
    if (tipo === 'vendedor' && !vendedor_id) {
      return res.status(400).json({ error: 'Vendedor é obrigatório para metas de vendedor' });
    }

    if (tipo === 'equipe' && !equipe_id) {
      return res.status(400).json({ error: 'Equipe é obrigatória para metas de equipe' });
    }

    // Validar valor_meta
    if (valor_meta <= 0) {
      return res.status(400).json({ error: 'Valor da meta deve ser maior que zero' });
    }

    // Validar formato mes_referencia
    const mesRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!mesRegex.test(mes_referencia)) {
      return res.status(400).json({ error: 'Mês de referência deve estar no formato YYYY-MM' });
    }

    // Validar status
    if (status && !['ativa', 'concluida', 'cancelada'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const metaAtualizada = await Meta.update(id, {
      titulo,
      descricao,
      tipo,
      vendedor_id: tipo === 'vendedor' ? vendedor_id : null,
      equipe_id: tipo === 'equipe' ? equipe_id : null,
      valor_meta,
      mes_referencia,
      status: status || metaExistente.status
    });

    res.json({ meta: metaAtualizada });
  } catch (error) {
    console.error('Erro ao atualizar meta:', error);
    res.status(500).json({ error: 'Erro ao atualizar meta' });
  }
};

// Deletar meta
export const deletarMeta = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se meta existe
    const meta = await Meta.findById(id);
    if (!meta) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }

    await Meta.delete(id);
    res.json({ message: 'Meta deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar meta:', error);
    res.status(500).json({ error: 'Erro ao deletar meta' });
  }
};
