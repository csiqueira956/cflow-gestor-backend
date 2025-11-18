# ❓ FAQ - Perguntas Frequentes

Respostas para as dúvidas mais comuns sobre o Gestor de Consórcios.

---

## 📋 Instalação e Setup

### 1. Não consigo executar o script de setup

**Q**: Quando executo `./setup.sh`, recebo erro "permission denied"

**A**: Você precisa dar permissão de execução:
```bash
chmod +x setup.sh
./setup.sh
```

---

### 2. O script de setup falha no Windows

**Q**: O PowerShell bloqueia a execução do script

**A**: Execute o PowerShell como Administrador e rode:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup.ps1
```

---

### 3. Node.js não encontrado

**Q**: Setup diz que Node.js não está instalado

**A**:
1. Baixe Node.js 16+ em https://nodejs.org/
2. Instale e reinicie o terminal
3. Verifique: `node -v`

---

## 🔐 Autenticação e Senha

### 4. Esqueci a senha do admin

**Q**: Não lembro a senha do administrador

**A**:
**Opção 1**: Use a recuperação de senha (se configurou email):
- Acesse `/esqueci-senha`
- Digite admin@gestorconsorcios.com
- Siga o email

**Opção 2**: Resetar banco de dados (PERDE TODOS OS DADOS):
```bash
cd backend
rm database/gestor-consorcios.db
npm run dev  # Recria com dados de teste
```

---

### 5. Recuperação de senha não envia email

**Q**: Solicitei recuperação mas não recebo email

**A**: Verifique:
1. **Email configurado**: Edite `backend/.env`
2. **SMTP correto**: Para Gmail, use senha de app (não senha normal)
3. **Spam**: Verifique pasta de spam
4. **Logs**: Veja terminal do backend para erros

---

### 6. Como gerar senha de app do Gmail?

**Q**: Preciso de ajuda com senha de app do Gmail

**A**:
1. Ative verificação em 2 etapas: https://myaccount.google.com/security
2. Vá em: https://myaccount.google.com/apppasswords
3. Selecione "App: Mail" e "Device: Other"
4. Copie a senha de 16 caracteres
5. Use no `backend/.env` em `EMAIL_PASS`

---

## 🚀 Execução e Deploy

### 7. Porta 3001 já está em uso

**Q**: Backend não inicia dizendo que porta está ocupada

**A**:
**Linux/macOS**:
```bash
lsof -ti:3001 | xargs kill -9
```

**Windows**:
```powershell
netstat -ano | findstr :3001
taskkill /PID <número_pid> /F
```

Ou edite `backend/.env` e mude `PORT=3001` para outra porta.

---

### 8. Frontend não se conecta ao backend

**Q**: Frontend carrega mas não busca dados

**A**: Verifique:
1. **Backend rodando**: Deve estar em http://localhost:3001
2. **CORS**: Verifique `backend/.env` tem `FRONTEND_URL=http://localhost:3000`
3. **URL correta**: `frontend/.env` tem `VITE_API_URL=http://localhost:3001`

---

### 9. Como fazer deploy em produção?

**Q**: Quero colocar online, como faço?

**A**: Siga o guia completo: [DEPLOY_PRODUCTION.md](DEPLOY_PRODUCTION.md)

**Resumo**:
1. Migre para PostgreSQL (obrigatório)
2. Configure variáveis de ambiente de produção
3. Deploy backend (Render/Heroku/Railway)
4. Deploy frontend (Vercel/Netlify)
5. Configure domínio e SSL

**Custo estimado**: R$ 0-200/mês

---

## 🗄️ Banco de Dados

### 10. Banco de dados corrompido

**Q**: Erro ao acessar banco de dados SQLite

**A**:
```bash
# Backup (se possível)
cp backend/database/gestor-consorcios.db backup.db

# Deletar e recriar
rm backend/database/gestor-consorcios.db

# Reiniciar backend - recria automaticamente
cd backend
npm run dev
```

**⚠️ Isso apaga todos os dados!**

---

### 11. Como migrar para PostgreSQL?

**Q**: Estou usando SQLite mas quero PostgreSQL

**A**: Siga o guia: [MIGRATION_POSTGRESQL.md](MIGRATION_POSTGRESQL.md)

**Opções**:
1. **Supabase** (gratuito até 500MB)
2. **Render** (gratuito)
3. **Railway** ($5/mês)
4. **Servidor próprio**

---

### 12. Perdeu dados importantes?

**Q**: Deletei clientes/comissões por acidente

**A**:
- **SQLite**: Sem backup automático, dados perdidos
- **PostgreSQL em produção**: Restaure do backup diário
- **Prevenção**: Configure backups automáticos (veja DEPLOY_PRODUCTION.md)

---

## 🐛 Erros Comuns

