// SuperAdminPanel v2 - Icons updated
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { TableSkeleton } from '../components/LoadingSkeleton';
import ConfirmDialog from '../components/ConfirmDialog';
import { superAdminAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

const SuperAdminPanel = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [empresas, setEmpresas] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('empresas');
  const [showEmpresaModal, setShowEmpresaModal] = useState(false);
  const [showNovaEmpresaModal, setShowNovaEmpresaModal] = useState(false);
  const [showCobrancaModal, setShowCobrancaModal] = useState(false);
  const [showPagamentosModal, setShowPagamentosModal] = useState(false);
  const [showUsuariosModal, setShowUsuariosModal] = useState(false);
  const [showPlanoModal, setShowPlanoModal] = useState(false);
  const [showAssinaturaRecorrenteModal, setShowAssinaturaRecorrenteModal] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState(null);
  const [assinaturaDetalhes, setAssinaturaDetalhes] = useState(null);
  const [usuariosEmpresa, setUsuariosEmpresa] = useState([]);
  const [pagamentosEmpresa, setPagamentosEmpresa] = useState([]);
  const [planoEditando, setPlanoEditando] = useState(null);
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: null,
    id: null,
    nome: '',
  });
  const [processando, setProcessando] = useState(false);
  const [showNovoUsuarioForm, setShowNovoUsuarioForm] = useState(false);
  const [novoUsuarioForm, setNovoUsuarioForm] = useState({
    nome: '',
    email: '',
    senha: '',
    role: 'vendedor',
  });

  // Form states
  const [novaEmpresaForm, setNovaEmpresaForm] = useState({
    nome: '',
    email: '',
    cnpj: '',
    planId: '',
    adminNome: '',
    adminEmail: '',
    adminSenha: '',
  });

  const [cobrancaForm, setCobrancaForm] = useState({
    valor: '',
    descricao: '',
    tipo: 'undefined',
    vencimentoDias: 7,
  });

  const [assinaturaRecorrenteForm, setAssinaturaRecorrenteForm] = useState({
    planId: '',
    billingType: 'BOLETO',
    nextDueDate: '',
    desconto: '',
  });

  const [planoForm, setPlanoForm] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    billing_cycle: 'monthly',
    max_users: '',
    max_leads: '',
    max_storage_gb: '',
    max_equipes: '',
    is_popular: false,
    active: true,
  });

  // Verificar se é super admin
  useEffect(() => {
    if (!isSuperAdmin()) {
      navigate('/dashboard');
      toast.error('Acesso negado. Apenas super administradores.');
    }
  }, [isSuperAdmin, navigate]);

  // Carregar dados
  useEffect(() => {
    carregarDados();
  }, []);

  // Sincronizar sidebar
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebarExpanded');
      setIsExpanded(saved !== null ? JSON.parse(saved) : true);
    };
    const interval = setInterval(handleStorageChange, 100);
    return () => clearInterval(interval);
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [empresasRes, planosRes] = await Promise.all([
        superAdminAPI.listarEmpresas(),
        superAdminAPI.listarPlanos(),
      ]);
      setEmpresas(empresasRes.data.empresas || empresasRes.data || []);
      setPlanos(planosRes.data.planos || planosRes.data || []);
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalhes = async (empresa) => {
    try {
      const response = await superAdminAPI.detalhesEmpresa(empresa.id);
      setEmpresaSelecionada(response.data.empresa || response.data);
      setShowEmpresaModal(true);
    } catch {
      toast.error('Erro ao carregar detalhes da empresa');
    }
  };

  const handleAlterarStatus = async (empresaId, novoStatus) => {
    try {
      await superAdminAPI.alterarStatusAssinatura({
        companyId: empresaId,
        status: novoStatus,
      });
      toast.success('Status alterado com sucesso!');
      carregarDados();
      setShowEmpresaModal(false);
    } catch {
      toast.error('Erro ao alterar status');
    }
  };

  const handleAlterarPlano = async (empresaId, planoId) => {
    try {
      await superAdminAPI.alterarStatusAssinatura({
        companyId: empresaId,
        planId: planoId,
        status: empresaSelecionada?.subscription_status || 'active',
      });
      toast.success('Plano alterado com sucesso!');
      carregarDados();
      handleVerDetalhes({ id: empresaId });
    } catch {
      toast.error('Erro ao alterar plano');
    }
  };

  // === CRUD Empresa ===
  const handleCriarEmpresa = async (e) => {
    e.preventDefault();
    setProcessando(true);
    try {
      await superAdminAPI.criarEmpresa(novaEmpresaForm);
      toast.success('Empresa criada com sucesso!');
      setShowNovaEmpresaModal(false);
      setNovaEmpresaForm({
        nome: '', email: '', cnpj: '', planId: '',
        adminNome: '', adminEmail: '', adminSenha: '',
      });
      carregarDados();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao criar empresa');
    } finally {
      setProcessando(false);
    }
  };

  const handleDeleteEmpresa = (empresa) => {
    setConfirmDialog({
      isOpen: true,
      type: 'empresa',
      id: empresa.id,
      nome: empresa.nome,
    });
  };

  const confirmarDelete = async () => {
    setProcessando(true);
    try {
      if (confirmDialog.type === 'empresa') {
        await superAdminAPI.deletarEmpresa(confirmDialog.id);
        toast.success('Empresa excluída com sucesso!');
      } else if (confirmDialog.type === 'plano') {
        await superAdminAPI.deletarPlano(confirmDialog.id);
        toast.success('Plano excluído com sucesso!');
      } else if (confirmDialog.type === 'usuario') {
        await superAdminAPI.deletarUsuario(confirmDialog.id);
        toast.success('Usuário excluído com sucesso!');
        if (empresaSelecionada) {
          handleVerUsuarios(empresaSelecionada);
        }
      }
      setConfirmDialog({ isOpen: false, type: null, id: null, nome: '' });
      carregarDados();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao excluir');
    } finally {
      setProcessando(false);
    }
  };

  // === Cobranças ===
  const handleAbrirCobranca = (empresa) => {
    setEmpresaSelecionada(empresa);
    setCobrancaForm({
      valor: empresa.plan_price || '',
      descricao: `Mensalidade ${empresa.plan_name || 'Plano'}`,
      tipo: 'undefined', // undefined = cliente escolhe, pix, boleto
      vencimentoDias: 7,
    });
    setShowCobrancaModal(true);
  };

  const handleEnviarCobranca = async (e) => {
    e.preventDefault();
    setProcessando(true);
    try {
      const response = await superAdminAPI.gerarCobranca(empresaSelecionada.id, cobrancaForm);
      const payment = response.data.payment;

      let mensagem = 'Cobrança gerada com sucesso!';
      if (payment?.invoiceUrl) {
        mensagem += ` Link: ${payment.invoiceUrl}`;
      }
      toast.success(mensagem);
      setShowCobrancaModal(false);
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.details || 'Erro ao gerar cobrança');
    } finally {
      setProcessando(false);
    }
  };

  // === Pagamentos ===
  const handleVerPagamentos = async (empresa) => {
    try {
      setEmpresaSelecionada(empresa);
      const response = await superAdminAPI.historicoPagamentos(empresa.id);
      // Combinar pagamentos locais com Asaas
      const pagamentosLocais = response.data.pagamentos || [];
      const pagamentosAsaas = response.data.asaasPayments || [];
      setPagamentosEmpresa([...pagamentosLocais, ...pagamentosAsaas.map(p => ({
        id: p.id,
        asaas_payment_id: p.id,
        valor: p.value,
        status: p.status,
        tipo: p.billingType,
        descricao: p.description,
        vencimento: p.dueDate,
        invoiceUrl: p.invoiceUrl,
        bankSlipUrl: p.bankSlipUrl
      }))]);
      setShowPagamentosModal(true);
    } catch {
      toast.error('Erro ao carregar histórico de pagamentos');
    }
  };

  // === Usuários ===
  const handleVerUsuarios = async (empresa) => {
    try {
      setEmpresaSelecionada(empresa);
      const response = await superAdminAPI.listarUsuariosEmpresa(empresa.id);
      setUsuariosEmpresa(response.data.usuarios || response.data || []);
      setShowUsuariosModal(true);
    } catch {
      toast.error('Erro ao carregar usuários');
    }
  };

  const handleResetarSenha = async (usuarioId) => {
    try {
      await superAdminAPI.resetarSenhaUsuario(usuarioId);
      toast.success('Nova senha enviada por email!');
    } catch {
      toast.error('Erro ao resetar senha');
    }
  };

  const handleDeleteUsuario = (usuario) => {
    setConfirmDialog({
      isOpen: true,
      type: 'usuario',
      id: usuario.id,
      nome: usuario.nome,
    });
  };

  const handleCriarUsuario = async (e) => {
    e.preventDefault();
    if (!novoUsuarioForm.nome || !novoUsuarioForm.email || !novoUsuarioForm.senha) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setProcessando(true);
    try {
      await superAdminAPI.criarUsuarioEmpresa(empresaSelecionada.id, novoUsuarioForm);
      toast.success('Usuário criado com sucesso!');
      setNovoUsuarioForm({ nome: '', email: '', senha: '', role: 'vendedor' });
      setShowNovoUsuarioForm(false);
      handleVerUsuarios(empresaSelecionada);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao criar usuário');
    } finally {
      setProcessando(false);
    }
  };

  // === Assinatura Recorrente ===
  const handleAbrirAssinaturaRecorrente = async (empresa) => {
    setEmpresaSelecionada(empresa);
    setAssinaturaRecorrenteForm({
      planId: '',
      billingType: 'BOLETO',
      nextDueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0],
      desconto: '',
    });

    // Carregar detalhes da assinatura se existir
    try {
      const response = await superAdminAPI.detalhesAssinaturaRecorrente(empresa.id);
      setAssinaturaDetalhes(response.data);
    } catch {
      setAssinaturaDetalhes(null);
    }

    setShowAssinaturaRecorrenteModal(true);
  };

  const handleCriarAssinaturaRecorrente = async (e) => {
    e.preventDefault();
    if (!assinaturaRecorrenteForm.planId) {
      toast.error('Selecione um plano');
      return;
    }

    setProcessando(true);
    try {
      const data = {
        planId: assinaturaRecorrenteForm.planId,
        billingType: assinaturaRecorrenteForm.billingType,
        nextDueDate: assinaturaRecorrenteForm.nextDueDate || undefined,
      };

      if (assinaturaRecorrenteForm.desconto) {
        data.discount = {
          value: parseFloat(assinaturaRecorrenteForm.desconto),
          type: 'FIXED'
        };
      }

      const response = await superAdminAPI.criarAssinaturaRecorrente(empresaSelecionada.id, data);
      toast.success('Assinatura recorrente criada com sucesso!');
      setShowAssinaturaRecorrenteModal(false);
      carregarDados();

      // Mostrar detalhes
      if (response.data.subscription) {
        toast.success(`Próximo vencimento: ${response.data.subscription.nextDueDate}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.details || 'Erro ao criar assinatura recorrente');
    } finally {
      setProcessando(false);
    }
  };

  const handleCancelarAssinaturaRecorrente = async () => {
    if (!confirm('Tem certeza que deseja cancelar a assinatura recorrente? As cobranças pendentes não serão afetadas.')) {
      return;
    }

    setProcessando(true);
    try {
      await superAdminAPI.cancelarAssinaturaRecorrente(empresaSelecionada.id);
      toast.success('Assinatura recorrente cancelada!');
      setAssinaturaDetalhes(null);
      carregarDados();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao cancelar assinatura');
    } finally {
      setProcessando(false);
    }
  };

  // === Planos ===
  const handleNovoPlano = () => {
    setPlanoEditando(null);
    setPlanoForm({
      name: '', slug: '', description: '', price: '',
      billing_cycle: 'monthly', max_users: '', max_leads: '',
      max_storage_gb: '', max_equipes: '', is_popular: false, active: true,
    });
    setShowPlanoModal(true);
  };

  const handleEditarPlano = (plano) => {
    setPlanoEditando(plano);
    setPlanoForm({
      name: plano.name || plano.nome || '',
      slug: plano.slug || '',
      description: plano.description || plano.descricao || '',
      price: plano.price || plano.preco || '',
      billing_cycle: plano.billing_cycle || 'monthly',
      max_users: plano.max_users || plano.max_usuarios || '',
      max_leads: plano.max_leads || '',
      max_storage_gb: plano.max_storage_gb || '',
      max_equipes: plano.max_equipes || '',
      is_popular: plano.is_popular || false,
      active: plano.active !== undefined ? plano.active : true,
    });
    setShowPlanoModal(true);
  };

  const handleSalvarPlano = async (e) => {
    e.preventDefault();
    setProcessando(true);
    try {
      if (planoEditando) {
        await superAdminAPI.editarPlano(planoEditando.id, planoForm);
        toast.success('Plano atualizado com sucesso!');
      } else {
        await superAdminAPI.criarPlano(planoForm);
        toast.success('Plano criado com sucesso!');
      }
      setShowPlanoModal(false);
      carregarDados();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao salvar plano');
    } finally {
      setProcessando(false);
    }
  };

  const handleDeletePlano = (plano) => {
    setConfirmDialog({
      isOpen: true,
      type: 'plano',
      id: plano.id,
      nome: plano.name || plano.nome,
    });
  };

  // === Helpers ===
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Ativa' },
      trialing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trial' },
      trial: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trial' },
      overdue: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Vencida' },
      past_due: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Vencida' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelada' },
      canceled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelada' },
      suspended: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Suspensa' },
    };
    const config = statusConfig[status] || statusConfig.suspended;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300 ${isExpanded ? 'ml-64' : 'ml-20'}`} style={{ maxWidth: '1472px' }}>
          <div className="card">
            <div className="animate-pulse mb-8">
              <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-96"></div>
            </div>
            <TableSkeleton rows={5} columns={6} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300 ${isExpanded ? 'ml-64' : 'ml-20'}`} style={{ maxWidth: '1472px' }}>
        <div className="card">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Painel Super Admin
              </h1>
              <p className="text-gray-600">
                Gerencie todas as empresas, assinaturas e planos do sistema
              </p>
            </div>
            <button
              onClick={() => setShowNovaEmpresaModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova Empresa
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{empresas.length}</div>
              <div className="text-sm text-blue-800">Total de Empresas</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {empresas.filter(e => e.subscription_status === 'active').length}
              </div>
              <div className="text-sm text-green-800">Assinaturas Ativas</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                {empresas.filter(e => e.subscription_status === 'trialing' || e.subscription_status === 'trial').length}
              </div>
              <div className="text-sm text-blue-800">Em Trial</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {empresas.filter(e => e.subscription_status === 'overdue' || e.subscription_status === 'past_due').length}
              </div>
              <div className="text-sm text-yellow-800">Vencidas</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(empresas.reduce((acc, e) => acc + (e.plan_price || 0), 0))}
              </div>
              <div className="text-sm text-purple-800">MRR Potencial</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('empresas')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'empresas'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Empresas ({empresas.length})
              </button>
              <button
                onClick={() => setActiveTab('planos')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'planos'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Planos ({planos.length})
              </button>
            </nav>
          </div>

          {/* Tab Content - Empresas */}
          {activeTab === 'empresas' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plano</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {empresas.map((empresa) => (
                    <tr key={empresa.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{empresa.nome}</div>
                        <div className="text-sm text-gray-500">{empresa.email}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {empresa.plan_name || 'Sem plano'}
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(empresa.subscription_status)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatDate(empresa.current_period_end)}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(empresa.plan_price)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-1 flex-wrap">
                          <button
                            onClick={() => handleVerDetalhes(empresa)}
                            className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            title="Ver detalhes e gerenciar assinatura"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleVerUsuarios(empresa)}
                            className="p-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                            title="Gerenciar usuários"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleAbrirCobranca(empresa)}
                            className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
                            title="Cobrança avulsa"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleAbrirAssinaturaRecorrente(empresa)}
                            className="p-1.5 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                            title="Configurar assinatura recorrente automática"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleVerPagamentos(empresa)}
                            className="p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            title="Ver histórico de pagamentos"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteEmpresa(empresa)}
                            className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                            title="Excluir empresa"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {empresas.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Nenhuma empresa cadastrada
                </div>
              )}
            </div>
          )}

          {/* Tab Content - Planos */}
          {activeTab === 'planos' && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleNovoPlano}
                  className="btn-primary flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Novo Plano
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preço</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuários</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leads</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {planos.map((plano) => (
                      <tr key={plano.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {plano.name || plano.nome}
                            {plano.is_popular && (
                              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">Popular</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{plano.description || plano.descricao}</div>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                          {formatCurrency(plano.price || plano.preco)}
                          <span className="text-gray-500 font-normal">/mês</span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {plano.max_users || plano.max_usuarios || 'Ilimitado'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {plano.max_leads || 'Ilimitado'}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            plano.active || plano.ativo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {plano.active || plano.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditarPlano(plano)}
                              className="text-primary-600 hover:text-primary-800 text-sm"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeletePlano(plano)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {planos.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    Nenhum plano cadastrado
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes/Gerenciar Empresa */}
      {showEmpresaModal && empresaSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {empresaSelecionada.nome}
                </h2>
                <p className="text-gray-500">{empresaSelecionada.email}</p>
                {empresaSelecionada.cnpj && (
                  <p className="text-sm text-gray-400">CNPJ: {empresaSelecionada.cnpj}</p>
                )}
              </div>
              {getStatusBadge(empresaSelecionada.subscription_status)}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500">Plano Atual</div>
                <div className="font-medium">{empresaSelecionada.plan_name || 'Sem plano'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500">Valor Mensal</div>
                <div className="font-medium">{formatCurrency(empresaSelecionada.plan_price)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500">Vencimento</div>
                <div className="font-medium">{formatDate(empresaSelecionada.current_period_end)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500">Criada em</div>
                <div className="font-medium">{formatDate(empresaSelecionada.created_at)}</div>
              </div>
            </div>

            {/* Alterar Plano */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Alterar Plano</h3>
              <div className="flex gap-2 flex-wrap">
                {planos.map((plano) => (
                  <button
                    key={plano.id}
                    onClick={() => handleAlterarPlano(empresaSelecionada.id, plano.id)}
                    className={`px-3 py-2 text-sm rounded-lg border ${
                      empresaSelecionada.plan_name === plano.name
                        ? 'bg-primary-100 border-primary-500 text-primary-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {plano.name || plano.nome} - {formatCurrency(plano.price || plano.preco)}
                  </button>
                ))}
              </div>
            </div>

            {/* Alterar Status */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Alterar Status da Assinatura</h3>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleAlterarStatus(empresaSelecionada.id, 'active')}
                  className={`px-4 py-2 text-sm rounded-lg border ${
                    empresaSelecionada.subscription_status === 'active'
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-green-50'
                  }`}
                >
                  Ativar
                </button>
                <button
                  onClick={() => handleAlterarStatus(empresaSelecionada.id, 'trialing')}
                  className={`px-4 py-2 text-sm rounded-lg border ${
                    empresaSelecionada.subscription_status === 'trialing'
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50'
                  }`}
                >
                  Trial
                </button>
                <button
                  onClick={() => handleAlterarStatus(empresaSelecionada.id, 'suspended')}
                  className={`px-4 py-2 text-sm rounded-lg border ${
                    empresaSelecionada.subscription_status === 'suspended'
                      ? 'bg-gray-200 border-gray-500 text-gray-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Suspender
                </button>
                <button
                  onClick={() => handleAlterarStatus(empresaSelecionada.id, 'cancelled')}
                  className={`px-4 py-2 text-sm rounded-lg border ${
                    empresaSelecionada.subscription_status === 'cancelled'
                      ? 'bg-red-100 border-red-500 text-red-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-red-50'
                  }`}
                >
                  Cancelar
                </button>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Ações Rápidas</h3>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setShowEmpresaModal(false);
                    handleAbrirCobranca(empresaSelecionada);
                  }}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Enviar Cobrança
                </button>
                <button
                  onClick={() => {
                    setShowEmpresaModal(false);
                    handleVerUsuarios(empresaSelecionada);
                  }}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Ver Usuários
                </button>
                <button
                  onClick={() => {
                    setShowEmpresaModal(false);
                    handleVerPagamentos(empresaSelecionada);
                  }}
                  className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Histórico Pagamentos
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowEmpresaModal(false)}
                className="btn-secondary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Empresa */}
      {showNovaEmpresaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nova Empresa</h2>

            <form onSubmit={handleCriarEmpresa}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa *</label>
                  <input
                    type="text"
                    value={novaEmpresaForm.nome}
                    onChange={(e) => setNovaEmpresaForm({ ...novaEmpresaForm, nome: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email da Empresa *</label>
                  <input
                    type="email"
                    value={novaEmpresaForm.email}
                    onChange={(e) => setNovaEmpresaForm({ ...novaEmpresaForm, email: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={novaEmpresaForm.cnpj}
                    onChange={(e) => setNovaEmpresaForm({ ...novaEmpresaForm, cnpj: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
                  <select
                    value={novaEmpresaForm.planId}
                    onChange={(e) => setNovaEmpresaForm({ ...novaEmpresaForm, planId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Selecione um plano</option>
                    {planos.map((plano) => (
                      <option key={plano.id} value={plano.id}>
                        {plano.name || plano.nome} - {formatCurrency(plano.price || plano.preco)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <h3 className="font-medium text-gray-900 mb-3">Usuário Administrador</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={novaEmpresaForm.adminNome}
                    onChange={(e) => setNovaEmpresaForm({ ...novaEmpresaForm, adminNome: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={novaEmpresaForm.adminEmail}
                    onChange={(e) => setNovaEmpresaForm({ ...novaEmpresaForm, adminEmail: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                  <input
                    type="password"
                    value={novaEmpresaForm.adminSenha}
                    onChange={(e) => setNovaEmpresaForm({ ...novaEmpresaForm, adminSenha: e.target.value })}
                    className="input-field"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNovaEmpresaModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={processando}
                >
                  {processando ? 'Criando...' : 'Criar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cobrança */}
      {showCobrancaModal && empresaSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Gerar Cobrança via Asaas</h2>
            <p className="text-gray-500 mb-6">Empresa: {empresaSelecionada.nome}</p>

            <form onSubmit={handleEnviarCobranca}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={cobrancaForm.valor}
                    onChange={(e) => setCobrancaForm({ ...cobrancaForm, valor: e.target.value })}
                    className="input-field"
                    placeholder="Ex: 99.90"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                  <input
                    type="text"
                    value={cobrancaForm.descricao}
                    onChange={(e) => setCobrancaForm({ ...cobrancaForm, descricao: e.target.value })}
                    className="input-field"
                    placeholder="Ex: Mensalidade Plano Pro"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                  <select
                    value={cobrancaForm.tipo}
                    onChange={(e) => setCobrancaForm({ ...cobrancaForm, tipo: e.target.value })}
                    className="input-field"
                  >
                    <option value="undefined">Cliente escolhe (Recomendado)</option>
                    <option value="pix">PIX</option>
                    <option value="boleto">Boleto Bancário</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">O cliente receberá um link para pagar</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dias para Vencimento</label>
                  <select
                    value={cobrancaForm.vencimentoDias}
                    onChange={(e) => setCobrancaForm({ ...cobrancaForm, vencimentoDias: parseInt(e.target.value) })}
                    className="input-field"
                  >
                    <option value="3">3 dias</option>
                    <option value="5">5 dias</option>
                    <option value="7">7 dias</option>
                    <option value="10">10 dias</option>
                    <option value="15">15 dias</option>
                    <option value="30">30 dias</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCobrancaModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={processando}
                >
                  {processando ? 'Gerando...' : 'Gerar Cobrança'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pagamentos */}
      {showPagamentosModal && empresaSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Histórico de Pagamentos</h2>
            <p className="text-gray-500 mb-6">Empresa: {empresaSelecionada.nome}</p>

            {pagamentosEmpresa.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pagamentosEmpresa.map((pagamento, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm">{formatDate(pagamento.data || pagamento.created_at)}</td>
                      <td className="px-4 py-3 text-sm">{pagamento.descricao || pagamento.description}</td>
                      <td className="px-4 py-3 text-sm font-medium">{formatCurrency(pagamento.valor || pagamento.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          pagamento.status === 'paid' || pagamento.status === 'pago'
                            ? 'bg-green-100 text-green-800'
                            : pagamento.status === 'pending' || pagamento.status === 'pendente'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {pagamento.status === 'paid' || pagamento.status === 'pago' ? 'Pago' :
                           pagamento.status === 'pending' || pagamento.status === 'pendente' ? 'Pendente' : 'Falhou'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Nenhum pagamento registrado
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowPagamentosModal(false)}
                className="btn-secondary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Assinatura Recorrente */}
      {showAssinaturaRecorrenteModal && empresaSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Assinatura Recorrente</h2>
            <p className="text-gray-500 mb-4">Empresa: {empresaSelecionada.nome}</p>

            {/* Status atual da assinatura */}
            {assinaturaDetalhes?.asaas && (
              <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <h3 className="font-semibold text-indigo-900 mb-2">Assinatura Ativa no Asaas</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                      assinaturaDetalhes.asaas.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {assinaturaDetalhes.asaas.status === 'ACTIVE' ? 'Ativa' : assinaturaDetalhes.asaas.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Valor:</span>
                    <span className="ml-2 font-medium">{formatCurrency(assinaturaDetalhes.asaas.value)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Ciclo:</span>
                    <span className="ml-2">{assinaturaDetalhes.asaas.cycle === 'MONTHLY' ? 'Mensal' : 'Anual'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Próx. Vencimento:</span>
                    <span className="ml-2">{formatDate(assinaturaDetalhes.asaas.nextDueDate)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Forma de Pagamento:</span>
                    <span className="ml-2">{assinaturaDetalhes.asaas.billingType}</span>
                  </div>
                </div>

                <button
                  onClick={handleCancelarAssinaturaRecorrente}
                  className="mt-4 w-full py-2 px-4 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
                  disabled={processando}
                >
                  {processando ? 'Cancelando...' : 'Cancelar Assinatura Recorrente'}
                </button>
              </div>
            )}

            {/* Formulário para criar nova assinatura */}
            {!assinaturaDetalhes?.asaas && (
              <form onSubmit={handleCriarAssinaturaRecorrente}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plano *</label>
                    <select
                      value={assinaturaRecorrenteForm.planId}
                      onChange={(e) => setAssinaturaRecorrenteForm({ ...assinaturaRecorrenteForm, planId: e.target.value })}
                      className="input-field"
                      required
                    >
                      <option value="">Selecione um plano</option>
                      {planos.filter(p => p.active).map((plano) => (
                        <option key={plano.id} value={plano.id}>
                          {plano.name} - {formatCurrency(plano.price)}/{plano.billing_cycle === 'yearly' ? 'ano' : 'mês'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                    <select
                      value={assinaturaRecorrenteForm.billingType}
                      onChange={(e) => setAssinaturaRecorrenteForm({ ...assinaturaRecorrenteForm, billingType: e.target.value })}
                      className="input-field"
                    >
                      <option value="BOLETO">Boleto Bancário</option>
                      <option value="PIX">PIX</option>
                      <option value="CREDIT_CARD">Cartão de Crédito</option>
                      <option value="UNDEFINED">Cliente escolhe</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primeiro Vencimento</label>
                    <input
                      type="date"
                      value={assinaturaRecorrenteForm.nextDueDate}
                      onChange={(e) => setAssinaturaRecorrenteForm({ ...assinaturaRecorrenteForm, nextDueDate: e.target.value })}
                      className="input-field"
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-gray-500 mt-1">Deixe em branco para o primeiro dia do próximo mês</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={assinaturaRecorrenteForm.desconto}
                      onChange={(e) => setAssinaturaRecorrenteForm({ ...assinaturaRecorrenteForm, desconto: e.target.value })}
                      className="input-field"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Desconto fixo aplicado a cada cobrança</p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                  <p className="text-sm text-yellow-800">
                    <strong>Atenção:</strong> Ao criar uma assinatura recorrente, o cliente receberá cobranças automáticas
                    mensais pelo Asaas. Configure as variáveis de ambiente ASAAS_API_URL e ASAAS_API_KEY no backend.
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAssinaturaRecorrenteModal(false)}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={processando}
                  >
                    {processando ? 'Criando...' : 'Criar Assinatura Recorrente'}
                  </button>
                </div>
              </form>
            )}

            {/* Se já tem assinatura, mostrar apenas botão de fechar */}
            {assinaturaDetalhes?.asaas && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAssinaturaRecorrenteModal(false)}
                  className="btn-secondary"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Usuários */}
      {showUsuariosModal && empresaSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Usuários da Empresa</h2>
                <p className="text-gray-500">Empresa: {empresaSelecionada.nome}</p>
              </div>
              <button
                onClick={() => setShowNovoUsuarioForm(!showNovoUsuarioForm)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Novo Usuário
              </button>
            </div>

            {/* Formulário de Novo Usuário */}
            {showNovoUsuarioForm && (
              <form onSubmit={handleCriarUsuario} className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h3 className="font-medium text-gray-900 mb-3">Criar Novo Usuário</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={novoUsuarioForm.nome}
                      onChange={(e) => setNovoUsuarioForm({ ...novoUsuarioForm, nome: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={novoUsuarioForm.email}
                      onChange={(e) => setNovoUsuarioForm({ ...novoUsuarioForm, email: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                    <input
                      type="password"
                      value={novoUsuarioForm.senha}
                      onChange={(e) => setNovoUsuarioForm({ ...novoUsuarioForm, senha: e.target.value })}
                      className="input-field"
                      minLength={6}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                    <select
                      value={novoUsuarioForm.role}
                      onChange={(e) => setNovoUsuarioForm({ ...novoUsuarioForm, role: e.target.value })}
                      className="input-field"
                    >
                      <option value="vendedor">Vendedor</option>
                      <option value="gerente">Gerente</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNovoUsuarioForm(false);
                      setNovoUsuarioForm({ nome: '', email: '', senha: '', role: 'vendedor' });
                    }}
                    className="btn-secondary text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary text-sm"
                    disabled={processando}
                  >
                    {processando ? 'Criando...' : 'Criar Usuário'}
                  </button>
                </div>
              </form>
            )}

            {usuariosEmpresa.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Função</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {usuariosEmpresa.map((usuario) => (
                    <tr key={usuario.id}>
                      <td className="px-4 py-3 text-sm font-medium">{usuario.nome}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{usuario.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          usuario.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          usuario.role === 'gerente' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {usuario.role === 'admin' ? 'Admin' :
                           usuario.role === 'gerente' ? 'Gerente' : 'Vendedor'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResetarSenha(usuario.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Resetar Senha
                          </button>
                          <button
                            onClick={() => handleDeleteUsuario(usuario)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Nenhum usuário cadastrado
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowUsuariosModal(false);
                  setShowNovoUsuarioForm(false);
                }}
                className="btn-secondary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Plano */}
      {showPlanoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {planoEditando ? 'Editar Plano' : 'Novo Plano'}
            </h2>

            <form onSubmit={handleSalvarPlano}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={planoForm.name}
                    onChange={(e) => setPlanoForm({ ...planoForm, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                  <input
                    type="text"
                    value={planoForm.slug}
                    onChange={(e) => setPlanoForm({ ...planoForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="input-field"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={planoForm.description}
                    onChange={(e) => setPlanoForm({ ...planoForm, description: e.target.value })}
                    className="input-field"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço Mensal *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={planoForm.price}
                    onChange={(e) => setPlanoForm({ ...planoForm, price: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciclo de Cobrança</label>
                  <select
                    value={planoForm.billing_cycle}
                    onChange={(e) => setPlanoForm({ ...planoForm, billing_cycle: e.target.value })}
                    className="input-field"
                  >
                    <option value="monthly">Mensal</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Usuários</label>
                  <input
                    type="number"
                    value={planoForm.max_users}
                    onChange={(e) => setPlanoForm({ ...planoForm, max_users: e.target.value })}
                    className="input-field"
                    placeholder="Ilimitado se vazio"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Leads</label>
                  <input
                    type="number"
                    value={planoForm.max_leads}
                    onChange={(e) => setPlanoForm({ ...planoForm, max_leads: e.target.value })}
                    className="input-field"
                    placeholder="Ilimitado se vazio"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Storage (GB)</label>
                  <input
                    type="number"
                    value={planoForm.max_storage_gb}
                    onChange={(e) => setPlanoForm({ ...planoForm, max_storage_gb: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Equipes</label>
                  <input
                    type="number"
                    value={planoForm.max_equipes}
                    onChange={(e) => setPlanoForm({ ...planoForm, max_equipes: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex gap-4 mb-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={planoForm.is_popular}
                    onChange={(e) => setPlanoForm({ ...planoForm, is_popular: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Marcar como Popular</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={planoForm.active}
                    onChange={(e) => setPlanoForm({ ...planoForm, active: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Ativo</span>
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPlanoModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={processando}
                >
                  {processando ? 'Salvando...' : planoEditando ? 'Salvar Alterações' : 'Criar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmação de deleção */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: null, id: null, nome: '' })}
        onConfirm={confirmarDelete}
        title={`Excluir ${confirmDialog.type === 'empresa' ? 'Empresa' : confirmDialog.type === 'plano' ? 'Plano' : 'Usuário'}`}
        message={`Tem certeza que deseja excluir "${confirmDialog.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        type="danger"
        loading={processando}
      />
    </div>
  );
};

export default SuperAdminPanel;
