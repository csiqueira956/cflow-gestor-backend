import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';
import { clientesAPI } from '../api/api';

// Componente Secao movido para fora para evitar re-criação
const Secao = ({ id, titulo, children, isPublicAccess, secaoAberta, toggleSecao }) => {
  // Se secaoAberta for null, todas as seções ficam abertas (modo público)
  const estaAberta = secaoAberta === null || secaoAberta === id;

  return (
    <div className="mb-4 border border-gray-200 rounded-lg">
      {!isPublicAccess && (
        <button
          type="button"
          onClick={() => toggleSecao(id)}
          className="w-full px-6 py-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900">{titulo}</h3>
          <span className="text-2xl text-primary-600">
            {estaAberta ? '−' : '+'}
          </span>
        </button>
      )}
      {isPublicAccess && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{titulo}</h3>
        </div>
      )}
      {estaAberta && (
        <div className="p-6 bg-white">
          {children}
        </div>
      )}
    </div>
  );
};

const CadastroClienteCompleto = () => {
  const navigate = useNavigate();
  const { linkPublico } = useParams(); // Detectar se é acesso via link público
  const isPublicAccess = !!linkPublico; // True se acessado via link público
  const [formData, setFormData] = useState({
    //Dados Básicos
    nome: '',
    cpf: '',
    email: '',

    // Dados Pessoais
    data_nascimento: '',
    estado_civil: '',
    nacionalidade: 'Brasil',
    cidade_nascimento: '',
    nome_mae: '',
    profissao: '',
    remuneracao: '',

    // Contatos
    telefone_residencial: '',
    telefone_comercial: '',
    telefone_celular: '',
    telefone_celular_2: '',

    // Documentação
    tipo_documento: 'RG',
    numero_documento: '',
    orgao_emissor: '',
    data_emissao: '',

    // Dados do Cônjuge
    cpf_conjuge: '',
    nome_conjuge: '',

    // Endereço
    cep: '',
    tipo_logradouro: 'Rua',
    endereco: '',
    numero_endereco: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',

    // Pagamento - 1ª Parcela
    forma_pagamento_primeira: 'Boleto',
    data_pre_datado: '',
    valor_cheque: '',
    numero_cheque: '',
    data_vencimento_cheque: '',
    banco_cheque: '',
    agencia_cheque: '',
    conta_cheque: '',

    // Pagamento - Demais Parcelas
    forma_pagamento_demais: 'Boleto',
    nome_correntista: '',
    cpf_correntista: '',
    banco_debito: '',
    agencia_debito: '',
    conta_debito: '',

    // Seguro
    aceita_seguro: false,

    // Dados do Consórcio
    valor_carta: '',
    administradora: '',
    grupo: '',
    cota: '',
    observacao: '',
  });

  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [loading, setLoading] = useState(false);
  // Se for acesso público, manter todas as seções abertas (null = todas abertas)
  const [secaoAberta, setSecaoAberta] = useState(isPublicAccess ? null : 'dados-pessoais');

  // Formatadores
  const formatarCPF = (valor) => {
    valor = valor.replace(/\D/g, '');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return valor;
  };

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

  const formatarCEP = (valor) => {
    valor = valor.replace(/\D/g, '');
    valor = valor.replace(/(\d{5})(\d)/, '$1-$2');
    return valor;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let valorFormatado = value;

    // Aplicar formatação
    if (name === 'cpf' || name === 'cpf_conjuge' || name === 'cpf_correntista') {
      valorFormatado = formatarCPF(value);
    } else if (name.includes('telefone')) {
      valorFormatado = formatarTelefone(value);
    } else if (name === 'cep') {
      valorFormatado = formatarCEP(value);
    }

    const finalValue = type === 'checkbox' ? checked : valorFormatado;

    console.log(`📝 Campo alterado: ${name}`, {
      valorDigitado: value,
      valorFormatado: valorFormatado,
      valorFinal: finalValue,
      comprimento: finalValue?.length || 0
    });

    setFormData({
      ...formData,
      [name]: finalValue,
    });
    setErro('');
    setSucesso('');
  };

  const toggleSecao = (secao) => {
    setSecaoAberta(secaoAberta === secao ? null : secao);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('📝 Formulário submetido');
    console.log('📋 Estado completo do formData:', formData);
    setErro('');
    setSucesso('');
    setLoading(true);

    // Validações básicas - remover formatação para verificar conteúdo real
    const nomeValido = formData.nome && formData.nome.trim().length > 0;
    const cpfValido = formData.cpf && formData.cpf.replace(/\D/g, '').length > 0;
    const telefoneValido = formData.telefone_celular && formData.telefone_celular.replace(/\D/g, '').length > 0;

    console.log('🔍 Validando campos:', {
      nome: {
        valor: formData.nome,
        comprimento: formData.nome?.length || 0,
        trimmed: formData.nome?.trim(),
        valido: nomeValido
      },
      cpf: {
        valor: formData.cpf,
        comprimento: formData.cpf?.length || 0,
        somenteNumeros: formData.cpf?.replace(/\D/g, ''),
        valido: cpfValido
      },
      telefone_celular: {
        valor: formData.telefone_celular,
        comprimento: formData.telefone_celular?.length || 0,
        somenteNumeros: formData.telefone_celular?.replace(/\D/g, ''),
        valido: telefoneValido
      }
    });

    if (!nomeValido || !cpfValido || !telefoneValido) {
      const camposFaltando = [];
      if (!nomeValido) camposFaltando.push('Nome');
      if (!cpfValido) camposFaltando.push('CPF');
      if (!telefoneValido) camposFaltando.push('Telefone Celular');

      const mensagemErro = `Campos obrigatórios não preenchidos: ${camposFaltando.join(', ')}`;
      console.error('❌ Validação falhou:', mensagemErro);
      console.error('Detalhes:', { nomeValido, cpfValido, telefoneValido });
      setErro(mensagemErro);
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      console.log('📤 Enviando dados para o backend...');

      let response;
      if (isPublicAccess) {
        // Acesso público: usar rota pública específica
        console.log('🌐 Usando rota pública com link:', linkPublico);
        const axios = (await import('axios')).default;
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        response = await axios.post(`${API_URL}/clientes/publico/${linkPublico}`, formData);
      } else {
        // Acesso autenticado: usar rota normal
        console.log('🔐 Usando rota autenticada');
        response = await clientesAPI.criar(formData);
      }

      console.log('✅ Cliente cadastrado com sucesso:', response.data);

      if (isPublicAccess) {
        setSucesso('Cadastro realizado com sucesso! Em breve entraremos em contato.');
        // Limpar formulário após sucesso no acesso público
        setFormData({
          nome: '', cpf: '', email: '', data_nascimento: '', estado_civil: '', nacionalidade: 'Brasil',
          cidade_nascimento: '', nome_mae: '', profissao: '', remuneracao: '', telefone_residencial: '',
          telefone_comercial: '', telefone_celular: '', telefone_celular_2: '', tipo_documento: 'RG',
          numero_documento: '', orgao_emissor: '', data_emissao: '', cpf_conjuge: '', nome_conjuge: '',
          cep: '', tipo_logradouro: 'Rua', endereco: '', numero_endereco: '', complemento: '', bairro: '',
          cidade: '', estado: '', forma_pagamento_primeira: 'Boleto', data_pre_datado: '', valor_cheque: '',
          numero_cheque: '', data_vencimento_cheque: '', banco_cheque: '', agencia_cheque: '', conta_cheque: '',
          forma_pagamento_demais: 'Boleto', nome_correntista: '', cpf_correntista: '', banco_debito: '',
          agencia_debito: '', conta_debito: '', aceita_seguro: false, valor_carta: '', administradora: '',
          grupo: '', cota: '', observacao: ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setSucesso('Cliente cadastrado com sucesso!');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Erro ao cadastrar:', error);
      const mensagemErro = error.response?.data?.error || 'Erro ao cadastrar cliente. Tente novamente.';
      setErro(mensagemErro);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  // Tela de sucesso para cadastro público
  if (isPublicAccess && sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Cadastro realizado com sucesso!</h1>
          <p className="text-gray-600 mb-6">Em breve entraremos em contato.</p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700 text-sm">
              Obrigado por se cadastrar! Nossa equipe entrará em contato em breve para dar continuidade ao seu atendimento.
            </p>
          </div>
          <div className="mt-6">
            <Logo className="w-10 h-10 mx-auto" textSize="text-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - diferente para acesso público vs autenticado */}
      {isPublicAccess ? (
        // Header simples para acesso público
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="mx-auto px-4 py-6" style={{ maxWidth: '1472px' }}>
            <div className="flex items-center justify-center">
              <Logo className="w-12 h-12" textSize="text-2xl" />
            </div>
          </div>
        </div>
      ) : (
        // Navbar completa para usuários autenticados
        <Navbar />
      )}

      <div className="mx-auto px-4 py-8" style={{ maxWidth: '1472px' }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cadastro de Cliente</h1>
          <p className="text-gray-600">
            {isPublicAccess
              ? 'Preencha seus dados para se cadastrar'
              : 'Preencha os dados do cliente para cadastrar no sistema'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dados Pessoais */}
          <Secao
            id="dados-pessoais"
            titulo="1. Dados Pessoais"
            isPublicAccess={isPublicAccess}
            secaoAberta={secaoAberta}
            toggleSecao={toggleSecao}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CPF *</label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleChange}
                  maxLength="14"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  name="data_nascimento"
                  value={formData.data_nascimento}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estado Civil</label>
                <select
                  name="estado_civil"
                  value={formData.estado_civil}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Selecione</option>
                  <option value="Solteiro">Solteiro(a)</option>
                  <option value="Casado">Casado(a)</option>
                  <option value="Divorciado">Divorciado(a)</option>
                  <option value="Viúvo">Viúvo(a)</option>
                  <option value="União Estável">União Estável</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profissão</label>
                <input
                  type="text"
                  name="profissao"
                  value={formData.profissao}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remuneração (R$)
                </label>
                <input
                  type="number"
                  name="remuneracao"
                  value={formData.remuneracao}
                  onChange={handleChange}
                  step="0.01"
                  className="input-field"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Mãe</label>
                <input
                  type="text"
                  name="nome_mae"
                  value={formData.nome_mae}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>
          </Secao>

          {/* Contatos */}
          <Secao
            id="contatos"
            titulo="2. Contatos"
            isPublicAccess={isPublicAccess}
            secaoAberta={secaoAberta}
            toggleSecao={toggleSecao}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone Celular *
                </label>
                <input
                  type="text"
                  name="telefone_celular"
                  value={formData.telefone_celular}
                  onChange={handleChange}
                  maxLength="15"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone Celular 2
                </label>
                <input
                  type="text"
                  name="telefone_celular_2"
                  value={formData.telefone_celular_2}
                  onChange={handleChange}
                  maxLength="15"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone Residencial
                </label>
                <input
                  type="text"
                  name="telefone_residencial"
                  value={formData.telefone_residencial}
                  onChange={handleChange}
                  maxLength="15"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone Comercial
                </label>
                <input
                  type="text"
                  name="telefone_comercial"
                  value={formData.telefone_comercial}
                  onChange={handleChange}
                  maxLength="15"
                  className="input-field"
                />
              </div>
            </div>
          </Secao>

          {/* Documentação */}
          <Secao
            id="documentacao"
            titulo="3. Documentação"
            isPublicAccess={isPublicAccess}
            secaoAberta={secaoAberta}
            toggleSecao={toggleSecao}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Documento
                </label>
                <select
                  name="tipo_documento"
                  value={formData.tipo_documento}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="RG">RG</option>
                  <option value="CNH">CNH</option>
                  <option value="Passaporte">Passaporte</option>
                  <option value="RNE">RNE</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número do Documento
                </label>
                <input
                  type="text"
                  name="numero_documento"
                  value={formData.numero_documento}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Órgão Emissor
                </label>
                <input
                  type="text"
                  name="orgao_emissor"
                  value={formData.orgao_emissor}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Ex: SSP/SP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Emissão
                </label>
                <input
                  type="date"
                  name="data_emissao"
                  value={formData.data_emissao}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>
          </Secao>

          {/* Dados do Cônjuge */}
          {(formData.estado_civil === 'Casado' || formData.estado_civil === 'União Estável') && (
            <Secao
              id="conjuge"
              titulo="4. Dados do Cônjuge"
              isPublicAccess={isPublicAccess}
              secaoAberta={secaoAberta}
              toggleSecao={toggleSecao}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF do Cônjuge
                  </label>
                  <input
                    type="text"
                    name="cpf_conjuge"
                    value={formData.cpf_conjuge}
                    onChange={handleChange}
                    maxLength="14"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Cônjuge
                  </label>
                  <input
                    type="text"
                    name="nome_conjuge"
                    value={formData.nome_conjuge}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
              </div>
            </Secao>
          )}

          {/* Endereço */}
          <Secao
            id="endereco"
            titulo="5. Endereço Residencial"
            isPublicAccess={isPublicAccess}
            secaoAberta={secaoAberta}
            toggleSecao={toggleSecao}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                <input
                  type="text"
                  name="cep"
                  value={formData.cep}
                  onChange={handleChange}
                  maxLength="9"
                  className="input-field"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                <input
                  type="text"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Número</label>
                <input
                  type="text"
                  name="numero_endereco"
                  value={formData.numero_endereco}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Complemento</label>
                <input
                  type="text"
                  name="complemento"
                  value={formData.complemento}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bairro</label>
                <input
                  type="text"
                  name="bairro"
                  value={formData.bairro}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                <input
                  type="text"
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Selecione</option>
                  <option value="AC">AC</option>
                  <option value="AL">AL</option>
                  <option value="AP">AP</option>
                  <option value="AM">AM</option>
                  <option value="BA">BA</option>
                  <option value="CE">CE</option>
                  <option value="DF">DF</option>
                  <option value="ES">ES</option>
                  <option value="GO">GO</option>
                  <option value="MA">MA</option>
                  <option value="MT">MT</option>
                  <option value="MS">MS</option>
                  <option value="MG">MG</option>
                  <option value="PA">PA</option>
                  <option value="PB">PB</option>
                  <option value="PR">PR</option>
                  <option value="PE">PE</option>
                  <option value="PI">PI</option>
                  <option value="RJ">RJ</option>
                  <option value="RN">RN</option>
                  <option value="RS">RS</option>
                  <option value="RO">RO</option>
                  <option value="RR">RR</option>
                  <option value="SC">SC</option>
                  <option value="SP">SP</option>
                  <option value="SE">SE</option>
                  <option value="TO">TO</option>
                </select>
              </div>
            </div>
          </Secao>

          {/* Dados do Consórcio */}
          <Secao
            id="consorcio"
            titulo="6. Dados do Consórcio"
            isPublicAccess={isPublicAccess}
            secaoAberta={secaoAberta}
            toggleSecao={toggleSecao}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Administradora</label>
                <input
                  type="text"
                  name="administradora"
                  value={formData.administradora}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor da Carta (R$)</label>
                <input
                  type="number"
                  name="valor_carta"
                  value={formData.valor_carta}
                  onChange={handleChange}
                  step="0.01"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grupo</label>
                <input
                  type="text"
                  name="grupo"
                  value={formData.grupo}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cota</label>
                <input
                  type="text"
                  name="cota"
                  value={formData.cota}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                <textarea
                  name="observacao"
                  value={formData.observacao}
                  onChange={handleChange}
                  rows="3"
                  className="input-field"
                />
              </div>
            </div>
          </Secao>

          {/* Pagamento */}
          <Secao
            id="pagamento"
            titulo="7. Dados de Pagamento"
            isPublicAccess={isPublicAccess}
            secaoAberta={secaoAberta}
            toggleSecao={toggleSecao}
          >
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Primeira Parcela</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Forma de Pagamento
                  </label>
                  <select
                    name="forma_pagamento_primeira"
                    value={formData.forma_pagamento_primeira}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="Boleto">Boleto</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    name="data_pre_datado"
                    value={formData.data_pre_datado}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
              </div>

              <hr className="my-6" />

              <h4 className="font-semibold text-gray-900">Demais Parcelas</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Forma de Pagamento
                  </label>
                  <select
                    name="forma_pagamento_demais"
                    value={formData.forma_pagamento_demais}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="Débito Automático">Débito Automático</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                  </select>
                </div>

                {formData.forma_pagamento_demais === 'Débito Automático' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome do Correntista
                      </label>
                      <input
                        type="text"
                        name="nome_correntista"
                        value={formData.nome_correntista}
                        onChange={handleChange}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CPF do Correntista
                      </label>
                      <input
                        type="text"
                        name="cpf_correntista"
                        value={formData.cpf_correntista}
                        onChange={handleChange}
                        maxLength="14"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Banco</label>
                      <input
                        type="text"
                        name="banco_debito"
                        value={formData.banco_debito}
                        onChange={handleChange}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Agência</label>
                      <input
                        type="text"
                        name="agencia_debito"
                        value={formData.agencia_debito}
                        onChange={handleChange}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Conta Corrente</label>
                      <input
                        type="text"
                        name="conta_debito"
                        value={formData.conta_debito}
                        onChange={handleChange}
                        className="input-field"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </Secao>

          {/* Seguro */}
          <Secao
            id="seguro"
            titulo="8. Seguro"
            isPublicAccess={isPublicAccess}
            secaoAberta={secaoAberta}
            toggleSecao={toggleSecao}
          >
            <div className="flex items-center">
              <input
                type="checkbox"
                id="aceita_seguro"
                name="aceita_seguro"
                checked={formData.aceita_seguro}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="aceita_seguro" className="ml-2 text-sm font-medium text-gray-700">
                Está de acordo com o seguro?
              </label>
            </div>
          </Secao>

          {/* Mensagens */}
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {sucesso}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-4 pt-6">
            {!isPublicAccess && (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`btn-accent ${isPublicAccess ? 'w-full' : 'flex-1'}`}
            >
              {loading ? 'Enviando...' : isPublicAccess ? 'Enviar Cadastro' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>

        {/* Footer para acesso público */}
        {isPublicAccess && (
          <div className="mt-8 text-center text-sm text-gray-600">
            <p>Seus dados estão protegidos e serão utilizados apenas para contato.</p>
            <p className="mt-2">Dúvidas? Entre em contato conosco.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CadastroClienteCompleto;
