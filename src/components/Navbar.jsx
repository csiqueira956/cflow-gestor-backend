import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { clientesAPI } from '../api/api';
import Logo from './Logo';

const Navbar = () => {
  const { usuario, logout, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [superAdminOpen, setSuperAdminOpen] = useState(false);
  const searchRef = useRef(null);

  // Salvar estado da sidebar no localStorage
  useEffect(() => {
    localStorage.setItem('sidebarExpanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  // Auto-expandir dropdown de configurações se estiver em uma página de configuração
  useEffect(() => {
    if (isConfigPath()) {
      setConfigOpen(true);
    }
    if (isSuperAdminPath()) {
      setSuperAdminOpen(true);
    }
  }, [location.pathname]);

  // Fechar busca ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setBuscaAberta(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Buscar clientes com debounce
  useEffect(() => {
    if (termoBusca.length < 2) {
      setResultados([]);
      return;
    }

    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const response = await clientesAPI.listar();
        const clientes = response.data.data?.clientes || [];

        const termo = termoBusca.toLowerCase();
        const filtrados = clientes.filter((cliente) => {
          const buscaNome = cliente.nome?.toLowerCase().includes(termo);
          const buscaCPF = cliente.cpf?.replace(/\D/g, '').includes(termo.replace(/\D/g, ''));
          const buscaEmail = cliente.email?.toLowerCase().includes(termo);
          const buscaTelefone = cliente.telefone_celular?.replace(/\D/g, '').includes(termo.replace(/\D/g, ''));

          return buscaNome || buscaCPF || buscaEmail || buscaTelefone;
        });

        setResultados(filtrados.slice(0, 10));
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
      } finally {
        setBuscando(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [termoBusca]);

  const handleClienteClick = (cliente) => {
    setBuscaAberta(false);
    setTermoBusca('');
    navigate('/kanban', { state: { clienteId: cliente.id } });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const isConfigPath = () => {
    return location.pathname.startsWith('/configuracoes');
  };

  const isSuperAdminPath = () => {
    return location.pathname.startsWith('/super-admin');
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ), hideForSuperAdmin: true },
    { path: '/kanban', label: 'Esteira de Vendas', hideForSuperAdmin: true, icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )},
    { path: '/comissoes', label: 'Comissões', hideForSuperAdmin: true, icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { path: '/simulador', label: 'Simulador', hideForSuperAdmin: true, icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )},
    { path: '/meu-link', label: 'Meu Link', hideForSuperAdmin: true, icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    )},
    { path: '/assinatura', label: 'Assinatura', hideForSuperAdmin: true, icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    )},
  ];

  // Filtrar items que devem ser ocultados para super_admin
  const filteredMenuItems = menuItems.filter(item =>
    !(item.hideForSuperAdmin && isSuperAdmin())
  );

  const configSubItems = [
    { path: '/configuracoes/vendedores', label: 'Vendedores' },
    { path: '/configuracoes/equipes', label: 'Equipes' },
    { path: '/configuracoes/administradoras', label: 'Administradoras' },
    { path: '/configuracoes/metas', label: 'Metas' },
  ];

  const superAdminSubItems = [
    { path: '/super-admin', label: 'Dashboard', hash: '' },
    { path: '/super-admin', label: 'Empresas', hash: 'empresas' },
    { path: '/super-admin', label: 'Planos', hash: 'planos' },
    { path: '/super-admin', label: 'Monitoramento', hash: 'monitoramento' },
  ];

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-white border-r border-accent-200 transition-all duration-300 z-40 flex flex-col ${
          isExpanded ? 'w-64' : 'w-20'
        }`}
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
      >
        {/* Header com Logo e Toggle */}
        <div className="flex items-center justify-between p-4 border-b border-accent-200">
          {isExpanded ? (
            <Link to="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
              <Logo className="w-10 h-10" size={40} />
            </Link>
          ) : (
            <Link to="/dashboard" className="mx-auto">
              <Logo className="w-10 h-10" size={40} showText={false} />
            </Link>
          )}

          {isExpanded && (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Recolher sidebar"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Busca Global (apenas quando expandida) */}
        {isExpanded && (
          <div className="p-4 border-b border-accent-200" ref={searchRef}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                onFocus={() => setBuscaAberta(true)}
                placeholder="Buscar clientes..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {buscando && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>

            {/* Dropdown de resultados */}
            {buscaAberta && termoBusca.length >= 2 && (
              <div className="absolute left-4 right-4 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
                {resultados.length > 0 ? (
                  <div className="py-2">
                    {resultados.map((cliente) => (
                      <button
                        key={cliente.id}
                        onClick={() => handleClienteClick(cliente)}
                        className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left flex items-start gap-3"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{cliente.nome}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {cliente.cpf && `CPF: ${cliente.cpf}`}
                            {cliente.cpf && cliente.telefone_celular && ' | '}
                            {cliente.telefone_celular && `Tel: ${cliente.telefone_celular}`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    <p>Nenhum cliente encontrado</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Menu de Navegação */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-3">
            {filteredMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative ${
                  isActive(item.path)
                    ? 'bg-primary-50 font-semibold'
                    : 'text-accent-600 hover:bg-accent-50'
                } ${!isExpanded && 'justify-center'}`}
                style={isActive(item.path) ? { color: '#0a4ee4' } : {}}
                title={!isExpanded ? item.label : ''}
              >
                {isActive(item.path) && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                    style={{ background: 'linear-gradient(180deg, #0a4ee4, #7c3aed)' }}
                  />
                )}
                <div className="flex-shrink-0">
                  {item.icon}
                </div>
                {isExpanded && (
                  <span className="text-sm">{item.label}</span>
                )}
              </Link>
            ))}

            {/* Menu de Configurações (apenas para admins, não super_admin) */}
            {isAdmin() && !isSuperAdmin() && (
              <div>
                <button
                  onClick={() => setConfigOpen(!configOpen)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative ${
                    isConfigPath()
                      ? 'bg-primary-50 font-semibold'
                      : 'text-accent-600 hover:bg-accent-50'
                  } ${!isExpanded && 'justify-center'}`}
                  style={isConfigPath() ? { color: '#0a4ee4' } : {}}
                  title={!isExpanded ? 'Configurações' : ''}
                >
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  {isExpanded && (
                    <>
                      <span className="text-sm flex-1 text-left">Configurações</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${configOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>

                {/* Submenu de Configurações */}
                {isExpanded && configOpen && (
                  <div className="mt-1 space-y-1">
                    {configSubItems.map((subItem) => (
                      <Link
                        key={subItem.path}
                        to={subItem.path}
                        className={`flex items-center gap-3 pl-12 pr-3 py-2 rounded-xl transition-all text-sm ${
                          isActive(subItem.path)
                            ? 'bg-primary-50 font-semibold'
                            : 'text-accent-500 hover:bg-accent-50'
                        }`}
                        style={isActive(subItem.path) ? { color: '#0a4ee4' } : {}}
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Super Admin (apenas para super_admin) */}
            {isSuperAdmin() && (
              <div>
                <button
                  onClick={() => setSuperAdminOpen(!superAdminOpen)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative ${
                    isSuperAdminPath()
                      ? 'bg-purple-50 font-semibold'
                      : 'text-accent-600 hover:bg-accent-50'
                  } ${!isExpanded && 'justify-center'}`}
                  style={isSuperAdminPath() ? { color: '#7c3aed' } : {}}
                  title={!isExpanded ? 'Super Admin' : ''}
                >
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  {isExpanded && (
                    <>
                      <span className="text-sm flex-1 text-left">Super Admin</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${superAdminOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>

                {/* Submenu Super Admin */}
                {isExpanded && superAdminOpen && (
                  <div className="mt-1 space-y-1">
                    {superAdminSubItems.map((subItem) => (
                      <button
                        key={subItem.hash}
                        onClick={() => {
                          navigate('/super-admin');
                          // Usar um pequeno delay para garantir que a página carregou
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('superAdminTabChange', { detail: subItem.hash || 'dashboard' }));
                          }, 100);
                        }}
                        className={`w-full flex items-center gap-3 pl-12 pr-3 py-2 rounded-xl transition-all text-sm text-left ${
                          isSuperAdminPath()
                            ? 'text-purple-600 hover:bg-purple-50'
                            : 'text-accent-500 hover:bg-accent-50'
                        }`}
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Perfil do Usuário (Footer) */}
        <div className="border-t border-accent-200 p-4">
          {isExpanded ? (
            <div className="space-y-3">
              <Link
                to="/perfil"
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent-50 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0a4ee4, #7c3aed)' }}
                >
                  {usuario?.foto_perfil ? (
                    <img
                      src={usuario.foto_perfil}
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-accent-800 truncate">{usuario?.nome}</p>
                  <p
                    className="text-xs capitalize font-medium"
                    style={{ color: '#0a4ee4' }}
                  >
                    {usuario?.role}
                  </p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-accent-100 text-accent-700 px-4 py-2 rounded-xl hover:bg-accent-200 transition-colors font-semibold text-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sair
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <Link
                to="/perfil"
                className="flex justify-center p-2 rounded-xl hover:bg-accent-50 transition-colors"
                title="Perfil"
              >
                <div
                  className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #0a4ee4, #7c3aed)' }}
                >
                  {usuario?.foto_perfil ? (
                    <img
                      src={usuario.foto_perfil}
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  )}
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex justify-center p-2 rounded-xl hover:bg-accent-50 transition-colors"
                title="Sair"
              >
                <svg className="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Botão de expandir quando recolhida */}
        {!isExpanded && (
          <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-8 bg-white border border-gray-200 rounded-full p-1.5 shadow-md hover:bg-gray-50 transition-colors"
            title="Expandir sidebar"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </aside>
    </>
  );
};

export default Navbar;
