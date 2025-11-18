import { useState, useEffect } from 'react';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Sincronizar com mudanças no localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebarExpanded');
      setIsExpanded(saved !== null ? JSON.parse(saved) : true);
    };

    window.addEventListener('storage', handleStorageChange);

    // Verificar mudanças no localStorage a cada 100ms (para quando o componente atualiza)
    const interval = setInterval(handleStorageChange, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div
        className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300 ${
          isExpanded ? 'ml-64' : 'ml-20'
        }`}
        style={{ maxWidth: '1472px' }}
      >
        {children}
      </div>
    </div>
  );
};

export default Layout;
