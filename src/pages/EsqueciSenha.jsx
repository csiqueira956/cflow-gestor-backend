import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const EsqueciSenha = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [emailEnviado, setEmailEnviado] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    if (!email) {
      setMensagem({ tipo: 'erro', texto: 'Por favor, digite seu e-mail' });
      setLoading(false);
      return;
    }

    try {
      await axios.post('http://localhost:3001/api/auth/forgot-password', { email });

      setEmailEnviado(true);
      setMensagem({
        tipo: 'sucesso',
        texto: 'Se o e-mail existir em nossa base, você receberá instruções de recuperação.'
      });
    } catch (error) {
      console.error('Erro ao solicitar recuperação:', error);
      setMensagem({
        tipo: 'erro',
        texto: error.response?.data?.error || 'Erro ao processar solicitação'
      });
    } finally {
      setLoading(false);
    }
  };

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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Esqueceu sua senha?</h1>
          <p className="text-gray-600">
            Sem problemas! Digite seu e-mail e enviaremos instruções para recuperá-la.
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

        {!emailEnviado ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="seu@email.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Voltar para o Login
              </Link>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📧 Verifique seu e-mail</h3>
              <p className="text-sm text-blue-700">
                Se o e-mail <strong>{email}</strong> estiver cadastrado em nossa base, você
                receberá um link para redefinir sua senha.
              </p>
              <p className="text-sm text-blue-600 mt-2">
                Não se esqueça de verificar sua caixa de spam!
              </p>
            </div>

            <div className="text-center space-y-4">
              <button
                onClick={() => {
                  setEmailEnviado(false);
                  setEmail('');
                  setMensagem({ tipo: '', texto: '' });
                }}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                Tentar outro e-mail
              </button>

              <div>
                <Link
                  to="/login"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  ← Voltar para o Login
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EsqueciSenha;
