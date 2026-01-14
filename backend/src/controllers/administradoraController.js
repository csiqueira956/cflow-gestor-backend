import Administradora from '../models/Administradora.js';

// Listar todas as administradoras
export const listarAdministradoras = async (req, res) => {
  try {
    const { company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    const administradoras = await Administradora.list(companyId);
    res.json({ administradoras });
  } catch (error) {
    console.error('Erro ao listar administradoras:', error);
    res.status(500).json({ error: 'Erro ao listar administradoras' });
  }
};

// Buscar administradora por ID
export const buscarAdministradora = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    const administradora = await Administradora.findById(id, companyId);

    if (!administradora) {
      return res.status(404).json({ error: 'Administradora não encontrada' });
    }

    res.json({ administradora });
  } catch (error) {
    console.error('Erro ao buscar administradora:', error);
    res.status(500).json({ error: 'Erro ao buscar administradora' });
  }
};

// Criar nova administradora
export const criarAdministradora = async (req, res) => {
  try {
    const { company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    const {
      nome,
      nome_contato,
      celular,
      comissionamento_recebido,
      comissionamento_pago
    } = req.body;

    // Validações
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Validar percentuais de comissionamento
    if (comissionamento_recebido && (comissionamento_recebido < 0 || comissionamento_recebido > 100)) {
      return res.status(400).json({ error: 'Comissionamento recebido deve estar entre 0 e 100' });
    }

    if (comissionamento_pago && (comissionamento_pago < 0 || comissionamento_pago > 100)) {
      return res.status(400).json({ error: 'Comissionamento pago deve estar entre 0 e 100' });
    }

    const novaAdministradora = await Administradora.create({
      nome,
      nome_contato,
      celular,
      comissionamento_recebido,
      comissionamento_pago
    }, companyId);

    res.status(201).json({ administradora: novaAdministradora });
  } catch (error) {
    console.error('Erro ao criar administradora:', error);
    res.status(500).json({ error: 'Erro ao criar administradora' });
  }
};

// Atualizar administradora
export const atualizarAdministradora = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    const {
      nome,
      nome_contato,
      celular,
      comissionamento_recebido,
      comissionamento_pago
    } = req.body;

    // Validações
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Verificar se administradora existe
    const administradoraExistente = await Administradora.findById(id, companyId);
    if (!administradoraExistente) {
      return res.status(404).json({ error: 'Administradora não encontrada' });
    }

    // Validar percentuais de comissionamento
    if (comissionamento_recebido && (comissionamento_recebido < 0 || comissionamento_recebido > 100)) {
      return res.status(400).json({ error: 'Comissionamento recebido deve estar entre 0 e 100' });
    }

    if (comissionamento_pago && (comissionamento_pago < 0 || comissionamento_pago > 100)) {
      return res.status(400).json({ error: 'Comissionamento pago deve estar entre 0 e 100' });
    }

    const administradoraAtualizada = await Administradora.update(id, {
      nome,
      nome_contato,
      celular,
      comissionamento_recebido,
      comissionamento_pago
    }, companyId);

    res.json({ administradora: administradoraAtualizada });
  } catch (error) {
    console.error('Erro ao atualizar administradora:', error);
    res.status(500).json({ error: 'Erro ao atualizar administradora' });
  }
};

// Deletar administradora
export const deletarAdministradora = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;
    const companyId = req.companyId || company_id;

    if (!companyId) {
      return res.status(403).json({ error: 'Empresa não identificada' });
    }

    // Verificar se administradora existe
    const administradora = await Administradora.findById(id, companyId);
    if (!administradora) {
      return res.status(404).json({ error: 'Administradora não encontrada' });
    }

    await Administradora.delete(id, companyId);
    res.json({ message: 'Administradora deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar administradora:', error);
    res.status(500).json({ error: 'Erro ao deletar administradora' });
  }
};
