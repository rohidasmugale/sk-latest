// lib/notificationService.ts

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "site" | "leave" | "task" | "system" | "approval";
  isRead: boolean;
  timestamp: string;
  metadata?: Record<string, unknown>; // ✅ changed from any to unknown
}

// Type for cached notification (used in getCachedNotifications)
interface CachedNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  notificationType?: string;
  clientName?: string;
  siteName?: string;
  location?: string;
  oldStatus?: string;
  newStatus?: string;
  priority?: string;
  createdAt?: string;
}

// Type for broadcast messages
type BroadcastMessage = {
  type: 'NEW_NOTIFICATION';
  notification: NotificationItem;
} | {
  type: 'MARK_AS_READ';
  notificationId: string;
} | {
  type: 'DELETE_NOTIFICATION';
  notificationId: string;
} | {
  type: 'MARK_ALL_READ';
} | {
  type: 'SITE_ADDED';
  siteName: string;
  clientName: string;
  notification: NotificationItem;
};

class NotificationService {
  private static instance: NotificationService;
  private audioContext: AudioContext | null = null;
  private notificationSound: HTMLAudioElement | null = null;
  private notificationInterval: NodeJS.Timeout | null = null;
  private lastNotificationTime: number = 0;
  private notificationCooldown = 10000; // 10 seconds cooldown
  private notifications: NotificationItem[] = [];
  private listeners: ((notifications: NotificationItem[]) => void)[] = [];
  private isInitialized = false;
  private broadcastChannel: BroadcastChannel | null = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private initialize() {
    if (this.isInitialized) return;
    
    try {
      // Initialize Web Audio API
      if (typeof window !== 'undefined') {
        // ✅ Fixed webkitAudioContext access without any
        const AudioContextCtor = window.AudioContext || 
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextCtor) {
          this.audioContext = new AudioContextCtor();
        }
        
        // Initialize Broadcast Channel for cross-tab communication
        if ('BroadcastChannel' in window) {
          this.broadcastChannel = new BroadcastChannel('notifications');
          this.broadcastChannel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
            const data = event.data;
            if (data.type === 'NEW_NOTIFICATION') {
              const newNotification = data.notification;
              this.notifications.unshift(newNotification);
              this.saveNotificationsToStorage();
              this.notifyListeners();
            } else if (data.type === 'MARK_AS_READ') {
              this.markAsRead(data.notificationId);
            } else if (data.type === 'DELETE_NOTIFICATION') {
              this.deleteNotification(data.notificationId);
            } else if (data.type === 'MARK_ALL_READ') {
              this.markAllAsRead();
            }
          };
        }
      }
      
      // Load notifications from localStorage
      this.loadNotificationsFromStorage();
      this.requestNotificationPermission();
      
