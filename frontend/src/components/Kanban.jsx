import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ClienteCard from './ClienteCard';
import ClienteModal from './ClienteModal';
import ConfirmDialog from './ConfirmDialog';
import { KanbanSkeleton } from './LoadingSkeleton';
import { clientesAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

// Colunas padrão do Kanban com cores
const colunasIniciais = [
  { id: 'novo_contato', titulo: 'Novo Contato', cor: 'bg-blue-500' },
  { id: 'proposta_enviada', titulo: 'Proposta Enviada', cor: 'bg-purple-500' },
  { id: 'negociacao', titulo: 'Negociação', cor: 'bg-yellow-500' },
  { id: 'fechado', titulo: 'Fechado', cor: 'bg-green-500' },
  { id: 'em_comissionamento', titulo: 'Em Comissionamento', cor: 'bg-teal-500', bloqueado: true },
  { id: 'perdido', titulo: 'Perdido', cor: 'bg-gray-500' },
];

const Kanban = ({ clienteIdParaAbrir, onClienteAberto }) => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);

  // Estado para gerenciar colunas customizadas
  const [colunas, setColunas] = useState(() => {
    const savedColunas = localStorage.getItem('kanban_colunas');

    if (savedColunas) {
      const colunasParsed = JSON.parse(savedColunas);

      // Verificar se a coluna "em_comissionamento" existe
      const temEmComissionamento = colunasParsed.some(col => col.id === 'em_comissionamento');

      if (!temEmComissionamento) {
        // Adicionar a coluna "Em Comissionamento" após "Fechado"
        const indexFechado = colunasParsed.findIndex(col => col.id === 'fechado');
        const colunaEmComissionamento = {
          id: 'em_comissionamento',
          titulo: 'Em Comissionamento',
          cor: 'bg-teal-500',
          bloqueado: true
        };

        if (indexFechado !== -1) {
          // Inserir após "Fechado"
          colunasParsed.splice(indexFechado + 1, 0, colunaEmComissionamento);
        } else {
          // Se não encontrou "Fechado", adicionar antes de "Perdido"
          const indexPerdido = colunasParsed.findIndex(col => col.id === 'perdido');
          if (indexPerdido !== -1) {
            colunasParsed.splice(indexPerdido, 0, colunaEmComissionamento);
          } else {
            // Se não encontrou nem "Fechado" nem "Perdido", adicionar no final
            colunasParsed.push(colunaEmComissionamento);
          }
        }

        // Atualizar localStorage com a nova configuração
        localStorage.setItem('kanban_colunas', JSON.stringify(colunasParsed));
      }

      return colunasParsed;
    }

    return colunasIniciais;
  });
  const [mostrarNovaColuna, setMostrarNovaColuna] = useState(false);
  const [novaColuna, setNovaColuna] = useState({ titulo: '', cor: 'bg-indigo-500' });

  // Estado para edição de colunas
  const [colunaEditando, setColunaEditando] = useState(null);
  const [dadosEdicaoColuna, setDadosEdicaoColuna] = useState({ titulo: '', cor: '' });

  // Estado para busca e filtros
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState('todas');

  // Estado para cadastro rápido
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [dadosCadastro, setDadosCadastro] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    tipo_credito: '',
    valor_carta: '',
    administradora: '',
    etapa: 'novo_contato'
  });
  const [salvandoCliente, setSalvandoCliente] = useState(false);

  // Estado para confirmação de deleção
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    colunaId: null,
    colunaTitulo: '',
  });
  const [removendoColuna, setRemovendoColuna] = useState(false);

  // Opções para cadastro rápido
  const tiposCredito = [
    'Automóvel',
    'Imóvel',
    'Linha Amarela',
    'Pesados',
    'Serviços'
  ];

  const administradoras = [
    'Bradesco',
    'Caixa',
    'Embracon',
    'Honda',
    'Itaú',
    'Magalu',
    'Porto Seguro',
    'Rodobens',
    'Santander',
    'Volkswagen',
    'Yamaha'
  ];

  // Cores disponíveis para as colunas
  const coresDisponiveis = [
    { nome: 'Azul', classe: 'bg-blue-500' },
    { nome: 'Roxo', classe: 'bg-purple-500' },
    { nome: 'Rosa', classe: 'bg-pink-500' },
    { nome: 'Vermelho', classe: 'bg-red-500' },
    { nome: 'Laranja', classe: 'bg-orange-500' },
    { nome: 'Amarelo', classe: 'bg-yellow-500' },
    { nome: 'Verde', classe: 'bg-green-500' },
    { nome: 'Índigo', classe: 'bg-indigo-500' },
    { nome: 'Cinza', classe: 'bg-gray-500' },
  ];

  // Salvar colunas no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem('kanban_colunas', JSON.stringify(colunas));
  }, [colunas]);

  useEffect(() => {
    carregarClientes();
  }, []);

  // Abrir modal automaticamente quando vindo da busca global
  useEffect(() => {
    if (clienteIdParaAbrir && clientes.length > 0) {
      const cliente = clientes.find(c => c.id === clienteIdParaAbrir);
      if (cliente) {
        abrirModalCliente(cliente);
        if (onClienteAberto) {
          onClienteAberto();
        }
      }
    }
  }, [clienteIdParaAbrir, clientes]);

  const carregarClientes = async () => {
    try {
      const response = await clientesAPI.listar();
      setClientes(response.data.data?.clientes || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar clientes com base na busca
  const clientesFiltrados = clientes.filter((cliente) => {
    // Filtro de busca
    if (termoBusca) {
      const termo = termoBusca.toLowerCase();
      const buscaNome = cliente.nome?.toLowerCase().includes(termo);
      const buscaCPF = cliente.cpf?.replace(/\D/g, '').includes(termo.replace(/\D/g, ''));
      const buscaEmail = cliente.email?.toLowerCase().includes(termo);
      const buscaTelefone = cliente.telefone?.replace(/\D/g, '').includes(termo.replace(/\D/g, ''));

      if (!buscaNome && !buscaCPF && !buscaEmail && !buscaTelefone) {
        return false;
      }
    }

    // Filtro de etapa
    if (filtroEtapa !== 'todas' && cliente.etapa !== filtroEtapa) {
      return false;
    }

    return true;
  });

  // Organizar clientes por etapa
  const clientesPorEtapa = (etapa) => {
    return clientesFiltrados.filter((cliente) => cliente.etapa === etapa);
  };

  // Função para reordenar colunas
  const onDragEndColumn = (result) => {
    const { destination, source } = result;

    // Se não há destino ou está na mesma posição, não faz nada
    if (!destination || destination.index === source.index) {
      return;
    }

    const novaOrdem = Array.from(colunas);
    const [colunaMovida] = novaOrdem.splice(source.index, 1);
    novaOrdem.splice(destination.index, 0, colunaMovida);

    setColunas(novaOrdem);
  };

  // Função executada quando um card é solto
  const onDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;

    // Se é uma coluna, usa a função de reordenar colunas
    if (type === 'column') {
      onDragEndColumn(result);
      return;
    }

    // Se não há destino ou o destino é o mesmo que a origem, não faz nada
    if (!destination || destination.droppableId === source.droppableId) {
      return;
    }

    const clienteId = parseInt(draggableId);
    const novaEtapa = destination.droppableId;
    const etapaOrigem = source.droppableId;

    // BLOQUEIO: Etapa "Em Comissionamento" é bloqueada para vendedores
    if (!isAdmin()) {
      // Impedir que vendedores tirem clientes da etapa "em_comissionamento"
      if (etapaOrigem === 'em_comissionamento') {
        toast.error('Esta etapa está bloqueada. Apenas administradores podem mover clientes em comissionamento.');
        return;
      }

      // Impedir que vendedores movam clientes PARA a etapa "em_comissionamento"
      if (novaEtapa === 'em_comissionamento') {
        toast.error('Não é possível mover clientes para esta etapa manualmente. Ela é controlada automaticamente pelo sistema de comissões.');
        return;
      }
    }

    try {
      // Atualizar o cliente no backend
      await clientesAPI.atualizarEtapa(clienteId, novaEtapa);

      // Atualizar o estado local
      setClientes((prevClientes) =>
        prevClientes.map((cliente) =>
          cliente.id === clienteId ? { ...cliente, etapa: novaEtapa } : cliente
        )
      );

      const nomeEtapa = colunas.find(col => col.id === novaEtapa)?.titulo || novaEtapa;
      toast.success(`Cliente movido para "${nomeEtapa}"`);
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
      toast.error('Erro ao mover cliente');
      // Recarregar clientes para sincronizar
      carregarClientes();
    }
  };

  const abrirModalCliente = (cliente) => {
    setClienteSelecionado(cliente);
    setModalAberto(true);
  };

  // Excluir cliente
  const excluirCliente = async (clienteId) => {
    try {
      await clientesAPI.deletar(clienteId);
      setClientes((prevClientes) => prevClientes.filter((c) => c.id !== clienteId));
      toast.success('Cliente excluído com sucesso');
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast.error('Erro ao excluir cliente');
    }
  };

  const fecharModal = () => {
    setModalAberto(false);
    setClienteSelecionado(null);
  };

  // Adicionar nova coluna
  const adicionarNovaColuna = () => {
    if (!novaColuna.titulo.trim()) {
      toast.error('Por favor, insira um título para a etapa');
      return;
    }

    const novaId = novaColuna.titulo.toLowerCase().replace(/\s+/g, '_');

    // Verificar se já existe uma coluna com esse ID
    if (colunas.find(col => col.id === novaId)) {
      toast.error('Já existe uma etapa com esse nome');
      return;
    }

    const coluna = {
      id: novaId,
      titulo: novaColuna.titulo,
      cor: novaColuna.cor,
      customizada: true
    };

    setColunas([...colunas, coluna]);
    setNovaColuna({ titulo: '', cor: 'bg-indigo-500' });
    setMostrarNovaColuna(false);
    toast.success(`Etapa "${novaColuna.titulo}" adicionada com sucesso!`);
  };

  // Remover coluna customizada
  const removerColuna = (colunaId) => {
    const coluna = colunas.find(c => c.id === colunaId);

    if (!coluna.customizada) {
      toast.error('Não é possível remover etapas padrão do sistema');
      return;
    }

    const clientesDaColuna = clientesPorEtapa(colunaId);
    if (clientesDaColuna.length > 0) {
      toast.error(`Não é possível remover esta etapa pois ela possui ${clientesDaColuna.length} cliente(s)`);
      return;
    }

    setConfirmDialog({
      isOpen: true,
      colunaId: colunaId,
      colunaTitulo: coluna.titulo,
    });
  };

  const confirmarRemocaoColuna = () => {
    setRemovendoColuna(true);
    setColunas(colunas.filter(c => c.id !== confirmDialog.colunaId));
    toast.success(`Etapa "${confirmDialog.colunaTitulo}" removida com sucesso!`);
    setConfirmDialog({ isOpen: false, colunaId: null, colunaTitulo: '' });
    setRemovendoColuna(false);
  };

  // Função para iniciar edição de uma coluna
  const iniciarEdicaoColuna = (coluna) => {
    setColunaEditando(coluna.id);
    setDadosEdicaoColuna({ titulo: coluna.titulo, cor: coluna.cor });
  };

  // Função para salvar edição da coluna
  const salvarEdicaoColuna = () => {
    if (!dadosEdicaoColuna.titulo.trim()) {
      toast.error('O título da etapa não pode estar vazio');
      return;
    }

    const colunasAtualizadas = colunas.map(col =>
      col.id === colunaEditando
        ? { ...col, titulo: dadosEdicaoColuna.titulo, cor: dadosEdicaoColuna.cor }
        : col
    );

    setColunas(colunasAtualizadas);
    setColunaEditando(null);
    setDadosEdicaoColuna({ titulo: '', cor: '' });
    toast.success('Etapa atualizada com sucesso!');
  };

  // Função para cancelar edição
  const cancelarEdicaoColuna = () => {
    setColunaEditando(null);
    setDadosEdicaoColuna({ titulo: '', cor: '' });
  };

  // Funções de formatação
  const formatarCPF = (valor) => {
    // Remove tudo que não é dígito
    const apenasNumeros = valor.replace(/\D/g, '');

    // Limita a 11 dígitos
    const limitado = apenasNumeros.slice(0, 11);

    // Aplica a máscara
    return limitado
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatarTelefone = (valor) => {
    // Remove tudo que não é dígito
    const apenasNumeros = valor.replace(/\D/g, '');

    // Limita a 11 dígitos
    const limitado = apenasNumeros.slice(0, 11);

    // Aplica a máscara
    if (limitado.length <= 10) {
      return limitado
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      return limitado
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
  };

  const formatarValor = (valor) => {
    // Remove tudo que não é dígito
    const apenasNumeros = valor.replace(/\D/g, '');

    // Converte para número e divide por 100 para obter centavos
    const numero = parseFloat(apenasNumeros) / 100;

    // Formata como moeda brasileira
    if (isNaN(numero)) return '';

    return numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Funções para cadastro rápido
  const abrirModalCadastro = () => {
    setModalCadastroAberto(true);
  };

  const fecharModalCadastro = () => {
    setModalCadastroAberto(false);
    setDadosCadastro({
      nome: '',
      cpf: '',
      telefone: '',
      tipo_credito: '',
      valor_carta: '',
      administradora: '',
      etapa: 'novo_contato'
    });
  };

  const salvarClienteRapido = async (e) => {
    e.preventDefault();

    if (!dadosCadastro.nome || !dadosCadastro.telefone) {
      toast.error('Por favor, preencha Nome e Celular');
      return;
    }

    setSalvandoCliente(true);
    try {
      // Converter valor formatado de volta para número
      const valorLimpo = dadosCadastro.valor_carta
        ? parseFloat(dadosCadastro.valor_carta.replace(/[^\d]/g, '')) / 100
        : null;

      const dadosParaEnviar = {
        ...dadosCadastro,
        valor_carta: valorLimpo
      };

      await clientesAPI.criar(dadosParaEnviar);
      await carregarClientes();
      fecharModalCadastro();
      toast.success('Cliente cadastrado com sucesso!');
    } catch (error) {
      console.error('Erro ao cadastrar cliente:', error);
      toast.error('Erro ao cadastrar cliente. Verifique os dados e tente novamente.');
    } finally {
      setSalvandoCliente(false);
    }
  };

  // Exportar dados para CSV
  const exportarParaCSV = () => {
    // Cabeçalhos do CSV
    const headers = [
      'ID', 'Nome', 'CPF', 'Email', 'Telefone', 'Etapa',
      'Valor da Carta', 'Administradora', 'Data de Nascimento',
      'Estado Civil', 'Profissão', 'Cidade', 'Estado', 'Vendedor'
    ];

    // Converter clientes para linhas CSV
    const rows = clientesFiltrados.map(cliente => [
      cliente.id,
      cliente.nome || '',
      cliente.cpf || '',
      cliente.email || '',
      cliente.telefone_celular || cliente.telefone || '',
      colunas.find(c => c.id === cliente.etapa)?.titulo || cliente.etapa,
      cliente.valor_carta || '',
      cliente.administradora || '',
      cliente.data_nascimento || '',
      cliente.estado_civil || '',
      cliente.profissao || '',
      cliente.cidade || '',
      cliente.estado || '',
      cliente.vendedor_nome || ''
    ]);

    // Criar conteúdo CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Criar blob e fazer download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-primary-50 to-accent-50 p-6">
        <div className="mb-6 backdrop-blur-sm bg-white/70 p-6 rounded-2xl shadow-lg border border-white/50">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
        </div>
        <KanbanSkeleton columns={5} />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Botões de ação */}
      <div className="mb-4 flex justify-end gap-2">
        {isAdmin() && (
          <button
            onClick={exportarParaCSV}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
            title="Exportar dados filtrados para CSV"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar CSV
          </button>
        )}
        <button
          onClick={() => setMostrarNovaColuna(!mostrarNovaColuna)}
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Etapa
        </button>
        <button
          onClick={abrirModalCadastro}
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Cliente
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Campo de busca */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Buscar por nome, CPF, email ou telefone..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
            {termoBusca && (
              <button
                onClick={() => setTermoBusca('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filtro de etapa */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <select
              value={filtroEtapa}
              onChange={(e) => setFiltroEtapa(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors appearance-none bg-white"
            >
              <option value="todas">Todas as Etapas</option>
              {colunas.map((coluna) => (
                <option key={coluna.id} value={coluna.id}>
                  {coluna.titulo}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="mb-4">
        <p className="text-sm text-gray-500">
          Total de <span className="font-semibold text-gray-700">{clientesFiltrados.length}</span> clientes {termoBusca || filtroEtapa !== 'todas' ? 'encontrados' : 'distribuídos em ' + colunas.length + ' etapas'}
        </p>
      </div>

      {/* Formulário para adicionar nova coluna */}
      {mostrarNovaColuna && (
        <div className="mb-4 bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Adicionar Nova Etapa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título da Etapa
              </label>
              <input
                type="text"
                value={novaColuna.titulo}
                onChange={(e) => setNovaColuna({ ...novaColuna, titulo: e.target.value })}
                placeholder="Ex: Aguardando Documentos"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cor da Etapa
              </label>
              <div className="grid grid-cols-5 gap-2">
                {coresDisponiveis.map((cor) => (
                  <button
                    key={cor.classe}
                    onClick={() => setNovaColuna({ ...novaColuna, cor: cor.classe })}
                    className={`h-10 rounded-lg ${cor.classe} ${
                      novaColuna.cor === cor.classe ? 'ring-4 ring-gray-400' : ''
                    } hover:scale-110 transition-transform`}
                    title={cor.nome}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={adicionarNovaColuna}
              className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors font-medium text-sm"
            >
              Adicionar Etapa
            </button>
            <button
              onClick={() => {
                setMostrarNovaColuna(false);
                setNovaColuna({ titulo: '', cor: 'bg-indigo-500' });
              }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="all-columns" direction="horizontal" type="column">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid grid-cols-1 gap-4 overflow-x-auto"
            >
              <div className="flex gap-0 pb-4" style={{ minWidth: `${colunas.length * 320}px` }}>
                {colunas.map((coluna, index) => {
                  const clientesDaColuna = clientesPorEtapa(coluna.id);
                  const estaEditando = colunaEditando === coluna.id;

                  return (
                    <Draggable key={coluna.id} draggableId={coluna.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`p-2 flex-shrink-0 transition-all duration-300 ${
                            snapshot.isDragging ? 'shadow-2xl ring-2 ring-primary-400 scale-105' : ''
                          }`}
                          style={{
                            width: '320px',
                            ...provided.draggableProps.style
                          }}
                        >
                          {/* Cabeçalho da coluna */}
                          <div className="mb-4">
                            {estaEditando ? (
                              // Modo de edição
                              <div className="bg-white p-3 rounded-lg shadow-sm">
                                <div className="mb-3">
                                  <input
                                    type="text"
                                    value={dadosEdicaoColuna.titulo}
                                    onChange={(e) => setDadosEdicaoColuna({ ...dadosEdicaoColuna, titulo: e.target.value })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                    placeholder="Título da etapa"
                                  />
                                </div>
                                <div className="grid grid-cols-5 gap-1 mb-3">
                                  {coresDisponiveis.map((cor) => (
                                    <button
                                      key={cor.classe}
                                      onClick={() => setDadosEdicaoColuna({ ...dadosEdicaoColuna, cor: cor.classe })}
                                      className={`h-6 rounded ${cor.classe} ${
                                        dadosEdicaoColuna.cor === cor.classe ? 'ring-2 ring-gray-800' : ''
                                      }`}
                                      title={cor.nome}
                                    />
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={salvarEdicaoColuna}
                                    className="flex-1 bg-primary-500 text-white px-2 py-1 rounded text-xs hover:bg-primary-600 transition-colors"
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    onClick={cancelarEdicaoColuna}
                                    className="flex-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-200 transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Modo de visualização
                              <>
                                <div
                                  {...provided.dragHandleProps}
                                  className={`${coluna.cor} h-2 rounded-t-lg cursor-move hover:opacity-80 transition-opacity`}
                                  title="Arraste para reordenar"
                                ></div>
                                <div className="bg-white p-3 rounded-b-lg shadow-sm">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h2 className="font-semibold text-gray-900">{coluna.titulo}</h2>
                                        {coluna.bloqueado && !isAdmin() && (
                                          <svg
                                            className="w-4 h-4 text-amber-500"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                            title="Etapa bloqueada - apenas admin pode mover"
                                          >
                                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                                          </svg>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-500">
                                        {clientesDaColuna.length}{' '}
                                        {clientesDaColuna.length === 1 ? 'cliente' : 'clientes'}
                                      </p>
                                    </div>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => iniciarEdicaoColuna(coluna)}
                                        className="text-gray-400 hover:text-primary-500 transition-colors"
                                        title="Editar etapa"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      {coluna.customizada && (
                                        <button
                                          onClick={() => removerColuna(coluna.id)}
                                          className="text-gray-400 hover:text-red-500 transition-colors"
                                          title="Remover etapa"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Cards dos clientes */}
                          <Droppable droppableId={coluna.id} type="card">
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`min-h-[400px] transition-colors rounded-lg p-1 ${
                                  snapshot.isDraggingOver ? 'bg-primary-50 ring-2 ring-primary-300' : ''
                                }`}
                              >
                                {clientesDaColuna.map((cliente, index) => (
                                  <ClienteCard
                                    key={cliente.id}
                                    cliente={cliente}
                                    index={index}
                                    cor={coluna.cor}
                                    onClickDetalhes={() => abrirModalCliente(cliente)}
                                  />
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Modal de Cadastro Rápido */}
      {modalCadastroAberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/95 rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/50">
            <div className="p-7">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">Novo Cliente</h2>
                <button
                  onClick={fecharModalCadastro}
                  className="text-gray-400 hover:text-gray-600 hover:scale-110 transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={salvarClienteRapido} className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={dadosCadastro.nome}
                    onChange={(e) => setDadosCadastro({ ...dadosCadastro, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Nome completo"
                    required
                  />
                </div>

                {/* CPF */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={dadosCadastro.cpf}
                    onChange={(e) => setDadosCadastro({ ...dadosCadastro, cpf: formatarCPF(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>

                {/* Celular */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Celular <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={dadosCadastro.telefone}
                    onChange={(e) => setDadosCadastro({ ...dadosCadastro, telefone: formatarTelefone(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    required
                  />
                </div>

                {/* Tipo de Crédito */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Crédito
                  </label>
                  <select
                    value={dadosCadastro.tipo_credito}
                    onChange={(e) => setDadosCadastro({ ...dadosCadastro, tipo_credito: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Selecione o tipo de crédito</option>
                    {tiposCredito.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Valor do Crédito */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor do Crédito
                  </label>
                  <input
                    type="text"
                    value={dadosCadastro.valor_carta}
                    onChange={(e) => setDadosCadastro({ ...dadosCadastro, valor_carta: formatarValor(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="R$ 0,00"
                  />
                </div>

                {/* Administradora */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Administradora
                  </label>
                  <select
                    value={dadosCadastro.administradora}
                    onChange={(e) => setDadosCadastro({ ...dadosCadastro, administradora: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Selecione a administradora</option>
                    {administradoras.map((adm) => (
                      <option key={adm} value={adm}>
                        {adm}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Etapa */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Etapa Inicial
                  </label>
                  <select
                    value={dadosCadastro.etapa}
                    onChange={(e) => setDadosCadastro({ ...dadosCadastro, etapa: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {colunas.map((coluna) => (
                      <option key={coluna.id} value={coluna.id}>
                        {coluna.titulo}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-6">
                  <button
                    type="submit"
                    disabled={salvandoCliente}
                    className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {salvandoCliente ? 'Salvando...' : 'Cadastrar Cliente'}
                  </button>
                  <button
                    type="button"
                    onClick={fecharModalCadastro}
                    disabled={salvandoCliente}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-100 hover:scale-105 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes do cliente */}
      {modalAberto && clienteSelecionado && (
        <ClienteModal
          cliente={clienteSelecionado}
          onClose={fecharModal}
          onAtualizar={carregarClientes}
          onDelete={excluirCliente}
        />
      )}

      {/* Modal de confirmação de remoção de etapa */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, colunaId: null, colunaTitulo: '' })}
        onConfirm={confirmarRemocaoColuna}
        title="Remover Etapa"
        message={`Tem certeza que deseja remover a etapa "${confirmDialog.colunaTitulo}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, remover"
        cancelText="Cancelar"
        type="danger"
        loading={removendoColuna}
      />
    </div>
  );
};

export default Kanban;
