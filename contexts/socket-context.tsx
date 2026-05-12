import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';
import { NotificationToast, type NotificationType } from '@/components/ui/notification-toast';
import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  content: string;
  type: NotificationType;
}

interface SocketContextType {
  socket: Socket | null;
  notifications: Notification[];
  addNotification: (content: string, type: NotificationType) => void;
  removeNotification: (id: string) => void;
  isConnected: boolean;
}

interface NotificationNewPayload {
  content: string;
  type: string;
}

interface RequestNewPayload {
  requester?: { name?: string };
  requesterName?: string;
}

interface RequestAcceptedPayload {
  taskTitle: string;
}

interface MatchAcceptedPayload {
  peer_name?: string;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const addNotification = useCallback((content: string, type: NotificationType) => {
    console.log('[SocketProvider] Adding notification:', { content, type });
    setNotifications(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), content, type }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    console.log('[SocketProvider] Initializing socket connection...');
    const newSocket = io('https://backend-a41z.onrender.com', {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('[SocketProvider] Connected to server. Socket ID:', newSocket.id);
      setSocket(newSocket);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[SocketProvider] Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[SocketProvider] Connection error:', err.message);
    });

    return () => {
      console.log('[SocketProvider] Cleaning up socket connection...');
      newSocket.disconnect();
    };
  }, []);

  // Register user when socket or user changes
  useEffect(() => {
    if (socket && user?.id) {
      const register = () => {
        console.log('[SocketProvider] Sending register for user:', user.id);
        socket.emit('register', user.id);
      };

      if (isConnected) {
        register();
      } else {
        socket.once('connect', register);
      }

      socket.on('notification:new', (data: NotificationNewPayload) => {
        console.log('[SocketProvider] received notification:new', data);
        addNotification(data.content, data.type === 'match_request' ? 'match' : 'info');
      });

      socket.on('request:new', (data: RequestNewPayload) => {
        console.log('[SocketProvider] received request:new', data);
        const name = data.requester?.name || data.requesterName || 'Someone';
        addNotification(`${name} sent you a request!`, 'request');
      });

      socket.on('request:accepted', (data: RequestAcceptedPayload) => {
        console.log('[SocketProvider] received request:accepted', data);
        addNotification(`Request for "${data.taskTitle}" accepted!`, 'success');
      });

      socket.on('match:accepted', (data: MatchAcceptedPayload) => {
        console.log('[SocketProvider] received match:accepted', data);
        addNotification(`${data.peer_name || 'Your peer'} accepted the match!`, 'match');
      });

      const channel = supabase
        .channel(`global_notifications:${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          console.log('[SocketProvider] Supabase notification:', payload.new)
          const row = payload.new as { message?: string; type?: string }
          addNotification(row.message ?? '', row.type === 'task_request' ? 'request' : 'info')
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
        socket.off('notification:new');
        socket.off('request:new');
        socket.off('request:accepted');
        socket.off('match:accepted');
      };
    }
  }, [socket, user?.id, isConnected, addNotification]);

  return (
    <SocketContext.Provider value={{ socket, notifications, addNotification, removeNotification, isConnected }}>
      {children}
      <NotificationToast notifications={notifications} removeNotification={removeNotification} />
    </SocketContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

