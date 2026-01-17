import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

const Login = () => {
  const [searchParams] = useSearchParams();
  const conviteId = searchParams.get('convite');
  const modoRegistro = !!conviteId;

  const [formData, setFormData] = useState({
    email: '',
    senha: '',
    nome: '',
    celular: '',
    confirmarSenha: '',
  });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [lembrarEmail, setLembrarEmail] = useState(false);
  const [errosValidacao, setErrosValidacao] = useState({
    email: '',
    senha: '',
    nome: '',
    celular: '',
    confirmarSenha: '',
  });
  const [camposTocados, setCamposTocados] = useState({
    email: false,
    senha: false,
    nome: false,
    celular: false,
    confirmarSenha: false,
  });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Carregar email salvo ao montar o componente
  useEffect(() => {
    if (!modoRegistro) {
      const emailSalvo = localStorage.getItem('emailLembrado');
      if (emailSalvo) {
        setFormData(prev => ({ ...prev, email: emailSalvo }));
        setLembrarEmail(true);
      }
    }
  }, [modoRegistro]);

  // Validar email
  const validarEmail = (email) => {
    if (!email) return 'Email é obrigatório';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Email inválido';
    return '';
  };

  // Validar senha
  const validarSenha = (senha) => {
    if (!senha) return 'Senha é obrigatória';
    if (senha.length < 6) return 'Senha deve ter no mínimo 6 caracteres';
    return '';
  };

  // Validar nome
  const validarNome = (nome) => {
    if (!nome) return 'Nome é obrigatório';
    if (nome.length < 3) return 'Nome deve ter no mínimo 3 caracteres';
    return '';
  };

  // Validar celular
  const validarCelular = (celular) => {
    if (!celular) return 'Celular é obrigatório';
    const celularLimpo = celular.replace(/\D/g, '');
    if (celularLimpo.length < 10) return 'Celular inválido';
    return '';
  };

  // Validar confirmação de senha
  const validarConfirmarSenha = (confirmarSenha) => {
    if (!confirmarSenha) return 'Confirme sua senha';
    if (confirmarSenha !== formData.senha) return 'As senhas não conferem';
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Validar em tempo real apenas se o campo foi tocado
    if (camposTocados[name]) {
      let erroValidacao = '';
      if (name === 'email') {
        erroValidacao = validarEmail(value);
      } else if (name === 'senha') {
        erroValidacao = validarSenha(value);
      } else if (name === 'nome') {
        erroValidacao = validarNome(value);
      } else if (name === 'celular') {
        erroValidacao = validarCelular(value);
      } else if (name === 'confirmarSenha') {
        erroValidacao = validarConfirmarSenha(value);
      }
      setErrosValidacao(prev => ({
        ...prev,
        [name]: erroValidacao,
      }));
    }

    // Se estamos editando a senha, revalidar a confirmação de senha também
    if (name === 'senha' && camposTocados.confirmarSenha && formData.confirmarSenha) {
      const erroConfirmacao = validarConfirmarSenha(formData.confirmarSenha);
      setErrosValidacao(prev => ({
        ...prev,
        confirmarSenha: erroConfirmacao,
      }));
    }

    setErro('');
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setCamposTocados(prev => ({
      ...prev,
      [name]: true,
    }));

    // Validar ao sair do campo
    let erroValidacao = '';
    if (name === 'email') {
      erroValidacao = validarEmail(value);
    } else if (name === 'senha') {
      erroValidacao = validarSenha(value);
    } else if (name === 'nome') {
      erroValidacao = validarNome(value);
    } else if (name === 'celular') {
      erroValidacao = validarCelular(value);
    } else if (name === 'confirmarSenha') {
      erroValidacao = validarConfirmarSenha(value);
    }
    setErrosValidacao(prev => ({
      ...prev,
      [name]: erroValidacao,
    }));
  };

  const handleRegistro = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/vendedores/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formData.nome,
          email: formData.email,
          celular: formData.celular,
          senha: formData.senha,
          convite_id: conviteId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar cadastro');
      }

      toast.success('Cadastro realizado com sucesso! Faça login para continuar.');

      // Redirecionar para login sem o parâmetro convite
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    if (modoRegistro) {
      // Validação para registro
      setCamposTocados({
        nome: true,
        email: true,
        celular: true,
        senha: true,
        confirmarSenha: true,
      });

      const erroNome = validarNome(formData.nome);
      const erroEmail = validarEmail(formData.email);
      const erroCelular = validarCelular(formData.celular);
      const erroSenha = validarSenha(formData.senha);
      const erroConfirmarSenha = validarConfirmarSenha(formData.confirmarSenha);

      if (erroNome || erroEmail || erroCelular || erroSenha || erroConfirmarSenha) {
        setErrosValidacao({
          nome: erroNome,
          email: erroEmail,
          celular: erroCelular,
          senha: erroSenha,
          confirmarSenha: erroConfirmarSenha,
        });
        toast.error('Por favor, corrija os erros no formulário');
        setLoading(false);
        return;
      }

      try {
        await handleRegistro();
      } catch (error) {
        toast.error(error.message || 'Erro ao realizar cadastro. Tente novamente.');
        setErro(error.message || 'Erro ao realizar cadastro. Tente novamente.');
      } finally {
        setLoading(false);
      }
    } else {
      // Validação para login
      setCamposTocados({
        email: true,
        senha: true,
      });

      const erroEmail = validarEmail(formData.email);
      const erroSenha = validarSenha(formData.senha);

      if (erroEmail || erroSenha) {
        setErrosValidacao({
          email: erroEmail,
          senha: erroSenha,
        });
        toast.error('Por favor, corrija os erros no formulário');
        setLoading(false);
        return;
      }

      try {
        const result = await login(formData);

        if (result.success) {
          // Salvar ou remover email do localStorage
          if (lembrarEmail) {
            localStorage.setItem('emailLembrado', formData.email);
          } else {
            localStorage.removeItem('emailLembrado');
          }

          toast.success('Login realizado com sucesso!');

          // Verificar role do usuário para redirecionamento correto
          const usuarioLogado = JSON.parse(localStorage.getItem('usuario'));
          if (usuarioLogado?.role === 'super_admin') {
            navigate('/super-admin');
          } else {
            navigate('/dashboard');
          }
        } else {
          toast.error(result.error);
          setErro(result.error);
        }
      } catch (error) {
        toast.error('Erro ao fazer login. Tente novamente.');
        setErro('Erro ao fazer login. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLembrarEmailChange = (e) => {
    const checked = e.target.checked;
    setLembrarEmail(checked);

    // Se desmarcar, remover imediatamente do localStorage
    if (!checked) {
      localStorage.removeItem('emailLembrado');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo e título */}
        <div className="flex flex-col items-center mb-8">
          <Logo className="w-16 h-16 mb-4" showText={false} />
          <h1 className="text-3xl font-bold text-gray-900 mb-2 font-['Poppins']">
            Cflow CRM
          </h1>
          <p className="text-gray-600">
            {modoRegistro ? 'Complete seu cadastro para começar' : 'Faça login para continuar'}
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome (apenas no modo registro) */}
          {modoRegistro && (
            <div>
              <label
                htmlFor="nome"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nome completo
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`input-field ${errosValidacao.nome && camposTocados.nome ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                placeholder="Seu nome completo"
              />
              {errosValidacao.nome && camposTocados.nome && (
                <p className="mt-1 text-sm text-red-600">{errosValidacao.nome}</p>
              )}
            </div>
          )}

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              E-mail
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`input-field ${errosValidacao.email && camposTocados.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
              placeholder="seu@email.com"
            />
            {errosValidacao.email && camposTocados.email && (
              <p className="mt-1 text-sm text-red-600">{errosValidacao.email}</p>
            )}
          </div>

          {/* Celular (apenas no modo registro) */}
          {modoRegistro && (
            <div>
              <label
                htmlFor="celular"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Celular
              </label>
              <input
                type="tel"
                id="celular"
                name="celular"
                value={formData.celular}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`input-field ${errosValidacao.celular && camposTocados.celular ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                placeholder="(00) 00000-0000"
              />
              {errosValidacao.celular && camposTocados.celular && (
                <p className="mt-1 text-sm text-red-600">{errosValidacao.celular}</p>
              )}
            </div>
          )}

          {/* Senha */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="senha"
                className="block text-sm font-medium text-gray-700"
              >
                Senha
              </label>
              {!modoRegistro && (
                <Link
                  to="/esqueci-senha"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Esqueci minha senha
                </Link>
              )}
            </div>
            <div className="relative">
              <input
                type={mostrarSenha ? "text" : "password"}
                id="senha"
                name="senha"
                value={formData.senha}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`input-field pr-10 ${errosValidacao.senha && camposTocados.senha ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? (
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
            {errosValidacao.senha && camposTocados.senha && (
              <p className="mt-1 text-sm text-red-600">{errosValidacao.senha}</p>
            )}
          </div>

          {/* Confirmar Senha (apenas no modo registro) */}
          {modoRegistro && (
            <div>
              <label
                htmlFor="confirmarSenha"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  type={mostrarConfirmarSenha ? "text" : "password"}
                  id="confirmarSenha"
                  name="confirmarSenha"
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input-field pr-10 ${errosValidacao.confirmarSenha && camposTocados.confirmarSenha ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="••••••••"
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
              {errosValidacao.confirmarSenha && camposTocados.confirmarSenha && (
                <p className="mt-1 text-sm text-red-600">{errosValidacao.confirmarSenha}</p>
              )}
            </div>
          )}

          {/* Lembrar email */}
          {!modoRegistro && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="lembrarEmail"
                checked={lembrarEmail}
                onChange={handleLembrarEmailChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
              />
              <label
                htmlFor="lembrarEmail"
                className="ml-2 block text-sm text-gray-700 cursor-pointer select-none"
              >
                Lembrar meu email
              </label>
            </div>
          )}

          {/* Mensagem de erro */}
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {erro}
            </div>
          )}

          {/* Botão de login/registro */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition-colors font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? (modoRegistro ? 'Cadastrando...' : 'Entrando...')
              : (modoRegistro ? 'Completar Cadastro' : 'Entrar')
            }
          </button>
        </form>

        {/* Link para cadastro */}
        {!modoRegistro && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Não tem uma conta?{' '}
              <Link to="/cadastro" className="text-primary-600 hover:text-primary-700 font-semibold">
                Criar conta grátis
              </Link>
            </p>
          </div>
        )}

        {/* Links legais */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-600">
            Ao usar este sistema, você concorda com nossos{' '}
            <Link to="/termos-de-uso" className="text-primary-600 hover:text-primary-700 underline">
              Termos de Uso
            </Link>{' '}
            e{' '}
            <Link to="/politica-privacidade" className="text-primary-600 hover:text-primary-700 underline">
              Política de Privacidade
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
