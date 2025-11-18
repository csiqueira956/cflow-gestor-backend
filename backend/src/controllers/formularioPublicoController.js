import FormularioPublico from '../models/FormularioPublico.js';
import Cliente from '../models/Cliente.js';
import { enviarEmailNotificacaoVendedor, enviarEmailCadastroCliente } from '../services/emailService.js';

// Criar novo formulário público (vendedor logado)
export const criarFormulario = async (req, res) => {
  try {
    const { titulo, descricao, expires_at } = req.body;
    const vendedorId = req.user.id;

    const formulario = await FormularioPublico.create(vendedorId, {
      titulo,
      descricao,
      expires_at,
    });

    res.status(201).json({
      message: 'Formulário criado com sucesso',
      formulario,
      link: `${process.env.FRONTEND_URL}/formulario/${formulario.token}`,
    });
  } catch (error) {
    console.error('Erro ao criar formulário:', error);
    res.status(500).json({ error: 'Erro ao criar formulário' });
  }
};

// Listar formulários do vendedor
export const listarFormularios = async (req, res) => {
  try {
    const vendedorId = req.user.id;
    const formularios = await FormularioPublico.listByVendedor(vendedorId);

    res.json({ formularios });
  } catch (error) {
    console.error('Erro ao listar formulários:', error);
    res.status(500).json({ error: 'Erro ao listar formulários' });
  }
};

// Buscar formulário por token (público)
export const buscarFormulario = async (req, res) => {
  try {
    const { token } = req.params;
    const formulario = await FormularioPublico.findByToken(token);

    if (!formulario) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    if (!formulario.ativo) {
      return res.status(403).json({ error: 'Formulário desativado' });
    }

    // Verificar expiração
    if (formulario.expires_at && new Date(formulario.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Formulário expirado' });
    }

    res.json({ formulario });
  } catch (error) {
    console.error('Erro ao buscar formulário:', error);
    res.status(500).json({ error: 'Erro ao buscar formulário' });
  }
};

// Submeter formulário público (não requer autenticação)
export const submeterFormulario = async (req, res) => {
  try {
    const { token } = req.params;
    const dadosCliente = req.body;

    console.log('📝 Submissão de formulário público recebida:', { token, nome: dadosCliente.nome });

    // Buscar formulário
    const formulario = await FormularioPublico.findByToken(token);

    if (!formulario) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    if (!formulario.ativo) {
      return res.status(403).json({ error: 'Formulário desativado' });
    }

    // Verificar expiração
    if (formulario.expires_at && new Date(formulario.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Formulário expirado' });
    }

    // Criar cliente associado ao vendedor do formulário
    const novoCliente = await Cliente.create({
      ...dadosCliente,
      vendedor_id: formulario.vendedor_id,
      etapa: 'novo_contato',
    });

    console.log('✅ Cliente criado:', novoCliente.id);

    // Incrementar contador
    await FormularioPublico.incrementarPreenchimentos(token);

    // Enviar emails em paralelo (não bloqueia a resposta)
    Promise.all([
      // Email para o cliente com cópia do formulário
      enviarEmailCadastroCliente(dadosCliente),
      // Email para o vendedor com notificação
      enviarEmailNotificacaoVendedor(formulario.vendedor_email, formulario.vendedor_nome, dadosCliente)
    ]).then(([resultCliente, resultVendedor]) => {
      if (resultCliente.success) {
        console.log('📧 Email enviado para o cliente');
      }
      if (resultVendedor.success) {
        console.log('📧 Email enviado para o vendedor:', formulario.vendedor_email);
      }
    }).catch(error => {
      console.error('⚠️  Erro ao enviar emails (não crítico):', error);
    });

    res.status(201).json({
      message: 'Cadastro realizado com sucesso! Em breve entraremos em contato.',
      cliente: {
        id: novoCliente.id,
        nome: novoCliente.nome,
      },
    });
  } catch (error) {
    console.error('Erro ao submeter formulário:', error);
    res.status(500).json({ error: 'Erro ao processar cadastro. Tente novamente.' });
  }
};

// Ativar/Desativar formulário
export const toggleAtivo = async (req, res) => {
  try {
    const { id } = req.params;
    const vendedorId = req.user.id;

    const formulario = await FormularioPublico.toggleAtivo(id, vendedorId);

    if (!formulario) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    res.json({
      message: `Formulário ${formulario.ativo ? 'ativado' : 'desativado'} com sucesso`,
      formulario,
    });
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    res.status(500).json({ error: 'Erro ao alterar status' });
  }
};

// Deletar formulário
export const deletarFormulario = async (req, res) => {
  try {
    const { id } = req.params;
    const vendedorId = req.user.id;

    const result = await FormularioPublico.delete(id, vendedorId);

    if (!result) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    res.json({ message: 'Formulário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar formulário:', error);
    res.status(500).json({ error: 'Erro ao deletar formulário' });
  }
};
