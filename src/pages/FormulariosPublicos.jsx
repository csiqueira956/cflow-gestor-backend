import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import axios from 'axios';

const FormulariosPublicos = () => {
  const { usuario } = useAuth();
  const [formularios, setFormularios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [novoFormulario, setNovoFormulario] = useState({
    titulo: '',
    descricao: '',
    expires_at: ''
  });
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    carregarFormularios();
  }, []);

  const carregarFormularios = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/formularios', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormularios(response.data.formularios || response.data);
    } catch (error) {
      console.error('Erro ao carregar formulários:', error);
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar formulários' });
    } finally {
      setLoading(false);
    }
  };

  const criarFormulario = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const dados = {
        ...novoFormulario,
        expires_at: novoFormulario.expires_at || null
      };

      await axios.post('http://localhost:3001/api/formularios', dados, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMensagem({ tipo: 'sucesso', texto: 'Formulário criado com sucesso!' });
      setMostrarModal(false);
      setNovoFormulario({ titulo: '', descricao: '', expires_at: '' });
      carregarFormularios();
    } catch (error) {
      console.error('Erro ao criar formulário:', error);
      setMensagem({ tipo: 'erro', texto: 'Erro ao criar formulário' });
    }
  };

  const copiarLink = (token) => {
    const link = `${window.location.origin}/formulario/${token}`;
    navigator.clipboard.writeText(link);
    setMensagem({ tipo: 'sucesso', texto: 'Link copiado para a área de transferência!' });
    setTimeout(() => setMensagem({ tipo: '', texto: '' }), 3000);
  };

  const toggleAtivo = async (id, ativoAtual) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:3001/api/formularios/${id}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMensagem({
        tipo: 'sucesso',
        texto: `Formulário ${!ativoAtual ? 'ativado' : 'desativado'} com sucesso!`
      });
      carregarFormularios();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 3000);
    } catch (error) {
      console.error('Erro ao atualizar formulário:', error);
      setMensagem({ tipo: 'erro', texto: 'Erro ao atualizar formulário' });
    }
  };

  const deletarFormulario = async (id) => {
    if (!window.confirm('Deseja realmente excluir este formulário?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3001/api/formularios/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMensagem({ tipo: 'sucesso', texto: 'Formulário excluído com sucesso!' });
      carregarFormularios();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 3000);
    } catch (error) {
      console.error('Erro ao excluir formulário:', error);
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir formulário' });
    }
  };

  const formatarData = (data) => {
    if (!data) return 'Sem data de expiração';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Formulários Públicos</h1>
          <p className="text-gray-600 mt-1">
            Crie links de formulário para compartilhar com seus clientes
          </p>
        </div>
        <button
          onClick={() => setMostrarModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
        >
          + Novo Formulário
        </button>
      </div>

      {/* Mensagens */}
      {mensagem.texto && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            mensagem.tipo === 'sucesso'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      {/* Lista de Formulários */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-600">Carregando...</div>
        </div>
      ) : formularios.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhum formulário criado
          </h3>
          <p className="text-gray-600 mb-4">
            Crie seu primeiro formulário público para começar a receber cadastros
          </p>
          <button
            onClick={() => setMostrarModal(true)}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Criar Formulário
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {formularios.map((form) => (
            <div
              key={form.id}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                form.ativo ? 'border-green-500' : 'border-gray-400'
              }`}
            >
              {/* Cabeçalho do Card */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {form.titulo || 'Cadastro de Cliente'}
                  </h3>
                  <span
                    className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                      form.ativo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {form.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>

              {/* Descrição */}
              {form.descricao && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {form.descricao}
                </p>
              )}

              {/* Estatísticas */}
              <div className="mb-4 space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <span className="font-medium mr-2">Preenchimentos:</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                    {form.total_preenchimentos}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Criado em:</span>{' '}
                  {formatarData(form.created_at)}
                </div>
                {form.expires_at && (
                  <div>
                    <span className="font-medium">Expira em:</span>{' '}
                    {formatarData(form.expires_at)}
                  </div>
                )}
              </div>

              {/* Link do Formulário */}
              <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Link do formulário:</p>
                <p className="text-xs text-gray-700 font-mono break-all">
                  {window.location.origin}/formulario/{form.token}
                </p>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2">
                <button
                  onClick={() => copiarLink(form.token)}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Copiar Link
                </button>
                <button
                  onClick={() => toggleAtivo(form.id, form.ativo)}
                  className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                    form.ativo
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                  title={form.ativo ? 'Desativar' : 'Ativar'}
                >
                  {form.ativo ? '⏸' : '▶'}
                </button>
                <button
                  onClick={() => deletarFormulario(form.id)}
                  className="px-4 py-2 rounded text-sm font-semibold bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                  title="Excluir"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Novo Formulário Público
            </h2>
            <form onSubmit={criarFormulario}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título (opcional)
                </label>
                <input
                  type="text"
                  value={novoFormulario.titulo}
                  onChange={(e) =>
                    setNovoFormulario({ ...novoFormulario, titulo: e.target.value })
                  }
                  placeholder="Ex: Cadastro de Cliente - Consórcio Honda"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  value={novoFormulario.descricao}
                  onChange={(e) =>
                    setNovoFormulario({ ...novoFormulario, descricao: e.target.value })
                  }
                  placeholder="Informações adicionais sobre o formulário..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Expiração (opcional)
                </label>
                <input
                  type="date"
                  value={novoFormulario.expires_at}
                  onChange={(e) =>
                    setNovoFormulario({ ...novoFormulario, expires_at: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarModal(false);
                    setNovoFormulario({ titulo: '', descricao: '', expires_at: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                >
                  Criar Formulário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default FormulariosPublicos;
