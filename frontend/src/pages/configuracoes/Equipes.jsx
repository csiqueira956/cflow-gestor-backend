import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import { TableSkeleton } from '../../components/LoadingSkeleton';
import ConfirmDialog from '../../components/ConfirmDialog';
import { equipesAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';

const Equipes = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [equipes, setEquipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
  });
  const [erro, setErro] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    equipeId: null,
    equipeNome: '',
  });
  const [deletando, setDeletando] = useState(false);

  // Verificar se é admin
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    carregarEquipes();
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

  const carregarEquipes = async () => {
    try {
      const response = await equipesAPI.listar();
      setEquipes(response.data.data?.equipes || []);
    } catch (error) {
      console.error('Erro ao carregar equipes:', error);
      toast.error('Erro ao carregar equipes');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErro('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    // Validação
    if (!formData.nome) {
      setErro('Nome é obrigatório');
      return;
    }

    try {
      if (editandoId) {
        // Atualizar equipe existente
        await equipesAPI.atualizar(editandoId, formData);
        toast.success('Equipe atualizada com sucesso!');
      } else {
        // Criar nova equipe
        await equipesAPI.criar(formData);
        toast.success('Equipe cadastrada com sucesso!');
      }

      // Recarregar lista
      carregarEquipes();

      // Limpar formulário e fechar modal
      setFormData({
        nome: '',
        descricao: '',
      });
      setEditandoId(null);
      setShowModal(false);
    } catch (error) {
      const errorMsg = error.response?.data?.error || `Erro ao ${editandoId ? 'atualizar' : 'criar'} equipe`;
      toast.error(errorMsg);
      setErro(errorMsg);
    }
  };

  const handleEdit = (equipe) => {
    setEditandoId(equipe.id);
    setFormData({
      nome: equipe.nome,
      descricao: equipe.descricao || '',
    });
    setShowModal(true);
  };

  const handleDelete = (equipe) => {
    setConfirmDialog({
      isOpen: true,
      equipeId: equipe.id,
      equipeNome: equipe.nome,
    });
  };

  const confirmarDelete = async () => {
    setDeletando(true);
    try {
      await equipesAPI.deletar(confirmDialog.equipeId);
      toast.success('Equipe deletada com sucesso!');
      carregarEquipes();
      setConfirmDialog({ isOpen: false, equipeId: null, equipeNome: '' });
    } catch (error) {
      toast.error('Erro ao deletar equipe');
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
            <TableSkeleton rows={5} columns={3} />
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
                Gerenciar Equipes
              </h1>
              <p className="text-gray-600">
                Cadastre e organize suas equipes de vendedores
              </p>
            </div>

            <button
              onClick={() => {
                setEditandoId(null);
                setFormData({
                  nome: '',
                  descricao: '',
                });
                setShowModal(true);
              }}
              className="btn-accent"
            >
              + Nova Equipe
            </button>
          </div>

          {/* Lista de equipes */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {equipes.map((equipe) => (
                  <tr key={equipe.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {equipe.nome}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {equipe.descricao || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEdit(equipe)}
                          className="text-primary-600 hover:text-primary-800 transition-colors"
                          title="Editar equipe"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(equipe)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Deletar equipe"
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

            {equipes.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Nenhuma equipe cadastrada
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de cadastro/edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editandoId ? 'Editar Equipe' : 'Cadastrar Equipe'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Equipe
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Equipe A"
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
                  placeholder="Descrição da equipe..."
                ></textarea>
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
                      descricao: '',
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
        onClose={() => setConfirmDialog({ isOpen: false, equipeId: null, equipeNome: '' })}
        onConfirm={confirmarDelete}
        title="Deletar Equipe"
        message={`Tem certeza que deseja deletar a equipe "${confirmDialog.equipeNome}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, deletar"
        cancelText="Cancelar"
        type="danger"
        loading={deletando}
      />
    </div>
  );
};

export default Equipes;
