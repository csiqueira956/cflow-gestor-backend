import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificar token ao carregar a aplicação
  useEffect(() => {
    const verificarAutenticacao = async () => {
      const token = localStorage.getItem('token');
      const usuarioSalvo = localStorage.getItem('usuario');

      if (token && usuarioSalvo) {
        try {
          // Verificar se o token ainda é válido
          const response = await authAPI.verificarToken();
          const usuarioAtualizado = response.data;
          setUsuario(usuarioAtualizado);
          localStorage.setItem('usuario', JSON.stringify(usuarioAtualizado));
        } catch (error) {
          // Token inválido, limpar dados
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
          setUsuario(null);
        }
      } else {
        setUsuario(null);
      }
      setLoading(false);
    };

    verificarAutenticacao();
  }, []);

  // Função de login
  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { token, usuario } = response.data;

      // Salvar token e dados do usuário
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
      setUsuario(usuario);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao fazer login',
      };
    }
  };

  // Função de logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  // Função de registro
  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao registrar usuário',
      };
    }
  };

  // Verificar se é admin (ou super_admin, que tem todas as permissões de admin)
  const isAdmin = () => {
    return usuario?.role === 'admin' || usuario?.role === 'super_admin';
  };

  // Verificar se é gerente
  const isGerente = () => {
    return usuario?.role === 'gerente';
  };

  // Verificar se é vendedor
  const isVendedor = () => {
    return usuario?.role === 'vendedor';
  };

  // Verificar se é admin ou gerente (tem permissões de gestão)
  const isAdminOrGerente = () => {
    return usuario?.role === 'admin' || usuario?.role === 'gerente';
  };

  // Verificar se é super admin (acesso cross-tenant)
  const isSuperAdmin = () => {
    return usuario?.role === 'super_admin';
  };

  // Verificar se é admin ou super admin
  const isAdminOrSuperAdmin = () => {
    return usuario?.role === 'admin' || usuario?.role === 'super_admin';
  };

  // Atualizar dados do usuário
  const updateUsuario = (dadosAtualizados) => {
    const usuarioAtualizado = { ...usuario, ...dadosAtualizados };
    setUsuario(usuarioAtualizado);
    localStorage.setItem('usuario', JSON.stringify(usuarioAtualizado));
  };

  const value = {
    usuario,
    loading,
    login,
    logout,
    register,
    isAdmin,
    isGerente,
    isVendedor,
    isAdminOrGerente,
    isSuperAdmin,
    isAdminOrSuperAdmin,
    updateUsuario,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook personalizado para usar o contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export default AuthContext;
