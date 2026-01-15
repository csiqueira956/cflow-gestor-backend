import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const AtivarConta = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const token = searchParams.get('token');

  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  // Validação de senha em tempo real
  const [validacaoSenha, setValidacaoSenha] = useState({
    minimo6: false,
    temNumero: false,
    temMaiuscula: false,
    senhasIguais: false
  });

  useEffect(() => {
    if (!token) {
      setErro('Token de ativação não encontrado. Verifique o link recebido por email.');
    }
  }, [token]);

  useEffect(() => {
    setValidacaoSenha({
      minimo6: senha.length >= 6,
      temNumero: /\d/.test(senha),
      temMaiuscula: /[A-Z]/.test(senha),
      senhasIguais: senha === confirmarSenha && senha.length > 0
    });
  }, [senha, confirmarSenha]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    // Validações
    if (!token) {
      setErro('Token inválido');
      return;
    }

    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem');
      return;
    }

    try {
      setCarregando(true);

      // Chamar API de ativação
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/activate-account`,
        {
          token,
          senha
        }
      );

      if (response.data.success) {
        setSucesso(true);

        // Login automático com o token JWT retornado
        if (response.data.token && response.data.usuario) {
          localStorage.setItem('token', response.data.token);

          // Aguardar 2 segundos e redirecionar
          setTimeout(() => {
            window.location.href = '/'; // Força reload completo para carregar contexto
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Erro ao ativar conta:', error);
      setErro(
        error.response?.data?.error ||
        'Erro ao ativar conta. O link pode estar expirado ou já ter sido usado.'
      );
    } finally {
      setCarregando(false);
    }
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Conta Ativada com Sucesso!
          </h2>
          <p className="text-gray-600 mb-6">
            Sua conta foi ativada e você está sendo redirecionado para o painel...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cflow <span className="text-xl">CRM</span></h1>
          <p className="text-gray-600 mt-2">Ative sua conta trial de 14 dias</p>
        </div>

        {/* Mensagem de erro global */}
        {erro && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{erro}</p>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-2">
              Nova Senha
            </label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite sua senha"
              required
              disabled={!token || carregando}
            />
          </div>

          <div>
            <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Senha
            </label>
            <input
              id="confirmarSenha"
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite sua senha novamente"
              required
              disabled={!token || carregando}
            />
          </div>

          {/* Indicadores de validação */}
          {senha.length > 0 && (
            <div className="space-y-2 text-sm">
              <div className={`flex items-center ${validacaoSenha.minimo6 ? 'text-green-600' : 'text-gray-400'}`}>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Mínimo 6 caracteres
              </div>
              <div className={`flex items-center ${validacaoSenha.temNumero ? 'text-green-600' : 'text-gray-400'}`}>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Pelo menos um número
              </div>
              <div className={`flex items-center ${validacaoSenha.temMaiuscula ? 'text-green-600' : 'text-gray-400'}`}>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Pelo menos uma letra maiúscula
              </div>
              {confirmarSenha.length > 0 && (
                <div className={`flex items-center ${validacaoSenha.senhasIguais ? 'text-green-600' : 'text-red-600'}`}>
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {validacaoSenha.senhasIguais ? 'Senhas coincidem' : 'Senhas não coincidem'}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={
              !token ||
              carregando ||
              !validacaoSenha.minimo6 ||
              !validacaoSenha.senhasIguais
            }
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {carregando ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Ativando...
              </span>
            ) : (
              'Ativar Conta e Entrar'
            )}
          </button>
        </form>

        {/* Trial info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800 text-center">
            <strong>Trial gratuito de 14 dias</strong>
            <br />
            Sem cartão de crédito. Cancele a qualquer momento.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AtivarConta;
