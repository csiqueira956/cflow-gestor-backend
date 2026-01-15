import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Kanban from '../components/Kanban';
import { useAuth } from '../context/AuthContext';

const KanbanPage = () => {
  const { usuario } = useAuth();
  const location = useLocation();
  const [clienteIdParaAbrir, setClienteIdParaAbrir] = useState(null);
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Verificar se há um clienteId no state
  useEffect(() => {
    if (location.state?.clienteId) {
      setClienteIdParaAbrir(location.state.clienteId);
      // Limpar o state após usar
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Sincronizar com mudanças no localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebarExpanded');
      setIsExpanded(saved !== null ? JSON.parse(saved) : true);
    };

    const interval = setInterval(handleStorageChange, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300 ${isExpanded ? 'ml-64' : 'ml-20'}`} style={{ maxWidth: '1472px' }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Esteira de Vendas
          </h1>
          <p className="text-gray-600">
            Gerencie seus clientes através da esteira de vendas
          </p>
        </div>

        {/* Kanban */}
        <Kanban clienteIdParaAbrir={clienteIdParaAbrir} onClienteAberto={() => setClienteIdParaAbrir(null)} />
      </div>
    </div>
  );
};

export default KanbanPage;
