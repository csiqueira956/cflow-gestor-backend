import { Draggable } from '@hello-pangea/dnd';

const ClienteCard = ({ cliente, index, cor, onClickDetalhes, onDelete }) => {
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

  // Formatar telefone para WhatsApp (wa.me)
  const formatarTelefoneWhatsApp = (telefone) => {
    if (!telefone) return null;
    // Remove tudo que não é número
    let numero = telefone.replace(/\D/g, '');
    // Se não começar com 55, adiciona o código do Brasil
    if (!numero.startsWith('55')) {
      numero = '55' + numero;
    }
    return numero;
  };

  const abrirWhatsApp = (e) => {
    e.stopPropagation();
    const telefone = cliente.telefone_celular || cliente.telefone;
    const numeroFormatado = formatarTelefoneWhatsApp(telefone);
    if (numeroFormatado) {
      window.open(`https://wa.me/${numeroFormatado}`, '_blank');
    }
  };

  const ligar = (e) => {
    e.stopPropagation();
    const telefone = cliente.telefone_celular || cliente.telefone;
    if (telefone) {
      const numeroLimpo = telefone.replace(/\D/g, '');
      window.open(`tel:${numeroLimpo}`, '_self');
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${cliente.nome}"?\n\nEsta ação não pode ser desfeita.`)) {
      onDelete(cliente.id);
    }
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

          {/* Botões de ação */}
          <div className="mt-3 space-y-2">
            {/* Linha 1: WhatsApp + Ligar */}
            {(cliente.telefone_celular || cliente.telefone) && (
              <div className="flex gap-2">
                <button
                  onClick={abrirWhatsApp}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium py-2 rounded transition-colors flex items-center justify-center gap-1"
                  title="Abrir WhatsApp"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </button>
                <button
                  onClick={ligar}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-2 rounded transition-colors flex items-center justify-center gap-1"
                  title="Ligar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Ligar
                </button>
              </div>
            )}

            {/* Linha 2: Editar + Excluir */}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClickDetalhes();
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium py-2 rounded transition-colors flex items-center justify-center gap-1"
                title="Editar cliente"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </button>
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium py-2 rounded transition-colors flex items-center justify-center gap-1"
                  title="Excluir cliente"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Excluir
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default ClienteCard;
