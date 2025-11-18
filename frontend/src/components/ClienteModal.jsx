import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { clientesAPI } from '../api/api';

const ClienteModal = ({ cliente, onClose, onAtualizar }) => {
  const [modoEdicao, setModoEdicao] = useState(false);
  const [dadosEditados, setDadosEditados] = useState(cliente);
  const [salvando, setSalvando] = useState(false);

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

  // Formatar CPF
  const formatarCPF = (cpf) => {
    if (!cpf) return 'Não informado';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Formatar CEP
  const formatarCEP = (cep) => {
    if (!cep) return 'Não informado';
    return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  // Formatar telefone
  const formatarTelefone = (telefone) => {
    if (!telefone) return 'Não informado';
    return telefone;
  };

  // Formatar data
  const formatarData = (data) => {
    if (!data) return 'Não informado';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
  };

  // Formatar valor
  const formatarValor = (valor) => {
    if (!valor) return 'Não informado';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  // Mapa de etapas
  const etapasNomes = {
    novo_contato: 'Novo Contato',
    proposta_enviada: 'Proposta Enviada',
    negociacao: 'Em Negociação',
    fechado: 'Fechado',
    perdido: 'Perdido',
  };

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
              <div className="flex gap-2">
                {!modoEdicao && (
                  <button
                    onClick={() => setModoEdicao(true)}
                    className="text-white hover:text-gray-200 transition-colors p-1 hover:bg-white/10 rounded"
                    title="Editar cliente"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
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
          </div>

          {/* Ações Rápidas */}
          {!modoEdicao && (
            <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
              <div className="flex gap-2 flex-wrap">
                {cliente.email && (
                  <a
                    href={`mailto:${cliente.email}`}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm border border-gray-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Enviar Email
                  </a>
                )}
                {cliente.telefone_celular && (
                  <a
                    href={`https://wa.me/55${cliente.telefone_celular.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </a>
                )}
                {cliente.telefone && (
                  <a
                    href={`tel:${cliente.telefone.replace(/\D/g, '')}`}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm border border-gray-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Ligar
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Conteúdo */}
          <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Seção 1: Dados Básicos */}
              <div className="card bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  📋 Dados Básicos
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Nome Completo</span>
                    {modoEdicao ? (
                      <input
                        type="text"
                        value={dadosEditados.nome || ''}
                        onChange={(e) => setDadosEditados({ ...dadosEditados, nome: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{cliente.nome || 'Não informado'}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">CPF</span>
                    <p className="text-gray-900">{formatarCPF(cliente.cpf)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Email</span>
                    {modoEdicao ? (
                      <input
                        type="email"
                        value={dadosEditados.email || ''}
                        onChange={(e) => setDadosEditados({ ...dadosEditados, email: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{cliente.email || 'Não informado'}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Telefone</span>
                    {modoEdicao ? (
                      <input
                        type="text"
                        value={dadosEditados.telefone || ''}
                        onChange={(e) => setDadosEditados({ ...dadosEditados, telefone: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{formatarTelefone(cliente.telefone)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção 2: Dados Pessoais */}
              <div className="card bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  👤 Dados Pessoais
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Data de Nascimento</span>
                    <p className="text-gray-900">{formatarData(cliente.data_nascimento)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Estado Civil</span>
                    <p className="text-gray-900">{cliente.estado_civil || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Nacionalidade</span>
                    <p className="text-gray-900">{cliente.nacionalidade || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Cidade de Nascimento</span>
                    <p className="text-gray-900">{cliente.cidade_nascimento || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Nome da Mãe</span>
                    <p className="text-gray-900">{cliente.nome_mae || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Profissão</span>
                    <p className="text-gray-900">{cliente.profissao || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Remuneração</span>
                    <p className="text-gray-900">{formatarValor(cliente.remuneracao)}</p>
                  </div>
                </div>
              </div>

              {/* Seção 3: Telefones */}
              <div className="card bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  📞 Telefones
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Residencial</span>
                    <p className="text-gray-900">{formatarTelefone(cliente.telefone_residencial)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Comercial</span>
                    <p className="text-gray-900">{formatarTelefone(cliente.telefone_comercial)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Celular 1</span>
                    <p className="text-gray-900">{formatarTelefone(cliente.telefone_celular)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Celular 2</span>
                    <p className="text-gray-900">{formatarTelefone(cliente.telefone_celular_2)}</p>
                  </div>
                </div>
              </div>

              {/* Seção 4: Documentos */}
              <div className="card bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  🆔 Documentos
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Tipo de Documento</span>
                    <p className="text-gray-900">{cliente.tipo_documento || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Número</span>
                    <p className="text-gray-900">{cliente.numero_documento || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Órgão Emissor</span>
                    <p className="text-gray-900">{cliente.orgao_emissor || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Data de Emissão</span>
                    <p className="text-gray-900">{formatarData(cliente.data_emissao)}</p>
                  </div>
                </div>
              </div>

              {/* Seção 5: Endereço */}
              <div className="card bg-white md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  📍 Endereço
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">CEP</span>
                    <p className="text-gray-900">{formatarCEP(cliente.cep)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Tipo de Logradouro</span>
                    <p className="text-gray-900">{cliente.tipo_logradouro || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Endereço</span>
                    <p className="text-gray-900">{cliente.endereco || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Número</span>
                    <p className="text-gray-900">{cliente.numero_endereco || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Complemento</span>
                    <p className="text-gray-900">{cliente.complemento || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Bairro</span>
                    <p className="text-gray-900">{cliente.bairro || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Cidade</span>
                    <p className="text-gray-900">{cliente.cidade || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Estado</span>
                    <p className="text-gray-900">{cliente.estado || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              {/* Seção 6: Consórcio */}
              <div className="card bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  💰 Informações do Consórcio
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Valor da Carta</span>
                    <p className="text-gray-900 font-semibold text-lg">{formatarValor(cliente.valor_carta)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Administradora</span>
                    <p className="text-gray-900">{cliente.administradora || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Grupo</span>
                    <p className="text-gray-900">{cliente.grupo || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Cota</span>
                    <p className="text-gray-900">{cliente.cota || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Aceita Seguro</span>
                    <p className="text-gray-900">{cliente.aceita_seguro ? 'Sim' : 'Não'}</p>
                  </div>
                </div>
              </div>

              {/* Seção 7: Vendedor */}
              <div className="card bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  👨‍💼 Vendedor Responsável
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Nome</span>
                    <p className="text-gray-900">{cliente.vendedor_nome || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Etapa Atual</span>
                    <p className="text-gray-900 font-medium">{etapasNomes[cliente.etapa] || cliente.etapa}</p>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="card bg-yellow-50 md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-yellow-200">
                  📝 Observações
                </h3>
                {modoEdicao ? (
                  <textarea
                    value={dadosEditados.observacao || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, observacao: e.target.value })}
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
