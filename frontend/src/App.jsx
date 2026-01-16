import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import EsqueciSenha from './pages/EsqueciSenha';
import ResetarSenha from './pages/ResetarSenha';
import TermosDeUso from './pages/TermosDeUso';
import PoliticaPrivacidade from './pages/PoliticaPrivacidade';
import Dashboard from './pages/Dashboard';
import KanbanPage from './pages/KanbanPage';
import CadastroClienteCompleto from './pages/CadastroClienteCompleto';
import Admin from './pages/Admin';
import FormularioPublico from './pages/FormularioPublico';
import FormulariosPublicos from './pages/FormulariosPublicos';
import MeuLink from './pages/MeuLink';
import Perfil from './pages/Perfil';
import Comissoes from './pages/Comissoes';
import Configuracoes from './pages/Configuracoes';
import Billing from './pages/Billing';
import Vendedores from './pages/configuracoes/Vendedores';
import Equipes from './pages/configuracoes/Equipes';
import Administradoras from './pages/configuracoes/Administradoras';
import Metas from './pages/configuracoes/Metas';
import SuperAdminPanel from './pages/SuperAdminPanel';
import Simulador from './pages/Simulador';
import SimuladorV2 from './pages/SimuladorV2';

// Componente para rotas protegidas
const ProtectedRoute = ({ children }) => {
  const { usuario, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Componente para rotas protegidas por role
// allowedRoles: array de roles permitidos (ex: ['admin', 'super_admin'])
const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { usuario, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // Verificar se o usuário tem permissão
  if (!allowedRoles.includes(usuario.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Componente para redirecionar usuários autenticados
const PublicRoute = ({ children }) => {
  const { usuario, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (usuario) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Rotas públicas */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/cadastro"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />

        {/* Rotas de recuperação de senha (públicas) */}
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/resetar-senha" element={<ResetarSenha />} />

        {/* Rotas de documentos legais (públicas) */}
        <Route path="/termos-de-uso" element={<TermosDeUso />} />
        <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />

        {/* Rota de formulário público (sem autenticação) */}
        <Route path="/formulario/:token" element={<FormularioPublico />} />

        {/* Rotas protegidas */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/kanban"
          element={
            <ProtectedRoute>
              <KanbanPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cadastro-cliente"
          element={
            <ProtectedRoute>
              <CadastroClienteCompleto />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <Admin />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/formularios-publicos"
          element={
            <ProtectedRoute>
              <FormulariosPublicos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/meu-link"
          element={
            <ProtectedRoute>
              <MeuLink />
            </ProtectedRoute>
          }
        />

        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Perfil />
            </ProtectedRoute>
          }
        />

        <Route
          path="/comissoes"
          element={
            <ProtectedRoute>
              <Comissoes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/configuracoes"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'gerente', 'super_admin']}>
              <Configuracoes />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/configuracoes/vendedores"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'gerente', 'super_admin']}>
              <Vendedores />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/configuracoes/equipes"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'gerente', 'super_admin']}>
              <Equipes />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/configuracoes/administradoras"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'gerente', 'super_admin']}>
              <Administradoras />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/configuracoes/metas"
          element={
            <RoleProtectedRoute allowedRoles={['admin', 'gerente', 'super_admin']}>
              <Metas />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/simulador"
          element={
            <ProtectedRoute>
              <Simulador />
            </ProtectedRoute>
          }
        />

        <Route
          path="/simulador-v2"
          element={
            <ProtectedRoute>
              <SimuladorV2 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/assinatura"
          element={
            <ProtectedRoute>
              <Billing />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin"
          element={
            <RoleProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminPanel />
            </RoleProtectedRoute>
          }
        />

        {/* Rota de cadastro público por link */}
        <Route path="/cadastro/:linkPublico" element={<CadastroClienteCompleto />} />

        {/* Rota padrão */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Rota 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
