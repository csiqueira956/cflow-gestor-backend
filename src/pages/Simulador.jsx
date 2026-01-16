import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { simuladorAPI, administradorasAPI } from '../api/api';

const Simulador = () => {
  const navigate = useNavigate();
  const resultadoRef = useRef(null);
  const [administradoras, setAdministradoras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [showCriarLead, setShowCriarLead] = useState(false);
  const [criandoLead, setCriandoLead] = useState(false);
  const [showTaxasPersonalizadas, setShowTaxasPersonalizadas] = useState(false);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('resumo'); // resumo, parcelas, lance

  const [formData, setFormData] = useState({
    categoria: 'imovel',
    administradora_id: '',
    valor_credito: '',
    prazo_meses: '120',
  });

  // Taxas personalizadas
  const [taxasPersonalizadas, setTaxasPersonalizadas] = useState({
    usar_personalizadas: false,
    taxa_administracao: '18',
    fundo_reserva: '2',
    seguro_vida: '0.03',
  });

  // Percentuais personalizáveis
  const [percentuaisReduzidos, setPercentuaisReduzidos] = useState([50, 70]);
  const [percentuaisLances, setPercentuaisLances] = useState([10, 15, 20, 25, 30]);
  const [novoPercentualReduzido, setNovoPercentualReduzido] = useState('');
  const [novoPercentualLance, setNovoPercentualLance] = useState('');

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

  const calcularComTaxasPersonalizadas = (valorCredito, prazoMeses) => {
    const credito = parseFloat(valorCredito);
    const prazo = parseInt(prazoMeses);
    const taxaAdm = parseFloat(taxasPersonalizadas.taxa_administracao) / 100;
    const fundoReserva = parseFloat(taxasPersonalizadas.fundo_reserva) / 100;
    const seguroMensal = parseFloat(taxasPersonalizadas.seguro_vida) / 100;

    // Cálculos básicos
    const valorTaxaAdm = credito * taxaAdm;
    const valorFundoReserva = credito * fundoReserva;
    const valorSeguroTotal = credito * seguroMensal * prazo;
    const totalPagar = credito + valorTaxaAdm + valorFundoReserva + valorSeguroTotal;
    const parcelaMensal = totalPagar / prazo;

    // Comparativo com financiamento (estimativa com juros de 1.5% a.m.)
    const taxaFinanciamento = 0.015;
    const parcelaFinanciamento = credito * (taxaFinanciamento * Math.pow(1 + taxaFinanciamento, prazo)) / (Math.pow(1 + taxaFinanciamento, prazo) - 1);
    const totalFinanciamento = parcelaFinanciamento * prazo;
    const economiaVsFinanciamento = totalFinanciamento - totalPagar;

    // Parcelas reduzidas (até contemplação) - usando percentuais personalizados
    const parcelasReduzidas = percentuaisReduzidos.sort((a, b) => b - a).map(percentual => ({
      percentual,
      valor: Math.round(parcelaMensal * (percentual / 100) * 100) / 100,
      economia: 100 - percentual
    }));

    // Estudo de lance (percentuais sobre o crédito) - usando percentuais personalizados
    const lances = percentuaisLances.sort((a, b) => a - b).map(percentual => ({
      percentual,
      valor: Math.round(credito * (percentual / 100) * 100) / 100,
      // Após lance embutido, parcela reduz proporcionalmente
      parcelaPosLance: Math.round(((totalPagar - (credito * percentual / 100)) / prazo) * 100) / 100
    }));

    // Parcela pós contemplação (considerando diferentes momentos)
    // Simulação: contemplação no mês 12, 24, 36, 48
    const parcelasPosContemplacao = [12, 24, 36, 48].map(mesContemplacao => {
      const parcelasPagas = mesContemplacao;
      const valorPago = parcelaMensal * parcelasPagas;
      const saldoDevedor = totalPagar - valorPago;
      const mesesRestantes = prazo - mesContemplacao;
      const parcelaPosContemplacao = mesesRestantes > 0 ? saldoDevedor / mesesRestantes : 0;

      return {
        mesContemplacao,
        parcelasPagas,
        valorPago: Math.round(valorPago * 100) / 100,
        saldoDevedor: Math.round(saldoDevedor * 100) / 100,
        mesesRestantes,
        parcelaPosContemplacao: Math.round(parcelaPosContemplacao * 100) / 100
      };
    });

    return {
      administradora_nome: 'Taxas Personalizadas',
      categoria: formData.categoria,
      valor_credito: credito,
      prazo_meses: prazo,
      taxa_administracao: parseFloat(taxasPersonalizadas.taxa_administracao),
      fundo_reserva: parseFloat(taxasPersonalizadas.fundo_reserva),
      seguro_mensal: parseFloat(taxasPersonalizadas.seguro_vida),
      valor_taxa_adm: Math.round(valorTaxaAdm * 100) / 100,
      valor_fundo_reserva: Math.round(valorFundoReserva * 100) / 100,
      valor_seguro_total: Math.round(valorSeguroTotal * 100) / 100,
      total_pagar: Math.round(totalPagar * 100) / 100,
      parcela_mensal: Math.round(parcelaMensal * 100) / 100,
      // Novas informações
      parcelas_reduzidas: parcelasReduzidas,
      lances,
      parcelas_pos_contemplacao: parcelasPosContemplacao,
      comparativo_financiamento: {
        parcela_financiamento: Math.round(parcelaFinanciamento * 100) / 100,
        total_financiamento: Math.round(totalFinanciamento * 100) / 100,
        economia: Math.round(economiaVsFinanciamento * 100) / 100,
        economia_percentual: Math.round((economiaVsFinanciamento / totalFinanciamento) * 10000) / 100
      }
    };
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

      // Sempre calcular localmente para ter todas as informações
      const simulacao = calcularComTaxasPersonalizadas(valorCredito, formData.prazo_meses);
      setResultado({ simulacao, comparativo: false });

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

  const gerarPDF = async () => {
    setGerandoPDF(true);

    try {
      const sim = resultado?.comparativo ? resultado.simulacoes[0] : resultado?.simulacao;

      const conteudoHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Simulação de Consórcio</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 30px; color: #333; background: #fff; font-size: 12px; }
            .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #4F46E5; }
            .header h1 { color: #4F46E5; font-size: 22px; margin-bottom: 5px; }
            .header p { color: #666; font-size: 12px; }
            .section { margin-bottom: 15px; background: #f8f9fa; padding: 15px; border-radius: 8px; }
            .section-title { font-size: 13px; font-weight: bold; color: #4F46E5; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #ddd; }
            .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
            .row:last-child { border-bottom: none; }
            .row .label { color: #666; }
            .row .value { font-weight: bold; color: #333; }
            .highlight { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 15px; }
            .highlight .parcela { font-size: 28px; font-weight: bold; }
            .highlight .label { opacity: 0.9; font-size: 12px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .economia { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 15px; border-radius: 8px; text-align: center; }
            .economia .valor { font-size: 20px; font-weight: bold; }
            .footer { margin-top: 20px; text-align: center; color: #999; font-size: 10px; padding-top: 15px; border-top: 1px solid #eee; }
            .badge { display: inline-block; background: #E0E7FF; color: #4F46E5; padding: 3px 10px; border-radius: 15px; font-size: 11px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #eee; font-size: 11px; }
            th { background: #f0f0f0; font-weight: bold; }
            .text-green { color: #10B981; }
            .text-red { color: #EF4444; }
            .text-blue { color: #4F46E5; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SIMULAÇÃO DE CONSÓRCIO</h1>
            <p>Cflow CRM - Gestão de Consórcios</p>
          </div>

          <div class="highlight">
            <div class="badge">${sim?.categoria?.toUpperCase() || 'IMÓVEL'}</div>
            <div class="label">Parcela Mensal</div>
            <div class="parcela">${formatarMoeda(sim?.parcela_mensal)}</div>
            <div class="label" style="margin-top: 5px;">em ${sim?.prazo_meses} meses</div>
          </div>

          <div class="grid-2">
            <div class="section">
              <div class="section-title">DADOS DA SIMULAÇÃO</div>
              <div class="row"><span class="label">Valor do Crédito</span><span class="value">${formatarMoeda(sim?.valor_credito)}</span></div>
              <div class="row"><span class="label">Prazo</span><span class="value">${sim?.prazo_meses} meses</span></div>
              <div class="row"><span class="label">Taxa Administrativa</span><span class="value">${sim?.taxa_administracao}%</span></div>
              <div class="row"><span class="label">Fundo de Reserva</span><span class="value">${sim?.fundo_reserva}%</span></div>
            </div>

            <div class="section">
              <div class="section-title">COMPOSIÇÃO DO VALOR</div>
              <div class="row"><span class="label">Taxa Administrativa</span><span class="value">${formatarMoeda(sim?.valor_taxa_adm)}</span></div>
              <div class="row"><span class="label">Fundo de Reserva</span><span class="value">${formatarMoeda(sim?.valor_fundo_reserva)}</span></div>
              <div class="row"><span class="label">Seguro de Vida</span><span class="value">${formatarMoeda(sim?.valor_seguro_total)}</span></div>
              <div class="row"><span class="label"><strong>TOTAL A PAGAR</strong></span><span class="value text-blue"><strong>${formatarMoeda(sim?.total_pagar)}</strong></span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">OPÇÕES DE PARCELAS REDUZIDAS (ATÉ CONTEMPLAÇÃO)</div>
            <table>
              <tr>
                <th>Tipo</th>
                <th>Percentual</th>
                <th>Valor da Parcela</th>
              </tr>
              <tr>
                <td>Parcela Integral</td>
                <td>100%</td>
                <td><strong>${formatarMoeda(sim?.parcela_mensal)}</strong></td>
              </tr>
              ${sim?.parcelas_reduzidas?.map(p => `
                <tr>
                  <td>Parcela Reduzida</td>
                  <td>${p.percentual}%</td>
                  <td class="text-green"><strong>${formatarMoeda(p.valor)}</strong></td>
                </tr>
              `).join('')}
            </table>
          </div>

          <div class="section">
            <div class="section-title">ESTUDO DE OFERTA DE LANCE</div>
            <table>
              <tr>
                <th>Lance (%)</th>
                <th>Valor do Lance</th>
                <th>Parcela Pós Lance</th>
              </tr>
              ${sim?.lances?.map(l => `
                <tr>
                  <td>${l.percentual}%</td>
                  <td>${formatarMoeda(l.valor)}</td>
                  <td class="text-green">${formatarMoeda(l.parcelaPosLance)}</td>
                </tr>
              `).join('')}
            </table>
          </div>

          <div class="section">
            <div class="section-title">PARCELAS PÓS CONTEMPLAÇÃO</div>
            <table>
              <tr>
                <th>Contemplação</th>
                <th>Parcelas Pagas</th>
                <th>Saldo Devedor</th>
                <th>Meses Restantes</th>
                <th>Nova Parcela</th>
              </tr>
              ${sim?.parcelas_pos_contemplacao?.map(p => `
                <tr>
                  <td>Mês ${p.mesContemplacao}</td>
                  <td>${p.parcelasPagas}</td>
                  <td>${formatarMoeda(p.saldoDevedor)}</td>
                  <td>${p.mesesRestantes}</td>
                  <td><strong>${formatarMoeda(p.parcelaPosContemplacao)}</strong></td>
                </tr>
              `).join('')}
            </table>
          </div>

          <div class="economia">
            <div style="margin-bottom: 8px; opacity: 0.9;">Economia vs Financiamento (1,5% a.m.)</div>
            <div class="valor">${formatarMoeda(sim?.comparativo_financiamento?.economia)}</div>
            <div style="font-size: 12px; opacity: 0.9; margin-top: 5px;">(${sim?.comparativo_financiamento?.economia_percentual}% de economia)</div>
          </div>

          <div class="footer">
            <p>Simulação gerada em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            <p style="margin-top: 5px;">Cflow CRM - www.cflowcrm.com.br</p>
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      printWindow.document.write(conteudoHTML);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.print();
        setGerandoPDF(false);
      }, 500);

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
      setGerandoPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="ml-20 lg:ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Simulador de Consórcio</h1>
            <p className="text-gray-600 mt-2">Calcule parcelas, estude lances e compare com financiamento</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Formulário de Simulação */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Dados da Simulação</h2>

                {/* Categoria */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Categoria</label>
                  <div className="grid grid-cols-2 gap-3">
                    {categorias.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setFormData({ ...formData, categoria: cat.value })}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          formData.categoria === cat.value
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xl block mb-1">{cat.icon}</span>
                        <span className="text-xs font-medium">{cat.label}</span>
                      </button>
                    ))}
                  </div>
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

              {/* Taxas Personalizadas */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <button
                  onClick={() => setShowTaxasPersonalizadas(!showTaxasPersonalizadas)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <span className="font-medium text-gray-700">Taxas Personalizadas</span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${showTaxasPersonalizadas ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showTaxasPersonalizadas && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    <div className="space-y-4 pt-4">
                      {/* Taxa Administrativa */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Taxa Administrativa (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={taxasPersonalizadas.taxa_administracao}
                          onChange={(e) => setTaxasPersonalizadas({
                            ...taxasPersonalizadas,
                            taxa_administracao: e.target.value
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="18"
                        />
                      </div>

                      {/* Fundo de Reserva */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fundo de Reserva (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={taxasPersonalizadas.fundo_reserva}
                          onChange={(e) => setTaxasPersonalizadas({
                            ...taxasPersonalizadas,
                            fundo_reserva: e.target.value
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="2"
                        />
                      </div>

                      {/* Seguro de Vida */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Seguro de Vida (% mensal)
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={taxasPersonalizadas.seguro_vida}
                          onChange={(e) => setTaxasPersonalizadas({
                            ...taxasPersonalizadas,
                            seguro_vida: e.target.value
                          })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="0.03"
                        />
                      </div>

                      {/* Percentuais de Parcelas Reduzidas */}
                      <div className="pt-4 border-t border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Parcelas Reduzidas (%)
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {percentuaisReduzidos.map((p) => (
                            <span
                              key={p}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                            >
                              {p}%
                              <button
                                onClick={() => setPercentuaisReduzidos(percentuaisReduzidos.filter(x => x !== p))}
                                className="hover:text-red-600"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={novoPercentualReduzido}
                            onChange={(e) => setNovoPercentualReduzido(e.target.value)}
                            placeholder="Ex: 60"
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                          />
                          <button
                            onClick={() => {
                              const valor = parseInt(novoPercentualReduzido);
                              if (valor > 0 && valor < 100 && !percentuaisReduzidos.includes(valor)) {
                                setPercentuaisReduzidos([...percentuaisReduzidos, valor]);
                                setNovoPercentualReduzido('');
                              }
                            }}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>

                      {/* Percentuais de Lance */}
                      <div className="pt-4 border-t border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Percentuais de Lance (%)
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {percentuaisLances.map((p) => (
                            <span
                              key={p}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                            >
                              {p}%
                              <button
                                onClick={() => setPercentuaisLances(percentuaisLances.filter(x => x !== p))}
                                className="hover:text-red-600"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={novoPercentualLance}
                            onChange={(e) => setNovoPercentualLance(e.target.value)}
                            placeholder="Ex: 35"
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                          />
                          <button
                            onClick={() => {
                              const valor = parseInt(novoPercentualLance);
                              if (valor > 0 && valor <= 100 && !percentuaisLances.includes(valor)) {
                                setPercentuaisLances([...percentuaisLances, valor]);
                                setNovoPercentualLance('');
                              }
                            }}
                            className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Resultado da Simulação */}
            <div className="xl:col-span-2 space-y-6" ref={resultadoRef}>
              {resultado ? (
                <>
                  {/* Card Principal */}
                  <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl shadow-lg p-6 text-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm opacity-80 mb-1">{resultado.simulacao?.administradora_nome || 'Simulação Personalizada'}</div>
                        <div className="text-4xl font-bold mb-2">
                          {formatarMoeda(resultado.simulacao?.parcela_mensal)}
                        </div>
                        <div className="text-sm opacity-80">por mês • {resultado.simulacao?.prazo_meses} parcelas</div>
                      </div>
                      <div className="text-right">
                        <div className="bg-white/20 px-3 py-1 rounded-lg text-sm mb-2">
                          Crédito: {formatarMoeda(resultado.simulacao?.valor_credito)}
                        </div>
                        <div className="bg-green-400/30 px-3 py-1 rounded-lg text-sm">
                          Economia: {formatarMoeda(resultado.simulacao?.comparativo_financiamento?.economia)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Abas */}
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="flex border-b">
                      {[
                        { id: 'resumo', label: 'Resumo' },
                        { id: 'parcelas', label: 'Parcelas Reduzidas' },
                        { id: 'lance', label: 'Estudo de Lance' },
                        { id: 'poscontemplacao', label: 'Pós Contemplação' },
                      ].map(aba => (
                        <button
                          key={aba.id}
                          onClick={() => setAbaAtiva(aba.id)}
                          className={`flex-1 py-4 text-sm font-medium transition-colors ${
                            abaAtiva === aba.id
                              ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {aba.label}
                        </button>
                      ))}
                    </div>

                    <div className="p-6">
                      {/* Resumo */}
                      {abaAtiva === 'resumo' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-xl p-4">
                              <div className="text-sm text-gray-500 mb-1">Taxa Administrativa</div>
                              <div className="text-lg font-bold text-gray-900">{resultado.simulacao?.taxa_administracao}%</div>
                              <div className="text-sm text-gray-600">{formatarMoeda(resultado.simulacao?.valor_taxa_adm)}</div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                              <div className="text-sm text-gray-500 mb-1">Fundo de Reserva</div>
                              <div className="text-lg font-bold text-gray-900">{resultado.simulacao?.fundo_reserva}%</div>
                              <div className="text-sm text-gray-600">{formatarMoeda(resultado.simulacao?.valor_fundo_reserva)}</div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                              <div className="text-sm text-gray-500 mb-1">Seguro de Vida Total</div>
                              <div className="text-lg font-bold text-gray-900">{formatarMoeda(resultado.simulacao?.valor_seguro_total)}</div>
                              <div className="text-sm text-gray-600">{resultado.simulacao?.seguro_mensal}% ao mês</div>
                            </div>
                            <div className="bg-primary-50 rounded-xl p-4">
                              <div className="text-sm text-primary-600 mb-1">Total a Pagar</div>
                              <div className="text-lg font-bold text-primary-700">{formatarMoeda(resultado.simulacao?.total_pagar)}</div>
                              <div className="text-sm text-primary-600">{resultado.simulacao?.prazo_meses} parcelas</div>
                            </div>
                          </div>

                          {/* Comparativo */}
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                            <div className="flex items-center gap-2 mb-3">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-semibold text-green-800">Comparativo com Financiamento</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <div className="text-xs text-gray-500">Parcela Financiamento</div>
                                <div className="font-bold text-red-600">{formatarMoeda(resultado.simulacao?.comparativo_financiamento?.parcela_financiamento)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">Total Financiamento</div>
                                <div className="font-bold text-red-600">{formatarMoeda(resultado.simulacao?.comparativo_financiamento?.total_financiamento)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">Sua Economia</div>
                                <div className="font-bold text-green-600">{formatarMoeda(resultado.simulacao?.comparativo_financiamento?.economia)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Parcelas Reduzidas */}
                      {abaAtiva === 'parcelas' && (
                        <div className="space-y-4">
                          <p className="text-gray-600 text-sm mb-4">
                            Muitas administradoras oferecem a opção de pagar parcelas reduzidas até a contemplação.
                            Após ser contemplado, o saldo é diluído nas parcelas restantes.
                          </p>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                              <div>
                                <div className="font-semibold text-gray-900">Parcela Integral (100%)</div>
                                <div className="text-sm text-gray-500">Valor normal da parcela</div>
                              </div>
                              <div className="text-2xl font-bold text-gray-900">
                                {formatarMoeda(resultado.simulacao?.parcela_mensal)}
                              </div>
                            </div>

                            {resultado.simulacao?.parcelas_reduzidas?.map((parcela, idx) => (
                              <div key={idx} className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                                <div>
                                  <div className="font-semibold text-green-800">Parcela Reduzida ({parcela.percentual}%)</div>
                                  <div className="text-sm text-green-600">Economia de {parcela.economia}% até contemplação</div>
                                </div>
                                <div className="text-2xl font-bold text-green-700">
                                  {formatarMoeda(parcela.valor)}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <div className="font-medium text-yellow-800">Importante</div>
                                <div className="text-sm text-yellow-700">
                                  Ao optar por parcela reduzida, o saldo não pago é acumulado e será diluído nas parcelas
                                  após a contemplação, aumentando o valor da parcela pós-contemplação.
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Estudo de Lance */}
                      {abaAtiva === 'lance' && (
                        <div className="space-y-4">
                          <p className="text-gray-600 text-sm mb-4">
                            Lance é um valor que você oferece para antecipar sua contemplação.
                            O valor do lance é abatido do seu crédito ou pode ser pago à parte (lance embutido).
                          </p>

                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-gray-50">
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Lance</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Valor do Lance</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Parcela Após Lance*</th>
                                </tr>
                              </thead>
                              <tbody>
                                {resultado.simulacao?.lances?.map((lance, idx) => (
                                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-4 py-3">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                        {lance.percentual}%
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-gray-900">
                                      {formatarMoeda(lance.valor)}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-green-600">
                                      {formatarMoeda(lance.parcelaPosLance)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="text-xs text-gray-500 mt-2">
                            * Parcela considerando lance embutido (valor abatido do saldo devedor)
                          </div>

                          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              <div>
                                <div className="font-medium text-blue-800">Dica</div>
                                <div className="text-sm text-blue-700">
                                  Lances entre 20% e 30% do crédito costumam ter boas chances de contemplação em assembleias.
                                  Consulte o histórico de lances vencedores da administradora.
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pós Contemplação */}
                      {abaAtiva === 'poscontemplacao' && (
                        <div className="space-y-4">
                          <p className="text-gray-600 text-sm mb-4">
                            Simulação de como ficará sua parcela após ser contemplado em diferentes momentos do plano.
                          </p>

                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-gray-50">
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contemplação</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Parcelas Pagas</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Valor Pago</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Saldo Devedor</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Meses Restantes</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nova Parcela</th>
                                </tr>
                              </thead>
                              <tbody>
                                {resultado.simulacao?.parcelas_pos_contemplacao?.map((item, idx) => (
                                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-4 py-3">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        Mês {item.mesContemplacao}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-900">{item.parcelasPagas}</td>
                                    <td className="px-4 py-3 text-gray-900">{formatarMoeda(item.valorPago)}</td>
                                    <td className="px-4 py-3 text-gray-900">{formatarMoeda(item.saldoDevedor)}</td>
                                    <td className="px-4 py-3 text-gray-900">{item.mesesRestantes}</td>
                                    <td className="px-4 py-3 font-bold text-primary-600">{formatarMoeda(item.parcelaPosContemplacao)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-gray-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div className="text-sm text-gray-600">
                                <strong>Observação:</strong> Estes valores são estimativas considerando parcela integral até a contemplação.
                                Parcelas reduzidas ou lances podem alterar estes valores.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
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
                      onClick={gerarPDF}
                      disabled={gerandoPDF}
                      className="py-3 px-4 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {gerandoPDF ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      PDF
                    </button>
                    <button
                      onClick={() => {
                        const sim = resultado.simulacao;
                        const parcelasTexto = sim?.parcelas_reduzidas?.map(p => `• ${p.percentual}%: ${formatarMoeda(p.valor)}`).join('\n') || '';
                        const texto = `*SIMULAÇÃO DE CONSÓRCIO*\n\n` +
                          `📊 *${sim?.categoria?.toUpperCase()}*\n` +
                          `💰 Crédito: ${formatarMoeda(sim?.valor_credito)}\n` +
                          `📅 Prazo: ${sim?.prazo_meses} meses\n` +
                          `💵 Parcela: *${formatarMoeda(sim?.parcela_mensal)}*\n\n` +
                          `📉 *Opções de Parcela Reduzida:*\n` +
                          `${parcelasTexto}\n\n` +
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
                    </button>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                  <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Faça sua Simulação</h3>
                  <p className="text-gray-600">
                    Preencha os dados ao lado e clique em "Calcular Simulação" para ver os resultados completos.
                  </p>
                </div>
              )}
            </div>
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
