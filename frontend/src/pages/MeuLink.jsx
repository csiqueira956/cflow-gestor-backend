import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import axios from 'axios';

const MeuLink = () => {
  const { usuario } = useAuth();
  const [linkPublico, setLinkPublico] = useState('');
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [estatisticas, setEstatisticas] = useState({ total: 0 });

  useEffect(() => {
    carregarLink();
    carregarEstatisticas();
  }, []);

  const carregarLink = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLinkPublico(response.data.link_publico);
    } catch (error) {
      console.error('Erro ao carregar link:', error);
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar seu link público' });
    } finally {
      setLoading(false);
    }
  };

  const carregarEstatisticas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/clientes/estatisticas', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEstatisticas({ total: response.data.total || 0 });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const copiarLink = () => {
    const link = `${window.location.origin}/cadastro/${linkPublico}`;
    navigator.clipboard.writeText(link);
    setMensagem({ tipo: 'sucesso', texto: 'Link copiado para a área de transferência!' });
    setTimeout(() => setMensagem({ tipo: '', texto: '' }), 3000);
  };

  const linkCompleto = linkPublico ? `${window.location.origin}/cadastro/${linkPublico}` : '';

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Meu Link Público</h1>
          <p className="text-gray-600 mt-1">
            Compartilhe este link com seus clientes para que eles se cadastrem
          </p>
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

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-600">Carregando...</div>
          </div>
        ) : (
          <>
            {/* Card Principal - Seu Link */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl shadow-xl p-8 text-white mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Seu Link Único</h2>
                  <p className="text-primary-100">Compartilhe com seus clientes</p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur rounded-lg p-4 mb-4">
                <p className="text-xs text-primary-100 mb-2">Seu link público:</p>
                <p className="font-mono text-sm sm:text-base break-all">{linkCompleto}</p>
              </div>

              <button
                onClick={copiarLink}
                className="w-full bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar Link
              </button>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total de Clientes</p>
                    <p className="text-3xl font-bold text-gray-900">{estatisticas.total}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Cadastrados por Link</p>
                    <p className="text-3xl font-bold text-gray-900">{estatisticas.total}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Link Ativo</p>
                    <p className="text-3xl font-bold text-green-600">●</p>
                    <p className="text-xs text-gray-500 mt-1">Funcionando</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Instruções */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Como usar seu link:
              </h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Copie seu link</p>
                    <p className="text-sm text-gray-600">Use o botão acima para copiar seu link único</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Compartilhe</p>
                    <p className="text-sm text-gray-600">Envie por WhatsApp, email, redes sociais ou SMS</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Receba cadastros</p>
                    <p className="text-sm text-gray-600">Todos os clientes que se cadastrarem serão automaticamente associados a você</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default MeuLink;
