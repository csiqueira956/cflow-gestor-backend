import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import UsageIndicator from '../components/UsageIndicator';
import { assinaturaAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

const MinhaAssinatura = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [changingPlan, setChangingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('BOLETO');
  const [paymentData, setPaymentData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [usuariosContratados, setUsuariosContratados] = useState(null);
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    carregarDados();
  }, []);

  // Sincronizar com mudanças no localStorage
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
      const [subscriptionRes, paymentsRes, plansRes] = await Promise.all([
        assinaturaAPI.getMinhaAssinatura(),
        assinaturaAPI.getPagamentos(),
        assinaturaAPI.getPlansForUpgrade()
      ]);

      setSubscription(subscriptionRes.data.subscription);
      setPayments(paymentsRes.data.payments || []);

      // Usar os planos do novo endpoint de upgrade
      if (plansRes.data.success) {
        setAvailablePlans(plansRes.data.plans || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da assinatura:', error);
      setError(error.response?.data?.message || 'Erro ao carregar dados da assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePlan = async (planId) => {
    try {
      setChangingPlan(true);

      // Confirmar mudança
      if (!window.confirm(`Deseja realmente mudar para o plano ${selectedPlan?.nome || 'selecionado'}?`)) {
        return;
      }

      // Iniciar upgrade e criar pagamento
      const result = await assinaturaAPI.initiateUpgrade(
        planId,
        paymentMethod,
        usuariosContratados
      );

      if (result.data.success) {
        // Armazenar dados do pagamento para exibir no modal
        setPaymentData(result.data.payment);
        setShowUpgradeModal(false);
        setShowPaymentModal(true);

        // Recarregar dados
        await carregarDados();
      }
    } catch (error) {
      console.error('Erro ao iniciar upgrade:', error);
      toast.error(error.response?.data?.message || 'Erro ao iniciar upgrade de plano');
    } finally {
      setChangingPlan(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', label: 'Ativa' },
      TRIAL: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trial' },
      OVERDUE: { bg: 'bg-red-100', text: 'text-red-800', label: 'Atrasada' },
      CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelada' },
      EXPIRED: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Expirada' }
    };

    const config = statusConfig[status] || statusConfig.ACTIVE;

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendente' },
      CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmado' },
      RECEIVED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Recebido' },
      OVERDUE: { bg: 'bg-red-100', text: 'text-red-800', label: 'Atrasado' }
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ maxWidth: '1472px' }}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando dados da assinatura...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ maxWidth: '1472px' }}>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-red-800 font-semibold mb-2">Erro ao carregar dados</h3>
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => carregarDados()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div
        className="mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300"
        style={{
          maxWidth: '1472px',
          marginLeft: isExpanded ? '280px' : '80px'
        }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Minha Assinatura</h1>
          <p className="text-gray-600 mt-2">
            Gerencie sua assinatura, plano e faturas
          </p>
        </div>

        {/* Alerta de Trial ou Overdue */}
        {subscription && subscription.is_trial && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-blue-800 font-semibold">Período de Teste Ativo</p>
                <p className="text-blue-600 text-sm">
                  Você tem {subscription.days_until_due} dias restantes no período de teste.
                  Após este período, sua assinatura será cobrada automaticamente.
                </p>
              </div>
            </div>
          </div>
        )}

        {subscription && subscription.is_overdue && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-red-800 font-semibold">Pagamento Atrasado</p>
                <p className="text-red-600 text-sm">
                  Seu pagamento está atrasado. Regularize para continuar usando o sistema.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Card de Plano Atual */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Plano Atual</h2>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-blue-600">{subscription?.plan_name}</span>
                  {getStatusBadge(subscription?.status)}
                </div>
              </div>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Mudar Plano
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-gray-600 text-sm mb-1">Valor Mensal</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(subscription?.plan_price)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Próximo Vencimento</p>
                <p className="text-xl font-semibold text-gray-900">{formatDate(subscription?.next_due_date)}</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Recursos Incluídos:</h3>
              <ul className="space-y-2">
                {subscription?.plan_features && subscription.plan_features.map((feature, index) => (
                  <li key={index} className="flex items-center text-gray-700">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Card de Uso */}
          <UsageIndicator compact={false} />
        </div>

        {/* Histórico de Pagamentos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Histórico de Pagamentos</h2>

          {payments && payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Vencimento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Forma de Pagamento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(payment.due_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(payment.value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {payment.payment_method === 'PIX' ? 'PIX' :
                         payment.payment_method === 'BOLETO' ? 'Boleto' :
                         payment.payment_method === 'CREDIT_CARD' ? 'Cartão de Crédito' :
                         payment.payment_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPaymentStatusBadge(payment.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {payment.status === 'PENDING' && payment.bank_slip_url && (
                          <a
                            href={payment.bank_slip_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            Ver Boleto
                          </a>
                        )}
                        {payment.status === 'PENDING' && payment.pix_copy_paste && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(payment.pix_copy_paste);
                              toast.success('Código PIX copiado!');
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Copiar PIX
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">Nenhum pagamento registrado</p>
          )}
        </div>
      </div>

      {/* Modal de Upgrade/Downgrade */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Escolha seu Plano</h2>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Seleção de Método de Pagamento */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pagamento
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setPaymentMethod('BOLETO')}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                    paymentMethod === 'BOLETO'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                  }`}
                >
                  Boleto Bancário
                </button>
                <button
                  onClick={() => setPaymentMethod('PIX')}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                    paymentMethod === 'PIX'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                  }`}
                >
                  PIX
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {availablePlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`border-2 rounded-lg p-6 ${
                    plan.is_current ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-400'
                  }`}
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.nome}</h3>
                  <div className="text-3xl font-bold text-blue-600 mb-4">
                    {formatCurrency(plan.valor_mensal_estimado || plan.preco_fixo || plan.preco_por_usuario || 0)}
                    <span className="text-sm text-gray-600">/mês</span>
                  </div>

                  <div className="text-sm text-gray-600 mb-4">
                    {plan.tipo_cobranca === 'PER_USER' && (
                      <p>
                        R$ {plan.preco_por_usuario?.toFixed(2)} por usuário
                      </p>
                    )}
                    {plan.limite_usuarios && (
                      <p>Até {plan.limite_usuarios} usuários</p>
                    )}
                    {plan.limite_leads && (
                      <p>Até {plan.limite_leads} leads</p>
                    )}
                  </div>

                  {plan.is_current ? (
                    <button
                      disabled
                      className="w-full py-2 px-4 bg-gray-300 text-gray-600 rounded-lg font-semibold cursor-not-allowed"
                    >
                      Plano Atual
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedPlan(plan);
                        handleUpgradePlan(plan.id);
                      }}
                      disabled={changingPlan}
                      className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                    >
                      {changingPlan ? 'Processando...' : 'Selecionar Plano'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento */}
      {showPaymentModal && paymentData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Pagamento Gerado</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-green-800 font-semibold">Upgrade Iniciado com Sucesso!</p>
                  <p className="text-green-600 text-sm">
                    Seu plano será ativado assim que o pagamento for confirmado.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Valor:</span>
                <span className="text-gray-900 font-bold text-xl">{formatCurrency(paymentData.value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Vencimento:</span>
                <span className="text-gray-900">{formatDate(paymentData.dueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Status:</span>
                <span className="text-yellow-600 font-semibold">Aguardando Pagamento</span>
              </div>
            </div>

            {/* Boleto */}
            {paymentData.bankSlipUrl && (
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Boleto Bancário</h3>
                <a
                  href={paymentData.bankSlipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 px-4 bg-blue-600 text-white text-center rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Abrir Boleto
                </a>
                <p className="text-sm text-gray-600 mt-2 text-center">
                  O boleto será aberto em uma nova aba
                </p>
              </div>
            )}

            {/* PIX */}
            {paymentData.encodedImage && (
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4 text-center">Pagar com PIX</h3>
                <div className="flex justify-center mb-4">
                  <img
                    src={`data:image/png;base64,${paymentData.encodedImage}`}
                    alt="QR Code PIX"
                    className="w-64 h-64"
                  />
                </div>
                {paymentData.payload && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2 text-center">
                      Ou copie o código PIX:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={paymentData.payload}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(paymentData.payload);
                          toast.success('Código PIX copiado!');
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-t mt-6 pt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MinhaAssinatura;
