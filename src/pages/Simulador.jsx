import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { administradorasAPI } from '../api/api';

const Simulador = () => {
  const navigate = useNavigate();
  const resultadoRef = useRef(null);
  const [administradoras, setAdministradoras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [gerandoPDF, setGerandoPDF] = useState(false);

  // === FORMULÁRIO ===
  const [formData, setFormData] = useState({
    // 1. Categoria
    categoria: 'imovel',
    // 2. Administradora
    administradora_id: '',
    // 3. Taxas (preenchidas pela administradora ou manual)
    taxa_administracao: '17',
    fundo_reserva: '2',
    seguro_mensal: '0.031',
    // 4. Valor do Crédito
    valor_credito: '',
    // 5. Tipo de Grupo
    tipo_grupo: 'novo', // 'novo' ou 'andamento'
    // 6. Prazo (meses)
    prazo_meses: '220',
    prazo_manual: '',
    // 7. Parcela Reduzida
    usa_parcela_reduzida: false,
    percentual_reducao: '50', // % da parcela que paga até contemplação
    // 8. Lance do Cliente (Recurso Próprio)
    lance_cliente: '',
    // 9. Usar Lance Embutido
    usa_lance_embutido: false,
    // 10. Prazo para Contemplação
    prazo_contemplacao: '12', // meses até ser contemplado
  });

  const categorias = [
    { value: 'imovel', label: 'Imóvel', icon: '🏠' },
    { value: 'veiculo', label: 'Veículo', icon: '🚗' },
    { value: 'moto', label: 'Moto', icon: '🏍️' },
    { value: 'servico', label: 'Serviço', icon: '🛠️' },
  ];

  const prazosGrupoNovo = [
    { value: '220', label: '220 meses' },
    { value: '240', label: '240 meses' },
    { value: '250', label: '250 meses' },
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

  // Quando seleciona administradora, preenche as taxas
  const handleAdministradoraChange = (adminId) => {
    setFormData({ ...formData, administradora_id: adminId });

    const admin = administradoras.find(a => a.id === parseInt(adminId));
    if (admin) {
      setFormData(prev => ({
        ...prev,
        administradora_id: adminId,
        taxa_administracao: admin.taxa_administracao?.toString() || '17',
        fundo_reserva: admin.fundo_reserva?.toString() || '2',
        seguro_mensal: admin.seguro?.toString() || '0.031',
      }));
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

  const handleCreditoChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, valor_credito: value });
  };

  const handleLanceChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, lance_cliente: value });
  };

  const formatarMoeda = (valor) => {
    return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // === CÁLCULO PRINCIPAL ===
  const calcular = () => {
    const credito = parseCurrency(formData.valor_credito);
    if (!credito || credito <= 0) {
      toast.error('Informe o valor do crédito');
      return;
    }

    const prazo = formData.tipo_grupo === 'andamento'
      ? parseInt(formData.prazo_manual) || 200
      : parseInt(formData.prazo_meses);

    const taxaAdm = parseFloat(formData.taxa_administracao) / 100;
    const fundoReserva = parseFloat(formData.fundo_reserva) / 100;
    const seguroMensal = parseFloat(formData.seguro_mensal) / 100;

    // === CÁLCULOS BÁSICOS ===
    const valorTaxaAdm = credito * taxaAdm;
    const valorFundoReserva = credito * fundoReserva;
    const valorSeguroTotal = credito * seguroMensal * prazo;
    const totalPagar = credito + valorTaxaAdm + valorFundoReserva + valorSeguroTotal;
    const parcelaIntegral = totalPagar / prazo;

    // === PARCELA REDUZIDA ===
    const usaReducao = formData.usa_parcela_reduzida;
    const percentualReducao = parseFloat(formData.percentual_reducao) / 100;
    const parcelaReduzida = usaReducao ? parcelaIntegral * percentualReducao : parcelaIntegral;

    // === LANCE ===
    const lanceCliente = parseCurrency(formData.lance_cliente) || 0; // Recurso próprio
    const usaEmbutido = formData.usa_lance_embutido;

    // Lance embutido = máximo 30% do crédito
    const lanceEmbutidoMax = credito * 0.30;
    const lanceEmbutido = usaEmbutido ? lanceEmbutidoMax : 0;

    // Lance Total = Lance Cliente (recurso próprio) + Lance Embutido
    const lanceTotal = lanceCliente + lanceEmbutido;
    const percentualLance = (lanceTotal / totalPagar) * 100;
    const percentualLanceCredito = (lanceTotal / credito) * 100;

    // Crédito líquido (após abater lance embutido)
    const creditoLiquido = credito - lanceEmbutido;

    // === PÓS-CONTEMPLAÇÃO ===
    const prazoContemplacao = parseInt(formData.prazo_contemplacao) || 12;

    // Valor pago até contemplação
    let valorPagoAteContemplacao = 0;
    if (usaReducao) {
      // Pagou parcela reduzida até contemplação
      valorPagoAteContemplacao = parcelaReduzida * prazoContemplacao;
    } else {
      // Pagou parcela integral até contemplação
      valorPagoAteContemplacao = parcelaIntegral * prazoContemplacao;
    }

    // Saldo devedor após contemplação
    // Total a pagar - valor já pago - lance total
    const saldoDevedor = totalPagar - valorPagoAteContemplacao - lanceTotal;

    // Meses restantes
    const mesesRestantes = prazo - prazoContemplacao;

    // Nova parcela pós-contemplação
    const novaParcelaPosContemplacao = mesesRestantes > 0 ? saldoDevedor / mesesRestantes : 0;

    // Economia se usou parcela reduzida
    const economiaReducao = usaReducao
      ? (parcelaIntegral - parcelaReduzida) * prazoContemplacao
      : 0;

    // === RESULTADO ===
    setResultado({
      // Dados de entrada
      credito,
      prazo,
      categoria: formData.categoria,
      administradora: administradoras.find(a => a.id === parseInt(formData.administradora_id))?.nome || 'Personalizada',
      tipoGrupo: formData.tipo_grupo,

      // Taxas
      taxaAdm: parseFloat(formData.taxa_administracao),
      fundoReserva: parseFloat(formData.fundo_reserva),
      seguroMensal: parseFloat(formData.seguro_mensal),
      valorTaxaAdm,
      valorFundoReserva,
      valorSeguroTotal,
      totalPagar,

      // Parcelas
      parcelaIntegral,
      usaReducao,
      percentualReducao: parseFloat(formData.percentual_reducao),
      parcelaReduzida,

      // Lance
      lanceCliente,
      usaEmbutido,
      lanceEmbutido,
      lanceTotal,
      percentualLance,
      percentualLanceCredito,
      creditoLiquido,

      // Pós-contemplação
      prazoContemplacao,
      valorPagoAteContemplacao,
      saldoDevedor,
      mesesRestantes,
      novaParcelaPosContemplacao,
      economiaReducao,
    });

    // Scroll para resultado
    setTimeout(() => {
      resultadoRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    toast.success('Simulação calculada!');
  };

  // === GERAR PDF ===
  const gerarPDF = async () => {
    if (!resultado) return;
    setGerandoPDF(true);

    try {
      const r = resultado;

      const conteudoHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Simulação de Consórcio</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 25px; color: #333; background: #fff; font-size: 11px; }
            .header { text-align: center; margin-bottom: 15px; padding-bottom: 12px; border-bottom: 2px solid #4F46E5; }
            .header h1 { color: #4F46E5; font-size: 20px; margin-bottom: 3px; }
            .header p { color: #666; font-size: 11px; }
            .section { margin-bottom: 12px; background: #f8f9fa; padding: 12px; border-radius: 6px; }
            .section-title { font-size: 12px; font-weight: bold; color: #4F46E5; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #ddd; }
            .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee; }
            .row:last-child { border-bottom: none; }
            .row .label { color: #666; }
            .row .value { font-weight: bold; color: #333; }
            .highlight { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 15px; border-radius: 8px; margin-bottom: 12px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .text-green { color: #10B981; }
            .text-red { color: #EF4444; }
            .text-blue { color: #3B82F6; }
            .text-amber { color: #F59E0B; }
            .text-purple { color: #7C3AED; }
            .big-number { font-size: 24px; font-weight: bold; }
            .footer { margin-top: 15px; text-align: center; color: #999; font-size: 9px; padding-top: 12px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SIMULAÇÃO DE CONSÓRCIO</h1>
            <p>${r.administradora} - ${r.categoria.toUpperCase()}</p>
          </div>

          <div class="highlight">
            <div style="text-align: center;">
              <div style="font-size: 10px; opacity: 0.9;">Crédito</div>
              <div class="big-number">${formatarMoeda(r.credito)}</div>
              <div style="font-size: 10px; opacity: 0.9; margin-top: 5px;">${r.prazo} meses • Grupo ${r.tipoGrupo === 'novo' ? 'Novo' : 'em Andamento'}</div>
            </div>
          </div>

          <div class="grid-2">
            <div class="section">
              <div class="section-title">PARCELAS</div>
              <div class="row"><span class="label">Parcela Integral</span><span class="value">${formatarMoeda(r.parcelaIntegral)}</span></div>
              ${r.usaReducao ? `
                <div class="row"><span class="label">Parcela Reduzida (${r.percentualReducao}%)</span><span class="value text-green">${formatarMoeda(r.parcelaReduzida)}</span></div>
                <div class="row"><span class="label">Economia até contemplação</span><span class="value text-green">${formatarMoeda(r.economiaReducao)}</span></div>
              ` : ''}
            </div>

            <div class="section">
              <div class="section-title">COMPOSIÇÃO</div>
              <div class="row"><span class="label">Taxa Adm. (${r.taxaAdm}%)</span><span class="value">${formatarMoeda(r.valorTaxaAdm)}</span></div>
              <div class="row"><span class="label">Fundo Reserva (${r.fundoReserva}%)</span><span class="value">${formatarMoeda(r.valorFundoReserva)}</span></div>
              <div class="row"><span class="label">Seguro Total</span><span class="value">${formatarMoeda(r.valorSeguroTotal)}</span></div>
              <div class="row"><span class="label"><strong>Total a Pagar</strong></span><span class="value text-blue"><strong>${formatarMoeda(r.totalPagar)}</strong></span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">LANCE</div>
            <div class="grid-2">
              <div>
                <div class="row"><span class="label">Lance Cliente (Recurso Próprio)</span><span class="value">${formatarMoeda(r.lanceCliente)}</span></div>
                ${r.usaEmbutido ? `
                  <div class="row"><span class="label">Lance Embutido (30% do crédito)</span><span class="value text-purple">${formatarMoeda(r.lanceEmbutido)}</span></div>
                  <div class="row"><span class="label text-red">⚠️ Abate do crédito</span><span class="value text-red">-${formatarMoeda(r.lanceEmbutido)}</span></div>
                ` : ''}
                <div class="row"><span class="label"><strong>LANCE TOTAL</strong></span><span class="value text-blue"><strong>${formatarMoeda(r.lanceTotal)}</strong></span></div>
              </div>
              <div>
                <div class="row"><span class="label">% do Total a Pagar</span><span class="value">${r.percentualLance.toFixed(1)}%</span></div>
                <div class="row"><span class="label">% do Crédito</span><span class="value">${r.percentualLanceCredito.toFixed(1)}%</span></div>
                ${r.usaEmbutido ? `
                  <div class="row"><span class="label"><strong>Crédito Líquido</strong></span><span class="value text-amber"><strong>${formatarMoeda(r.creditoLiquido)}</strong></span></div>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="section" style="background: linear-gradient(135deg, #10B981, #059669); color: white;">
            <div class="section-title" style="color: white; border-color: rgba(255,255,255,0.3);">PÓS-CONTEMPLAÇÃO (Mês ${r.prazoContemplacao})</div>
            <div class="grid-2" style="text-align: center;">
              <div>
                <div style="opacity: 0.9; font-size: 10px;">Valor pago até contemplação</div>
                <div style="font-size: 16px; font-weight: bold;">${formatarMoeda(r.valorPagoAteContemplacao)}</div>
              </div>
              <div>
                <div style="opacity: 0.9; font-size: 10px;">Saldo Devedor</div>
                <div style="font-size: 16px; font-weight: bold;">${formatarMoeda(r.saldoDevedor)}</div>
              </div>
            </div>
            <div style="text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.3);">
              <div style="opacity: 0.9; font-size: 10px;">NOVA PARCELA</div>
              <div style="font-size: 28px; font-weight: bold;">${formatarMoeda(r.novaParcelaPosContemplacao)}</div>
              <div style="opacity: 0.9; font-size: 10px;">por mais ${r.mesesRestantes} meses</div>
            </div>
          </div>

          <div class="footer">
            <p>Simulação gerada em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            <p style="margin-top: 3px;">Cflow CRM - www.cflowcrm.com.br</p>
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Simulador de Consórcio</h1>
            <p className="text-gray-600 mt-2">Calcule parcelas, lance e nova parcela pós-contemplação</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* === FORMULÁRIO === */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Dados da Simulação</h2>

              {/* 1. Categoria */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">1. Categoria</label>
                <div className="grid grid-cols-4 gap-2">
                  {categorias.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, categoria: cat.value })}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${
                        formData.categoria === cat.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl mb-1">{cat.icon}</span>
                      <span className="text-xs font-medium">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Administradora */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">2. Administradora</label>
                <select
                  value={formData.administradora_id}
                  onChange={(e) => handleAdministradoraChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Selecione ou use taxas manuais</option>
                  {administradoras.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.nome} - {admin.taxa_administracao}% adm
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Taxas */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 mb-3">3. Taxas</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Taxa Adm. (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.taxa_administracao}
                      onChange={(e) => setFormData({ ...formData, taxa_administracao: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fundo Res. (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.fundo_reserva}
                      onChange={(e) => setFormData({ ...formData, fundo_reserva: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Seguro (%/mês)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.seguro_mensal}
                      onChange={(e) => setFormData({ ...formData, seguro_mensal: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Valor do Crédito */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">4. Valor do Crédito</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="text"
                    value={formatCurrency(formData.valor_credito)}
                    onChange={handleCreditoChange}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 text-lg font-semibold"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* 5. Tipo de Grupo */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">5. Tipo de Grupo</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_grupo: 'novo' })}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      formData.tipo_grupo === 'novo'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">Grupo Novo</div>
                    <div className="text-xs text-gray-500">Prazo fixo</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo_grupo: 'andamento' })}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      formData.tipo_grupo === 'andamento'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">Em Andamento</div>
                    <div className="text-xs text-gray-500">Prazo editável</div>
                  </button>
                </div>
              </div>

              {/* 6. Prazo */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">6. Prazo (meses)</label>
                {formData.tipo_grupo === 'novo' ? (
                  <select
                    value={formData.prazo_meses}
                    onChange={(e) => setFormData({ ...formData, prazo_meses: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  >
                    {prazosGrupoNovo.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={formData.prazo_manual}
                    onChange={(e) => setFormData({ ...formData, prazo_manual: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                    placeholder="Ex: 180"
                  />
                )}
              </div>

              {/* 7. Parcela Reduzida */}
              <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-green-800">7. Parcela Reduzida?</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, usa_parcela_reduzida: !formData.usa_parcela_reduzida })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      formData.usa_parcela_reduzida ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      formData.usa_parcela_reduzida ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>
                {formData.usa_parcela_reduzida && (
                  <div>
                    <label className="block text-xs text-green-700 mb-1">Percentual da parcela (%)</label>
                    <input
                      type="number"
                      value={formData.percentual_reducao}
                      onChange={(e) => setFormData({ ...formData, percentual_reducao: e.target.value })}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm"
                      placeholder="50"
                    />
                    <p className="text-xs text-green-600 mt-1">Paga {formData.percentual_reducao}% da parcela até ser contemplado</p>
                  </div>
                )}
              </div>

              {/* 8. Lance */}
              <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <label className="block text-sm font-medium text-blue-800 mb-3">8. Lance</label>

                <div className="mb-3">
                  <label className="block text-xs text-blue-700 mb-1">Lance do Cliente (Recurso Próprio)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                    <input
                      type="text"
                      value={formatCurrency(formData.lance_cliente)}
                      onChange={handleLanceChange}
                      className="w-full pl-10 pr-4 py-2 border border-blue-300 rounded-lg text-sm"
                      placeholder="0,00 (opcional)"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-100 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-purple-800">Usar Lance Embutido?</div>
                    <div className="text-xs text-purple-600">Até 30% do crédito (abate do crédito líquido)</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, usa_lance_embutido: !formData.usa_lance_embutido })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      formData.usa_lance_embutido ? 'bg-purple-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      formData.usa_lance_embutido ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>
              </div>

              {/* 9. Prazo para Contemplação */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">9. Prazo para Contemplação (meses)</label>
                <input
                  type="number"
                  value={formData.prazo_contemplacao}
                  onChange={(e) => setFormData({ ...formData, prazo_contemplacao: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  placeholder="12"
                />
                <p className="text-xs text-gray-500 mt-1">Em quantos meses espera ser contemplado?</p>
              </div>

              {/* Botão Calcular */}
              <button
                onClick={calcular}
                className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg"
              >
                Calcular Simulação
              </button>
            </div>

            {/* === RESULTADO === */}
            <div ref={resultadoRef}>
              {resultado ? (
                <div className="space-y-6">
                  {/* Card Principal */}
                  <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl shadow-lg p-6 text-white">
                    <div className="text-center">
                      <div className="text-sm opacity-80 mb-1">{resultado.administradora}</div>
                      <div className="text-4xl font-bold mb-2">{formatarMoeda(resultado.credito)}</div>
                      <div className="text-sm opacity-80">
                        {resultado.prazo} meses • Grupo {resultado.tipoGrupo === 'novo' ? 'Novo' : 'em Andamento'}
                      </div>
                    </div>
                  </div>

                  {/* Parcelas */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Parcelas</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Parcela Integral</span>
                        <span className="text-xl font-bold text-gray-800">{formatarMoeda(resultado.parcelaIntegral)}</span>
                      </div>
                      {resultado.usaReducao && (
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                          <span className="text-green-700">Parcela Reduzida ({resultado.percentualReducao}%)</span>
                          <span className="text-xl font-bold text-green-600">{formatarMoeda(resultado.parcelaReduzida)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lance */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Lance</h3>
                    <div className="space-y-3">
                      {resultado.lanceCliente > 0 && (
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                          <span className="text-blue-700">Lance Cliente (Recurso Próprio)</span>
                          <span className="font-bold text-blue-600">{formatarMoeda(resultado.lanceCliente)}</span>
                        </div>
                      )}
                      {resultado.usaEmbutido && (
                        <>
                          <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                            <span className="text-purple-700">Lance Embutido (30% do crédito)</span>
                            <span className="font-bold text-purple-600">{formatarMoeda(resultado.lanceEmbutido)}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                            <span className="text-red-700 font-medium">⚠️ Abate do Crédito</span>
                            <span className="font-bold text-red-600">-{formatarMoeda(resultado.lanceEmbutido)}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                            <span className="text-amber-700 font-medium">Crédito Líquido</span>
                            <span className="text-xl font-bold text-amber-600">{formatarMoeda(resultado.creditoLiquido)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg text-white">
                        <div>
                          <span className="font-medium">LANCE TOTAL</span>
                          <div className="text-xs opacity-80">{resultado.percentualLance.toFixed(1)}% do total a pagar</div>
                        </div>
                        <span className="text-2xl font-bold">{formatarMoeda(resultado.lanceTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pós-Contemplação */}
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
                    <h3 className="text-lg font-semibold mb-4">Pós-Contemplação (Mês {resultado.prazoContemplacao})</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white/10 rounded-lg p-3 text-center">
                        <div className="text-xs opacity-80">Valor Pago</div>
                        <div className="text-lg font-bold">{formatarMoeda(resultado.valorPagoAteContemplacao)}</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3 text-center">
                        <div className="text-xs opacity-80">Saldo Devedor</div>
                        <div className="text-lg font-bold">{formatarMoeda(resultado.saldoDevedor)}</div>
                      </div>
                    </div>
                    <div className="bg-white/20 rounded-xl p-4 text-center">
                      <div className="text-sm opacity-80">NOVA PARCELA</div>
                      <div className="text-4xl font-bold my-2">{formatarMoeda(resultado.novaParcelaPosContemplacao)}</div>
                      <div className="text-sm opacity-80">por mais {resultado.mesesRestantes} meses</div>
                    </div>
                  </div>

                  {/* Composição */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Composição do Valor</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Crédito</span>
                        <span className="font-medium">{formatarMoeda(resultado.credito)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Taxa Adm. ({resultado.taxaAdm}%)</span>
                        <span className="font-medium">{formatarMoeda(resultado.valorTaxaAdm)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fundo Reserva ({resultado.fundoReserva}%)</span>
                        <span className="font-medium">{formatarMoeda(resultado.valorFundoReserva)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Seguro Total</span>
                        <span className="font-medium">{formatarMoeda(resultado.valorSeguroTotal)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-200">
                        <span className="font-semibold text-gray-800">Total a Pagar</span>
                        <span className="font-bold text-primary-600">{formatarMoeda(resultado.totalPagar)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Botão PDF */}
                  <button
                    onClick={gerarPDF}
                    disabled={gerandoPDF}
                    className="w-full py-3 bg-gray-800 text-white font-semibold rounded-xl hover:bg-gray-900 transition-all flex items-center justify-center gap-2"
                  >
                    {gerandoPDF ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Gerando...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Gerar PDF
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Faça sua Simulação</h3>
                  <p className="text-gray-500">
                    Preencha os dados ao lado e clique em "Calcular Simulação"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simulador;
