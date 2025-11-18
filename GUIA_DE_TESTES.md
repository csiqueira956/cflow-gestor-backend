# Guia de Testes - Gestor de Consórcios

Guia completo para testar todas as funcionalidades do sistema antes de ir para produção.

---

## 📋 Checklist de Testes

### ✅ Testes Obrigatórios (Antes de Produção)

- [ ] **Autenticação Básica**
- [ ] **Recuperação de Senha**
- [ ] **Gestão de Clientes**
- [ ] **Sistema de Comissões**
- [ ] **Formulários Públicos**
- [ ] **Rate Limiting**
- [ ] **Documentos Legais**
- [ ] **Responsividade Mobile**

---

## 1. 🔐 Autenticação Básica

### 1.1 Login

**Casos de Teste:**

```
✅ Login com credenciais válidas
   - Email: admin@gestorconsorcios.com
   - Senha: admin123
   - Resultado esperado: Redireciona para /dashboard

✅ Login com email inválido
   - Email: usuario@inexistente.com
   - Senha: qualquersenha
   - Resultado esperado: Erro "Email ou senha inválidos"

✅ Login com senha incorreta
   - Email: admin@gestorconsorcios.com
   - Senha: senhaerrada
   - Resultado esperado: Erro "Email ou senha inválidos"

✅ Toggle mostrar/ocultar senha
   - Clicar no ícone de olho
   - Resultado esperado: Senha fica visível/oculta

✅ Checkbox "Lembrar meu email"
   - Marcar checkbox e fazer login
   - Fazer logout e voltar ao login
   - Resultado esperado: Email pré-preenchido
```

### 1.2 Persistência de Sessão

```
✅ Refresh da página mantém login
   - Fazer login
   - Pressionar F5
   - Resultado esperado: Usuário continua logado

✅ Logout funciona corretamente
   - Fazer logout
   - Tentar acessar /dashboard diretamente
   - Resultado esperado: Redireciona para /login
```

---

## 2. 🔄 Recuperação de Senha (CRÍTICO)

### 2.1 Configurar Email Primeiro

**Antes de testar, configure SMTP no backend/.env:**

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app
EMAIL_FROM_NAME=Gestor de Consórcios
EMAIL_FROM_EMAIL=seu-email@gmail.com
```

Para Gmail:
1. Ative verificação em 2 etapas
2. Gere senha de app em: https://myaccount.google.com/apppasswords
3. Use a senha de app (não sua senha normal)

### 2.2 Solicitar Recuperação

**URL**: http://localhost:3000/esqueci-senha

```
✅ Solicitar com email válido
   - Email: admin@gestorconsorcios.com
   - Resultado esperado:
     ✓ Mensagem de sucesso exibida
     ✓ Instruções para verificar email
     ✓ Email enviado (verificar inbox)

✅ Solicitar com email inválido
   - Email: emailinvalido
   - Resultado esperado: Erro de validação

✅ Solicitar com email não cadastrado
   - Email: naoexiste@email.com
   - Resultado esperado: Mesma mensagem de sucesso (segurança)

✅ Rate limiting (3 tentativas/hora)
   - Fazer 4 solicitações seguidas
   - 4ª tentativa deve retornar erro 429
```

### 2.3 Email Recebido

**Verificar no inbox:**

```
✅ Email chegou corretamente
   - Assunto: "🔐 Recuperação de Senha - Gestor de Consórcios"
   - Remetente: Nome configurado no .env

✅ Layout HTML renderizado
   - Header com gradiente roxo
   - Botão "Redefinir Senha" estilizado
   - Avisos de segurança visíveis
   - Link alternativo presente

✅ Link funciona
   - Clicar no botão "Redefinir Senha"
   - Deve abrir: http://localhost:3000/resetar-senha?token=...
   - Página carrega corretamente
```

### 2.4 Redefinir Senha

**URL**: Acessar via link do email

```
✅ Token válido
   - Acessar link do email (dentro de 1 hora)
   - Resultado esperado:
     ✓ Nome do usuário exibido
     ✓ Formulário de nova senha aparece
     ✓ Toggle show/hide funcionando

✅ Preencher nova senha
   - Nova senha: NovaSenh@123
   - Confirmar: NovaSenh@123
   - Clicar "Alterar Senha"
   - Resultado esperado:
     ✓ Mensagem de sucesso
     ✓ Redirecionamento automático para /login em 3s

✅ Login com nova senha
   - Email: admin@gestorconsorcios.com
   - Senha: NovaSenh@123
   - Resultado esperado: Login bem-sucedido

✅ Senha antiga não funciona mais
   - Tentar login com senha antiga
   - Resultado esperado: Erro "Email ou senha inválidos"

✅ Validações de senha
   - Nova senha: 123 (menos de 6 caracteres)
   - Resultado: Erro "A senha deve ter no mínimo 6 caracteres"

   - Nova senha: senha123
   - Confirmar: senha456
   - Resultado: Erro "As senhas não coincidem"

