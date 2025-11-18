# Configuração SMTP para Produção

Este guia explica como configurar o serviço de e-mail para produção usando diferentes provedores SMTP.

## 📧 Provedores Recomendados

### 1. **Gmail (Desenvolvimento/Testes)** 🔴 NÃO RECOMENDADO PARA PRODUÇÃO

**Prós**: Gratuito, fácil de configurar
**Contras**: Limite de 500 e-mails/dia, menos confiável

#### Configuração:

1. Ative a verificação em 2 etapas na sua conta Google
2. Gere uma "Senha de App" em: https://myaccount.google.com/apppasswords
3. Configure o `.env`:

```env
# Gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app-aqui
EMAIL_FROM_NAME=Gestor de Consórcios
EMAIL_FROM_EMAIL=seu-email@gmail.com
```

---

### 2. **SendGrid (Recomendado)** ⭐

**Prós**:
- 100 e-mails/dia GRÁTIS
- Infraestrutura profissional
- Excelente deliverability
- Dashboard com analytics

**Contras**: Requer verificação de domínio para volume alto

#### Configuração:

1. Crie conta em: https://sendgrid.com/
2. Vá em **Settings** → **API Keys** → **Create API Key**
3. Copie a API Key (ela aparece apenas uma vez!)
4. Configure o `.env`:

```env
# SendGrid
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASS=SG.xxxxxxxxxxxx  # Sua API Key aqui
EMAIL_FROM_NAME=Gestor de Consórcios
EMAIL_FROM_EMAIL=noreply@seudominio.com
```

#### Verificação de Domínio (Opcional - Maior volume):

1. Em **Settings** → **Sender Authentication** → **Authenticate Your Domain**
2. Adicione os registros DNS fornecidos ao seu provedor de domínio
3. Aguarde verificação (até 48h)

**Planos**:
- **Free**: 100 emails/dia
- **Essentials** ($19.95/mês): 50.000 emails/mês
- **Pro** ($89.95/mês): 100.000 emails/mês

---

### 3. **Mailgun (Alternativa)** 💪

**Prós**:
- 5.000 e-mails/mês GRÁTIS (primeiros 3 meses)
- API poderosa
- Bom para desenvolvedores

**Contras**: Depois dos 3 meses, 1.000 emails/mês grátis

#### Configuração:

1. Crie conta em: https://www.mailgun.com/
2. Vá em **Sending** → **Domains** → Selecione seu domínio
3. Copie as credenciais SMTP
4. Configure o `.env`:

```env
# Mailgun
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=postmaster@seu-dominio.mailgun.org
EMAIL_PASS=sua-senha-mailgun
EMAIL_FROM_NAME=Gestor de Consórcios
EMAIL_FROM_EMAIL=noreply@seu-dominio.mailgun.org
```

**Planos**:
- **Foundation** (Free): 5.000 emails/mês (3 meses), depois 1.000/mês
- **Growth** ($35/mês): 50.000 emails/mês

---

### 4. **Amazon SES (Grandes Volumes)** 🚀

**Prós**:
- Muito barato: $0.10 por 1.000 e-mails
- Escalável infinitamente
- Integração AWS

**Contras**:
- Configuração mais complexa
- Requer verificação AWS
- Começa em "sandbox" (200 emails/dia)

#### Configuração:

1. Crie conta AWS: https://aws.amazon.com/ses/
2. Vá para **Amazon SES Console**
3. Crie credenciais SMTP em **Account Dashboard** → **SMTP Settings**
4. Solicite saída do Sandbox (produção)
5. Configure o `.env`:

```env
# Amazon SES
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com  # Sua região
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=suas-credenciais-smtp-aqui
EMAIL_PASS=sua-senha-smtp-aqui
EMAIL_FROM_NAME=Gestor de Consórcios
EMAIL_FROM_EMAIL=noreply@seudominio.com
```

**Preços**: $0.10 por 1.000 emails

---

### 5. **Resend (Moderno)** 🆕

**Prós**:
- 100 emails/dia GRÁTIS
- Interface moderna
- Foco em desenvolvedores

**Contras**: Empresa nova (menos estabelecida)

#### Configuração:

1. Crie conta em: https://resend.com/
2. Gere uma API Key
3. Configure o `.env`:

```env
# Resend
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=resend
EMAIL_PASS=re_xxxxxxxxxxxx  # Sua API Key
EMAIL_FROM_NAME=Gestor de Consórcios
EMAIL_FROM_EMAIL=onboarding@resend.dev
```

**Planos**:
- **Free**: 100 emails/dia, 3.000/mês
- **Pro** ($20/mês): 50.000 emails/mês

---

## 🔧 Testando a Configuração

