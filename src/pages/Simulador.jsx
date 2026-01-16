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
    prazo_meses: '200',
  });

  // Taxas personalizadas
  const [taxasPersonalizadas, setTaxasPersonalizadas] = useState({
    usar_personalizadas: false,
    taxa_administracao: '20',
    fundo_reserva: '2',
    seguro_vida: '0.03',
  });

  // Redutor do Grupo e Parcelas Reduzidas (modelo PortoBank)
  const [redutorGrupo, setRedutorGrupo] = useState('40'); // % de desconto nas primeiras parcelas
  const [qtdParcelasReduzidas, setQtdParcelasReduzidas] = useState('12'); // quantidade de parcelas com desconto

  // Taxa de Antecipada (modelo Ololu) - 2% do crédito diluído nas primeiras parcelas
  const [percentualAntecipada, setPercentualAntecipada] = useState('2'); // % do crédito como antecipada
  const [qtdParcelasAntecipada, setQtdParcelasAntecipada] = useState('24'); // parcelas onde a antecipada é diluída

  // Lance - Recurso Próprio
  const [recursoProprio, setRecursoProprio] = useState(''); // valor em R$ que o cliente tem disponível

  // Percentuais personalizáveis (para estudo adicional)
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
    const redutor = parseFloat(redutorGrupo) / 100 || 0;
    const qtdReduzidas = parseInt(qtdParcelasReduzidas) || 12;
    const recursoProprioValor = parseCurrency(recursoProprio) || 0;

    // === MODELO OLOLU: Taxa de Antecipada ===
    const taxaAntecipada = parseFloat(percentualAntecipada) / 100 || 0;
    const qtdAntecipada = parseInt(qtdParcelasAntecipada) || 24;
    const valorAntecipada = credito * taxaAntecipada; // 2% do crédito
    const valorAntecipadaPorParcela = qtdAntecipada > 0 ? valorAntecipada / qtdAntecipada : 0;

    // Cálculos básicos (modelo PortoBank/Ololu)
    const valorTaxaAdm = credito * taxaAdm;
    const valorFundoReserva = credito * fundoReserva;
    const valorSeguroTotal = credito * seguroMensal * prazo;
    const totalPagar = credito + valorTaxaAdm + valorFundoReserva + valorSeguroTotal;
    const parcelaMensal = totalPagar / prazo; // Parcela integral (demais parcelas)

    // === MODELO OLOLU: Primeiras parcelas com Antecipada ===
    // Primeiras X parcelas = parcela normal + antecipada diluída
    const parcelaPrimeiras = parcelaMensal + valorAntecipadaPorParcela;
    // Demais parcelas = parcela normal (sem antecipada)
    const parcelaDemais = parcelaMensal;

    // Parcela com Redutor do Grupo (primeiras X parcelas) - se configurado
    const parcelaReduzidaComRedutor = parcelaMensal * (1 - redutor);

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

    // === LANCE (modelo Ololu) ===
    // IMPORTANTE: Lance é calculado sobre o TOTAL A PAGAR, não sobre o crédito

    // Lance Embutido máximo = 30% do CRÉDITO (não do total a pagar)
    const lanceEmbutidoMax = credito * 0.30;

    // Representatividade do recurso próprio
    const representatividadeRecursoProprio = recursoProprioValor > 0 ? (recursoProprioValor / totalPagar) * 100 : 0;

    // Lance Livre: usa recurso próprio + lance embutido
    const lanceLivre = {
      recurso_proprio: recursoProprioValor,
      lance_embutido: lanceEmbutidoMax,
      total: recursoProprioValor + lanceEmbutidoMax,
      representatividade_credito: ((recursoProprioValor + lanceEmbutidoMax) / credito) * 100,
      representatividade_total: ((recursoProprioValor + lanceEmbutidoMax) / totalPagar) * 100
    };

    // Estudo de lance por percentuais (sobre TOTAL A PAGAR - modelo Ololu)
    const lances = percentuaisLances.sort((a, b) => a - b).map(percentual => {
      // Lance calculado sobre TOTAL A PAGAR (modelo Ololu)
      const valorLance = totalPagar * (percentual / 100);
      const percentualDoCredito = (valorLance / credito) * 100;

      // Prioridade: 1º usa lance embutido, 2º usa recurso próprio (A PAGAR)
      // Lance embutido limitado a 30% do crédito
      const lanceEmbutidoUsado = Math.min(valorLance, lanceEmbutidoMax);
      const restanteAposEmbutido = Math.max(0, valorLance - lanceEmbutidoUsado);

      // O restante é "Lance a Pagar" (recurso próprio)
      const lanceAPagar = restanteAposEmbutido;

      // Verifica se lance é viável (embutido + recurso próprio cobre o lance)
      const lanceMaximoPossivel = lanceEmbutidoMax + recursoProprioValor;
      const lanceViavel = valorLance <= lanceMaximoPossivel;
      const faltaParaLance = Math.max(0, valorLance - lanceMaximoPossivel);

      // Crédito líquido após usar lance embutido (o que sobra para comprar o bem)
      const creditoLiquido = credito - lanceEmbutidoUsado;

      // Saldo devedor após lance (total a pagar - lance total ofertado)
      const saldoAposLance = totalPagar - valorLance;

      // Meses restantes pós-contemplação (considerando contemplação no mês 1)
      const mesesRestantes = prazo - 1;

      // Nova parcela pós-contemplação
      const parcelaPosLance = mesesRestantes > 0 ? saldoAposLance / mesesRestantes : 0;

      return {
        percentual,
        percentual_do_credito: Math.round(percentualDoCredito * 100) / 100,
        valor: Math.round(valorLance * 100) / 100,
        lance_embutido_usado: Math.round(lanceEmbutidoUsado * 100) / 100,
        lance_a_pagar: Math.round(lanceAPagar * 100) / 100,
        credito_liquido: Math.round(creditoLiquido * 100) / 100,
        lance_viavel: lanceViavel,
        falta_para_lance: Math.round(faltaParaLance * 100) / 100,
        saldo_devedor: Math.round(saldoAposLance * 100) / 100,
        meses_restantes: mesesRestantes,
        parcelaPosLance: Math.round(parcelaPosLance * 100) / 100
      };
    });

    // === PÓS-CONTEMPLAÇÃO (modelo PortoBank) ===
    // Simulação considerando parcela reduzida nas primeiras parcelas
    const calcularPosContemplacao = (mesContemplacao, usarParcelaReduzida = false) => {
      let valorPago = 0;

      if (usarParcelaReduzida) {
        // Primeiras parcelas com redutor
        const parcelasComRedutor = Math.min(mesContemplacao, qtdReduzidas);
        const parcelasSemRedutor = Math.max(0, mesContemplacao - qtdReduzidas);
        valorPago = (parcelaReduzidaComRedutor * parcelasComRedutor) + (parcelaMensal * parcelasSemRedutor);
      } else {
        valorPago = parcelaMensal * mesContemplacao;
      }

      const saldoDevedor = totalPagar - valorPago;
      const mesesRestantes = prazo - mesContemplacao;

      // Opção 1: Manter prazo, calcular nova parcela
      const novaParcelaMantendoPrazo = mesesRestantes > 0 ? saldoDevedor / mesesRestantes : 0;

      // Opção 2: Manter parcela, calcular novo prazo
      const novoPrazoMantendoParcela = parcelaMensal > 0 ? Math.ceil(saldoDevedor / parcelaMensal) : 0;

      return {
        mesContemplacao,
        parcelasPagas: mesContemplacao,
        valorPago: Math.round(valorPago * 100) / 100,
        saldoDevedor: Math.round(saldoDevedor * 100) / 100,
        mesesRestantes,
        // Opção 1: Nova parcela mantendo prazo
        novaParcelaMantendoPrazo: Math.round(novaParcelaMantendoPrazo * 100) / 100,
        // Opção 2: Novo prazo mantendo parcela
        novoPrazoMantendoParcela
      };
    };

    // Calcular pós-contemplação com parcela integral
    const parcelasPosContemplacao = [12, 24, 36, 48, 60].map(mes => calcularPosContemplacao(mes, false));

    // Calcular pós-contemplação com parcela reduzida (usando redutor do grupo)
    const parcelasPosContemplacaoReduzida = [12, 24, 36, 48, 60].map(mes => calcularPosContemplacao(mes, true));

    return {
      administradora_nome: 'Simulação Personalizada',
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

      // === MODELO OLOLU: Antecipada ===
      percentual_antecipada: parseFloat(percentualAntecipada) || 0,
      valor_antecipada: Math.round(valorAntecipada * 100) / 100,
      qtd_parcelas_antecipada: qtdAntecipada,
      valor_antecipada_por_parcela: Math.round(valorAntecipadaPorParcela * 100) / 100,
      parcela_primeiras: Math.round(parcelaPrimeiras * 100) / 100, // Primeiras parcelas (com antecipada)
      parcela_demais: Math.round(parcelaDemais * 100) / 100, // Demais parcelas (sem antecipada)

      // Redutor do Grupo
      redutor_grupo: parseFloat(redutorGrupo) || 0,
      qtd_parcelas_reduzidas: qtdReduzidas,
      parcela_reduzida_com_redutor: Math.round(parcelaReduzidaComRedutor * 100) / 100,

      // Lance
      recurso_proprio: recursoProprioValor,
      lance_embutido_max: Math.round(lanceEmbutidoMax * 100) / 100,
      lance_livre: lanceLivre,

      // Novas informações
      parcelas_reduzidas: parcelasReduzidas,
      lances,
      parcelas_pos_contemplacao: parcelasPosContemplacao,
      parcelas_pos_contemplacao_reduzida: parcelasPosContemplacaoReduzida,

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
            .parcelas-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .parcela-box { background: rgba(255,255,255,0.15); padding: 12px; border-radius: 6px; text-align: center; }
            .parcela-box .titulo { font-size: 10px; opacity: 0.85; margin-bottom: 4px; }
            .parcela-box .valor { font-size: 22px; font-weight: bold; }
            .parcela-box .subtitulo { font-size: 9px; opacity: 0.7; margin-top: 2px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .economia { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 12px; border-radius: 6px; text-align: center; }
            .economia .valor { font-size: 18px; font-weight: bold; }
            .footer { margin-top: 15px; text-align: center; color: #999; font-size: 9px; padding-top: 12px; border-top: 1px solid #eee; }
            .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 15px; font-size: 10px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { padding: 6px; text-align: left; border-bottom: 1px solid #eee; font-size: 10px; }
            th { background: #f0f0f0; font-weight: bold; }
            .text-green { color: #10B981; }
            .text-purple { color: #7C3AED; }
            .text-blue { color: #3B82F6; }
            .text-amber { color: #F59E0B; }
            .lance-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 10px; }
            .lance-box { background: #f0f0ff; padding: 8px; border-radius: 4px; text-align: center; }
            .lance-box .titulo { font-size: 9px; color: #666; margin-bottom: 2px; }
            .lance-box .valor { font-size: 12px; font-weight: bold; color: #4F46E5; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SIMULAÇÃO DE CONSÓRCIO</h1>
            <p>Cflow CRM - Gestão de Consórcios</p>
          </div>

          <!-- CARD PRINCIPAL - MODELO OLOLU -->
          <div class="highlight">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <div class="badge">${sim?.categoria?.toUpperCase() || 'IMÓVEL'}</div>
                <div style="font-size: 11px; opacity: 0.9;">Crédito: <strong>${formatarMoeda(sim?.valor_credito)}</strong></div>
              </div>
              <div style="text-align: right; font-size: 10px; opacity: 0.85;">
                ${sim?.prazo_meses} meses<br/>
                Total: ${formatarMoeda(sim?.total_pagar)}
              </div>
            </div>

            <div class="parcelas-grid">
              <div class="parcela-box" style="background: rgba(251,191,36,0.2);">
                <div class="titulo">Primeiras ${sim?.qtd_parcelas_antecipada} Parcelas</div>
                <div class="valor" style="color: #fbbf24;">${formatarMoeda(sim?.parcela_primeiras)}</div>
                <div class="subtitulo">(${sim?.percentual_antecipada}% antecipada)</div>
              </div>
              <div class="parcela-box" style="background: rgba(134,239,172,0.2);">
                <div class="titulo">Demais Parcelas</div>
                <div class="valor" style="color: #86efac;">${formatarMoeda(sim?.parcela_demais)}</div>
                <div class="subtitulo">(parcela normal)</div>
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="section">
              <div class="section-title">DADOS DA SIMULAÇÃO</div>
              <div class="row"><span class="label">Valor do Crédito</span><span class="value">${formatarMoeda(sim?.valor_credito)}</span></div>
              <div class="row"><span class="label">Prazo</span><span class="value">${sim?.prazo_meses} meses</span></div>
              <div class="row"><span class="label">Taxa Administrativa</span><span class="value">${sim?.taxa_administracao}%</span></div>
              <div class="row"><span class="label">Fundo de Reserva</span><span class="value">${sim?.fundo_reserva}%</span></div>
              <div class="row"><span class="label">Seguro Mensal</span><span class="value">${sim?.seguro_mensal}%</span></div>
              <div class="row"><span class="label">Taxa Antecipada</span><span class="value text-amber">${sim?.percentual_antecipada}%</span></div>
            </div>

            <div class="section">
              <div class="section-title">COMPOSIÇÃO DO VALOR</div>
              <div class="row"><span class="label">Taxa Administrativa</span><span class="value">${formatarMoeda(sim?.valor_taxa_adm)}</span></div>
              <div class="row"><span class="label">Fundo de Reserva</span><span class="value">${formatarMoeda(sim?.valor_fundo_reserva)}</span></div>
              <div class="row"><span class="label">Seguro Total</span><span class="value">${formatarMoeda(sim?.valor_seguro_total)}</span></div>
              <div class="row"><span class="label">Antecipada (${sim?.percentual_antecipada}%)</span><span class="value text-amber">${formatarMoeda(sim?.valor_antecipada)}</span></div>
              <div class="row"><span class="label"><strong>TOTAL A PAGAR</strong></span><span class="value text-blue"><strong>${formatarMoeda(sim?.total_pagar)}</strong></span></div>
            </div>
          </div>

          <!-- ESTUDO DE LANCE - MODELO OLOLU -->
          <div class="section">
            <div class="section-title">ESTUDO DE LANCE (sobre Total a Pagar)</div>

            <div class="lance-info">
              <div class="lance-box">
                <div class="titulo">Lance Embutido (máx 30%)</div>
                <div class="valor text-purple">${formatarMoeda(sim?.lance_embutido_max)}</div>
              </div>
              <div class="lance-box">
                <div class="titulo">+ Recurso Próprio</div>
                <div class="valor text-blue">${formatarMoeda(sim?.recurso_proprio || 0)}</div>
              </div>
              <div class="lance-box" style="background: #e0e7ff;">
                <div class="titulo">= Lance Máximo</div>
                <div class="valor">${formatarMoeda(sim?.lance_livre?.total)}</div>
              </div>
            </div>

            <table>
              <tr>
                <th>Lance %</th>
                <th>Valor Total</th>
                <th style="color: #7C3AED;">Embutido (-créd)</th>
                <th style="color: #3B82F6;">A Pagar</th>
                <th style="color: #F59E0B;">Créd. Líquido</th>
                <th>Saldo Devedor</th>
                <th style="color: #10B981;">Parcela Pós</th>
              </tr>
              ${sim?.lances?.map(l => `
                <tr>
                  <td><strong>${l.percentual}%</strong><br/><small style="color:#999;">(${l.percentual_do_credito?.toFixed(1)}% créd)</small></td>
                  <td><strong>${formatarMoeda(l.valor)}</strong></td>
                  <td class="text-purple">${formatarMoeda(l.lance_embutido_usado)}<br/><small style="color:#EF4444;">-${((l.lance_embutido_usado / sim?.valor_credito) * 100).toFixed(0)}% créd</small></td>
                  <td class="text-blue">${formatarMoeda(l.lance_a_pagar)}</td>
                  <td class="text-amber"><strong>${formatarMoeda(l.credito_liquido)}</strong><br/><small style="color:#999;">${((l.credito_liquido / sim?.valor_credito) * 100).toFixed(0)}% créd</small></td>
                  <td>${formatarMoeda(l.saldo_devedor)}</td>
                  <td class="text-green"><strong>${formatarMoeda(l.parcelaPosLance)}</strong><br/><small style="color:#999;">${l.meses_restantes}m</small></td>
                </tr>
              `).join('')}
            </table>
            <div style="font-size: 8px; color: #666; margin-top: 6px;">
              <div style="margin-bottom: 3px;"><strong class="text-purple">Lance Embutido:</strong> Vem do próprio crédito - <strong style="color:#EF4444;">ABATE do crédito líquido</strong> disponível para comprar o bem</div>
              <div style="margin-bottom: 3px;"><strong class="text-blue">Lance a Pagar:</strong> Recurso próprio (dinheiro do bolso) - NÃO afeta o crédito</div>
              <div><strong class="text-amber">Crédito Líquido:</strong> Valor que sobra para comprar o bem = Crédito Original - Lance Embutido</div>
            </div>
          </div>

          <!-- PÓS CONTEMPLAÇÃO -->
          <div class="section">
            <div class="section-title">ESTIMATIVA PÓS CONTEMPLAÇÃO</div>
            <table>
              <tr>
                <th>Mês</th>
                <th>Saldo Devedor</th>
                <th>Nova Parcela</th>
                <th>Novo Prazo*</th>
              </tr>
              ${sim?.parcelas_pos_contemplacao?.map(p => `
                <tr>
                  <td>Mês ${p.mesContemplacao}</td>
                  <td>${formatarMoeda(p.saldoDevedor)}</td>
                  <td class="text-blue"><strong>${formatarMoeda(p.novaParcelaMantendoPrazo)}</strong></td>
                  <td>${p.novoPrazoMantendoParcela}m</td>
                </tr>
              `).join('')}
            </table>
            <div style="font-size: 8px; color: #666; margin-top: 4px;">* Novo prazo mantendo parcela de ${formatarMoeda(sim?.parcela_mensal)}</div>
          </div>

          <div class="economia">
            <div style="margin-bottom: 4px; opacity: 0.9; font-size: 10px;">Economia vs Financiamento (1,5% a.m.)</div>
            <div class="valor">${formatarMoeda(sim?.comparativo_financiamento?.economia)}</div>
            <div style="font-size: 10px; opacity: 0.9; margin-top: 3px;">(${sim?.comparativo_financiamento?.economia_percentual}% de economia)</div>
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

                {/* Taxas do Consórcio */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Taxas do Consórcio
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Taxa Adm. (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={taxasPersonalizadas.taxa_administracao}
                        onChange={(e) => setTaxasPersonalizadas({
                          ...taxasPersonalizadas,
                          taxa_administracao: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                        placeholder="20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Fundo Res. (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={taxasPersonalizadas.fundo_reserva}
                        onChange={(e) => setTaxasPersonalizadas({
                          ...taxasPersonalizadas,
                          fundo_reserva: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                        placeholder="2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Seguro (%)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={taxasPersonalizadas.seguro_vida}
                        onChange={(e) => setTaxasPersonalizadas({
                          ...taxasPersonalizadas,
                          seguro_vida: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                        placeholder="0.03"
                      />
                    </div>
                  </div>
                </div>

                {/* Taxa de Antecipada (modelo Ololu) */}
                <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Taxa de Antecipada
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Antecipada (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={percentualAntecipada}
                        onChange={(e) => setPercentualAntecipada(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                        placeholder="2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Qtd. Parcelas
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="200"
                        value={qtdParcelasAntecipada}
                        onChange={(e) => setQtdParcelasAntecipada(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                        placeholder="24"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    % do crédito diluído nas primeiras parcelas (modelo Ololu)
                  </p>
                </div>

                {/* Redutor do Grupo e Parcelas Reduzidas */}
                <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
                  <h3 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Redutor do Grupo
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Redutor (%)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={redutorGrupo}
                        onChange={(e) => setRedutorGrupo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                        placeholder="40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Qtd. Parcelas
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="200"
                        value={qtdParcelasReduzidas}
                        onChange={(e) => setQtdParcelasReduzidas(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                        placeholder="12"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    Desconto aplicado nas primeiras parcelas
                  </p>
                </div>

                {/* Recurso Próprio para Lance */}
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Recurso Próprio (Lance)
                  </h3>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                    <input
                      type="text"
                      value={recursoProprio ? formatCurrency(recursoProprio).replace('R$', '').trim() : ''}
                      onChange={(e) => setRecursoProprio(e.target.value.replace(/\D/g, ''))}
                      placeholder="0,00 (opcional)"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Valor disponível para ofertar como lance (recurso próprio)
                  </p>
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

              {/* Percentuais de Estudo (Expandível) */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <button
                  onClick={() => setShowTaxasPersonalizadas(!showTaxasPersonalizadas)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="font-medium text-gray-700">Percentuais de Estudo</span>
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
                      {/* Percentuais de Parcelas Reduzidas */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Opções de Parcela Reduzida (%)
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
                            +
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
                            +
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
                  {/* Card Principal - Modelo Ololu */}
                  <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl shadow-lg p-6 text-white">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-sm opacity-80 mb-1">{resultado.simulacao?.administradora_nome || 'Simulação Personalizada'}</div>
                        <div className="bg-white/20 px-3 py-1 rounded-lg text-xs inline-block mb-2">
                          Crédito: {formatarMoeda(resultado.simulacao?.valor_credito)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="bg-green-400/30 px-3 py-1 rounded-lg text-sm">
                          Economia: {formatarMoeda(resultado.simulacao?.comparativo_financiamento?.economia)}
                        </div>
                      </div>
                    </div>

                    {/* Modelo Ololu: Primeiras X parcelas e Demais parcelas */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/10 rounded-xl p-4 text-center">
                        <div className="text-xs opacity-70 mb-1">
                          Primeiras {resultado.simulacao?.qtd_parcelas_antecipada} parcelas
                        </div>
                        <div className="text-3xl font-bold text-amber-300">
                          {formatarMoeda(resultado.simulacao?.parcela_primeiras)}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          ({resultado.simulacao?.percentual_antecipada}% antecipada)
                        </div>
                      </div>
                      <div className="bg-white/10 rounded-xl p-4 text-center">
                        <div className="text-xs opacity-70 mb-1">
                          Demais Parcelas
                        </div>
                        <div className="text-3xl font-bold text-green-300">
                          {formatarMoeda(resultado.simulacao?.parcela_demais)}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          (parcela normal)
                        </div>
                      </div>
                    </div>

                    <div className="text-center mt-3 text-sm opacity-80">
                      {resultado.simulacao?.prazo_meses} meses • Total: {formatarMoeda(resultado.simulacao?.total_pagar)}
                    </div>

                    {/* Parcela com Redutor do Grupo (se configurado) */}
                    {resultado.simulacao?.redutor_grupo > 0 && (
                      <div className="bg-green-500/20 rounded-xl p-3 mt-3 border border-green-400/30">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-xs opacity-80">
                              Com Redutor do Grupo ({resultado.simulacao?.redutor_grupo}%)
                            </div>
                            <div className="text-xs opacity-70">
                              {resultado.simulacao?.qtd_parcelas_reduzidas} primeiras
                            </div>
                          </div>
                          <div className="text-xl font-bold text-green-300">
                            {formatarMoeda(resultado.simulacao?.parcela_reduzida_com_redutor)}
                          </div>
                        </div>
                      </div>
                    )}
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
                            O redutor de grupo permite pagar parcelas menores nas primeiras mensalidades.
                            Após esse período, a parcela volta ao valor integral.
                          </p>

                          <div className="space-y-3">
                            {/* Parcela com Redutor do Grupo */}
                            {resultado.simulacao?.redutor_grupo > 0 && (
                              <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-semibold">Redutor do Grupo ({resultado.simulacao?.redutor_grupo}%)</div>
                                    <div className="text-sm opacity-90">
                                      {resultado.simulacao?.qtd_parcelas_reduzidas} primeiras parcelas
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-3xl font-bold">
                                      {formatarMoeda(resultado.simulacao?.parcela_reduzida_com_redutor)}
                                    </div>
                                    <div className="text-sm opacity-90">por mês</div>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                              <div>
                                <div className="font-semibold text-gray-900">Parcela Integral (100%)</div>
                                <div className="text-sm text-gray-500">Após período do redutor</div>
                              </div>
                              <div className="text-2xl font-bold text-gray-900">
                                {formatarMoeda(resultado.simulacao?.parcela_mensal)}
                              </div>
                            </div>

                            {/* Outras opções de parcela reduzida */}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Outras opções de redução:</h4>
                              {resultado.simulacao?.parcelas_reduzidas?.map((parcela, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200 mb-2">
                                  <div>
                                    <div className="font-medium text-green-800">Pagar {parcela.percentual}% da parcela</div>
                                    <div className="text-xs text-green-600">Economia de {parcela.economia}%</div>
                                  </div>
                                  <div className="text-lg font-bold text-green-700">
                                    {formatarMoeda(parcela.valor)}
                                  </div>
                                </div>
                              ))}
                            </div>
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

                      {/* Estudo de Lance - Modelo Ololu */}
                      {abaAtiva === 'lance' && (
                        <div className="space-y-4">
                          <p className="text-gray-600 text-sm mb-4">
                            Lance é calculado sobre o <strong>Total a Pagar</strong> ({formatarMoeda(resultado.simulacao?.total_pagar)}).
                            Pode ser composto de <span className="text-purple-600 font-medium">Lance Embutido</span> (até 30% do crédito) + <span className="text-blue-600 font-medium">Lance a Pagar</span> (recurso próprio).
                          </p>

                          {/* Informações de Lance Máximo */}
                          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl p-4 text-white mb-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              Seu Lance Máximo
                            </h4>
                            <div className="grid grid-cols-4 gap-3 text-center">
                              <div className="bg-white/10 rounded-lg p-3">
                                <div className="text-xs opacity-80">Lance Embutido (30%)</div>
                                <div className="text-lg font-bold">{formatarMoeda(resultado.simulacao?.lance_embutido_max)}</div>
                              </div>
                              <div className="bg-white/10 rounded-lg p-3">
                                <div className="text-xs opacity-80">+ Recurso Próprio</div>
                                <div className="text-lg font-bold">{formatarMoeda(resultado.simulacao?.recurso_proprio || 0)}</div>
                              </div>
                              <div className="bg-white/20 rounded-lg p-3">
                                <div className="text-xs opacity-80">= Total Máximo</div>
                                <div className="text-xl font-bold">{formatarMoeda(resultado.simulacao?.lance_livre?.total)}</div>
                              </div>
                              <div className="bg-white/10 rounded-lg p-3">
                                <div className="text-xs opacity-80">% do Total a Pagar</div>
                                <div className="text-lg font-bold">{resultado.simulacao?.lance_livre?.representatividade_total?.toFixed(1)}%</div>
                              </div>
                            </div>
                          </div>

                          {/* Tabela de Lances - Modelo Ololu */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Lance %</th>
                                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total Lance</th>
                                  <th className="px-2 py-3 text-left text-xs font-semibold text-purple-700 uppercase">Embutido</th>
                                  <th className="px-2 py-3 text-left text-xs font-semibold text-blue-700 uppercase">A Pagar</th>
                                  <th className="px-2 py-3 text-left text-xs font-semibold text-amber-700 uppercase">Créd. Líquido</th>
                                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Saldo Devedor</th>
                                  <th className="px-2 py-3 text-left text-xs font-semibold text-green-700 uppercase">Parcela Pós</th>
                                </tr>
                              </thead>
                              <tbody>
                                {resultado.simulacao?.lances?.map((lance, idx) => (
                                  <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${!lance.lance_viavel ? 'opacity-60' : ''}`}>
                                    <td className="px-2 py-3">
                                      <div className="flex flex-col">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                          lance.lance_viavel ? 'bg-primary-100 text-primary-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                          {lance.percentual}%
                                        </span>
                                        <span className="text-[10px] text-gray-400 mt-0.5">
                                          ({lance.percentual_do_credito?.toFixed(1)}% crédito)
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-2 py-3 font-bold text-gray-900">
                                      {formatarMoeda(lance.valor)}
                                    </td>
                                    <td className="px-2 py-3">
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-purple-600">{formatarMoeda(lance.lance_embutido_usado)}</span>
                                        {lance.lance_embutido_usado >= resultado.simulacao?.lance_embutido_max && (
                                          <span className="text-[10px] text-orange-500">(máx 30%)</span>
                                        )}
                                        <span className="text-[10px] text-red-500">(-{formatarMoeda(lance.lance_embutido_usado)} do créd.)</span>
                                      </div>
                                    </td>
                                    <td className="px-2 py-3 font-semibold text-blue-600">
                                      {formatarMoeda(lance.lance_a_pagar)}
                                      {lance.lance_a_pagar > 0 && !lance.lance_viavel && (
                                        <div className="text-[10px] text-red-500">Falta: {formatarMoeda(lance.falta_para_lance)}</div>
                                      )}
                                    </td>
                                    <td className="px-2 py-3">
                                      <div className="flex flex-col">
                                        <span className="font-bold text-amber-600">{formatarMoeda(lance.credito_liquido)}</span>
                                        <span className="text-[10px] text-gray-500">
                                          ({((lance.credito_liquido / resultado.simulacao?.valor_credito) * 100).toFixed(0)}% do créd.)
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-2 py-3 text-gray-700">
                                      {formatarMoeda(lance.saldo_devedor)}
                                    </td>
                                    <td className="px-2 py-3">
                                      <div className="flex flex-col">
                                        <span className="font-bold text-green-600">{formatarMoeda(lance.parcelaPosLance)}</span>
                                        <span className="text-[10px] text-gray-400">{lance.meses_restantes} meses</span>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                              <div className="font-semibold text-purple-800 mb-1">Lance Embutido (ABATE do Crédito)</div>
                              <p className="text-purple-600">
                                Até 30% do crédito. <strong className="text-red-600">É DESCONTADO do crédito</strong> - você recebe menos dinheiro para comprar o bem.
                              </p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                              <div className="font-semibold text-blue-800 mb-1">Lance a Pagar (Recurso Próprio)</div>
                              <p className="text-blue-600">
                                Valor que você paga do próprio bolso. <strong className="text-green-600">NÃO afeta o crédito</strong> - você recebe o crédito integral.
                              </p>
                            </div>
                          </div>

                          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <div>
                                <div className="font-medium text-red-800">ATENÇÃO: Lance Embutido reduz seu Crédito!</div>
                                <div className="text-sm text-red-700">
                                  Ao usar lance embutido, o valor é <strong>ABATIDO do seu crédito</strong>. O "Crédito Líquido" é o valor que sobra para comprar o bem.
                                </div>
                                <div className="text-sm text-red-700 mt-2 bg-red-100 p-2 rounded">
                                  <strong>Exemplo:</strong> Crédito R$ 480.000 - Lance Embutido R$ 144.000 (30%) = <strong>Crédito Líquido R$ 336.000</strong>
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
                            Após a contemplação, você pode escolher entre manter o prazo original (nova parcela) ou manter a parcela (novo prazo).
                          </p>

                          {/* Com Parcela Integral */}
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                              Com Parcela Integral
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Contemplação</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Saldo Devedor</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Nova Parcela</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Novo Prazo*</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {resultado.simulacao?.parcelas_pos_contemplacao?.map((item, idx) => (
                                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                      <td className="px-3 py-2">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                          Mês {item.mesContemplacao}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-gray-900">{formatarMoeda(item.saldoDevedor)}</td>
                                      <td className="px-3 py-2 font-bold text-primary-600">{formatarMoeda(item.novaParcelaMantendoPrazo)}</td>
                                      <td className="px-3 py-2 text-gray-600">{item.novoPrazoMantendoParcela} meses</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Com Parcela Reduzida (Redutor do Grupo) */}
                          {resultado.simulacao?.redutor_grupo > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                                Com Redutor do Grupo ({resultado.simulacao?.redutor_grupo}% nas {resultado.simulacao?.qtd_parcelas_reduzidas} primeiras)
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-green-50">
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-green-700">Contemplação</th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-green-700">Saldo Devedor</th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-green-700">Nova Parcela</th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-green-700">Novo Prazo*</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {resultado.simulacao?.parcelas_pos_contemplacao_reduzida?.map((item, idx) => (
                                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-green-50/50'}>
                                        <td className="px-3 py-2">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Mês {item.mesContemplacao}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-gray-900">{formatarMoeda(item.saldoDevedor)}</td>
                                        <td className="px-3 py-2 font-bold text-green-600">{formatarMoeda(item.novaParcelaMantendoPrazo)}</td>
                                        <td className="px-3 py-2 text-gray-600">{item.novoPrazoMantendoParcela} meses</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          <div className="text-xs text-gray-500">
                            * Novo prazo mantendo a parcela original de {formatarMoeda(resultado.simulacao?.parcela_mensal)}
                          </div>

                          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-purple-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div className="text-sm text-purple-700">
                                <strong>Opções após contemplação:</strong>
                                <ul className="mt-1 list-disc list-inside space-y-1">
                                  <li><strong>Nova Parcela:</strong> Mantém o prazo original, ajusta o valor da parcela</li>
                                  <li><strong>Novo Prazo:</strong> Mantém a parcela original, ajusta a quantidade de meses</li>
                                </ul>
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
                        let texto = `*SIMULAÇÃO DE CONSÓRCIO*\n\n` +
                          `📊 *${sim?.categoria?.toUpperCase()}*\n` +
                          `💰 Crédito: ${formatarMoeda(sim?.valor_credito)}\n` +
                          `📅 Prazo: ${sim?.prazo_meses} meses\n` +
                          `💵 Parcela Integral: *${formatarMoeda(sim?.parcela_mensal)}*\n`;

                        // Redutor do Grupo
                        if (sim?.redutor_grupo > 0) {
                          texto += `\n🎯 *Redutor do Grupo (${sim?.redutor_grupo}%):*\n` +
                            `• ${sim?.qtd_parcelas_reduzidas} primeiras parcelas: *${formatarMoeda(sim?.parcela_reduzida_com_redutor)}*\n`;
                        }

                        // Lance Livre (se tiver recurso próprio)
                        if (sim?.recurso_proprio > 0) {
                          texto += `\n💎 *Seu Lance Máximo:*\n` +
                            `• Recurso Próprio: ${formatarMoeda(sim?.lance_livre?.recurso_proprio)}\n` +
                            `• + Embutido (30%): ${formatarMoeda(sim?.lance_livre?.lance_embutido)}\n` +
                            `• = Total: *${formatarMoeda(sim?.lance_livre?.total)}* (${sim?.lance_livre?.representatividade?.toFixed(1)}%)\n`;
                        }

                        texto += `\n✅ Economia vs Financiamento: ${formatarMoeda(sim?.comparativo_financiamento?.economia)}\n\n` +
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
