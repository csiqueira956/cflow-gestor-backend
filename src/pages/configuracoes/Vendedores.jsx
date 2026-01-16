import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import { TableSkeleton } from '../../components/LoadingSkeleton';
import ConfirmDialog from '../../components/ConfirmDialog';
import { usuariosAPI, equipesAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';

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
    role: 'vendedor',
    tipo_usuario: '',
    percentual_comissao: '',
    celular: '',
    equipe: '',
    equipe_id: '',
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
      const [usuariosResponse, equipesResponse] = await Promise.all([
        usuariosAPI.listarUsuarios(),
        equipesAPI.listar()
      ]);
      setVendedores(usuariosResponse.data.data?.usuarios || []);
      setEquipes(equipesResponse.data.data?.equipes || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
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

    // Validação: senha obrigatória apenas ao criar novo usuário
    if (!formData.nome || !formData.email || (!editandoId && !formData.senha)) {
      setErro(editandoId ? 'Nome e email são obrigatórios' : 'Nome, email e senha são obrigatórios');
      return;
    }

    // Validar se uma equipe foi selecionada
    if (!formData.equipe_id) {
      setErro('Selecione uma equipe');
      return;
    }

    try {
      const dadosUsuario = {
        ...formData,
        equipe: parseInt(formData.equipe_id),  // Enviar o ID no campo equipe
        equipe_id: parseInt(formData.equipe_id)
      };

      if (editandoId) {
        // Atualizar usuário existente
        await usuariosAPI.atualizar(editandoId, dadosUsuario);
        toast.success(`${formData.role === 'gerente' ? 'Gerente' : 'Vendedor'} atualizado com sucesso!`);
      } else {
        // Criar novo usuário
        await usuariosAPI.criar(dadosUsuario);
        toast.success(`${formData.role === 'gerente' ? 'Gerente' : 'Vendedor'} cadastrado com sucesso!`);
      }

      // Recarregar lista
      carregarDados();

      // Limpar formulário e fechar modal
      setFormData({
        nome: '',
        email: '',
        senha: '',
        role: 'vendedor',
        tipo_usuario: '',
        percentual_comissao: '',
        celular: '',
        equipe: '',
        equipe_id: ''
      });
      setEditandoId(null);
      setShowModal(false);
    } catch (error) {
      const errorMsg = error.response?.data?.error || `Erro ao ${editandoId ? 'atualizar' : 'criar'} usuário`;
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
      role: vendedor.role || 'vendedor',
      tipo_usuario: vendedor.tipo_usuario || '',
      percentual_comissao: vendedor.percentual_comissao || '',
      celular: vendedor.celular || '',
      equipe: vendedor.equipe || '',
      equipe_id: vendedor.equipe_id || '',
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
      carregarDados();
      setConfirmDialog({ isOpen: false, vendedorId: null, vendedorNome: '' });
    } catch (error) {
      toast.error('Erro ao deletar vendedor');
    } finally {
      setDeletando(false);
    }
  };

  const handleEnviarWhatsApp = (vendedor) => {
    // URL da aplicação (usa http:// explicitamente para desenvolvimento local)
    const appUrl = window.location.origin;
    const linkCadastro = `${appUrl}/login?convite=${vendedor.id}`;

    // Mensagem personalizada
    const mensagem = encodeURIComponent(
      `Olá! 👋\n\n` +
      `Você foi convidado para fazer parte da equipe de vendas da CFlow Gestor!\n\n` +
      `Acesse a plataforma e faça seu cadastro:\n` +
      `${linkCadastro}\n\n` +
      `Use este link para ter acesso à equipe.\n\n` +
      `Qualquer dúvida, estamos à disposição!`
    );

    // Formatar número de celular (remove caracteres não numéricos)
    const celular = vendedor.celular ? vendedor.celular.replace(/\D/g, '') : '';

    if (!celular) {
      toast.error('Vendedor não possui celular cadastrado');
      return;
    }

    // Abrir WhatsApp Web
    const whatsappUrl = `https://wa.me/55${celular}?text=${mensagem}`;
    window.open(whatsappUrl, '_blank');

    toast.success('WhatsApp aberto! Envie a mensagem.');
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
                Gerenciar Usuários
              </h1>
              <p className="text-gray-600">
                Cadastre e gerencie gerentes e vendedores da equipe
              </p>
            </div>

            <button
              onClick={() => {
                setEditandoId(null);
                setFormData({
                  nome: '',
                  email: '',
                  senha: '',
                  role: 'vendedor',
                  tipo_usuario: '',
                  percentual_comissao: '',
                  celular: '',
                  equipe: '',
                  equipe_id: ''
                });
                setShowModal(true);
              }}
              className="btn-accent"
            >
              + Novo Usuário
            </button>
          </div>

          {/* Lista de usuários */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Perfil
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    E-mail
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipe
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
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        vendedor.role === 'gerente'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {vendedor.role === 'gerente' ? 'Gerente' : 'Vendedor'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{vendedor.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {vendedor.equipe_nome || vendedor.equipe || '-'}
                      </div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEnviarWhatsApp(vendedor)}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="Enviar link via WhatsApp"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(vendedor)}
                          className="text-primary-600 hover:text-primary-800 transition-colors"
                          title="Editar usuário"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(vendedor)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Deletar usuário"
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
                Nenhum usuário cadastrado
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
              {editandoId ? 'Editar Usuário' : 'Cadastrar Usuário'}
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
                  Perfil <span className="text-red-500">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="gerente">Gerente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Equipe <span className="text-red-500">*</span>
                </label>
                <select
                  name="equipe_id"
                  value={formData.equipe_id}
                  onChange={handleChange}
                  className="input-field"
                  required
                  disabled={!isAdmin()}
                  title={!isAdmin() ? 'Apenas administradores podem alterar a equipe' : ''}
                >
                  <option value="">Selecione uma equipe...</option>
                  {equipes.map((equipe) => (
                    <option key={equipe.id} value={equipe.id}>
                      {equipe.nome}
                    </option>
                  ))}
                </select>
                {!isAdmin() && (
                  <p className="mt-1 text-xs text-gray-500">
                    Apenas administradores podem alterar a equipe
                  </p>
                )}
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
                      role: 'vendedor',
                      tipo_usuario: '',
                      percentual_comissao: '',
                      celular: '',
                      equipe: '',
                      equipe_id: ''
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
        title="Deletar Usuário"
        message={`Tem certeza que deseja deletar o usuário "${confirmDialog.vendedorNome}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, deletar"
        cancelText="Cancelar"
        type="danger"
        loading={deletando}
      />
    </div>
  );
};

export default Admin;
