import crypto from 'crypto';

/**
 * Middleware para validar signature do webhook Asaas
 *
 * O Asaas envia um header 'asaas-access-token' com o webhook token configurado.
 * Este middleware valida se o token recebido corresponde ao configurado no .env
 *
 * Para configurar:
 * 1. No painel do Asaas, vá em Configurações > Integrações > Webhooks
 * 2. Configure o Access Token do webhook
 * 3. Adicione ASAAS_WEBHOOK_TOKEN no .env com o mesmo valor
 */
export const validateAsaasWebhook = (req, res, next) => {
  try {
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;

    // Se não houver token configurado, logar aviso e continuar (para desenvolvimento)
    if (!webhookToken) {
      console.warn('⚠️ ASAAS_WEBHOOK_TOKEN não configurado - validação de webhook desativada');
      return next();
    }

    // Obter token do header
    const receivedToken = req.headers['asaas-access-token'];

    if (!receivedToken) {
      console.error('🚨 Webhook Asaas sem token de autenticação');
      return res.status(401).json({
        error: 'Não autorizado',
        message: 'Token de webhook não fornecido'
      });
    }

    // Validar token
    if (receivedToken !== webhookToken) {
      console.error('🚨 Webhook Asaas com token inválido');
      return res.status(403).json({
        error: 'Proibido',
        message: 'Token de webhook inválido'
      });
    }

    console.log('✅ Webhook Asaas autenticado com sucesso');
    next();
  } catch (error) {
    console.error('❌ Erro na validação do webhook:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao validar webhook'
    });
  }
};

/**
 * Middleware alternativo usando HMAC signature
 * Alguns gateways usam HMAC-SHA256 para assinar o payload
 *
 * Para usar, configure ASAAS_WEBHOOK_SECRET no .env
 */
export const validateWebhookHMAC = (req, res, next) => {
  try {
    const secret = process.env.ASAAS_WEBHOOK_SECRET;

    if (!secret) {
      console.warn('⚠️ ASAAS_WEBHOOK_SECRET não configurado');
      return next();
    }

    const signature = req.headers['x-asaas-signature'] || req.headers['x-webhook-signature'];

    if (!signature) {
      console.error('🚨 Webhook sem assinatura HMAC');
      return res.status(401).json({
        error: 'Não autorizado',
        message: 'Assinatura do webhook não fornecida'
      });
    }

    // Calcular HMAC do body
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Comparar signatures de forma segura (timing-safe)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.error('🚨 Webhook com assinatura HMAC inválida');
      return res.status(403).json({
        error: 'Proibido',
        message: 'Assinatura do webhook inválida'
      });
    }

    console.log('✅ Webhook autenticado via HMAC');
    next();
  } catch (error) {
    console.error('❌ Erro na validação HMAC:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao validar assinatura do webhook'
    });
  }
};

/**
 * Middleware para validar IP de origem (whitelist)
 * Restringe webhooks apenas de IPs conhecidos do gateway
 */
export const validateWebhookIP = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next();
    }

    // Obter IP real (considerando proxies)
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.connection.remoteAddress
      || req.socket.remoteAddress;

    if (!allowedIPs.includes(clientIP)) {
      console.error('🚨 Webhook de IP não autorizado:', clientIP);
      return res.status(403).json({
        error: 'Proibido',
        message: 'IP de origem não autorizado'
      });
    }

    console.log('✅ Webhook de IP autorizado:', clientIP);
    next();
  };
};

export default {
  validateAsaasWebhook,
  validateWebhookHMAC,
  validateWebhookIP
};
