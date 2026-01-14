import axios from 'axios';

// URL base da API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Criar instância do axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expirado ou inválido
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Funções de autenticação
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verificarToken: () => api.get('/auth/me'),
};

// Funções de clientes
export const clientesAPI = {
  listar: () => api.get('/clientes'),
  buscar: (id) => api.get(`/clientes/${id}`),
  criar: (clienteData) => api.post('/clientes', clienteData),
  atualizar: (id, clienteData) => api.put(`/clientes/${id}`, clienteData),
  atualizarEtapa: (id, etapa) => api.patch(`/clientes/${id}/etapa`, { etapa }),
  deletar: (id) => api.delete(`/clientes/${id}`),
  estatisticas: () => api.get('/clientes/estatisticas'),
};

// Funções de usuários (admin)
export const usuariosAPI = {
  listarVendedores: () => api.get('/usuarios/vendedores'),
  listarGerentes: () => api.get('/usuarios/gerentes'),
  listarUsuarios: () => api.get('/usuarios'),
  buscar: (id) => api.get(`/usuarios/${id}`),
  atualizar: (id, userData) => api.put(`/usuarios/${id}`, userData),
  deletar: (id) => api.delete(`/usuarios/${id}`),
};

// Funções de grupos (mockado)
export const gruposAPI = {
  listar: () => api.get('/grupos'),
};

// Funções de comissões
export const comissoesAPI = {
  listar: (params) => api.get('/comissoes', { params }),
  buscar: (id) => api.get(`/comissoes/${id}`),
  criar: (comissaoData) => api.post('/comissoes', comissaoData),
  atualizar: (id, comissaoData) => api.put(`/comissoes/${id}`, comissaoData),
  deletar: (id) => api.delete(`/comissoes/${id}`),
  atualizarParcela: (id, parcelaData) => api.put(`/comissoes/parcelas/${id}`, parcelaData),
  estatisticas: () => api.get('/comissoes/estatisticas'),
};

// Funções de equipes
export const equipesAPI = {
  listar: () => api.get('/equipes'),
  buscar: (id) => api.get(`/equipes/${id}`),
  criar: (equipeData) => api.post('/equipes', equipeData),
  atualizar: (id, equipeData) => api.put(`/equipes/${id}`, equipeData),
  deletar: (id) => api.delete(`/equipes/${id}`),
};

// Funções de administradoras
export const administradorasAPI = {
  listar: () => api.get('/administradoras'),
  buscar: (id) => api.get(`/administradoras/${id}`),
  criar: (administradoraData) => api.post('/administradoras', administradoraData),
  atualizar: (id, administradoraData) => api.put(`/administradoras/${id}`, administradoraData),
  deletar: (id) => api.delete(`/administradoras/${id}`),
};

// Funções de metas
export const metasAPI = {
  listar: (params) => api.get('/metas', { params }),
  buscar: (id) => api.get(`/metas/${id}`),
  criar: (metaData) => api.post('/metas', metaData),
  atualizar: (id, metaData) => api.put(`/metas/${id}`, metaData),
  deletar: (id) => api.delete(`/metas/${id}`),
};

// Funções de dashboard
export const dashboardAPI = {
  estatisticas: () => api.get('/dashboard/estatisticas'),
};

// Funções de planos (SaaS)
export const plansAPI = {
  listar: () => axios.get(`${API_URL}/plans`), // Public endpoint
  buscar: (idOrSlug) => axios.get(`${API_URL}/plans/${idOrSlug}`), // Public endpoint
  comparar: (planId1, planId2) => axios.get(`${API_URL}/plans/compare/${planId1}/${planId2}`), // Public endpoint
};

// Funções de assinatura (SaaS)
export const subscriptionAPI = {
  summary: () => api.get('/subscription/summary'),
  usage: () => api.get('/subscription/usage'),
  createTrial: () => api.post('/subscription/trial'),
  upgrade: (planId) => api.post('/subscription/upgrade', { planId }),
  downgrade: (planId) => api.post('/subscription/downgrade', { planId }),
  cancel: (immediate = false) => api.post('/subscription/cancel', { immediate }),
  history: () => api.get('/subscription/history'),
};

