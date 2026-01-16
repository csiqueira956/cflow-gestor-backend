import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { clientesAPI } from '../api/api';

const CadastroCliente = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    valor_carta: '',
    administradora: '',
    grupo: '',
    cota: '',
    observacao: '',
  });
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Sincronizar com mudanças no localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebarExpanded');
      setIsExpanded(saved !== null ? JSON.parse(saved) : true);
    };

    const interval = setInterval(handleStorageChange, 100);
    return () => clearInterval(interval);
  }, []);

  // Validar CPF
  const validarCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    return true;
  };

  // Formatar CPF enquanto digita
  const formatarCPF = (valor) => {
    valor = valor.replace(/\D/g, '');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return valor;
  };

  // Formatar telefone enquanto digita
  const formatarTelefone = (valor) => {
    valor = valor.replace(/\D/g, '');
    if (valor.length <= 10) {
      valor = valor.replace(/(\d{2})(\d)/, '($1) $2');
      valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      valor = valor.replace(/(\d{2})(\d)/, '($1) $2');
      valor = valor.replace(/(\d{5})(\d)/, '$1-$2');
    }
    return valor;
  };

  const handleChange = (e) => {
    let { name, value } = e.target;

    // Aplicar formatação
    if (name === 'cpf') {
      value = formatarCPF(value);
    } else if (name === 'telefone') {
      value = formatarTelefone(value);
    }

    setFormData({
      ...formData,
      [name]: value,
    });
    setErro('');
    setSucesso('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setLoading(true);

    // Validações
    if (!formData.nome || !formData.cpf || !formData.telefone) {
      setErro('Nome, CPF e telefone são obrigatórios');
      setLoading(false);
      return;
    }

    // Validar CPF
    if (!validarCPF(formData.cpf)) {
      setErro('CPF inválido');
      setLoading(false);
      return;
    }

    try {
      await clientesAPI.criar(formData);
      setSucesso('Cliente cadastrado com sucesso!');

      // Limpar formulário
      setFormData({
        nome: '',
        cpf: '',
        telefone: '',
        email: '',
        valor_carta: '',
        administradora: '',
        grupo: '',
        cota: '',
        observacao: '',
      });

      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao cadastrar cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300 ${isExpanded ? 'ml-64' : 'ml-20'}`}>
        <div className="card">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Cadastrar Novo Cliente
            </h1>
            <p className="text-gray-600">
              Preencha os dados do cliente para adicionar ao funil de vendas
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados Pessoais */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Dados Pessoais
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="João Silva"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF *
                  </label>
                  <input
                    type="text"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="000.000.000-00"
                    maxLength="14"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone *
                  </label>
                  <input
                    type="text"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="(11) 98765-4321"
                    maxLength="15"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="joao@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Dados do Consórcio */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Dados do Consórcio
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor da Carta
                  </label>
                  <input
                    type="number"
                    name="valor_carta"
                    value={formData.valor_carta}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="25000.00"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Administradora
                  </label>
                  <input
                    type="text"
                    name="administradora"
                    value={formData.administradora}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Honda, Embracon, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grupo
                  </label>
                  <input
                    type="text"
                    name="grupo"
                    value={formData.grupo}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="H001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cota
                  </label>
                  <input
                    type="text"
                    name="cota"
                    value={formData.cota}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="123"
                  />
                </div>
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                name="observacao"
                value={formData.observacao}
                onChange={handleChange}
                className="input-field"
                rows="4"
                placeholder="Informações adicionais sobre o cliente..."
              ></textarea>
            </div>

            {/* Mensagens */}
            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {erro}
              </div>
            )}

            {sucesso && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {sucesso}
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Salvando...' : 'Cadastrar Cliente'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CadastroCliente;
