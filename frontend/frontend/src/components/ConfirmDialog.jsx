import { useEffect } from 'react';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar ação',
  message = 'Tem certeza que deseja continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger', // 'danger', 'warning', 'info'
  loading = false,
}) => {
  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600',
      buttonColor: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
    },
    info: {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
    },
  };

  const style = typeStyles[type] || typeStyles.danger;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={!loading ? onClose : undefined}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />

        {/* Modal */}
        <div
          className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Ícone */}
            <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${style.bgColor} mb-4`}>
              <div className={style.iconColor}>{style.icon}</div>
            </div>

            {/* Título */}
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">{title}</h3>

            {/* Mensagem */}
            <p className="text-sm text-gray-600 text-center mb-6">{message}</p>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${style.buttonColor}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processando...
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
