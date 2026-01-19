import { useState, useEffect } from 'react';
import { assinaturaAPI } from '../api/api';

const UsageIndicator = ({ compact = false }) => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarUso();
    // Atualizar a cada 5 minutos
    const interval = setInterval(carregarUso, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const carregarUso = async () => {
    try {
      const response = await assinaturaAPI.getUso();
      setUsage(response.data.usage);
    } catch (error) {
      console.error('Erro ao carregar uso:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !usage) {
    return null;
  }

  const getPercentage = (current, max) => {
    if (!max || max === Infinity) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getColorClass = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColorClass = (percentage) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-orange-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (compact) {
    // Versão compacta para navbar
    return (
      <div className="flex items-center gap-3">
        {/* Usuários */}
        <div className="flex items-center gap-2" title={`Usuários: ${usage.usuarios.total} / ${usage.usuarios.limite}`}>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className={`text-sm font-medium ${getTextColorClass(getPercentage(usage.usuarios.total, usage.usuarios.limite))}`}>
            {usage.usuarios.total}/{usage.usuarios.limite}
          </span>
        </div>

        {/* Leads */}
        {usage.leads.limite && (
          <div className="flex items-center gap-2" title={`Leads: ${usage.leads.total} / ${usage.leads.limite}`}>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className={`text-sm font-medium ${getTextColorClass(getPercentage(usage.leads.total, usage.leads.limite))}`}>
              {usage.leads.total}/{usage.leads.limite}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Versão completa para dashboard ou página de assinatura
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Uso de Recursos</h3>
        <button
          onClick={carregarUso}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          title="Atualizar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Atualizar
        </button>
      </div>

      <div className="space-y-6">
        {/* Usuários */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Usuários</span>
            </div>
            <span className={`text-sm font-semibold ${getTextColorClass(getPercentage(usage.usuarios.total, usage.usuarios.limite))}`}>
              {usage.usuarios.total} / {usage.usuarios.limite}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${getColorClass(getPercentage(usage.usuarios.total, usage.usuarios.limite))}`}
              style={{ width: `${getPercentage(usage.usuarios.total, usage.usuarios.limite)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>{usage.usuarios.vendedores} vendedores, {usage.usuarios.admins} admins</span>
            <span>{usage.usuarios.restantes} restantes</span>
          </div>
        </div>

        {/* Leads */}
        {usage.leads.limite && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Leads</span>
              </div>
              <span className={`text-sm font-semibold ${getTextColorClass(getPercentage(usage.leads.total, usage.leads.limite))}`}>
                {usage.leads.total} / {usage.leads.limite}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${getColorClass(getPercentage(usage.leads.total, usage.leads.limite))}`}
                style={{ width: `${getPercentage(usage.leads.total, usage.leads.limite)}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>{Math.round(getPercentage(usage.leads.total, usage.leads.limite))}% utilizado</span>
              <span>{usage.leads.restantes} restantes</span>
            </div>
          </div>
        )}

        {/* Storage */}
        {usage.storage.limit_gb && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Armazenamento</span>
              </div>
              <span className={`text-sm font-semibold ${getTextColorClass(getPercentage(usage.storage.used_gb, usage.storage.limit_gb))}`}>
                {usage.storage.used_gb.toFixed(2)} GB / {usage.storage.limit_gb} GB
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${getColorClass(getPercentage(usage.storage.used_gb, usage.storage.limit_gb))}`}
                style={{ width: `${getPercentage(usage.storage.used_gb, usage.storage.limit_gb)}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>{Math.round(getPercentage(usage.storage.used_gb, usage.storage.limit_gb))}% utilizado</span>
              <span>{usage.storage.remaining_gb.toFixed(2)} GB restantes</span>
            </div>
          </div>
        )}
      </div>

      {/* Alerta se próximo do limite */}
      {(getPercentage(usage.usuarios.total, usage.usuarios.limite) >= 90 ||
        (usage.leads.limite && getPercentage(usage.leads.total, usage.leads.limite) >= 90) ||
        (usage.storage.limit_gb && getPercentage(usage.storage.used_gb, usage.storage.limit_gb) >= 90)) && (
        <div className="mt-4 bg-orange-50 border-l-4 border-orange-500 p-3 rounded">
          <div className="flex">
            <svg className="w-5 h-5 text-orange-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-800">
                Você está próximo do limite!
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Considere fazer upgrade do seu plano para não interromper seu trabalho.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageIndicator;
