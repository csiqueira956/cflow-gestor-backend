import axios from 'axios';

/**
 * Serviço de integração com ASAAS (Gateway de Pagamento)
 * Documentação: https://docs.asaas.com
 */

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

if (!ASAAS_API_KEY) {
  console.warn('⚠️  ASAAS_API_KEY não configurada. Pagamentos não funcionarão.');
}

/**
 * Configuração do axios para ASAAS
 */
const asaasAPI = axios.create({
  baseURL: ASAAS_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'access_token': ASAAS_API_KEY
  },
  timeout: 30000 // 30 segundos
});

/**
 * Criar ou obter cliente no ASAAS
 */
export async function createOrGetCustomer(empresaData) {
  try {
    const { nome, email, cpfCnpj, telefone } = empresaData;

    // Se já tem customer_id, buscar cliente
    if (empresaData.asaas_customer_id) {
      try {
        const response = await asaasAPI.get(`/customers/${empresaData.asaas_customer_id}`);
        console.log(`✅ Cliente ASAAS encontrado: ${response.data.id}`);
        return response.data;
      } catch (error) {
        console.warn(`⚠️  Cliente ASAAS ${empresaData.asaas_customer_id} não encontrado. Criando novo...`);
      }
    }

    // Criar novo cliente
    const customerData = {
      name: nome,
      email: email,
      cpfCnpj: cpfCnpj || '00000000000', // CPF/CNPJ é obrigatório
      phone: telefone?.replace(/\D/g, ''), // Remove formatação
      notificationDisabled: false
    };

    const response = await asaasAPI.post('/customers', customerData);
    console.log(`✅ Cliente ASAAS criado: ${response.data.id}`);

    return response.data;

  } catch (error) {
    console.error('❌ Erro ao criar/obter cliente ASAAS:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao criar cliente no gateway de pagamento');
  }
}

/**
 * Criar assinatura recorrente no ASAAS
 */
export async function createSubscription(customerId, planoData, empresaData) {
  try {
    const { preco_fixo, preco_por_usuario, tipo_cobranca } = planoData;
    const { usuarios_contratados = 1 } = empresaData;

    // Calcular valor mensal
    let valor = preco_fixo || 0;
    if (tipo_cobranca === 'PER_USER') {
      valor = preco_por_usuario * usuarios_contratados;
    }

    // Data de vencimento: primeiro dia do próximo mês
    const nextDueDate = new Date();
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    nextDueDate.setDate(1);

    const subscriptionData = {
      customer: customerId,
      billingType: 'BOLETO', // ou 'CREDIT_CARD', 'PIX'
      cycle: 'MONTHLY',
      value: valor,
      nextDueDate: nextDueDate.toISOString().split('T')[0], // YYYY-MM-DD
      description: `Assinatura ${planoData.nome} - ${empresaData.nome}`,
      // Configurar notificações
      sendPaymentByPostalService: false,
      discount: {
        value: 0,
        dueDateLimitDays: 0
      },
      fine: {
        value: 2 // 2% de multa
      },
      interest: {
        value: 1 // 1% de juros ao mês
      }
    };

    const response = await asaasAPI.post('/subscriptions', subscriptionData);
    console.log(`✅ Assinatura ASAAS criada: ${response.data.id}`);

    return response.data;

  } catch (error) {
    console.error('❌ Erro ao criar assinatura ASAAS:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao criar assinatura no gateway de pagamento');
  }
}

/**
 * Criar cobrança única (para first payment ou upgrade)
 */
export async function createPayment(customerId, valor, descricao) {
  try {
    // Data de vencimento: 3 dias a partir de hoje
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    const paymentData = {
      customer: customerId,
      billingType: 'BOLETO', // Pode ser alterado para suportar PIX e Cartão
      dueDate: dueDate.toISOString().split('T')[0],
      value: valor,
      description: descricao,
      externalReference: Date.now().toString(), // ID único para rastreamento
      postalService: false
    };

    const response = await asaasAPI.post('/payments', paymentData);
    console.log(`✅ Cobrança ASAAS criada: ${response.data.id}`);

    return response.data;

  } catch (error) {
    console.error('❌ Erro ao criar cobrança ASAAS:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao criar cobrança no gateway de pagamento');
  }
}

/**
 * Buscar informações de um pagamento
 */
