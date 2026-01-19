import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const FormularioPublico = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [formulario, setFormulario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [secaoAberta, setSecaoAberta] = useState('dados-basicos');

  const [formData, setFormData] = useState({
    // Dados Básicos
    nome: '',
    cpf: '',
    email: '',
    telefone_celular: '',

    // Dados Pessoais
    data_nascimento: '',
    estado_civil: '',
    nacionalidade: '',
    cidade_nascimento: '',
    nome_mae: '',
    profissao: '',
    remuneracao: '',

    // Contatos Adicionais
    telefone_residencial: '',
    telefone_comercial: '',
    telefone_celular_2: '',

    // Documentação
    tipo_documento: '',
    numero_documento: '',
    orgao_emissor: '',
    data_emissao: '',

    // Dados do Cônjuge
    cpf_conjuge: '',
    nome_conjuge: '',

    // Endereço
    cep: '',
    tipo_logradouro: '',
    endereco: '',
    numero_endereco: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',

    // Pagamento - Primeira Parcela
    forma_pagamento_primeira: '',
    data_pre_datado: '',
    valor_cheque: '',
    numero_cheque: '',
    data_vencimento_cheque: '',
    banco_cheque: '',
    agencia_cheque: '',
    conta_cheque: '',

    // Pagamento - Demais Parcelas
    forma_pagamento_demais: '',
    nome_correntista: '',
    cpf_correntista: '',
    banco_debito: '',
    agencia_debito: '',
    conta_debito: '',

    // Seguro
    aceita_seguro: false,

    // Consórcio
    valor_carta: '',
    administradora: '',
    grupo: '',
    cota: '',
    observacao: ''
  });

  useEffect(() => {
    buscarFormulario();
  }, [token]);

  const buscarFormulario = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/api/formularios/publico/${token}`);
      setFormulario(response.data);
      setLoading(false);
    } catch (error) {
      setErro(error.response?.data?.error || 'Formulário não encontrado ou inativo');
      setLoading(false);
    }
  };

  const toggleSecao = (id) => {
    setSecaoAberta(secaoAberta === id ? null : id);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const formatarCPF = (valor) => {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 11) {
      return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return valor;
  };

  const formatarTelefone = (valor) => {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 11) {
      if (numeros.length === 11) {
        return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      } else if (numeros.length === 10) {
        return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      }
    }
    return valor;
  };

  const formatarCEP = (valor) => {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 8) {
      return numeros.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    return valor;
  };

  const handleCPFChange = (e) => {
    const { name, value } = e.target;
    const formatted = formatarCPF(value);
    setFormData(prev => ({ ...prev, [name]: formatted }));
  };

  const handleTelefoneChange = (e) => {
    const { name, value } = e.target;
    const formatted = formatarTelefone(value);
    setFormData(prev => ({ ...prev, [name]: formatted }));
  };

  const handleCEPChange = (e) => {
    const formatted = formatarCEP(e.target.value);
    setFormData(prev => ({ ...prev, cep: formatted }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nome || !formData.cpf || !formData.telefone_celular) {
      setErro('Por favor, preencha os campos obrigatórios: Nome, CPF e Celular');
      return;
    }

    setEnviando(true);
    setErro('');

    try {
      await axios.post(`http://localhost:3001/api/formularios/publico/${token}/submeter`, formData);
      setSucesso(true);
      setFormData({
        nome: '', cpf: '', email: '', telefone_celular: '',
        data_nascimento: '', estado_civil: '', nacionalidade: '',
        cidade_nascimento: '', nome_mae: '', profissao: '', remuneracao: '',
        telefone_residencial: '', telefone_comercial: '', telefone_celular_2: '',
        tipo_documento: '', numero_documento: '', orgao_emissor: '', data_emissao: '',
        cpf_conjuge: '', nome_conjuge: '',
        cep: '', tipo_logradouro: '', endereco: '', numero_endereco: '',
        complemento: '', bairro: '', cidade: '', estado: '',
        forma_pagamento_primeira: '', data_pre_datado: '', valor_cheque: '',
        numero_cheque: '', data_vencimento_cheque: '', banco_cheque: '',
        agencia_cheque: '', conta_cheque: '',
        forma_pagamento_demais: '', nome_correntista: '', cpf_correntista: '',
        banco_debito: '', agencia_debito: '', conta_debito: '',
        aceita_seguro: false,
        valor_carta: '', administradora: '', grupo: '', cota: '', observacao: ''
      });
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao enviar formulário. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const Secao = ({ id, titulo, children }) => (
    <div className="mb-4 border border-gray-200 rounded-lg">
      <button
        type="button"
        onClick={() => toggleSecao(id)}
        className="w-full px-6 py-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
      >
        <h3 className="text-lg font-semibold text-gray-900">{titulo}</h3>
        <span className="text-2xl text-blue-600">
          {secaoAberta === id ? '−' : '+'}
        </span>
      </button>
      {secaoAberta === id && (
        <div className="p-6 bg-white">
          {children}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-gray-600">Carregando formulário...</div>
      </div>
    );
  }

  if (erro && !formulario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Formulário não disponível</h2>
          <p className="text-gray-600">{erro}</p>
        </div>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Formulário enviado com sucesso!</h2>
          <p className="text-gray-600 mb-6">
            Suas informações foram enviadas e em breve entraremos em contato.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Enviar outro formulário
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {formulario?.titulo || 'Cadastro de Cliente - Consórcio'}
          </h1>
          {formulario?.descricao && (
            <p className="text-gray-600">{formulario.descricao}</p>
          )}
          <div className="mt-4 text-sm text-gray-500">
            <p>Campos obrigatórios estão marcados com *</p>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
          {erro && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {erro}
            </div>
          )}

          {/* Seção 1: Dados Básicos */}
          <Secao id="dados-basicos" titulo="1. Dados Básicos">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF *
                </label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleCPFChange}
                  placeholder="000.000.000-00"
                  maxLength="14"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Celular *
                </label>
                <input
                  type="text"
                  name="telefone_celular"
                  value={formData.telefone_celular}
                  onChange={handleTelefoneChange}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </Secao>

          {/* Seção 2: Dados Pessoais */}
          <Secao id="dados-pessoais" titulo="2. Dados Pessoais">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  name="data_nascimento"
                  value={formData.data_nascimento}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado Civil
                </label>
                <select
                  name="estado_civil"
                  value={formData.estado_civil}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                  <option value="União Estável">União Estável</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nacionalidade
                </label>
                <input
                  type="text"
                  name="nacionalidade"
                  value={formData.nacionalidade}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade de Nascimento
                </label>
                <input
                  type="text"
                  name="cidade_nascimento"
                  value={formData.cidade_nascimento}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Mãe
                </label>
                <input
                  type="text"
                  name="nome_mae"
                  value={formData.nome_mae}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profissão
                </label>
                <input
                  type="text"
                  name="profissao"
                  value={formData.profissao}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remuneração (R$)
                </label>
                <input
                  type="number"
                  name="remuneracao"
                  value={formData.remuneracao}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </Secao>

          {/* Seção 3: Contatos Adicionais */}
          <Secao id="contatos" titulo="3. Contatos Adicionais">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone Residencial
                </label>
                <input
                  type="text"
                  name="telefone_residencial"
                  value={formData.telefone_residencial}
                  onChange={handleTelefoneChange}
                  placeholder="(00) 0000-0000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone Comercial
                </label>
                <input
                  type="text"
                  name="telefone_comercial"
                  value={formData.telefone_comercial}
                  onChange={handleTelefoneChange}
                  placeholder="(00) 0000-0000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Celular Alternativo
                </label>
                <input
                  type="text"
                  name="telefone_celular_2"
                  value={formData.telefone_celular_2}
                  onChange={handleTelefoneChange}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </Secao>

          {/* Seção 4: Documentação */}
          <Secao id="documentacao" titulo="4. Documentação">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Documento
                </label>
                <select
                  name="tipo_documento"
                  value={formData.tipo_documento}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  <option value="RG">RG</option>
                  <option value="CNH">CNH</option>
                  <option value="RNE">RNE</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número do Documento
                </label>
                <input
                  type="text"
                  name="numero_documento"
                  value={formData.numero_documento}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Órgão Emissor
                </label>
                <input
                  type="text"
                  name="orgao_emissor"
                  value={formData.orgao_emissor}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Emissão
                </label>
                <input
                  type="date"
                  name="data_emissao"
                  value={formData.data_emissao}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </Secao>

          {/* Seção 5: Dados do Cônjuge */}
          {(formData.estado_civil === 'Casado(a)' || formData.estado_civil === 'União Estável') && (
            <Secao id="conjuge" titulo="5. Dados do Cônjuge">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Cônjuge
                  </label>
                  <input
                    type="text"
                    name="nome_conjuge"
                    value={formData.nome_conjuge}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF do Cônjuge
                  </label>
                  <input
                    type="text"
                    name="cpf_conjuge"
                    value={formData.cpf_conjuge}
                    onChange={handleCPFChange}
                    placeholder="000.000.000-00"
                    maxLength="14"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </Secao>
          )}

          {/* Seção 6: Endereço */}
          <Secao id="endereco" titulo="6. Endereço">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CEP
                </label>
                <input
                  type="text"
                  name="cep"
                  value={formData.cep}
                  onChange={handleCEPChange}
                  placeholder="00000-000"
                  maxLength="9"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Logradouro
                </label>
                <select
                  name="tipo_logradouro"
                  value={formData.tipo_logradouro}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  <option value="Rua">Rua</option>
                  <option value="Avenida">Avenida</option>
                  <option value="Travessa">Travessa</option>
                  <option value="Alameda">Alameda</option>
                  <option value="Rodovia">Rodovia</option>
                  <option value="Praça">Praça</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número
                </label>
                <input
                  type="text"
                  name="numero_endereco"
                  value={formData.numero_endereco}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  name="complemento"
                  value={formData.complemento}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  name="bairro"
                  value={formData.bairro}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  <option value="AC">Acre</option>
                  <option value="AL">Alagoas</option>
                  <option value="AP">Amapá</option>
                  <option value="AM">Amazonas</option>
                  <option value="BA">Bahia</option>
                  <option value="CE">Ceará</option>
                  <option value="DF">Distrito Federal</option>
                  <option value="ES">Espírito Santo</option>
                  <option value="GO">Goiás</option>
                  <option value="MA">Maranhão</option>
                  <option value="MT">Mato Grosso</option>
                  <option value="MS">Mato Grosso do Sul</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="PA">Pará</option>
                  <option value="PB">Paraíba</option>
                  <option value="PR">Paraná</option>
                  <option value="PE">Pernambuco</option>
                  <option value="PI">Piauí</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="RN">Rio Grande do Norte</option>
                  <option value="RS">Rio Grande do Sul</option>
                  <option value="RO">Rondônia</option>
                  <option value="RR">Roraima</option>
                  <option value="SC">Santa Catarina</option>
                  <option value="SP">São Paulo</option>
                  <option value="SE">Sergipe</option>
                  <option value="TO">Tocantins</option>
                </select>
              </div>
            </div>
          </Secao>

          {/* Seção 7: Informações do Consórcio */}
          <Secao id="consorcio" titulo="7. Informações do Consórcio">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Administradora
                </label>
                <input
                  type="text"
                  name="administradora"
                  value={formData.administradora}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor da Carta (R$)
                </label>
                <input
                  type="number"
                  name="valor_carta"
                  value={formData.valor_carta}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grupo
                </label>
                <input
                  type="text"
                  name="grupo"
                  value={formData.grupo}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cota
                </label>
                <input
                  type="text"
                  name="cota"
                  value={formData.cota}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="aceita_seguro"
                    checked={formData.aceita_seguro}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Aceita seguro
                  </span>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  name="observacao"
                  value={formData.observacao}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </Secao>

          {/* Botão de Envio */}
          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={enviando}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {enviando ? 'Enviando...' : 'Enviar Formulário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormularioPublico;
