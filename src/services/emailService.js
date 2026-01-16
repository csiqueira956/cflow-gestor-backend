import transporter from '../config/email.js';

// Função para formatar CPF
const formatarCPF = (cpf) => {
  if (!cpf) return 'Não informado';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

// Função para formatar CEP
const formatarCEP = (cep) => {
  if (!cep) return 'Não informado';
  return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
};

// Função para formatar telefone
const formatarTelefone = (telefone) => {
  if (!telefone) return 'Não informado';
  return telefone;
};

// Função para formatar data
const formatarData = (data) => {
  if (!data) return 'Não informado';
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR');
};

// Função para formatar valor monetário
const formatarValor = (valor) => {
  if (!valor) return 'Não informado';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
};

// Função para gerar o HTML do email com os dados do formulário para o VENDEDOR
const gerarHTMLFormularioVendedor = (clienteData) => {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cópia do Cadastro</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      margin: -30px -30px 30px -30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .header p {
      margin: 10px 0 0 0;
      opacity: 0.9;
    }
    .section {
      margin-bottom: 30px;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 20px;
    }
    .section:last-child {
      border-bottom: none;
    }
    .section-title {
      color: #667eea;
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
    }
    .section-title::before {
      content: '▶';
      margin-right: 10px;
      font-size: 14px;
    }
    .field {
      margin-bottom: 12px;
      display: flex;
      flex-wrap: wrap;
    }
    .field-label {
      font-weight: 600;
      color: #555;
      min-width: 200px;
      margin-right: 10px;
    }
    .field-value {
      color: #333;
      flex: 1;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #f0f0f0;
      text-align: center;
      color: #888;
      font-size: 14px;
    }
    .alert {
      background-color: #e8f4fd;
      border-left: 4px solid #2196F3;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 5px;
    }
    .alert p {
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Novo Cliente Cadastrado</h1>
      <p>Dados completos do cliente</p>
    </div>

    <div class="alert">
      <p><strong>✅ Um novo cliente foi cadastrado através do seu formulário!</strong></p>
      <p>Abaixo estão todos os dados preenchidos pelo cliente. Entre em contato o mais breve possível.</p>
    </div>

    <!-- Seção 1: Dados Básicos -->
    <div class="section">
      <div class="section-title">1. Dados Básicos</div>
      <div class="field">
        <span class="field-label">Nome Completo:</span>
        <span class="field-value">${clienteData.nome || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">CPF:</span>
        <span class="field-value">${formatarCPF(clienteData.cpf)}</span>
      </div>
      <div class="field">
        <span class="field-label">Email:</span>
        <span class="field-value">${clienteData.email || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Telefone Celular:</span>
        <span class="field-value">${formatarTelefone(clienteData.telefone_celular || clienteData.telefone)}</span>
      </div>
    </div>

    <!-- Seção 2: Dados Pessoais -->
    <div class="section">
      <div class="section-title">2. Dados Pessoais</div>
      <div class="field">
        <span class="field-label">Data de Nascimento:</span>
        <span class="field-value">${formatarData(clienteData.data_nascimento)}</span>
      </div>
      <div class="field">
        <span class="field-label">Estado Civil:</span>
        <span class="field-value">${clienteData.estado_civil || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Nacionalidade:</span>
        <span class="field-value">${clienteData.nacionalidade || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Cidade de Nascimento:</span>
        <span class="field-value">${clienteData.cidade_nascimento || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Nome da Mãe:</span>
        <span class="field-value">${clienteData.nome_mae || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Profissão:</span>
        <span class="field-value">${clienteData.profissao || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Remuneração:</span>
        <span class="field-value">${formatarValor(clienteData.remuneracao)}</span>
      </div>
    </div>

    <!-- Seção 3: Contatos -->
    <div class="section">
      <div class="section-title">3. Contatos</div>
      <div class="field">
        <span class="field-label">Telefone Residencial:</span>
        <span class="field-value">${formatarTelefone(clienteData.telefone_residencial)}</span>
      </div>
      <div class="field">
        <span class="field-label">Telefone Comercial:</span>
        <span class="field-value">${formatarTelefone(clienteData.telefone_comercial)}</span>
      </div>
      <div class="field">
        <span class="field-label">Celular (Principal):</span>
        <span class="field-value">${formatarTelefone(clienteData.telefone_celular)}</span>
      </div>
      <div class="field">
        <span class="field-label">Celular (Alternativo):</span>
        <span class="field-value">${formatarTelefone(clienteData.telefone_celular_2)}</span>
      </div>
    </div>

    <!-- Seção 4: Documentação -->
    <div class="section">
      <div class="section-title">4. Documentação</div>
      <div class="field">
        <span class="field-label">Tipo de Documento:</span>
        <span class="field-value">${clienteData.tipo_documento || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Número do Documento:</span>
        <span class="field-value">${clienteData.numero_documento || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Órgão Emissor:</span>
        <span class="field-value">${clienteData.orgao_emissor || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Data de Emissão:</span>
        <span class="field-value">${formatarData(clienteData.data_emissao)}</span>
      </div>
    </div>

    <!-- Seção 5: Dados do Cônjuge -->
    ${clienteData.nome_conjuge || clienteData.cpf_conjuge ? `
    <div class="section">
      <div class="section-title">5. Dados do Cônjuge</div>
      <div class="field">
        <span class="field-label">Nome do Cônjuge:</span>
        <span class="field-value">${clienteData.nome_conjuge || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">CPF do Cônjuge:</span>
        <span class="field-value">${formatarCPF(clienteData.cpf_conjuge)}</span>
      </div>
    </div>
    ` : ''}

    <!-- Seção 6: Endereço -->
    <div class="section">
      <div class="section-title">6. Endereço</div>
      <div class="field">
        <span class="field-label">CEP:</span>
        <span class="field-value">${formatarCEP(clienteData.cep)}</span>
      </div>
      <div class="field">
        <span class="field-label">Logradouro:</span>
        <span class="field-value">${clienteData.tipo_logradouro || ''} ${clienteData.endereco || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Número:</span>
        <span class="field-value">${clienteData.numero_endereco || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Complemento:</span>
        <span class="field-value">${clienteData.complemento || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Bairro:</span>
        <span class="field-value">${clienteData.bairro || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Cidade:</span>
        <span class="field-value">${clienteData.cidade || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Estado:</span>
        <span class="field-value">${clienteData.estado || 'Não informado'}</span>
      </div>
    </div>

    <!-- Seção 7: Pagamento - 1ª Parcela -->
    <div class="section">
      <div class="section-title">7. Pagamento - 1ª Parcela</div>
      <div class="field">
        <span class="field-label">Forma de Pagamento:</span>
        <span class="field-value">${clienteData.forma_pagamento_primeira || 'Não informado'}</span>
      </div>
      ${clienteData.forma_pagamento_primeira === 'Cheque pré-datado' ? `
      <div class="field">
        <span class="field-label">Data do Pré-datado:</span>
        <span class="field-value">${formatarData(clienteData.data_pre_datado)}</span>
      </div>
      <div class="field">
        <span class="field-label">Valor do Cheque:</span>
        <span class="field-value">${formatarValor(clienteData.valor_cheque)}</span>
      </div>
      <div class="field">
        <span class="field-label">Número do Cheque:</span>
        <span class="field-value">${clienteData.numero_cheque || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Data de Vencimento:</span>
        <span class="field-value">${formatarData(clienteData.data_vencimento_cheque)}</span>
      </div>
      <div class="field">
        <span class="field-label">Banco:</span>
        <span class="field-value">${clienteData.banco_cheque || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Agência:</span>
        <span class="field-value">${clienteData.agencia_cheque || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Conta:</span>
        <span class="field-value">${clienteData.conta_cheque || 'Não informado'}</span>
      </div>
      ` : ''}
    </div>

    <!-- Seção 8: Pagamento - Demais Parcelas -->
    <div class="section">
      <div class="section-title">8. Pagamento - Demais Parcelas</div>
      <div class="field">
        <span class="field-label">Forma de Pagamento:</span>
        <span class="field-value">${clienteData.forma_pagamento_demais || 'Não informado'}</span>
      </div>
      ${clienteData.forma_pagamento_demais === 'Débito em conta' ? `
      <div class="field">
        <span class="field-label">Nome do Correntista:</span>
        <span class="field-value">${clienteData.nome_correntista || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">CPF do Correntista:</span>
        <span class="field-value">${formatarCPF(clienteData.cpf_correntista)}</span>
      </div>
      <div class="field">
        <span class="field-label">Banco:</span>
        <span class="field-value">${clienteData.banco_debito || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Agência:</span>
        <span class="field-value">${clienteData.agencia_debito || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Conta:</span>
        <span class="field-value">${clienteData.conta_debito || 'Não informado'}</span>
      </div>
      ` : ''}
    </div>

    <!-- Seção 9: Seguro -->
    <div class="section">
      <div class="section-title">9. Seguro</div>
      <div class="field">
        <span class="field-label">Aceita Seguro:</span>
        <span class="field-value">${clienteData.aceita_seguro ? 'Sim' : 'Não'}</span>
      </div>
    </div>

    <!-- Seção 10: Dados do Consórcio -->
    <div class="section">
      <div class="section-title">10. Dados do Consórcio</div>
      <div class="field">
        <span class="field-label">Valor da Carta:</span>
        <span class="field-value">${formatarValor(clienteData.valor_carta)}</span>
      </div>
      <div class="field">
        <span class="field-label">Administradora:</span>
        <span class="field-value">${clienteData.administradora || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Grupo:</span>
        <span class="field-value">${clienteData.grupo || 'Não informado'}</span>
      </div>
      <div class="field">
        <span class="field-label">Cota:</span>
        <span class="field-value">${clienteData.cota || 'Não informado'}</span>
      </div>
      ${clienteData.observacao ? `
      <div class="field">
        <span class="field-label">Observação:</span>
        <span class="field-value">${clienteData.observacao}</span>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <p>Este é um email automático. Por favor, não responda.</p>
      <p>Data do cadastro: ${new Date().toLocaleString('pt-BR')}</p>
    </div>
  </div>
</body>
</html>
  `;
};

// Função para enviar notificação simples para o CLIENTE
export const enviarEmailCadastroCliente = async (clienteData) => {
  try {
    // Verificar se o cliente tem email
    if (!clienteData.email) {
      console.log('⚠️  Cliente não possui email cadastrado. Email não enviado.');
      return { success: false, error: 'Cliente sem email' };
    }

    // HTML simples de confirmação para o cliente
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #667eea; color: white; padding: 30px; border-radius: 10px; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; margin-top: 20px; border-radius: 10px; }
    .footer { text-align: center; color: #888; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>✅ Cadastro Confirmado!</h1>
  </div>
  <div class="content">
    <p>Olá <strong>${clienteData.nome}</strong>,</p>
    <p>Seu cadastro foi realizado com sucesso!</p>
    <p>Em breve nossa equipe entrará em contato com você para dar continuidade ao seu processo de consórcio.</p>
    <p style="margin-top: 30px;">Obrigado pela confiança!</p>
  </div>
  <div class="footer">
    <p>Este é um email automático. Por favor, não responda.</p>
    <p>Data do cadastro: ${new Date().toLocaleString('pt-BR')}</p>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_EMAIL}>`,
      to: clienteData.email,
      subject: '✅ Confirmação de Cadastro',
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de confirmação enviado para o cliente:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar email para o cliente:', error);
    return { success: false, error: error.message };
  }
};

// Função para enviar formulário COMPLETO para o VENDEDOR
export const enviarEmailNotificacaoVendedor = async (vendedorEmail, vendedorNome, clienteData) => {
  try {
    // Usar o template completo do formulário para o vendedor
    const htmlContent = gerarHTMLFormularioVendedor(clienteData);

    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_EMAIL}>`,
      to: vendedorEmail,
      subject: `🎉 Novo Cliente Cadastrado: ${clienteData.nome}`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email com formulário completo enviado para o vendedor:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar email para o vendedor:', error);
    return { success: false, error: error.message };
  }
};

// Função para enviar email de recuperação de senha
export const sendPasswordResetEmail = async (email, nome, resetUrl) => {
  try {
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 20px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      padding: 15px 30px;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
      text-align: center;
    }
    .button:hover {
      opacity: 0.9;
    }
    .alert {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #f0f0f0;
      text-align: center;
      color: #888;
      font-size: 14px;
    }
    .link-info {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      word-break: break-all;
      margin: 20px 0;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Recuperação de Senha</h1>
    </div>

    <div class="content">
      <p>Olá <strong>${nome}</strong>,</p>

      <p>Você solicitou a recuperação de senha para sua conta no <strong>Gestor de Consórcios</strong>.</p>

      <p>Para criar uma nova senha, clique no botão abaixo:</p>

      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Redefinir Senha</a>
      </div>

      <div class="alert">
        <p><strong>⚠️ Atenção:</strong></p>
        <p>• Este link é válido por <strong>1 hora</strong></p>
        <p>• Após usar o link, ele ficará inválido</p>
        <p>• Se você não solicitou esta recuperação, ignore este email</p>
      </div>

      <p><strong>O link não está funcionando?</strong></p>
      <p>Copie e cole este endereço no seu navegador:</p>

      <div class="link-info">
        ${resetUrl}
      </div>
    </div>

    <div class="footer">
      <p>Este é um email automático. Por favor, não responda.</p>
      <p>Data: ${new Date().toLocaleString('pt-BR')}</p>
      <p>Se você não solicitou esta recuperação, seu senha permanece segura.</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_EMAIL}>`,
      to: email,
      subject: '🔐 Recuperação de Senha - Gestor de Consórcios',
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de recuperação de senha enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar email de recuperação:', error);
    throw error;
  }
};

export default {
  enviarEmailCadastroCliente,
  enviarEmailNotificacaoVendedor,
  sendPasswordResetEmail,
};
