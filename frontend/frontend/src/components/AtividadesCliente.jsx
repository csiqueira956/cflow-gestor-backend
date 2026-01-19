import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { atividadesAPI } from '../api/api';

const AtividadesCliente = ({ clienteId, clienteNome }) => {
  const [atividades, setAtividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [novaAtividade, setNovaAtividade] = useState({
    tipo: 'ligacao',
    titulo: '',
    descricao: '',
    resultado: 'pendente',
    proximo_followup: '',
  });

  const tiposAtividade = [
    { id: 'ligacao', nome: 'Ligacao', icon: '📞', cor: 'bg-blue-100 text-blue-800' },
    { id: 'whatsapp', nome: 'WhatsApp', icon: '💬', cor: 'bg-green-100 text-green-800' },
    { id: 'email', nome: 'Email', icon: '📧', cor: 'bg-purple-100 text-purple-800' },
    { id: 'visita', nome: 'Visita', icon: '🏠', cor: 'bg-orange-100 text-orange-800' },
    { id: 'reuniao', nome: 'Reuniao', icon: '👥', cor: 'bg-indigo-100 text-indigo-800' },
    { id: 'proposta', nome: 'Proposta', icon: '📄', cor: 'bg-yellow-100 text-yellow-800' },
    { id: 'outro', nome: 'Outro', icon: '📌', cor: 'bg-gray-100 text-gray-800' },
  ];

  const resultadosAtividade = [
    { id: 'pendente', nome: 'Pendente', cor: 'bg-gray-100 text-gray-700' },
    { id: 'sucesso', nome: 'Sucesso', cor: 'bg-green-100 text-green-700' },
    { id: 'sem_resposta', nome: 'Sem Resposta', cor: 'bg-yellow-100 text-yellow-700' },
    { id: 'reagendar', nome: 'Reagendar', cor: 'bg-blue-100 text-blue-700' },
    { id: 'interessado', nome: 'Interessado', cor: 'bg-emerald-100 text-emerald-700' },
    { id: 'nao_interessado', nome: 'Nao Interessado', cor: 'bg-red-100 text-red-700' },
  ];

  useEffect(() => {
    carregarAtividades();
  }, [clienteId]);

  const carregarAtividades = async () => {
    try {
      setLoading(true);
      const response = await atividadesAPI.listar(clienteId);
      setAtividades(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      // Não mostrar erro se a tabela não existir ainda
      if (!error.response?.data?.message?.includes('does not exist')) {
        toast.error('Erro ao carregar atividades');
      }
      setAtividades([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!novaAtividade.titulo.trim()) {
      toast.error('Informe o titulo da atividade');
      return;
    }

    try {
      setSalvando(true);
      await atividadesAPI.criar(clienteId, {
        ...novaAtividade,
        proximo_followup: novaAtividade.proximo_followup || null,
      });
      toast.success('Atividade registrada!');
      setShowForm(false);
      setNovaAtividade({
        tipo: 'ligacao',
        titulo: '',
        descricao: '',
        resultado: 'pendente',
        proximo_followup: '',
      });
      carregarAtividades();
    } catch (error) {
      console.error('Erro ao criar atividade:', error);
      toast.error('Erro ao registrar atividade');
    } finally {
      setSalvando(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja excluir esta atividade?')) return;

    try {
      await atividadesAPI.deletar(id);
      toast.success('Atividade excluida');
      carregarAtividades();
    } catch (error) {
      console.error('Erro ao excluir atividade:', error);
      toast.error('Erro ao excluir atividade');
    }
  };

  const formatarData = (data) => {
    if (!data) return '';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatarDataRelativa = (data) => {
    if (!data) return '';
    const d = new Date(data);
    const now = new Date();
    const diff = now - d;
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (dias === 0) return 'Hoje';
    if (dias === 1) return 'Ontem';
    if (dias < 7) return `${dias} dias atras`;
    if (dias < 30) return `${Math.floor(dias / 7)} semanas atras`;
    return formatarData(data);
  };

  const getTipoInfo = (tipo) => {
    return tiposAtividade.find((t) => t.id === tipo) || tiposAtividade[6];
  };

  const getResultadoInfo = (resultado) => {
    return resultadosAtividade.find((r) => r.id === resultado) || resultadosAtividade[0];
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="font-semibold text-gray-900">Historico de Atividades</h3>
          <span className="text-sm text-gray-500">({atividades.length})</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Follow-up
        </button>
      </div>

      {/* Formulário de nova atividade */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Contato</label>
              <div className="flex flex-wrap gap-2">
                {tiposAtividade.map((tipo) => (
                  <button
                    key={tipo.id}
                    type="button"
                    onClick={() => setNovaAtividade({ ...novaAtividade, tipo: tipo.id })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      novaAtividade.tipo === tipo.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tipo.icon} {tipo.nome}
                  </button>
                ))}
              </div>
            </div>

            {/* Resultado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
              <select
                value={novaAtividade.resultado}
                onChange={(e) => setNovaAtividade({ ...novaAtividade, resultado: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {resultadosAtividade.map((res) => (
                  <option key={res.id} value={res.id}>
                    {res.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Título */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titulo *</label>
              <input
                type="text"
                value={novaAtividade.titulo}
                onChange={(e) => setNovaAtividade({ ...novaAtividade, titulo: e.target.value })}
                placeholder="Ex: Ligacao para apresentar proposta"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            {/* Descrição */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
              <textarea
                value={novaAtividade.descricao}
                onChange={(e) => setNovaAtividade({ ...novaAtividade, descricao: e.target.value })}
                placeholder="Detalhes da conversa, proximos passos..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Próximo follow-up */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agendar Proximo Follow-up</label>
              <input
                type="datetime-local"
                value={novaAtividade.proximo_followup}
                onChange={(e) => setNovaAtividade({ ...novaAtividade, proximo_followup: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Registrar Atividade'}
            </button>
          </div>
        </form>
      )}

      {/* Lista de atividades */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : atividades.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>Nenhuma atividade registrada</p>
            <p className="text-sm">Clique em "Novo Follow-up" para adicionar</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {atividades.map((atividade) => {
              const tipoInfo = getTipoInfo(atividade.tipo);
              const resultadoInfo = getResultadoInfo(atividade.resultado);

              return (
                <div key={atividade.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Ícone do tipo */}
                    <div className={`p-2 rounded-lg ${tipoInfo.cor}`}>
                      <span className="text-lg">{tipoInfo.icon}</span>
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{atividade.titulo}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${resultadoInfo.cor}`}>
                          {resultadoInfo.nome}
                        </span>
                      </div>

                      {atividade.descricao && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{atividade.descricao}</p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatarDataRelativa(atividade.data_atividade)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {atividade.usuario_nome}
                        </span>
                        {atividade.proximo_followup && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Proximo: {formatarData(atividade.proximo_followup)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <button
                      onClick={() => handleDelete(atividade.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Excluir"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AtividadesCliente;
