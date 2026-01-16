import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { simuladorAPI, administradorasAPI } from '../api/api';

const Simulador = () => {
  const navigate = useNavigate();
  const [administradoras, setAdministradoras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [showCriarLead, setShowCriarLead] = useState(false);
  const [criandoLead, setCriandoLead] = useState(false);

  const [formData, setFormData] = useState({
    categoria: 'imovel',
    administradora_id: '',
    valor_credito: '',
    prazo_meses: '120',
  });

  const [leadData, setLeadData] = useState({
    nome: '',
    email: '',
    celular: '',
  });

  const categorias = [
    { value: 'imovel', label: 'Imóvel', icon: '🏠' },
    { value: 'veiculo', label: 'Veículo', icon: '🚗' },
    { value: 'moto', label: 'Moto', icon: '🏍️' },
    { value: 'servico', label: 'Serviço', icon: '🛠️' },
  ];

  const prazosComuns = [
    { value: '60', label: '60 meses (5 anos)' },
    { value: '80', label: '80 meses' },
    { value: '100', label: '100 meses' },
    { value: '120', label: '120 meses (10 anos)' },
    { value: '150', label: '150 meses' },
    { value: '180', label: '180 meses (15 anos)' },
    { value: '200', label: '200 meses' },
  ];

  useEffect(() => {
    carregarAdministradoras();
  }, []);

  const carregarAdministradoras = async () => {
    try {
      setLoading(true);
      const response = await administradorasAPI.listar();
      setAdministradoras(response.data?.data?.administradoras || response.data?.administradoras || []);
    } catch (error) {
      console.error('Erro ao carregar administradoras:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '';
    const number = parseFloat(value.toString().replace(/\D/g, '')) / 100;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const parseCurrency = (value) => {
    if (!value) return 0;
    return parseFloat(value.toString().replace(/\D/g, '')) / 100;
  };

  const handleCurrencyChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, valor_credito: value });
  };

  const handleCalcular = async () => {
    const valorCredito = parseCurrency(formData.valor_credito);

    if (!valorCredito || valorCredito <= 0) {
      toast.error('Informe o valor do crédito');
      return;
    }

    if (!formData.prazo_meses) {
      toast.error('Selecione o prazo');
      return;
    }

    try {
      setCalculando(true);
      setResultado(null);

      const response = await simuladorAPI.calcular({
        categoria: formData.categoria,
        administradora_id: formData.administradora_id || null,
        valor_credito: valorCredito,
        prazo_meses: parseInt(formData.prazo_meses),
      });

      setResultado(response.data?.data);
    } catch (error) {
      console.error('Erro ao calcular simulação:', error);
      toast.error('Erro ao calcular simulação');
    } finally {
      setCalculando(false);
    }
  };

  const handleCriarLead = async () => {
    if (!leadData.nome) {
      toast.error('Informe o nome do cliente');
      return;
    }

    try {
      setCriandoLead(true);

      const simulacaoDados = resultado?.comparativo
        ? resultado.simulacoes[0]
        : resultado?.simulacao;

      await simuladorAPI.criarLead({
        nome: leadData.nome,
        email: leadData.email,
        celular: leadData.celular,
        simulacao_dados: simulacaoDados,
        administradora_id: simulacaoDados?.administradora_id,
      });

      toast.success('Lead criado com sucesso!');
      setShowCriarLead(false);
      setLeadData({ nome: '', email: '', celular: '' });

      // Perguntar se quer ir para o kanban
      if (window.confirm('Lead criado! Deseja ir para o Kanban?')) {
        navigate('/kanban');
      }
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      toast.error('Erro ao criar lead');
    } finally {
      setCriandoLead(false);
    }
  };

  const formatarMoeda = (valor) => {
    return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Simulador de Consórcio</h1>
          <p className="text-gray-600 mt-2">Calcule a parcela e compare com financiamento</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário de Simulação */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Dados da Simulação</h2>

            {/* Categoria */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Categoria</label>
              <div className="grid grid-cols-4 gap-3">
                {categorias.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setFormData({ ...formData, categoria: cat.value })}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      formData.categoria === cat.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{cat.icon}</span>
                    <span className="text-sm font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Administradora */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Administradora (opcional)
              </label>
              <select
                value={formData.administradora_id}
                onChange={(e) => setFormData({ ...formData, administradora_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Comparar todas</option>
                {administradoras.map((adm) => (
                  <option key={adm.id} value={adm.id}>
                    {adm.nome}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Deixe em branco para comparar todas as administradoras
              </p>
            </div>

            {/* Valor do Crédito */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor do Crédito
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <input
                  type="text"
                  value={formData.valor_credito ? formatCurrency(formData.valor_credito).replace('R$', '').trim() : ''}
                  onChange={handleCurrencyChange}
                  placeholder="0,00"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                />
              </div>
            </div>

            {/* Prazo */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Prazo</label>
              <select
                value={formData.prazo_meses}
                onChange={(e) => setFormData({ ...formData, prazo_meses: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {prazosComuns.map((prazo) => (
                  <option key={prazo.value} value={prazo.value}>
                    {prazo.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Botão Calcular */}
            <button
              onClick={handleCalcular}
              disabled={calculando}
              className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {calculando ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Calculando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Calcular Simulação
                </>
              )}
            </button>
          </div>

          {/* Resultado da Simulação */}
          <div className="space-y-6">
            {resultado ? (
              <>
                {/* Card Principal */}
                <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl shadow-lg p-6 text-white">
                  <h3 className="text-lg font-medium opacity-90 mb-4">Resultado da Simulação</h3>

                  {resultado.comparativo ? (
                    // Comparativo de múltiplas administradoras
                    <div className="space-y-4">
                      {resultado.simulacoes.map((sim, index) => (
                        <div key={index} className={`p-4 rounded-xl ${index === 0 ? 'bg-white/20' : 'bg-white/10'}`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{sim.administradora_nome}</span>
                            {index === 0 && (
                              <span className="bg-green-400 text-green-900 text-xs px-2 py-1 rounded-full font-bold">
                                MELHOR OPÇÃO
                              </span>
                            )}
                          </div>
                          <div className="text-3xl font-bold">{formatarMoeda(sim.parcela_mensal)}</div>
                          <div className="text-sm opacity-80">por mês</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Simulação única
                    <div>
                      <div className="text-sm opacity-80 mb-1">{resultado.simulacao?.administradora_nome}</div>
                      <div className="text-4xl font-bold mb-2">
                        {formatarMoeda(resultado.simulacao?.parcela_mensal)}
                      </div>
                      <div className="text-sm opacity-80">por mês</div>
                    </div>
                  )}
                </div>

                {/* Detalhes */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Detalhes do Consórcio</h3>

                  {(() => {
                    const sim = resultado.comparativo ? resultado.simulacoes[0] : resultado.simulacao;
                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">Valor do Crédito</span>
                          <span className="font-semibold">{formatarMoeda(sim?.valor_credito)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">Prazo</span>
                          <span className="font-semibold">{sim?.prazo_meses} meses</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">Taxa de Administração ({sim?.taxa_administracao}%)</span>
                          <span className="font-semibold">{formatarMoeda(sim?.valor_taxa_adm)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">Fundo de Reserva ({sim?.fundo_reserva}%)</span>
                          <span className="font-semibold">{formatarMoeda(sim?.valor_fundo_reserva)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">Seguro Total</span>
                          <span className="font-semibold">{formatarMoeda(sim?.valor_seguro_total)}</span>
                        </div>
                        <div className="flex justify-between py-3 bg-gray-50 rounded-lg px-3 -mx-3">
                          <span className="font-semibold text-gray-900">Total a Pagar</span>
                          <span className="font-bold text-lg text-primary-600">{formatarMoeda(sim?.total_pagar)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Comparativo com Financiamento */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border border-green-200">
                  <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Economia vs Financiamento
                  </h3>

                  {(() => {
                    const sim = resultado.comparativo ? resultado.simulacoes[0] : resultado.simulacao;
                    const comp = sim?.comparativo_financiamento;
                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600">Parcela Financiamento (1,5% a.m.)</span>
                          <span className="font-semibold text-red-600">{formatarMoeda(comp?.parcela_financiamento)}</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600">Total Financiamento</span>
                          <span className="font-semibold text-red-600">{formatarMoeda(comp?.total_financiamento)}</span>
                        </div>
                        <div className="flex justify-between py-3 bg-green-100 rounded-lg px-3 -mx-3">
                          <span className="font-semibold text-green-800">Sua Economia</span>
                          <span className="font-bold text-xl text-green-600">
                            {formatarMoeda(comp?.economia)} ({comp?.economia_percentual}%)
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Ações */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCriarLead(true)}
                    className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Criar Lead
                  </button>
                  <button
                    onClick={() => {
                      const sim = resultado.comparativo ? resultado.simulacoes[0] : resultado.simulacao;
                      const texto = `*SIMULAÇÃO DE CONSÓRCIO*\n\n` +
                        `📊 *${sim?.categoria?.toUpperCase()}*\n` +
                        `💰 Crédito: ${formatarMoeda(sim?.valor_credito)}\n` +
                        `📅 Prazo: ${sim?.prazo_meses} meses\n` +
                        `💵 Parcela: *${formatarMoeda(sim?.parcela_mensal)}*\n\n` +
                        `✅ Economia vs Financiamento: ${formatarMoeda(sim?.comparativo_financiamento?.economia)}\n\n` +
                        `_Simulação feita pelo Cflow CRM_`;
                      const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
                      window.open(url, '_blank');
                    }}
                    className="py-3 px-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </button>
                </div>
              </>
            ) : (
              // Estado vazio
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Faça sua Simulação</h3>
                <p className="text-gray-600">
                  Preencha os dados ao lado e clique em "Calcular Simulação" para ver os resultados.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Criar Lead */}
      {showCriarLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Criar Lead</h3>
            <p className="text-gray-600 mb-6">
              Adicione os dados do cliente para criar um lead com a simulação.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={leadData.nome}
                  onChange={(e) => setLeadData({ ...leadData, nome: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Nome do cliente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={leadData.email}
                  onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
                <input
                  type="tel"
                  value={leadData.celular}
                  onChange={(e) => setLeadData({ ...leadData, celular: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCriarLead(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCriarLead}
                disabled={criandoLead}
                className="flex-1 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
              >
                {criandoLead ? 'Criando...' : 'Criar Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Simulador;