✅ Token expirado (após 1 hora)
   - Esperar 1 hora ou manipular banco de dados
   - Tentar acessar link
   - Resultado: "Link inválido ou expirado"

✅ Token já usado (uso único)
   - Redefinir senha com sucesso
   - Tentar usar o mesmo link novamente
   - Resultado: "Link inválido ou expirado"

✅ Token inválido
   - Acessar /resetar-senha?token=tokeninvalido123
   - Resultado: "Link inválido ou expirado"
   - Botões para solicitar novo link e voltar ao login
```

### 2.5 Fluxo Completo (Teste E2E)

```
1. Fazer logout (se estiver logado)
2. Ir para /login
3. Clicar "Esqueci minha senha"
4. Digitar email: admin@gestorconsorcios.com
5. Verificar email recebido
6. Clicar no link do email
7. Digitar nova senha duas vezes
8. Aguardar redirecionamento
9. Fazer login com a nova senha
10. Confirmar acesso ao dashboard
```

---

## 3. 👥 Gestão de Clientes

### 3.1 CRUD Básico

```
✅ Criar cliente
   - Acessar Kanban
   - Clicar "+ Novo Contato"
   - Preencher: Nome, Email, Telefone, CPF
   - Resultado: Cliente aparece na coluna "Novo Contato"

✅ Editar cliente
   - Clicar em um card do cliente
   - Modificar dados
   - Salvar
   - Resultado: Dados atualizados

✅ Mover cliente entre etapas (Drag & Drop)
   - Arrastar card para outra coluna
   - Resultado: Cliente muda de etapa

✅ Deletar cliente
   - Abrir detalhes do cliente
   - Clicar em deletar
   - Confirmar
   - Resultado: Cliente removido
```

### 3.2 Validações

```
✅ CPF inválido
   - Digitar CPF com formato incorreto
   - Resultado: Máscara formata automaticamente

✅ Telefone formatado
   - Digitar: 11999887766
   - Resultado: Exibido como (11) 99988-7766
```

---

## 4. 💰 Sistema de Comissões

```
✅ Criar comissão
   - Acessar /comissoes
   - Clicar "Nova Comissão"
   - Preencher dados (cliente, valor, percentual, parcelas)
   - Resultado: Comissão criada com parcelas

✅ Cálculo automático
   - Valor: R$ 10.000,00
   - Percentual: 5%
   - Parcelas: 10
   - Resultado esperado: 10 parcelas de R$ 50,00

✅ Marcar parcela como paga
   - Selecionar uma parcela
   - Marcar como "Pago"
   - Resultado: Status atualizado

✅ Filtros por vendedor (Admin)
   - Selecionar vendedor específico
   - Resultado: Apenas comissões daquele vendedor
```

---

## 5. 🔗 Formulários Públicos

### 5.1 Geração de Link

```
✅ Acessar Meu Link
   - Ir para /meu-link
   - Verificar que link está visível
   - Copiar link

✅ Compartilhar link
   - Abrir link em aba anônima/navegador diferente
   - Resultado: Página pública carrega sem login
```

### 5.2 Cadastro Público

```
✅ Preencher formulário público
   - Acessar link público
   - Preencher todos os campos
   - Enviar
   - Resultado:
     ✓ Mensagem de sucesso
     ✓ Cliente aparece na lista do vendedor
     ✓ Email enviado para cliente (se configurado)
     ✓ Email enviado para vendedor (notificação)
```

---

## 6. 🛡️ Rate Limiting

### 6.1 Login

```
✅ Limite de tentativas de login
   - Fazer 5 tentativas de login com senha errada
   - 6ª tentativa deve retornar: "Too many requests"
   - Aguardar 15 minutos ou testar em nova aba anônima
```

### 6.2 Recuperação de Senha

```
✅ Limite de solicitações de recuperação
   - Fazer 3 solicitações de recuperação
   - 4ª tentativa deve retornar erro 429
   - Mensagem: "Você atingiu o limite de tentativas"
```

### 6.3 Cadastro

```
✅ Limite de cadastros (Admin)
   - Tentar criar 4 vendedores seguidos
   - 4ª tentativa deve retornar erro
```

---

## 7. 📄 Documentos Legais

```
✅ Termos de Uso
   - Acessar http://localhost:3000/termos-de-uso
   - Verificar carregamento completo
   - Links de navegação funcionam

✅ Política de Privacidade
   - Acessar http://localhost:3000/politica-privacidade
   - Verificar LGPD compliance (Art. 18 mencionado)
   - Links de navegação funcionam

✅ Links no Login
   - Na página de login, verificar links no rodapé
   - Clicar em "Termos de Uso"
   - Clicar em "Política de Privacidade"
   - Ambos devem abrir corretamente
```

---

## 8. 📱 Responsividade Mobile

### 8.1 Telas a Testar

```
✅ Login
   - Abrir em mobile (ou DevTools responsive mode)
   - Largura: 375px (iPhone SE)
   - Verificar layout não quebra

