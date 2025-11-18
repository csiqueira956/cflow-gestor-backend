import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
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
import Vendedores from './pages/configuracoes/Vendedores';
import Equipes from './pages/configuracoes/Equipes';
import Administradoras from './pages/configuracoes/Administradoras';
import Metas from './pages/configuracoes/Metas';

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
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
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
            <ProtectedRoute>
              <Configuracoes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/configuracoes/vendedores"
          element={
            <ProtectedRoute>
              <Vendedores />
            </ProtectedRoute>
          }
        />

        <Route
          path="/configuracoes/equipes"
          element={
            <ProtectedRoute>
              <Equipes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/configuracoes/administradoras"
          element={
            <ProtectedRoute>
              <Administradoras />
            </ProtectedRoute>
          }
        />

        <Route
          path="/configuracoes/metas"
          element={
            <ProtectedRoute>
              <Metas />
            </ProtectedRoute>
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
