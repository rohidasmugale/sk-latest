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

// ✅ Sound helper – no external file needed
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Silently fail if audio not available
  }
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
// Refs for notification tracking

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, user } = useRole();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const service = NotificationService;
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  // Refs for task polling (cross‑tab)
  const knownTaskIds = useRef<Set<string>>(new Set());
  const isFirstTaskLoad = useRef(true);

  // Refs for completed tasks polling (admin)
  const knownCompletedIds = useRef<Set<string>>(new Set());
  const isFirstCompletedLoad = useRef(true);

  // Refs for leave polling
  const knownLeaveStatuses = useRef<Map<string, string>>(new Map());
  const isFirstLeaveLoad = useRef(true);

  // Refs for geofence breaches
  const knownBreachIds = useRef<Set<string>>(new Set());
  const isFirstBreachLoad = useRef(true);
const shownNotificationIds = useRef<Set<string>>(new Set());
  const apiClientRef = useRef<AxiosInstance>(
    axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
    })
  );

  // Auth interceptor (once)
  useEffect(() => {
    const interceptorId = apiClientRef.current.interceptors.request.use((config) => {
      const token = localStorage.getItem('sk_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return () => apiClientRef.current.interceptors.request.eject(interceptorId);
  }, []);

  // ========== FIXED: addNotification updates React state ==========
  const addNotification = useCallback((notif: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>) => {
    const item: NotificationItem = {
      ...notif,
      id: `local_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    // Update React state – this is the key fix!
    setNotifications(prev => {
      // Avoid duplicates by metadata taskId or leaveId
      const dupKey = (item.metadata as any)?.taskId || (item.metadata as any)?.leaveId;
      if (dupKey && prev.some(n => {
        const m = n.metadata as any;
        return m?.taskId === dupKey || m?.leaveId === dupKey;
      })) return prev;
      return [item, ...prev];
    });

    // Play sound and show toast
    playNotificationSound();
    toast.info(item.title, { description: item.message, duration: 6000 });

    // Also persist to localStorage (for offline / cross‑tab via service)
    service.addNotification(notif);
  }, [service]);

  // ========== Poll /assigntasks for NEW tasks (supervisor/manager/employee) ==========
  useEffect(() => {
    if (!role || role === 'superadmin' || role === 'admin') return;

    const checkForNewTasks = async () => {
      try {
        const storedUser = localStorage.getItem('sk_user');
        if (!storedUser) return;
        const userData = JSON.parse(storedUser);
        const userId = userData._id || userData.id;
        const userName = userData.name;
        if (!userId) return;

        const response = await apiClientRef.current.get('/assigntasks');
        let allTasks: any[] = [];
        if (Array.isArray(response.data)) allTasks = response.data;
        else if (response.data?.tasks) allTasks = response.data.tasks;
        else if (response.data?.data) allTasks = response.data.data;

        const myTasks = allTasks.filter((task: any) => {
          const inSup = task.assignedSupervisors?.some((s: any) =>
            String(s.userId) === String(userId) || s.name?.toLowerCase() === userName?.toLowerCase()
          );
          const inMgr = task.assignedManagers?.some((m: any) =>
            String(m.userId) === String(userId) || m.name?.toLowerCase() === userName?.toLowerCase()
          );
          return inSup || inMgr;
        });

        if (isFirstTaskLoad.current) {
          myTasks.forEach((t: any) => knownTaskIds.current.add(t._id));
          isFirstTaskLoad.current = false;
          return;
        }

        const newTasks = myTasks.filter((t: any) => !knownTaskIds.current.has(t._id));
        newTasks.forEach((task: any) => {
          knownTaskIds.current.add(task._id);
          addNotification({
            title: `📋 New Task: ${task.taskTitle || task.title}`,
            message: `"${task.taskTitle || task.title}" at ${task.siteName} — Priority: ${task.priority || 'medium'}`,
            type: 'task',
            metadata: {
              taskId: task._id,
              taskTitle: task.taskTitle || task.title,
              siteName: task.siteName,
              priority: task.priority,
              notificationType: 'task_assignment',
            },
          });
        });
      } catch {
        // silent
      }
    };

    checkForNewTasks();
    const interval = setInterval(checkForNewTasks, 15_000);
    return () => clearInterval(interval);
  }, [role, addNotification]);

  // ========== Poll /assigntasks for COMPLETED tasks (admin/superadmin) ==========
  useEffect(() => {
    if (role !== 'superadmin' && role !== 'admin') return;

    const checkCompletedTasks = async () => {
      try {
        const response = await apiClientRef.current.get('/assigntasks');
        let allTasks: any[] = [];
        if (Array.isArray(response.data)) allTasks = response.data;
        else if (response.data?.tasks) allTasks = response.data.tasks;
        else if (response.data?.data) allTasks = response.data.data;

        const completed = allTasks.filter((t: any) => t.status === 'completed');

        if (isFirstCompletedLoad.current) {
          completed.forEach((t: any) => knownCompletedIds.current.add(t._id));
          isFirstCompletedLoad.current = false;
          return;
        }

        const newlyDone = completed.filter((t: any) => !knownCompletedIds.current.has(t._id));
        newlyDone.forEach((task: any) => {
          knownCompletedIds.current.add(task._id);
          addNotification({
            title: `✅ Task Completed: ${task.taskTitle || task.title}`,
            message: `"${task.taskTitle || task.title}" at ${task.siteName} has been completed`,
            type: 'task',
            metadata: {
              taskId: task._id,
              siteName: task.siteName,
              notificationType: 'task_completed',
            },
          });
        });
      } catch {
        // silent
      }
    };

    checkCompletedTasks();
    const interval = setInterval(checkCompletedTasks, 30_000);
    return () => clearInterval(interval);
  }, [role, addNotification]);

  // ========== Poll /leaves for status changes ==========
  useEffect(() => {
    if (!role) return;

    const checkLeaves = async () => {
      try {
        const storedUser = localStorage.getItem('sk_user');
        const userData = storedUser ? JSON.parse(storedUser) : null;
        const userId = userData?._id || userData?.id;

        const response = await apiClientRef.current.get('/leaves');
        const data = response.data;
        const leaves: any[] = Array.isArray(data) ? data : data?.data || [];

        if (isFirstLeaveLoad.current) {
          leaves.forEach((l: any) => knownLeaveStatuses.current.set(l._id, l.status));
          isFirstLeaveLoad.current = false;
          return;
        }

        leaves.forEach((leave: any) => {
          const prev = knownLeaveStatuses.current.get(leave._id);
          if (prev === leave.status) return;
          knownLeaveStatuses.current.set(leave._id, leave.status);

          // Superadmin/admin see new pending requests
          if ((role === 'superadmin' || role === 'admin') && leave.status === 'pending' && !prev) {
            addNotification({
              title: `📅 New Leave Request`,
              message: `${leave.employeeName} applied for ${leave.leaveType} leave (${leave.totalDays} days)`,
              type: 'leave',
              metadata: { leaveId: leave._id, notificationType: 'leave_request' },
            });
            return;
          }

          // Manager/supervisor see pending requests in their site/department
          if ((role === 'manager' || role === 'supervisor') && leave.status === 'pending' && !prev) {
            addNotification({
              title: `📅 Leave Request`,
              message: `${leave.employeeName} applied for ${leave.leaveType} leave`,
              type: 'leave',
              metadata: { leaveId: leave._id, notificationType: 'leave_request' },
            });
            return;
          }

          // Employee/supervisor see their own leave status change
          const isMyLeave = leave.employeeId === userId ||
            (leave.isSupervisorLeave && leave.supervisorId === userId);

          if (isMyLeave && (leave.status === 'approved' || leave.status === 'rejected')) {
            addNotification({
              title: leave.status === 'approved' ? '✅ Leave Approved' : '❌ Leave Rejected',
              message: `Your ${leave.leaveType} leave has been ${leave.status}`,
              type: 'leave',
              metadata: { leaveId: leave._id, notificationType: `leave_${leave.status}` },
            });
          }
        });
      } catch {
        // silent
      }
    };

    checkLeaves();
    const interval = setInterval(checkLeaves, 20_000);
    return () => clearInterval(interval);
  }, [role, addNotification]);

  // ========== Poll /attendance/geofence-breaches ==========
  useEffect(() => {
    if (role !== 'superadmin' && role !== 'admin' && role !== 'manager' && role !== 'supervisor') return;

    const checkBreaches = async () => {
      try {
        const response = await apiClientRef.current.get('/attendance/geofence-breaches');
        const breaches: any[] = response.data?.data || [];

        if (isFirstBreachLoad.current) {
          breaches.forEach((b: any) => knownBreachIds.current.add(b.employeeId));
          isFirstBreachLoad.current = false;
          return;
        }

        breaches.forEach((breach: any) => {
          if (knownBreachIds.current.has(breach.employeeId)) return;
          knownBreachIds.current.add(breach.employeeId);
          addNotification({
            title: `🚨 Employee Left Site`,
            message: `${breach.employeeName} has left ${breach.siteName}`,
            type: 'system',
            metadata: {
              employeeId: breach.employeeId,
              siteName: breach.siteName,
              notificationType: 'geofence_breach',
            },
          });
        });
      } catch {
        // silent
      }
    };

    checkBreaches();
    const interval = setInterval(checkBreaches, 15_000);
    return () => clearInterval(interval);
  }, [role, addNotification]);


  // ========== Poll /notifications for NEW notifications (Super Admin, Admin, Manager, Supervisor) ==========
// ========== Poll /notifications for NEW notifications ==========
useEffect(() => {
  if (!role || role === 'employee') return;

  const checkNotifications = async () => {
    try {
      const token = localStorage.getItem('sk_token');
      if (!token) return;

      // ✅ Check if notifications were cleared recently
      const wereCleared = localStorage.getItem('notifications_cleared');
      if (wereCleared === 'true') {
        // Skip polling if cleared
        return;
      }

      const response = await apiClientRef.current.get('/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = response.data;
      if (data.success && Array.isArray(data.data)) {
        const apiNotifications = data.data;
        const existingIds = new Set(notifications.map(n => n.id));
        
        // ✅ Find only BRAND NEW notifications
        const newNotifs = apiNotifications.filter((notif: any) => {
          const id = notif._id || notif.id;
          return !existingIds.has(id) && !shownNotificationIds.current.has(id);
        });

        if (newNotifs.length > 0) {
          console.log(`🔔 Found ${newNotifs.length} new notifications`);
          
          newNotifs.forEach((notif: any) => {
            const id = notif._id || notif.id;
            
            // ✅ Mark as shown immediately to prevent duplicates
            shownNotificationIds.current.add(id);
            
            const notifItem: NotificationItem = {
              id: id,
              title: notif.title || 'Notification',
              message: notif.message || '',
              type: notif.type === 'urgent' ? 'system' : (notif.type || 'system'),
              isRead: notif.read || false,
              timestamp: notif.createdAt || new Date().toISOString(),
              metadata: notif.metadata || {}
            };
            
            // Add to state
            setNotifications(prev => {
              if (prev.some(n => n.id === id)) return prev;
              return [notifItem, ...prev];
            });
            
            // ✅ Only trigger sound/toast for unread notifications
            if (!notif.read) {
              playNotificationSound();
              toast.info(notif.title, {
                description: notif.message,
                duration: 6000,
              });
            }
          });
        }
      }
    } catch (error) {
      // silent
    }
  };

  checkNotifications();
  const interval = setInterval(checkNotifications, 15000);
  return () => clearInterval(interval);
}, [role, notifications]);

  // ========== Window event listeners for same‑tab fallback ==========
  useEffect(() => {
    const handleTaskAssigned = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const currentUserId = (user as any)?._id || (user as any)?.id;
      const isForMe = role === 'superadmin' || role === 'admin' ||
        detail.assignedToId === currentUserId ||
        detail.assignedSupervisors?.some((s: any) => String(s.userId) === String(currentUserId));
      if (!isForMe) return;

      addNotification({
        title: `📋 New Task: ${detail.taskTitle}`,
        message: `"${detail.taskTitle}" at ${detail.siteName || 'site'} — Priority: ${detail.priority || 'medium'}`,
        type: 'task',
        metadata: { ...detail, notificationType: 'task_assignment' },
      });
    };

    const handleLeaveUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      addNotification({
        title: detail.title || '📅 Leave Update',
        message: detail.message || 'A leave request has been updated',
        type: 'leave',
        metadata: { ...detail },
      });
    };

    window.addEventListener('task-assigned', handleTaskAssigned);
    window.addEventListener('leave-update', handleLeaveUpdate);
    return () => {
      window.removeEventListener('task-assigned', handleTaskAssigned);
      window.removeEventListener('leave-update', handleLeaveUpdate);
    };
  }, [role, user, addNotification]);

  // ========== Load initial notifications from localStorage ==========
  // ========== Load initial notifications from localStorage ==========
useEffect(() => {
  isMounted.current = true;
  
  // ✅ Check if notifications were cleared
  const wereCleared = localStorage.getItem('notifications_cleared');
  if (wereCleared === 'true') {
    // If cleared, don't load from localStorage
    setNotifications([]);
    // Clear the flag after checking
    localStorage.removeItem('notifications_cleared');
    return;
  }
  
  const cached = service.getNotifications();
  if (cached.length > 0) setNotifications(cached);

  const unsubscribe = service.subscribe((updated) => {
    if (isMounted.current) setNotifications([...updated]);
  });

  return () => {
    isMounted.current = false;
    unsubscribe();
    if (pollInterval.current) clearInterval(pollInterval.current);
  };
}, [service]);

  // ========== Refresh (reset all internal caches) ==========
const refresh = useCallback(async () => {
  // Reset all known IDs so the next poll triggers notifications again
  knownTaskIds.current = new Set();
  isFirstTaskLoad.current = true;
  knownCompletedIds.current = new Set();
  isFirstCompletedLoad.current = true;
  knownLeaveStatuses.current = new Map();
  isFirstLeaveLoad.current = true;
  knownBreachIds.current = new Set();
  isFirstBreachLoad.current = true;
  
  // ✅ Also clear shown notification IDs
  shownNotificationIds.current.clear();
  
  // Optionally re-fetch notifications from API
  // (already handled by polling intervals)
  toast.info('Refreshed notification caches');
}, []);

  // ========== CRUD operations (now use setNotifications) ==========
const markAsRead = useCallback((id: string) => {
  setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  service.markAsRead(id);
  apiClientRef.current.patch(`/notifications/${id}/read`).catch(() => {});
}, [service]);

const markAllAsRead = useCallback(() => {
  setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  service.markAllAsRead();
  apiClientRef.current.patch('/notifications/read-all').catch(() => {});
}, [service]);

const removeNotification = useCallback((id: string) => {
  // ✅ Also remove from shown IDs
  shownNotificationIds.current.delete(id);
  setNotifications(prev => prev.filter(n => n.id !== id));
  service.deleteNotification(id);
}, [service]);

const clearAll = useCallback(() => {
  // 1. Clear the shown IDs to prevent duplicates
  shownNotificationIds.current.clear();
  
  // 2. Clear React state
  setNotifications([]);
  
  // 3. Clear from service
  service.clearAllNotifications();
  
  // 4. Explicitly clear all localStorage items
  if (typeof window !== 'undefined') {
    localStorage.removeItem('site_notifications');
    localStorage.removeItem('sk_notifications');
    // Set a flag that notifications were cleared
    localStorage.setItem('notifications_cleared', 'true');
  }
  
  // 5. Show success message
  toast.success('All notifications cleared');
  
  // 6. Force a re-render by triggering a storage event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
  }
}, [service]);
  const unreadCount = notifications.filter(n => !n.isRead).length;

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
        refresh,
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