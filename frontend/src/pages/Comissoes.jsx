import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { comissoesAPI, clientesAPI, usuariosAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

const Comissoes = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [comissoes, setComissoes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showParcelasModal, setShowParcelasModal] = useState(false);
  const [comissaoSelecionada, setComissaoSelecionada] = useState(null);
  const [mesSelecionado, setMesSelecionado] = useState(null);
  const [formData, setFormData] = useState({
    cliente_id: '',
    vendedor_id: '',
    valor_venda: '',
    percentual_comissao: '',
    numero_parcelas: '1',
  });
  const [erro, setErro] = useState('');
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
      // Vendedores não precisam carregar lista de vendedores (apenas admins)
      const promises = [
        comissoesAPI.listar(),
        clientesAPI.listar(),
      ];

      if (isAdmin()) {
        promises.push(usuariosAPI.listarVendedores());
      }

      const results = await Promise.all(promises);
      const [comissoesRes, clientesRes, vendedoresRes] = results;

      setComissoes(comissoesRes.data.data.comissoes);
      setClientes(clientesRes.data.data.clientes);

      if (isAdmin() && vendedoresRes) {
        setVendedores(vendedoresRes.data.data.vendedores);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Se mudou o vendedor, atualizar o percentual automaticamente e limpar cliente
    if (name === 'vendedor_id') {
      const vendedor = vendedores.find(v => v.id === parseInt(value));
      setFormData({
        ...formData,
        vendedor_id: value,
        percentual_comissao: vendedor?.percentual_comissao || '',
        cliente_id: '', // Limpar cliente quando muda vendedor
        valor_venda: '', // Limpar valor quando muda vendedor
      });
    }
    // Se mudou o cliente, atualizar o valor da venda automaticamente
    else if (name === 'cliente_id') {
      const cliente = clientes.find(c => c.id === parseInt(value));
      setFormData({
        ...formData,
        cliente_id: value,
        valor_venda: cliente?.valor_carta || '',
      });
    }
    else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    setErro('');
  };

  // Filtrar clientes: apenas os do vendedor selecionado e com etapa 'fechado'
  const getClientesFiltrados = () => {
    if (!formData.vendedor_id) {
      return [];
    }

    return clientes.filter(cliente =>
      cliente.vendedor_id === parseInt(formData.vendedor_id) &&
      cliente.etapa === 'fechado'
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!formData.cliente_id || !formData.vendedor_id || !formData.valor_venda || !formData.percentual_comissao) {
      setErro('Todos os campos são obrigatórios');
      return;
    }

    try {
      await comissoesAPI.criar({
        cliente_id: parseInt(formData.cliente_id),
        vendedor_id: parseInt(formData.vendedor_id),
        valor_venda: parseFloat(formData.valor_venda),
        percentual_comissao: parseFloat(formData.percentual_comissao),
        numero_parcelas: parseInt(formData.numero_parcelas),
      });

      toast.success('Comissão cadastrada com sucesso!');
      carregarDados();
      setFormData({
        cliente_id: '',
        vendedor_id: '',
        valor_venda: '',
        percentual_comissao: '',
        numero_parcelas: '1',
      });
      setShowModal(false);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Erro ao criar comissão';
      toast.error(errorMsg);
      setErro(errorMsg);
    }
  };

  const handleEditParcelas = async (comissao) => {
    try {
      const response = await comissoesAPI.buscar(comissao.id);
      setComissaoSelecionada(response.data);
      setShowParcelasModal(true);
    } catch (error) {
      console.error('Erro ao buscar comissão:', error);
      toast.error('Erro ao carregar parcelas da comissão');
    }
  };

  const handleAtualizarParcela = async (parcela, campo, valor) => {
    try {
      await comissoesAPI.atualizarParcela(parcela.id, {
        ...parcela,
        [campo]: valor,
      });

      // Atualizar parcela localmente
      setComissaoSelecionada({
        ...comissaoSelecionada,
        parcelas: comissaoSelecionada.parcelas.map(p =>
          p.id === parcela.id ? { ...p, [campo]: valor } : p
        ),
      });

      toast.success('Parcela atualizada com sucesso!');
      // Recarregar dados
      carregarDados();
    } catch (error) {
      console.error('Erro ao atualizar parcela:', error);
      toast.error('Erro ao atualizar parcela');
    }
  };

  const handleAtualizarNumeroParcelas = async (comissaoId, numeroParcelas) => {
    try {
      await comissoesAPI.atualizar(comissaoId, {
        numero_parcelas: parseInt(numeroParcelas),
      });

      toast.success('Número de parcelas atualizado com sucesso!');
      // Recarregar comissão
      const response = await comissoesAPI.buscar(comissaoId);
      setComissaoSelecionada(response.data);
      carregarDados();
    } catch (error) {
      console.error('Erro ao atualizar número de parcelas:', error);
      toast.error('Erro ao atualizar número de parcelas');
    }
  };

  const formatarValor = (valor) => {
    if (!valor) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  // Calcular estatísticas de comissões
  const calcularEstatisticas = () => {
    const stats = {
      totalAcumulado: 0,
      totalPago: 0,
      totalPendente: 0,
      totalMesAtual: 0,
      porMes: {}
    };

    const mesAtual = new Date();
    const mesAtualKey = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}`;

    comissoes.forEach(comissao => {
      const valorComissao = parseFloat(comissao.valor_comissao || 0);
      stats.totalAcumulado += valorComissao;

      if (comissao.status === 'pago') {
        stats.totalPago += valorComissao;
      } else if (comissao.status === 'pendente' || comissao.status === 'em_pagamento') {
        stats.totalPendente += valorComissao;
      }

      // Agrupar por mês se tiver parcelas
      if (comissao.parcelas && comissao.parcelas.length > 0) {
        comissao.parcelas.forEach(parcela => {
          if (parcela.data_vencimento) {
            const data = new Date(parcela.data_vencimento);
            const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;

            if (!stats.porMes[mesAno]) {
              stats.porMes[mesAno] = {
                mesAno,
                mes: data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
                total: 0,
                pago: 0,
                pendente: 0,
                parcelas: []
              };
            }

            const valorParcela = parseFloat(parcela.valor_parcela || 0);
            stats.porMes[mesAno].total += valorParcela;

            if (parcela.status === 'pago') {
              stats.porMes[mesAno].pago += valorParcela;
            } else {
              stats.porMes[mesAno].pendente += valorParcela;
            }

            // Adicionar parcela com informações da comissão
            stats.porMes[mesAno].parcelas.push({
              ...parcela,
              cliente_nome: comissao.cliente_nome,
              vendedor_nome: comissao.vendedor_nome,
              comissao_id: comissao.id
            });

            // Calcular total do mês atual
            if (mesAno === mesAtualKey) {
              stats.totalMesAtual += valorParcela;
            }
          }
        });
      }
    });

    // Ordenar meses e adicionar índice
    const mesesOrdenados = Object.keys(stats.porMes)
      .sort()
      .map((key, index) => ({ ...stats.porMes[key], index }));

    return { ...stats, mesesOrdenados };
  };

  const estatisticas = calcularEstatisticas();

  const getStatusBadge = (status) => {
    const badges = {
      pendente: 'bg-yellow-100 text-yellow-800',
      em_pagamento: 'bg-blue-100 text-blue-800',
      pago: 'bg-green-100 text-green-800',
      cancelado: 'bg-red-100 text-red-800',
    };
    const labels = {
      pendente: 'Pendente',
      em_pagamento: 'Em Pagamento',
      pago: 'Pago',
      cancelado: 'Cancelado',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status] || badges.pendente}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300 ${isExpanded ? 'ml-64' : 'ml-20'}`} style={{ maxWidth: '1472px' }}>
          <div className="card">
            <div className="flex justify-between items-center mb-8">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-96"></div>
              </div>
              {isAdmin() && (
                <div className="h-10 w-40 bg-gray-200 rounded animate-pulse"></div>
              )}
            </div>
            <TableSkeleton rows={8} columns={isAdmin() ? 8 : 7} />
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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Gerenciar Comissões
              </h1>
              <p className="text-gray-600">
                Acompanhe e gerencie as comissões dos vendedores
              </p>
            </div>

            {isAdmin() && (
              <button
                onClick={() => setShowModal(true)}
                className="btn-accent"
              >
                + Nova Comissão
              </button>
            )}
          </div>

          {/* Estatísticas de Comissionamento */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Resumo de Comissionamento
            </h2>

            {/* Cards de Resumo - Grid com 5 cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              {/* Total de Comissionamento */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-purple-100 text-sm font-medium">Total Comissionamento</span>
                  <svg className="w-8 h-8 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-2xl font-bold">
                  {formatarValor(estatisticas.totalAcumulado)}
                </div>
                <div className="text-purple-100 text-xs mt-1">
                  Todas as comissões
                </div>
              </div>

              {/* Total do Mês */}
              <div className={`rounded-lg p-6 text-white shadow-lg transition-all ${
                mesSelecionado
                  ? 'bg-gradient-to-br from-primary-500 to-primary-600 ring-2 ring-primary-300'
                  : 'bg-gradient-to-br from-indigo-500 to-indigo-600'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    mesSelecionado ? 'text-primary-100' : 'text-indigo-100'
                  }`}>
                    {mesSelecionado ? 'Mês Selecionado' : 'Total do Mês'}
                  </span>
                  <svg className={`w-8 h-8 ${
                    mesSelecionado ? 'text-primary-200' : 'text-indigo-200'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-2xl font-bold">
                  {formatarValor(mesSelecionado ? mesSelecionado.total : estatisticas.totalMesAtual)}
                </div>
                <div className={`text-xs mt-1 capitalize ${
                  mesSelecionado ? 'text-primary-100' : 'text-indigo-100'
                }`}>
                  {mesSelecionado
                    ? mesSelecionado.mes
                    : new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                  }
                </div>
              </div>

              {/* Total Acumulado */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-100 text-sm font-medium">Total Acumulado</span>
                  <svg className="w-8 h-8 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-2xl font-bold">
                  {formatarValor(estatisticas.totalAcumulado)}
                </div>
                <div className="text-blue-100 text-xs mt-1">
                  Todas as parcelas
                </div>
              </div>

              {/* Total Pago */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-100 text-sm font-medium">Total Pago</span>
                  <svg className="w-8 h-8 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-2xl font-bold">
                  {formatarValor(estatisticas.totalPago)}
                </div>
                <div className="text-green-100 text-xs mt-1">
                  Parcelas quitadas
                </div>
              </div>

              {/* Total Pendente */}
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-amber-100 text-sm font-medium">Total Pendente</span>
                  <svg className="w-8 h-8 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-2xl font-bold">
                  {formatarValor(estatisticas.totalPendente)}
                </div>
                <div className="text-amber-100 text-xs mt-1">
                  A receber
                </div>
              </div>
            </div>

            {/* Detalhamento Mês a Mês - Cards Lado a Lado */}
            {estatisticas.mesesOrdenados && estatisticas.mesesOrdenados.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Detalhamento por Mês
                </h3>

                {/* Container horizontal scrollável */}
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-4 min-w-max">
                    {estatisticas.mesesOrdenados.map((mes) => {
                      const percentualPago = mes.total > 0 ? (mes.pago / mes.total * 100) : 0;
                      const isSelected = mesSelecionado?.mesAno === mes.mesAno;

                      return (
                        <button
                          key={mes.mesAno}
                          onClick={() => setMesSelecionado(isSelected ? null : mes)}
                          className={`
                            flex-shrink-0 w-72 p-4 rounded-lg border-2 transition-all
                            ${isSelected
                              ? 'border-primary-500 bg-primary-50 shadow-lg'
                              : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-md'
                            }
                          `}
                        >
                          <div className="text-left">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-900 capitalize">
                                {mes.mes}
                              </h4>
                              <span className={`
                                px-2 py-1 rounded-full text-xs font-medium
                                ${isSelected ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}
                              `}>
                                {mes.parcelas.length} parcelas
                              </span>
                            </div>

                            <div className="space-y-2 mb-3">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600">Total:</span>
                                <span className="text-sm font-bold text-gray-900">
                                  {formatarValor(mes.total)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600">Pago:</span>
                                <span className="text-sm font-semibold text-green-600">
                                  {formatarValor(mes.pago)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600">Pendente:</span>
                                <span className="text-sm font-semibold text-amber-600">
                                  {formatarValor(mes.pendente)}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Progresso</span>
                                <span className="font-medium">{percentualPago.toFixed(0)}%</span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isSelected ? 'bg-primary-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${percentualPago}%` }}
                                ></div>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="mt-3 text-xs text-primary-600 font-medium text-center">
                                ▼ Parcelas abaixo
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lista de Parcelas do Mês Selecionado */}
                {mesSelecionado && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 capitalize">
                        Parcelas de {mesSelecionado.mes}
                      </h4>
                      <button
                        onClick={() => setMesSelecionado(null)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Cliente
                            </th>
                            {isAdmin() && (
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Vendedor
                              </th>
                            )}
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Parcela
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              Valor
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Vencimento
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {mesSelecionado.parcelas.map((parcela) => (
                            <tr key={parcela.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {parcela.cliente_nome}
                              </td>
                              {isAdmin() && (
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {parcela.vendedor_nome}
                                </td>
                              )}
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {parcela.numero_parcela}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                {formatarValor(parcela.valor_parcela)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {formatarData(parcela.data_vencimento)}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {getStatusBadge(parcela.status)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lista de comissões */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Venda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comissão (%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Comissão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parcelas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {isAdmin() && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comissoes.map((comissao) => (
                  <tr key={comissao.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {comissao.cliente_nome}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{comissao.vendedor_nome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-semibold">
                        {formatarValor(comissao.valor_venda)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {comissao.percentual_comissao}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-green-600 font-bold">
                        {formatarValor(comissao.valor_comissao)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {comissao.numero_parcelas}x
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(comissao.status)}
                    </td>
                    {isAdmin() && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleEditParcelas(comissao)}
                          className="text-primary-600 hover:text-primary-800 transition-colors"
                          title="Gerenciar parcelas"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {comissoes.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Nenhuma comissão cadastrada
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de cadastro */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Nova Comissão
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendedor
                </label>
                <select
                  name="vendedor_id"
                  value={formData.vendedor_id}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="">Selecione o vendedor...</option>
                  {vendedores.map((vendedor) => (
                    <option key={vendedor.id} value={vendedor.id}>
                      {vendedor.nome}
                      {vendedor.percentual_comissao && ` (${vendedor.percentual_comissao}%)`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente (Vendas Fechadas)
                </label>
                <select
                  name="cliente_id"
                  value={formData.cliente_id}
                  onChange={handleChange}
                  className="input-field"
                  required
                  disabled={!formData.vendedor_id}
                >
                  <option value="">
                    {formData.vendedor_id ? 'Selecione o cliente...' : 'Primeiro selecione um vendedor'}
                  </option>
                  {getClientesFiltrados().map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                      {cliente.valor_carta && ` - ${formatarValor(cliente.valor_carta)}`}
                    </option>
                  ))}
                </select>
                {formData.vendedor_id && getClientesFiltrados().length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    Nenhuma venda fechada encontrada para este vendedor
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor da Venda (R$)
                </label>
                <input
                  type="number"
                  name="valor_venda"
                  value={formData.valor_venda}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="50000.00"
                  step="0.01"
                  min="0"
                  required
                />
                {formData.cliente_id && formData.valor_venda && (
                  <p className="mt-1 text-xs text-gray-500">
                    Valor preenchido automaticamente do cadastro do cliente
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Percentual de Comissão (%)
                </label>
                <input
                  type="number"
                  name="percentual_comissao"
                  value={formData.percentual_comissao}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="10"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                />
                {formData.vendedor_id && formData.percentual_comissao && (
                  <p className="mt-1 text-xs text-gray-500">
                    Percentual preenchido automaticamente do cadastro do vendedor
                  </p>
                )}
              </div>

              {formData.valor_venda && formData.percentual_comissao && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      Valor da Comissão:
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      {formatarValor((parseFloat(formData.valor_venda) * parseFloat(formData.percentual_comissao)) / 100)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Parcelas
                </label>
                <input
                  type="number"
                  name="numero_parcelas"
                  value={formData.numero_parcelas}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="1"
                  min="1"
                  max="120"
                  required
                />
                {formData.valor_venda && formData.percentual_comissao && formData.numero_parcelas && (
                  <p className="mt-1 text-xs text-gray-500">
                    Valor por parcela: <strong className="text-green-600">
                      {formatarValor(
                        ((parseFloat(formData.valor_venda) * parseFloat(formData.percentual_comissao)) / 100) /
                        parseInt(formData.numero_parcelas)
                      )}
                    </strong>
                  </p>
                )}
              </div>

              {erro && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {erro}
                </div>
              )}

              <div className="flex gap-4">
                <button type="submit" className="btn-accent flex-1">
                  Cadastrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({
                      cliente_id: '',
                      vendedor_id: '',
                      valor_venda: '',
                      percentual_comissao: '',
                      numero_parcelas: '1',
                    });
                    setErro('');
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de gerenciamento de parcelas */}
      {showParcelasModal && comissaoSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 my-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Gerenciar Parcelas
                </h2>
                <p className="text-gray-600 mt-1">
                  Cliente: {comissaoSelecionada.cliente_nome} | Vendedor: {comissaoSelecionada.vendedor_nome}
                </p>
                <p className="text-gray-600 mt-1">
                  Comissão Total: <span className="font-bold text-green-600">
                    {formatarValor(comissaoSelecionada.valor_comissao)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setShowParcelasModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alterar Número de Parcelas
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={comissaoSelecionada.numero_parcelas}
                  onChange={(e) => handleAtualizarNumeroParcelas(comissaoSelecionada.id, e.target.value)}
                  className="input-field max-w-xs"
                  min="1"
                  max="120"
                />
                <span className="text-gray-600 self-center">
                  Valor por parcela: {formatarValor(comissaoSelecionada.valor_comissao / comissaoSelecionada.numero_parcelas)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Parcela
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Valor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Data Vencimento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Data Pagamento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {comissaoSelecionada.parcelas?.map((parcela) => (
                    <tr key={parcela.id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {parcela.numero_parcela}/{comissaoSelecionada.numero_parcelas}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-semibold">
                          {formatarValor(parcela.valor_parcela)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="date"
                          value={parcela.data_vencimento || ''}
                          onChange={(e) => handleAtualizarParcela(parcela, 'data_vencimento', e.target.value)}
                          className="input-field text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="date"
                          value={parcela.data_pagamento || ''}
                          onChange={(e) => handleAtualizarParcela(parcela, 'data_pagamento', e.target.value)}
                          className="input-field text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={parcela.status}
                          onChange={(e) => handleAtualizarParcela(parcela, 'status', e.target.value)}
                          className="input-field text-sm"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="pago">Pago</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowParcelasModal(false)}
                className="btn-secondary"
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

export default Comissoes;
