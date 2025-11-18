# Identidade Visual - Gestor de Consórcios

## Paleta de Cores

### Cor Principal - Azul Petróleo (Primary)
Representa tecnologia, confiança e profissionalismo.

```css
primary: {
  50: '#f0fdfa',
  100: '#ccfbf1',
  200: '#99f6e4',
  300: '#5eead4',
  400: '#2dd4bf',
  500: '#14b8a6',  // Cor base
  600: '#0d9488',
  700: '#0f766e',
  800: '#115e59',
  900: '#134e4a',
}
```

**Uso:**
- Navbar e navegação
- Links e elementos interativos
- Gradientes de fundo
- Estatísticas e números
- Logo principal

### Cor de Destaque - Laranja (Accent)
Representa ação, energia e conversão.

```css
accent: {
  50: '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  300: '#fdba74',
  400: '#fb923c',
  500: '#f97316',  // Cor base
  600: '#ea580c',
  700: '#c2410c',
  800: '#9a3412',
  900: '#7c2d12',
}
```

**Uso:**
- Botões de ação primária (CTAs)
- Badges e notificações
- Elementos que precisam chamar atenção
- Cards de destaque
- Setas do logo

## Tipografia

### Fontes

**Títulos (H1, H2, H3, H4, H5, H6):**
- Fonte: `Poppins`
- Pesos: 300, 400, 500, 600, 700, 800
- Estilo: Sans-serif moderna, geométrica, legível

**Corpo de Texto:**
- Fonte: `Inter`
- Pesos: 300, 400, 500, 600, 700, 800
- Estilo: Sans-serif otimizada para telas, alta legibilidade

### Hierarquia Tipográfica

```css
h1: text-3xl font-bold (Poppins)
h2: text-2xl font-bold (Poppins)
h3: text-xl font-semibold (Poppins)
body: text-base font-normal (Inter)
small: text-sm (Inter)
```

## Logo

### Descrição
O logo é composto por:
1. **Símbolo "C" estilizado**: Representa "Consórcio"
2. **Fluxo circular**: Onda ao redor simbolizando o ciclo de vendas
3. **Setas de fluxo**: Representam o funil de vendas e progresso
4. **Ponto central**: Destaque em laranja, representa o objetivo/conversão

### Variações
- **Completo**: Logo + texto "Gestor de Consórcios"
- **Ícone**: Apenas o símbolo (para espaços reduzidos)
- **Tamanhos**: Configurável via props (padrão: 40x40px)

### Cores do Logo
- Gradiente azul petróleo: `#14b8a6` → `#0d9488`
- Setas em laranja: `#fb923c` → `#f97316`

## Componentes de UI

### Botões

**Botão Principal (Primary)**
```css
.btn-primary
Cor: Azul petróleo (#0d9488)
Hover: Tom mais escuro (#0f766e)
Uso: Ações secundárias, navegação
```

**Botão de Ação (Accent)**
```css
.btn-accent
Cor: Laranja (#f97316)
Hover: Tom mais escuro (#ea580c)
Uso: CTAs, cadastros, ações principais
Exemplos: "Cadastrar Cliente", "Entrar", "Salvar"
```

**Botão Secundário**
```css
.btn-secondary
Cor: Cinza claro (#e5e7eb)
Hover: Cinza médio (#d1d5db)
Uso: Cancelar, voltar, ações alternativas
```

### Cards

**Card Padrão**
- Fundo: Branco (#ffffff)
- Borda: Cinza claro (#f3f4f6)
- Sombra: Média (shadow-md)
- Padding: 1.5rem (p-6)
- Border radius: 8px (rounded-lg)

**Card de Destaque**
- Gradiente: Laranja (#f97316 → #ea580c)
- Texto: Branco
- Sombra: Grande (shadow-lg)
- Uso: Estatísticas totais, métricas importantes

### Kanban

**Cores das Colunas:**
1. **Novo Contato**: Azul petróleo (`bg-primary-500`)
2. **Proposta Enviada**: Laranja claro (`bg-accent-400`)
3. **Negociação**: Amarelo (`bg-yellow-500`)
4. **Fechado**: Verde (`bg-emerald-500`)
5. **Perdido**: Cinza (`bg-gray-400`)

### Inputs

**Campo de Texto**
```css
.input-field
Borda: Cinza (#d1d5db)
Focus: Ring azul petróleo (#14b8a6)
Padding: 0.5rem 1rem
Border radius: 8px
```

## Espaçamentos

### Sistema de Grid
- Container max-width: 1280px (7xl)
- Padding horizontal: 1rem (mobile) → 2rem (desktop)
- Gaps entre elementos: 1rem (4px)

### Espaçamentos Internos
- Cards: 1.5rem (24px)
- Botões: 0.5rem × 1rem (8px × 16px)
- Forms: 1.5rem entre campos

## Princípios de Design

1. **Clean e Minimalista**
   - Sem elementos decorativos desnecessários
   - Espaço em branco generoso
   - Hierarquia visual clara

2. **Legibilidade**
   - Contraste adequado (WCAG AA)
   - Tamanhos de fonte apropriados
   - Espaçamento entre linhas confortável

3. **Consistência**
   - Mesmos padrões em todas as páginas
   - Componentes reutilizáveis
   - Comportamentos previsíveis

4. **Responsividade**
   - Mobile-first approach
   - Grid flexível
   - Tipografia fluida

## Aplicação Prática

### Exemplo de Página

```jsx
<div className="min-h-screen bg-gray-50">
  <Navbar /> {/* Azul petróleo */}

  <div className="max-w-7xl mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold text-gray-900 mb-2">
      Título Principal
    </h1>

    <div className="grid grid-cols-3 gap-4">
      {/* Card de destaque */}
      <div className="card bg-gradient-to-br from-accent-500 to-accent-600 text-white">
        <p className="text-sm">Total</p>
        <p className="text-3xl font-bold">150</p>
      </div>

      {/* Cards normais */}
      <div className="card hover:shadow-lg transition-shadow">
        <p className="text-sm text-gray-600">Métrica</p>
        <p className="text-2xl font-bold text-primary-700">42</p>
      </div>
    </div>

    <button className="btn-accent mt-6">
      + Nova Ação
    </button>
  </div>
</div>
```

## Recursos

### Arquivos de Configuração
- [tailwind.config.js](frontend/tailwind.config.js) - Paleta de cores completa
- [index.css](frontend/src/index.css) - Classes utilitárias
- [Logo.jsx](frontend/src/components/Logo.jsx) - Componente do logo

### Google Fonts
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
```

## Acessibilidade

- Contraste mínimo de 4.5:1 para texto normal
- Contraste mínimo de 3:1 para texto grande
- Estados de foco visíveis
- Suporte a modo escuro (futuro)

---

**Versão:** 1.0
**Data:** Novembro 2024
**Autor:** Gestor de Consórcios
