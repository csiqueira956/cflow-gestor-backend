import { useNavigate } from 'react-router-dom';

const LimiteAtingidoModal = ({ isOpen, onClose, limiteInfo }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const {
    tipo = 'recurso',
    recurso = 'Recurso',
    atual = 0,
    maximo = 0,
    mensagem = 'Você atingiu o limite do seu plano'
  } = limiteInfo || {};

  const getTipoIcon = () => {
    switch (tipo) {
      case 'usuarios':
        return (
          <svg className="w-16 h-16 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'leads':
        return (
          <svg className="w-16 h-16 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'storage':
        return (
          <svg className="w-16 h-16 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        );
      default:
        return (
          <svg className="w-16 h-16 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
    }
  };

  const handleFazerUpgrade = () => {
    onClose();
    navigate('/minha-assinatura');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          {/* Ícone de Aviso */}
          <div className="flex justify-center mb-4">
            {getTipoIcon()}
          </div>

          {/* Título */}
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Limite Atingido
          </h3>

          {/* Mensagem */}
          <p className="text-gray-600 text-center mb-6">
            {mensagem}
          </p>

          {/* Info do Limite */}
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">
                  {recurso}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Uso atual
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-600">
                  {atual} / {maximo}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  {maximo === Infinity ? 'Ilimitado' : `Limite do plano`}
                </p>
              </div>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-orange-400 to-red-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((atual / maximo) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              {Math.round((atual / maximo) * 100)}% utilizado
            </p>
          </div>

          {/* Chamada para Ação */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">
              Precisa de mais {recurso.toLowerCase()}?
            </h4>
            <p className="text-sm text-blue-700 mb-3">
              Faça upgrade do seu plano e desbloqueie mais recursos para seu negócio crescer!
            </p>
            <ul className="text-sm text-blue-600 space-y-1">
              <li className="flex items-start">
                <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Mais limites de recursos</span>
              </li>
              <li className="flex items-start">
                <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Funcionalidades avançadas</span>
              </li>
              <li className="flex items-start">
                <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Suporte prioritário</span>
              </li>
            </ul>
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Fechar
            </button>
            <button
              onClick={handleFazerUpgrade}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Fazer Upgrade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LimiteAtingidoModal;
