// app/superadmin/notifications/page.tsx
"use client";

import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { DashboardSidebar } from "@/components/shared/DashboardSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Trash2, Phone, Mail, Calendar, Eye, Volume2, VolumeX, Settings, Building, RefreshCw, CheckCircle, Clock, AlertCircle, Users, Package, AlertTriangle, Cpu, ShoppingBag, FileText, User, CalendarDays, Shield, Crown, XCircle, ChevronDown, Sparkles, Zap, Filter, ExternalLink, Star, TrendingUp, Activity, BellRing, MessageSquare, AlertOctagon, Globe, FilterX } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import notificationService from "@/lib/notificationService";
import { siteService, Site } from "@/services/SiteService";
import taskService, { Task, Assignee } from "@/services/TaskService";
import { inventoryService, FrontendInventoryItem } from "@/services/inventoryService";
import { machineService, FrontendMachine } from "@/services/machineService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

// Interface for real API response
interface ApiNotification {
  _id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "info" | "urgent";
  priority: "low" | "medium" | "high";
  read: boolean;
  metadata?: {
    siteId?: string;
    clientId?: string;
    taskId?: string;
    inventoryItemId?: string;
    machineId?: string;
    leaveId?: string;
    [key: string]: any;
  };
  notificationType?: string;
  createdAt: string;
  updatedAt: string;
}

interface Communication {
  _id: string;
  clientName: string;
  clientId: {
    _id: string;
    name: string;
    company: string;
    email: string;
  } | string;
  type: "call" | "email" | "meeting" | "demo";
  date: string;
  notes: string;
  followUpRequired: boolean;
  followUpDate?: string;
  createdAt: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "success" | "warning" | "info" | "urgent";
  read: boolean;
  followUpDate?: string;
  communicationType?: string;
  clientName?: string;
  notes?: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
  siteName?: string;
  location?: string;
  oldStatus?: string;
  newStatus?: string;
  taskTitle?: string;
  taskAssignee?: string;
  taskPriority?: string;
  taskStatus?: string;
  notificationType?: "site_addition" | "site_status" | "site_deletion" | "site_update" | "communication_followup" | "task_creation" | "task_assignment" | "task_completion" | "task_update" | "task_overdue" | "inventory_low_stock" | "inventory_critical" | "inventory_out_of_stock" | "machine_maintenance" | "machine_breakdown" | "leave_request" | "leave_approved" | "leave_rejected" | "leave_pending" | "leave_cancelled";
  itemSku?: string;
  itemName?: string;
  currentQuantity?: number;
  reorderLevel?: number;
  department?: string;
  supplier?: string;
  machineName?: string;
  machineModel?: string;
  machineStatus?: string;
  nextMaintenanceDate?: string;
  employeeName?: string;
  employeeId?: string;
  leaveType?: string;
  leaveFromDate?: string;
  leaveToDate?: string;
  leaveTotalDays?: number;
  leaveStatus?: string;
  leaveReason?: string;
  leaveRequestType?: string;
  leaveDepartment?: string;
  leaveApprovedBy?: string;
  leaveRejectedBy?: string;
  metadata?: any;
}

interface StoredNotification extends Notification {
  siteId?: string;
  clientId?: string;
  isLocal?: boolean;
}

interface NotificationSettings {
  desktopNotifications: boolean;
  soundNotifications: boolean;
  soundVolume: number;
  notificationFrequency: 'realtime' | '5min' | '15min' | '30min';
  showOverdue: boolean;
  showToday: boolean;
  showUpcoming: boolean;
  showSiteAdditions: boolean;
  showSiteStatusChanges: boolean;
  showSiteDeletions: boolean;
  showSiteUpdates: boolean;
  showTaskCreations: boolean;
  showTaskAssignments: boolean;
  showTaskCompletions: boolean;
  showTaskUpdates: boolean;
  showOverdueTasks: boolean;
  showInventoryLowStock: boolean;
  showInventoryCritical: boolean;
  showInventoryOutOfStock: boolean;
  showMachineMaintenance: boolean;
  showMachineBreakdown: boolean;
  showLeaveRequests: boolean;
  showLeaveApproved: boolean;
  showLeaveRejected: boolean;
  showLeavePending: boolean;
  showLeaveCancelled: boolean;
}

interface SiteFilter {
  id: string;
  name: string;
}

