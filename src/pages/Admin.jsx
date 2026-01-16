import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { TableSkeleton } from '../components/LoadingSkeleton';
import ConfirmDialog from '../components/ConfirmDialog';
import { usuariosAPI, authAPI, equipesAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [vendedores, setVendedores] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null); // ID do vendedor sendo editado
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    tipo_usuario: '',
    percentual_comissao: '',
    celular: '',
    equipe: '',
  });
  const [erro, setErro] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    vendedorId: null,
    vendedorNome: '',
  });
  const [deletando, setDeletando] = useState(false);

  // Verificar se é admin
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    carregarDados().catch(() => {
      toast.error('Erro ao carregar dados');
    });
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
      const [vendedoresResponse, equipesResponse] = await Promise.all([
        usuariosAPI.listarVendedores(),
        equipesAPI.listar(),
      ]);

      const equipesData = equipesResponse.data.data?.equipes || [];

      setVendedores(vendedoresResponse.data.data?.vendedores || []);
      setEquipes(equipesData);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    let finalValue = value;

    if (name === 'equipe' && e.target.selectedIndex > 0) {
      const selectedOption = e.target.options[e.target.selectedIndex];
      finalValue = selectedOption.value;
    }

    setFormData({
      ...formData,
      [name]: finalValue,
    });
    setErro('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    // Validação: senha obrigatória apenas ao criar novo vendedor
    if (!formData.nome || !formData.email || (!editandoId && !formData.senha)) {
      setErro(editandoId ? 'Nome e email são obrigatórios' : 'Nome, email e senha são obrigatórios');
      return;
    }

    try {
      if (editandoId) {
        // Atualizar vendedor existente
        const dadosAtualizacao = {
          ...formData,
          role: 'vendedor',
        };

        // Se a senha estiver vazia, remover do objeto
        if (!dadosAtualizacao.senha) {
          delete dadosAtualizacao.senha;
        }

        await usuariosAPI.atualizar(editandoId, dadosAtualizacao);
        toast.success('Vendedor atualizado com sucesso!');
      } else {
        // Criar novo vendedor
        await authAPI.register({
          ...formData,
          role: 'vendedor',
        });
        toast.success('Vendedor cadastrado com sucesso!');
      }

      // Limpar formulário e fechar modal
      setFormData({
        nome: '',
        email: '',
        senha: '',
        tipo_usuario: '',
        percentual_comissao: '',
        celular: '',
        equipe: ''
      });
      setEditandoId(null);
      setShowModal(false);

      // Recarregar lista (sem bloquear o fechamento do modal)
      carregarDados().catch(() => {
        toast.error('Dados salvos, mas erro ao recarregar lista');
      });
    } catch (error) {
      const errorMsg = error.response?.data?.error || `Erro ao ${editandoId ? 'atualizar' : 'criar'} vendedor`;
      toast.error(errorMsg);
      setErro(errorMsg);
    }
  };

  const handleEdit = (vendedor) => {
    setEditandoId(vendedor.id);
    setFormData({
      nome: vendedor.nome,
      email: vendedor.email,
      senha: '', // Senha vazia, será atualizada apenas se preenchida
      tipo_usuario: vendedor.tipo_usuario || '',
      percentual_comissao: vendedor.percentual_comissao || '',
      celular: vendedor.celular || '',
      equipe: vendedor.equipe_id ? String(vendedor.equipe_id) : '', // Garantir que seja string
    });
    setShowModal(true);
  };

  const handleDelete = (vendedor) => {
    setConfirmDialog({
      isOpen: true,
      vendedorId: vendedor.id,
      vendedorNome: vendedor.nome,
    });
  };

  const confirmarDelete = async () => {
    setDeletando(true);
    try {
      await usuariosAPI.deletar(confirmDialog.vendedorId);
      toast.success('Vendedor deletado com sucesso!');
      setConfirmDialog({ isOpen: false, vendedorId: null, vendedorNome: '' });

      // Recarregar dados após o delete
      await carregarDados();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Erro ao deletar vendedor';
      toast.error(errorMsg);
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
                Gerenciar Vendedores
              </h1>
              <p className="text-gray-600">
                Cadastre e gerencie os vendedores da equipe
              </p>
            </div>

            <button
              onClick={() => {
                setEditandoId(null);
                setFormData({
                  nome: '',
                  email: '',
                  senha: '',
                  tipo_usuario: '',
                  percentual_comissao: '',
                  celular: '',
                  equipe: ''
                });
                setShowModal(true);
              }}
              className="btn-accent"
            >
              + Novo Vendedor
            </button>
          </div>

          {/* Lista de vendedores */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    E-mail
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comissão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Celular
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendedores.map((vendedor) => (
                  <tr key={vendedor.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {vendedor.nome}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{vendedor.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 capitalize">
                        {vendedor.tipo_usuario || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {vendedor.percentual_comissao ? `${vendedor.percentual_comissao}%` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {vendedor.celular || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {vendedor.equipe_nome || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEdit(vendedor)}
                          className="text-primary-600 hover:text-primary-800 transition-colors"
                          title="Editar vendedor"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(vendedor)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Deletar vendedor"
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

            {vendedores.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Nenhum vendedor cadastrado
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
              {editandoId ? 'Editar Vendedor' : 'Cadastrar Vendedor'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="João Silva"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="joao@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha {editandoId && <span className="text-gray-500 font-normal">(deixe em branco para manter a atual)</span>}
                </label>
                <input
                  type="password"
                  name="senha"
                  value={formData.senha}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="••••••••"
                  required={!editandoId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Usuário
                </label>
                <select
                  name="tipo_usuario"
                  value={formData.tipo_usuario}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Selecione...</option>
                  <option value="interno">Interno</option>
                  <option value="externo">Externo</option>
                  <option value="parceiro">Parceiro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Percentual de Comissionamento (%)
                </label>
                <input
                  type="number"
                  name="percentual_comissao"
                  value={formData.percentual_comissao}
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
                  Celular
                </label>
                <input
                  type="tel"
                  name="celular"
                  value={formData.celular}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Equipe
                </label>
                <select
                  name="equipe"
                  value={formData.equipe}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Selecione uma equipe...</option>
                  {equipes
                    .filter(eq => eq && eq.id)
                    .map((equipe) => (
                      <option key={equipe.id} value={String(equipe.id)}>
                        {equipe.nome}
                      </option>
                    ))}
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
                      nome: '',
                      email: '',
                      senha: '',
                      tipo_usuario: '',
                      percentual_comissao: '',
                      celular: '',
                      equipe: ''
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
        onClose={() => setConfirmDialog({ isOpen: false, vendedorId: null, vendedorNome: '' })}
        onConfirm={confirmarDelete}
        title="Deletar Vendedor"
        message={`Tem certeza que deseja deletar o vendedor "${confirmDialog.vendedorNome}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, deletar"
        cancelText="Cancelar"
        type="danger"
        loading={deletando}
      />
    </div>
  );
};

export default Admin;