// Funções de billing/faturas (SaaS)
export const billingAPI = {
  listInvoices: (params) => api.get('/billing/invoices', { params }),
  getInvoice: (id) => api.get(`/billing/invoices/${id}`),
  getStats: () => api.get('/billing/stats'),
  getNextInvoice: () => api.get('/billing/next'),
  getOverdueInvoices: () => api.get('/billing/overdue'),
  getUpcomingInvoices: (days = 7) => api.get('/billing/upcoming', { params: { days } }),
  getDashboard: () => api.get('/billing/dashboard'),
};

// Funções de Super Admin (gerenciamento SaaS cross-tenant)
export const superAdminAPI = {
  // Empresas/Assinaturas
  listarEmpresas: () => api.get('/admin/assinaturas/todas'),
  detalhesEmpresa: (companyId) => api.get(`/admin/assinaturas/empresa/${companyId}`),
  criarEmpresa: (empresaData) => api.post('/admin/assinaturas/criar-empresa', empresaData),
  atualizarEmpresa: (companyId, empresaData) => api.put(`/admin/assinaturas/empresa/${companyId}`, empresaData),
  deletarEmpresa: (companyId) => api.delete(`/admin/assinaturas/empresa/${companyId}`),
  alterarStatusAssinatura: (data) => api.post('/admin/assinaturas/alterar-status', data),

  // Cobranças Avulsas (Asaas)
  gerarCobranca: (companyId, data) => api.post(`/admin/assinaturas/empresa/${companyId}/gerar-cobranca`, data),
  historicoPagamentos: (companyId) => api.get(`/admin/assinaturas/empresa/${companyId}/pagamentos`),
  consultarStatusPagamento: (paymentId) => api.get(`/admin/pagamentos/${paymentId}/status`),

  // Assinaturas Recorrentes (Asaas)
  criarAssinaturaRecorrente: (companyId, data) => api.post(`/admin/assinaturas/empresa/${companyId}/assinatura-recorrente`, data),
  cancelarAssinaturaRecorrente: (companyId) => api.post(`/admin/assinaturas/empresa/${companyId}/cancelar-assinatura`),
  atualizarAssinaturaRecorrente: (companyId, data) => api.put(`/admin/assinaturas/empresa/${companyId}/assinatura-recorrente`, data),
  detalhesAssinaturaRecorrente: (companyId) => api.get(`/admin/assinaturas/empresa/${companyId}/assinatura-recorrente`),
  faturasPendentes: (companyId) => api.get(`/admin/assinaturas/empresa/${companyId}/faturas-pendentes`),

  // Planos
  listarPlanos: () => api.get('/admin/assinaturas/planos'),
  criarPlano: (planoData) => api.post('/admin/assinaturas/planos', planoData),
  editarPlano: (planoId, planoData) => api.put(`/admin/assinaturas/planos/${planoId}`, planoData),
  deletarPlano: (planoId) => api.delete(`/admin/assinaturas/planos/${planoId}`),

  // Usuários de empresas
  listarUsuariosEmpresa: (companyId) => api.get(`/admin/empresas/${companyId}/usuarios`),
  criarUsuarioEmpresa: (companyId, userData) => api.post(`/admin/empresas/${companyId}/usuarios`, userData),
  atualizarUsuario: (usuarioId, userData) => api.put(`/admin/usuarios/${usuarioId}`, userData),
  deletarUsuario: (usuarioId) => api.delete(`/admin/usuarios/${usuarioId}`),
  resetarSenhaUsuario: (usuarioId) => api.post(`/admin/usuarios/${usuarioId}/resetar-senha`),

  // Notificações
  executarVerificacoes: () => api.post('/admin/notifications/run-checks'),
};

export default api;
