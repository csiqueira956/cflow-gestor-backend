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

// Opções de parcelas para adesão
const OPCOES_ADESAO = [
  { value: 'SEM', label: 'Sem Adesão' },
  { value: '0', label: 'À Vista (Entrada)' },
  { value: '6', label: 'Diluída em 6 parcelas' },
  { value: '12', label: 'Diluída em 12 parcelas' },
  { value: '18', label: 'Diluída em 18 parcelas' },
  { value: '24', label: 'Diluída em 24 parcelas' },
];

const SimuladorV2 = () => {
  const resultadoRef = useRef(null);
  const [resultado, setResultado] = useState(null);
  const [gerandoPDF, setGerandoPDF] = useState(false);

  // === ESTADO DO FORMULÁRIO ===
  const [formData, setFormData] = useState({
    // Dados Básicos
    categoria: 'imovel',
    creditoContratado: '',
    tipoContratacao: 'PF', // PF (Física) ou PJ (Jurídica)
    prazoTotal: '240',

    // Taxas editáveis
    taxaAdministrativa: '17',
    fundoReserva: '2',
    seguroVida: '0.031',
    taxaAntecipada: '0', // Taxa de adesão (%)

    // Adesão
    qtdParcelasAdesao: 'SEM', // "SEM", 0, 6, 12, 18, 24

    // Redutor
    usaRedutor: false,
    tipoRedutor: 'percentual', // 'percentual' ou 'campanha'
    redutorGrupo: '50',

    // Lance
    recursoProprio: '',
    valorFGTS: '',
    lanceEmbutido: '',

    // Pós-Contemplação
    usaProjecao: false,
    mesContemplacao: '12',
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

  // === CÁLCULOS (CONFORME DOCUMENTO) ===
  const calcular = () => {
    const config = categoriaAtual;
    const credito = parseCurrency(formData.creditoContratado);

    if (credito <= 0) {
      toast.error('Informe o valor do crédito');
      return;
    }

    const prazo = parseInt(formData.prazoTotal);
    const tipo = formData.tipoContratacao; // 'PF' ou 'PJ'
    const tipoPF = tipo === 'PF';

    // Taxas (convertidas para decimal)
    const taxaAdm = parseFloat(formData.taxaAdministrativa) / 100;
    const fundoReserva = parseFloat(formData.fundoReserva) / 100;
    const taxaSeguro = parseFloat(formData.seguroVida) / 100;
    const taxaAntecipada = parseFloat(formData.taxaAntecipada) / 100;

    // ========================================
    // ETAPA 1: CATEGORIA
    // ========================================
    const categoria = credito * (1 + taxaAdm + fundoReserva);

    // ========================================
    // ETAPA 2: SEGURO MENSAL
    // ========================================
    const seguroMensal = categoria * taxaSeguro;

    // ========================================
    // ETAPA 3: PARCELAS INTEGRAIS
    // ========================================
    const parcelaPJ = categoria / prazo;
    const parcelaPF = parcelaPJ + seguroMensal;

    // ========================================
    // ETAPA 4: PARCELAS REDUZIDAS
    // ========================================
    const usaRedutor = formData.usaRedutor;
    const redutor = parseFloat(formData.redutorGrupo) / 100;
    const usaCampanha = formData.tipoRedutor === 'campanha';

    let parcelaRedPJ;
    if (usaRedutor) {
      if (usaCampanha) {
        // Campanha Parcela Original: categoria / 200
        parcelaRedPJ = categoria / 200;
      } else {
        parcelaRedPJ = parcelaPJ * (1 - redutor);
      }
    } else {
      parcelaRedPJ = parcelaPJ;
    }
    const parcelaRedPF = parcelaRedPJ + seguroMensal;

    // ========================================
    // ETAPA 5: ECONOMIA
    // ========================================
    const economia = tipoPF
      ? parcelaPF - parcelaRedPF
      : parcelaPJ - parcelaRedPJ;

    // ========================================
    // ETAPA 6: ADESÃO
    // ========================================
    const parcelaBase = tipoPF ? parcelaRedPF : parcelaRedPJ;
    const qtdParcelasAdesao = formData.qtdParcelasAdesao;
    const semAdesao = qtdParcelasAdesao === 'SEM' || taxaAntecipada === 0;

    let valorAdesao, parcelaInicial, demaisParcelas, adesaoAvista, tipoAdesao;

    if (semAdesao) {
      valorAdesao = 0;
      adesaoAvista = 0;
      parcelaInicial = parcelaBase;
      demaisParcelas = parcelaBase;
      tipoAdesao = 'SEM_ADESAO';
    } else if (qtdParcelasAdesao === '0') {
      // Adesão à vista
      valorAdesao = credito * taxaAntecipada;
      adesaoAvista = valorAdesao;
      parcelaInicial = parcelaBase;
      demaisParcelas = parcelaBase;
      tipoAdesao = 'A_VISTA';
    } else {
      // Adesão diluída
      const qtdParcelas = parseInt(qtdParcelasAdesao);
      valorAdesao = credito * taxaAntecipada;
      adesaoAvista = 0;
      parcelaInicial = parcelaBase + (valorAdesao / qtdParcelas);
      demaisParcelas = parcelaBase;
      tipoAdesao = 'DILUIDA';
    }

    // ========================================
    // ETAPA 7: LANCES
    // ========================================
    const recursoProprio = parseCurrency(formData.recursoProprio);
    const fgts = config.permiteFGTS ? parseCurrency(formData.valorFGTS) : 0;
    const lanceEmbutidoInput = config.permiteEmbutido ? parseCurrency(formData.lanceEmbutido) : 0;

    const embutidoMax = credito * config.percentualMaxEmbutido;
    const lanceEmbutido = Math.min(lanceEmbutidoInput, embutidoMax);
    const lanceFixo = categoria * config.lanceFixoPercentual;
    const totalLance = recursoProprio + fgts + lanceEmbutido;
    const representatividade = totalLance / categoria;

    // ========================================
    // ETAPA 8: CRÉDITO LIBERADO
    // ========================================
    const creditoLiberado = credito - lanceEmbutido;

    // ========================================
    // PÓS-CONTEMPLAÇÃO (se habilitado)
    // ========================================
    let posContemplacao = null;

    if (formData.usaProjecao) {
      const mesContemplacao = parseInt(formData.mesContemplacao) || 0;

      if (mesContemplacao > 0 && mesContemplacao < prazo) {
        // ========================================
        // ETAPA 9: SALDO DEVEDOR
        // Usa parcelaPJ ou parcelaRedPJ (SEM seguro)
        // ========================================
        const parcelaUsada = usaRedutor ? parcelaRedPJ : parcelaPJ;
        const saldoDevedor = Math.max(0, categoria - (parcelaUsada * mesContemplacao) - totalLance);

        // ========================================
        // ETAPA 10: NOVO SEGURO
        // ========================================
        const novoSeguro = saldoDevedor * taxaSeguro;

        // ========================================
        // ETAPA 11: PARCELA TEÓRICA
        // ========================================
        const prazoRestante = prazo - mesContemplacao;
        const parcelaTeorica = saldoDevedor / prazoRestante;

        // ========================================
        // ETAPA 12: PARCELA REAL (COM PISO 50%)
        // ========================================
        const pisoMinimo = parcelaPJ / 2;
        const parcelaRealPJ = Math.max(parcelaTeorica, pisoMinimo);
        const parcelaRealPF = parcelaRealPJ + novoSeguro;
        const aplicouPiso = parcelaTeorica < pisoMinimo;

        // ========================================
        // ETAPA 13: NOVA PARCELA FINAL
        // ========================================
        const novaParcela = tipoPF ? parcelaRealPF : parcelaRealPJ;

        // ========================================
        // ETAPA 14: NOVO PRAZO
        // ========================================
        const novoPrazo = Math.ceil(saldoDevedor / parcelaRealPJ);

        // ========================================
        // ETAPA 15: ALTERNATIVA (mantém parcelaPJ, ajusta prazo)
        // ========================================
        const prazoAlternativo = Math.ceil(saldoDevedor / parcelaPJ);
        const parcelaAlternativa = tipoPF
          ? (saldoDevedor / prazoAlternativo) + novoSeguro
          : saldoDevedor / prazoAlternativo;

        posContemplacao = {
          mesContemplacao,
          creditoLiberado,
          parcelaUsada,
          valorPago: parcelaUsada * mesContemplacao,
          saldoDevedor,
          novoSeguro,
          prazoRestante,
          parcelaTeorica,
          pisoMinimo,
          parcelaRealPJ,
          parcelaRealPF,
          novaParcela,
          novoPrazo,
          aplicouPiso,
          alternativa: {
            novoPrazo: prazoAlternativo,
            novaParcela: parcelaAlternativa
          }
        };
      }
    }

    // ========================================
    // ETAPA 16: DEMONSTRATIVO DE TAXAS
    // ========================================
    const taxaMensal = (taxaAdm + fundoReserva) / prazo;
    const taxaAnual = taxaMensal * 12;

    // ========================================
    // PARCELA FINAL EXIBIDA
    // ========================================
    const parcelaFinal = tipoPF
      ? (usaRedutor ? parcelaRedPF : parcelaPF)
      : (usaRedutor ? parcelaRedPJ : parcelaPJ);

    // Resultado final
    setResultado({
      // Config
      categoria: config.nome,
      categoriaIcon: config.icon,
      tipo,
      credito,
      prazo,

      // Taxas utilizadas
      taxas: {
        taxaAdm,
        fundoReserva,
        taxaSeguro,
        taxaAntecipada
      },

      // Categoria
      valorCategoria: categoria,

      // Parcelas pré-contemplação
      seguroMensal,
      parcelaIntegralPJ: parcelaPJ,
      parcelaIntegralPF: parcelaPF,
      parcelaReduzidaPJ: parcelaRedPJ,
      parcelaReduzidaPF: parcelaRedPF,
      parcelaFinal,
      economia,
      usaRedutor,
      usaCampanha,
      redutorGrupo: redutor,

      // Adesão
      valorAdesao,
      adesaoAvista,
      qtdParcelasAdesao: semAdesao ? 'SEM' : qtdParcelasAdesao,
      tipoAdesao,
      parcelaInicial,
      demaisParcelas,

      // Lances
      recursoProprio,
      fgts,
      lanceEmbutido,
      embutidoMax,
      lanceFixo,
      totalLance,
      representatividade,

      // Crédito liberado
      creditoLiberado,

      // Pós-contemplação
      posContemplacao,

      // Demonstrativo
      taxaMensal,
      taxaAnual,
      taxaAdminTotal: credito * taxaAdm,
      fundoReservaTotal: credito * fundoReserva
    });

    // Scroll para resultado
    setTimeout(() => {
      resultadoRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    toast.success('Simulação V2 calculada!');
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
          <title>Simulação de Consórcio V2</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 25px; color: #333; background: #fff; font-size: 11px; }
            .header { text-align: center; margin-bottom: 15px; padding-bottom: 12px; border-bottom: 2px solid #059669; }
            .header h1 { color: #059669; font-size: 20px; margin-bottom: 3px; }
            .header p { color: #666; font-size: 11px; }
            .section { margin-bottom: 12px; background: #f8f9fa; padding: 12px; border-radius: 6px; }
            .section-title { font-size: 12px; font-weight: bold; color: #059669; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #ddd; }
            .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee; }
            .row:last-child { border-bottom: none; }
            .row .label { color: #666; }
            .row .value { font-weight: bold; color: #333; }
            .highlight { background: linear-gradient(135deg, #059669, #10B981); color: white; padding: 15px; border-radius: 8px; margin-bottom: 12px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .text-green { color: #10B981; }
            .text-red { color: #EF4444; }
            .text-blue { color: #3B82F6; }
            .text-amber { color: #F59E0B; }
            .text-purple { color: #7C3AED; }
            .big-number { font-size: 24px; font-weight: bold; }
            .footer { margin-top: 15px; text-align: center; color: #999; font-size: 9px; padding-top: 12px; border-top: 1px solid #eee; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .badge-green { background: #D1FAE5; color: #065F46; }
            .badge-amber { background: #FEF3C7; color: #92400E; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${r.categoriaIcon} SIMULAÇÃO V2 - ${r.categoria.toUpperCase()}</h1>
            <p>Pessoa ${r.tipo === 'PF' ? 'Física' : 'Jurídica'} | ${r.prazo} meses | Modelo com Piso 50%</p>
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
              <div class="row"><span class="label">Parcela Integral ${r.tipo}</span><span class="value">${formatarMoeda(r.tipo === 'PF' ? r.parcelaIntegralPF : r.parcelaIntegralPJ)}</span></div>
              ${r.tipo === 'PF' ? `<div class="row"><span class="label">Seguro Vida</span><span class="value">${formatarMoeda(r.seguroMensal)}</span></div>` : ''}
              ${r.usaRedutor ? `
                <div class="row"><span class="label">Parcela Reduzida ${r.usaCampanha ? '(Campanha)' : `(${(r.redutorGrupo * 100).toFixed(0)}%)`}</span><span class="value text-green">${formatarMoeda(r.parcelaFinal)}</span></div>
                <div class="row"><span class="label">Economia/mês</span><span class="value text-green">${formatarMoeda(r.economia)}</span></div>
              ` : ''}
            </div>

            <div class="section">
              <div class="section-title">ADESÃO</div>
              <div class="row"><span class="label">Tipo</span><span class="value">${r.tipoAdesao === 'SEM_ADESAO' ? 'Sem Adesão' : r.tipoAdesao === 'A_VISTA' ? 'À Vista' : `Diluída ${r.qtdParcelasAdesao}x`}</span></div>
              ${r.valorAdesao > 0 ? `
                <div class="row"><span class="label">Valor Adesão</span><span class="value">${formatarMoeda(r.valorAdesao)}</span></div>
                ${r.adesaoAvista > 0 ? `<div class="row"><span class="label">Entrada</span><span class="value text-amber">${formatarMoeda(r.adesaoAvista)}</span></div>` : ''}
              ` : ''}
              <div class="row"><span class="label">Parcela Inicial</span><span class="value">${formatarMoeda(r.parcelaInicial)}</span></div>
              <div class="row"><span class="label">Demais Parcelas</span><span class="value">${formatarMoeda(r.demaisParcelas)}</span></div>
            </div>
          </div>

          ${r.totalLance > 0 ? `
          <div class="section">
            <div class="section-title">LANCE</div>
            <div class="grid-2">
              <div>
                ${r.recursoProprio > 0 ? `<div class="row"><span class="label">Recurso Próprio</span><span class="value">${formatarMoeda(r.recursoProprio)}</span></div>` : ''}
                ${r.fgts > 0 ? `<div class="row"><span class="label">FGTS</span><span class="value">${formatarMoeda(r.fgts)}</span></div>` : ''}
                ${r.lanceEmbutido > 0 ? `
                  <div class="row"><span class="label">Lance Embutido</span><span class="value text-purple">${formatarMoeda(r.lanceEmbutido)}</span></div>
                ` : ''}
                <div class="row"><span class="label"><strong>LANCE TOTAL</strong></span><span class="value text-blue"><strong>${formatarMoeda(r.totalLance)}</strong></span></div>
              </div>
              <div>
                <div class="row"><span class="label">Representatividade</span><span class="value">${formatarPercentual(r.representatividade)}</span></div>
                <div class="row"><span class="label">Lance Fixo do Grupo</span><span class="value">${formatarMoeda(r.lanceFixo)}</span></div>
                <div class="row"><span class="label">Crédito Liberado</span><span class="value">${formatarMoeda(r.creditoLiberado)}</span></div>
              </div>
            </div>
          </div>
          ` : ''}

          ${r.posContemplacao ? `
          <div class="section" style="background: linear-gradient(135deg, #10B981, #059669); color: white;">
            <div class="section-title" style="color: white; border-color: rgba(255,255,255,0.3);">PÓS-CONTEMPLAÇÃO (Mês ${r.posContemplacao.mesContemplacao}) ${r.posContemplacao.aplicouPiso ? '<span class="badge badge-amber">PISO 50% APLICADO</span>' : ''}</div>
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
            <div style="margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 6px;">
              <div class="grid-2" style="font-size: 10px;">
                <div>
                  <div>Parcela Teórica: ${formatarMoeda(r.posContemplacao.parcelaTeorica)}</div>
                  <div>Piso Mínimo (50%): ${formatarMoeda(r.posContemplacao.pisoMinimo)}</div>
                </div>
                <div>
                  <div>Parcela Real PJ: ${formatarMoeda(r.posContemplacao.parcelaRealPJ)}</div>
                  ${r.tipo === 'PF' ? `<div>Novo Seguro: ${formatarMoeda(r.posContemplacao.novoSeguro)}</div>` : ''}
                </div>
              </div>
            </div>
            <div style="text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.3);">
              <div style="opacity: 0.9; font-size: 10px;">NOVA PARCELA</div>
              <div style="font-size: 28px; font-weight: bold;">${formatarMoeda(r.posContemplacao.novaParcela)}</div>
              <div style="opacity: 0.9; font-size: 10px;">Novo prazo: ${r.posContemplacao.novoPrazo} meses</div>
            </div>
            <div style="margin-top: 10px; padding: 8px; background: rgba(255,255,255,0.15); border-radius: 6px; text-align: center;">
              <div style="font-size: 10px; opacity: 0.9;">ALTERNATIVA (mantém parcela integral)</div>
              <div style="font-size: 14px; font-weight: bold;">${formatarMoeda(r.posContemplacao.alternativa.novaParcela)} por ${r.posContemplacao.alternativa.novoPrazo} meses</div>
            </div>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">DEMONSTRATIVO DE TAXAS</div>
            <div class="grid-2">
              <div>
                <div class="row"><span class="label">Taxa Administrativa</span><span class="value">${formatarMoeda(r.taxaAdminTotal)} (${formatarPercentual(r.taxas.taxaAdm)})</span></div>
                <div class="row"><span class="label">Fundo de Reserva</span><span class="value">${formatarMoeda(r.fundoReservaTotal)} (${formatarPercentual(r.taxas.fundoReserva)})</span></div>
              </div>
              <div>
                <div class="row"><span class="label">Taxa Mensal</span><span class="value">${formatarPercentual(r.taxaMensal, 3)}</span></div>
                <div class="row"><span class="label">Taxa Anual</span><span class="value">${formatarPercentual(r.taxaAnual, 2)}</span></div>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Simulação V2 (com piso 50%) gerada em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">Simulador V2</h1>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full">
                Modelo Documento
              </span>
            </div>
            <p className="text-gray-600 mt-2">Versão com Piso 50%, Adesão e Campanha Parcela Original</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* === FORMULÁRIO === */}
            <div className="space-y-6">

              {/* Etapa 1 - Dados Básicos */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
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
                          taxaAdministrativa: (cat.taxaAdministrativa * 100).toString(),
                          fundoReserva: (cat.fundoReserva * 100).toString(),
                          seguroVida: (cat.seguroVida * 100).toFixed(3),
                        })}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${
                          formData.categoria === cat.id
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
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
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-lg font-semibold"
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
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
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
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
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

              {/* Etapa 2 - Adesão */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  Taxa de Adesão
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Taxa Antecipada (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.taxaAntecipada}
                      onChange={(e) => setFormData({ ...formData, taxaAntecipada: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Parcelas Adesão</label>
                    <select
                      value={formData.qtdParcelasAdesao}
                      onChange={(e) => setFormData({ ...formData, qtdParcelasAdesao: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                    >
                      {OPCOES_ADESAO.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  💡 "SEM" ignora a taxa. "À Vista" cobra como entrada. Demais opções diluem nas primeiras parcelas.
                </p>
              </div>

              {/* Etapa 3 - Redutor do Grupo */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
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
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Redutor</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, tipoRedutor: 'percentual' })}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            formData.tipoRedutor === 'percentual'
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium">📊 Percentual</div>
                          <div className="text-xs text-gray-500">Ex: 50% de redução</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, tipoRedutor: 'campanha' })}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            formData.tipoRedutor === 'campanha'
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium">🎯 Campanha</div>
                          <div className="text-xs text-gray-500">Parcela Original (cat/200)</div>
                        </button>
                      </div>
                    </div>

                    {formData.tipoRedutor === 'percentual' && (
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
                    )}
                  </div>
                )}
              </div>

              {/* Etapa 4 - Lance */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  Oferta de Lance
                </h2>

                <div className="space-y-4">
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

                  {categoriaAtual.permiteFGTS && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">FGTS</label>
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

              {/* Etapa 5 - Projeção */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">5</span>
                    Pós-Contemplação
                  </h2>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, usaProjecao: !formData.usaProjecao })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      formData.usaProjecao ? 'bg-purple-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      formData.usaProjecao ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>

                {formData.usaProjecao && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mês de Contemplação</label>
                    <input
                      type="number"
                      value={formData.mesContemplacao}
                      onChange={(e) => setFormData({ ...formData, mesContemplacao: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                      min="1"
                      max={formData.prazoTotal}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Aplica piso de 50% (parcela mínima = parcelaPJ / 2)
                    </p>
                  </div>
                )}
              </div>

              {/* Botão Calcular */}
              <button
                onClick={calcular}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
              >
                Calcular Simulação V2
              </button>
            </div>

            {/* === RESULTADO === */}
            <div ref={resultadoRef}>
              {resultado ? (
                <div className="space-y-4">
                  {/* Card Principal */}
                  <div className="bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-3xl">{resultado.categoriaIcon}</span>
                        <h3 className="text-lg font-semibold">{resultado.categoria}</h3>
                        <p className="text-sm opacity-80">Pessoa {resultado.tipo === 'PF' ? 'Física' : 'Jurídica'} • {resultado.prazo} meses</p>
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
                      <p className="text-sm opacity-80 mt-1">Categoria: {formatarMoeda(resultado.valorCategoria)}</p>
                    </div>
                  </div>

                  {/* Parcelas */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">💰 Parcelas</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Parcela Integral {resultado.tipo}</span>
                        <span className="font-semibold">{formatarMoeda(resultado.tipo === 'PF' ? resultado.parcelaIntegralPF : resultado.parcelaIntegralPJ)}</span>
                      </div>
                      {resultado.tipo === 'PF' && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Seguro de vida incluso</span>
                          <span className="text-gray-500">{formatarMoeda(resultado.seguroMensal)}/mês</span>
                        </div>
                      )}
                      {resultado.usaRedutor && (
                        <>
                          <div className="border-t pt-3 flex justify-between">
                            <span className="text-green-600">
                              Parcela Reduzida {resultado.usaCampanha ? '(Campanha)' : `(${(resultado.redutorGrupo * 100).toFixed(0)}%)`}
                            </span>
                            <span className="font-semibold text-green-600">{formatarMoeda(resultado.parcelaFinal)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Economia mensal</span>
                            <span className="text-green-500">{formatarMoeda(resultado.economia)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Adesão */}
                  {resultado.valorAdesao > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                      <h3 className="font-semibold text-gray-800 mb-4">📋 Adesão</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tipo</span>
                          <span className="font-semibold">
                            {resultado.tipoAdesao === 'A_VISTA' ? 'À Vista' : `Diluída ${resultado.qtdParcelasAdesao}x`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Valor Total</span>
                          <span className="font-semibold">{formatarMoeda(resultado.valorAdesao)}</span>
                        </div>
                        {resultado.adesaoAvista > 0 && (
                          <div className="flex justify-between">
                            <span className="text-amber-600">Entrada</span>
                            <span className="font-semibold text-amber-600">{formatarMoeda(resultado.adesaoAvista)}</span>
                          </div>
                        )}
                        <div className="border-t pt-3 flex justify-between">
                          <span className="text-gray-600">Parcela Inicial</span>
                          <span className="font-semibold">{formatarMoeda(resultado.parcelaInicial)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Demais Parcelas</span>
                          <span className="font-semibold">{formatarMoeda(resultado.demaisParcelas)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lance */}
                  {resultado.totalLance > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                      <h3 className="font-semibold text-gray-800 mb-4">🎯 Lance</h3>
                      <div className="space-y-3">
                        {resultado.recursoProprio > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Recurso Próprio</span>
                            <span className="font-semibold">{formatarMoeda(resultado.recursoProprio)}</span>
                          </div>
                        )}
                        {resultado.fgts > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">FGTS</span>
                            <span className="font-semibold">{formatarMoeda(resultado.fgts)}</span>
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
                          <span className="font-bold text-blue-600 text-lg">{formatarMoeda(resultado.totalLance)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Representatividade</span>
                          <span className="font-medium">{formatarPercentual(resultado.representatividade)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Lance Fixo do Grupo</span>
                          <span>{formatarMoeda(resultado.lanceFixo)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Crédito Liberado</span>
                          <span className="font-medium">{formatarMoeda(resultado.creditoLiberado)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pós-Contemplação */}
                  {resultado.posContemplacao && (
                    <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">🎉 Pós-Contemplação (Mês {resultado.posContemplacao.mesContemplacao})</h3>
                        {resultado.posContemplacao.aplicouPiso && (
                          <span className="px-2 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded">
                            PISO 50% APLICADO
                          </span>
                        )}
                      </div>
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

                      {/* Detalhes do cálculo */}
                      <div className="bg-white/10 rounded-xl p-4 mb-4">
                        <p className="text-xs opacity-80 mb-2">Detalhes do Cálculo:</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Parcela Teórica: {formatarMoeda(resultado.posContemplacao.parcelaTeorica)}</div>
                          <div>Piso Mínimo: {formatarMoeda(resultado.posContemplacao.pisoMinimo)}</div>
                          <div>Parcela Real PJ: {formatarMoeda(resultado.posContemplacao.parcelaRealPJ)}</div>
                          {resultado.tipo === 'PF' && <div>Novo Seguro: {formatarMoeda(resultado.posContemplacao.novoSeguro)}</div>}
                        </div>
                      </div>

                      <div className="bg-white/20 rounded-xl p-4 text-center">
                        <p className="text-sm opacity-80">Nova Parcela</p>
                        <p className="text-3xl font-bold">{formatarMoeda(resultado.posContemplacao.novaParcela)}</p>
                        <p className="text-sm opacity-80 mt-1">por {resultado.posContemplacao.novoPrazo} meses</p>
                      </div>

                      <div className="mt-4 text-sm opacity-90 bg-white/10 rounded-lg p-3">
                        <p className="font-medium mb-1">📊 Alternativa (mantém parcela integral):</p>
                        <p>{formatarMoeda(resultado.posContemplacao.alternativa.novaParcela)}/mês por {resultado.posContemplacao.alternativa.novoPrazo} meses</p>
                      </div>
                    </div>
                  )}

                  {/* Taxas */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">📋 Demonstrativo de Taxas</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Taxa Administrativa</span>
                        <span>{formatarMoeda(resultado.taxaAdminTotal)} ({formatarPercentual(resultado.taxas.taxaAdm)})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fundo de Reserva</span>
                        <span>{formatarMoeda(resultado.fundoReservaTotal)} ({formatarPercentual(resultado.taxas.fundoReserva)})</span>
                      </div>
                      {resultado.tipo === 'PF' && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Seguro Vida</span>
                          <span>{formatarPercentual(resultado.taxas.taxaSeguro, 3)}/mês</span>
                        </div>
                      )}
                      {resultado.taxas.taxaAntecipada > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Taxa Antecipada</span>
                          <span>{formatarPercentual(resultado.taxas.taxaAntecipada)}</span>
                        </div>
                      )}
                      <div className="border-t pt-3 flex justify-between">
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
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Simulador V2</h3>
                  <p className="text-gray-600">
                    Esta versão implementa a lógica do documento com:<br/>
                    • Piso de 50% na parcela pós-contemplação<br/>
                    • Taxa de adesão (SEM, À Vista, Diluída)<br/>
                    • Campanha Parcela Original
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

export default SimuladorV2;
