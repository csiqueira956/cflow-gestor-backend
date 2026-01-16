import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Carregar contador de não lidas
  useEffect(() => {
    carregarContadorNaoLidas();
    // Atualizar a cada 30 segundos
    const interval = setInterval(carregarContadorNaoLidas, 30000);
    return () => clearInterval(interval);
  }, []);

  const carregarContadorNaoLidas = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error('Erro ao carregar contador de notificações:', error);
    }
  };

  const carregarNotificacoes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLida = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);

      // Atualizar lista local
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, lida: true } : n
      ));

      // Atualizar contador
      carregarContadorNaoLidas();
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      await api.put('/notifications/read-all');

      // Atualizar lista local
      setNotifications(notifications.map(n => ({ ...n, lida: true })));

      // Atualizar contador
      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const handleToggleDropdown = () => {
    if (!isOpen) {
      carregarNotificacoes();
    }
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = (notification) => {
    // Marcar como lida
    if (!notification.lida) {
      marcarComoLida(notification.id);
    }

    // Navegar para URL de ação, se houver
    if (notification.action_url) {
      setIsOpen(false);
      navigate(notification.action_url);
    }
  };

  const getPrioridadeColor = (prioridade) => {
    const colors = {
      urgente: 'bg-red-50 border-l-4 border-red-500',
      alta: 'bg-orange-50 border-l-4 border-orange-500',
      normal: 'bg-blue-50 border-l-4 border-blue-500',
      baixa: 'bg-gray-50 border-l-4 border-gray-500'
    };
    return colors[prioridade] || colors.normal;
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'vencimento_proximo':
      case 'vencimento_hoje':
        return '📅';
      case 'vencimento_atrasado':
        return '🚨';
      case 'limite_atingido':
        return '⚠️';
      case 'upgrade_disponivel':
        return '🚀';
      case 'sistema':
        return '🔔';
      default:
        return '📬';
    }
  };

  const formatarData = (dataISO) => {
    const data = new Date(dataISO);
    const agora = new Date();
    const diffMs = agora - data;
    const diffMinutos = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMinutos < 1) return 'Agora';
    if (diffMinutos < 60) return `${diffMinutos}m atrás`;
    if (diffHoras < 24) return `${diffHoras}h atrás`;
    if (diffDias === 1) return 'Ontem';
    if (diffDias < 7) return `${diffDias}d atrás`;

    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão do sino */}
      <button
        onClick={handleToggleDropdown}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notificações"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge com contador */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de notificações */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 className="text-lg font-semibold text-gray-900">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={marcarTodasComoLidas}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Lista de notificações */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="text-6xl mb-4">🔔</div>
                <p className="text-gray-600 font-medium">Nenhuma notificação</p>
                <p className="text-sm text-gray-500 mt-1">Você está em dia!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 transition-colors cursor-pointer ${
                      !notification.lida
                        ? 'bg-blue-50 hover:bg-blue-100'
                        : 'hover:bg-gray-50'
                    } ${getPrioridadeColor(notification.prioridade)}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Ícone */}
                      <div className="text-2xl flex-shrink-0">
                        {getTipoIcon(notification.tipo)}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm font-semibold ${
                            !notification.lida ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.titulo}
                          </h4>
                          {!notification.lida && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.mensagem}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {formatarData(notification.created_at)}
                          </span>

                          {notification.action_label && (
                            <span className="text-xs text-blue-600 font-medium">
                              {notification.action_label} →
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications');
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Ver todas as notificações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
