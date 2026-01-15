import { Draggable } from '@hello-pangea/dnd';

const ClienteCard = ({ cliente, index, cor, onClickDetalhes }) => {
  // Formatar CPF
  const formatarCPF = (cpf) => {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Formatar telefone
  const formatarTelefone = (telefone) => {
    if (!telefone) return '';
    return telefone;
  };

  // Formatar data
  const formatarData = (data) => {
    if (!data) return '';
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

  return (
    <Draggable draggableId={String(cliente.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-lg shadow-md p-3 mb-2 border-l-4 transition-all ${
            snapshot.isDragging ? 'shadow-xl rotate-2 scale-105' : 'hover:shadow-lg'
          }`}
          style={{
            borderLeftColor: cor?.replace('bg-', '') || '#667eea',
            ...provided.draggableProps.style,
          }}
        >
          {/* Nome do cliente */}
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-900 text-base flex-1">
              {cliente.nome}
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClickDetalhes();
              }}
              className="ml-2 text-gray-400 hover:text-primary-600 transition-colors"
              title="Ver detalhes"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>

          {/* Badge de Valor da Carta */}
          {cliente.valor_carta && (
            <div className="mb-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-2">
              <p className="text-xs text-green-700 font-medium">Valor da Carta</p>
              <p className="text-lg font-bold text-green-900">
                {formatarValor(cliente.valor_carta)}
              </p>
            </div>
          )}

          {/* Informações do cliente */}
          <div className="space-y-1 text-sm text-gray-600 mb-3">
            {cliente.cpf && (
              <p className="truncate">
                <span className="font-medium">CPF:</span> {formatarCPF(cliente.cpf)}
              </p>
            )}
            {(cliente.telefone_celular || cliente.telefone) && (
              <p className="truncate">
                <span className="font-medium">Celular:</span>{' '}
                {formatarTelefone(cliente.telefone_celular || cliente.telefone)}
              </p>
            )}
            {cliente.email && (
              <p className="truncate" title={cliente.email}>
                <span className="font-medium">Email:</span> {cliente.email}
              </p>
            )}
            {cliente.data_nascimento && (
              <p>
                <span className="font-medium">Data Nasc.:</span>{' '}
                {formatarData(cliente.data_nascimento)}
              </p>
            )}
            {cliente.cidade && cliente.estado && (
              <p className="truncate">
                <span className="font-medium">Local:</span>{' '}
                {cliente.cidade}/{cliente.estado}
              </p>
            )}
            {cliente.administradora && (
              <p className="truncate" title={cliente.administradora}>
                <span className="font-medium">Admin:</span>{' '}
                {cliente.administradora}
              </p>
            )}
          </div>

          {/* Observações (preview) */}
          {cliente.observacao && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 italic line-clamp-2">
                {cliente.observacao}
              </p>
            </div>
          )}

          {/* Vendedor responsável */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 truncate">
              Vendedor: <span className="font-medium">{cliente.vendedor_nome}</span>
            </p>
          </div>

          {/* Último Follow-up */}
          <div className="mt-2 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {cliente.ultimo_followup ? (
              <p className="text-xs text-gray-500">
                Último contato: <span className="font-medium">{formatarData(cliente.ultimo_followup)}</span>
              </p>
            ) : (
              <p className="text-xs text-orange-500 font-medium">
                Sem registro de contato
              </p>
            )}
          </div>

          {/* Botão para ver mais detalhes */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClickDetalhes();
            }}
            className="mt-3 w-full bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium py-2 rounded transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ver Detalhes
          </button>
        </div>
      )}
    </Draggable>
  );
};

export default ClienteCard;
