// src/context/NotificationContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import NotificationService, { NotificationItem } from '@/lib/notificationService';
import { useRole } from './RoleContext';
import axios, { AxiosInstance } from 'axios';

export type { NotificationItem as Notification };

interface ApiNotification {
  _id?: string;
  id?: string;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useRole();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const service = NotificationService;
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  // Create apiClient once using a ref so it never changes reference
  const apiClientRef = useRef<AxiosInstance>(
    axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
    })
  );

  // Set up the auth interceptor once
  useEffect(() => {
    const interceptorId = apiClientRef.current.interceptors.request.use((config) => {
      const token = localStorage.getItem('sk_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return () => {
      apiClientRef.current.interceptors.request.eject(interceptorId);
    };
  }, []);

  // refreshNotifications no longer depends on `notifications` state —
  // it uses the functional updater form of setNotifications instead.
  const refreshNotifications = useCallback(async () => {
    try {
      const response = await apiClientRef.current.get('/notifications');
      const apiNotifs: ApiNotification[] = response.data?.data || response.data || [];

      if (!Array.isArray(apiNotifs) || apiNotifs.length === 0) return;

      setNotifications((prev) => {
        const currentIds = new Set(prev.map((n) => n.id));
        const newItems: NotificationItem[] = [];

        apiNotifs.forEach((notif: ApiNotification) => {
          const item: NotificationItem = {
            id: notif._id || notif.id || `api_${Date.now()}_${Math.random()}`,
            title: notif.title || 'New Notification',
            message: notif.message || '',
            type: (notif.type as NotificationItem['type']) || 'system',
            isRead: notif.read || false,
            timestamp: notif.createdAt || new Date().toISOString(),
            metadata: notif.metadata || {},
          };

          if (!currentIds.has(item.id)) {
            newItems.push(item);
          }
        });

        if (newItems.length === 0) {
          // Return the exact same reference so React skips a re-render
          return prev;
        }

        console.log(`🔔 Added ${newItems.length} new notifications`);

        // Side-effects outside the setter (deferred so we don't block render)
        setTimeout(() => {
          newItems.forEach((item) => {
            service.addNotification({
              title: item.title,
              message: item.message,
              type: item.type,
              metadata: item.metadata,
            });

            service.showSystemNotification(item.title, {
              body: item.message,
              icon: '/favicon.ico',
            });

            toast.info(item.title, {
              description: item.message,
              duration: 5000,
            });
          });
        }, 0);

        // Prepend new items so newest is first
        return [...newItems, ...prev];
      });
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  }, [service]); // `service` is a singleton so this never re-creates

  // Load initial notifications and start polling — runs exactly once
  useEffect(() => {
    isMounted.current = true;

    // Load from local service cache
    setNotifications(service.getNotifications());

    // Subscribe to local service changes (e.g. from other tabs via BroadcastChannel)
    const unsubscribe = service.subscribe((updated) => {
      if (isMounted.current) {
        setNotifications([...updated]);
      }
    });

    // Immediate fetch on mount
    refreshNotifications();

    // Poll every 5 minutes — interval is set up once and never re-created
    if (pollInterval.current) clearInterval(pollInterval.current);
    pollInterval.current = setInterval(() => {
      refreshNotifications();
    }, 300_000); // 5 minutes

    return () => {
      isMounted.current = false;
      unsubscribe();
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
    };
  }, [service]); // removed `refreshNotifications` — it's stable now, but keeping deps minimal

  const addNotification = useCallback(
    (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>) => {
      service.addNotification(notif);
    },
    [service]
  );

  const markAsRead = useCallback(
    (id: string) => {
      service.markAsRead(id);
      apiClientRef.current.patch(`/notifications/${id}/read`).catch(() => {});
    },
    [service]
  );

  const markAllAsRead = useCallback(() => {
    service.markAllAsRead();
    apiClientRef.current.patch('/notifications/read-all').catch(() => {});
  }, [service]);

  const removeNotification = useCallback(
    (id: string) => {
      service.deleteNotification(id);
      apiClientRef.current.delete(`/notifications/${id}`).catch(() => {});
    },
    [service]
  );

  const clearAll = useCallback(() => {
    service.clearAllNotifications();
  }, [service]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        refresh: refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};