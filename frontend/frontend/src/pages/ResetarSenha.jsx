import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';

const ResetarSenha = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [validandoToken, setValidandoToken] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [usuarioNome, setUsuarioNome] = useState('');
  const [senhaAlterada, setSenhaAlterada] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  useEffect(() => {
    verificarToken();
  }, [token]);

  const verificarToken = async () => {
    if (!token) {
      setMensagem({ tipo: 'erro', texto: 'Token não encontrado na URL' });
      setValidandoToken(false);
      return;
    }

    try {
      const response = await axios.get(
        `http://localhost:3001/api/auth/verify-reset-token/${token}`
      );

      if (response.data.valid) {
        setTokenValido(true);
        setUsuarioNome(response.data.nome);
      } else {
        setMensagem({ tipo: 'erro', texto: 'Link inválido ou expirado' });
      }
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      setMensagem({
        tipo: 'erro',
        texto: error.response?.data?.error || 'Link inválido ou expirado'
      });
    } finally {
      setValidandoToken(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    // Validações
    if (!novaSenha || !confirmarSenha) {
      setMensagem({ tipo: 'erro', texto: 'Preencha todos os campos' });
      setLoading(false);
      return;
    }

    if (novaSenha.length < 6) {
      setMensagem({ tipo: 'erro', texto: 'A senha deve ter no mínimo 6 caracteres' });
      setLoading(false);
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setMensagem({ tipo: 'erro', texto: 'As senhas não coincidem' });
      setLoading(false);
      return;
    }

    try {
      await axios.post('http://localhost:3001/api/auth/reset-password', {
        token,
        novaSenha
      });

      setSenhaAlterada(true);
      setMensagem({
        tipo: 'sucesso',
        texto: 'Senha alterada com sucesso!'
      });

      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      setMensagem({
        tipo: 'erro',
        texto: error.response?.data?.error || 'Erro ao alterar senha'
      });
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (validandoToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando link...</p>
        </div>
      </div>
    );
  }

  // Token inválido
  if (!tokenValido) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Inválido</h1>
            <p className="text-gray-600 mb-6">{mensagem.texto}</p>
          </div>

          <div className="space-y-4">
            <Link
              to="/esqueci-senha"
              className="block w-full btn-accent text-center"
            >
              Solicitar Novo Link
            </Link>
            <Link
              to="/login"
              className="block w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Voltar para o Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Formulário de reset
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Criar Nova Senha</h1>
          <p className="text-gray-600">Olá, {usuarioNome}! Escolha sua nova senha.</p>
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

        {!senhaAlterada ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Senha
              </label>
              <div className="relative">
                <input
                  type={mostrarNovaSenha ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={mostrarNovaSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarNovaSenha ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Indicador de força da senha */}
              <PasswordStrengthIndicator password={novaSenha} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <input
                  type={mostrarConfirmarSenha ? "text" : "password"}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Digite a senha novamente"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={mostrarConfirmarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarConfirmarSenha ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Alterando Senha...' : 'Alterar Senha'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-4xl mb-2">✅</div>
              <h3 className="font-semibold text-green-900 mb-2">Senha Alterada!</h3>
              <p className="text-sm text-green-700">
                Sua senha foi alterada com sucesso. Redirecionando para o login...
              </p>
            </div>

            <Link
              to="/login"
              className="block w-full btn-accent text-center"
            >
              Ir para o Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetarSenha;