export async function getPayment(paymentId) {
  try {
    const response = await asaasAPI.get(`/payments/${paymentId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao buscar pagamento ASAAS:', error.response?.data || error.message);
    throw new Error('Erro ao buscar informações do pagamento');
  }
}

/**
 * Cancelar assinatura
 */
export async function cancelSubscription(subscriptionId) {
  try {
    const response = await asaasAPI.delete(`/subscriptions/${subscriptionId}`);
    console.log(`✅ Assinatura ASAAS cancelada: ${subscriptionId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao cancelar assinatura ASAAS:', error.response?.data || error.message);
    throw new Error('Erro ao cancelar assinatura');
  }
}

/**
 * Listar pagamentos de uma assinatura
 */
export async function getSubscriptionPayments(subscriptionId) {
  try {
    const response = await asaasAPI.get(`/payments`, {
      params: {
        subscription: subscriptionId,
        limit: 100
      }
    });
    return response.data.data || [];
  } catch (error) {
    console.error('❌ Erro ao listar pagamentos:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Verificar status de pagamento
 * Status possíveis: PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED, RECEIVED_IN_CASH, REFUND_REQUESTED
 */
export async function checkPaymentStatus(paymentId) {
  try {
    const payment = await getPayment(paymentId);
    return {
      id: payment.id,
      status: payment.status,
      value: payment.value,
      netValue: payment.netValue,
      dueDate: payment.dueDate,
      paymentDate: payment.paymentDate,
      bankSlipUrl: payment.bankSlipUrl,
      invoiceUrl: payment.invoiceUrl
    };
  } catch (error) {
    console.error('❌ Erro ao verificar status do pagamento:', error.message);
    throw error;
  }
}

/**
 * Gerar link de pagamento com PIX
 */
export async function createPixPayment(customerId, valor, descricao) {
  try {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    const paymentData = {
      customer: customerId,
      billingType: 'PIX',
      dueDate: dueDate.toISOString().split('T')[0],
      value: valor,
      description: descricao
    };

    const response = await asaasAPI.post('/payments', paymentData);

    // Buscar QR Code do PIX
    const pixQrCode = await asaasAPI.get(`/payments/${response.data.id}/pixQrCode`);

    return {
      ...response.data,
      pix: {
        qrCode: pixQrCode.data.encodedImage,
        payload: pixQrCode.data.payload,
        expirationDate: pixQrCode.data.expirationDate
      }
    };

  } catch (error) {
    console.error('❌ Erro ao criar pagamento PIX:', error.response?.data || error.message);
    throw new Error('Erro ao gerar pagamento PIX');
  }
}

/**
 * Criar cobrança via cartão de crédito (link de pagamento)
 * Retorna um link onde o cliente pode pagar com cartão
 */
export async function createCreditCardPayment(customerId, valor, descricao, options = {}) {
  try {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (options.dueDays || 3));

    const paymentData = {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      dueDate: dueDate.toISOString().split('T')[0],
      value: valor,
      description: descricao,
      externalReference: options.externalReference || Date.now().toString(),
      // Configurações de cartão
      creditCard: options.creditCard || undefined,
      creditCardHolderInfo: options.creditCardHolderInfo || undefined,
      // Permitir pagamento após vencimento
      authorizeOnlyAfterDueDate: false
    };

    const response = await asaasAPI.post('/payments', paymentData);
    console.log(`✅ Cobrança cartão ASAAS criada: ${response.data.id}`);

    // Gerar link de pagamento
    const paymentLink = `${ASAAS_API_URL.replace('/api/v3', '')}/b/pay/${response.data.id}`;

    return {
      ...response.data,
      invoiceUrl: response.data.invoiceUrl,
      paymentLink: paymentLink
    };

  } catch (error) {
    console.error('❌ Erro ao criar cobrança cartão ASAAS:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao criar cobrança via cartão');
  }
}

/**
 * Criar link de pagamento genérico (suporta múltiplos métodos)
 * O cliente escolhe: Boleto, PIX ou Cartão de Crédito
 */
export async function createPaymentLink(customerId, valor, descricao, options = {}) {
  try {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (options.dueDays || 7));

    const paymentData = {
      customer: customerId,
      billingType: options.billingType || 'UNDEFINED', // Permite escolher
      dueDate: dueDate.toISOString().split('T')[0],
      value: valor,
      description: descricao,
      externalReference: options.externalReference || Date.now().toString(),
      postalService: false
    };

    const response = await asaasAPI.post('/payments', paymentData);
    console.log(`✅ Link de pagamento ASAAS criado: ${response.data.id}`);

    // Link universal de pagamento
    const paymentLink = response.data.invoiceUrl || `${ASAAS_API_URL.replace('/api/v3', '')}/b/pay/${response.data.id}`;

    return {
      ...response.data,
      paymentLink: paymentLink,
      invoiceUrl: response.data.invoiceUrl
    };

  } catch (error) {
    console.error('❌ Erro ao criar link de pagamento:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao criar link de pagamento');
  }
}

export default {
  createOrGetCustomer,
  createSubscription,
  createPayment,
  getPayment,
  cancelSubscription,
  getSubscriptionPayments,
  checkPaymentStatus,
  createPixPayment,
  createCreditCardPayment,
  createPaymentLink
};
