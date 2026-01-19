import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import { TableSkeleton } from '../../components/LoadingSkeleton';
import ConfirmDialog from '../../components/ConfirmDialog';
import { administradorasAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';

const Administradoras = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [administradoras, setAdministradoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [formData, setFormData] = useState({
    nome: '',
    nome_contato: '',
    celular: '',
    comissionamento_recebido: '',
    comissionamento_pago: '',
  });
  const [erro, setErro] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    administradoraId: null,
    administradoraNome: '',
  });
  const [deletando, setDeletando] = useState(false);

  // Verificar se é admin
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    carregarAdministradoras();
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

  // Formatar telefone enquanto digita
  const formatarTelefone = (valor) => {
    valor = valor.replace(/\D/g, '');
    if (valor.length <= 10) {
      valor = valor.replace(/(\d{2})(\d)/, '($1) $2');
      valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      valor = valor.replace(/(\d{2})(\d)/, '($1) $2');
      valor = valor.replace(/(\d{5})(\d)/, '$1-$2');
    }
    return valor;
  };

  const carregarAdministradoras = async () => {
    try {
      const response = await administradorasAPI.listar();
      setAdministradoras(response.data.data?.administradoras || []);
    } catch (error) {
      console.error('Erro ao carregar administradoras:', error);
      toast.error('Erro ao carregar administradoras');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    let { name, value } = e.target;

    // Aplicar formatação ao celular
    if (name === 'celular') {
      value = formatarTelefone(value);
    }

    setFormData({
      ...formData,
      [name]: value,
    });
    setErro('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    // Validação
    if (!formData.nome) {
      setErro('Nome da administradora é obrigatório');
      return;
    }

    try {
      if (editandoId) {
        // Atualizar administradora existente
        await administradorasAPI.atualizar(editandoId, formData);
        toast.success('Administradora atualizada com sucesso!');
      } else {
        // Criar nova administradora
        await administradorasAPI.criar(formData);
        toast.success('Administradora cadastrada com sucesso!');
      }

      // Recarregar lista
      carregarAdministradoras();

      // Limpar formulário e fechar modal
      setFormData({
        nome: '',
        nome_contato: '',
        celular: '',
        comissionamento_recebido: '',
        comissionamento_pago: '',
      });
      setEditandoId(null);
      setShowModal(false);
    } catch (error) {
      const errorMsg = error.response?.data?.error || `Erro ao ${editandoId ? 'atualizar' : 'criar'} administradora`;
      toast.error(errorMsg);
      setErro(errorMsg);
    }
  };

  const handleEdit = (administradora) => {
    setEditandoId(administradora.id);
    setFormData({
      nome: administradora.nome,
      nome_contato: administradora.nome_contato || '',
      celular: administradora.celular || '',
      comissionamento_recebido: administradora.comissionamento_recebido || '',
      comissionamento_pago: administradora.comissionamento_pago || '',
    });
    setShowModal(true);
  };

  const handleDelete = (administradora) => {
    setConfirmDialog({
      isOpen: true,
      administradoraId: administradora.id,
      administradoraNome: administradora.nome,
    });
  };

  const confirmarDelete = async () => {
    setDeletando(true);
    try {
      await administradorasAPI.deletar(confirmDialog.administradoraId);
      toast.success('Administradora deletada com sucesso!');
      carregarAdministradoras();
      setConfirmDialog({ isOpen: false, administradoraId: null, administradoraNome: '' });
    } catch (error) {
      toast.error('Erro ao deletar administradora');
    } finally {
      setDeletando(false);
    }
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
            <TableSkeleton rows={5} columns={6} />
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
                Gerenciar Administradoras
              </h1>
              <p className="text-gray-600">
                Cadastre administradoras parceiras e configure comissionamentos
              </p>
            </div>

            <button
              onClick={() => {
                setEditandoId(null);
                setFormData({
                  nome: '',
                  nome_contato: '',
                  celular: '',
                  comissionamento_recebido: '',
                  comissionamento_pago: '',
                });
                setShowModal(true);
              }}
              className="btn-accent"
            >
              + Nova Administradora
            </button>
          </div>

          {/* Lista de administradoras */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Administradora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Celular
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comissão Recebida
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comissão Paga
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {administradoras.map((administradora) => (
                  <tr key={administradora.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {administradora.nome}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {administradora.nome_contato || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {administradora.celular || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {administradora.comissionamento_recebido ? `${administradora.comissionamento_recebido}%` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {administradora.comissionamento_pago ? `${administradora.comissionamento_pago}%` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEdit(administradora)}
                          className="text-primary-600 hover:text-primary-800 transition-colors"
                          title="Editar administradora"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(administradora)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Deletar administradora"
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

            {administradoras.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Nenhuma administradora cadastrada
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
              {editandoId ? 'Editar Administradora' : 'Cadastrar Administradora'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Administradora *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Honda, Embracon, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Contato
                </label>
                <input
                  type="text"
                  name="nome_contato"
                  value={formData.nome_contato}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="João Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Celular
                </label>
                <input
                  type="text"
                  name="celular"
                  value={formData.celular}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="(11) 98765-4321"
                  maxLength="15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comissionamento Recebido (%)
                </label>
                <input
                  type="number"
                  name="comissionamento_recebido"
                  value={formData.comissionamento_recebido}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="10"
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comissionamento Pago (%)
                </label>
                <input
                  type="number"
                  name="comissionamento_pago"
                  value={formData.comissionamento_pago}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="8"
                  step="0.01"
                  min="0"
                  max="100"
                />
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
                      nome: '',
                      nome_contato: '',
                      celular: '',
                      comissionamento_recebido: '',
                      comissionamento_pago: '',
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
        onClose={() => setConfirmDialog({ isOpen: false, administradoraId: null, administradoraNome: '' })}
        onConfirm={confirmarDelete}
        title="Deletar Administradora"
        message={`Tem certeza que deseja deletar a administradora "${confirmDialog.administradoraNome}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, deletar"
        cancelText="Cancelar"
        type="danger"
        loading={deletando}
      />
    </div>
  );
};

export default Administradoras;