      this.isInitialized = true;
      console.log('NotificationService initialized');
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
    }
  }

  public triggerGeofenceAlert(employeeName: string, siteName: string, distanceKm: number) {
    // Play sound
    this.playNotificationSound();
    // Add a system notification
    this.addNotification({
      title: `🚨 Employee Left Site`,
      message: `${employeeName} is ${(distanceKm * 1000).toFixed(0)}m away from ${siteName || 'the site'}.`,
      type: 'system',
      metadata: {
        employeeName,
        siteName,
        distanceKm,
        notificationType: 'geofence_breach',
        sound: true,
      }
    });
  }

  public triggerPersistentTaskNotification(taskTitle: string, taskId: string, assignedToName: string) {
    if (typeof window === 'undefined') return;

    const notification: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'> = {
      title: `📋 New Task Assigned: ${taskTitle}`,
      message: `You have been assigned a task by ${assignedToName}. Please complete it.`,
      type: 'task',
      metadata: {
        taskId,
        taskTitle,
        assignedToName,
        persistent: true,
        requiresCompletion: true,
      }
    };

    const newNotif = this.addNotification(notification);

    if (newNotif && typeof window !== 'undefined') {
      // ✅ changed let to const
      const interval: NodeJS.Timeout = setInterval(() => {
        const isCompleted = localStorage.getItem(`task_completed_${taskId}`) === 'true';
        if (isCompleted) {
          clearInterval(interval);
          this.markAsRead(newNotif.id);
          return;
        }
        const notif = this.getNotifications().find(n => n.id === newNotif.id);
        if (notif && notif.isRead) {
          clearInterval(interval);
        } else {
          this.playNotificationSound();
        }
      }, 5000);

      const updatedNotif = { ...newNotif, metadata: { ...newNotif.metadata, soundInterval: interval } };
      const index = this.notifications.findIndex(n => n.id === newNotif.id);
      if (index !== -1) this.notifications[index] = updatedNotif;
      this.saveNotificationsToStorage();
    }
  }

  public completeTaskNotification(taskId: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`task_completed_${taskId}`, 'true');
      const notif = this.notifications.find(n => n.metadata?.taskId === taskId);
      if (notif) {
        this.markAsRead(notif.id);
        if (notif.metadata?.soundInterval) {
          clearInterval(notif.metadata.soundInterval as NodeJS.Timeout);
          delete notif.metadata.soundInterval;
        }
      }
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.log('This browser does not support desktop notification');
      return false;
    }

    try {
      if (Notification.permission === 'granted') {
        return true;
      }

      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }

      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  addNotification(notification: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>): NotificationItem {
    this.initialize();
    
    const newNotification: NotificationItem = {
      id: `site_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: false,
      timestamp: new Date().toISOString(),
      metadata: notification.metadata
    };

    this.notifications.unshift(newNotification);
    this.saveNotificationsToStorage();
    this.notifyListeners();
    
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'NEW_NOTIFICATION',
        notification: newNotification
      } as BroadcastMessage);
    }
    
    this.showSystemNotification(newNotification.title, {
      body: newNotification.message,
      icon: '/favicon.ico',
      tag: newNotification.id
    }).catch(console.error);

    return newNotification;
  }

  notifySiteAddition(siteName: string, clientName: string, addedBy: string = 'Admin', metadata?: Record<string, unknown>) {
    const notification = this.addNotification({
      title: '🚀 New Site Added',
      message: `"${siteName}" has been added for client "${clientName}" by ${addedBy}`,
      type: 'site',
      metadata: { 
        siteName, 
        clientName, 
        addedBy, 
        notificationType: 'site_addition',
        ...metadata 
      }
    });
    
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'SITE_ADDED',
        siteName,
        clientName,
        notification
      } as BroadcastMessage);
    }
    
    return notification;
  }

  notifySiteUpdate(siteName: string, clientName: string, updatedBy: string = 'Admin', metadata?: Record<string, unknown>) {
    return this.addNotification({
      title: '✏️ Site Updated',
      message: `"${siteName}" for client "${clientName}" has been updated by ${updatedBy}`,
      type: 'site',
      metadata: { 
        siteName, 
        clientName, 
        updatedBy, 
        notificationType: 'site_update',
        ...metadata 
      }
    });
  }

  notifySiteDeletion(siteName: string, clientName: string, deletedBy: string = 'Admin', metadata?: Record<string, unknown>) {
    return this.addNotification({
      title: '🗑️ Site Deleted',
      message: `"${siteName}" for client "${clientName}" has been deleted by ${deletedBy}`,
      type: 'site',
      metadata: { 
        siteName, 
        clientName, 
        deletedBy, 
        notificationType: 'site_deletion',
        ...metadata 
      }
    });
  }

  notifySiteStatusChange(siteName: string, clientName: string, oldStatus: string, newStatus: string, changedBy: string = 'Admin') {
    return this.addNotification({
      title: '🔄 Site Status Changed',
      message: `"${siteName}" for "${clientName}" status changed from ${oldStatus} to ${newStatus} by ${changedBy}`,
      type: 'site',
      metadata: { 
        siteName, 
        clientName, 
        oldStatus, 
        newStatus, 
        changedBy,
        notificationType: 'site_status' 
      }
    });
  }

  async showSystemNotification(title: string, options?: NotificationOptions): Promise<Notification | null> {
    const now = Date.now();
    
    if (now - this.lastNotificationTime < this.notificationCooldown) {
      return null;
    }

    this.lastNotificationTime = now;
    this.playNotificationSound();

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          requireInteraction: false,
          silent: false,
          ...options
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        notification.onerror = (error) => {
          console.error('Notification error:', error);
        };

        setTimeout(() => {
          try {
            notification.close();
          } catch (error) {
            console.error('Error closing notification:', error);
          }
        }, 8000);

        this.showTabNotification(title, options?.body || '');
        return notification;
      } catch (error) {
        console.error('Error showing notification:', error);
        this.showTabNotification(title, options?.body || '');
      }
    } else {
      this.showTabNotification(title, options?.body || '');
    }

    return null;
  }

  private showTabNotification(title: string, body: string) {
    if (typeof document === 'undefined') return;

    if (document.hidden) {
      const originalTitle = document.title;
      const hasNotification = document.title.includes('🔔');
      
      if (!hasNotification) {
        document.title = `🔔 ${originalTitle}`;
        
        let blinkCount = 0;
        const maxBlinks = 4;
        
        const blinkInterval = setInterval(() => {
          document.title = document.title.includes('🔔') 
            ? originalTitle 
            : `🔔 ${originalTitle}`;
          
          blinkCount++;
          if (blinkCount >= maxBlinks * 2) {
            clearInterval(blinkInterval);
            document.title = originalTitle;
          }
        }, 500);
      }
    }
  }

  private playNotificationSound() {
    if (!this.audioContext) {
      this.playFallbackSound();
      return;
    }

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.2);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
      this.playFallbackSound();
    }
  }

  private playFallbackSound() {
    try {
      const audioContext = new (window.AudioContext || 
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('Failed to play fallback sound:', error);
    }
  }

  private saveNotificationsToStorage() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('site_notifications', JSON.stringify(this.notifications.slice(0, 100)));
      }
    } catch (error) {
      console.error('Failed to save notifications to storage:', error);
    }
  }

  private loadNotificationsFromStorage() {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('site_notifications');
        if (stored) {
          this.notifications = JSON.parse(stored);
        }
      }
    } catch (error) {
      console.error('Failed to load notifications from storage:', error);
      this.notifications = [];
    }
  }

  // Public API
  getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  getNotificationsByType(type: string): NotificationItem[] {
    return this.notifications.filter(n => n.type === type);
  }

  getUnreadNotifications(): NotificationItem[] {
    return this.notifications.filter(n => !n.isRead);
  }

  markAsRead(id: string): boolean {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications[index].isRead = true;
      this.saveNotificationsToStorage();
      this.notifyListeners();
      
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'MARK_AS_READ',
          notificationId: id
        } as BroadcastMessage);
      }
      return true;
    }
    return false;
  }

  markAllAsRead(): number {
    const unreadCount = this.getUnreadCount();
    this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
    this.saveNotificationsToStorage();
    this.notifyListeners();
    
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'MARK_ALL_READ'
      } as BroadcastMessage);
    }
    return unreadCount;
  }

  deleteNotification(id: string): boolean {
    const initialLength = this.notifications.length;
    this.notifications = this.notifications.filter(n => n.id !== id);
    if (this.notifications.length !== initialLength) {
      this.saveNotificationsToStorage();
      this.notifyListeners();
      
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'DELETE_NOTIFICATION',
          notificationId: id
        } as BroadcastMessage);
      }
      return true;
    }
    return false;
  }

 clearAllNotifications(): number {
  const count = this.notifications.length;
  this.notifications = [];
  this.saveNotificationsToStorage();
  this.notifyListeners();
  
  // ✅ Also clear from localStorage directly
  if (typeof window !== 'undefined') {
    localStorage.removeItem('site_notifications');
  }
  
  return count;
}

  clearByType(type: string): number {
    const initialLength = this.notifications.length;
    this.notifications = this.notifications.filter(n => n.type !== type);
    const removed = initialLength - this.notifications.length;
    if (removed > 0) {
      this.saveNotificationsToStorage();
      this.notifyListeners();
    }
    return removed;
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  getTotalCount(): number {
    return this.notifications.length;
  }

  subscribe(listener: (notifications: NotificationItem[]) => void): () => void {
    this.listeners.push(listener);
    listener([...this.notifications]);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const notificationsCopy = [...this.notifications];
    this.listeners.forEach(listener => {
      try {
        listener(notificationsCopy);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Setup broadcast listener
  setupBroadcastListener(callback: (data: BroadcastMessage) => void): () => void {
    const handleMessage = (event: MessageEvent<BroadcastMessage>) => {
      callback(event.data);
    };
    
    if (this.broadcastChannel) {
      this.broadcastChannel.addEventListener('message', handleMessage);
    }
    
    return () => {
      if (this.broadcastChannel) {
        this.broadcastChannel.removeEventListener('message', handleMessage);
      }
    };
  }

  // Test method
  addSampleNotifications() {
    this.addNotification({
      title: '🚀 New Site Added',
      message: 'City Mall has been added for client John Smith by Admin',
      type: 'site',
      metadata: { notificationType: 'site_addition' }
    });
    
    this.addNotification({
      title: '🔄 Site Status Changed',
      message: 'Office Complex status changed from inactive to active by Admin',
      type: 'site',
      metadata: { notificationType: 'site_status' }
    });
    
    this.addNotification({
      title: '🗑️ Site Deleted',
      message: 'Park Plaza for client ABC Corp has been deleted by Admin',
      type: 'site',
      metadata: { notificationType: 'site_deletion' }
    });
  }

  // ✅ Fixed return type
  getCachedNotifications(): CachedNotification[] {
    return this.notifications.map(notif => ({
      id: notif.id,
      title: notif.title,
      message: notif.message,
      time: notif.timestamp,
      type: notif.type === 'site' ? 'info' : 'info',
      read: notif.isRead,
      metadata: notif.metadata,
      notificationType: notif.metadata?.notificationType as string || 'site_update',
      clientName: notif.metadata?.clientName as string,
      siteName: notif.metadata?.siteName as string,
      location: notif.metadata?.location as string,
      oldStatus: notif.metadata?.oldStatus as string,
      newStatus: notif.metadata?.newStatus as string,
      priority: 'medium',
      createdAt: notif.timestamp
    }));
  }

  clearCachedNotifications(): void {
    this.clearAllNotifications();
  }

  startPeriodicCheck(checkFunction: () => Promise<void>, interval = 30000) {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }
    
    this.notificationInterval = setInterval(async () => {
      try {
        await checkFunction();
      } catch (error) {
        console.error('Error in periodic check:', error);
      }
    }, interval);
  }

  stopPeriodicCheck() {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }
  }

  destroy() {
    this.stopPeriodicCheck();
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    this.listeners = [];
    this.isInitialized = false;
  }
}

export default NotificationService.getInstance();