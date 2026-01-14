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
  const [usage, setUsage] = useState(null);
  const [nextInvoice, setNextInvoice] = useState(null);
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
      const [summaryRes, invoicesRes, plansRes, statsRes, usageRes, nextInvoiceRes] = await Promise.all([
        subscriptionAPI.summary(),
        billingAPI.listInvoices({ limit: 10 }),
        plansAPI.listar(),
        billingAPI.getStats(),
        subscriptionAPI.usage(),
        billingAPI.getNextInvoice(),
      ]);

      setSubscription(summaryRes.data.data.subscription);
      setInvoices(invoicesRes.data.data);
      setPlans(plansRes.data.data || []);
      setStats(statsRes.data.data);
      setUsage(usageRes.data.data);
      setNextInvoice(nextInvoiceRes.data.data);
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
    if (!dateString) return '-';
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

  const getUsagePercentage = (current, max) => {
    if (!max || max === 0) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
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

  // Parsear features do plano (podem vir como string JSON ou array)
  const getPlanFeatures = () => {
    if (!subscription?.features) return [];
    try {
      if (typeof subscription.features === 'string') {
        return JSON.parse(subscription.features);
      }
      return subscription.features;
    } catch {
      return [];
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
  const planFeatures = getPlanFeatures();

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Assinatura</h1>
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

        {/* Next Invoice Alert */}
        {nextInvoice && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded-r-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-yellow-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-yellow-900 font-semibold">
                    Próxima fatura: {formatPrice(nextInvoice.amount)}
                  </p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Vencimento: {formatDate(nextInvoice.due_date)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {nextInvoice.gateway_invoice_url && (
                  <a
                    href={nextInvoice.gateway_invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Pagar Agora
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Grid principal com duas colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Current Subscription Card */}
          {subscription && (
            <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
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

              {/* Plan Features */}
              {planFeatures.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Recursos do plano</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {planFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

          {/* Usage Card */}
          {usage && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Uso do Plano</h2>

              {/* Usuários */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Usuários</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {usage.usage.users} / {usage.limits.max_users}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getUsageColor(getUsagePercentage(usage.usage.users, usage.limits.max_users))}`}
                    style={{ width: `${getUsagePercentage(usage.usage.users, usage.limits.max_users)}%` }}
                  />
                </div>
              </div>

              {/* Leads */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Leads/Clientes</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {usage.usage.leads} / {usage.limits.max_leads}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getUsageColor(getUsagePercentage(usage.usage.leads, usage.limits.max_leads))}`}
                    style={{ width: `${getUsagePercentage(usage.usage.leads, usage.limits.max_leads)}%` }}
                  />
                </div>
              </div>

              {/* Equipes */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Equipes</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {usage.usage.equipes} / {usage.limits.max_equipes}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getUsageColor(getUsagePercentage(usage.usage.equipes, usage.limits.max_equipes))}`}
                    style={{ width: `${getUsagePercentage(usage.usage.equipes, usage.limits.max_equipes)}%` }}
                  />
                </div>
              </div>

              {/* Armazenamento */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Armazenamento</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {usage.usage.storage_gb || 0} GB / {usage.limits.max_storage_gb} GB
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getUsageColor(getUsagePercentage(usage.usage.storage_gb || 0, usage.limits.max_storage_gb))}`}
                    style={{ width: `${getUsagePercentage(usage.usage.storage_gb || 0, usage.limits.max_storage_gb)}%` }}
                  />
                </div>
              </div>

              {/* Alerta de limite próximo */}
              {(getUsagePercentage(usage.usage.users, usage.limits.max_users) >= 80 ||
                getUsagePercentage(usage.usage.leads, usage.limits.max_leads) >= 80) && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    Você está próximo do limite do plano. Considere fazer upgrade para continuar crescendo.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

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
                        <div className="flex gap-2">
                          {invoice.gateway_invoice_url && (
                            <a
                              href={invoice.gateway_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 font-medium"
                              title="Ver fatura"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </a>
                          )}
                          {invoice.boleto_url && (
                            <a
                              href={invoice.boleto_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-gray-700 font-medium"
                              title="Baixar boleto PDF"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </a>
                          )}
                          {invoice.status === 'pending' && invoice.gateway_invoice_url && (
                            <a
                              href={invoice.gateway_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700 font-medium text-xs bg-green-50 px-2 py-1 rounded"
                            >
                              Pagar
                            </a>
                          )}
                        </div>
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
