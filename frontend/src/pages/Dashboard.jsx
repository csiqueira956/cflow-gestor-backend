import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { clientesAPI, dashboardAPI, equipesAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { usuario } = useAuth();
  const [estatisticas, setEstatisticas] = useState([]);
  const [metasData, setMetasData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Estados dos filtros
  const [filtros, setFiltros] = useState({
    periodo: 'mes',
    equipe: 'todas',
    dataInicio: '',
    dataFim: ''
  });
  const [equipes, setEquipes] = useState([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const notificacoesRef = useRef(null);

  // Carregar estado de leitura do localStorage
  const carregarNotificacoesLidas = () => {
    try {
      const lidas = localStorage.getItem('notificacoesLidas');
      return lidas ? JSON.parse(lidas) : [];
    } catch {
      return [];
    }
  };

  // Salvar estado de leitura no localStorage
  const salvarNotificacoesLidas = (idsLidas) => {
    localStorage.setItem('notificacoesLidas', JSON.stringify(idsLidas));
  };

  // Marcar uma notificação como lida
  const marcarComoLida = (id) => {
    setNotificacoes(prev => {
      const atualizadas = prev.map(n =>
        n.id === id ? { ...n, lida: true } : n
      );
      const idsLidas = atualizadas.filter(n => n.lida).map(n => n.id);
      salvarNotificacoesLidas(idsLidas);
      return atualizadas;
    });
  };

  // Marcar todas como lidas
  const marcarTodasComoLidas = () => {
    setNotificacoes(prev => {
      const atualizadas = prev.map(n => ({ ...n, lida: true }));
      const idsLidas = atualizadas.map(n => n.id);
      salvarNotificacoesLidas(idsLidas);
      return atualizadas;
    });
  };

  // Remover uma notificação
  const removerNotificacao = (id) => {
    setNotificacoes(prev => {
      const atualizadas = prev.filter(n => n.id !== id);
      const idsLidas = carregarNotificacoesLidas().filter(lid => atualizadas.some(n => n.id === lid));
      salvarNotificacoesLidas(idsLidas);
      return atualizadas;
    });
  };

  // Contar não lidas
  const contarNaoLidas = () => {
    return notificacoes.filter(n => !n.lida).length;
  };

  // Gerar notificações baseadas nos dados
  const gerarNotificacoes = (stats, metas) => {
    const novas = [];
    const hoje = new Date();
    const idsLidas = carregarNotificacoesLidas();

    // Notificação de meta
    if (metas) {
      const percentual = metas.percentual_atingido_geral || 0;
      if (percentual >= 100) {
        novas.push({
          id: 1,
          tipo: 'sucesso',
          icone: 'trophy',
          titulo: 'Meta Atingida!',
          mensagem: `Parabéns! A meta do mês foi atingida com ${percentual.toFixed(1)}%`,
          tempo: 'Agora',
          lida: idsLidas.includes(1)
        });
      } else if (percentual >= 80) {
        novas.push({
          id: 2,
          tipo: 'info',
          icone: 'trending-up',
          titulo: 'Quase lá!',
          mensagem: `Faltam apenas ${(100 - percentual).toFixed(1)}% para atingir a meta do mês`,
          tempo: 'Agora',
          lida: idsLidas.includes(2)
        });
      } else if (hoje.getDate() > 20 && percentual < 50) {
        novas.push({
          id: 3,
          tipo: 'alerta',
          icone: 'alert',
          titulo: 'Atenção com a Meta',
          mensagem: `Meta do mês está em ${percentual.toFixed(1)}%. Faltam ${30 - hoje.getDate()} dias.`,
          tempo: 'Agora',
          lida: idsLidas.includes(3)
        });
      }
    }

    // Notificação de clientes
    if (stats && stats.length > 0) {
      const novosContatos = stats.find(s => s.etapa === 'novo_contato');
      if (novosContatos && parseInt(novosContatos.total) > 0) {
        novas.push({
          id: 4,
          tipo: 'info',
          icone: 'users',
          titulo: 'Novos Contatos',
          mensagem: `Você tem ${novosContatos.total} cliente(s) aguardando primeiro contato`,
          tempo: 'Agora',
          lida: idsLidas.includes(4)
        });
      }

      const emNegociacao = stats.find(s => s.etapa === 'negociacao');
      if (emNegociacao && parseInt(emNegociacao.total) > 0) {
        novas.push({
          id: 5,
          tipo: 'info',
          icone: 'handshake',
          titulo: 'Em Negociação',
          mensagem: `${emNegociacao.total} cliente(s) em fase de negociação`,
          tempo: 'Agora',
          lida: idsLidas.includes(5)
        });
      }
    }

    // Notificação padrão se não houver outras
    if (novas.length === 0) {
      novas.push({
        id: 6,
        tipo: 'info',
        icone: 'bell',
        titulo: 'Tudo em dia!',
        mensagem: 'Nenhuma notificação pendente no momento',
        tempo: 'Agora',
        lida: idsLidas.includes(6)
      });
    }

    setNotificacoes(novas);
  };

  useEffect(() => {
    carregarEstatisticas();
    carregarEquipes();
  }, []);

  useEffect(() => {
    carregarEstatisticas();
  }, [filtros]);

  const carregarEquipes = async () => {
    try {
      if (usuario?.role === 'admin' || usuario?.role === 'gerente') {
        const response = await equipesAPI.listar();
        setEquipes(response.data.data?.equipes || []);
      }
    } catch (error) {
      console.error('Erro ao carregar equipes:', error);
    }
  };

  // Sincronizar com mudanças no localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebarExpanded');
      setIsExpanded(saved !== null ? JSON.parse(saved) : true);
    };

    const interval = setInterval(handleStorageChange, 100);
    return () => clearInterval(interval);
  }, []);

  // Fechar notificações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificacoesRef.current && !notificacoesRef.current.contains(event.target)) {
        setMostrarNotificacoes(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const carregarEstatisticas = async () => {
    try {
      const [estatisticasRes, metasRes] = await Promise.all([
        clientesAPI.estatisticas(),
        dashboardAPI.estatisticas()
      ]);

      const stats = estatisticasRes.data.data.estatisticas;
      const metas = metasRes.data.data;

      setEstatisticas(stats);
      setMetasData(metas);
      gerarNotificacoes(stats, metas);
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

      {/* Botão de Notificações - Canto Superior Direito */}
      <div className="fixed top-4 right-4 z-50" ref={notificacoesRef}>
        <button
          onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}
          className="relative p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-gray-200"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {contarNaoLidas() > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
              {contarNaoLidas()}
            </span>
          )}
        </button>

        {/* Dropdown de Notificações */}
        {mostrarNotificacoes && (
          <div className="absolute top-14 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Notificações</h3>
                <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">
                  {contarNaoLidas()} {contarNaoLidas() === 1 ? 'não lida' : 'não lidas'}
                </span>
              </div>
              {contarNaoLidas() > 0 && (
                <button
                  onClick={marcarTodasComoLidas}
                  className="mt-2 w-full text-xs text-white/80 hover:text-white transition-colors flex items-center justify-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {/* Lista de Notificações */}
            <div className="max-h-96 overflow-y-auto">
              {notificacoes.length > 0 ? (
                notificacoes.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.lida && marcarComoLida(notif.id)}
                    className={`px-4 py-3 border-b border-gray-100 transition-colors cursor-pointer ${
                      notif.lida ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'
                    } ${
                      notif.tipo === 'sucesso' ? 'border-l-4 border-l-green-500' :
                      notif.tipo === 'alerta' ? 'border-l-4 border-l-yellow-500' :
                      notif.tipo === 'erro' ? 'border-l-4 border-l-red-500' :
                      'border-l-4 border-l-blue-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full flex-shrink-0 ${
                        notif.tipo === 'sucesso' ? 'bg-green-100' :
                        notif.tipo === 'alerta' ? 'bg-yellow-100' :
                        notif.tipo === 'erro' ? 'bg-red-100' :
                        'bg-blue-100'
                      }`}>
                        {notif.icone === 'trophy' && (
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        )}
                        {notif.icone === 'trending-up' && (
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        )}
                        {notif.icone === 'alert' && (
                          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                        {notif.icone === 'users' && (
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        )}
                        {notif.icone === 'handshake' && (
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                        {notif.icone === 'bell' && (
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold ${
                            notif.lida ? 'text-gray-500' :
                            notif.tipo === 'sucesso' ? 'text-green-800' :
                            notif.tipo === 'alerta' ? 'text-yellow-800' :
                            notif.tipo === 'erro' ? 'text-red-800' :
                            'text-blue-800'
                          }`}>
                            {notif.titulo}
                          </p>
                          {/* Botão remover */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removerNotificacao(notif.id);
                            }}
                            className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Remover notificação"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <p className={`text-xs mt-0.5 line-clamp-2 ${notif.lida ? 'text-gray-400' : 'text-gray-500'}`}>
                          {notif.mensagem}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-400">{notif.tempo}</p>
                          {!notif.lida && (
                            <span className="text-xs text-primary-600 font-medium">• Nova</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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

        {/* Filtros */}
        <div className="card mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="font-semibold text-gray-700">Filtros</span>
              <button
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium ml-2"
              >
                {mostrarFiltros ? 'Ocultar' : 'Expandir'}
              </button>
            </div>

            {/* Filtros rápidos de período */}
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'hoje', label: 'Hoje' },
                { value: 'semana', label: 'Esta Semana' },
                { value: 'mes', label: 'Este Mês' },
                { value: 'ano', label: 'Este Ano' },
              ].map((periodo) => (
                <button
                  key={periodo.value}
                  onClick={() => setFiltros({ ...filtros, periodo: periodo.value, dataInicio: '', dataFim: '' })}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filtros.periodo === periodo.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {periodo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtros expandidos */}
          {mostrarFiltros && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Filtro de Equipe - apenas para admin/gerente */}
                {(usuario?.role === 'admin' || usuario?.role === 'gerente') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Equipe</label>
                    <select
                      value={filtros.equipe}
                      onChange={(e) => setFiltros({ ...filtros, equipe: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="todas">Todas as Equipes</option>
                      {equipes.map((equipe) => (
                        <option key={equipe.id} value={equipe.id}>
                          {equipe.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Data Início */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                  <input
                    type="date"
                    value={filtros.dataInicio}
                    onChange={(e) => setFiltros({ ...filtros, periodo: 'personalizado', dataInicio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Data Fim */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                  <input
                    type="date"
                    value={filtros.dataFim}
                    onChange={(e) => setFiltros({ ...filtros, periodo: 'personalizado', dataFim: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Botão Limpar */}
                <div className="flex items-end">
                  <button
                    onClick={() => setFiltros({ periodo: 'mes', equipe: 'todas', dataInicio: '', dataFim: '' })}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>

              {/* Indicador de filtro ativo */}
              {(filtros.periodo === 'personalizado' || filtros.equipe !== 'todas') && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-sm text-gray-500">Filtros ativos:</span>
                  {filtros.periodo === 'personalizado' && filtros.dataInicio && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                      Início: {new Date(filtros.dataInicio).toLocaleDateString('pt-BR')}
                      <button onClick={() => setFiltros({ ...filtros, dataInicio: '' })} className="hover:text-primary-900">×</button>
                    </span>
                  )}
                  {filtros.periodo === 'personalizado' && filtros.dataFim && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                      Fim: {new Date(filtros.dataFim).toLocaleDateString('pt-BR')}
                      <button onClick={() => setFiltros({ ...filtros, dataFim: '' })} className="hover:text-primary-900">×</button>
                    </span>
                  )}
                  {filtros.equipe !== 'todas' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Equipe: {equipes.find(e => e.id === parseInt(filtros.equipe))?.nome || filtros.equipe}
                      <button onClick={() => setFiltros({ ...filtros, equipe: 'todas' })} className="hover:text-blue-900">×</button>
                    </span>
                  )}
                </div>
              )}
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

        {/* Metas e Desempenho - Gráficos */}
        {metasData && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Metas e Desempenho</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Gráfico Gauge - Meta do Mês */}
              <div className="card">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {usuario?.role === 'vendedor' ? 'Meta da Minha Equipe' : 'Meta Geral do Mês'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">Referência: {metasData.mes_referencia}</p>

                <div className="flex items-center justify-center">
                  <div className="relative w-56 h-28 overflow-hidden">
                    {/* Gauge semicircular */}
                    <svg viewBox="0 0 200 100" className="w-full h-full">
                      {/* Fundo do gauge */}
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="16"
                        strokeLinecap="round"
                      />
                      {/* Progresso do gauge */}
                      {(() => {
                        const percentual = usuario?.role === 'vendedor' && metasData.vendas_por_equipe?.[0]
                          ? metasData.vendas_por_equipe[0].percentual_atingido || 0
                          : metasData.percentual_atingido_geral || 0;
                        const limitedPercentual = Math.min(percentual, 100);
                        // Calcular o comprimento do arco (semicírculo = 251.33)
                        const arcLength = 251.33;
                        const dashArray = `${(limitedPercentual / 100) * arcLength} ${arcLength}`;
                        const color = percentual >= 100 ? '#22c55e' : percentual >= 75 ? '#3b82f6' : percentual >= 50 ? '#eab308' : '#ef4444';
                        return (
                          <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            fill="none"
                            stroke={color}
                            strokeWidth="16"
                            strokeLinecap="round"
                            strokeDasharray={dashArray}
                            className="transition-all duration-1000"
                          />
                        );
                      })()}
                    </svg>
                    {/* Valor central */}
                    <div className="absolute inset-0 flex items-end justify-center pb-2">
                      <div className="text-center">
                        <p className={`text-4xl font-bold ${
                          (usuario?.role === 'vendedor'
                            ? metasData.vendas_por_equipe?.[0]?.percentual_atingido
                            : metasData.percentual_atingido_geral) >= 100
                          ? 'text-green-600'
                          : 'text-gray-900'
                        }`}>
                          {(usuario?.role === 'vendedor' && metasData.vendas_por_equipe?.[0]
                            ? metasData.vendas_por_equipe[0].percentual_atingido || 0
                            : metasData.percentual_atingido_geral || 0
                          ).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Valores */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Meta</p>
                    <p className="text-lg font-bold text-gray-900">
                      R$ {(usuario?.role === 'vendedor' && metasData.vendas_por_equipe?.[0]
                        ? metasData.vendas_por_equipe[0].meta_equipe
                        : metasData.meta_geral || 0
                      ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Realizado</p>
                    <p className="text-lg font-bold text-green-600">
                      R$ {(usuario?.role === 'vendedor' && metasData.vendas_por_equipe?.[0]
                        ? metasData.vendas_por_equipe[0].total_vendido
                        : metasData.total_vendido_geral || 0
                      ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Gráfico Acumulado do Mês */}
              <div className="card">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Acumulado do Mês</h3>
                <p className="text-sm text-gray-500 mb-4">Evolução das vendas</p>

                {/* Gráfico de área simulado */}
                <div className="relative h-48">
                  <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="0" y1="37.5" x2="400" y2="37.5" stroke="#e5e7eb" strokeWidth="1" />
                    <line x1="0" y1="75" x2="400" y2="75" stroke="#e5e7eb" strokeWidth="1" />
                    <line x1="0" y1="112.5" x2="400" y2="112.5" stroke="#e5e7eb" strokeWidth="1" />

                    {/* Linha da meta */}
                    <line x1="0" y1="30" x2="400" y2="30" stroke="#ef4444" strokeWidth="2" strokeDasharray="8,4" />

                    {/* Área do gráfico */}
                    {(() => {
                      const totalVendido = usuario?.role === 'vendedor' && metasData.vendas_por_equipe?.[0]
                        ? metasData.vendas_por_equipe[0].total_vendido
                        : metasData.total_vendido_geral || 0;
                      const meta = usuario?.role === 'vendedor' && metasData.vendas_por_equipe?.[0]
                        ? metasData.vendas_por_equipe[0].meta_equipe
                        : metasData.meta_geral || 1;

                      // Simular progresso ao longo do mês (proporcional ao dia atual)
                      const hoje = new Date().getDate();
                      const diasNoMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

                      // Criar pontos proporcionais
                      const pontos = [];
                      for (let i = 0; i <= 10; i++) {
                        const x = (i / 10) * 400;
                        const progresso = Math.min(1, (i / 10) * (hoje / diasNoMes) * 1.2);
                        const valor = totalVendido * progresso;
                        const y = 150 - (valor / meta) * 120;
                        pontos.push({ x, y: Math.max(30, Math.min(150, y)) });
                      }

                      const pathD = `M ${pontos.map(p => `${p.x},${p.y}`).join(' L ')} L 400,150 L 0,150 Z`;
                      const lineD = `M ${pontos.map(p => `${p.x},${p.y}`).join(' L ')}`;

                      return (
                        <>
                          <path d={pathD} fill="url(#gradient)" opacity="0.3" />
                          <path d={lineD} fill="none" stroke="#22c55e" strokeWidth="3" />
                          {/* Ponto atual */}
                          <circle cx={pontos[pontos.length - 1].x} cy={pontos[pontos.length - 1].y} r="6" fill="#22c55e" />
                        </>
                      );
                    })()}

                    {/* Gradiente */}
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Labels do eixo Y */}
                  <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 py-1">
                    <span>100%</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>0%</span>
                  </div>
                </div>

                {/* Legenda */}
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-green-500 rounded"></div>
                    <span className="text-xs text-gray-600">Realizado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-red-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #ef4444, #ef4444 4px, transparent 4px, transparent 8px)' }}></div>
                    <span className="text-xs text-gray-600">Meta</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vendas por Equipe - Apenas para Admin e Gerente */}
            {usuario?.role !== 'vendedor' && metasData.vendas_por_equipe && metasData.vendas_por_equipe.length > 0 && (
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
          </div>
        )}

        {/* Gráficos e Análises */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gráfico de Barras - Distribuição por Etapa */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Distribuição por Etapa</h3>
            <div className="space-y-4">
              {Object.entries(etapasNomes).map(([etapa, nome]) => {
                const valor = getEstatisticaPorEtapa(etapa);
                const total = getTotalClientes();
                const percentual = total > 0 ? (valor / total) * 100 : 0;
                const cores = {
                  novo_contato: 'bg-blue-500',
                  proposta_enviada: 'bg-yellow-500',
                  negociacao: 'bg-purple-500',
                  fechado: 'bg-green-500',
                  perdido: 'bg-red-500',
                };
                return (
                  <div key={etapa}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{nome}</span>
                      <span className="font-semibold text-gray-900">{valor} ({percentual.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`${cores[etapa]} h-3 rounded-full transition-all duration-500`}
                        style={{ width: `${percentual}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gráfico de Rosca - Visão Geral */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Visão Geral do Funil</h3>
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                {/* Donut Chart usando CSS */}
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  {(() => {
                    const total = getTotalClientes();
                    if (total === 0) {
                      return (
                        <circle
                          cx="18" cy="18" r="15.9155"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="3"
                        />
                      );
                    }
                    const etapas = ['novo_contato', 'proposta_enviada', 'negociacao', 'fechado', 'perdido'];
                    const cores = ['#3b82f6', '#eab308', '#a855f7', '#22c55e', '#ef4444'];
                    let offset = 0;
                    return etapas.map((etapa, index) => {
                      const valor = getEstatisticaPorEtapa(etapa);
                      const percentual = (valor / total) * 100;
                      const dashArray = `${percentual} ${100 - percentual}`;
                      const currentOffset = offset;
                      offset += percentual;
                      return (
                        <circle
                          key={etapa}
                          cx="18" cy="18" r="15.9155"
                          fill="none"
                          stroke={cores[index]}
                          strokeWidth="3"
                          strokeDasharray={dashArray}
                          strokeDashoffset={-currentOffset}
                          className="transition-all duration-500"
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">{getTotalClientes()}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Legenda */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {Object.entries(etapasNomes).map(([etapa, nome]) => {
                const cores = {
                  novo_contato: 'bg-blue-500',
                  proposta_enviada: 'bg-yellow-500',
                  negociacao: 'bg-purple-500',
                  fechado: 'bg-green-500',
                  perdido: 'bg-red-500',
                };
                return (
                  <div key={etapa} className="flex items-center gap-2 text-sm">
                    <div className={`w-3 h-3 rounded-full ${cores[etapa]}`}></div>
                    <span className="text-gray-600">{nome}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Funil de Conversão */}
        <div className="card mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Funil de Conversão</h3>
          <div className="flex flex-col items-center space-y-2">
            {(() => {
              const etapasOrdenadas = ['novo_contato', 'proposta_enviada', 'negociacao', 'fechado'];
              const coresGradient = [
                'from-blue-400 to-blue-500',
                'from-yellow-400 to-yellow-500',
                'from-purple-400 to-purple-500',
                'from-green-400 to-green-500',
              ];
              const larguras = ['100%', '80%', '60%', '40%'];
              const total = getTotalClientes();

              return etapasOrdenadas.map((etapa, index) => {
                const valor = getEstatisticaPorEtapa(etapa);
                const percentual = total > 0 ? ((valor / total) * 100).toFixed(1) : 0;

                return (
                  <div
                    key={etapa}
                    className={`bg-gradient-to-r ${coresGradient[index]} text-white py-3 px-6 rounded-lg text-center transition-all duration-300 hover:shadow-lg`}
                    style={{ width: larguras[index] }}
                  >
                    <p className="font-semibold">{etapasNomes[etapa]}</p>
                    <p className="text-sm opacity-90">{valor} clientes ({percentual}%)</p>
                  </div>
                );
              });
            })()}
          </div>
          {/* Taxa de Conversão */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Taxa de Fechamento</p>
                <p className="text-2xl font-bold text-green-600">
                  {getTotalClientes() > 0
                    ? ((getEstatisticaPorEtapa('fechado') / getTotalClientes()) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Em Andamento</p>
                <p className="text-2xl font-bold text-purple-600">
                  {getEstatisticaPorEtapa('novo_contato') + getEstatisticaPorEtapa('proposta_enviada') + getEstatisticaPorEtapa('negociacao')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Taxa de Perda</p>
                <p className="text-2xl font-bold text-red-600">
                  {getTotalClientes() > 0
                    ? ((getEstatisticaPorEtapa('perdido') / getTotalClientes()) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Indicadores de Performance */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Novos Contatos</p>
                <p className="text-2xl font-bold text-blue-700">{getEstatisticaPorEtapa('novo_contato')}</p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Propostas Enviadas</p>
                <p className="text-2xl font-bold text-yellow-700">{getEstatisticaPorEtapa('proposta_enviada')}</p>
              </div>
              <div className="bg-yellow-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Fechados</p>
                <p className="text-2xl font-bold text-green-700">{getEstatisticaPorEtapa('fechado')}</p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Perdidos</p>
                <p className="text-2xl font-bold text-red-700">{getEstatisticaPorEtapa('perdido')}</p>
              </div>
              <div className="bg-red-200 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