✅ Dashboard
   - Cards responsivos
   - Estatísticas empilhadas verticalmente

✅ Kanban
   - Colunas empilhadas ou scroll horizontal
   - Drag & drop funciona em touch

✅ Formulários
   - Campos bem dimensionados
   - Botões acessíveis
   - Teclado virtual não cobre campos
```

---

## 9. 🔒 Segurança

### 9.1 Proteção de Rotas

```
✅ Rotas protegidas
   - Fazer logout
   - Tentar acessar diretamente:
     - http://localhost:3000/dashboard
     - http://localhost:3000/admin
     - http://localhost:3000/perfil
   - Resultado: Todas redirecionam para /login

✅ Permissões de Admin
   - Fazer login como vendedor
   - Tentar acessar /admin
   - Resultado: Redireciona para /dashboard

✅ Token expirado
   - Modificar manualmente o token no localStorage (adicionar caracteres)
   - Tentar acessar dashboard
   - Resultado: Logout automático
```

### 9.2 XSS Protection

```
✅ Teste de XSS em campos
   - Tentar cadastrar cliente com nome: <script>alert('XSS')</script>
   - Resultado esperado: Script não executa, texto é exibido como string
```

---

## 10. 🌐 Navegação e UX

```
✅ Navegação entre páginas
   - Clicar em todos os itens do menu
   - Verificar que todas as páginas carregam

✅ Sidebar expansível
   - Clicar no botão de expandir/recolher
   - Resultado: Sidebar abre/fecha suavemente

✅ Mensagens de feedback (toast)
   - Ao salvar/deletar/atualizar
   - Resultado: Toast aparece no canto superior direito

✅ Loading states
   - Ao fazer ações demoradas
   - Resultado: Botões mostram "Carregando..." ou spinner

✅ Voltar do navegador
   - Navegar entre páginas
   - Clicar "Voltar" do navegador
   - Resultado: Volta corretamente sem erros
```

---

## 11. 🗄️ Banco de Dados

### 11.1 Integridade

```
✅ Relacionamentos mantidos
   - Deletar um cliente
   - Verificar que comissões relacionadas não quebram

✅ Transações
   - Criar comissão com parcelas
   - Verificar que todas as parcelas foram criadas
```

---

## 🐛 Bugs Conhecidos (Se houver)

_(Nenhum bug conhecido no momento)_

---

## 📊 Relatório de Testes

Use este template para documentar seus testes:

```markdown
# Relatório de Testes - ${new Date().toLocaleDateString('pt-BR')}

**Testador**: [Seu Nome]
**Ambiente**: Desenvolvimento Local / Staging / Produção
**Navegador**: Chrome 120 / Firefox 121 / Safari 17

## Resultados

| # | Teste | Status | Observações |
|---|-------|--------|-------------|
| 1 | Login básico | ✅ Pass | - |
| 2 | Recuperação de senha | ✅ Pass | Email demorou 30s |
| 3 | Rate limiting | ⚠️ Warning | Testado apenas login |
| 4 | CRUD clientes | ✅ Pass | - |
| 5 | Responsividade mobile | ❌ Fail | Kanban quebra em 320px |

## Bugs Encontrados

### Bug #1: [Título]
- **Severidade**: Crítica / Alta / Média / Baixa
- **Passos para reproduzir**:
  1. ...
  2. ...
- **Resultado esperado**: ...
- **Resultado obtido**: ...
- **Screenshot**: [anexar se possível]

## Recomendações

- [ ] Corrigir bug #1 antes de produção
- [ ] Adicionar mais testes automatizados
- [ ] ...
```

---

## ⚡ Testes Automatizados (Futuro)

Para versões futuras, considere implementar:

```bash
# Testes unitários (Jest)
npm test

# Testes E2E (Cypress)
npm run test:e2e

# Cobertura de testes
npm run test:coverage
```

---

## 📝 Checklist Final antes de Produção

- [ ] ✅ Todos os testes manuais passaram
- [ ] ✅ Email SMTP configurado e testado
- [ ] ✅ Rate limiting testado e funcionando
- [ ] ✅ Documentos legais revisados (jurídico)
- [ ] ✅ Responsividade verificada (mobile + desktop)
- [ ] ✅ Segurança testada (XSS, SQL injection, auth)
- [ ] ✅ PostgreSQL configurado (migração de SQLite)
- [ ] ✅ Variáveis de ambiente de produção configuradas
- [ ] ✅ SSL/HTTPS ativo
- [ ] ✅ Domínio configurado
- [ ] ✅ Backups configurados
- [ ] ✅ Monitoramento ativo (Sentry)
- [ ] ✅ Testes de carga realizados
- [ ] ✅ Plano de rollback definido

---

**Boa sorte com os testes! 🚀**

Se encontrar bugs, documente-os claramente e priorize correções antes do deploy.
