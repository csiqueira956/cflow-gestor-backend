import Equipe from '../models/Equipe.js';

// Listar todas as equipes
export const listarEquipes = async (req, res) => {
  try {
    const { company_id, role } = req.user;
    const companyId = req.companyId || company_id;

    // Super admin pode ver todas as equipes de todas as empresas
    if (role === 'super_admin' && !companyId) {
      const equipes = await Equipe.listAll();
      return res.json({ equipes });
    }

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    const equipes = await Equipe.list(companyId);
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
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    const equipe = await Equipe.findById(id, companyId);

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
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    // Validações
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Verificar se já existe equipe com mesmo nome na empresa
    const equipeExistente = await Equipe.findByNome(nome, companyId);
    if (equipeExistente) {
      return res.status(400).json({ error: 'Já existe uma equipe com este nome' });
    }

    const novaEquipe = await Equipe.create({ nome, descricao }, companyId);
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
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    // Validações
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Verificar se equipe existe
    const equipeExistente = await Equipe.findById(id, companyId);
    if (!equipeExistente) {
      return res.status(404).json({ error: 'Equipe não encontrada' });
    }

    // Verificar se o novo nome já existe em outra equipe da mesma empresa
    const equipeMesmoNome = await Equipe.findByNome(nome, companyId);
    if (equipeMesmoNome && equipeMesmoNome.id !== parseInt(id)) {
      return res.status(400).json({ error: 'Já existe uma equipe com este nome' });
    }

    const equipeAtualizada = await Equipe.update(id, { nome, descricao }, companyId);
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
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    // Verificar se equipe existe
    const equipe = await Equipe.findById(id, companyId);
    if (!equipe) {
      return res.status(404).json({ error: 'Equipe não encontrada' });
    }

    await Equipe.delete(id, companyId);
    res.json({ message: 'Equipe deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar equipe:', error);
    res.status(500).json({ error: 'Erro ao deletar equipe' });
  }
};
