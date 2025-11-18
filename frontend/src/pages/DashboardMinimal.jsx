import { useState, useEffect } from 'react';
import { dashboardAPI } from '../api/api';

const DashboardMinimal = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await dashboardAPI.estatisticas();
      console.log('DATA:', res.data);
      setData(res.data);
    } catch (err) {
      console.error('ERROR:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600 text-lg">Erro: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Sem dados</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard - Metas e KPIs</h1>

        {/* Meta Geral */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Meta Geral</h2>
          <p className="text-3xl font-bold text-gray-900">
            R$ {data.meta_geral?.toLocaleString('pt-BR')}
          </p>
          <p className="text-gray-600 mt-2">
            Percentual Atingido: <span className="font-semibold">{data.percentual_atingido_geral}%</span>
          </p>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Taxa de Fechamento</h3>
            <p className="text-3xl font-bold text-blue-600">
              {data.taxa_conversao?.fechamento}%
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Ticket Médio</h3>
            <p className="text-3xl font-bold text-purple-600">
              R$ {data.ticket_medio?.toFixed(0)}
            </p>
          </div>

          <div className="bg-orange-50 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Pipeline Total</h3>
            <p className="text-3xl font-bold text-orange-600">
              R$ {data.pipeline_value?.total?.toFixed(0)}
            </p>
          </div>

          <div className="bg-red-50 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Taxa de Perda</h3>
            <p className="text-3xl font-bold text-red-600">
              {data.taxa_conversao?.perda}%
            </p>
          </div>
        </div>

        {/* Ranking de Vendedores */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">🏆 Top Vendedores</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Vendas</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.ranking_vendedores?.map((v, i) => (
                  <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.nome}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-700">{v.total_vendas}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      R$ {v.total_valor?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardMinimal;