// Enhanced API functions with robust error handling
const api = {
  async getCommunications() {
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`${API_URL}/crm/communications?t=${timestamp}`);
      if (!res.ok) {
        if (res.status === 404) {
          console.warn('Communications endpoint not found');
          return { success: true, data: [] };
        }
        throw new Error(`Failed to fetch communications: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.warn('Communications API failed:', error);
      return { success: false, data: [], error: error.message };
    }
  },

  async getNotifications() {
    try {
      const res = await fetch(`${API_URL}/notifications`);
      if (!res.ok) {
        if (res.status === 404) {
          console.warn('Notifications endpoint not found');
          return { success: true, data: [] };
        }
        throw new Error(`Failed to fetch notifications: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.warn('Notifications API failed:', error);
      return { success: false, data: [], error: error.message };
    }
  },

  async getUnreadNotifications() {
    try {
      const res = await fetch(`${API_URL}/notifications/unread`);
      if (!res.ok) {
        if (res.status === 404) return { success: true, data: [] };
        throw new Error(`Failed to fetch unread notifications: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.warn('Unread notifications API failed:', error);
      return { success: false, data: [], error: error.message };
    }
  },

  async markNotificationAsRead(id: string) {
    try {
      const res = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        if (res.status === 404) {
          console.warn(`Notification ${id} not found for mark as read`);
          return { success: true };
        }
        throw new Error(`Failed to mark notification as read: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.warn('Mark as read API failed:', error);
      return { success: false, error: error.message };
    }
  },

  async deleteNotification(id: string) {
    try {
      const res = await fetch(`${API_URL}/notifications/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        if (res.status === 404) {
          console.warn(`Notification ${id} not found for deletion`);
          return { success: true };
        }
        throw new Error(`Failed to delete notification: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.warn('Delete notification API failed:', error);
      return { success: false, error: error.message };
    }
  },

  async markAllNotificationsAsRead() {
    try {
      const res = await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        if (res.status === 404) return { success: true };
        throw new Error(`Failed to mark all notifications as read: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.warn('Mark all as read API failed:', error);
      return { success: false, error: error.message };
    }
  },

  async createNotification(data: Partial<Notification>) {
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(`Failed to create notification: ${res.status}`);
      return res.json();
    } catch (error) {
      console.warn('Create notification API failed:', error);
      return { success: false, error: error.message };
    }
  },

  async getRecentSiteActivities() {
    try {
      const res = await fetch(`${API_URL}/sites/recent-activities`);
      if (!res.ok) {
        if (res.status === 404) return { success: true, data: [] };
        throw new Error(`Failed to fetch recent site activities: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.warn('Recent site activities API failed:', error);
      return { success: false, data: [], error: error.message };
    }
  },

  async getRecentTaskActivities() {
    try {
      const res = await fetch(`${API_URL}/tasks/recent-activities`);
      if (!res.ok) {
        if (res.status === 404) return { success: true, data: [] };
        throw new Error(`Failed to fetch recent task activities: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.warn('Recent task activities API failed:', error);
      return { success: false, data: [], error: error.message };
    }
  },

  async getLowStockItems() {
    try {
      const res = await fetch(`${API_URL}/inventory/low-stock`);
      if (!res.ok) {
        if (res.status === 404 || res.status === 500) {
          console.warn('Low stock endpoint not available');
          return { success: true, data: [] };
        }
        throw new Error(`Failed to fetch low stock items: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.warn('Low stock API failed:', error);
      return { success: true, data: [] };
    }
  },

  async getCriticalStockItems() {
    try {
      const res = await fetch(`${API_URL}/inventory/critical-stock`);
      if (!res.ok) {
        if (res.status === 404 || res.status === 500) {
          console.warn('Critical stock endpoint not available');
          return { success: true, data: [] };
        }
        throw new Error(`Failed to fetch critical stock items: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.warn('Critical stock API failed:', error);
      return { success: true, data: [] };
    }
  },

  async getOutOfStockItems() {
    try {
      const res = await fetch(`${API_URL}/inventory/out-of-stock`);
      if (!res.ok) {
        if (res.status === 404 || res.status === 500) {
          console.warn('Out of stock endpoint not available');
          return { success: true, data: [] };
        }
        throw new Error(`Failed to fetch out of stock items: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.warn('Out of stock API failed:', error);
      return { success: true, data: [] };
    }
  },

  async getMachineMaintenanceAlerts() {
    try {
      const res = await fetch(`${API_URL}/machines/maintenance-alerts`);
      if (!res.ok) {
        if (res.status === 404 || res.status === 500) {
          console.warn('Machine maintenance alerts endpoint not available');
          return { success: true, data: [] };
        }
        throw new Error(`Failed to fetch machine maintenance alerts: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.warn('Machine maintenance alerts API failed:', error);
      return { success: true, data: [] };
    }
  },

  async getMachineBreakdownAlerts() {
    try {
      const res = await fetch(`${API_URL}/machines/breakdown-alerts`);
      if (!res.ok) {
        if (res.status === 404 || res.status === 500) {
          console.warn('Machine breakdown alerts endpoint not available');
          return { success: true, data: [] };
        }
        throw new Error(`Failed to fetch machine breakdown alerts: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.warn('Machine breakdown alerts API failed:', error);
      return { success: true, data: [] };
    }
  },

  async getLeaveRequests() {
    try {
      const res = await fetch(`${API_URL}/leaves/recent-requests`);
      if (!res.ok) {
        if (res.status === 404) {
          console.warn('Leave requests endpoint not found');
          return { success: true, data: [] };
        }
        throw new Error(`Failed to fetch leave requests: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.warn('Leave requests API failed:', error);
      return { success: false, data: [], error: error.message };
    }
  },

  async getLeaveStatusUpdates() {
    try {
      const res = await fetch(`${API_URL}/leaves/recent-updates`);
      if (!res.ok) {
        if (res.status === 404) {
          console.warn('Leave status updates endpoint not found');
          return { success: true, data: [] };
        }
        throw new Error(`Failed to fetch leave status updates: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.warn('Leave status updates API failed:', error);
      return { success: false, data: [], error: error.message };
    }
  },

  async getMachineStatistics() {
    try {
      const res = await fetch(`${API_URL}/machines/statistics`);
      if (!res.ok) {
        if (res.status === 404 || res.status === 500) {
          console.warn('Machine statistics endpoint not available');
          return { success: true, data: null };
        }
        throw new Error(`Failed to fetch machine statistics: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.warn('Machine statistics API failed:', error);
      return { success: true, data: null };
    }
  },

  async getInventoryStatistics() {
    try {
      const res = await fetch(`${API_URL}/inventory/statistics`);
      if (!res.ok) {
        if (res.status === 404 || res.status === 500) {
          console.warn('Inventory statistics endpoint not available');
          return { success: true, data: null };
        }
        throw new Error(`Failed to fetch inventory statistics: ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.warn('Inventory statistics API failed:', error);
      return { success: true, data: null };
    }
  }
};

// =========== LOCAL STORAGE HELPERS ===========
const NOTIFICATION_STORAGE_KEY = 'crm_notifications_read_status';

const getReadStatusFromStorage = (): Record<string, boolean> => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading notification status from storage:', error);
    return {};
  }
};

const saveReadStatusToStorage = (status: Record<string, boolean>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(status));
  } catch (error) {
    console.error('Error saving notification status to storage:', error);
  }
};

const markNotificationAsReadInStorage = (id: string) => {
  const status = getReadStatusFromStorage();
  status[id] = true;
  saveReadStatusToStorage(status);
  return status;
};

const markNotificationAsUnreadInStorage = (id: string) => {
  const status = getReadStatusFromStorage();
  status[id] = false;
  saveReadStatusToStorage(status);
  return status;
};

const clearAllReadStatusFromStorage = () => {
  saveReadStatusToStorage({});
};

const getNotificationReadStatus = (id: string): boolean => {
  const status = getReadStatusFromStorage();
  return status[id] || false;
};

// Helper function for formatTimeAgo
const formatTimeAgoHelper = (dateString: string) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Recently";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    return "Recently";
  }
};

// Fetch all sites from API
const fetchSites = async (): Promise<Site[]> => {
  try {
    const token = localStorage.getItem('auth_token') || 
                  localStorage.getItem('token') ||
                  sessionStorage.getItem('auth_token');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/sites`, {
      headers,
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Unauthorized to fetch sites');
        return [];
      }
      throw new Error(`http error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    let sites: any[] = [];
    
    if (Array.isArray(data)) {
      sites = data;
    } else if (data.data && Array.isArray(data.data)) {
      sites = data.data;
    } else if (data.sites && Array.isArray(data.sites)) {
      sites = data.sites;
    } else if (data.success && data.data) {
      sites = Array.isArray(data.data) ? data.data : [];
    }
    
    return sites.map(site => ({
      _id: site._id || site.id,
      name: site.name || 'Unnamed Site',
      clientName: site.clientName || site.client?.name || 'Unknown Client',
      location: site.location || 'Unknown Location',
      areaSqft: site.areaSqft || site.area || 0,
      contractValue: site.contractValue || site.value || 0,
      services: Array.isArray(site.services) ? site.services : 
                (site.service ? [site.service] : []),
      staffDeployment: Array.isArray(site.staffDeployment) ? site.staffDeployment : 
                      (site.staff ? site.staff : []),
      status: (site.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
      addedBy: site.addedBy || site.createdBy,
      addedByRole: site.addedByRole || site.createdByRole,
      createdAt: site.createdAt || site.createdDate || new Date().toISOString(),
      updatedAt: site.updatedAt || site.updatedDate || new Date().toISOString(),
      clientId: site.clientId || site.client?._id
    }));
  } catch (error) {
    console.error('Error fetching sites:', error);
    return [];
  }
};

// Fetch notifications from backend API
const fetchApiNotifications = async (): Promise<StoredNotification[]> => {
  try {
    console.log('Fetching notifications from API...');
    const response = await api.getNotifications();
    
    if (response.success && Array.isArray(response.data)) {
      const apiNotifications: StoredNotification[] = response.data.map((notification: ApiNotification) => ({
        id: notification._id,
        title: notification.title || "Notification",
        message: notification.message || "",
        time: formatTimeAgoHelper(notification.createdAt),
        type: notification.type || "info",
        read: notification.read || false,
        priority: notification.priority || "medium",
        createdAt: notification.createdAt,
        notificationType: notification.notificationType as any,
        ...notification.metadata,
        isLocal: false
      }));
      
      console.log(`Fetched ${apiNotifications.length} notifications from API`);
      return apiNotifications;
    }
    
    console.log('No notifications found in API response');
    return [];
  } catch (error) {
    console.error('Error fetching notifications from API:', error);
    return [];
  }
};

// Fetch follow-up notifications
const fetchFollowUpNotifications = async (): Promise<StoredNotification[]> => {
  try {
    console.log('Fetching follow-up notifications...');
    const result = await api.getCommunications();
    
    if (!result.success || !Array.isArray(result.data)) {
      return [];
    }
    
    const communications = result.data as Communication[];
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    const followUpNotifications = communications
      .filter(comm => comm.followUpRequired && comm.followUpDate)
      .map(comm => {
        const followUpDate = comm.followUpDate || "";
        let followUpDateObj: Date;
        try {
          followUpDateObj = new Date(followUpDate);
          if (isNaN(followUpDateObj.getTime())) {
            followUpDateObj = new Date();
          }
        } catch {
          followUpDateObj = new Date();
        }
        
        const isToday = followUpDateObj.toDateString() === now.toDateString();
        const isOverdue = followUpDateObj < now && !isToday;
        const isUrgent = followUpDateObj.getTime() - now.getTime() <= 2 * 60 * 60 * 1000 && followUpDateObj.getTime() > now.getTime();
        
        let type: "success" | "warning" | "info" | "urgent" = "info";
        let title = "";
        let priority: "low" | "medium" | "high" = "medium";

        if (isOverdue) {
          type = "warning";
          title = "⚠️ Follow-up Overdue";
          priority = "high";
        } else if (isUrgent) {
          type = "urgent";
          title = "🚨 Urgent Follow-up";
          priority = "high";
        } else if (isToday) {
          type = "success";
          title = "✓ Follow-up Today";
          priority = "medium";
        } else {
          type = "info";
          title = "📅 Follow-up Scheduled";
          priority = "low";
        }

        const formattedDate = followUpDateObj.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        return {
          id: `followup_${comm._id}`,
          title: `${title} - ${comm.type?.charAt(0)?.toUpperCase() + comm.type?.slice(1) || 'Communication'}`,
          message: `Follow-up with ${comm.clientName || 'Client'} for ${comm.type || 'communication'}`,
          time: formatTimeAgoHelper(comm.createdAt),
          type,
          read: getNotificationReadStatus(`followup_${comm._id}`),
          followUpDate: formattedDate,
          communicationType: comm.type,
          clientName: comm.clientName,
          notes: comm.notes,
          priority,
          createdAt: comm.createdAt,
          notificationType: "communication_followup",
          isLocal: true
        };
      });
    
    console.log(`Generated ${followUpNotifications.length} follow-up notifications`);
    return followUpNotifications;
  } catch (error) {
    console.error('Error fetching follow-up notifications:', error);
    return [];
  }
};

// Fetch site activity notifications
const fetchSiteActivityNotifications = async (): Promise<StoredNotification[]> => {
  try {
    console.log('Fetching site activity notifications...');
    const response = await api.getRecentSiteActivities();
    
    if (!response.success || !Array.isArray(response.data)) {
      // Fallback to service call
      console.log('Using site service fallback...');
      try {
        const sites = await siteService.getAllSites();
        return generateSiteNotificationsFromData(sites);
      } catch (serviceError) {
        console.error('Site service fallback failed:', serviceError);
        return [];
      }
    }
    
    const siteActivities = response.data;
    const siteNotifications: StoredNotification[] = [];
    
    siteActivities.forEach((activity: any) => {
      const notificationId = `site_${activity.type}_${activity.siteId}_${new Date(activity.timestamp).getTime()}`;
      const activityDate = new Date(activity.timestamp);
      
      let title = '';
      let message = '';
      let type: "success" | "warning" | "info" | "urgent" = "info";
      let priority: "low" | "medium" | "high" = "medium";
      
      switch (activity.type) {
        case 'created':
          title = '🚀 New Site Added';
          message = `"${activity.siteName}" has been added`;
          type = 'success';
          priority = 'medium';
          break;
        case 'updated':
          title = '✏️ Site Updated';
          message = `"${activity.siteName}" has been updated`;
          type = 'info';
          priority = 'low';
          break;
        case 'status_changed':
          title = '🔄 Site Status Changed';
          message = `"${activity.siteName}" status changed from "${activity.oldStatus}" to "${activity.newStatus}"`;
          type = 'warning';
          priority = 'medium';
          break;
        case 'deleted':
          title = '🗑️ Site Deleted';
          message = `"${activity.siteName}" has been deleted`;
          type = 'warning';
          priority = 'high';
          break;
        default:
          title = '📝 Site Activity';
          message = `Activity on "${activity.siteName}"`;
          type = 'info';
          priority = 'low';
      }
      
      siteNotifications.push({
        id: notificationId,
        title,
        message,
        time: formatTimeAgoHelper(activity.timestamp),
        type,
        read: getNotificationReadStatus(notificationId),
        priority,
        createdAt: activity.timestamp,
        siteName: activity.siteName,
        clientName: activity.clientName,
        location: activity.location,
        oldStatus: activity.oldStatus,
        newStatus: activity.newStatus,
        notificationType: `site_${activity.type.replace('_changed', '')}` as any,
        siteId: activity.siteId,
        clientId: activity.clientId,
        isLocal: true
      });
    });
    
    console.log(`Generated ${siteNotifications.length} site activity notifications`);
    return siteNotifications;
  } catch (error) {
    console.error('Error fetching site activity notifications:', error);
    // Fallback to service
    try {
      const sites = await siteService.getAllSites();
      return generateSiteNotificationsFromData(sites);
    } catch (fallbackError) {
      console.error('Site service fallback failed:', fallbackError);
      return [];
    }
  }
};

// Helper to generate site notifications from site data
const generateSiteNotificationsFromData = (sites: Site[]): StoredNotification[] => {
  const siteNotifications: StoredNotification[] = [];
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  sites.forEach(site => {
    try {
      const siteCreatedAt = new Date(site.createdAt || site.updatedAt || now);
      
      if (siteCreatedAt > oneWeekAgo) {
        const notificationId = `site_addition_${site._id}`;
        
        siteNotifications.push({
          id: notificationId,
          title: '🚀 New Site Added',
          message: `"${site.name}" has been added for client "${site.clientName}"`,
          time: formatTimeAgoHelper(siteCreatedAt.toISOString()),
          type: 'success',
          read: getNotificationReadStatus(notificationId),
          priority: 'medium',
          createdAt: siteCreatedAt.toISOString(),
          siteName: site.name,
          clientName: site.clientName,
          location: site.location,
          notificationType: 'site_addition',
          siteId: site._id,
          clientId: site.clientId,
          isLocal: true
        });
      }
    } catch (error) {
      console.warn('Error processing site for notification:', error);
    }
  });
  
  return siteNotifications;
};

// Fetch task activity notifications
const fetchTaskActivityNotifications = async (): Promise<StoredNotification[]> => {
  try {
    console.log('Fetching task activity notifications...');
    const response = await api.getRecentTaskActivities();
    
    if (!response.success || !Array.isArray(response.data)) {
      // Fallback to service call
      console.log('Using task service fallback...');
      try {
        const tasks = await taskService.getAllTasks();
        return generateTaskNotificationsFromData(tasks);
      } catch (serviceError) {
        console.error('Task service fallback failed:', serviceError);
        return [];
      }
    }
    
    const taskActivities = response.data;
    const taskNotifications: StoredNotification[] = [];
    const now = new Date();
    
    taskActivities.forEach((activity: any) => {
      const notificationId = `task_${activity.type}_${activity.taskId}_${new Date(activity.timestamp).getTime()}`;
      const activityDate = new Date(activity.timestamp);
      
      let title = '';
      let message = '';
      let type: "success" | "warning" | "info" | "urgent" = "info";
      let priority: "low" | "medium" | "high" = "medium";
      
      switch (activity.type) {
        case 'created':
          title = '📋 New Task Created';
          message = `"${activity.taskTitle}" has been created`;
          type = 'info';
          priority = 'medium';
          break;
        case 'assigned':
          title = '👤 Task Assigned';
          message = `"${activity.taskTitle}" has been assigned to ${activity.assignedTo}`;
          type = 'success';
          priority = 'medium';
          break;
        case 'completed':
          title = '✅ Task Completed';
          message = `"${activity.taskTitle}" has been completed`;
          type = 'success';
          priority = 'medium';
          break;
        case 'updated':
          title = '📝 Task Updated';
          message = `"${activity.taskTitle}" has been updated`;
          type = 'info';
          priority = 'low';
          break;
        case 'overdue':
          title = '⏰ Task Overdue';
          message = `"${activity.taskTitle}" is overdue`;
          type = 'warning';
          priority = 'high';
          break;
        default:
          title = '📝 Task Activity';
          message = `Activity on "${activity.taskTitle}"`;
          type = 'info';
          priority = 'low';
      }
      
      taskNotifications.push({
        id: notificationId,
        title,
        message,
        time: formatTimeAgoHelper(activity.timestamp),
        type,
        read: getNotificationReadStatus(notificationId),
        priority,
        createdAt: activity.timestamp,
        taskTitle: activity.taskTitle,
        taskAssignee: activity.assignedTo,
        taskPriority: activity.priority,
        taskStatus: activity.status,
        siteName: activity.siteName,
        clientName: activity.clientName,
        notificationType: `task_${activity.type}` as any,
        isLocal: true
      });
    });
    
    console.log(`Generated ${taskNotifications.length} task activity notifications`);
    return taskNotifications;
  } catch (error) {
    console.error('Error fetching task activity notifications:', error);
    // Fallback to service
    try {
      const tasks = await taskService.getAllTasks();
      return generateTaskNotificationsFromData(tasks);
    } catch (fallbackError) {
      console.error('Task service fallback failed:', fallbackError);
      return [];
    }
  }
};

// Helper to generate task notifications from task data
const generateTaskNotificationsFromData = (tasks: Task[]): StoredNotification[] => {
  const taskNotifications: StoredNotification[] = [];
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  
  tasks.forEach(task => {
    try {
      const taskCreatedAt = new Date(task.createdAt || now);
      
      if (taskCreatedAt > threeDaysAgo) {
        const notificationId = `task_creation_${task._id}`;
        
        taskNotifications.push({
          id: notificationId,
          title: '📋 New Task Created',
          message: `"${task.title}" has been created`,
          time: formatTimeAgoHelper(taskCreatedAt.toISOString()),
          type: 'info',
          read: getNotificationReadStatus(notificationId),
          priority: 'medium',
          createdAt: taskCreatedAt.toISOString(),
          taskTitle: task.title,
          taskAssignee: task.assignedToName,
          taskPriority: task.priority,
          taskStatus: task.status,
          siteName: task.siteName,
          clientName: task.clientName,
          notificationType: 'task_creation',
          isLocal: true
        });
      }
    } catch (error) {
      console.warn('Error processing task for notification:', error);
    }
  });
  
  return taskNotifications;
};

// Fetch inventory notifications
const fetchInventoryNotifications = async (): Promise<StoredNotification[]> => {
  try {
    console.log('Fetching inventory notifications...');
    
    let lowStockItems: any[] = [];
    let criticalStockItems: any[] = [];
    let outOfStockItems: any[] = [];
    
    // Try to fetch from APIs with graceful degradation
    try {
      const lowStockResponse = await api.getLowStockItems();
      if (lowStockResponse.success && Array.isArray(lowStockResponse.data)) {
        lowStockItems = lowStockResponse.data;
      }
    } catch (error) {
      console.log('Low stock API call failed:', error);
    }
    
    try {
      const criticalResponse = await api.getCriticalStockItems();
      if (criticalResponse.success && Array.isArray(criticalResponse.data)) {
        criticalStockItems = criticalResponse.data;
      }
    } catch (error) {
      console.log('Critical stock API call failed:', error);
    }
    
    try {
      const outOfStockResponse = await api.getOutOfStockItems();
      if (outOfStockResponse.success && Array.isArray(outOfStockResponse.data)) {
        outOfStockItems = outOfStockResponse.data;
      }
    } catch (error) {
      console.log('Out of stock API call failed:', error);
    }
    
    // If all APIs returned empty or failed, use service fallback
    if (lowStockItems.length === 0 && criticalStockItems.length === 0 && outOfStockItems.length === 0) {
      console.log('Using inventory service fallback...');
      try {
        const items = await inventoryService.getItems();
        return generateInventoryNotificationsFromData(items);
      } catch (serviceError) {
        console.error('Inventory service fallback failed:', serviceError);
        return [];
      }
    }
    
    const inventoryNotifications: StoredNotification[] = [];
    const now = new Date();
    
    // Process low stock items
    lowStockItems.forEach((item: any) => {
      try {
        const notificationId = `inventory_low_stock_${item._id || item.id}_${now.getTime()}`;
        
        inventoryNotifications.push({
          id: notificationId,
          title: '📦 Low Stock Alert',
          message: `"${item.name || 'Item'}" (${item.sku || 'N/A'}) is running low. Current: ${item.quantity || 0}, Reorder: ${item.reorderLevel || 0}`,
          time: formatTimeAgoHelper(item.updatedAt || now.toISOString()),
          type: 'warning',
          read: getNotificationReadStatus(notificationId),
          priority: 'medium',
          createdAt: item.updatedAt || now.toISOString(),
          notificationType: 'inventory_low_stock',
          itemSku: item.sku,
          itemName: item.name,
          currentQuantity: item.quantity,
          reorderLevel: item.reorderLevel,
          department: item.department,
          supplier: item.supplier,
          siteName: item.site,
          isLocal: true
        });
      } catch (error) {
        console.warn('Error processing low stock item:', error);
      }
    });
    
    // Process critical stock items
    criticalStockItems.forEach((item: any) => {
      try {
        const notificationId = `inventory_critical_${item._id || item.id}_${now.getTime()}`;
        
        inventoryNotifications.push({
          id: notificationId,
          title: '⚠️ Critical Stock Level',
          message: `"${item.name || 'Item'}" (${item.sku || 'N/A'}) is at critical level. Current: ${item.quantity || 0}, Reorder: ${item.reorderLevel || 0}`,
          time: formatTimeAgoHelper(item.updatedAt || now.toISOString()),
          type: 'warning',
          read: getNotificationReadStatus(notificationId),
          priority: 'high',
          createdAt: item.updatedAt || now.toISOString(),
          notificationType: 'inventory_critical',
          itemSku: item.sku,
          itemName: item.name,
          currentQuantity: item.quantity,
          reorderLevel: item.reorderLevel,
          department: item.department,
          supplier: item.supplier,
          siteName: item.site,
          isLocal: true
        });
      } catch (error) {
        console.warn('Error processing critical stock item:', error);
      }
    });
    
    // Process out of stock items
    outOfStockItems.forEach((item: any) => {
      try {
        const notificationId = `inventory_out_of_stock_${item._id || item.id}_${now.getTime()}`;
        
        inventoryNotifications.push({
          id: notificationId,
          title: '🛑 OUT OF STOCK',
          message: `"${item.name || 'Item'}" (${item.sku || 'N/A'}) is out of stock. Reorder: ${item.reorderLevel || 0}`,
          time: formatTimeAgoHelper(item.updatedAt || now.toISOString()),
          type: 'urgent',
          read: getNotificationReadStatus(notificationId),
          priority: 'high',
          createdAt: item.updatedAt || now.toISOString(),
          notificationType: 'inventory_out_of_stock',
          itemSku: item.sku,
          itemName: item.name,
          currentQuantity: item.quantity,
          reorderLevel: item.reorderLevel,
          department: item.department,
          supplier: item.supplier,
          siteName: item.site,
          isLocal: true
        });
      } catch (error) {
        console.warn('Error processing out of stock item:', error);
      }
    });
    
    console.log(`Generated ${inventoryNotifications.length} inventory notifications`);
    return inventoryNotifications;
  } catch (error) {
    console.error('Error in fetchInventoryNotifications:', error);
    return [];
  }
};

// Helper to generate inventory notifications from item data
const generateInventoryNotificationsFromData = (items: FrontendInventoryItem[]): StoredNotification[] => {
  const inventoryNotifications: StoredNotification[] = [];
  const now = new Date();
  
  items.forEach((item: FrontendInventoryItem) => {
    try {
      if (item.quantity <= item.reorderLevel) {
        const isCritical = item.quantity <= Math.floor(item.reorderLevel * 0.3);
        const isOutOfStock = item.quantity === 0;
        
        let notificationType: "inventory_low_stock" | "inventory_critical" | "inventory_out_of_stock";
        let title: string;
        let type: "success" | "warning" | "info" | "urgent";
        let priority: "low" | "medium" | "high";
        
        if (isOutOfStock) {
          notificationType = 'inventory_out_of_stock';
          title = '🛑 OUT OF STOCK';
          type = 'urgent';
          priority = 'high';
        } else if (isCritical) {
          notificationType = 'inventory_critical';
          title = '⚠️ Critical Stock Level';
          type = 'warning';
          priority = 'high';
        } else {
          notificationType = 'inventory_low_stock';
          title = '📦 Low Stock Alert';
          type = 'warning';
          priority = 'medium';
        }
        
        const notificationId = `inventory_${notificationType}_${item.id}_${now.getTime()}`;
        
        inventoryNotifications.push({
          id: notificationId,
          title: title,
          message: `"${item.name}" (${item.sku}) is running low. Current: ${item.quantity}, Reorder: ${item.reorderLevel}`,
          time: formatTimeAgoHelper(now.toISOString()),
          type,
          read: getNotificationReadStatus(notificationId),
          priority,
          createdAt: now.toISOString(),
          notificationType,
          itemSku: item.sku,
          itemName: item.name,
          currentQuantity: item.quantity,
          reorderLevel: item.reorderLevel,
          department: item.department,
          supplier: item.supplier,
          siteName: item.site,
          isLocal: true
        });
      }
    } catch (error) {
      console.warn('Error processing inventory item for notification:', error);
    }
  });
  
  return inventoryNotifications;
};

// Fetch machine notifications
const fetchMachineNotifications = async (): Promise<StoredNotification[]> => {
  try {
    console.log('Fetching machine notifications...');
    
    let maintenanceAlerts: any[] = [];
    let breakdownAlerts: any[] = [];
    
    // Try APIs with graceful degradation
    try {
      const maintenanceResponse = await api.getMachineMaintenanceAlerts();
      if (maintenanceResponse.success && Array.isArray(maintenanceResponse.data)) {
        maintenanceAlerts = maintenanceResponse.data;
      }
    } catch (error) {
      console.log('Machine maintenance alerts API call failed:', error);
    }
    
    try {
      const breakdownResponse = await api.getMachineBreakdownAlerts();
      if (breakdownResponse.success && Array.isArray(breakdownResponse.data)) {
        breakdownAlerts = breakdownResponse.data;
      }
    } catch (error) {
      console.log('Machine breakdown alerts API call failed:', error);
    }
    
    // If APIs returned empty or failed, use service fallback
    if (maintenanceAlerts.length === 0 && breakdownAlerts.length === 0) {
      console.log('Using machine service fallback...');
      try {
        const machines = await machineService.getMachines();
        return generateMachineNotificationsFromData(machines);
      } catch (serviceError) {
        console.error('Machine service fallback failed:', serviceError);
        return [];
      }
    }
    
    const machineNotifications: StoredNotification[] = [];
    const now = new Date();
    
    // Process maintenance alerts
    maintenanceAlerts.forEach((alert: any) => {
      try {
        const notificationId = `machine_maintenance_${alert.machineId}_${now.getTime()}`;
        
        machineNotifications.push({
          id: notificationId,
          title: '🔧 Machine Maintenance Required',
          message: `"${alert.machineName || 'Machine'}" requires maintenance. Next due: ${alert.nextMaintenanceDate ? new Date(alert.nextMaintenanceDate).toLocaleDateString() : 'Soon'}`,
          time: formatTimeAgoHelper(alert.updatedAt || now.toISOString()),
          type: 'warning',
          read: getNotificationReadStatus(notificationId),
          priority: 'medium',
          createdAt: alert.updatedAt || now.toISOString(),
          notificationType: 'machine_maintenance',
          machineName: alert.machineName,
          machineModel: alert.model,
          machineStatus: alert.status,
          nextMaintenanceDate: alert.nextMaintenanceDate,
          isLocal: true
        });
      } catch (error) {
        console.warn('Error processing maintenance alert:', error);
      }
    });
    
    // Process breakdown alerts
    breakdownAlerts.forEach((alert: any) => {
      try {
        const notificationId = `machine_breakdown_${alert.machineId}_${now.getTime()}`;
        
        machineNotifications.push({
          id: notificationId,
          title: '🛑 Machine Breakdown',
          message: `"${alert.machineName || 'Machine'}" is out of service and requires attention`,
          time: formatTimeAgoHelper(alert.updatedAt || now.toISOString()),
          type: 'urgent',
          read: getNotificationReadStatus(notificationId),
          priority: 'high',
          createdAt: alert.updatedAt || now.toISOString(),
          notificationType: 'machine_breakdown',
          machineName: alert.machineName,
          machineModel: alert.model,
          machineStatus: alert.status,
          isLocal: true
        });
      } catch (error) {
        console.warn('Error processing breakdown alert:', error);
      }
    });
    
    console.log(`Generated ${machineNotifications.length} machine notifications`);
    return machineNotifications;
  } catch (error) {
    console.error('Error in fetchMachineNotifications:', error);
    return [];
  }
};

// Helper to generate machine notifications from machine data
const generateMachineNotificationsFromData = (machines: FrontendMachine[]): StoredNotification[] => {
  const machineNotifications: StoredNotification[] = [];
  const now = new Date();
  
  machines.forEach((machine: FrontendMachine) => {
    try {
      // Check machine status
      if (machine.status === 'maintenance') {
        const notificationId = `machine_maintenance_${machine.id}`;
        
        machineNotifications.push({
          id: notificationId,
          title: '🔧 Machine Under Maintenance',
          message: `"${machine.name}" is currently under maintenance`,
          time: formatTimeAgoHelper(now.toISOString()),
          type: 'warning',
          read: getNotificationReadStatus(notificationId),
          priority: 'medium',
          createdAt: now.toISOString(),
          notificationType: 'machine_maintenance',
          machineName: machine.name,
          machineModel: machine.model,
          machineStatus: machine.status,
          isLocal: true
        });
      } else if (machine.status === 'out-of-service') {
        const notificationId = `machine_breakdown_${machine.id}`;
        
        machineNotifications.push({
          id: notificationId,
          title: '🛑 Machine Breakdown',
          message: `"${machine.name}" is out of service`,
          time: formatTimeAgoHelper(now.toISOString()),
          type: 'urgent',
          read: getNotificationReadStatus(notificationId),
          priority: 'high',
          createdAt: now.toISOString(),
          notificationType: 'machine_breakdown',
          machineName: machine.name,
          machineModel: machine.model,
          machineStatus: machine.status,
          isLocal: true
        });
      }
    } catch (error) {
      console.warn('Error processing machine for notification:', error);
    }
  });
  
  return machineNotifications;
};

// Fetch leave notifications
const fetchLeaveNotifications = async (): Promise<StoredNotification[]> => {
  try {
    console.log('Fetching leave notifications...');
    
    let leaveRequests: any[] = [];
    let leaveStatusUpdates: any[] = [];
    
    // Try APIs with graceful degradation
    try {
      const requestsResponse = await api.getLeaveRequests();
      if (requestsResponse.success && Array.isArray(requestsResponse.data)) {
        leaveRequests = requestsResponse.data;
      }
    } catch (error) {
      console.log('Leave requests API call failed:', error);
    }
    
    try {
      const updatesResponse = await api.getLeaveStatusUpdates();
      if (updatesResponse.success && Array.isArray(updatesResponse.data)) {
        leaveStatusUpdates = updatesResponse.data;
      }
    } catch (error) {
      console.log('Leave status updates API call failed:', error);
    }
    
    const leaveNotifications: StoredNotification[] = [];
    const now = new Date();
    
    // Process leave requests
    leaveRequests.forEach((request: any) => {
      try {
        const notificationId = `leave_request_${request._id}_${now.getTime()}`;
        const requestDate = new Date(request.createdAt || request.appliedDate || now);
        
        leaveNotifications.push({
          id: notificationId,
          title: '📋 New Leave Request',
          message: `${request.employeeName || 'Employee'} (${request.department || 'N/A'}) applied for ${request.leaveType || 'Leave'} for ${request.totalDays || 0} days`,
          time: formatTimeAgoHelper(requestDate.toISOString()),
          type: 'info',
          read: getNotificationReadStatus(notificationId),
          priority: request.isManagerLeave ? 'high' : 'medium',
          createdAt: requestDate.toISOString(),
          notificationType: 'leave_request',
          employeeName: request.employeeName,
          employeeId: request.employeeId,
          leaveType: request.leaveType,
          leaveFromDate: request.fromDate,
          leaveToDate: request.toDate,
          leaveTotalDays: request.totalDays,
          leaveStatus: request.status,
          leaveReason: request.reason,
          leaveRequestType: request.isManagerLeave ? 'Manager' : 'Employee',
          leaveDepartment: request.department,
          isLocal: true
        });
      } catch (error) {
        console.warn('Error processing leave request:', error);
      }
    });
    
    // Process leave status updates
    leaveStatusUpdates.forEach((update: any) => {
      try {
        const notificationId = `leave_${update.status}_${update.leaveId}_${now.getTime()}`;
        const updateDate = new Date(update.updatedAt || update.actionDate || now);
        
        let title = '';
        let type: "success" | "warning" | "info" | "urgent" = "info";
        let notificationType: any = 'leave_updated';
        
        switch (update.status) {
          case 'approved':
            title = '✅ Leave Approved';
            type = 'success';
            notificationType = 'leave_approved';
            break;
          case 'rejected':
            title = '❌ Leave Rejected';
            type = 'warning';
            notificationType = 'leave_rejected';
            break;
          case 'cancelled':
            title = '🚫 Leave Cancelled';
            type = 'info';
            notificationType = 'leave_cancelled';
            break;
          default:
            title = '📝 Leave Updated';
            type = 'info';
            notificationType = 'leave_pending';
        }
        
        leaveNotifications.push({
          id: notificationId,
          title: title,
          message: `${update.employeeName || 'Employee'}'s leave has been ${update.status} ${update.actionBy ? `by ${update.actionBy}` : ''}`,
          time: formatTimeAgoHelper(updateDate.toISOString()),
          type,
          read: getNotificationReadStatus(notificationId),
          priority: 'medium',
          createdAt: updateDate.toISOString(),
          notificationType,
          employeeName: update.employeeName,
          employeeId: update.employeeId,
          leaveType: update.leaveType,
          leaveStatus: update.status,
          leaveApprovedBy: update.status === 'approved' ? update.actionBy : undefined,
          leaveRejectedBy: update.status === 'rejected' ? update.actionBy : undefined,
          leaveRequestType: update.isManagerLeave ? 'Manager' : 'Employee',
          leaveDepartment: update.department,
          isLocal: true
        });
      } catch (error) {
        console.warn('Error processing leave status update:', error);
      }
    });
    
    console.log(`Generated ${leaveNotifications.length} leave notifications`);
    return leaveNotifications;
  } catch (error) {
    console.error('Error in fetchLeaveNotifications:', error);
    return [];
  }
};

// Fetch machine statistics notifications
const fetchMachineStatisticsNotifications = async (): Promise<StoredNotification[]> => {
  try {
    console.log('Fetching machine statistics notifications...');
    const response = await api.getMachineStatistics();
    
    if (!response.success || !response.data) {
      return [];
    }
    
    const stats = response.data;
    const machineNotifications: StoredNotification[] = [];
    const now = new Date();
    
    // Check for critical statistics
    if (stats.outOfServiceMachines > 0) {
      const notificationId = `machine_stats_breakdown_${now.getTime()}`;
      
      machineNotifications.push({
        id: notificationId,
        title: '📊 Machine Breakdown Alert',
        message: `${stats.outOfServiceMachines} machine(s) are currently out of service`,
        time: formatTimeAgoHelper(now.toISOString()),
        type: 'urgent',
        read: getNotificationReadStatus(notificationId),
        priority: 'high',
        createdAt: now.toISOString(),
        notificationType: 'machine_breakdown',
        isLocal: true
      });
    }
    
    if (stats.upcomingMaintenanceCount > 0) {
      const notificationId = `machine_stats_maintenance_${now.getTime()}`;
      
      machineNotifications.push({
        id: notificationId,
        title: '📊 Maintenance Due Soon',
        message: `${stats.upcomingMaintenanceCount} machine(s) have maintenance due within 30 days`,
        time: formatTimeAgoHelper(now.toISOString()),
        type: 'warning',
        read: getNotificationReadStatus(notificationId),
        priority: 'medium',
        createdAt: now.toISOString(),
        notificationType: 'machine_maintenance',
        isLocal: true
      });
    }
    
    // Overall machine health notification
    if (stats.totalMachines > 0) {
      const operationalPercentage = (stats.operationalMachines / stats.totalMachines) * 100;
      
      if (operationalPercentage < 70) {
        const notificationId = `machine_stats_health_${now.getTime()}`;
        
        machineNotifications.push({
          id: notificationId,
          title: '📊 Machine Health Alert',
          message: `Only ${operationalPercentage.toFixed(1)}% of machines are operational. ${stats.maintenanceMachines} under maintenance, ${stats.outOfServiceMachines} out of service.`,
          time: formatTimeAgoHelper(now.toISOString()),
          type: 'warning',
          read: getNotificationReadStatus(notificationId),
          priority: 'high',
          createdAt: now.toISOString(),
          notificationType: 'machine_maintenance',
          isLocal: true
        });
      }
    }
    
    console.log(`Generated ${machineNotifications.length} machine statistics notifications`);
    return machineNotifications;
  } catch (error) {
    console.error('Error fetching machine statistics notifications:', error);
    return [];
  }
};

// Fetch inventory statistics notifications
const fetchInventoryStatisticsNotifications = async (): Promise<StoredNotification[]> => {
  try {
    console.log('Fetching inventory statistics notifications...');
    const response = await api.getInventoryStatistics();
    
    if (!response.success || !response.data) {
      // Fallback to calculating from service data
      console.log('Using inventory service for statistics...');
      try {
        const items = await inventoryService.getItems();
        return generateInventoryStatsFromData(items);
      } catch (serviceError) {
        console.error('Inventory service for statistics failed:', serviceError);
        return [];
      }
    }
    
    const stats = response.data;
    const inventoryNotifications: StoredNotification[] = [];
    const now = new Date();
    
    // Check for critical statistics
    if (stats.outOfStockCount > 0) {
      const notificationId = `inventory_stats_out_of_stock_${now.getTime()}`;
      
      inventoryNotifications.push({
        id: notificationId,
        title: '📊 Out of Stock Alert',
        message: `${stats.outOfStockCount} item(s) are completely out of stock`,
        time: formatTimeAgoHelper(now.toISOString()),
        type: 'urgent',
        read: getNotificationReadStatus(notificationId),
        priority: 'high',
        createdAt: now.toISOString(),
        notificationType: 'inventory_out_of_stock',
        isLocal: true
      });
    }
    
    if (stats.criticalStockCount > 0) {
      const notificationId = `inventory_stats_critical_${now.getTime()}`;
      
      inventoryNotifications.push({
        id: notificationId,
        title: '📊 Critical Stock Alert',
        message: `${stats.criticalStockCount} item(s) are at critical stock levels`,
        time: formatTimeAgoHelper(now.toISOString()),
        type: 'warning',
        read: getNotificationReadStatus(notificationId),
        priority: 'high',
        createdAt: now.toISOString(),
        notificationType: 'inventory_critical',
        isLocal: true
      });
    }
    
    if (stats.lowStockCount > 0) {
      const notificationId = `inventory_stats_low_stock_${now.getTime()}`;
      
      inventoryNotifications.push({
        id: notificationId,
        title: '📊 Low Stock Summary',
        message: `${stats.lowStockCount} item(s) are low on stock and need reordering`,
        time: formatTimeAgoHelper(now.toISOString()),
        type: 'warning',
        read: getNotificationReadStatus(notificationId),
        priority: 'medium',
        createdAt: now.toISOString(),
        notificationType: 'inventory_low_stock',
        isLocal: true
      });
    }
    
    console.log(`Generated ${inventoryNotifications.length} inventory statistics notifications`);
    return inventoryNotifications;
  } catch (error) {
    console.error('Error fetching inventory statistics notifications:', error);
    // Fallback to service data
    try {
      const items = await inventoryService.getItems();
      return generateInventoryStatsFromData(items);
    } catch (fallbackError) {
      console.error('Inventory statistics fallback failed:', fallbackError);
      return [];
    }
  }
};

// Helper to generate inventory stats from item data
const generateInventoryStatsFromData = (items: FrontendInventoryItem[]): StoredNotification[] => {
  const inventoryNotifications: StoredNotification[] = [];
  const now = new Date();
  
  try {
    // Calculate statistics
    const lowStockItems = items.filter(item => item.quantity <= item.reorderLevel && item.quantity > 0);
    const criticalItems = items.filter(item => item.quantity <= Math.floor(item.reorderLevel * 0.3) && item.quantity > 0);
    const outOfStockItems = items.filter(item => item.quantity === 0);
    
    // Create summary notifications
    if (outOfStockItems.length > 0) {
      const notificationId = `inventory_stats_out_of_stock_${now.getTime()}`;
      
      inventoryNotifications.push({
        id: notificationId,
        title: '📊 Out of Stock Alert',
        message: `${outOfStockItems.length} item(s) are completely out of stock`,
        time: formatTimeAgoHelper(now.toISOString()),
        type: 'urgent',
        read: getNotificationReadStatus(notificationId),
        priority: 'high',
        createdAt: now.toISOString(),
        notificationType: 'inventory_out_of_stock',
        isLocal: true
      });
    }
    
    if (criticalItems.length > 0) {
      const notificationId = `inventory_stats_critical_${now.getTime()}`;
      
      inventoryNotifications.push({
        id: notificationId,
        title: '📊 Critical Stock Alert',
        message: `${criticalItems.length} item(s) are at critical stock levels`,
        time: formatTimeAgoHelper(now.toISOString()),
        type: 'warning',
        read: getNotificationReadStatus(notificationId),
        priority: 'high',
        createdAt: now.toISOString(),
        notificationType: 'inventory_critical',
        isLocal: true
      });
    }
    
    if (lowStockItems.length > 0) {
      const notificationId = `inventory_stats_low_stock_${now.getTime()}`;
      
      inventoryNotifications.push({
        id: notificationId,
        title: '📊 Low Stock Summary',
        message: `${lowStockItems.length} item(s) are low on stock and need reordering`,
        time: formatTimeAgoHelper(now.toISOString()),
        type: 'warning',
        read: getNotificationReadStatus(notificationId),
        priority: 'medium',
        createdAt: now.toISOString(),
        notificationType: 'inventory_low_stock',
        isLocal: true
      });
    }
  } catch (error) {
    console.error('Error generating inventory stats from data:', error);
  }
  
  return inventoryNotifications;
};

// Helper function to test all API endpoints
const testApiEndpoints = async () => {
  const endpoints = [
    { name: 'Notifications', url: '/notifications' },
    { name: 'Communications', url: '/crm/communications' },
    { name: 'Recent Site Activities', url: '/sites/recent-activities' },
    { name: 'Recent Task Activities', url: '/tasks/recent-activities' },
    { name: 'Low Stock Items', url: '/inventory/low-stock' },
    { name: 'Critical Stock Items', url: '/inventory/critical-stock' },
    { name: 'Out of Stock Items', url: '/inventory/out-of-stock' },
    { name: 'Machine Maintenance Alerts', url: '/machines/maintenance-alerts' },
    { name: 'Machine Breakdown Alerts', url: '/machines/breakdown-alerts' },
    { name: 'Leave Requests', url: '/leaves/recent-requests' },
    { name: 'Leave Status Updates', url: '/leaves/recent-updates' },
    { name: 'Machine Statistics', url: '/machines/statistics' },
    { name: 'Inventory Statistics', url: '/inventory/statistics' }
  ];

  console.log('Testing API endpoints...');
  const results = [];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_URL}${endpoint.url}`);
      results.push({
        Endpoint: endpoint.name,
        URL: endpoint.url,
        Status: response.status,
        OK: response.ok ? '✅' : '❌'
      });
      console.log(`${endpoint.name}: ${response.status} ${response.statusText}`);
    } catch (error: any) {
      results.push({
        Endpoint: endpoint.name,
        URL: endpoint.url,
        Status: 'ERROR',
        OK: '❌',
        Error: error.message
      });
      console.log(`${endpoint.name}: ERROR - ${error.message}`);
    }
  }
  console.table(results);
  return results;
};

interface NotificationListProps {
  notifications: StoredNotification[];
  filter: 'all' | 'unread' | 'read';
  handleViewDetails: (notification: StoredNotification) => void;
  handleMarkAsRead: (id: string) => void;
  handleMarkAsUnread: (id: string) => void;
  handleDelete: (id: string) => void;
  getCommunicationIcon: (type?: string, notificationType?: string) => JSX.Element;
  getTypeColor: (type: string) => "default" | "destructive" | "secondary" | "outline";
  getPriorityColor: (priority: string) => string;
  getLeaveRequestTypeBadge: (notificationType?: string) => JSX.Element | null;
  setFilter: (filter: 'all' | 'unread' | 'read') => void;
  handleMarkAllRead: () => void;
}

const NotificationList = ({
  notifications,
  filter,
  handleViewDetails,
  handleMarkAsRead,
  handleMarkAsUnread,
  handleDelete,
  getCommunicationIcon,
  getTypeColor,
  getPriorityColor,
  getLeaveRequestTypeBadge,
  setFilter,
  handleMarkAllRead
}: NotificationListProps) => {
  if (notifications.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="text-center py-8 md:py-12 border-dashed border-2 bg-gradient-to-br from-muted/50 to-background">
          <CardContent className="space-y-3 md:space-y-4">
            <div className="relative inline-block">
              <Bell className="h-12 w-12 md:h-16 md:w-16 mx-auto text-muted-foreground mb-3 md:mb-4 opacity-50" />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-xl rounded-full" />
            </div>
            <motion.h3 
              className="text-lg md:text-xl font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
              animate={{ 
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{ backgroundSize: '200% auto' }}
            >
              {filter === 'all' ? "No notifications yet" : 
               filter === 'unread' ? "All caught up!" : 
               "No read notifications"}
            </motion.h3>
            <p className="text-xs md:text-sm text-muted-foreground max-w-md mx-auto px-4">
              {filter === 'all' ? 
                "You're all caught up! When you have new notifications, they'll appear here." :
                filter === 'unread' ?
                "You don't have any unread notifications right now. Great job staying on top of things!" :
                "You haven't marked any notifications as read yet."}
            </p>
            {filter !== 'all' && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="outline" 
                  onClick={() => setFilter('all')}
                  className="mt-2 md:mt-4 text-xs md:text-sm h-8 md:h-10"
                >
                  View All Notifications
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs md:text-sm text-muted-foreground mb-2">
        <span className="flex items-center gap-2">
          <span className="animate-pulse">📊</span>
          Showing {notifications.length} {filter === 'all' ? '' : filter} notification{notifications.length !== 1 ? 's' : ''}
        </span>
        {filter === 'unread' && notifications.length > 0 && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllRead}
              className="h-7 md:h-8 px-2 text-xs md:text-sm bg-gradient-to-r from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20"
            >
              <CheckCheck className="h-3 w-3 mr-1 animate-pulse" />
              Mark all read
            </Button>
          </motion.div>
        )}
      </div>
      
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              transition: { 
                delay: index * 0.03,
                type: "spring",
                stiffness: 100
              }
            }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            layout
            whileHover={{ 
              y: -2,
              transition: { type: "spring", stiffness: 300 }
            }}
          >
            <Card 
              className={cn(
                "cursor-pointer transition-all duration-300 hover:shadow-lg group relative overflow-hidden",
                !notification.read ? "border-l-4 border-l-primary bg-gradient-to-r from-primary/5 via-primary/5 to-transparent" : "",
                notification.type === 'urgent' ? "border-red-500/50 bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-950/20" :
                notification.type === 'warning' ? "border-orange-500/50 bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-950/20" :
                notification.type === 'success' ? "border-green-500/50 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-950/20" : "",
                notification.notificationType === 'site_addition' ? "border-blue-500/50 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20" :
                notification.notificationType === 'site_status' ? "border-purple-500/50 bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-950/20" :
                notification.notificationType === 'site_deletion' ? "border-red-500/50 bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-950/20" :
                notification.notificationType === 'site_update' ? "border-amber-500/50 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20" :
                notification.notificationType === 'task_creation' ? "border-indigo-500/50 bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-950/20" :
                notification.notificationType === 'task_assignment' ? "border-teal-500/50 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-950/20" :
                notification.notificationType === 'task_completion' ? "border-emerald-500/50 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-950/20" :
                notification.notificationType === 'task_update' ? "border-cyan-500/50 bg-gradient-to-r from-cyan-50/50 to-transparent dark:from-cyan-950/20" :
                notification.notificationType === 'task_overdue' ? "border-rose-500/50 bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-950/20" :
                notification.notificationType === 'inventory_low_stock' ? "border-yellow-500/50 bg-gradient-to-r from-yellow-50/50 to-transparent dark:from-yellow-950/20" :
                notification.notificationType === 'inventory_critical' ? "border-orange-500/50 bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-950/20" :
                notification.notificationType === 'inventory_out_of_stock' ? "border-red-500/50 bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-950/20" :
                notification.notificationType === 'machine_maintenance' ? "border-blue-500/50 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20" :
                notification.notificationType === 'machine_breakdown' ? "border-red-500/50 bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-950/20" :
                notification.notificationType === 'leave_request' ? "border-indigo-500/50 bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-950/20" :
                notification.notificationType === 'leave_approved' ? "border-green-500/50 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-950/20" :
                notification.notificationType === 'leave_rejected' ? "border-red-500/50 bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-950/20" :
                notification.notificationType === 'leave_pending' ? "border-yellow-500/50 bg-gradient-to-r from-yellow-50/50 to-transparent dark:from-yellow-950/20" :
                notification.notificationType === 'leave_cancelled' ? "border-gray-500/50 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-950/20" : ""
              )}
              onClick={() => handleViewDetails(notification)}
            >
              {/* Animated background effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              <CardContent className="p-3 md:p-4 relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 md:gap-2 mb-1">
                      <motion.div
                        whileHover={{ rotate: 15 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="flex-shrink-0"
                      >
                        {getCommunicationIcon(notification.communicationType, notification.notificationType)}
                      </motion.div>
                      <h4 className="font-semibold text-sm md:text-lg truncate">{notification.title}</h4>
                      
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="flex-shrink-0"
                      >
                        <Badge 
                          variant={getTypeColor(notification.type)}
                          className={cn(
                            "transition-all duration-300 text-[10px] md:text-xs px-1.5 md:px-2 py-0 md:py-0.5",
                            notification.type === 'urgent' && "animate-pulse bg-gradient-to-r from-red-500 to-red-600",
                            notification.type === 'warning' && "bg-gradient-to-r from-orange-500 to-amber-500",
                            notification.type === 'success' && "bg-gradient-to-r from-green-500 to-emerald-500",
                            notification.type === 'info' && "bg-gradient-to-r from-blue-500 to-cyan-500"
                          )}
                        >
                          {notification.type}
                        </Badge>
                      </motion.div>
                      
                      {notification.notificationType && (
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          className="flex-shrink-0"
                        >
                          <Badge variant="outline" className="text-[8px] md:text-xs bg-background/50 backdrop-blur-sm px-1.5 md:px-2 py-0 md:py-0.5">
                            {notification.notificationType
                              .replace('site_', 'Site ')
                              .replace('task_', 'Task ')
                              .replace('inventory_', 'Inventory ')
                              .replace('machine_', 'Machine ')
                              .replace('leave_', 'Leave ')
                              .replace('_', ' ')}
                          </Badge>
                        </motion.div>
                      )}
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <motion.div 
                              className={cn(
                                "w-2 h-2 md:w-3 md:h-3 rounded-full ring-1 md:ring-2 ring-white dark:ring-gray-800 flex-shrink-0",
                                getPriorityColor(notification.priority)
                              )}
                              whileHover={{ scale: 1.3 }}
                              animate={notification.priority === 'high' ? {
                                scale: [1, 1.2, 1],
                                transition: { repeat: Infinity, duration: 2 }
                              } : {}}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{notification.priority.toUpperCase()} priority</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {!notification.read && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200 }}
                          className="flex-shrink-0"
                        >
                          <Badge 
                            variant="default" 
                            className="animate-pulse bg-gradient-to-r from-primary to-secondary text-[8px] md:text-xs px-1.5 md:px-2 py-0 md:py-0.5"
                          >
                            New
                          </Badge>
                        </motion.div>
                      )}
                      
                      {notification.notificationType?.includes('leave_') && 
                       getLeaveRequestTypeBadge(notification.notificationType)}
                      
                      {notification.read && (
                        <Badge variant="outline" className="text-[8px] md:text-xs px-1.5 md:px-2 py-0 md:py-0.5">
                          <CheckCheck className="h-2 w-2 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                          Read
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs md:text-sm text-muted-foreground mb-2 line-clamp-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-1 md:gap-4 text-[10px] md:text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5 md:gap-1 bg-muted/30 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md">
                        {notification.notificationType?.includes('site') ? (
                          <Building className="h-2 w-2 md:h-3 md:w-3" />
                        ) : notification.notificationType?.includes('task') ? (
                          <Clock className="h-2 w-2 md:h-3 md:w-3" />
                        ) : notification.notificationType?.includes('inventory') ? (
                          <Package className="h-2 w-2 md:h-3 md:w-3" />
                        ) : notification.notificationType?.includes('machine') ? (
                          <Cpu className="h-2 w-2 md:h-3 md:w-3" />
                        ) : notification.notificationType?.includes('leave') ? (
                          <CalendarDays className="h-2 w-2 md:h-3 md:w-3" />
                        ) : (
                          <Calendar className="h-2 w-2 md:h-3 md:w-3" />
                        )}
                        <span className="truncate max-w-[60px] md:max-w-none">
                          {notification.followUpDate || new Date(notification.createdAt).toLocaleDateString('en-IN') || "Just now"}
                        </span>
                      </span>
                      
                      <span className="text-primary hidden md:inline">•</span>
                      
                      <span className="font-medium bg-muted/30 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md">
                        {notification.time}
                      </span>
                      
                      {notification.clientName && (
                        <>
                          <span className="text-primary hidden md:inline">•</span>
                          <span className="font-medium flex items-center gap-0.5 md:gap-1 bg-muted/30 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md">
                            <User className="h-2 w-2 md:h-3 md:w-3" />
                            <span className="truncate max-w-[60px] md:max-w-none">Client: {notification.clientName}</span>
                          </span>
                        </>
                      )}
                      
                      {notification.siteName && (
                        <>
                          <span className="text-primary hidden md:inline">•</span>
                          <span className="font-medium flex items-center gap-0.5 md:gap-1 bg-muted/30 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md">
                            <Building className="h-2 w-2 md:h-3 md:w-3" />
                            <span className="truncate max-w-[60px] md:max-w-none">Site: {notification.siteName}</span>
                          </span>
                        </>
                      )}
                      
                      {notification.itemName && (
                        <>
                          <span className="text-primary hidden md:inline">•</span>
                          <span className="font-medium flex items-center gap-0.5 md:gap-1 bg-muted/30 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md">
                            <Package className="h-2 w-2 md:h-3 md:w-3" />
                            <span className="truncate max-w-[60px] md:max-w-none">Item: {notification.itemName}</span>
                          </span>
                        </>
                      )}
                      
                      {notification.machineName && (
                        <>
                          <span className="text-primary hidden md:inline">•</span>
                          <span className="font-medium flex items-center gap-0.5 md:gap-1 bg-muted/30 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md">
                            <Cpu className="h-2 w-2 md:h-3 md:w-3" />
                            <span className="truncate max-w-[60px] md:max-w-none">Machine: {notification.machineName}</span>
                          </span>
                        </>
                      )}
                      
                      {notification.employeeName && (
                        <>
                          <span className="text-primary hidden md:inline">•</span>
                          <span className="font-medium flex items-center gap-0.5 md:gap-1 bg-muted/30 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md">
                            <User className="h-2 w-2 md:h-3 md:w-3" />
                            <span className="truncate max-w-[60px] md:max-w-none">Employee: {notification.employeeName}</span>
                          </span>
                        </>
                      )}
                      
                      {notification.leaveRequestType && (
                        <>
                          <span className="text-primary hidden md:inline">•</span>
                          <span className="font-medium bg-muted/30 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md">
                            Type: {notification.leaveRequestType}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-1 md:gap-2 ml-1 md:ml-4 flex-shrink-0">
                    {!notification.read ? (
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          className="h-6 w-6 md:h-8 md:w-8 text-primary hover:bg-primary/10"
                          title="Mark as read"
                        >
                          <CheckCheck className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: -5 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsUnread(notification.id);
                          }}
                          className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground hover:bg-muted"
                          title="Mark as unread"
                        >
                          <Eye className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </motion.div>
                    )}
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        className="h-6 w-6 md:h-8 md:w-8 text-destructive hover:bg-destructive/10"
                        title="Delete notification"
                      >
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const Notifications = () => {
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewNotification, setViewNotification] = useState<StoredNotification | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [newNotificationsCount, setNewNotificationsCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [availableSites, setAvailableSites] = useState<SiteFilter[]>([]);
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [showStats, setShowStats] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const autoRefreshRef = useRef<NodeJS.Timeout>();

  // Add mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const handleMobileClose = () => {
    setMobileSidebarOpen(false);
  };

  const [settings, setSettings] = useState<NotificationSettings>({
    desktopNotifications: true,
    soundNotifications: true,
    soundVolume: 70,
    notificationFrequency: 'realtime',
    showOverdue: true,
    showToday: true,
    showUpcoming: true,
    showSiteAdditions: true,
    showSiteStatusChanges: true,
    showSiteDeletions: true,
    showSiteUpdates: true,
    showTaskCreations: true,
    showTaskAssignments: true,
    showTaskCompletions: true,
    showTaskUpdates: true,
    showOverdueTasks: true,
    showInventoryLowStock: true,
    showInventoryCritical: true,
    showInventoryOutOfStock: true,
    showMachineMaintenance: true,
    showMachineBreakdown: true,
    showLeaveRequests: true,
    showLeaveApproved: true,
    showLeaveRejected: true,
    showLeavePending: true,
    showLeaveCancelled: true,
  });

  // SiteSelector Component
  const SiteSelector = () => (
    <div className="flex items-center gap-2">
      <Select value={selectedSite} onValueChange={setSelectedSite}>
        <SelectTrigger className="w-[160px] md:w-[200px] h-8 md:h-10 text-xs md:text-sm">
          <SelectValue placeholder="Select site">
            <div className="flex items-center gap-2">
              <Building className="h-3 w-3 md:h-4 md:w-4" />
              <span className="truncate">
                {selectedSite === "all" 
                  ? "All Sites" 
                  : allSites.find(s => s._id === selectedSite)?.name || "Select site"}
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Globe className="h-3 w-3 md:h-4 md:w-4" />
              <div>
                <span>All Sites</span>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Show data from all sites
                </p>
              </div>
            </div>
          </SelectItem>
          {allSites.map(site => (
            <SelectItem key={site._id} value={site._id}>
              <div className="flex items-center gap-2">
                <Building className="h-3 w-3 md:h-4 md:w-4" />
                <div className="min-w-0">
                  <span className="truncate block">{site.name}</span>
                  <p className="text-xs text-muted-foreground hidden md:block truncate">
                    {site.clientName} • {site.location}
                  </p>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {(selectedSite !== "all" || filter !== "all") && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedSite("all");
            setFilter("all");
            toast.success("Filters cleared", {
              description: "All filters have been cleared",
            });
          }}
          className="h-8 md:h-10 gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3"
        >
          <FilterX className="h-3 w-3 md:h-4 md:w-4" />
          <span className="hidden xs:inline">Clear</span>
        </Button>
      )}
    </div>
  );

  // Function to extract unique sites from notifications
  const extractUniqueSites = (notifications: StoredNotification[]): SiteFilter[] => {
    const siteMap = new Map<string, SiteFilter>();
    
    notifications.forEach(notification => {
      if (notification.siteName && notification.siteId) {
        if (!siteMap.has(notification.siteId)) {
          siteMap.set(notification.siteId, {
            id: notification.siteId,
            name: notification.siteName
          });
        }
      } else if (notification.siteName) {
        // If no siteId, use siteName as ID
        const siteId = notification.siteName.toLowerCase().replace(/\s+/g, '-');
        if (!siteMap.has(siteId)) {
          siteMap.set(siteId, {
            id: siteId,
            name: notification.siteName
          });
        }
      }
    });
    
    return Array.from(siteMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Function to filter notifications based on current filters
  const getFilteredNotifications = () => {
    let filtered = notifications;
    
    // Apply site filter
    if (selectedSite !== 'all') {
      filtered = filtered.filter(n => {
        // Direct site ID match
        if (n.siteId === selectedSite) {
          return true;
        }
        
        // Check if notification has a site name that matches any site
        if (n.siteName) {
          const selectedSiteData = allSites.find(s => s._id === selectedSite);
          if (selectedSiteData) {
            const siteName = selectedSiteData.name.toLowerCase();
            const notificationSiteName = (n.siteName || '').toLowerCase();
            
            if (notificationSiteName.includes(siteName) || siteName.includes(notificationSiteName)) {
              return true;
            }
            
            // Check client name match
            const clientName = selectedSiteData.clientName.toLowerCase();
            const notificationClientName = (n.clientName || '').toLowerCase();
            
            if (notificationClientName.includes(clientName) || clientName.includes(notificationClientName)) {
              return true;
            }
          }
        }
        
        // For inventory items, check if site matches
        if (n.notificationType?.includes('inventory') && n.siteName) {
          const selectedSiteData = allSites.find(s => s._id === selectedSite);
          if (selectedSiteData && selectedSiteData.name === n.siteName) {
            return true;
          }
        }
        
        return false;
      });
    }
    
    // Apply read/unread filter
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filter === 'read') {
      filtered = filtered.filter(n => n.read);
    }
    
    return filtered;
  };

  // Calculate statistics
  const calculateStats = () => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.read).length;
    const urgent = notifications.filter(n => n.type === 'urgent').length;
    const highPriority = notifications.filter(n => n.priority === 'high').length;
    const today = new Date();
    const todayNotifications = notifications.filter(n => {
      const notifDate = new Date(n.createdAt);
      return notifDate.toDateString() === today.toDateString();
    }).length;
    
    return { total, unread, urgent, highPriority, todayNotifications };
  };

  const stats = calculateStats();

  useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error parsing notification settings:', error);
      }
    }

    notificationService.requestNotificationPermission();

    // Listen for real-time notifications
    const cleanup = notificationService.setupBroadcastListener((data) => {
      if (data.type === 'SITE_ADDED' || data.type === 'NEW_NOTIFICATION' || 
          data.type === 'INVENTORY_UPDATE' || data.type === 'MACHINE_UPDATE' ||
          data.type === 'LEAVE_REQUEST' || data.type === 'LEAVE_STATUS_UPDATE') {
        fetchNotifications(true);
      }
    });

    // Set up auto-refresh
    const setupAutoRefresh = () => {
      if (autoRefresh) {
        autoRefreshRef.current = setInterval(() => {
          fetchNotifications();
        }, 300000); // Refresh every minute
      }
    };

    setupAutoRefresh();

    return () => {
      cleanup();
      notificationService.stopPeriodicCheck();
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  }, [settings]);

  // Update auto-refresh when setting changes
  useEffect(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
    }
    
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        fetchNotifications();
      }, 300000);
    }
    
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [autoRefresh]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Fetch notifications on component mount
    fetchNotifications(false);
  }, []);

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Recently";
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return "Recently";
    }
  };

  const showSystemNotificationForNew = (newNotifications: StoredNotification[]) => {
    if (!settings.desktopNotifications) return;

    newNotifications.forEach(notification => {
      if (notification.priority === 'high' || notification.type === 'urgent') {
        notificationService.showSystemNotification(notification.title, {
          body: notification.message,
          tag: notification.id,
          data: { url: window.location.href }
        });
      }
    });
  };

  const fetchNotifications = async (showNewIndicator = true) => {
    if (!isOnline) {
      toast.error("You are offline. Please check your internet connection.");
      return;
    }

    try {
      setLoading(true);
      
      // Load all sites first
      try {
        const sites = await fetchSites();
        setAllSites(sites);
      } catch (error) {
        console.error('Error fetching sites:', error);
      }
      
      // Wrap all fetches in try-catch to prevent one failure from breaking everything
      const fetchPromises = [
        fetchApiNotifications().catch(() => []),
        fetchFollowUpNotifications().catch(() => []),
        fetchSiteActivityNotifications().catch(() => []),
        fetchTaskActivityNotifications().catch(() => []),
        fetchInventoryNotifications().catch(() => []),
        fetchMachineNotifications().catch(() => []),
        fetchLeaveNotifications().catch(() => []),
        fetchMachineStatisticsNotifications().catch(() => []),
        fetchInventoryStatisticsNotifications().catch(() => [])
      ];
      
      const results = await Promise.all(fetchPromises);
      
      // Combine all results
      let allNotifications: StoredNotification[] = [];
      results.forEach(result => {
        if (Array.isArray(result)) {
          allNotifications = [...allNotifications, ...result];
        }
      });
      
      // =========== APPLY PERSISTENT READ STATUS ===========
      const readStatus = getReadStatusFromStorage();
      
      // Apply read status to notifications
      allNotifications = allNotifications.map(notification => ({
        ...notification,
        read: readStatus[notification.id] || false
      }));
      
      // Apply settings filters
      const filteredNotifications = allNotifications.filter(notification => {
        if (!notification.notificationType) return true;
        
        // Filter based on notification type
        switch (notification.notificationType) {
          case 'site_addition':
            return settings.showSiteAdditions;
          case 'site_status':
            return settings.showSiteStatusChanges;
          case 'site_deletion':
            return settings.showSiteDeletions;
          case 'site_update':
            return settings.showSiteUpdates;
          case 'task_creation':
            return settings.showTaskCreations;
          case 'task_assignment':
            return settings.showTaskAssignments;
          case 'task_completion':
            return settings.showTaskCompletions;
          case 'task_update':
            return settings.showTaskUpdates;
          case 'task_overdue':
            return settings.showOverdueTasks;
          case 'inventory_low_stock':
            return settings.showInventoryLowStock;
          case 'inventory_critical':
            return settings.showInventoryCritical;
          case 'inventory_out_of_stock':
            return settings.showInventoryOutOfStock;
          case 'machine_maintenance':
            return settings.showMachineMaintenance;
          case 'machine_breakdown':
            return settings.showMachineBreakdown;
          case 'leave_request':
            return settings.showLeaveRequests;
          case 'leave_approved':
            return settings.showLeaveApproved;
          case 'leave_rejected':
            return settings.showLeaveRejected;
          case 'leave_pending':
            return settings.showLeavePending;
          case 'leave_cancelled':
            return settings.showLeaveCancelled;
          case 'communication_followup':
            // Handle follow-up filters
            if (notification.type === 'warning' && !settings.showOverdue) return false;
            if (notification.type === 'success' && !settings.showToday) return false;
            if (notification.type === 'info' && !settings.showUpcoming) return false;
            return true;
          default:
            return true;
        }
      });
      
      // Remove duplicates based on id
      const uniqueNotifications = Array.from(
        new Map(filteredNotifications.map(n => [n.id, n])).values()
      );
      
      // Sort by priority and date (newest first for same priority)
      uniqueNotifications.sort((a, b) => {
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        if (a.priority !== b.priority) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        
        try {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
          return dateB.getTime() - dateA.getTime();
        } catch {
          return 0;
        }
      });
      
      const oldIds = new Set(notifications.map(n => n.id));
      const trulyNew = uniqueNotifications.filter(n => !oldIds.has(n.id));
      
      setNotifications(uniqueNotifications);
      
      // Extract unique sites from notifications
      const sites = extractUniqueSites(uniqueNotifications);
      setAvailableSites(sites);
      
      if (showNewIndicator && trulyNew.length > 0 && settings.desktopNotifications) {
        showSystemNotificationForNew(trulyNew);
        setNewNotificationsCount(trulyNew.length);
        
        // Show celebration effect for new notifications
        if (trulyNew.length > 0) {
          toast.success(`🎉 ${trulyNew.length} new notification${trulyNew.length > 1 ? 's' : ''}!`, {
            duration: 3000,
          });
        }
        
        if (settings.soundNotifications && trulyNew.some(n => n.priority === 'high' || n.type === 'urgent')) {
          notificationService.showSystemNotification("New High Priority Notifications", {
            body: `You have ${trulyNew.length} new notifications`
          });
        }
      }
      
      setLastChecked(new Date());
      console.log(`Total notifications loaded: ${uniqueNotifications.length}`);
      console.log(`Unique sites found: ${sites.length}`);
    } catch (error: any) {
      console.error("Critical error in fetchNotifications:", error);
      toast.error("Failed to load some notifications");
    } finally {
      setLoading(false);
    }
  };
const handleMarkAllRead = async () => {
  try {
    // Try API first
    const apiResult = await api.markAllNotificationsAsRead();
    if (!apiResult.success) {
      console.warn('API mark all read failed, falling back to local update');
    }
    
    // Always update local state and localStorage
    const currentStatus = getReadStatusFromStorage();
    notifications.forEach(n => {
      currentStatus[n.id] = true;
    });
    saveReadStatusToStorage(currentStatus);
    
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    setNewNotificationsCount(0);
    
    toast.success("All notifications marked as read! 🎉", {
      duration: 3000,
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    // Even on error, update local state
    const currentStatus = getReadStatusFromStorage();
    notifications.forEach(n => {
      currentStatus[n.id] = true;
    });
    saveReadStatusToStorage(currentStatus);
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    setNewNotificationsCount(0);
    toast.success("All notifications marked as read locally");
  }
};

  const handleDelete = async (id: string) => {
    try {
      // Check if it's an API notification (contains only hex ID or doesn't contain underscores)
      if (/^[a-fA-F0-9]{24}$/.test(id) || !id.includes('_')) {
        // For API notifications
        const result = await api.deleteNotification(id);
        if (!result.success) {
          console.warn('Failed to delete API notification:', result.error);
          // Continue with local deletion anyway
        }
      }
      
      // Remove from local state AND localStorage
      const status = getReadStatusFromStorage();
      delete status[id];
      saveReadStatusToStorage(status);
      
      setNotifications(notifications.filter(n => n.id !== id));
      toast.success("Notification removed!", {
        icon: "🗑️",
      });
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      toast.error("Failed to delete notification");
    }
  };

  const handleViewDetails = (notification: StoredNotification) => {
    setViewNotification(notification);
    setDialogOpen(true);
    
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      // Save to localStorage first
      markNotificationAsReadInStorage(id);
      
      // Check if it's an API notification
      if (/^[a-fA-F0-9]{24}$/.test(id) || !id.includes('_')) {
        // For API notifications
        const result = await api.markNotificationAsRead(id);
        if (!result.success) {
          console.warn('Failed to mark API notification as read:', result.error);
        }
      }
      
      // Update local state with animation
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
      
      toast.success("✅ Marked as read!");
    } catch (error: any) {
      console.error("Failed to mark notification as read:", error);
      // Still update local state even if API call fails
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    }
  };

  const handleMarkAsUnread = async (id: string) => {
    try {
      // Save to localStorage
      markNotificationAsUnreadInStorage(id);
      
      // Update local state
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: false } : n
      ));
      
      toast.success("👁️ Marked as unread!");
    } catch (error: any) {
      console.error("Failed to mark notification as unread:", error);
      toast.error("Failed to mark as unread");
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case "success": return "default";
      case "warning": return "destructive";
      case "urgent": return "destructive";
      case "info": return "secondary";
      default: return "outline";
    }
  };

  const getCommunicationIcon = (type?: string, notificationType?: string) => {
    if (notificationType?.includes('site_')) {
      if (notificationType === 'site_addition') return <Building className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-blue-500" />;
      if (notificationType === 'site_status') return <RefreshCw className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-purple-500" />;
      if (notificationType === 'site_deletion') return <Trash2 className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-red-500" />;
      if (notificationType === 'site_update') return <Building className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-amber-500" />;
    }
    
    if (notificationType?.includes('task_')) {
      if (notificationType === 'task_creation') return <Bell className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-indigo-500" />;
      if (notificationType === 'task_assignment') return <Users className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-teal-500" />;
      if (notificationType === 'task_completion') return <CheckCircle className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-emerald-500" />;
      if (notificationType === 'task_update') return <Clock className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-cyan-500" />;
      if (notificationType === 'task_overdue') return <AlertCircle className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-rose-500" />;
    }
    
    if (notificationType?.includes('inventory_')) {
      if (notificationType === 'inventory_out_of_stock') return <AlertOctagon className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-red-500" />;
      if (notificationType === 'inventory_critical') return <AlertCircle className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-orange-500" />;
      if (notificationType === 'inventory_low_stock') return <Package className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-yellow-500" />;
      return <ShoppingBag className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />;
    }
    
    if (notificationType?.includes('machine_')) {
      if (notificationType === 'machine_breakdown') return <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-red-500" />;
      if (notificationType === 'machine_maintenance') return <Cpu className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-blue-500" />;
      return <Cpu className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />;
    }
    
    if (notificationType?.includes('leave_')) {
      if (notificationType === 'leave_approved') return <CheckCircle className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-green-500" />;
      if (notificationType === 'leave_rejected') return <AlertCircle className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-red-500" />;
      if (notificationType === 'leave_cancelled') return <XCircle className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-gray-500" />;
      if (notificationType === 'leave_request') return <FileText className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-indigo-500" />;
      if (notificationType === 'leave_pending') return <Clock className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-yellow-500" />;
      return <CalendarDays className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />;
    }
    
    switch(type) {
      case "call": return <Phone className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-green-500" />;
      case "email": return <Mail className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-blue-500" />;
      case "meeting": return <Calendar className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-purple-500" />;
      case "demo": return <Eye className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-amber-500" />;
      default: return <Bell className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-primary" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "high": return "bg-red-500 animate-pulse";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getLeaveRequestTypeBadge = (notificationType?: string) => {
    switch(notificationType) {
      case 'leave_request':
        return <Badge variant="secondary" className="text-[8px] md:text-xs bg-gradient-to-r from-indigo-500 to-purple-500 px-1.5 md:px-2 py-0 md:py-0.5">New Request</Badge>;
      case 'leave_approved':
        return <Badge variant="default" className="bg-gradient-to-r from-green-500 to-emerald-500 text-[8px] md:text-xs px-1.5 md:px-2 py-0 md:py-0.5">Approved</Badge>;
      case 'leave_rejected':
        return <Badge variant="destructive" className="bg-gradient-to-r from-red-500 to-rose-500 text-[8px] md:text-xs px-1.5 md:px-2 py-0 md:py-0.5">Rejected</Badge>;
      case 'leave_cancelled':
        return <Badge variant="outline" className="text-[8px] md:text-xs px-1.5 md:px-2 py-0 md:py-0.5">Cancelled</Badge>;
      case 'leave_pending':
        return <Badge variant="secondary" className="text-[8px] md:text-xs bg-gradient-to-r from-yellow-500 to-amber-500 px-1.5 md:px-2 py-0 md:py-0.5">Pending</Badge>;
      default:
        return null;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = getFilteredNotifications();

  const testNotification = () => {
    if (settings.desktopNotifications) {
      notificationService.showSystemNotification("Test Notification", {
        body: "This is a test notification from your CRM system.",
        icon: "/favicon.ico"
      });
      toast.success("Test notification sent! 🔔");
    } else {
      toast.error("Please enable desktop notifications first");
    }
  };
const clearAllNotifications = () => {
  if (notifications.length === 0) {
    toast.info("No notifications to clear");
    return;
  }

  if (!confirm(`Are you sure you want to delete all ${notifications.length} notifications? This cannot be undone.`)) {
    return;
  }

  try {
    // Delete each API notification (if any)
    const apiNotifications = notifications.filter(n => /^[a-fA-F0-9]{24}$/.test(n.id) || !n.id.includes('_'));
    Promise.allSettled(apiNotifications.map(n => api.deleteNotification(n.id)))
      .then(results => {
        console.log('API deletion results:', results);
      });
    
    // Clear local storage
    clearAllReadStatusFromStorage();
    
    // Remove all notifications from state
    setNotifications([]);
    
    toast.success(`Cleared ${notifications.length} notifications`);
  } catch (error) {
    console.error('Error clearing notifications:', error);
    toast.error('Failed to clear some notifications');
  }
};
  const openSiteInNewTab = (siteName?: string) => {
    if (siteName) {
      window.open(`/superadmin/sites`, '_blank');
    }
  };

  const openTaskInNewTab = (taskTitle?: string) => {
    if (taskTitle) {
      window.open(`/superadmin/tasks`, '_blank');
    }
  };

  const openInventoryInNewTab = (itemSku?: string) => {
    if (itemSku) {
      window.open(`/superadmin/inventory`, '_blank');
    }
  };

  const openMachinesInNewTab = (machineName?: string) => {
    if (machineName) {
      window.open(`/superadmin/inventory?tab=machine-statistics`, '_blank');
    }
  };

  const openLeavesInNewTab = (employeeName?: string) => {
    if (employeeName) {
      window.open(`/superadmin/hrms?tab=leave-management`, '_blank');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatLeaveDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const handleTestApiEndpoints = async () => {
    const results = await testApiEndpoints();
    toast.info(`API endpoints tested. ${results.filter(r => r.OK === '✅').length}/${results.length} working. Check console for details.`);
  };

  const handleRefresh = () => {
    fetchNotifications();
    toast.success("Refreshing notifications... 🔄");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <DashboardHeader title="Notifications" onMenuClick={handleMenuClick} />
      
      {/* Main App Sidebar - Only shown on mobile when open */}
      {mobileSidebarOpen && (
        <DashboardSidebar 
          mobileOpen={mobileSidebarOpen}
          onMobileClose={handleMobileClose}
        />
      )}
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-3 md:p-6 space-y-4 md:space-y-6"
      >
        {/* Header with Stats - Responsive */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative">
              <div className="absolute -inset-2 md:-inset-4 bg-gradient-to-r from-primary/20 to-secondary/20 blur-xl rounded-full" />
              <div className="relative flex items-center gap-1 md:gap-2 bg-background/80 backdrop-blur-sm px-2 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl border">
                <Bell className="h-4 w-4 md:h-6 md:w-6 text-primary" />
                <span className="text-sm md:text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {unreadCount} Unread
                </span>
                {newNotificationsCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <Badge 
                      variant="destructive" 
                      className="animate-pulse bg-gradient-to-r from-red-500 to-pink-500 text-[10px] md:text-xs px-1.5 md:px-2 py-0 md:py-0.5"
                    >
                      <Sparkles className="h-2 w-2 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                      {newNotificationsCount}
                    </Badge>
                  </motion.div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm text-muted-foreground">
              {!isOnline && (
                <Badge variant="outline" className="text-destructive animate-pulse text-[10px] md:text-xs px-1.5 md:px-2 py-0 md:py-0.5">
                  <AlertCircle className="h-2 w-2 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                  Offline
                </Badge>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 md:gap-1 bg-muted/50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md cursor-help">
                      <Clock className="h-2 w-2 md:h-3 md:w-3" />
                      <span className="hidden xs:inline">Last:</span> {lastChecked.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Notifications auto-refresh {autoRefresh ? 'every minute' : 'manually'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          <div className="flex gap-1 md:gap-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                className="gap-1 md:gap-2 h-7 md:h-10 text-xs md:text-sm px-2 md:px-4"
              >
                <RefreshCw className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden xs:inline">Refresh</span>
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                size="sm"
                onClick={handleMarkAllRead} 
                disabled={unreadCount === 0}
                className="bg-gradient-to-r from-primary to-secondary gap-1 md:gap-2 h-7 md:h-10 text-xs md:text-sm px-2 md:px-4"
              >
                <CheckCheck className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden xs:inline">Mark All</span>
              </Button>
            </motion.div>
          </div>
        </div>

        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center items-center py-8 md:py-12"
          >
            <div className="text-center space-y-2 md:space-y-4">
              <Loader2 className="h-8 w-8 md:h-12 md:w-12 animate-spin text-primary mx-auto" />
              <div className="space-y-1 md:space-y-2">
                <p className="text-xs md:text-sm font-medium">Loading notifications...</p>
                <Progress value={75} className="w-32 md:w-48 mx-auto h-1 md:h-2" />
                <p className="text-[10px] md:text-xs text-muted-foreground">Checking across all systems</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {/* Main Tabs Component */}
            <Tabs value={filter} onValueChange={(value) => setFilter(value as 'all' | 'unread' | 'read')} className="w-full">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-3 md:mb-4">
                <TabsList className="grid grid-cols-3 w-full sm:w-[300px] md:w-[400px] bg-gradient-to-r from-muted/50 to-background/50 backdrop-blur-sm border h-8 md:h-10">
                  <TabsTrigger value="all" className="text-xs md:text-sm px-1 md:px-2">
                    All
                    <Badge variant="outline" className="ml-1 md:ml-2 px-1 py-0 text-[8px] md:text-xs">
                      {notifications.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs md:text-sm px-1 md:px-2">
                    Unread
                    <Badge 
                      variant="default" 
                      className="ml-1 md:ml-2 px-1 py-0 text-[8px] md:text-xs bg-gradient-to-r from-primary to-secondary"
                    >
                      {notifications.filter(n => !n.read).length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="read" className="text-xs md:text-sm px-1 md:px-2">
                    Read
                    <Badge variant="outline" className="ml-1 md:ml-2 px-1 py-0 text-[8px] md:text-xs">
                      {notifications.filter(n => n.read).length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
                
                {/* Site Filter */}
                <SiteSelector />
              </div>
              
              {/* Filter Stats */}
              {selectedSite !== 'all' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] md:text-sm text-muted-foreground bg-gradient-to-r from-primary/5 to-secondary/5 p-2 md:p-3 rounded-md mb-3 md:mb-4 border"
                >
                  <div className="flex items-center gap-1 md:gap-2">
                    <Building className="h-3 w-3 md:h-4 md:w-4" />
                    <span>
                      Filtering by site: <span className="font-semibold">
                        {allSites.find(s => s._id === selectedSite)?.name}
                      </span>
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedSite('all')}
                    className="h-6 md:h-8 px-2 text-[10px] md:text-xs"
                  >
                    Clear filter
                  </Button>
                </motion.div>
              )}
              
              {/* All Tab Content */}
              <TabsContent value="all" className="mt-0">
                <NotificationList 
                  notifications={filteredNotifications}
                  filter={filter}
                  handleViewDetails={handleViewDetails}
                  handleMarkAsRead={handleMarkAsRead}
                  handleMarkAsUnread={handleMarkAsUnread}
                  handleDelete={handleDelete}
                  getCommunicationIcon={getCommunicationIcon}
                  getTypeColor={getTypeColor}
                  getPriorityColor={getPriorityColor}
                  getLeaveRequestTypeBadge={getLeaveRequestTypeBadge}
                  setFilter={setFilter}
                  handleMarkAllRead={handleMarkAllRead}
                />
              </TabsContent>
              
              {/* Unread Tab Content */}
              <TabsContent value="unread" className="mt-0">
                <NotificationList 
                  notifications={filteredNotifications.filter(n => !n.read)}
                  filter={filter}
                  handleViewDetails={handleViewDetails}
                  handleMarkAsRead={handleMarkAsRead}
                  handleMarkAsUnread={handleMarkAsUnread}
                  handleDelete={handleDelete}
                  getCommunicationIcon={getCommunicationIcon}
                  getTypeColor={getTypeColor}
                  getPriorityColor={getPriorityColor}
                  getLeaveRequestTypeBadge={getLeaveRequestTypeBadge}
                  setFilter={setFilter}
                  handleMarkAllRead={handleMarkAllRead}
                />
              </TabsContent>
              
              {/* Read Tab Content */}
              <TabsContent value="read" className="mt-0">
                <NotificationList 
                  notifications={filteredNotifications.filter(n => n.read)}
                  filter={filter}
                  handleViewDetails={handleViewDetails}
                  handleMarkAsRead={handleMarkAsRead}
                  handleMarkAsUnread={handleMarkAsUnread}
                  handleDelete={handleDelete}
                  getCommunicationIcon={getCommunicationIcon}
                  getTypeColor={getTypeColor}
                  getPriorityColor={getPriorityColor}
                  getLeaveRequestTypeBadge={getLeaveRequestTypeBadge}
                  setFilter={setFilter}
                  handleMarkAllRead={handleMarkAllRead}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] md:text-sm text-muted-foreground pt-3 md:pt-4 border-t"
        >
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1 md:gap-2">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 animate-pulse" />
              <span>High</span>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-yellow-500" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500" />
              <span>Low</span>
            </div>
            {selectedSite !== 'all' && (
              <div className="flex items-center gap-1 md:gap-2 ml-0 sm:ml-4">
                <Building className="h-2.5 w-2.5 md:h-3 md:w-3" />
                <span className="font-medium text-[10px] md:text-xs">
                  {allSites.find(s => s._id === selectedSite)?.name}
                </span>
              </div>
            )}
          </div>
          <div className="text-[10px] md:text-xs">
            {`Showing ${filteredNotifications.length} of ${notifications.length}`}
            {selectedSite !== 'all' && ` (Filtered)`}
          </div>
        </motion.div>
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Notification Details</DialogTitle>
          </DialogHeader>
          {viewNotification && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 md:space-y-4"
            >
              <div className="flex flex-wrap items-center gap-1 md:gap-2">
                {getCommunicationIcon(viewNotification.communicationType, viewNotification.notificationType)}
                <h3 className="text-sm md:text-lg font-semibold">{viewNotification.title}</h3>
                <Badge variant={getTypeColor(viewNotification.type)} className="text-[10px] md:text-xs">
                  {viewNotification.type}
                </Badge>
                <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${getPriorityColor(viewNotification.priority)}`} />
              </div>
              
              {viewNotification.notificationType?.includes('site_') ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                  {viewNotification.siteName && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Site Name</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.siteName}</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto text-[10px] md:text-xs"
                        onClick={() => openSiteInNewTab(viewNotification.siteName)}
                      >
                        View Sites →
                      </Button>
                    </div>
                  )}
                  {viewNotification.clientName && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Client</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.clientName}</p>
                    </div>
                  )}
                  {viewNotification.location && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Location</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.location}</p>
                    </div>
                  )}
                  {viewNotification.oldStatus && viewNotification.newStatus && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Status Change</h4>
                      <p className="text-xs md:text-sm font-medium">
                        <Badge variant="outline" className="mr-1 md:mr-2 text-[8px] md:text-xs">{viewNotification.oldStatus}</Badge>
                        →
                        <Badge variant="outline" className="ml-1 md:ml-2 text-[8px] md:text-xs">{viewNotification.newStatus}</Badge>
                      </p>
                    </div>
                  )}
                  {viewNotification.createdAt && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Created</h4>
                      <p className="text-xs md:text-sm font-medium">{new Date(viewNotification.createdAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              ) : viewNotification.notificationType?.includes('task_') ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                  {viewNotification.taskTitle && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Task Title</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.taskTitle}</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto text-[10px] md:text-xs"
                        onClick={() => openTaskInNewTab(viewNotification.taskTitle)}
                      >
                        View Tasks →
                      </Button>
                    </div>
                  )}
                  {viewNotification.taskAssignee && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Assignee</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.taskAssignee}</p>
                    </div>
                  )}
                  {viewNotification.siteName && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Site</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.siteName}</p>
                    </div>
                  )}
                  {viewNotification.taskPriority && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Priority</h4>
                      <Badge variant={getTypeColor(viewNotification.type)} className="text-[8px] md:text-xs">
                        {viewNotification.taskPriority}
                      </Badge>
                    </div>
                  )}
                  {viewNotification.taskStatus && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Status</h4>
                      <Badge variant="outline" className="text-[8px] md:text-xs">
                        {viewNotification.taskStatus}
                      </Badge>
                    </div>
                  )}
                  {viewNotification.createdAt && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Created</h4>
                      <p className="text-xs md:text-sm font-medium">{new Date(viewNotification.createdAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              ) : viewNotification.notificationType?.includes('inventory_') ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                  {viewNotification.itemName && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Item Name</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.itemName}</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto text-[10px] md:text-xs"
                        onClick={() => openInventoryInNewTab(viewNotification.itemSku)}
                      >
                        View Inventory →
                      </Button>
                    </div>
                  )}
                  {viewNotification.itemSku && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">SKU</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.itemSku}</p>
                    </div>
                  )}
                  {viewNotification.currentQuantity !== undefined && viewNotification.reorderLevel !== undefined && (
                    <div className="col-span-1 sm:col-span-2">
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Stock Level</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="flex justify-between text-[10px] md:text-xs mb-0.5 md:mb-1">
                            <span>Current: {viewNotification.currentQuantity}</span>
                            <span>Reorder: {viewNotification.reorderLevel}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 md:h-2">
                            <div 
                              className={`h-1.5 md:h-2 rounded-full ${
                                viewNotification.currentQuantity === 0 ? 'bg-red-500' :
                                viewNotification.currentQuantity <= Math.floor(viewNotification.reorderLevel * 0.3) ? 'bg-orange-500' :
                                viewNotification.currentQuantity <= viewNotification.reorderLevel ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{
                                width: `${Math.min(100, (viewNotification.currentQuantity / (viewNotification.reorderLevel * 2)) * 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {viewNotification.department && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Department</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.department}</p>
                    </div>
                  )}
                  {viewNotification.supplier && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Supplier</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.supplier}</p>
                    </div>
                  )}
                  {viewNotification.siteName && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Site</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.siteName}</p>
                    </div>
                  )}
                  {viewNotification.createdAt && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Created</h4>
                      <p className="text-xs md:text-sm font-medium">{new Date(viewNotification.createdAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              ) : viewNotification.notificationType?.includes('machine_') ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                  {viewNotification.machineName && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Machine Name</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.machineName}</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto text-[10px] md:text-xs"
                        onClick={() => openMachinesInNewTab(viewNotification.machineName)}
                      >
                        View Machines →
                      </Button>
                    </div>
                  )}
                  {viewNotification.machineModel && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Model</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.machineModel}</p>
                    </div>
                  )}
                  {viewNotification.machineStatus && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Status</h4>
                      <Badge className={`
                        text-[8px] md:text-xs px-1.5 md:px-2 py-0 md:py-0.5
                        ${viewNotification.machineStatus === 'operational' ? 'bg-green-100 text-green-800' : 
                          viewNotification.machineStatus === 'maintenance' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'} border-0`}
                      >
                        {viewNotification.machineStatus}
                      </Badge>
                    </div>
                  )}
                  {viewNotification.nextMaintenanceDate && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Next Maintenance</h4>
                      <p className="text-xs md:text-sm font-medium">{formatDate(viewNotification.nextMaintenanceDate)}</p>
                    </div>
                  )}
                  {viewNotification.createdAt && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Created</h4>
                      <p className="text-xs md:text-sm font-medium">{new Date(viewNotification.createdAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              ) : viewNotification.notificationType?.includes('leave_') ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                  {viewNotification.employeeName && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Employee Name</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.employeeName}</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto text-[10px] md:text-xs"
                        onClick={() => openLeavesInNewTab(viewNotification.employeeName)}
                      >
                        View Leaves →
                      </Button>
                    </div>
                  )}
                  {viewNotification.employeeId && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Employee ID</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.employeeId}</p>
                    </div>
                  )}
                  {viewNotification.leaveType && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Leave Type</h4>
                      <Badge variant="outline" className="text-[8px] md:text-xs capitalize">
                        {viewNotification.leaveType}
                      </Badge>
                    </div>
                  )}
                  {viewNotification.leaveRequestType && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Request Type</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.leaveRequestType}</p>
                    </div>
                  )}
                  {viewNotification.leaveDepartment && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Department</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.leaveDepartment}</p>
                    </div>
                  )}
                  {viewNotification.leaveFromDate && viewNotification.leaveToDate && (
                    <div className="col-span-1 sm:col-span-2">
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Leave Dates</h4>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 md:gap-4">
                        <div className="flex items-center gap-1 md:gap-2">
                          <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                          <span className="text-xs md:text-sm">{formatLeaveDate(viewNotification.leaveFromDate)}</span>
                        </div>
                        <span className="hidden sm:inline">to</span>
                        <div className="flex items-center gap-1 md:gap-2">
                          <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                          <span className="text-xs md:text-sm">{formatLeaveDate(viewNotification.leaveToDate)}</span>
                        </div>
                        {viewNotification.leaveTotalDays && (
                          <Badge variant="secondary" className="ml-0 sm:ml-auto text-[8px] md:text-xs">
                            {viewNotification.leaveTotalDays} days
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {viewNotification.leaveStatus && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Status</h4>
                      <Badge variant={
                        viewNotification.leaveStatus === 'approved' ? 'default' :
                        viewNotification.leaveStatus === 'rejected' ? 'destructive' :
                        viewNotification.leaveStatus === 'pending' ? 'secondary' :
                        'outline'
                      } className="text-[8px] md:text-xs capitalize">
                        {viewNotification.leaveStatus}
                      </Badge>
                    </div>
                  )}
                  {viewNotification.leaveApprovedBy && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Approved By</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.leaveApprovedBy}</p>
                    </div>
                  )}
                  {viewNotification.leaveRejectedBy && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Rejected By</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.leaveRejectedBy}</p>
                    </div>
                  )}
                  {viewNotification.createdAt && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Created</h4>
                      <p className="text-xs md:text-sm font-medium">{new Date(viewNotification.createdAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                  {viewNotification.clientName && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Client</h4>
                      <p className="text-xs md:text-sm font-medium">{viewNotification.clientName}</p>
                    </div>
                  )}
                  {viewNotification.followUpDate && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Follow-up Date</h4>
                      <div className="flex items-center gap-0.5 md:gap-1">
                        <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                        <span className="text-xs md:text-sm font-medium">{viewNotification.followUpDate}</span>
                      </div>
                    </div>
                  )}
                  {viewNotification.communicationType && (
                    <div>
                      <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Type</h4>
                      <p className="text-xs md:text-sm font-medium capitalize">{viewNotification.communicationType}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Received</h4>
                    <p className="text-xs md:text-sm font-medium">{viewNotification.time}</p>
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Message</h4>
                <div className="p-2 md:p-3 border rounded-md bg-muted/50">
                  <p className="text-xs md:text-sm">{viewNotification.message}</p>
                </div>
              </div>
              
              {viewNotification.notes && (
                <div>
                  <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Notes</h4>
                  <div className="p-2 md:p-3 border rounded-md bg-muted/50">
                    <p className="text-xs md:text-sm">{viewNotification.notes}</p>
                  </div>
                </div>
              )}
              
              {viewNotification.leaveReason && (
                <div>
                  <h4 className="font-medium text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Leave Reason</h4>
                  <div className="p-2 md:p-3 border rounded-md bg-muted/50">
                    <p className="text-xs md:text-sm">{viewNotification.leaveReason}</p>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2 pt-2 md:pt-4">
                {!viewNotification.read ? (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      handleMarkAsRead(viewNotification.id);
                      setDialogOpen(false);
                    }}
                    className="flex-1 text-xs md:text-sm h-8 md:h-10"
                  >
                    Mark as Read
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      handleMarkAsUnread(viewNotification.id);
                      setDialogOpen(false);
                    }}
                    className="flex-1 text-xs md:text-sm h-8 md:h-10"
                  >
                    Mark as Unread
                  </Button>
                )}
                {viewNotification.notificationType?.includes('site_') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      openSiteInNewTab(viewNotification.siteName);
                      setDialogOpen(false);
                    }}
                    className="flex-1 text-xs md:text-sm h-8 md:h-10"
                  >
                    View Sites
                  </Button>
                )}
                {viewNotification.notificationType?.includes('task_') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      openTaskInNewTab(viewNotification.taskTitle);
                      setDialogOpen(false);
                    }}
                    className="flex-1 text-xs md:text-sm h-8 md:h-10"
                  >
                    View Tasks
                  </Button>
                )}
                {viewNotification.notificationType?.includes('inventory_') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      openInventoryInNewTab(viewNotification.itemSku);
                      setDialogOpen(false);
                    }}
                    className="flex-1 text-xs md:text-sm h-8 md:h-10"
                  >
                    View Inventory
                  </Button>
                )}
                {viewNotification.notificationType?.includes('machine_') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      openMachinesInNewTab(viewNotification.machineName);
                      setDialogOpen(false);
                    }}
                    className="flex-1 text-xs md:text-sm h-8 md:h-10"
                  >
                    View Machines
                  </Button>
                )}
                {viewNotification.notificationType?.includes('leave_') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      openLeavesInNewTab(viewNotification.employeeName);
                      setDialogOpen(false);
                    }}
                    className="flex-1 text-xs md:text-sm h-8 md:h-10"
                  >
                    View Leaves
                  </Button>
                )}
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    handleDelete(viewNotification.id);
                    setDialogOpen(false);
                  }}
                  className="flex-1 text-xs md:text-sm h-8 md:h-10"
                >
                  <Trash2 className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                  Delete
                </Button>
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notifications;