import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Logo from '../components/Logo';
import PlanCard from '../components/PlanCard';
import { plansAPI, authAPI, subscriptionAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Multi-step form state
  const [step, setStep] = useState(1); // 1 = Plan selection, 2 = Company info, 3 = User info
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Form data
  const [companyData, setCompanyData] = useState({
    nomeEmpresa: '',
    cnpj: '',
    telefone: '',
  });

  const [userData, setUserData] = useState({
    nome: '',
    email: '',
    celular: '',
    senha: '',
    confirmarSenha: '',
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  // Load plans on mount
  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await plansAPI.listar();
      const activePlans = response.data.data || [];
      setPlans(activePlans);

      // Auto-select "Básico" plan by default
      const basicPlan = activePlans.find(p => p.slug === 'basico');
      if (basicPlan) {
        setSelectedPlan(basicPlan);
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast.error('Erro ao carregar planos disponíveis');
    }
  };

  // Validation functions
  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validateCNPJ = (cnpj) => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return false;

    // Rejeitar CNPJs com todos os dígitos iguais
    if (/^(\d)\1+$/.test(cleaned)) return false;

    // Validação dos dígitos verificadores
    let tamanho = cleaned.length - 2;
    let numeros = cleaned.substring(0, tamanho);
    const digitos = cleaned.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;

    tamanho = tamanho + 1;
    numeros = cleaned.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    return resultado === parseInt(digitos.charAt(1));
  };

  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10;
  };

  const validateStep1 = () => {
    if (!selectedPlan) {
      toast.error('Por favor, selecione um plano');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!companyData.nomeEmpresa || companyData.nomeEmpresa.length < 3) {
      newErrors.nomeEmpresa = 'Nome da empresa deve ter pelo menos 3 caracteres';
    }

    if (!companyData.cnpj) {
      newErrors.cnpj = 'CNPJ é obrigatório';
    } else if (!validateCNPJ(companyData.cnpj)) {
      newErrors.cnpj = 'CNPJ inválido (deve ter 14 dígitos)';
    }

    if (!companyData.telefone) {
      newErrors.telefone = 'Telefone é obrigatório';
    } else if (!validatePhone(companyData.telefone)) {
      newErrors.telefone = 'Telefone inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};

    if (!userData.nome || userData.nome.length < 3) {
      newErrors.nome = 'Nome deve ter pelo menos 3 caracteres';
    }

    if (!userData.email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!validateEmail(userData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!userData.celular) {
      newErrors.celular = 'Celular é obrigatório';
    } else if (!validatePhone(userData.celular)) {
      newErrors.celular = 'Celular inválido';
    }

    if (!userData.senha || userData.senha.length < 6) {
      newErrors.senha = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (userData.senha !== userData.confirmarSenha) {
      newErrors.confirmarSenha = 'As senhas não conferem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  // Máscara de CNPJ: XX.XXX.XXX/XXXX-XX
  const formatCNPJ = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,4})(\d{0,2})$/);
    if (!match) return cleaned;
    return [match[1], match[2], match[3], match[4], match[5]]
      .filter(Boolean)
      .join('')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  // Máscara de telefone: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  const formatPhone = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim().replace(/-$/, '');
    }
    return cleaned.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim().replace(/-$/, '');
  };

  const handleCompanyChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cnpj') {
      formattedValue = formatCNPJ(value);
    } else if (name === 'telefone') {
      formattedValue = formatPhone(value);
    }

    setCompanyData({ ...companyData, [name]: formattedValue });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleUserChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'celular') {
      formattedValue = formatPhone(value);
    }

    setUserData({ ...userData, [name]: formattedValue });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep3()) {
      return;
    }

    setLoading(true);

    try {
      // 1. Register company and admin user
      const registerData = {
        nome: userData.nome,
        email: userData.email,
        celular: userData.celular,
        senha: userData.senha,
        nomeEmpresa: companyData.nomeEmpresa,
        cnpj: companyData.cnpj,
        telefone: companyData.telefone,
      };

      const registerResponse = await authAPI.register(registerData);

      if (!registerResponse.data || !registerResponse.data.token) {
        throw new Error('Erro ao criar conta');
      }

      // 2. Login automatically
      const loginResult = await login({
        email: userData.email,
        senha: userData.senha,
      });

      if (!loginResult.success) {
        throw new Error('Erro ao fazer login automático');
      }

      // 3. Create trial subscription
      try {
        await subscriptionAPI.createTrial();
        toast.success('Conta criada com sucesso! Seu trial de 14 dias começou!');
      } catch (trialError) {
        console.error('Erro ao criar trial:', trialError);
        toast.success('Conta criada com sucesso!');
        toast.error('Não foi possível iniciar o trial. Entre em contato com o suporte.', { duration: 5000 });
      }

      // 4. Redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Erro no cadastro:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao criar conta';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => {
    const progress = (step / 3) * 100;
    return (
      <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
        <div
          className="bg-primary-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  };

  const renderStep1 = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        Escolha seu plano
      </h2>
      <p className="text-gray-600 text-center mb-8">
        Todos os planos incluem 14 dias de teste grátis
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isSelected={selectedPlan?.id === plan.id}
            onSelect={() => setSelectedPlan(plan)}
            isPopular={plan.slug === 'profissional'}
          />
        ))}
      </div>

      {plans.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          Carregando planos...
        </div>
      )}

      <button
        onClick={handleNext}
        disabled={!selectedPlan}
        className="w-full bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition-colors font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continuar
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        Dados da empresa
      </h2>
      <p className="text-gray-600 text-center mb-8">
        Informe os dados da sua empresa
      </p>

      <form className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome da Empresa *
          </label>
          <input
            type="text"
            name="nomeEmpresa"
            value={companyData.nomeEmpresa}
            onChange={handleCompanyChange}
            className={`input-field ${errors.nomeEmpresa ? 'border-red-500' : ''}`}
            placeholder="Minha Empresa LTDA"
          />
          {errors.nomeEmpresa && (
            <p className="mt-1 text-sm text-red-600">{errors.nomeEmpresa}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CNPJ *
          </label>
          <input
            type="text"
            name="cnpj"
            value={companyData.cnpj}
            onChange={handleCompanyChange}
            className={`input-field ${errors.cnpj ? 'border-red-500' : ''}`}
            placeholder="00.000.000/0000-00"
            maxLength="18"
          />
          {errors.cnpj && (
            <p className="mt-1 text-sm text-red-600">{errors.cnpj}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefone da Empresa *
          </label>
          <input
            type="tel"
            name="telefone"
            value={companyData.telefone}
            onChange={handleCompanyChange}
            className={`input-field ${errors.telefone ? 'border-red-500' : ''}`}
            placeholder="(00) 0000-0000"
          />
          {errors.telefone && (
            <p className="mt-1 text-sm text-red-600">{errors.telefone}</p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg transition-colors font-semibold"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition-colors font-semibold shadow-md hover:shadow-lg"
          >
            Continuar
          </button>
        </div>
      </form>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        Seus dados
      </h2>
      <p className="text-gray-600 text-center mb-8">
        Crie sua conta de administrador
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome completo *
          </label>
          <input
            type="text"
            name="nome"
            value={userData.nome}
            onChange={handleUserChange}
            className={`input-field ${errors.nome ? 'border-red-500' : ''}`}
            placeholder="Seu nome completo"
          />
          {errors.nome && (
            <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={userData.email}
            onChange={handleUserChange}
            className={`input-field ${errors.email ? 'border-red-500' : ''}`}
            placeholder="seu@email.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Celular *
          </label>
          <input
            type="tel"
            name="celular"
            value={userData.celular}
            onChange={handleUserChange}
            className={`input-field ${errors.celular ? 'border-red-500' : ''}`}
            placeholder="(00) 00000-0000"
          />
          {errors.celular && (
            <p className="mt-1 text-sm text-red-600">{errors.celular}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Senha *
          </label>
          <input
            type="password"
            name="senha"
            value={userData.senha}
            onChange={handleUserChange}
            className={`input-field ${errors.senha ? 'border-red-500' : ''}`}
            placeholder="Mínimo 6 caracteres"
          />
          {errors.senha && (
            <p className="mt-1 text-sm text-red-600">{errors.senha}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirmar senha *
          </label>
          <input
            type="password"
            name="confirmarSenha"
            value={userData.confirmarSenha}
            onChange={handleUserChange}
            className={`input-field ${errors.confirmarSenha ? 'border-red-500' : ''}`}
            placeholder="Confirme sua senha"
          />
          {errors.confirmarSenha && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmarSenha}</p>
          )}
        </div>

        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-primary-900 font-semibold">
                14 dias de teste grátis
              </p>
              <p className="text-sm text-primary-700 mt-1">
                Você não será cobrado durante o período de teste. Cancele a qualquer momento.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={loading}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg transition-colors font-semibold disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition-colors font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Criando conta...' : 'Criar conta grátis'}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-8">
        <div className="flex flex-col items-center mb-8">
          <Logo className="w-16 h-16 mb-4" showText={false} />
          <h1 className="text-3xl font-bold text-gray-900 mb-2 font-['Poppins']">
            CFLOW Gestor de Consórcio
          </h1>
          <p className="text-gray-600">Comece seu teste grátis de 14 dias</p>
        </div>

        {renderProgressBar()}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
              Fazer login
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-600">
            Ao criar uma conta, você concorda com nossos{' '}
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

export default Signup;
