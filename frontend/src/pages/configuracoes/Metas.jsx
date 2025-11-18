import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import { TableSkeleton } from '../../components/LoadingSkeleton';
import ConfirmDialog from '../../components/ConfirmDialog';
import { metasAPI, usuariosAPI, equipesAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';

const Metas = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [metas, setMetas] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'vendedor',
    vendedor_id: '',
    equipe_id: '',
    valor_meta: '',
    mes_referencia: '',
    status: 'ativa',
  });
  const [erro, setErro] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    metaId: null,
    metaTitulo: '',
  });
  const [deletando, setDeletando] = useState(false);

  // Verificar se é admin
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    carregarDados();
  }, []);

  // Sincronizar com mudanças no localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebarExpanded');
      setIsExpanded(saved !== null ? JSON.parse(saved) : true);
    };

    const interval = setInterval(handleStorageChange, 100);
    return () => clearInterval(interval);
  }, []);

  const carregarDados = async () => {
    try {
      const [metasResponse, vendedoresResponse, equipesResponse] = await Promise.all([
        metasAPI.listar(),
        usuariosAPI.listarVendedores(),
        equipesAPI.listar(),
      ]);

      setMetas(metasResponse.data.metas);
      setVendedores(vendedoresResponse.data.vendedores);
      setEquipes(equipesResponse.data.equipes);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
      // Limpar o campo oposto quando trocar o tipo
      ...(name === 'tipo' && {
        vendedor_id: value === 'vendedor' ? formData.vendedor_id : '',
        equipe_id: value === 'equipe' ? formData.equipe_id : '',
      }),
    });
    setErro('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    // Validações
    if (!formData.titulo || !formData.valor_meta || !formData.mes_referencia) {
      setErro('Título, valor da meta e mês de referência são obrigatórios');
      return;
    }

    if (formData.tipo === 'vendedor' && !formData.vendedor_id) {
      setErro('Selecione um vendedor');
      return;
    }

    if (formData.tipo === 'equipe' && !formData.equipe_id) {
      setErro('Selecione uma equipe');
      return;
    }

    try {
      const metaData = {
        ...formData,
        vendedor_id: formData.tipo === 'vendedor' ? formData.vendedor_id : null,
        equipe_id: formData.tipo === 'equipe' ? formData.equipe_id : null,
      };

      if (editandoId) {
        // Atualizar meta existente
        await metasAPI.atualizar(editandoId, metaData);
        toast.success('Meta atualizada com sucesso!');
      } else {
        // Criar nova meta
        await metasAPI.criar(metaData);
        toast.success('Meta cadastrada com sucesso!');
      }

      // Recarregar lista
      carregarDados();

      // Limpar formulário e fechar modal
      setFormData({
        titulo: '',
        descricao: '',
        tipo: 'vendedor',
        vendedor_id: '',
        equipe_id: '',
        valor_meta: '',
        mes_referencia: '',
        status: 'ativa',
      });
      setEditandoId(null);
      setShowModal(false);
    } catch (error) {
      const errorMsg = error.response?.data?.error || `Erro ao ${editandoId ? 'atualizar' : 'criar'} meta`;
      toast.error(errorMsg);
      setErro(errorMsg);
    }
  };

  const handleEdit = (meta) => {
    setEditandoId(meta.id);
    setFormData({
      titulo: meta.titulo,
      descricao: meta.descricao || '',
      tipo: meta.tipo,
      vendedor_id: meta.vendedor_id || '',
      equipe_id: meta.equipe_id || '',
      valor_meta: meta.valor_meta,
      mes_referencia: meta.mes_referencia,
      status: meta.status,
    });
    setShowModal(true);
  };

  const handleDelete = (meta) => {
    setConfirmDialog({
      isOpen: true,
      metaId: meta.id,
      metaTitulo: meta.titulo,
    });
  };

  const confirmarDelete = async () => {
    setDeletando(true);
    try {
      await metasAPI.deletar(confirmDialog.metaId);
      toast.success('Meta deletada com sucesso!');
      carregarDados();
      setConfirmDialog({ isOpen: false, metaId: null, metaTitulo: '' });
    } catch (error) {
      toast.error('Erro ao deletar meta');
    } finally {
      setDeletando(false);
    }
  };

  const formatarMes = (mes) => {
    if (!mes) return '-';
    const [ano, mesNum] = mes.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(mesNum) - 1]}/${ano}`;
  };

  const formatarValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const getStatusBadge = (status) => {
    const badges = {
      ativa: 'bg-green-100 text-green-800',
      concluida: 'bg-blue-100 text-blue-800',
      cancelada: 'bg-red-100 text-red-800',
    };
    return badges[status] || badges.ativa;
  };

  const getStatusLabel = (status) => {
    const labels = {
      ativa: 'Ativa',
      concluida: 'Concluída',
      cancelada: 'Cancelada',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300 ${isExpanded ? 'ml-64' : 'ml-20'}`} style={{ maxWidth: '1472px' }}>
          <div className="card">
            <div className="flex justify-between items-center mb-8">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-96"></div>
              </div>
              <div className="h-10 w-40 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <TableSkeleton rows={5} columns={7} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300 ${isExpanded ? 'ml-64' : 'ml-20'}`} style={{ maxWidth: '1472px' }}>
        <div className="card">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Gerenciar Metas
              </h1>
              <p className="text-gray-600">
                Defina metas para vendedores e equipes
              </p>
            </div>

            <button
              onClick={() => {
                setEditandoId(null);
                const mesAtual = new Date().toISOString().slice(0, 7);
                setFormData({
                  titulo: '',
                  descricao: '',
                  tipo: 'vendedor',
                  vendedor_id: '',
                  equipe_id: '',
                  valor_meta: '',
                  mes_referencia: mesAtual,
                  status: 'ativa',
                });
                setShowModal(true);
              }}
              className="btn-accent"
            >
              + Nova Meta
            </button>
          </div>

          {/* Lista de metas */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Responsável
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mês
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metas.map((meta) => (
                  <tr key={meta.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {meta.titulo}
                      </div>
                      {meta.descricao && (
                        <div className="text-xs text-gray-500 mt-1">
                          {meta.descricao}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 capitalize">
                        {meta.tipo}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {meta.vendedor_nome || meta.equipe_nome || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {formatarValor(meta.valor_meta)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {formatarMes(meta.mes_referencia)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(meta.status)}`}>
                        {getStatusLabel(meta.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEdit(meta)}
                          className="text-primary-600 hover:text-primary-800 transition-colors"
                          title="Editar meta"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(meta)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Deletar meta"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {metas.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Nenhuma meta cadastrada
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de cadastro/edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editandoId ? 'Editar Meta' : 'Cadastrar Meta'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Meta de vendas - Janeiro 2025"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  className="input-field"
                  rows="3"
                  placeholder="Descrição da meta..."
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo *
                </label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="equipe">Equipe</option>
                </select>
              </div>

              {formData.tipo === 'vendedor' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendedor *
                  </label>
                  <select
                    name="vendedor_id"
                    value={formData.vendedor_id}
                    onChange={handleChange}
                    className="input-field"
                    required
                  >
                    <option value="">Selecione um vendedor</option>
                    {vendedores.map((vendedor) => (
                      <option key={vendedor.id} value={vendedor.id}>
                        {vendedor.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.tipo === 'equipe' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Equipe *
                  </label>
                  <select
                    name="equipe_id"
                    value={formData.equipe_id}
                    onChange={handleChange}
                    className="input-field"
                    required
                  >
                    <option value="">Selecione uma equipe</option>
                    {equipes.map((equipe) => (
                      <option key={equipe.id} value={equipe.id}>
                        {equipe.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor da Meta (R$) *
                </label>
                <input
                  type="number"
                  name="valor_meta"
                  value={formData.valor_meta}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="50000.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mês de Referência *
                </label>
                <input
                  type="month"
                  name="mes_referencia"
                  value={formData.mes_referencia}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="ativa">Ativa</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              {erro && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {erro}
                </div>
              )}

              <div className="flex gap-4">
                <button type="submit" className="btn-accent flex-1">
                  {editandoId ? 'Atualizar' : 'Cadastrar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditandoId(null);
                    setFormData({
                      titulo: '',
                      descricao: '',
                      tipo: 'vendedor',
                      vendedor_id: '',
                      equipe_id: '',
                      valor_meta: '',
                      mes_referencia: '',
                      status: 'ativa',
                    });
                    setErro('');
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmação de deleção */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, metaId: null, metaTitulo: '' })}
        onConfirm={confirmarDelete}
        title="Deletar Meta"
        message={`Tem certeza que deseja deletar a meta "${confirmDialog.metaTitulo}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, deletar"
        cancelText="Cancelar"
        type="danger"
        loading={deletando}
      />
    </div>
  );
};

export default Metas;
