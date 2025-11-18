import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { clientesAPI, dashboardAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [estatisticas, setEstatisticas] = useState([]);
  const [metasData, setMetasData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    carregarEstatisticas();
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

  const carregarEstatisticas = async () => {
    try {
      const [estatisticasRes, metasRes] = await Promise.all([
        clientesAPI.estatisticas(),
        dashboardAPI.estatisticas()
      ]);

      setEstatisticas(estatisticasRes.data.estatisticas);
      setMetasData(metasRes.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      setError(error.response?.data?.error || error.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const getTotalClientes = () => {
    if (!estatisticas || estatisticas.length === 0) return 0;
    return estatisticas.reduce((total, stat) => total + parseInt(stat.total), 0);
  };

  const getEstatisticaPorEtapa = (etapa) => {
    if (!estatisticas || estatisticas.length === 0) return 0;
    const stat = estatisticas.find((s) => s.etapa === etapa);
    return stat ? parseInt(stat.total) : 0;
  };

  // Nomes amigáveis das etapas
  const etapasNomes = {
    novo_contato: 'Novos Contatos',
    proposta_enviada: 'Propostas Enviadas',
    negociacao: 'Em Negociação',
    fechado: 'Fechados',
    perdido: 'Perdidos',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ maxWidth: '1472px' }}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando estatísticas...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ maxWidth: '1472px' }}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-600 text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Erro ao carregar dados</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  carregarEstatisticas();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div
        className="transition-all duration-300 ease-in-out px-4 sm:px-6 lg:px-8 py-8"
        style={{
          marginLeft: isExpanded ? '256px' : '80px',
          maxWidth: 'calc(100% - ' + (isExpanded ? '256px' : '80px') + ')'
        }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bem-vindo, {usuario?.nome}!
          </h1>
          <p className="text-gray-600">
            Gerencie seus clientes e acompanhe o funil de vendas
          </p>
          {usuario?.equipe_nome && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-200 rounded-lg">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-sm font-medium text-primary-700">
                Equipe: {usuario.equipe_nome}
              </span>
            </div>
          )}
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          {/* Total de clientes */}
          <div className="card bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-lg">
            <p className="text-sm opacity-90 font-medium">Total de Clientes</p>
            <p className="text-3xl font-bold mt-2">{getTotalClientes()}</p>
          </div>

          {/* Estatísticas por etapa */}
          {Object.entries(etapasNomes).map(([etapa, nome]) => (
            <div key={etapa} className="card hover:shadow-lg transition-shadow">
              <p className="text-sm text-gray-600 font-medium">{nome}</p>
              <p className="text-2xl font-bold text-primary-700 mt-2">
                {getEstatisticaPorEtapa(etapa)}
              </p>
            </div>
          ))}
        </div>

        {/* Metas e Desempenho */}
        {metasData && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Metas e Desempenho</h2>

            {/* Card Meta - Para vendedores mostra meta da equipe, para admin/gerente mostra meta geral */}
            {usuario?.role === 'vendedor' && metasData.vendas_por_equipe && metasData.vendas_por_equipe.length > 0 ? (
              // Vendedor vê apenas a meta da sua equipe
              <div className="card mb-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Meta da Minha Equipe</h3>
                    <p className="text-sm text-gray-600">
                      {metasData.vendas_por_equipe[0].equipe_nome} - {metasData.mes_referencia}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-700">
                      {(metasData.vendas_por_equipe[0].percentual_atingido || 0).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-600">atingido</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Meta da Equipe</p>
                    <p className="text-2xl font-bold text-gray-900">
                      R$ {metasData.vendas_por_equipe[0].meta_equipe.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Vendido</p>
                    <p className="text-2xl font-bold text-green-700">
                      R$ {metasData.vendas_por_equipe[0].total_vendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Vendas Fechadas</p>
                    <p className="text-xl font-semibold text-primary-700">
                      {metasData.vendas_por_equipe[0].total_vendas}
                    </p>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: `${Math.min(metasData.vendas_por_equipe[0].percentual_atingido || 0, 100)}%` }}
                  >
                    {(metasData.vendas_por_equipe[0].percentual_atingido || 0) > 10 && (
                      <span className="text-xs font-bold text-white">
                        {(metasData.vendas_por_equipe[0].percentual_atingido || 0).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Admin e Gerente veem meta geral
              <>
                <div className="card mb-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Meta Geral do Mês</h3>
                      <p className="text-sm text-gray-600">
                        Referência: {metasData.mes_referencia}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-green-700">
                        {(metasData.percentual_atingido_geral || 0).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-600">atingido</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Meta Total</p>
                      <p className="text-2xl font-bold text-gray-900">
                        R$ {metasData.meta_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Vendido</p>
                      <p className="text-2xl font-bold text-green-700">
                        R$ {metasData.total_vendido_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${Math.min(metasData.percentual_atingido_geral || 0, 100)}%` }}
                    >
                      {(metasData.percentual_atingido_geral || 0) > 10 && (
                        <span className="text-xs font-bold text-white">
                          {(metasData.percentual_atingido_geral || 0).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Vendas por Equipe - Apenas para Admin e Gerente */}
                {metasData.vendas_por_equipe && metasData.vendas_por_equipe.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Desempenho por Equipe</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {metasData.vendas_por_equipe.map((equipe) => (
                        <div key={equipe.equipe_id} className="card hover:shadow-lg transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-gray-900">{equipe.equipe_nome}</h4>
                            <span className={`text-lg font-bold ${
                              equipe.percentual_atingido >= 100 ? 'text-green-600' :
                              equipe.percentual_atingido >= 75 ? 'text-blue-600' :
                              equipe.percentual_atingido >= 50 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {equipe.percentual_atingido}%
                            </span>
                          </div>

                          <div className="space-y-2 mb-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Meta:</span>
                              <span className="font-semibold text-gray-900">
                                R$ {equipe.meta_equipe.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Total Vendido:</span>
                              <span className="font-semibold text-green-700">
                                R$ {equipe.total_vendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Vendas Fechadas:</span>
                              <span className="font-semibold text-primary-700">
                                {equipe.total_vendas}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t">
                              <span className="text-gray-500 text-xs">Contribuição:</span>
                              <span className="text-xs font-medium text-gray-600">
                                {equipe.percentual_contribuicao}% do total
                              </span>
                            </div>
                          </div>

                          {/* Barra de Progresso da Equipe */}
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-3 rounded-full transition-all duration-500 ${
                                equipe.percentual_atingido >= 100 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                equipe.percentual_atingido >= 75 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                equipe.percentual_atingido >= 50 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                                'bg-gradient-to-r from-red-500 to-red-600'
                              }`}
                              style={{ width: `${Math.min(equipe.percentual_atingido, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Ações Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Card Esteira de Vendas */}
          <div className="card bg-gradient-to-br from-primary-500 to-primary-700 text-white hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate('/kanban')}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Esteira de Vendas</h3>
                <p className="text-sm opacity-90 mb-4">
                  Gerencie clientes através da esteira
                </p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>Acessar Esteira</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <svg className="w-16 h-16 opacity-20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 4h7v7H4V4zm0 9h7v7H4v-7zm9-9h7v7h-7V4zm0 9h7v7h-7v-7z" />
              </svg>
            </div>
          </div>

          {/* Card Novo Cliente */}
          <div className="card bg-gradient-to-br from-accent-500 to-accent-600 text-white hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate('/cadastro-cliente')}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Cadastrar Cliente</h3>
                <p className="text-sm opacity-90 mb-4">
                  Adicione um novo cliente ao sistema
                </p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>Novo Cadastro</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
              <svg className="w-16 h-16 opacity-20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Informações adicionais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Meu Link */}
          <div className="card hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Meu Link de Cadastro</h3>
            <p className="text-sm text-gray-600 mb-4">
              Compartilhe seu link personalizado para receber cadastros automaticamente
            </p>
            <button
              onClick={() => navigate('/meu-link')}
              className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1"
            >
              <span>Ver meu link</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Card Resumo */}
          <div className="card hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Resumo da Esteira</h3>
            <p className="text-sm text-gray-600 mb-4">
              Total de {getTotalClientes()} clientes distribuídos em {Object.keys(etapasNomes).length} etapas da esteira
            </p>
            <button
              onClick={() => navigate('/kanban')}
              className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1"
            >
              <span>Ver detalhes na Esteira</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
