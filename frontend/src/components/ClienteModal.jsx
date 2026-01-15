import { useEffect, useState, useCallback, memo } from 'react';
import toast from 'react-hot-toast';
import { clientesAPI } from '../api/api';
import AtividadesCliente from './AtividadesCliente';

// Funções de formatação (fora do componente)
const formatarCPF = (cpf) => {
  if (!cpf) return 'Não informado';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const formatarCEP = (cep) => {
  if (!cep) return 'Não informado';
  return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
};

const formatarTelefone = (telefone) => {
  if (!telefone) return 'Não informado';
  return telefone;
};

const formatarData = (data) => {
  if (!data) return 'Não informado';
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR');
};

const formatarValor = (valor) => {
  if (!valor) return 'Não informado';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
};

// Componente CampoEditavel (fora do componente principal para evitar re-render)
const CampoEditavel = memo(({ label, campo, valor, tipo = 'text', opcoes = null, modoEdicao, dadosEditados, onChange }) => {
  const getValorFormatado = () => {
    if (tipo === 'date') return formatarData(valor);
    if (campo === 'cpf') return formatarCPF(valor);
    if (campo === 'cep') return formatarCEP(valor);
    if (campo.includes('telefone')) return formatarTelefone(valor);
    if (campo.includes('valor') || campo === 'remuneracao') return formatarValor(valor);
    return valor || 'Não informado';
  };

  return (
    <div>
      <span className="text-sm font-medium text-gray-500">{label}</span>
      {modoEdicao ? (
        opcoes ? (
          <select
            value={dadosEditados[campo] || ''}
            onChange={(e) => onChange(campo, e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {opcoes.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        ) : tipo === 'textarea' ? (
          <textarea
            value={dadosEditados[campo] || ''}
            onChange={(e) => onChange(campo, e.target.value)}
            rows={3}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        ) : (
          <input
            type={tipo}
            value={dadosEditados[campo] || ''}
            onChange={(e) => onChange(campo, e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        )
      ) : (
        <p className="text-gray-900">{getValorFormatado()}</p>
      )}
    </div>
  );
});

CampoEditavel.displayName = 'CampoEditavel';

const ClienteModal = ({ cliente, onClose, onAtualizar, onDelete }) => {
  const [modoEdicao, setModoEdicao] = useState(false);
  const [dadosEditados, setDadosEditados] = useState(cliente);
  const [salvando, setSalvando] = useState(false);

  // Função para excluir cliente
  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${cliente.nome}"?\n\nEsta ação não pode ser desfeita.`)) {
      onDelete(cliente.id);
      onClose();
    }
  };

  // Fechar modal com ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Atualizar dados quando o cliente mudar
  useEffect(() => {
    setDadosEditados(cliente);
  }, [cliente]);

  // Função para salvar alterações
  const salvarAlteracoes = async () => {
    try {
      setSalvando(true);
      await clientesAPI.atualizar(cliente.id, dadosEditados);
      toast.success('Cliente atualizado com sucesso!');
      setModoEdicao(false);
      onAtualizar();
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      toast.error('Erro ao atualizar cliente');
    } finally {
      setSalvando(false);
    }
  };

  // Função para cancelar edição
  const cancelarEdicao = () => {
    setDadosEditados(cliente);
    setModoEdicao(false);
  };

  // Função auxiliar para atualizar campo (useCallback para evitar re-renders)
  const handleChange = useCallback((campo, valor) => {
    setDadosEditados(prev => ({ ...prev, [campo]: valor }));
  }, []);

  // Mapa de etapas
  const etapasNomes = {
    novo_contato: 'Novo Contato',
    proposta_enviada: 'Proposta Enviada',
    negociacao: 'Em Negociação',
    fechado: 'Fechado',
    em_comissionamento: 'Em Comissionamento',
    perdido: 'Perdido',
  };

  // Wrapper para CampoEditavel com props comuns
  const Campo = useCallback((props) => (
    <CampoEditavel
      {...props}
      modoEdicao={modoEdicao}
      dadosEditados={dadosEditados}
      onChange={handleChange}
    />
  ), [modoEdicao, dadosEditados, handleChange]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />

        {/* Modal */}
        <div
          className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-700 px-6 py-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-white">{cliente.nome}</h2>
                <p className="text-primary-100 text-sm mt-1">
                  Etapa: {etapasNomes[cliente.etapa] || cliente.etapa}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Ações Rápidas */}
          {!modoEdicao && (
            <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
              <div className="flex justify-between items-center flex-wrap gap-3">
                {/* Grupo 1: Comunicação - WhatsApp + Ligar */}
                <div className="flex gap-2">
                  {(cliente.telefone_celular || cliente.telefone) ? (
                    <a
                      href={`https://wa.me/55${(cliente.telefone_celular || cliente.telefone).replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </span>
                  )}
                  {(cliente.telefone_celular || cliente.telefone) ? (
                    <a
                      href={`tel:${(cliente.telefone_celular || cliente.telefone).replace(/\D/g, '')}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Ligar
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Ligar
                    </span>
                  )}
                </div>

                {/* Grupo 2: Ações - Editar + Excluir */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setModoEdicao(true)}
                    className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    title="Editar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    title="Excluir"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo */}
          <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Seção 1: Dados Básicos */}
              <div className="card bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Dados Básicos
                </h3>
                <div className="space-y-3">
                  <Campo label="Nome Completo" campo="nome" valor={cliente.nome} />
                  <Campo label="CPF" campo="cpf" valor={cliente.cpf} />
                  <Campo label="Email" campo="email" valor={cliente.email} tipo="email" />
                  <Campo label="Telefone" campo="telefone" valor={cliente.telefone} />
                  <Campo
                    label="Etapa"
                    campo="etapa"
                    valor={etapasNomes[cliente.etapa] || cliente.etapa}
                    opcoes={[
                      { value: 'novo_contato', label: 'Novo Contato' },
                      { value: 'proposta_enviada', label: 'Proposta Enviada' },
                      { value: 'negociacao', label: 'Em Negociação' },
                      { value: 'fechado', label: 'Fechado' },
                      { value: 'em_comissionamento', label: 'Em Comissionamento' },
                      { value: 'perdido', label: 'Perdido' },
                    ]}
                  />
                </div>
              </div>

              {/* Seção 2: Dados Pessoais */}
              <div className="card bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Dados Pessoais
                </h3>
                <div className="space-y-3">
                  <Campo label="Data de Nascimento" campo="data_nascimento" valor={cliente.data_nascimento} tipo="date" />
                  <Campo
                    label="Estado Civil"
                    campo="estado_civil"
                    valor={cliente.estado_civil}
                    opcoes={[
                      { value: 'Solteiro(a)', label: 'Solteiro(a)' },
                      { value: 'Casado(a)', label: 'Casado(a)' },
                      { value: 'Divorciado(a)', label: 'Divorciado(a)' },
                      { value: 'Viúvo(a)', label: 'Viúvo(a)' },
                      { value: 'União Estável', label: 'União Estável' },
                    ]}
                  />
                  <Campo label="Nacionalidade" campo="nacionalidade" valor={cliente.nacionalidade} />
                  <Campo label="Cidade de Nascimento" campo="cidade_nascimento" valor={cliente.cidade_nascimento} />
                  <Campo label="Nome da Mãe" campo="nome_mae" valor={cliente.nome_mae} />
                  <Campo label="Profissão" campo="profissao" valor={cliente.profissao} />
                  <Campo label="Remuneração" campo="remuneracao" valor={cliente.remuneracao} tipo="number" />
                </div>
              </div>

              {/* Seção 3: Telefones */}
              <div className="card bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Telefones
                </h3>
                <div className="space-y-3">
                  <Campo label="Residencial" campo="telefone_residencial" valor={cliente.telefone_residencial} />
                  <Campo label="Comercial" campo="telefone_comercial" valor={cliente.telefone_comercial} />
                  <Campo label="Celular 1" campo="telefone_celular" valor={cliente.telefone_celular} />
                  <Campo label="Celular 2" campo="telefone_celular_2" valor={cliente.telefone_celular_2} />
                </div>
              </div>

              {/* Seção 4: Documentos */}
              <div className="card bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Documentos
                </h3>
                <div className="space-y-3">
                  <Campo
                    label="Tipo de Documento"
                    campo="tipo_documento"
                    valor={cliente.tipo_documento}
                    opcoes={[
                      { value: 'RG', label: 'RG' },
                      { value: 'CNH', label: 'CNH' },
                      { value: 'Passaporte', label: 'Passaporte' },
                    ]}
                  />
                  <Campo label="Número do Documento" campo="numero_documento" valor={cliente.numero_documento} />
                  <Campo label="Órgão Emissor" campo="orgao_emissor" valor={cliente.orgao_emissor} />
                  <Campo label="Data de Emissão" campo="data_emissao" valor={cliente.data_emissao} tipo="date" />
                </div>
              </div>

              {/* Seção 5: Cônjuge */}
              <div className="card bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Dados do Cônjuge
                </h3>
                <div className="space-y-3">
                  <Campo label="CPF do Cônjuge" campo="cpf_conjuge" valor={cliente.cpf_conjuge} />
                  <Campo label="Nome do Cônjuge" campo="nome_conjuge" valor={cliente.nome_conjuge} />
                </div>
              </div>

              {/* Seção 6: Consórcio */}
              <div className="card bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Informações do Consórcio
                </h3>
                <div className="space-y-3">
                  <Campo label="Valor da Carta" campo="valor_carta" valor={cliente.valor_carta} tipo="number" />
                  <Campo label="Administradora" campo="administradora" valor={cliente.administradora} />
                  <Campo label="Grupo" campo="grupo" valor={cliente.grupo} />
                  <Campo label="Cota" campo="cota" valor={cliente.cota} />
                  <div>
                    <span className="text-sm font-medium text-gray-500">Aceita Seguro</span>
                    {modoEdicao ? (
                      <select
                        value={dadosEditados.aceita_seguro ? 'sim' : 'nao'}
                        onChange={(e) => handleChange('aceita_seguro', e.target.value === 'sim')}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    ) : (
                      <p className="text-gray-900">{cliente.aceita_seguro ? 'Sim' : 'Não'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção 7: Endereço */}
              <div className="card bg-white md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Endereço
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Campo label="CEP" campo="cep" valor={cliente.cep} />
                  <Campo
                    label="Tipo de Logradouro"
                    campo="tipo_logradouro"
                    valor={cliente.tipo_logradouro}
                    opcoes={[
                      { value: 'Rua', label: 'Rua' },
                      { value: 'Avenida', label: 'Avenida' },
                      { value: 'Travessa', label: 'Travessa' },
                      { value: 'Alameda', label: 'Alameda' },
                      { value: 'Praça', label: 'Praça' },
                      { value: 'Estrada', label: 'Estrada' },
                    ]}
                  />
                  <Campo label="Endereço" campo="endereco" valor={cliente.endereco} />
                  <Campo label="Número" campo="numero_endereco" valor={cliente.numero_endereco} />
                  <Campo label="Complemento" campo="complemento" valor={cliente.complemento} />
                  <Campo label="Bairro" campo="bairro" valor={cliente.bairro} />
                  <Campo label="Cidade" campo="cidade" valor={cliente.cidade} />
                  <Campo
                    label="Estado"
                    campo="estado"
                    valor={cliente.estado}
                    opcoes={[
                      { value: 'AC', label: 'Acre' },
                      { value: 'AL', label: 'Alagoas' },
                      { value: 'AP', label: 'Amapá' },
                      { value: 'AM', label: 'Amazonas' },
                      { value: 'BA', label: 'Bahia' },
                      { value: 'CE', label: 'Ceará' },
                      { value: 'DF', label: 'Distrito Federal' },
                      { value: 'ES', label: 'Espírito Santo' },
                      { value: 'GO', label: 'Goiás' },
                      { value: 'MA', label: 'Maranhão' },
                      { value: 'MT', label: 'Mato Grosso' },
                      { value: 'MS', label: 'Mato Grosso do Sul' },
                      { value: 'MG', label: 'Minas Gerais' },
                      { value: 'PA', label: 'Pará' },
                      { value: 'PB', label: 'Paraíba' },
                      { value: 'PR', label: 'Paraná' },
                      { value: 'PE', label: 'Pernambuco' },
                      { value: 'PI', label: 'Piauí' },
                      { value: 'RJ', label: 'Rio de Janeiro' },
                      { value: 'RN', label: 'Rio Grande do Norte' },
                      { value: 'RS', label: 'Rio Grande do Sul' },
                      { value: 'RO', label: 'Rondônia' },
                      { value: 'RR', label: 'Roraima' },
                      { value: 'SC', label: 'Santa Catarina' },
                      { value: 'SP', label: 'São Paulo' },
                      { value: 'SE', label: 'Sergipe' },
                      { value: 'TO', label: 'Tocantins' },
                    ]}
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="card bg-yellow-50 md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-yellow-200">
                  Observações
                </h3>
                {modoEdicao ? (
                  <textarea
                    value={dadosEditados.observacao || ''}
                    onChange={(e) => handleChange('observacao', e.target.value)}
                    placeholder="Adicione observações sobre o cliente..."
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {cliente.observacao || 'Nenhuma observação registrada.'}
                  </p>
                )}
              </div>
            </div>

            {/* Atividades / Follow-ups */}
            {!modoEdicao && (
              <div className="mt-6">
                <AtividadesCliente clienteId={cliente.id} clienteNome={cliente.nome} />
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            {modoEdicao ? (
              <>
                <button
                  onClick={cancelarEdicao}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarAlteracoes}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center gap-2"
                  disabled={salvando}
                >
                  {salvando ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Salvar Alterações
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClienteModal;
