# 🤝 Guia de Contribuição

Obrigado por considerar contribuir com o **Gestor de Consórcios**! Este documento fornece diretrizes para contribuir com o projeto.

---

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Posso Contribuir?](#como-posso-contribuir)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Processo de Desenvolvimento](#processo-de-desenvolvimento)
- [Padrões de Código](#padrões-de-código)
- [Commits e Pull Requests](#commits-e-pull-requests)
- [Reportando Bugs](#reportando-bugs)
- [Sugerindo Melhorias](#sugerindo-melhorias)

---

## 📜 Código de Conduta

Este projeto adota um Código de Conduta que esperamos que todos os participantes sigam. Ao participar, você concorda em:

- ✅ Ser respeitoso e inclusivo
- ✅ Aceitar críticas construtivas
- ✅ Focar no que é melhor para a comunidade
- ❌ Não usar linguagem ou imagens sexualizadas
- ❌ Não fazer ataques pessoais ou políticos
- ❌ Não assediar outros participantes

---

## 🎯 Como Posso Contribuir?

### 1. Reportar Bugs

Encontrou um bug? Ajude-nos abrindo uma issue:

1. **Verifique** se já não existe issue sobre o problema
2. **Use o template** de bug report
3. **Inclua**:
   - Descrição clara do problema
   - Passos para reproduzir
   - Comportamento esperado vs atual
   - Screenshots (se aplicável)
   - Informações do ambiente (OS, Node version, etc.)

### 2. Sugerir Funcionalidades

Tem uma ideia? Compartilhe!

1. **Verifique** o roadmap em [CHANGELOG.md](CHANGELOG.md)
2. **Abra uma issue** com tag `enhancement`
3. **Descreva**:
   - Problema que resolve
   - Solução proposta
   - Alternativas consideradas
   - Impacto em usuários existentes

### 3. Melhorar Documentação

Documentação nunca é demais!

- Corrigir typos
- Adicionar exemplos
- Melhorar explicações
- Traduzir documentos
- Criar tutoriais em vídeo

### 4. Contribuir com Código

Quer codificar? Ótimo!

- Corrija bugs (veja issues com tag `good first issue`)
- Implemente features aprovadas
- Melhore testes
- Otimize performance
- Refatore código

---

## 🛠️ Configuração do Ambiente

### Pré-requisitos

- Node.js 16+
- npm ou yarn
- Git
- Editor de código (recomendado: VSCode)

### Setup

```bash
# 1. Fork o repositório no GitHub

# 2. Clone seu fork
git clone https://github.com/SEU-USUARIO/gestor-consorcios.git
cd gestor-consorcios

# 3. Adicione remote upstream
git remote add upstream https://github.com/REPO-ORIGINAL/gestor-consorcios.git

# 4. Execute o setup
./setup.sh  # ou .\setup.ps1 no Windows

# 5. Crie uma branch
git checkout -b feature/minha-feature
```

### Rodando Localmente

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Acesse http://localhost:3000
```

---

## 🔄 Processo de Desenvolvimento

### 1. Escolha uma Issue

- Procure issues com `good first issue` (para iniciantes)
- Comente que vai trabalhar nela
- Aguarde aprovação de um maintainer

### 2. Crie uma Branch

```bash
# Atualize sua main
git checkout main
git pull upstream main

# Crie branch
git checkout -b tipo/nome-descritivo
```

**Tipos de branch**:
- `feature/` - Nova funcionalidade
- `fix/` - Correção de bug
- `docs/` - Documentação
- `refactor/` - Refatoração
- `test/` - Testes
- `chore/` - Manutenção

**Exemplos**:
- `feature/adicionar-relatorios-pdf`
- `fix/kanban-drag-drop-mobile`
- `docs/guia-deploy-aws`

### 3. Desenvolva

- Escreva código limpo e legível
- Siga os [Padrões de Código](#padrões-de-código)
- Adicione testes (quando aplicável)
- Teste localmente

### 4. Commit

- Commits pequenos e focados
- Mensagens claras
- Veja [Commits e Pull Requests](#commits-e-pull-requests)

### 5. Push e PR

```bash
# Push
git push origin feature/minha-feature

# Abra Pull Request no GitHub
```

---

## 📝 Padrões de Código

### JavaScript/React

**Estilo**:
- Use camelCase para variáveis e funções
- Use PascalCase para componentes React
- Indentação: 2 espaços
- Sem ponto e vírgula no final (opcional, mas seja consistente)

**Boas Práticas**:
```javascript
// ✅ Bom
const handleSubmit = async (data) => {
  try {
    const response = await api.post('/clientes', data);
    toast.success('Cliente cadastrado!');
    return response.data;
  } catch (error) {
    toast.error('Erro ao cadastrar');
    throw error;
  }
};

// ❌ Evite
const doStuff = (x) => {
  api.post('/clientes', x).then((y) => { alert('ok') })
}
```

**React**:
```jsx
// ✅ Componente funcional
const MeuComponente = ({ nome, idade }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Side effects aqui
  }, []);

  return (
    <div className="container">
      <h1>{nome}</h1>
      <p>Idade: {idade}</p>
    </div>
  );
};

// ❌ Evite class components (use hooks)
```

### Backend (Express)

**Controllers**:
```javascript
// ✅ Bom - Com tratamento de erro
export const criarCliente = async (req, res) => {
  try {
    const { nome, email, cpf } = req.body;

    // Validação
    if (!nome || !email) {
      return res.status(400).json({ error: 'Campos obrigatórios' });
    }

    // Lógica
    const cliente = await Cliente.create({ nome, email, cpf });

    // Resposta
    return res.status(201).json(cliente);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
};
```

### CSS (Tailwind)

```jsx
// ✅ Bom - Classes organizadas
<button className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50">
  Salvar
</button>

// ❌ Evite - Classes inline desorganizadas ou CSS customizado desnecessário
```

---

## 💬 Commits e Pull Requests

### Mensagens de Commit

Siga o padrão **Conventional Commits**:

```
tipo(escopo): descrição curta

Descrição mais longa (opcional)

Refs: #123
```

**Tipos**:
- `feat` - Nova feature
- `fix` - Bug fix
- `docs` - Documentação
- `style` - Formatação (não afeta código)
- `refactor` - Refatoração
- `test` - Testes
- `chore` - Manutenção

**Exemplos**:
```bash
feat(kanban): adiciona filtro por vendedor
fix(auth): corrige logout automático após refresh
docs(readme): atualiza instruções de instalação
refactor(api): simplifica controller de comissões
test(cliente): adiciona testes unitários de validação
chore(deps): atualiza dependências do backend
```

### Pull Requests

**Título**: Claro e descritivo
```
feat: Adiciona sistema de notificações por email
fix: Corrige drag & drop no Kanban mobile
docs: Adiciona guia de deploy na AWS
```

**Descrição**: Use o template

```markdown
## Descrição
Breve descrição das mudanças.

## Tipo de mudança
- [ ] Bug fix
- [x] Nova feature
- [ ] Breaking change
- [ ] Documentação

## Como testar
1. Vá para `/clientes`
2. Clique em "Novo Cliente"
3. Preencha formulário
4. Verifique que...

## Checklist
- [x] Código segue padrões do projeto
- [x] Testei localmente
- [x] Documentação atualizada (se aplicável)
- [ ] Testes adicionados/atualizados
- [x] Build passa sem warnings

## Screenshots (se aplicável)
[Adicionar imagens]

## Issues relacionadas
Closes #123
Refs #456
```

---

## 🐛 Reportando Bugs

### Template de Bug Report

```markdown
**Descrição do Bug**
Descrição clara e concisa do problema.

**Passos para Reproduzir**
1. Vá para '...'
2. Clique em '...'
3. Desça até '...'
4. Veja o erro

**Comportamento Esperado**
O que deveria acontecer.

**Comportamento Atual**
O que está acontecendo.

**Screenshots**
Se aplicável, adicione screenshots.

**Ambiente**
- OS: [ex: Windows 11, macOS 14, Ubuntu 22.04]
- Node: [ex: 18.17.0]
- Browser: [ex: Chrome 120, Firefox 121]
- Versão do Sistema: [ex: 2.0.0]

**Contexto Adicional**
Qualquer informação relevante.

**Logs de Erro**
```
Cole logs aqui
```
```

---

## 💡 Sugerindo Melhorias

### Template de Feature Request

```markdown
**Qual problema isto resolve?**
Descrição clara do problema.

**Solução Proposta**
Como você imagina que funcione.

**Alternativas Consideradas**
Outras soluções que você pensou.

**Impacto**
- Usuários afetados: [todos/vendedores/admins]
- Breaking change: [sim/não]
- Esforço estimado: [pequeno/médio/grande]

**Mockups/Exemplos**
Se tiver, adicione imagens ou links.

**Contexto Adicional**
Informações relevantes.
```

---

## ✅ Checklist antes de Submeter

Antes de abrir um PR, verifique:

- [ ] Código compila sem erros
- [ ] Código segue padrões do projeto
- [ ] Comentários explicam partes complexas
- [ ] Documentação atualizada (README, etc.)
- [ ] Testes passam (`npm test` - quando implementado)
- [ ] Sem console.logs desnecessários
- [ ] Commit messages seguem padrão
- [ ] Branch está atualizada com main
- [ ] Testei localmente todas as mudanças
- [ ] PR description está completa

---

## 🎯 Áreas que Precisam de Ajuda

Procurando por onde começar? Estas áreas precisam de contribuições:

### 🔴 Alta Prioridade

- [ ] Testes automatizados (Jest + Cypress)
- [ ] Integração WhatsApp Business
- [ ] Painel de privacidade (LGPD)
- [ ] Exportação de dados (CSV/Excel)
- [ ] Relatórios em PDF

### 🟡 Média Prioridade

- [ ] PWA (Progressive Web App)
- [ ] Notificações push
- [ ] Dashboard com gráficos (Chart.js)
- [ ] Sistema de metas
- [ ] Histórico de interações

### 🟢 Baixa Prioridade

- [ ] Dark mode
- [ ] Multi-idioma (i18n)
- [ ] Temas customizáveis
- [ ] Atalhos de teclado

---

## 📚 Recursos Úteis

- **React**: https://react.dev/
- **Express**: https://expressjs.com/
- **Tailwind CSS**: https://tailwindcss.com/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **LGPD**: https://www.gov.br/anpd

---

## 🤔 Dúvidas?

- **Issues**: Abra uma issue com tag `question`
- **Discussions**: Use GitHub Discussions
- **Email**: [INSERIR EMAIL DE CONTATO]
- **Discord**: [INSERIR LINK SE HOUVER]

---

## 🙏 Agradecimentos

Obrigado por contribuir! Toda ajuda é bem-vinda, seja grande ou pequena.

**Contributors**: Veja lista em [Contributors](https://github.com/REPO/graphs/contributors)

---

**Versão**: 2.0.0
**Última atualização**: ${new Date().toLocaleDateString('pt-BR')}
