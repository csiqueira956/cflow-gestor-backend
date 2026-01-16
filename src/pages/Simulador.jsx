import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';

// === CONFIGURAÇÃO DAS CATEGORIAS ===
const CATEGORIAS = {
  imovel: {
    id: 'imovel',
    nome: 'Imóvel',
    icon: '🏠',
    taxaAdministrativa: 0.17,
    fundoReserva: 0.02,
    seguroVida: 0.00031,
    prazosDisponiveis: [120, 180, 200, 240],
    lanceFixoPercentual: 0.40,
    permiteEmbutido: true,
    percentualMaxEmbutido: 0.30,
    permiteFGTS: true
  },
  auto: {
    id: 'auto',
    nome: 'Auto',
    icon: '🚗',
    taxaAdministrativa: 0.18,
    fundoReserva: 0.02,
    seguroVida: 0.00035,
    prazosDisponiveis: [60, 72, 84],
    lanceFixoPercentual: 0.30,
    permiteEmbutido: true,
    percentualMaxEmbutido: 0.15,
    permiteFGTS: false
  },
  pesados: {
    id: 'pesados',
    nome: 'Pesados',
    icon: '🚚',
    taxaAdministrativa: 0.14,
    fundoReserva: 0.02,
    seguroVida: 0.00035,
    prazosDisponiveis: [80, 100, 120],
    lanceFixoPercentual: 0.35,
    permiteEmbutido: true,
    percentualMaxEmbutido: 0.30,
    permiteFGTS: false
  },
  bike: {
    id: 'bike',
    nome: 'Bike',
    icon: '🏍️',
    taxaAdministrativa: 0.22,
    fundoReserva: 0.04,
    seguroVida: 0.00035,
    prazosDisponiveis: [24, 30, 36],
    lanceFixoPercentual: 0.20,
    permiteEmbutido: true,
    percentualMaxEmbutido: 0.30,
    permiteFGTS: false
  },
  solar: {
    id: 'solar',
    nome: 'Solar',
    icon: '☀️',
    taxaAdministrativa: 0.22,
    fundoReserva: 0.04,
    seguroVida: 0.00035,
    prazosDisponiveis: [24, 30, 36],
    lanceFixoPercentual: 0.20,
    permiteEmbutido: true,
    percentualMaxEmbutido: 0.30,
    permiteFGTS: false
  }
};