### 13. "Cannot find module"

**Q**: Erro ao iniciar backend ou frontend

**A**:
```bash
# Reinstalar dependências
cd backend
rm -rf node_modules package-lock.json
npm install

cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

---

### 14. "JWT malformed" ou "Invalid token"

**Q**: Logout automático ou erro de autenticação

**A**:
1. Limpe localStorage:
   - Abra DevTools (F12)
   - Console: `localStorage.clear()`
   - Recarregue página
2. Faça login novamente

---

### 15. Kanban não carrega clientes

**Q**: Kanban vazio mesmo com clientes cadastrados

**A**:
1. **Verifique filtros**: Se for vendedor, só vê seus clientes
2. **Console do navegador**: F12 → Console → Erros?
3. **Backend**: Terminal do backend mostra erros?
4. **Banco**: Clientes existem? `sqlite3 backend/database/gestor-consorcios.db "SELECT * FROM clientes;"`

---

### 16. Drag & drop não funciona no mobile

**Q**: Não consigo arrastar cards no celular

**A**: Isso é esperado em alguns navegadores mobile antigos. Soluções:
1. Use botões de mudança de etapa (futuro)
2. Use desktop/tablet
3. Atualize navegador mobile

---

## 📧 Email e Notificações

### 17. Qual provedor de email usar?

**Q**: Gmail, SendGrid, Mailgun ou outro?

**A**: Veja comparação em [CONFIGURACAO_SMTP.md](CONFIGURACAO_SMTP.md)

**Recomendações**:
- **Desenvolvimento**: Gmail (gratuito, 500/dia)
- **Produção pequena**: SendGrid (100/dia grátis)
- **Produção grande**: Amazon SES ($0.10/1000 emails)

---

### 18. Posso usar meu domínio nos emails?

**Q**: Quero enviar de contato@minhaempresa.com

**A**: Sim! Configure:
1. Escolha provedor (SendGrid, Mailgun, SES)
2. Verifique domínio (adicione DNS records)
3. Configure `EMAIL_FROM_EMAIL=contato@minhaempresa.com`

Veja guia completo: [CONFIGURACAO_SMTP.md](CONFIGURACAO_SMTP.md)

---

## 👥 Usuários e Permissões

### 19. Como criar mais administradores?

**Q**: Preciso de outro usuário admin

**A**:
**Opção 1** (via banco de dados):
```sql
UPDATE usuarios SET role = 'admin' WHERE email = 'usuario@email.com';
```

**Opção 2** (futuro):
Interface para promoção de usuários está no roadmap (v2.1)

---

### 20. Vendedor vê clientes de outros vendedores?

**Q**: Vendedor consegue ver todos os clientes

**A**: **Não deveria!** Isso é um bug. Verifique:
1. `backend/src/controllers/clienteController.js` tem filtro por vendedor
2. Token JWT válido
3. Role do usuário correto

Se persiste, abra issue no GitHub ou contate suporte.

---

## 💰 Comissões

### 21. Como calcular comissão automaticamente?

**Q**: Sistema calcula comissão sozinho?

**A**: Sim! Ao criar comissão:
1. Valor total: R$ 10.000
2. Percentual: 5%
3. Parcelas: 10
4. Sistema cria 10 parcelas de R$ 50 cada (10.000 × 0.05 / 10)

---

### 22. Como editar parcelas individualmente?

**Q**: Quero mudar valor de uma parcela específica

**A**: Atualmente não suportado. Workaround:
1. Delete a comissão
2. Crie nova com valores corretos

**Futuro**: Edição de parcelas vem em v2.1

---

## 🔒 Segurança e LGPD

### 23. Sistema é seguro para produção?

**Q**: Posso usar em produção com dados reais?

**A**: **Sim, com ressalvas**:

✅ **Implementado**:
- Criptografia de senhas (bcrypt)
- Rate limiting
- Validação de inputs (XSS protection)
- Headers seguros (Helmet)
- Tokens JWT
- HTTPS (quando configurado)

⚠️ **Antes de produção**:
- [ ] Revise documentos legais com advogado
- [ ] Configure PostgreSQL (não SQLite)
- [ ] Configure backups automáticos
- [ ] Use SMTP profissional
- [ ] Configure monitoramento (Sentry)
- [ ] Faça testes de penetração

---

### 24. Sistema está em conformidade com LGPD?

**Q**: Estou seguro legalmente?

**A**: **80% compliant**, falta:
- [ ] Revisão jurídica dos documentos
- [ ] Checkbox de aceite de termos
- [ ] Painel de privacidade para usuário
- [ ] Logs de auditoria completos
- [ ] Exportação de dados (portabilidade)

**Recomendação**: Consulte advogado especializado em LGPD antes de processar dados sensíveis.

---

## 📱 Mobile e Responsividade

### 25. Tem app mobile?

**Q**: Existe versão para celular?

**A**: Não há app nativo, mas:
- ✅ Interface web é responsiva
- ✅ Funciona em navegadores mobile
- ✅ Pode ser instalado como PWA (futuro)

**Roadmap**: App nativo (React Native) planejado para v3.0

---

### 26. Como instalar como app no celular?

**Q**: Posso adicionar à tela inicial?

**A**: Navegadores modernos suportam:
1. Abra o site no navegador mobile
2. Menu → "Adicionar à tela inicial"
3. Ícone será criado

**Nota**: Ainda não é PWA completo, mas funciona offline parcialmente.

---

## 🛠️ Desenvolvimento

### 27. Como contribuir com o projeto?

**Q**: Quero adicionar funcionalidades

**A**:
1. Fork o repositório
2. Crie branch: `git checkout -b feature/minha-feature`
3. Commit: `git commit -m "Adiciona feature X"`
4. Push: `git push origin feature/minha-feature`
5. Abra Pull Request

Veja [CONTRIBUTING.md](CONTRIBUTING.md) (se existir)

---

### 28. Onde reportar bugs?

**Q**: Encontrei um erro

**A**:
1. Verifique se não está no FAQ
2. Procure issues existentes no GitHub
3. Crie nova issue com:
   - Passos para reproduzir
   - Comportamento esperado
   - Comportamento atual
   - Screenshots (se aplicável)
   - Versão do sistema

---

### 29. Posso vender este sistema?

**Q**: Licença permite uso comercial?

**A**: Verifique arquivo [LICENSE](LICENSE).

Se for MIT: **Sim**, você pode:
- ✅ Usar comercialmente
- ✅ Modificar
- ✅ Distribuir
- ✅ Sublicenciar

**Obrigações**:
- Manter aviso de copyright
- Incluir cópia da licença

---

## 🆘 Suporte

### 30. Onde obter ajuda?

**Q**: Preciso de suporte técnico

**A**:
1. **Documentação**: Leia os 11 documentos .md
2. **FAQ**: Este arquivo (você está aqui!)
3. **Issues**: GitHub Issues
4. **Comunidade**: [LINK_DISCORD/SLACK]
5. **Suporte pago**: [CONTATO]

---

## 📊 Estatísticas e Performance

### 31. Quantos usuários simultâneos suporta?

**Q**: Sistema aguenta quantos acessos?

**A**: Depende da infraestrutura:

**SQLite** (desenvolvimento):
- ~10 usuários simultâneos
- Não recomendado para produção

**PostgreSQL** (produção):
- 100-1000+ usuários (com otimizações)
- Escalável com load balancing

**Gargalos**:
- Render/Heroku free tier: ~100 requisições/min
- Upgrade para plano pago: milhares/min

---

### 32. Como otimizar performance?

**Q**: Sistema está lento

**A**:
1. **Backend**:
   - Adicione índices no banco
   - Implemente cache (Redis)
   - Use CDN para assets estáticos

2. **Frontend**:
   - Build de produção: `npm run build`
   - Lazy loading de componentes
   - Otimize imagens

3. **Infraestrutura**:
   - Use PostgreSQL em produção
   - Configure load balancing
   - CDN (Cloudflare/Vercel)

---

## 🔄 Atualizações

### 33. Como atualizar para versão nova?

**Q**: Nova versão foi lançada

**A**:
```bash
# Backup primeiro!
git pull origin main
cd backend && npm install
cd ../frontend && npm install

# Rode migrações se houver
# Reinicie servidores
```

Sempre leia [CHANGELOG.md](CHANGELOG.md) antes de atualizar.

---

### 34. Posso pular versões?

**Q**: Estou na v1.0, posso ir direto para v2.0?

**A**: Geralmente **não recomendado**.

**Melhor**: Atualize incrementalmente (1.0 → 1.1 → 2.0) para evitar breaking changes.

Se precisar pular:
1. Leia todos os CHANGELOGs intermediários
2. Execute todas as migrações de banco
3. Teste extensivamente antes de produção

---

## 💬 Não encontrou sua resposta?

**Outras fontes de ajuda**:

📚 **Documentação**:
- [README.md](README.md) - Visão geral
- [QUICK_START.md](QUICK_START.md) - Início rápido
- [GUIA_DE_TESTES.md](GUIA_DE_TESTES.md) - Testes

🐛 **Problemas técnicos**:
- GitHub Issues: [LINK]
- Email: [CONTATO]

💼 **Comercial/Empresarial**:
- Website: [LINK]
- Contato: [EMAIL/TELEFONE]

---

**Última atualização**: ${new Date().toLocaleDateString('pt-BR')}
**Versão**: 2.0.0
