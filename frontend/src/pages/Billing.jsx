import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { subscriptionAPI, billingAPI, plansAPI } from '../api/api';

const Billing = () => {

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [cancelImmediate, setCancelImmediate] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryRes, invoicesRes, plansRes, statsRes] = await Promise.all([
        subscriptionAPI.summary(),
        billingAPI.listInvoices({ limit: 10 }),
        plansAPI.listar(),
        billingAPI.getStats(),
      ]);

      setSubscription(summaryRes.data.data.subscription);
      setInvoices(invoicesRes.data.data);
      setPlans(plansRes.data.data || []);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar informações de billing');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    // Se o valor for undefined, null ou NaN, retorna R$ 0,00
    if (price === undefined || price === null || isNaN(price)) {
      return 'R$ 0,00';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: 'Ativa', color: 'bg-green-100 text-green-800' },
      trialing: { label: 'Trial', color: 'bg-blue-100 text-blue-800' },
      past_due: { label: 'Vencida', color: 'bg-red-100 text-red-800' },
      cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800' },
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getInvoiceStatusBadge = (status) => {
    const statusConfig = {
      paid: { label: 'Pago', color: 'bg-green-100 text-green-800' },
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      failed: { label: 'Falhou', color: 'bg-red-100 text-red-800' },
      cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getDaysLeftInTrial = () => {
    if (!subscription || subscription.status !== 'trialing' || !subscription.trial_ends_at) {
      return null;
    }

    const trialEnd = new Date(subscription.trial_ends_at);
    const now = new Date();
    const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

    return daysLeft > 0 ? daysLeft : 0;
  };

  const handleUpgrade = async (planId) => {
    try {
      const response = await subscriptionAPI.upgrade(planId);

      if (response.data.success) {
        toast.success('Plano atualizado com sucesso!');
        setShowUpgradeModal(false);
        loadData();
      }
    } catch (error) {
      console.error('Erro ao fazer upgrade:', error);
      toast.error(error.response?.data?.error || 'Erro ao atualizar plano');
    }
  };

  const handleDowngrade = async (planId) => {
    try {
      const response = await subscriptionAPI.downgrade(planId);

      if (response.data.success) {
        toast.success('Plano alterado com sucesso!');
        setShowUpgradeModal(false);
        loadData();
      }
    } catch (error) {
      console.error('Erro ao fazer downgrade:', error);
      toast.error(error.response?.data?.error || 'Erro ao alterar plano');
    }
  };

  const handleCancel = async () => {
    try {
      const response = await subscriptionAPI.cancel(cancelImmediate);

      if (response.data.success) {
        toast.success(
          cancelImmediate
            ? 'Assinatura cancelada imediatamente'
            : 'Assinatura cancelada ao final do período'
        );
        setShowCancelModal(false);
        loadData();
      }
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      toast.error(error.response?.data?.error || 'Erro ao cancelar assinatura');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">Carregando...</div>
        </div>
      </Layout>
    );
  }

  const daysLeftInTrial = getDaysLeftInTrial();

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Assinatura e Billing</h1>
          <p className="text-gray-600 mt-2">Gerencie sua assinatura e pagamentos</p>
        </div>

        {/* Trial Alert */}
        {subscription?.status === 'trialing' && daysLeftInTrial !== null && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-blue-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-blue-900 font-semibold">
                  Seu trial expira em {daysLeftInTrial} {daysLeftInTrial === 1 ? 'dia' : 'dias'}
                </p>
                <p className="text-blue-700 text-sm mt-1">
                  Após o período de teste, você será cobrado automaticamente
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Subscription Card */}
        {subscription && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Plano Atual</h2>
              {getStatusBadge(subscription.status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-gray-600 text-sm mb-1">Plano</p>
                <p className="text-2xl font-bold text-gray-900">{subscription.plan_name}</p>
              </div>

              <div>
                <p className="text-gray-600 text-sm mb-1">Valor</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice(subscription.plan_price)}
                  <span className="text-sm font-normal text-gray-600">/mês</span>
                </p>
              </div>

              <div>
                <p className="text-gray-600 text-sm mb-1">
                  {subscription.status === 'trialing' ? 'Trial termina em' : 'Próxima cobrança'}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(
                    subscription.status === 'trialing'
                      ? subscription.trial_ends_at
                      : subscription.current_period_end
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 flex gap-4">
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
              >
                Mudar Plano
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors"
              >
                Cancelar Assinatura
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-gray-600 text-sm mb-2">Total Pago</p>
              <p className="text-2xl font-bold text-green-600">{formatPrice(stats.total_paid)}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-gray-600 text-sm mb-2">Pendente</p>
              <p className="text-2xl font-bold text-yellow-600">{formatPrice(stats.total_pending)}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-gray-600 text-sm mb-2">Em Atraso</p>
              <p className="text-2xl font-bold text-red-600">{formatPrice(stats.overdue_amount)}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-gray-600 text-sm mb-2">Faturas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.invoice_count}</p>
            </div>
          </div>
        )}

        {/* Invoices Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Histórico de Faturas</h2>

          {invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vencimento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(invoice.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {invoice.description || `Assinatura ${subscription?.plan_name}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatPrice(invoice.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getInvoiceStatusBadge(invoice.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(invoice.due_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {invoice.gateway_invoice_url && (
                          <a
                            href={invoice.gateway_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Ver Boleto
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Nenhuma fatura encontrada
            </div>
          )}
        </div>
      </div>

      {/* Upgrade/Downgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Mudar Plano</h3>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    plan.id === subscription?.plan_id
                      ? 'border-primary-500 bg-primary-50'
                      : selectedPlan?.id === plan.id
                      ? 'border-primary-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <h4 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h4>
                  <p className="text-3xl font-bold text-gray-900 mb-4">
                    {formatPrice(plan.price)}
                    <span className="text-sm font-normal text-gray-600">/mês</span>
                  </p>

                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• {plan.max_users} usuários</li>
                    <li>• {plan.max_leads} leads</li>
                    <li>• {plan.max_storage_gb} GB armazenamento</li>
                  </ul>

                  {plan.id === subscription?.plan_id && (
                    <div className="mt-4 text-center">
                      <span className="text-primary-600 font-semibold">Plano Atual</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedPlan && selectedPlan.id !== subscription?.plan_id && (
              <div className="mt-6 flex justify-end gap-4">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (selectedPlan.price > subscription.plan_price) {
                      handleUpgrade(selectedPlan.id);
                    } else {
                      handleDowngrade(selectedPlan.id);
                    }
                  }}
                  className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg"
                >
                  {selectedPlan.price > subscription.plan_price ? 'Fazer Upgrade' : 'Fazer Downgrade'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Cancelar Assinatura</h3>

            <p className="text-gray-600 mb-6">
              Tem certeza que deseja cancelar sua assinatura? Esta ação não pode ser desfeita.
            </p>

            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cancelImmediate}
                  onChange={(e) => setCancelImmediate(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  Cancelar imediatamente (caso contrário, manterá acesso até o fim do período)
                </span>
              </label>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Billing;
