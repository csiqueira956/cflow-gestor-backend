const PlanCard = ({ plan, isSelected, onSelect, isPopular }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatFeature = (feature) => {
    if (typeof feature === 'string') return feature;
    return feature.name || feature;
  };

  return (
    <div
      className={`relative bg-white rounded-xl shadow-lg p-6 transition-all duration-300 cursor-pointer hover:shadow-2xl ${
        isSelected ? 'ring-4 ring-primary-500 scale-105' : 'hover:scale-102'
      } ${isPopular ? 'border-4 border-primary-500' : 'border border-gray-200'}`}
      onClick={onSelect}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
          Mais Popular
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
        {plan.description && (
          <p className="text-gray-600 text-sm">{plan.description}</p>
        )}
      </div>

      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-gray-900">
          {formatPrice(plan.price)}
        </div>
        <div className="text-gray-600 text-sm mt-1">
          por {plan.billing_cycle === 'monthly' ? 'mês' : 'ano'}
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center text-gray-700">
          <svg className="w-5 h-5 text-primary-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
          <span className="text-sm">
            {plan.max_users === -1 ? 'Usuários ilimitados' : `Até ${plan.max_users} usuários`}
          </span>
        </div>

        <div className="flex items-center text-gray-700">
          <svg className="w-5 h-5 text-primary-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">
            {plan.max_leads === -1 ? 'Leads ilimitados' : `Até ${plan.max_leads} leads`}
          </span>
        </div>

        <div className="flex items-center text-gray-700">
          <svg className="w-5 h-5 text-primary-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
            <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
            <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
          </svg>
          <span className="text-sm">
            {plan.max_storage_gb === -1 ? 'Armazenamento ilimitado' : `${plan.max_storage_gb} GB de armazenamento`}
          </span>
        </div>
      </div>

      {plan.features && plan.features.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <div className="text-sm font-semibold text-gray-900 mb-3">Recursos inclusos:</div>
          <ul className="space-y-2">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-600">{formatFeature(feature)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        className={`w-full mt-6 py-3 px-4 rounded-lg font-semibold transition-colors ${
          isSelected
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {isSelected ? 'Plano Selecionado' : 'Selecionar Plano'}
      </button>
    </div>
  );
};

export default PlanCard;
