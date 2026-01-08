import Equipe from '../models/Equipe.js';

// Listar todas as equipes
export const listarEquipes = async (req, res) => {
  try {
    const { company_id } = req.user;
    const equipes = await Equipe.list(company_id);
    console.log('📋 Listando equipes:', JSON.stringify(equipes, null, 2));
    res.json({ equipes });
  } catch (error) {
    console.error('Erro ao listar equipes:', error);
    res.status(500).json({ error: 'Erro ao listar equipes' });
  }
};

// Buscar equipe por ID
export const buscarEquipe = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;
    const equipe = await Equipe.findById(id, company_id);

    if (!equipe) {
      return res.status(404).json({ error: 'Equipe não encontrada' });
    }

    res.json({ equipe });
  } catch (error) {
    console.error('Erro ao buscar equipe:', error);
    res.status(500).json({ error: 'Erro ao buscar equipe' });
  }
};

// Criar nova equipe
export const criarEquipe = async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    const { company_id } = req.user;

    // Validações
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Verificar se já existe equipe com mesmo nome
    const equipeExistente = await Equipe.findByNome(nome, company_id);
    if (equipeExistente) {
      return res.status(400).json({ error: 'Já existe uma equipe com este nome' });
    }

    const novaEquipe = await Equipe.create({ nome, descricao, company_id });
    res.status(201).json({ equipe: novaEquipe });
  } catch (error) {
    console.error('Erro ao criar equipe:', error);
    res.status(500).json({ error: 'Erro ao criar equipe' });
  }
};

// Atualizar equipe
export const atualizarEquipe = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao } = req.body;
    const { company_id } = req.user;

    // Validações
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Verificar se equipe existe
    const equipeExistente = await Equipe.findById(id, company_id);
    if (!equipeExistente) {
      return res.status(404).json({ error: 'Equipe não encontrada' });
    }

    // Verificar se o novo nome já existe em outra equipe
    const equipeMesmoNome = await Equipe.findByNome(nome, company_id);
    if (equipeMesmoNome && equipeMesmoNome.id !== parseInt(id)) {
      return res.status(400).json({ error: 'Já existe uma equipe com este nome' });
    }

    const equipeAtualizada = await Equipe.update(id, { nome, descricao }, company_id);
    res.json({ equipe: equipeAtualizada });
  } catch (error) {
    console.error('Erro ao atualizar equipe:', error);
    res.status(500).json({ error: 'Erro ao atualizar equipe' });
  }
};

// Deletar equipe
export const deletarEquipe = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;

    // Verificar se equipe existe
    const equipe = await Equipe.findById(id, company_id);
    if (!equipe) {
      return res.status(404).json({ error: 'Equipe não encontrada' });
    }

    await Equipe.delete(id, company_id);
    res.json({ message: 'Equipe deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar equipe:', error);
    res.status(500).json({ error: 'Erro ao deletar equipe' });
  }
};