const Simulador = () => {
  const resultadoRef = useRef(null);
  const [resultado, setResultado] = useState(null);
  const [gerandoPDF, setGerandoPDF] = useState(false);

  // === ESTADO DO FORMULÁRIO ===
  const [formData, setFormData] = useState({
    // Etapa 1 - Dados Básicos
    categoria: 'imovel',
    creditoContratado: '',
    tipoContratacao: 'PF', // PF ou PJ
    prazoTotal: '240',

    // Taxas editáveis (preenchidas pela categoria, mas editáveis)
    taxaAdministrativa: '17', // percentual
    fundoReserva: '2', // percentual
    seguroVida: '0.031', // percentual mensal

    // Etapa 2 - Redutor do Grupo
    usaRedutor: false,
    redutorGrupo: '50', // percentual

    // Etapa 3 - Lance
    recursoProprio: '',
    valorFGTS: '',
    lanceEmbutido: '',

    // Etapa 4 - Projeção Pós-Contemplação (qtd parcelas reduzidas = mês contemplação)
    usaProjecao: false,
    parcelaContemplacao: '12', // também define qtd de parcelas com redutor
  });

  const categoriaAtual = CATEGORIAS[formData.categoria];

  // === FORMATAÇÃO ===
  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return 'R$ 0,00';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatarPercentual = (valor, casas = 2) => {
    return `${(valor * 100).toFixed(casas)}%`;
  };

  const parseCurrency = (value) => {
    if (!value) return 0;
    return parseFloat(value.toString().replace(/\D/g, '')) / 100;
  };

  const formatCurrencyInput = (value) => {
    if (!value) return '';
    const number = parseFloat(value.toString().replace(/\D/g, '')) / 100;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleCurrencyChange = (field, e) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, [field]: value });
  };

  // === CÁLCULOS ===
  const calcular = () => {
    const config = categoriaAtual;
    const credito = parseCurrency(formData.creditoContratado);

    if (credito <= 0) {
      toast.error('Informe o valor do crédito');
      return;
    }

    const prazo = parseInt(formData.prazoTotal);
    const tipoPF = formData.tipoContratacao === 'PF';

    // Usar taxas editáveis (convertidas para decimal)
    const taxaAdmin = parseFloat(formData.taxaAdministrativa) / 100;
    const taxaFundo = parseFloat(formData.fundoReserva) / 100;
    const taxaSeguro = parseFloat(formData.seguroVida) / 100;

    // 1. Valor da Categoria (Crédito + Taxas)
    const valorCategoria = credito * (1 + taxaAdmin + taxaFundo);

    // 2. Seguro mensal (apenas PF)
    const seguroMensal = tipoPF ? valorCategoria * taxaSeguro : 0;

    // 3. Parcela base
    const parcelaPJ = valorCategoria / prazo;
    const parcelaPF = parcelaPJ + seguroMensal;
    const parcelaBase = tipoPF ? parcelaPF : parcelaPJ;

    // 4. Parcela com redutor
    let parcelaReduzida = parcelaBase;
    let economiaMensal = 0;
    const usaRedutor = formData.usaRedutor;
    const redutorGrupo = parseFloat(formData.redutorGrupo) / 100;
    // Qtd parcelas reduzidas = mês de contemplação (se usar projeção)
    const qtdParcelasReduzidas = formData.usaProjecao ? parseInt(formData.parcelaContemplacao) || 0 : prazo;

    if (usaRedutor && redutorGrupo > 0) {
      const parcelaReduzidaPJ = parcelaPJ * (1 - redutorGrupo);
      parcelaReduzida = tipoPF ? parcelaReduzidaPJ + seguroMensal : parcelaReduzidaPJ;
      economiaMensal = parcelaBase - parcelaReduzida;
    }

    // 5. Lance
    const recursoProprio = parseCurrency(formData.recursoProprio);
    const valorFGTS = config.permiteFGTS ? parseCurrency(formData.valorFGTS) : 0;
    const lanceEmbutido = config.permiteEmbutido ? parseCurrency(formData.lanceEmbutido) : 0;

    // Validar lance embutido máximo
    const maxEmbutido = credito * config.percentualMaxEmbutido;
    const embutidoValido = Math.min(lanceEmbutido, maxEmbutido);

    const lanceTotal = recursoProprio + valorFGTS + embutidoValido;
    const representatividadeLance = lanceTotal / valorCategoria;
    const valorLanceFixo = valorCategoria * config.lanceFixoPercentual;
    const diferencaParaFixo = valorLanceFixo - lanceTotal;

    // 6. Pós-Contemplação
    let posContemplacao = null;
    if (formData.usaProjecao) {
      const parcelaContemplacao = parseInt(formData.parcelaContemplacao) || 0;

      if (parcelaContemplacao > 0 && parcelaContemplacao < prazo) {
        // Crédito liberado (descontando embutido)
        const creditoLiberado = credito - embutidoValido;

        // Valor pago até contemplação
        let valorPago = 0;
        if (usaRedutor && qtdParcelasReduzidas > 0) {
          const parcelasComReducao = Math.min(parcelaContemplacao, qtdParcelasReduzidas);
          const parcelasSemReducao = Math.max(0, parcelaContemplacao - qtdParcelasReduzidas);
          valorPago = (parcelaReduzida * parcelasComReducao) + (parcelaBase * parcelasSemReducao);
        } else {
          valorPago = parcelaBase * parcelaContemplacao;
        }

        // Saldo devedor
        const saldoDevedor = Math.max(0, valorCategoria - valorPago - lanceTotal);

        // Parcelas restantes
        const parcelasRestantes = prazo - parcelaContemplacao;

        // Nova parcela (com piso de 50% da original)
        const novaParcelaTeorica = saldoDevedor / parcelasRestantes;
        const pisoParcela = parcelaPJ / 2;
        const novaParcelaPJ = Math.max(novaParcelaTeorica, pisoParcela);

        // Se PF, recalcular seguro sobre saldo
        const novoSeguro = tipoPF ? saldoDevedor * taxaSeguro : 0;
        const novaParcela = novaParcelaPJ + novoSeguro;

        // Novo prazo real
        const novoPrazo = saldoDevedor > 0 ? Math.ceil(saldoDevedor / novaParcelaPJ) : 0;

        // Alternativa: manter parcela original e reduzir prazo
        const prazoReduzido = saldoDevedor > 0 ? Math.ceil(saldoDevedor / parcelaPJ) : 0;

        posContemplacao = {
          creditoLiberado,
          parcelaContemplacao,
          valorPago,
          saldoDevedor,
          parcelasRestantes,
          novaParcela,
          novoPrazo,
          prazoReduzido,
          novoSeguro,
          economia: parcelaBase - novaParcela
        };
      }
    }

    // 7. Demonstrativo de taxas (usando taxas editáveis)
    const taxaAdminTotal = credito * taxaAdmin;
    const fundoReservaTotal = credito * taxaFundo;
    const taxaTotalPercentual = taxaAdmin + taxaFundo;
    const taxaMensal = taxaTotalPercentual / prazo;
    const taxaAnual = taxaMensal * 12;

    // Resultado final
    setResultado({
      // Config
      categoria: config.nome,
      categoriaIcon: config.icon,
      tipoContratacao: formData.tipoContratacao,
      credito,
      prazo,

      // Valores base
      valorCategoria,
      taxaTotalPercentual,

      // Taxas utilizadas (editáveis)
      taxaAdmin,
      taxaFundo,
      taxaSeguro,

      // Parcelas
      parcelaPJ,
      parcelaPF,
      seguroMensal,
      parcelaBase,

      // Redutor
      usaRedutor,
      redutorGrupo,
      qtdParcelasReduzidas,
      parcelaReduzida,
      economiaMensal,
      economiaTotal: economiaMensal * qtdParcelasReduzidas,

      // Lance
      recursoProprio,
      valorFGTS,
      lanceEmbutido: embutidoValido,
      lanceTotal,
      representatividadeLance,
      valorLanceFixo,
      diferencaParaFixo,
      maxEmbutido,

      // Pós-contemplação
      posContemplacao,

      // Demonstrativo
      taxaAdminTotal,
      fundoReservaTotal,
      taxaMensal,
      taxaAnual
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
            <h1>${r.categoriaIcon} SIMULAÇÃO DE CONSÓRCIO - ${r.categoria.toUpperCase()}</h1>
            <p>Pessoa ${r.tipoContratacao === 'PF' ? 'Física' : 'Jurídica'} | ${r.prazo} meses</p>
          </div>

          <div class="highlight">
            <div style="text-align: center;">
              <div style="font-size: 10px; opacity: 0.9;">Crédito Contratado</div>
              <div class="big-number">${formatarMoeda(r.credito)}</div>
              <div style="font-size: 10px; opacity: 0.9; margin-top: 5px;">Valor da Categoria: ${formatarMoeda(r.valorCategoria)}</div>
            </div>
          </div>

          <div class="grid-2">
            <div class="section">
              <div class="section-title">PARCELAS</div>
              <div class="row"><span class="label">Parcela ${r.tipoContratacao}</span><span class="value">${formatarMoeda(r.parcelaBase)}</span></div>
              ${r.tipoContratacao === 'PF' ? `<div class="row"><span class="label">Seguro Vida</span><span class="value">${formatarMoeda(r.seguroMensal)}</span></div>` : ''}
              ${r.usaRedutor ? `
                <div class="row"><span class="label">Parcela Reduzida (${(r.redutorGrupo * 100).toFixed(0)}%)</span><span class="value text-green">${formatarMoeda(r.parcelaReduzida)}</span></div>
                <div class="row"><span class="label">Economia/mês</span><span class="value text-green">${formatarMoeda(r.economiaMensal)}</span></div>
                <div class="row"><span class="label">Economia total (${r.qtdParcelasReduzidas}x)</span><span class="value text-green">${formatarMoeda(r.economiaTotal)}</span></div>
              ` : ''}
            </div>

            <div class="section">
              <div class="section-title">TAXAS</div>
              <div class="row"><span class="label">Taxa Administrativa</span><span class="value">${formatarMoeda(r.taxaAdminTotal)}</span></div>
              <div class="row"><span class="label">Fundo de Reserva</span><span class="value">${formatarMoeda(r.fundoReservaTotal)}</span></div>
              <div class="row"><span class="label">Taxa Total</span><span class="value">${formatarPercentual(r.taxaTotalPercentual)}</span></div>
              <div class="row"><span class="label">Taxa Mensal</span><span class="value">${formatarPercentual(r.taxaMensal, 3)}</span></div>
            </div>
          </div>

          ${r.lanceTotal > 0 ? `
          <div class="section">
            <div class="section-title">LANCE</div>
            <div class="grid-2">
              <div>
                ${r.recursoProprio > 0 ? `<div class="row"><span class="label">Recurso Próprio</span><span class="value">${formatarMoeda(r.recursoProprio)}</span></div>` : ''}
                ${r.valorFGTS > 0 ? `<div class="row"><span class="label">FGTS</span><span class="value">${formatarMoeda(r.valorFGTS)}</span></div>` : ''}
                ${r.lanceEmbutido > 0 ? `
                  <div class="row"><span class="label">Lance Embutido</span><span class="value text-purple">${formatarMoeda(r.lanceEmbutido)}</span></div>
                  <div class="row"><span class="label text-red">⚠️ Desconta do crédito</span><span class="value text-red">-${formatarMoeda(r.lanceEmbutido)}</span></div>
                ` : ''}
                <div class="row"><span class="label"><strong>LANCE TOTAL</strong></span><span class="value text-blue"><strong>${formatarMoeda(r.lanceTotal)}</strong></span></div>
              </div>
              <div>
                <div class="row"><span class="label">Representatividade</span><span class="value">${formatarPercentual(r.representatividadeLance)}</span></div>
                <div class="row"><span class="label">Lance Fixo do Grupo</span><span class="value">${formatarMoeda(r.valorLanceFixo)}</span></div>
                <div class="row"><span class="label">Diferença p/ Fixo</span><span class="value ${r.diferencaParaFixo > 0 ? 'text-amber' : 'text-green'}">${r.diferencaParaFixo > 0 ? formatarMoeda(r.diferencaParaFixo) : 'Coberto!'}</span></div>
              </div>
            </div>
          </div>
          ` : ''}

          ${r.posContemplacao ? `
          <div class="section" style="background: linear-gradient(135deg, #10B981, #059669); color: white;">
            <div class="section-title" style="color: white; border-color: rgba(255,255,255,0.3);">PÓS-CONTEMPLAÇÃO (Mês ${r.posContemplacao.parcelaContemplacao})</div>
            <div class="grid-2" style="text-align: center;">
              <div>
                <div style="opacity: 0.9; font-size: 10px;">Crédito Liberado</div>
                <div style="font-size: 16px; font-weight: bold;">${formatarMoeda(r.posContemplacao.creditoLiberado)}</div>
              </div>
              <div>
                <div style="opacity: 0.9; font-size: 10px;">Saldo Devedor</div>
                <div style="font-size: 16px; font-weight: bold;">${formatarMoeda(r.posContemplacao.saldoDevedor)}</div>
              </div>
            </div>
            <div style="text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.3);">
              <div style="opacity: 0.9; font-size: 10px;">NOVA PARCELA</div>
              <div style="font-size: 28px; font-weight: bold;">${formatarMoeda(r.posContemplacao.novaParcela)}</div>
              <div style="opacity: 0.9; font-size: 10px;">Novo prazo: ${r.posContemplacao.novoPrazo} meses | Alternativa: ${r.posContemplacao.prazoReduzido} meses mantendo parcela atual</div>
            </div>
          </div>
          ` : ''}

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
            <p className="text-gray-600 mt-2">Calcule parcelas, estude lances e projeções pós-contemplação</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* === FORMULÁRIO === */}
            <div className="space-y-6">

              {/* Etapa 1 - Dados Básicos */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  Dados Básicos
                </h2>

                {/* Categoria */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.values(CATEGORIAS).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          categoria: cat.id,
                          prazoTotal: cat.prazosDisponiveis[0].toString(),
                          valorFGTS: cat.permiteFGTS ? formData.valorFGTS : '',
                          // Preencher taxas da categoria
                          taxaAdministrativa: (cat.taxaAdministrativa * 100).toString(),
                          fundoReserva: (cat.fundoReserva * 100).toString(),
                          seguroVida: (cat.seguroVida * 100).toFixed(3),
                        })}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${
                          formData.categoria === cat.id
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xl mb-1">{cat.icon}</span>
                        <span className="text-xs font-medium">{cat.nome}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Crédito */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valor do Crédito</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <input
                      type="text"
                      value={formatCurrencyInput(formData.creditoContratado)}
                      onChange={(e) => handleCurrencyChange('creditoContratado', e)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 text-lg font-semibold"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                {/* Tipo PF/PJ */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Contratação</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipoContratacao: 'PF' })}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        formData.tipoContratacao === 'PF'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">👤 Pessoa Física</div>
                      <div className="text-xs text-gray-500">Com seguro de vida</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tipoContratacao: 'PJ' })}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        formData.tipoContratacao === 'PJ'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">🏢 Pessoa Jurídica</div>
                      <div className="text-xs text-gray-500">Sem seguro de vida</div>
                    </button>
                  </div>
                </div>

                {/* Prazo */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prazo</label>
                  <select
                    value={formData.prazoTotal}
                    onChange={(e) => setFormData({ ...formData, prazoTotal: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  >
                    {categoriaAtual.prazosDisponiveis.map((p) => (
                      <option key={p} value={p}>{p} meses</option>
                    ))}
                  </select>
                </div>

                {/* Taxas Editáveis */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Taxas (editáveis)</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Taxa Adm. (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.taxaAdministrativa}
                        onChange={(e) => setFormData({ ...formData, taxaAdministrativa: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Fundo Res. (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.fundoReserva}
                        onChange={(e) => setFormData({ ...formData, fundoReserva: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Seguro (%/mês)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={formData.seguroVida}
                        onChange={(e) => setFormData({ ...formData, seguroVida: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Etapa 2 - Redutor do Grupo */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    Redutor do Grupo
                  </h2>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, usaRedutor: !formData.usaRedutor })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      formData.usaRedutor ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      formData.usaRedutor ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>

                {formData.usaRedutor && (
                  <div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Redutor (%)</label>
                      <input
                        type="number"
                        value={formData.redutorGrupo}
                        onChange={(e) => setFormData({ ...formData, redutorGrupo: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                        min="0"
                        max="100"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 A quantidade de parcelas reduzidas será igual ao mês de contemplação (etapa 4)
                    </p>
                  </div>
                )}
              </div>

              {/* Etapa 3 - Lance */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  Oferta de Lance
                </h2>

                <div className="space-y-4">
                  {/* Recurso Próprio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recurso Próprio</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                      <input
                        type="text"
                        value={formatCurrencyInput(formData.recursoProprio)}
                        onChange={(e) => handleCurrencyChange('recursoProprio', e)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  {/* FGTS - apenas para Imóvel */}
                  {categoriaAtual.permiteFGTS && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        FGTS <span className="text-xs text-gray-500">(apenas Imóvel)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                        <input
                          type="text"
                          value={formatCurrencyInput(formData.valorFGTS)}
                          onChange={(e) => handleCurrencyChange('valorFGTS', e)}
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  )}

                  {/* Lance Embutido */}
                  {categoriaAtual.permiteEmbutido && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lance Embutido
                        <span className="text-xs text-gray-500 ml-1">
                          (máx {(categoriaAtual.percentualMaxEmbutido * 100).toFixed(0)}% = {formatarMoeda(parseCurrency(formData.creditoContratado) * categoriaAtual.percentualMaxEmbutido)})
                        </span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                        <input
                          type="text"
                          value={formatCurrencyInput(formData.lanceEmbutido)}
                          onChange={(e) => handleCurrencyChange('lanceEmbutido', e)}
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                          placeholder="0,00"
                        />
                      </div>
                      <p className="text-xs text-red-500 mt-1">⚠️ O lance embutido será descontado do crédito liberado</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Etapa 4 - Projeção */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                    Projeção Pós-Contemplação
                  </h2>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, usaProjecao: !formData.usaProjecao })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      formData.usaProjecao ? 'bg-amber-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      formData.usaProjecao ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>

                {formData.usaProjecao && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Em qual mês será contemplado?</label>
                    <input
                      type="number"
                      value={formData.parcelaContemplacao}
                      onChange={(e) => setFormData({ ...formData, parcelaContemplacao: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                      min="1"
                      max={formData.prazoTotal}
                    />
                  </div>
                )}
              </div>

              {/* Botão Calcular */}
              <button
                onClick={calcular}
                className="w-full py-4 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
              >
                Calcular Simulação
              </button>
            </div>

            {/* === RESULTADO === */}
            <div ref={resultadoRef}>
              {resultado ? (
                <div className="space-y-4">
                  {/* Card Principal */}
                  <div className="bg-gradient-to-br from-primary-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-3xl">{resultado.categoriaIcon}</span>
                        <h3 className="text-lg font-semibold">{resultado.categoria}</h3>
                        <p className="text-sm opacity-80">Pessoa {resultado.tipoContratacao === 'PF' ? 'Física' : 'Jurídica'} • {resultado.prazo} meses</p>
                      </div>
                      <button
                        onClick={gerarPDF}
                        disabled={gerandoPDF}
                        className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
                      >
                        {gerandoPDF ? '...' : '📄'} PDF
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="text-sm opacity-80">Crédito</p>
                      <p className="text-3xl font-bold">{formatarMoeda(resultado.credito)}</p>
                      <p className="text-sm opacity-80 mt-1">Valor da Categoria: {formatarMoeda(resultado.valorCategoria)}</p>
                    </div>
                  </div>

                  {/* Parcelas */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">💰 Parcelas</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Parcela {resultado.tipoContratacao}</span>
                        <span className="font-semibold">{formatarMoeda(resultado.parcelaBase)}</span>
                      </div>
                      {resultado.tipoContratacao === 'PF' && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Seguro de vida incluso</span>
                          <span className="text-gray-500">{formatarMoeda(resultado.seguroMensal)}/mês</span>
                        </div>
                      )}
                      {resultado.usaRedutor && (
                        <>
                          <div className="border-t pt-3 flex justify-between">
                            <span className="text-green-600">Parcela Reduzida ({(resultado.redutorGrupo * 100).toFixed(0)}%)</span>
                            <span className="font-semibold text-green-600">{formatarMoeda(resultado.parcelaReduzida)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Economia mensal</span>
                            <span className="text-green-500">{formatarMoeda(resultado.economiaMensal)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Economia total ({resultado.qtdParcelasReduzidas}x)</span>
                            <span className="text-green-500 font-medium">{formatarMoeda(resultado.economiaTotal)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Lance */}
                  {resultado.lanceTotal > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                      <h3 className="font-semibold text-gray-800 mb-4">🎯 Lance</h3>
                      <div className="space-y-3">
                        {resultado.recursoProprio > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Recurso Próprio</span>
                            <span className="font-semibold">{formatarMoeda(resultado.recursoProprio)}</span>
                          </div>
                        )}
                        {resultado.valorFGTS > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">FGTS</span>
                            <span className="font-semibold">{formatarMoeda(resultado.valorFGTS)}</span>
                          </div>
                        )}
                        {resultado.lanceEmbutido > 0 && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-purple-600">Lance Embutido</span>
                              <span className="font-semibold text-purple-600">{formatarMoeda(resultado.lanceEmbutido)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-red-500">⚠️ Desconta do crédito</span>
                              <span className="text-red-500">-{formatarMoeda(resultado.lanceEmbutido)}</span>
                            </div>
                          </>
                        )}
                        <div className="border-t pt-3 flex justify-between">
                          <span className="text-blue-600 font-semibold">LANCE TOTAL</span>
                          <span className="font-bold text-blue-600 text-lg">{formatarMoeda(resultado.lanceTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Representatividade</span>
                          <span className="font-medium">{formatarPercentual(resultado.representatividadeLance)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Lance Fixo do Grupo</span>
                          <span>{formatarMoeda(resultado.valorLanceFixo)}</span>
                        </div>
                        {resultado.diferencaParaFixo > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-amber-600">Falta para Lance Fixo</span>
                            <span className="text-amber-600">{formatarMoeda(resultado.diferencaParaFixo)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pós-Contemplação */}
                  {resultado.posContemplacao && (
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
                      <h3 className="font-semibold mb-4">🎉 Pós-Contemplação (Mês {resultado.posContemplacao.parcelaContemplacao})</h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-sm opacity-80">Crédito Liberado</p>
                          <p className="text-xl font-bold">{formatarMoeda(resultado.posContemplacao.creditoLiberado)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm opacity-80">Saldo Devedor</p>
                          <p className="text-xl font-bold">{formatarMoeda(resultado.posContemplacao.saldoDevedor)}</p>
                        </div>
                      </div>
                      <div className="bg-white/20 rounded-xl p-4 text-center">
                        <p className="text-sm opacity-80">Nova Parcela</p>
                        <p className="text-3xl font-bold">{formatarMoeda(resultado.posContemplacao.novaParcela)}</p>
                        <p className="text-sm opacity-80 mt-1">por mais {resultado.posContemplacao.novoPrazo} meses</p>
                      </div>
                      <div className="mt-4 text-sm opacity-90">
                        <p>💡 Alternativa: manter parcela atual e quitar em {resultado.posContemplacao.prazoReduzido} meses</p>
                      </div>
                    </div>
                  )}

                  {/* Taxas */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">📋 Demonstrativo de Taxas</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Taxa Administrativa</span>
                        <span>{formatarMoeda(resultado.taxaAdminTotal)} ({formatarPercentual(resultado.taxaAdmin)})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fundo de Reserva</span>
                        <span>{formatarMoeda(resultado.fundoReservaTotal)} ({formatarPercentual(resultado.taxaFundo)})</span>
                      </div>
                      {resultado.tipoContratacao === 'PF' && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Seguro Vida</span>
                          <span>{formatarPercentual(resultado.taxaSeguro, 3)}/mês</span>
                        </div>
                      )}
                      <div className="border-t pt-3 flex justify-between">
                        <span className="text-gray-600">Taxa Total</span>
                        <span className="font-semibold">{formatarPercentual(resultado.taxaTotalPercentual)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Taxa Mensal</span>
                        <span>{formatarPercentual(resultado.taxaMensal, 3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Taxa Anual</span>
                        <span>{formatarPercentual(resultado.taxaAnual, 2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Faça sua Simulação</h3>
                  <p className="text-gray-600">
                    Preencha os dados ao lado e clique em "Calcular Simulação" para ver os resultados completos.
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
