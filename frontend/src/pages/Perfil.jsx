import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';

const Perfil = () => {
  const { usuario, updateUsuario } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nome: '',
    celular: '',
    foto_perfil: ''
  });
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [previewFoto, setPreviewFoto] = useState('');

  // Buscar dados atualizados do usuário ao carregar a página
  useEffect(() => {
    const carregarDadosUsuario = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await axios.get('http://localhost:3001/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          updateUsuario(response.data);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      }
    };

    carregarDadosUsuario();
  }, []);

  useEffect(() => {
    if (usuario) {
      setFormData({
        nome: usuario.nome || '',
        celular: usuario.celular || '',
        foto_perfil: usuario.foto_perfil || ''
      });
      setPreviewFoto(usuario.foto_perfil || '');
    }
  }, [usuario]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setMensagem({ tipo: '', texto: '' });
  };

  // Função para formatar celular com máscara
  const formatarCelular = (valor) => {
    // Remove tudo que não é dígito
    const apenasNumeros = valor.replace(/\D/g, '');

    // Aplica a máscara conforme o tamanho
    if (apenasNumeros.length <= 10) {
      // Formato: (XX) XXXX-XXXX
      return apenasNumeros
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      // Formato: (XX) XXXXX-XXXX
      return apenasNumeros
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .substring(0, 15); // Limita a 15 caracteres: (XX) XXXXX-XXXX
    }
  };

  const handleCelularChange = (e) => {
    const valorFormatado = formatarCelular(e.target.value);
    setFormData({
      ...formData,
      celular: valorFormatado
    });
    setMensagem({ tipo: '', texto: '' });
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tamanho (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setMensagem({ tipo: 'erro', texto: 'A imagem deve ter no máximo 2MB' });
        return;
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        setMensagem({ tipo: 'erro', texto: 'Apenas imagens são permitidas' });
        return;
      }

      // Converter para base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setFormData({ ...formData, foto_perfil: base64String });
        setPreviewFoto(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoverFoto = () => {
    setFormData({ ...formData, foto_perfil: '' });
    setPreviewFoto('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    if (!formData.nome) {
      setMensagem({ tipo: 'erro', texto: 'O nome é obrigatório' });
      setLoading(false);
      return;
    }

    try {
      const dados = {
        nome: formData.nome,
        celular: formData.celular,
        foto_perfil: formData.foto_perfil
      };

      const token = localStorage.getItem('token');

      const response = await axios.put(
        'http://localhost:3001/api/auth/me',
        dados,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Atualizar contexto do usuário
      updateUsuario(response.data.usuario);

      setMensagem({ tipo: 'sucesso', texto: 'Perfil atualizado com sucesso! Redirecionando...' });

      // Redirecionar para o dashboard após 2 segundos
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);

      setMensagem({
        tipo: 'erro',
        texto: error.response?.data?.error || error.message || 'Erro ao atualizar perfil'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-600 mt-1">
            Gerencie suas informações pessoais
          </p>
        </div>

        {/* Mensagens */}
        {mensagem.texto && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              mensagem.tipo === 'sucesso'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Foto de Perfil */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
                  {previewFoto ? (
                    <img
                      src={previewFoto}
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg
                      className="w-16 h-16 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  )}
                </div>
                {previewFoto && (
                  <button
                    type="button"
                    onClick={handleRemoverFoto}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <label className="mt-4 cursor-pointer">
                <span className="bg-primary-100 text-primary-700 px-4 py-2 rounded-lg hover:bg-primary-200 transition-colors inline-block font-medium">
                  {previewFoto ? 'Alterar Foto' : 'Adicionar Foto'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFotoChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">
                JPG, PNG ou GIF (máximo 2MB)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              {/* Email (somente leitura) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  value={usuario?.email || ''}
                  className="input-field bg-gray-50 cursor-not-allowed"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  O e-mail não pode ser alterado
                </p>
              </div>

              {/* Celular */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Celular
                </label>
                <input
                  type="tel"
                  name="celular"
                  value={formData.celular}
                  onChange={handleCelularChange}
                  className="input-field"
                  placeholder="(11) 99999-9999"
                />
              </div>

              {/* Role (somente leitura) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Conta
                </label>
                <input
                  type="text"
                  value={usuario?.role === 'admin' ? 'Administrador' : 'Vendedor'}
                  className="input-field bg-gray-50 cursor-not-allowed capitalize"
                  disabled
                />
              </div>

              {/* Equipe (somente leitura) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Equipe
                </label>
                <input
                  type="text"
                  value={usuario?.equipe_nome || '-'}
                  className="input-field bg-gray-50 cursor-not-allowed"
                  disabled
                />
              </div>
            </div>

            {/* Botão de Salvar */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <button
                type="submit"
                disabled={loading}
                className="btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default Perfil;