Depois de configurar, teste o envio:

### 1. Teste de Recuperação de Senha

```bash
# No backend, rode
cd backend
npm run dev
```

Acesse: http://localhost:3000/esqueci-senha

Tente recuperar a senha de um usuário de teste.

### 2. Verificar Logs

Cheque os logs do backend para confirmar:
```
✅ Email de recuperação de senha enviado: <message-id>
```

### 3. Testar Cadastro de Cliente

Cadastre um novo cliente e verifique se os emails são enviados para:
- Cliente (confirmação)
- Vendedor (notificação)

---

## 🔐 Boas Práticas de Segurança

### ❌ NÃO FAÇA:

```env
# NUNCA commite suas credenciais!
EMAIL_PASS=minha-senha-123
```

### ✅ FAÇA:

1. **Use variáveis de ambiente** - Nunca hardcode senhas
2. **Adicione `.env` ao `.gitignore`**
3. **Use diferentes credenciais** para dev/staging/prod
4. **Rotacione API keys** periodicamente (a cada 6 meses)
5. **Monitore uso** para detectar abusos

---

## 📊 Comparação de Provedores

| Provedor | Plano Grátis | Preço Inicial | Melhor Para |
|----------|--------------|---------------|-------------|
| **Gmail** | 500/dia | - | Desenvolvimento apenas |
| **SendGrid** ⭐ | 100/dia | $19.95/mês | Pequenas/Médias empresas |
| **Mailgun** | 1.000/mês | $35/mês | Desenvolvedores |
| **Amazon SES** | 200/dia* | $0.10/1k emails | Grandes volumes |
| **Resend** | 3.000/mês | $20/mês | Startups modernas |

*Em sandbox mode

---

## 🚨 Troubleshooting

### Erro: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Gmail**: Você precisa usar uma "Senha de App", não sua senha normal.

**Solução**:
1. Ative verificação em 2 etapas
2. Gere senha de app em: https://myaccount.google.com/apppasswords

---

### Erro: "EAUTH - Authentication failed"

**Causa**: Credenciais incorretas ou formato errado.

**Solução**:
1. Verifique `EMAIL_USER` e `EMAIL_PASS` no `.env`
2. Para SendGrid, certifique-se que `EMAIL_USER=apikey` (literal)
3. Reinicie o servidor após alterar `.env`

---

### Erro: "ETIMEDOUT" ou "ECONNREFUSED"

**Causa**: Firewall bloqueando conexões SMTP.

**Solução**:
1. Verifique se a porta 587 está aberta
2. Se estiver em produção (Render, Heroku), teste com outro provedor
3. Alguns hosts bloqueiam porta 25, use 587 ou 465

---

### Emails vão para SPAM

**Causas**:
- Sem verificação de domínio
- IP sem reputação
- Conteúdo suspeito

**Soluções**:
1. **Verifique seu domínio** no provedor SMTP
2. Configure **SPF, DKIM e DMARC** (fornecidos pelo provedor)
3. Use um **domínio próprio** (não @gmail.com)
4. Aqueça o IP gradualmente (comece com poucos emails)
5. Evite palavras-gatilho de spam no assunto

---

## 📝 Checklist de Produção

Antes de ir para produção:

- [ ] Escolhi um provedor SMTP profissional (não Gmail)
- [ ] Configurei todas as variáveis no `.env` de produção
- [ ] Testei recuperação de senha
- [ ] Testei cadastro de cliente (email para cliente e vendedor)
- [ ] Verifiquei que emails não vão para SPAM
- [ ] Configurei SPF/DKIM (se aplicável)
- [ ] Configurei monitoramento de bounces/falhas
- [ ] Documentei as credenciais em local seguro (não no código!)

---

## 🎯 Recomendação Final

**Para a maioria dos casos**: Use **SendGrid**

- ✅ 100 emails/dia grátis
- ✅ Fácil de configurar
- ✅ Profissional e confiável
- ✅ Bom custo-benefício ao escalar

**Para grandes volumes (5k+ emails/dia)**: Use **Amazon SES**

**Para testes/desenvolvimento**: Gmail (com Senha de App)

---

## 📚 Recursos Adicionais

- [Documentação SendGrid](https://docs.sendgrid.com/)
- [Documentação Mailgun](https://documentation.mailgun.com/)
- [Documentação Amazon SES](https://docs.aws.amazon.com/ses/)
- [Guia SPF/DKIM](https://www.cloudflare.com/learning/dns/dns-records/dns-spf-record/)
- [Teste de Spam](https://www.mail-tester.com/)

---

**Última atualização**: ${new Date().toLocaleDateString('pt-BR')}
**Versão**: 1.0
