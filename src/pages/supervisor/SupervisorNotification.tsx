// pages/supervisor/SupervisorNotification.tsx
import { useState, useEffect, useMemo } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  BellRing,
  Building,
  Calendar,
  CheckCheck,
  CheckCircle,
  ChevronDown,
  Clock,
  FileText,
  Filter,
  FilterX,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Target,
  Trash2,
  User,
  Users,
  X,
  XCircle,
  Eye,
  Download,
  ArrowRight,
  UserCheck,
  UserX,
  AlertOctagon,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Zap,
  TrendingUp,
  BarChart3,
  Activity,
  Shield
} from "lucide-react";
import taskService, { Task } from "@/services/TaskService";
import { useRole } from "@/context/RoleContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

// Types for notifications
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'task' | 'leave' | 'system' | 'approval' | 'site' | 'inventory';
  timestamp: string;
  isRead: boolean;
  metadata?: {
    // Task properties
    taskId?: string;
    taskTitle?: string;
    description?: string;
    assignedTo?: string;
    assignedToName?: string;
    priority?: string;
    status?: string;
    siteId?: string;
    siteName?: string;
    clientName?: string;
    deadline?: string;
    createdAt?: string;
    isAssignedToMe?: boolean;
    isCreatedByMe?: boolean;
    requiresAction?: boolean;
    action?: 'assigned' | 'updated' | 'completed' | 'cancelled';
    
    // Leave properties
    leaveId?: string;
    employeeName?: string;
    employeeId?: string;
    department?: string;
    leaveType?: string;
    fromDate?: string;
    toDate?: string;
    totalDays?: number;
    reason?: string;
    status?: 'pending' | 'approved' | 'rejected';
    appliedBy?: string;
    appliedFor?: string;
    isSupervisorLeave?: boolean;
    supervisorId?: string;
    managerName?: string;
    managerId?: string;
    approvalDate?: string;
    rejectionReason?: string;
    
    // Site properties
    location?: string;
    areaSqft?: number;
    contractValue?: number;
    services?: string[];
    totalStaff?: number;
    
    // Common properties
    userId?: string;
    [key: string]: any;
  };
}

// Types for leaves
interface LeaveNotificationItem {
  _id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  site: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedBy: string;
  appliedFor: string;
  createdAt: string;
  updatedAt: string;
  isSupervisorLeave?: boolean;
  supervisorId?: string;
  notificationType: 'leave_approval' | 'leave_rejection' | 'leave_status_update';
  managerName?: string;
  managerId?: string;
  approvalDate?: string;
  rejectionReason?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');
// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
};

const slideIn = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

const pulseAnimation = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: "reverse" as const
    }
  }
};

const SupervisorNotification = () => {
  const { user: currentUser } = useRole();
  
  // State management
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaveNotifications, setLeaveNotifications] = useState<LeaveNotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState("notifications");
  const [viewNotification, setViewNotification] = useState<NotificationItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showReadNotifications, setShowReadNotifications] = useState(true);
  const [isHoveredId, setIsHoveredId] = useState<string | null>(null);
  
  // Format date
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Format date time
  const formatDateTime = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format timestamp for notifications
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return "Recently";
    }
  };

  // Format time with relative format
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch all data
  const fetchAllData = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    setIsRefreshing(true);
    try {
      // Fetch all data in parallel
      const [tasksData, leavesData] = await Promise.allSettled([
        fetchTasks(),
        fetchLeaveNotifications()
      ]);

      // Process tasks into notifications
      const taskNotifications = tasksData.status === 'fulfilled' 
        ? convertTasksToNotifications(tasksData.value)
        : [];

      // Process leaves into notifications
      const leaveNotificationItems = leavesData.status === 'fulfilled'
        ? convertLeavesToNotifications(leavesData.value)
        : [];

      // Combine all notifications
      const allNotifications = [
        ...taskNotifications,
        ...leaveNotificationItems,
      ];

      // Sort by timestamp (newest first)
      allNotifications.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setNotifications(allNotifications);
      
      // Show toast with counts
      const newNotifications = allNotifications.filter(n => !n.isRead).length;
      if (newNotifications > 0) {
        toast({
          title: "✨ New notifications",
          description: `You have ${newNotifications} unread notifications`,
          duration: 3000,
        });
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error fetching notifications",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchTasks = async (): Promise<Task[]> => {
    if (!currentUser) return [];
    
    try {
      // Fetch all tasks first
      const allTasks = await taskService.getAllTasks();
      
      // Filter tasks relevant to supervisor
      const supervisorTasks = allTasks.filter(task => {
        // Supervisor can see tasks if:
        // 1. Task is assigned to them
        const isAssignedToMe = task.assignedTo === currentUser._id;
        
        // 2. Task is on their site
        const isOnMySite = currentUser.site && 
          (task.siteName === currentUser.site || 
           (Array.isArray(currentUser.site) && currentUser.site.includes(task.siteName)));
        
        // 3. Task is created by them
        const isCreatedByMe = task.createdBy === currentUser._id;
        
        return isAssignedToMe || isOnMySite || isCreatedByMe;
      });
      
      setTasks(supervisorTasks);
      return supervisorTasks;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  };

  const fetchLeaveNotifications = async (): Promise<LeaveNotificationItem[]> => {
    if (!currentUser) return [];
    
    try {
      // Use the same endpoint that works in Leave.tsx component
      const url = `${API_URL}/leaves/supervisor?department=${encodeURIComponent(currentUser.department || '')}&site=${encodeURIComponent(currentUser.site || '')}&includeSupervisorLeaves=true&supervisorId=${currentUser._id}`;
      
      console.log("📡 Fetching leaves for supervisor notifications:", url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sk_token')}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch leaves for notifications:", response.status, errorText);
        
        // Try alternative approach - fetch all leaves and filter
        console.log("🔄 Trying alternative approach...");
        return await fetchLeaveNotificationsAlternative();
      }
      
      const data = await response.json();
      console.log("✅ Leaves data received for notifications:", data.length, "leaves");
      
      // Filter only approved/rejected leaves (for notifications)
      const notificationLeaves = data.filter((leave: any) => 
        leave.status === 'approved' || leave.status === 'rejected'
      );
      
      // Transform to LeaveNotificationItem format
      const formattedLeaves: LeaveNotificationItem[] = notificationLeaves.map((leave: any) => ({
        _id: leave._id,
        employeeId: leave.employeeId,
        employeeName: leave.employeeName,
        department: leave.department,
        site: leave.site,
        leaveType: leave.leaveType,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        totalDays: leave.totalDays,
        reason: leave.reason,
        status: leave.status,
        appliedBy: leave.appliedBy,
        appliedFor: leave.appliedFor,
        createdAt: leave.createdAt,
        updatedAt: leave.updatedAt || leave.createdAt,
        isSupervisorLeave: leave.isSupervisorLeave || false,
        supervisorId: leave.supervisorId,
        notificationType: leave.status === 'approved' ? 'leave_approval' : 'leave_rejection',
        managerName: leave.managerName || 'Site Manager',
        managerId: leave.managerId,
        approvalDate: leave.approvalDate || leave.updatedAt,
        rejectionReason: leave.rejectionReason || ''
      }));
      
      setLeaveNotifications(formattedLeaves);
      return formattedLeaves;
    } catch (error) {
      console.error('Error fetching leave notifications:', error);
      
      // Fallback: Try alternative approach
      return await fetchLeaveNotificationsAlternative();
    }
  };

  const fetchLeaveNotificationsAlternative = async (): Promise<LeaveNotificationItem[]> => {
    if (!currentUser) return [];
    
    try {
      console.log("🔄 Alternative: Fetching all leaves...");
      const url = `${API_URL}/leaves`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sk_token')}`
        }
      });
      
      if (!response.ok) {
        console.error("Alternative leaves fetch failed:", response.status);
        return [];
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.error("Unexpected response format:", data);
        return [];
      }
      
      console.log(`📊 Found ${data.length} total leaves`);
      
      // Filter leaves relevant to supervisor:
      // 1. Leaves where supervisor is the applicant (appliedBy contains supervisor name)
      // 2. Leaves in supervisor's department
      // 3. Supervisor's own leaves
      const supervisorLeaves = data.filter((leave: any) => {
        // Check if leave is in supervisor's department and site
        const isInMyDepartment = currentUser.department && leave.department === currentUser.department;
        const isAtMySite = currentUser.site && leave.site === currentUser.site;
        const isAppliedByMe = leave.appliedBy === currentUser.name;
        const isMyOwnLeave = leave.employeeId === currentUser.employeeId || 
                            (leave.isSupervisorLeave && leave.supervisorId === currentUser._id);
        
        // Also check if it's a leave that supervisor applied for someone else
        const isAppliedBySupervisor = leave.appliedBy && leave.appliedBy.includes(currentUser.name);
        
        return (isInMyDepartment && isAtMySite) || isAppliedByMe || isMyOwnLeave || isAppliedBySupervisor;
      });
      
      console.log(`✅ Filtered ${supervisorLeaves.length} relevant leaves`);
      
      // Filter only approved/rejected leaves (for notifications)
      const notificationLeaves = supervisorLeaves.filter((leave: any) => 
        leave.status === 'approved' || leave.status === 'rejected'
      );
      
      console.log(`📨 Found ${notificationLeaves.length} approved/rejected leaves for notifications`);
      
      // Transform to LeaveNotificationItem format
      const formattedLeaves: LeaveNotificationItem[] = notificationLeaves.map((leave: any) => ({
        _id: leave._id,
        employeeId: leave.employeeId,
        employeeName: leave.employeeName,
        department: leave.department,
        site: leave.site,
        leaveType: leave.leaveType,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        totalDays: leave.totalDays,
        reason: leave.reason,
        status: leave.status,
        appliedBy: leave.appliedBy,
        appliedFor: leave.appliedFor,
        createdAt: leave.createdAt,
        updatedAt: leave.updatedAt || leave.createdAt,
        isSupervisorLeave: leave.isSupervisorLeave || false,
        supervisorId: leave.supervisorId,
        notificationType: leave.status === 'approved' ? 'leave_approval' : 'leave_rejection',
        managerName: leave.managerName || 'Site Manager',
        managerId: leave.managerId,
        approvalDate: leave.approvalDate || leave.updatedAt,
        rejectionReason: leave.rejectionReason || ''
      }));
      
      setLeaveNotifications(formattedLeaves);
      return formattedLeaves;
    } catch (error) {
      console.error('Error in alternative leave fetch:', error);
      return [];
    }
  };

  const convertTasksToNotifications = (tasks: Task[]): NotificationItem[] => {
    return tasks.map(task => {
      const isAssignedToMe = task.assignedTo === currentUser?._id;
      const isCreatedByMe = task.createdBy === currentUser?._id;
      
      let title = "";
      let message = "";
      let action: 'assigned' | 'updated' | 'completed' | 'cancelled' = 'assigned';
      
      if (isAssignedToMe && !isCreatedByMe) {
        // Task assigned to supervisor by someone else
        title = "New Task Assigned to You";
        message = `You have been assigned a new task: ${task.title}`;
        action = 'assigned';
      } else if (isCreatedByMe) {
        // Task created by supervisor
        title = "Task Created";
        message = `You created a task for ${task.assignedToName}: ${task.title}`;
        action = 'assigned';
      } else if (task.status === 'completed') {
        // Task completed notification
        title = "Task Completed";
        message = `${task.assignedToName} has completed task: ${task.title}`;
        action = 'completed';
      } else if (task.status === 'cancelled') {
        // Task cancelled notification
        title = "Task Cancelled";
        message = `Task has been cancelled: ${task.title}`;
        action = 'cancelled';
      } else {
        // General task update
        title = "Task Updated";
        message = `Task "${task.title}" has been updated`;
        action = 'updated';
      }
      
      return {
        id: `task_${task._id}`,
        title,
        message,
        timestamp: task.updatedAt || task.createdAt,
        isRead: false,
        type: 'task' as const,
        metadata: {
          status: task.status,
          taskId: task._id,
          taskTitle: task.title,
          description: task.description,
          assignedTo: task.assignedTo,
          assignedToName: task.assignedToName,
          priority: task.priority,
          siteId: task.siteId,
          siteName: task.siteName,
          clientName: task.clientName,
          deadline: task.deadline,
          createdAt: task.createdAt,
          isAssignedToMe,
          isCreatedByMe,
          requiresAction: task.status === "pending" && task.assignedTo === currentUser?._id,
          action
        }
      };
    });
  };

  const convertLeavesToNotifications = (leaves: LeaveNotificationItem[]): NotificationItem[] => {
    return leaves.map(leave => {
      const isSupervisorLeave = leave.isSupervisorLeave || leave.supervisorId === currentUser?._id;
      const isForTeamMember = leave.appliedBy === currentUser?.name || leave.appliedFor === currentUser?.employeeId;
      
      let title = "";
      let message = "";
      
      if (leave.status === 'approved') {
        if (isSupervisorLeave) {
          // Supervisor's own leave approved
          title = "Your Leave Request Approved";
          message = `Your ${leave.leaveType} leave from ${formatDate(leave.fromDate)} to ${formatDate(leave.toDate)} has been approved`;
        } else if (isForTeamMember) {
          // Leave for team member approved
          title = "Team Member Leave Approved";
          message = `${leave.employeeName}'s ${leave.leaveType} leave has been approved`;
        } else {
          // General leave approval
          title = "Leave Request Approved";
          message = `${leave.employeeName}'s ${leave.leaveType} leave request has been approved`;
        }
      } else if (leave.status === 'rejected') {
        if (isSupervisorLeave) {
          // Supervisor's own leave rejected
          title = "Your Leave Request Rejected";
          message = `Your ${leave.leaveType} leave from ${formatDate(leave.fromDate)} to ${formatDate(leave.toDate)} has been rejected`;
        } else if (isForTeamMember) {
          // Leave for team member rejected
          title = "Team Member Leave Rejected";
          message = `${leave.employeeName}'s ${leave.leaveType} leave has been rejected`;
        } else {
          // General leave rejection
          title = "Leave Request Rejected";
          message = `${leave.employeeName}'s ${leave.leaveType} leave request has been rejected`;
        }
      } else {
        // Pending status (usually shouldn't be in notifications)
        title = "Leave Request Status Updated";
        message = `${leave.employeeName}'s leave request status has been updated`;
      }
      
      return {
        id: `leave_${leave._id}`,
        title,
        message,
        timestamp: leave.updatedAt || leave.createdAt,
        isRead: false,
        type: 'leave' as const,
        metadata: {
          status: leave.status,
          leaveId: leave._id,
          employeeId: leave.employeeId,
          employeeName: leave.employeeName,
          department: leave.department,
          leaveType: leave.leaveType,
          fromDate: leave.fromDate,
          toDate: leave.toDate,
          totalDays: leave.totalDays,
          reason: leave.reason,
          appliedBy: leave.appliedBy,
          appliedFor: leave.appliedFor,
          isSupervisorLeave,
          supervisorId: leave.supervisorId,
          managerName: leave.managerName || 'Site Manager',
          managerId: leave.managerId,
          approvalDate: leave.approvalDate,
          rejectionReason: leave.rejectionReason,
          createdAt: leave.createdAt,
          updatedAt: leave.updatedAt
        }
      };
    });
  };

  // Initialize data
  useEffect(() => {
    if (!currentUser) return;
    
    fetchAllData();
    
    // Set up interval to refresh notifications every 30 seconds
    const interval = setInterval(() => {
      fetchAllData();
    }, 300000);
    
    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllData();
    setIsRefreshing(false);
    
    toast({
      title: "Refreshed",
      description: "All data refreshed successfully",
    });
  };

  // Mark notification as read
  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif => notif.id === id ? { ...notif, isRead: true } : notif)
    );
    toast({
      title: "Marked as read",
      description: "Notification has been marked as read",
    });
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = () => {
    const unreadNotifications = notifications.filter(n => !n.isRead);
    
    if (unreadNotifications.length > 0) {
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
      toast({
        title: "Success",
        description: `Marked ${unreadNotifications.length} notifications as read`,
      });
    }
  };

  // Delete notification
  const handleDelete = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    toast({
      title: "Deleted",
      description: "Notification has been deleted",
    });
  };

  // Clear all notifications
  const handleClearAll = () => {
    if (notifications.length === 0) {
      toast({
        title: "No notifications",
        description: "There are no notifications to clear",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Are you sure you want to clear all ${notifications.length} notifications?`)) {
      setNotifications([]);
      toast({
        title: "Cleared",
        description: `${notifications.length} notifications cleared`,
      });
    }
  };

  // Export notifications
  const handleExportNotifications = () => {
    try {
      const dataStr = JSON.stringify(notifications, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `supervisor-notifications-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast({
        title: "Notifications exported",
        description: `Downloaded ${notifications.length} notifications`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export notifications",
        variant: "destructive",
      });
    }
  };

  // View notification details
  const handleViewDetails = (notification: NotificationItem) => {
    setViewNotification(notification);
    setDialogOpen(true);
    
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
  };

  // Get type icon
  const getTypeIcon = (type: string, isRead: boolean = false) => {
    const iconClass = cn("h-5 w-5", isRead ? "text-muted-foreground" : "");
    switch (type) {
      case "task": return <Target className={iconClass} />;
      case "leave": return <Calendar className={iconClass} />;
      case "approval": return <CheckCircle className={iconClass} />;
      case "site": return <Building className={iconClass} />;
      case "inventory": return <Package className={iconClass} />;
      case "system": return <Bell className={iconClass} />;
      default: return <Bell className={iconClass} />;
    }
  };

  // Get animated icon for type
  const getAnimatedIcon = (type: string, isUnread: boolean = false) => {
    const baseClass = "h-6 w-6";
    if (isUnread) {
      return (
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
        >
          {getTypeIcon(type, false)}
        </motion.div>
      );
    }
    return getTypeIcon(type, false);
  };

  // Get unread count
  const getUnreadCount = (): number => {
    return notifications.filter(n => !n.isRead).length;
  };

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    
    // Apply type filter
    if (filter !== "all") {
      if (filter === "unread") {
        filtered = filtered.filter(notification => !notification.isRead);
      } else {
        filtered = filtered.filter(notification => notification.type === filter);
      }
    }
    
    // Apply search query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(notification => {
        if (notification.title.toLowerCase().includes(lowerQuery) ||
            notification.message.toLowerCase().includes(lowerQuery)) {
          return true;
        }

        const metadata = notification.metadata || {};
        
        // Check metadata fields
        if ((metadata.siteName?.toLowerCase() || '').includes(lowerQuery) ||
            (metadata.employeeName?.toLowerCase() || '').includes(lowerQuery) ||
            (metadata.assignedToName?.toLowerCase() || '').includes(lowerQuery) ||
            (metadata.department?.toLowerCase() || '').includes(lowerQuery) ||
            (metadata.leaveType?.toLowerCase() || '').includes(lowerQuery)) {
          return true;
        }

        return false;
      });
    }
    
    return filtered;
  }, [notifications, filter, searchQuery]);

  // Filter tasks based on selected site
  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    
    // Filter by search query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(lowerQuery) ||
        task.description.toLowerCase().includes(lowerQuery) ||
        task.siteName.toLowerCase().includes(lowerQuery) ||
        task.assignedToName.toLowerCase().includes(lowerQuery)
      );
    }
    
    return filtered;
  }, [tasks, searchQuery]);

  // Filter leaves
  const filteredLeaves = useMemo(() => {
    const leaves = notifications.filter(n => n.type === 'leave');
    
    // Filter by search query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      return leaves.filter(leave => {
        const metadata = leave.metadata || {};
        return (
          leave.title.toLowerCase().includes(lowerQuery) ||
          leave.message.toLowerCase().includes(lowerQuery) ||
          (metadata.employeeName?.toLowerCase() || '').includes(lowerQuery) ||
          (metadata.leaveType?.toLowerCase() || '').includes(lowerQuery) ||
          (metadata.department?.toLowerCase() || '').includes(lowerQuery)
        );
      });
    }
    
    return leaves;
  }, [notifications, searchQuery]);

  const unreadCount = getUnreadCount();
  const totalCount = notifications.length;
  const taskCount = notifications.filter(n => n.type === 'task').length;
  const leaveCount = notifications.filter(n => n.type === 'leave').length;
  const approvedCount = notifications.filter(n => n.metadata?.status === 'approved').length;
  const rejectedCount = notifications.filter(n => n.metadata?.status === 'rejected').length;

  // Get filter label for dropdown
  const getFilterLabel = () => {
    switch (filter) {
      case "all": return "All Notifications";
      case "unread": return "Unread Only";
      case "task": return "Tasks";
      case "leave": return "Leave";
      case "approval": return "Approvals";
      case "site": return "Site Updates";
      case "system": return "System";
      default: return "All Notifications";
    }
  };

  // Get type count for dropdown badge
  const getTypeCount = (type: string) => {
    return notifications.filter(n => n.type === type).length;
  };

  // Get priority badge color
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in-progress': return 'secondary';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilter("all");
    setSearchQuery("");
    
    toast({
      title: "Filters cleared",
      description: "All filters have been cleared",
    });
  };

  // Enhanced stats calculation
  const stats = useMemo(() => {
    const unread = notifications.filter(n => !n.isRead).length;
    const total = notifications.length;
    const tasksCount = notifications.filter(n => n.type === 'task').length;
    const leavesCount = notifications.filter(n => n.type === 'leave').length;
    const approvalCount = notifications.filter(n => n.type === 'approval').length;
    const urgentCount = notifications.filter(n => 
      n.type === 'task' && n.metadata?.priority === 'urgent'
    ).length;
    
    return {
      unread,
      total,
      tasksCount,
      leavesCount,
      approvalCount,
      urgentCount,
      readPercentage: total > 0 ? Math.round((total - unread) / total * 100) : 0
    };
  }, [notifications]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <DashboardHeader 
        title="Supervisor Dashboard" 
        subtitle="Track all your task and leave notifications"
        actions={
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-2"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="relative overflow-hidden"
            >
              <motion.div
                animate={{ rotate: isRefreshing ? 360 : 0 }}
                transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0 }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
              </motion.div>
              Refresh All
            </Button>
          </motion.div>
        }
      />

      <div className="p-6 space-y-6">

        {/* Tabs for different sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <TabsList className="grid grid-cols-4 w-full sm:w-auto bg-muted/50 backdrop-blur-sm">
              <TabsTrigger 
                value="notifications" 
                className="flex items-center gap-2 relative data-[state=active]:bg-background"
              >
                <Bell className="h-4 w-4" />
                Notifications
                {unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1"
                  >
                    <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </Badge>
                  </motion.div>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="tasks" 
                className="flex items-center gap-2 data-[state=active]:bg-background"
              >
                <Target className="h-4 w-4" />
                Tasks
                {tasks.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                    {tasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="leaves" 
                className="flex items-center gap-2 data-[state=active]:bg-background"
              >
                <Calendar className="h-4 w-4" />
                Leaves
                {leaveNotifications.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                    {leaveNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="approvals" 
                className="flex items-center gap-2 data-[state=active]:bg-background"
              >
                <CheckCircle className="h-4 w-4" />
                Approvals
                {approvedCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                    {approvedCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            {/* Clear Filters Button */}
            {(filter !== "all" || searchQuery) && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="gap-2"
                >
                  <FilterX className="h-4 w-4" />
                  Clear Filters
                </Button>
              </motion.div>
            )}
          </motion.div>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <motion.div
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.4 }}
            >
              <Card className="border-primary/20 shadow-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
                <CardHeader className="pb-3 relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        className="p-2 bg-gradient-to-br from-primary to-primary/70 rounded-lg shadow-md"
                      >
                        <Bell className="h-6 w-6 text-primary-foreground" />
                      </motion.div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Notification Center
                          <motion.span
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-sm font-normal text-primary"
                          >
                            <Sparkles className="h-4 w-4 inline mr-1" />
                            Live Updates
                          </motion.span>
                        </CardTitle>
                        <CardDescription>
                          Real-time updates for your tasks and leave requests
                        </CardDescription>
                      </div>
                      {unreadCount > 0 && (
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Badge variant="destructive" className="ml-2">
                            {unreadCount} New
                          </Badge>
                        </motion.div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {/* Filter Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2 relative">
                            <Filter className="h-4 w-4" />
                            {getFilterLabel()}
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Filter Notifications</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem 
                              onClick={() => setFilter("all")} 
                              className="cursor-pointer flex items-center justify-between hover:bg-primary/5"
                            >
                              <div className="flex items-center">
                                <Bell className="mr-2 h-4 w-4" />
                                <span>All Notifications</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {notifications.length}
                              </Badge>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setFilter("unread")} 
                              className="cursor-pointer flex items-center justify-between hover:bg-primary/5"
                            >
                              <div className="flex items-center">
                                <BellRing className="mr-2 h-4 w-4" />
                                <span>Unread Only</span>
                              </div>
                              {unreadCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {unreadCount}
                                </Badge>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>By Type</DropdownMenuLabel>
                          <DropdownMenuGroup>
                            <DropdownMenuItem 
                              onClick={() => setFilter("task")} 
                              className="cursor-pointer flex items-center justify-between hover:bg-primary/5"
                            >
                              <div className="flex items-center">
                                <Target className="mr-2 h-4 w-4" />
                                <span>Tasks</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {getTypeCount("task")}
                              </Badge>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setFilter("leave")} 
                              className="cursor-pointer flex items-center justify-between hover:bg-primary/5"
                            >
                              <div className="flex items-center">
                                <Calendar className="mr-2 h-4 w-4" />
                                <span>Leave</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {getTypeCount("leave")}
                              </Badge>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Action Buttons */}
                      {unreadCount > 0 && (
                        <Button onClick={handleMarkAllAsRead} variant="outline" size="sm" className="gap-2">
                          <CheckCheck className="h-4 w-4" />
                          Mark All Read
                        </Button>
                      )}
                      {totalCount > 0 && (
                        <>
                          <Button onClick={handleExportNotifications} variant="outline" size="sm" className="gap-2">
                            <Download className="h-4 w-4" />
                            Export
                          </Button>
                          <Button onClick={handleClearAll} variant="destructive" size="sm" className="gap-2">
                            <Trash2 className="h-4 w-4" />
                            Clear All
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Search */}
                <div className="px-6 pb-4 relative z-10">
                  <motion.div
                    animate={{ scale: [1, 1.01, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="relative"
                  >
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search notifications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background/50 backdrop-blur-sm border-primary/20"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </motion.div>
                </div>

                <CardContent className="pt-6 relative z-10">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.div
                        variants={fadeInUp}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="text-center py-12"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4" />
                        </motion.div>
                        <h3 className="text-lg font-semibold mb-2">Loading notifications...</h3>
                        <p className="text-muted-foreground">Fetching your updates</p>
                      </motion.div>
                    ) : filteredNotifications.length === 0 ? (
                      <motion.div
                        variants={scaleIn}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="text-center py-12"
                      >
                        <motion.div
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          <BellOff className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        </motion.div>
                        <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          {searchQuery 
                            ? `No notifications match "${searchQuery}". Try a different search.`
                            : filter !== "all"
                            ? `No ${filter === "unread" ? "unread" : filter} notifications found.`
                            : "You're all caught up! New notifications will appear here."}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="space-y-6"
                      >
                        {/* Unread Notifications Section */}
                        {filteredNotifications.filter(n => !n.isRead).length > 0 && (
                          <motion.div
                            variants={fadeInUp}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold text-sm flex items-center gap-2">
                                <motion.span
                                  animate={{ rotate: [0, 20, -20, 0] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                >
                                  <BellRing className="h-4 w-4 text-primary" />
                                </motion.span>
                                Unread ({filteredNotifications.filter(n => !n.isRead).length})
                              </h3>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleMarkAllAsRead}
                                className="h-8 text-xs"
                              >
                                <CheckCheck className="h-3 w-3 mr-1" />
                                Mark all as read
                              </Button>
                            </div>
                            <motion.div
                              variants={staggerContainer}
                              className="space-y-3"
                            >
                              {filteredNotifications
                                .filter(n => !n.isRead)
                                .map((notification, index) => (
                                  <motion.div
                                    key={notification.id}
                                    variants={fadeInUp}
                                    whileHover={{ scale: 1.01 }}
                                    onHoverStart={() => setIsHoveredId(notification.id)}
                                    onHoverEnd={() => setIsHoveredId(null)}
                                    className={cn(
                                      "p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 border-primary/30 shadow-sm cursor-pointer hover:shadow-xl transition-all duration-300 relative overflow-hidden group",
                                      notification.metadata?.isSupervisorLeave && "border-l-4 border-l-blue-500"
                                    )}
                                    onClick={() => handleViewDetails(notification)}
                                  >
                                    {/* Animated background effect */}
                                    <motion.div
                                      className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                      initial={false}
                                      animate={{
                                        x: isHoveredId === notification.id ? [0, 100, 0] : 0
                                      }}
                                      transition={{ duration: 1.5, repeat: Infinity }}
                                    />
                                    
                                    <div className="relative flex items-start justify-between gap-4">
                                      <div className="flex-1 space-y-2">
                                        <div className="flex items-start gap-3">
                                          <motion.div
                                            whileHover={{ rotate: 360 }}
                                            transition={{ duration: 0.5 }}
                                            className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-md"
                                          >
                                            {getAnimatedIcon(notification.type, true)}
                                          </motion.div>
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <h4 className="font-semibold text-sm text-primary">
                                                {notification.title}
                                              </h4>
                                              <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 1, repeat: Infinity }}
                                              >
                                                <Badge variant="destructive" className="text-xs animate-pulse">
                                                  New
                                                </Badge>
                                              </motion.div>
                                              <Badge variant="outline" className="text-xs capitalize ml-auto">
                                                {notification.type}
                                              </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                              {notification.message}
                                            </p>
                                            
                                            {/* Task Metadata */}
                                            {notification.type === 'task' && notification.metadata && (
                                              <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                transition={{ delay: 0.1 }}
                                                className="mt-3 space-y-2"
                                              >
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                  {notification.metadata.siteName && (
                                                    <div className="flex items-center gap-1">
                                                      <Building className="h-3 w-3" />
                                                      <span className="font-medium">{notification.metadata.siteName}</span>
                                                    </div>
                                                  )}
                                                  {notification.metadata.assignedToName && (
                                                    <div className="flex items-center gap-1">
                                                      <User className="h-3 w-3" />
                                                      <span>Assignee: {notification.metadata.assignedToName}</span>
                                                      {notification.metadata?.isAssignedToMe && " (You)"}
                                                    </div>
                                                  )}
                                                </div>
                                                
                                                <div className="flex flex-wrap gap-2">
                                                  {notification.metadata.priority && (
                                                    <motion.div
                                                      whileHover={{ scale: 1.1 }}
                                                    >
                                                      <Badge variant={getPriorityBadge(notification.metadata.priority)} className="text-xs">
                                                        {notification.metadata.priority}
                                                      </Badge>
                                                    </motion.div>
                                                  )}
                                                  {notification.metadata.status && (
                                                    <motion.div
                                                      whileHover={{ scale: 1.1 }}
                                                    >
                                                      <Badge variant={getStatusBadge(notification.metadata.status)} className="text-xs capitalize">
                                                        {notification.metadata.status.replace('-', ' ')}
                                                      </Badge>
                                                    </motion.div>
                                                  )}
                                                  {notification.metadata.requiresAction && (
                                                    <motion.div
                                                      animate={{ scale: [1, 1.05, 1] }}
                                                      transition={{ duration: 0.5, repeat: Infinity }}
                                                    >
                                                      <Badge variant="destructive" className="text-xs">
                                                        <AlertCircle className="h-3 w-3 mr-1" />
                                                        Action Required
                                                      </Badge>
                                                    </motion.div>
                                                  )}
                                                </div>
                                              </motion.div>
                                            )}
                                            
                                            {/* Leave Metadata */}
                                            {notification.type === 'leave' && notification.metadata && (
                                              <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                transition={{ delay: 0.1 }}
                                                className="mt-3 space-y-2"
                                              >
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                  {notification.metadata.employeeName && (
                                                    <div className="flex items-center gap-1">
                                                      <Users className="h-3 w-3" />
                                                      <span className="font-medium">{notification.metadata.employeeName}</span>
                                                      {notification.metadata?.isSupervisorLeave && " (You)"}
                                                    </div>
                                                  )}
                                                  {notification.metadata.leaveType && (
                                                    <div className="flex items-center gap-1">
                                                      <Calendar className="h-3 w-3" />
                                                      <span>{notification.metadata.leaveType}</span>
                                                    </div>
                                                  )}
                                                </div>
                                                
                                                <div className="flex flex-wrap gap-2">
                                                  {notification.metadata.status && (
                                                    <motion.div
                                                      whileHover={{ scale: 1.1 }}
                                                    >
                                                      <Badge variant={
                                                        notification.metadata.status === 'approved' ? 'default' :
                                                        notification.metadata.status === 'rejected' ? 'destructive' : 'secondary'
                                                      } className="text-xs capitalize">
                                                        {notification.metadata.status}
                                                      </Badge>
                                                    </motion.div>
                                                  )}
                                                  {notification.metadata.fromDate && notification.metadata.toDate && (
                                                    <Badge variant="outline" className="text-xs">
                                                      {formatDate(notification.metadata.fromDate)} - {formatDate(notification.metadata.toDate)}
                                                    </Badge>
                                                  )}
                                                </div>
                                              </motion.div>
                                            )}
                                            
                                            <div className="flex items-center gap-4 mt-2">
                                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <motion.span
                                                  animate={{ rotate: [0, 360] }}
                                                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                >
                                                  <Clock className="h-3 w-3" />
                                                </motion.span>
                                                {formatTime(notification.timestamp)}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex gap-1"
                                      >
                                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleMarkAsRead(notification.id);
                                            }}
                                            title="Mark as read"
                                            className="h-8 w-8 p-0"
                                          >
                                            <CheckCheck className="h-4 w-4" />
                                          </Button>
                                        </motion.div>
                                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleViewDetails(notification);
                                            }}
                                            title="View details"
                                            className="h-8 w-8 p-0"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                        </motion.div>
                                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDelete(notification.id);
                                            }}
                                            title="Delete notification"
                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </motion.div>
                                      </motion.div>
                                    </div>
                                  </motion.div>
                                ))}
                            </motion.div>
                          </motion.div>
                        )}

                        {/* Read Notifications Section */}
                        {showReadNotifications && filteredNotifications.filter(n => n.isRead).length > 0 && (
                          <motion.div
                            variants={fadeInUp}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold text-sm flex items-center gap-2">
                                <CheckCheck className="h-4 w-4 text-muted-foreground" />
                                Read ({filteredNotifications.filter(n => n.isRead).length})
                              </h3>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowReadNotifications(!showReadNotifications)}
                                className="h-8 text-xs"
                              >
                                <EyeOff className="h-3 w-3 mr-1" />
                                Hide read
                              </Button>
                            </div>
                            <motion.div
                              variants={staggerContainer}
                              className="space-y-3"
                            >
                              {filteredNotifications
                                .filter(n => n.isRead)
                                .map((notification, index) => (
                                  <motion.div
                                    key={`read-${notification.id}`}
                                    variants={fadeInUp}
                                    whileHover={{ scale: 1.005 }}
                                    className={cn(
                                      "p-4 rounded-lg border bg-background/50 hover:bg-muted/30 cursor-pointer hover:shadow-md transition-all duration-300 opacity-80 hover:opacity-100 backdrop-blur-sm",
                                      notification.metadata?.isSupervisorLeave && "border-l-4 border-l-blue-500"
                                    )}
                                    onClick={() => handleViewDetails(notification)}
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1 space-y-2">
                                        <div className="flex items-start gap-3">
                                          <div className="p-2 rounded-lg bg-muted">
                                            {getTypeIcon(notification.type, true)}
                                          </div>
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <h4 className="font-semibold text-sm">
                                                {notification.title}
                                              </h4>
                                              <div className="flex items-center gap-1 text-xs text-green-600 ml-auto">
                                                <CheckCheck className="h-3 w-3" />
                                                <span>Read</span>
                                              </div>
                                              <Badge variant="outline" className="text-xs capitalize ml-2">
                                                {notification.type}
                                              </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                              {notification.message}
                                            </p>
                                            
                                            {/* Metadata Preview */}
                                            {(notification.type === 'task' || notification.type === 'leave') && (
                                              <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.2 }}
                                                className="flex items-center gap-4 mt-2 text-xs text-muted-foreground"
                                              >
                                                <div className="flex items-center gap-1">
                                                  <Clock className="h-3 w-3" />
                                                  {formatTime(notification.timestamp)}
                                                </div>
                                                {notification.metadata?.siteName && (
                                                  <div className="flex items-center gap-1">
                                                    <Building className="h-3 w-3" />
                                                    {notification.metadata.siteName}
                                                  </div>
                                                )}
                                              </motion.div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        className="flex gap-1"
                                      >
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewDetails(notification);
                                          }}
                                          title="View details"
                                          className="h-8 w-8 p-0"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(notification.id);
                                          }}
                                          title="Delete notification"
                                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </motion.div>
                                    </div>
                                  </motion.div>
                                ))}
                            </motion.div>
                          </motion.div>
                        )}

                        {/* Show message when all notifications are read and read section is hidden */}
                        {!showReadNotifications && filteredNotifications.filter(n => n.isRead).length > 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-4 border-t"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowReadNotifications(true)}
                              className="text-xs"
                            >
                              <Eye className="h-3 w-3 mr-2" />
                              Show {filteredNotifications.filter(n => n.isRead).length} read notifications
                            </Button>
                          </motion.div>
                        )}

                        {/* Show message when all notifications are read */}
                        {filteredNotifications.filter(n => !n.isRead).length === 0 && 
                         filteredNotifications.filter(n => n.isRead).length > 0 && showReadNotifications && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-6 border-t"
                          >
                            <motion.div
                              animate={{ rotate: [0, 360] }}
                              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                              className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-3 shadow-lg"
                            >
                              <CheckCircle2 className="h-6 w-6 text-white" />
                            </motion.div>
                            <h3 className="font-semibold mb-1">All caught up! 🎉</h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto">
                              You've read all your notifications. New notifications will appear in the unread section above.
                            </p>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <motion.div
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.4 }}
            >
              <Card className="border-blue-500/20 shadow-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent" />
                <CardHeader className="pb-3 relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md"
                      >
                        <Target className="h-6 w-6 text-white" />
                      </motion.div>
                      <div>
                        <CardTitle>Your Tasks</CardTitle>
                        <CardDescription>
                          {currentUser?.site 
                            ? `Tasks for ${currentUser.site} (${tasks.length} total)`
                            : `All your tasks (${tasks.length} total)`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-500/10">
                        {tasks.filter(t => t.status === 'completed').length} Completed
                      </Badge>
                      <Badge variant="secondary" className="bg-blue-500/10">
                        {tasks.filter(t => t.status === 'in-progress').length} In Progress
                      </Badge>
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Badge variant="destructive">
                          {tasks.filter(t => t.priority === 'urgent').length} Urgent
                        </Badge>
                      </motion.div>
                    </div>
                  </div>
                </CardHeader>

                {/* Search for Tasks */}
                <div className="px-6 pb-4 relative z-10">
                  <motion.div
                    animate={{ scale: [1, 1.01, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="relative"
                  >
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background/50 backdrop-blur-sm border-blue-500/20"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </motion.div>
                </div>

                <CardContent className="relative z-10">
                  {isLoading ? (
                    <div className="text-center py-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                      </motion.div>
                      <h3 className="text-lg font-semibold mb-2">Loading tasks...</h3>
                      <p className="text-muted-foreground">Fetching your task updates</p>
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                      </motion.div>
                      <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        {searchQuery
                          ? `No tasks match "${searchQuery}".`
                          : "No tasks available."}
                      </p>
                    </div>
                  ) : (
                    <motion.div
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                      className="space-y-4"
                    >
                      {filteredTasks.map((task, index) => (
                        <motion.div
                          key={task._id}
                          variants={fadeInUp}
                          whileHover={{ scale: 1.005 }}
                          className="p-4 rounded-lg border bg-card/50 hover:bg-muted/30 transition-colors backdrop-blur-sm"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start gap-3">
                                <motion.div
                                  whileHover={{ rotate: 360 }}
                                  transition={{ duration: 0.5 }}
                                  className={cn(
                                    "p-2 rounded-lg",
                                    task.status === 'completed' ? "bg-gradient-to-br from-green-500 to-green-600" :
                                    task.status === 'in-progress' ? "bg-gradient-to-br from-blue-500 to-blue-600" :
                                    "bg-gradient-to-br from-gray-500 to-gray-600"
                                  )}
                                >
                                  <Target className="h-4 w-4 text-white" />
                                </motion.div>
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold text-sm">{task.title}</h4>
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                    >
                                      <Badge variant={getPriorityBadge(task.priority)} className="text-xs capitalize">
                                        {task.priority}
                                      </Badge>
                                    </motion.div>
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                    >
                                      <Badge variant={getStatusBadge(task.status)} className="text-xs capitalize">
                                        {task.status.replace('-', ' ')}
                                      </Badge>
                                    </motion.div>
                                    {task.siteName && (
                                      <Badge variant="outline" className="text-xs">
                                        <Building className="h-3 w-3 mr-1" />
                                        {task.siteName}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {task.description}
                                  </p>
                                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span>{task.assignedToName}</span>
                                      {task.assignedTo === currentUser?._id && " (You)"}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>Due: {formatDate(task.deadline)}</span>
                                    </div>
                                    {task.clientName && (
                                      <div className="flex items-center gap-1">
                                        <span>Client: {task.clientName}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Complete
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Leaves Tab */}
          <TabsContent value="leaves">
            <motion.div
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.4 }}
            >
              <Card className="border-amber-500/20 shadow-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent" />
                <CardHeader className="pb-3 relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-md"
                      >
                        <Calendar className="h-6 w-6 text-white" />
                      </motion.div>
                      <div>
                        <CardTitle>Leave Notifications</CardTitle>
                        <CardDescription>
                          Approved and rejected leave requests
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-500/10">
                        {approvedCount} Approved
                      </Badge>
                      <Badge variant="destructive" className="bg-red-500/10">
                        {rejectedCount} Rejected
                      </Badge>
                      <Badge variant="secondary" className="bg-blue-500/10">
                        {notifications.filter(n => n.type === 'leave' && n.metadata?.isSupervisorLeave).length} Your Leaves
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                {/* Search for Leaves */}
                <div className="px-6 pb-4 relative z-10">
                  <motion.div
                    animate={{ scale: [1, 1.01, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="relative"
                  >
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search leaves..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background/50 backdrop-blur-sm border-amber-500/20"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </motion.div>
                </div>

                <CardContent className="relative z-10">
                  {isLoading ? (
                    <div className="text-center py-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                      </motion.div>
                      <h3 className="text-lg font-semibold mb-2">Loading leaves...</h3>
                      <p className="text-muted-foreground">Fetching leave updates</p>
                    </div>
                  ) : filteredLeaves.length === 0 ? (
                    <div className="text-center py-12">
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                      </motion.div>
                      <h3 className="text-lg font-semibold mb-2">No leaves found</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        {searchQuery
                          ? `No leaves match "${searchQuery}".`
                          : "No leave notifications available."}
                      </p>
                    </div>
                  ) : (
                    <motion.div
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                      className="space-y-4"
                    >
                      {filteredLeaves.map((leave, index) => (
                        <motion.div
                          key={leave.id}
                          variants={fadeInUp}
                          whileHover={{ scale: 1.005 }}
                          className={cn(
                            "p-4 rounded-lg border bg-card/50 hover:bg-muted/30 transition-colors backdrop-blur-sm",
                            leave.metadata?.isSupervisorLeave && "border-l-4 border-l-blue-500"
                          )}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start gap-3">
                                <motion.div
                                  whileHover={{ rotate: 360 }}
                                  transition={{ duration: 0.5 }}
                                  className={cn(
                                    "p-2 rounded-lg",
                                    leave.metadata?.status === 'approved' ? "bg-gradient-to-br from-green-500 to-green-600" :
                                    leave.metadata?.status === 'rejected' ? "bg-gradient-to-br from-red-500 to-red-600" :
                                    "bg-gradient-to-br from-amber-500 to-amber-600"
                                  )}
                                >
                                  <Calendar className="h-4 w-4 text-white" />
                                </motion.div>
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold text-sm">{leave.title}</h4>
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                    >
                                      <Badge variant={
                                        leave.metadata?.status === 'approved' ? 'default' : 
                                        leave.metadata?.status === 'rejected' ? 'destructive' : 'secondary'
                                      } className="text-xs capitalize">
                                        {leave.metadata?.status}
                                      </Badge>
                                    </motion.div>
                                    {leave.metadata?.leaveType && (
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {leave.metadata.leaveType}
                                      </Badge>
                                    )}
                                    {leave.metadata?.isSupervisorLeave && (
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                        <User className="h-3 w-3 mr-1" />
                                        Your Leave
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {leave.message}
                                  </p>
                                  <div className="flex flex-wrap gap-4 text-sm">
                                    {leave.metadata?.employeeName && (
                                      <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{leave.metadata.employeeName}</span>
                                      </div>
                                    )}
                                    {leave.metadata?.fromDate && leave.metadata?.toDate && (
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span>{formatDate(leave.metadata.fromDate)} - {formatDate(leave.metadata.toDate)}</span>
                                      </div>
                                    )}
                                    {leave.metadata?.totalDays && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Days:</span>
                                        <span className="font-medium">{leave.metadata.totalDays}</span>
                                      </div>
                                    )}
                                  </div>
                                  {leave.metadata?.rejectionReason && (
                                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                                      <span className="font-medium text-red-700">Rejection Reason:</span> {leave.metadata.rejectionReason}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(leave.timestamp)}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewDetails(leave)}
                                  title="View details"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Details
                                </Button>
                              </motion.div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals">
            <motion.div
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.4 }}
            >
              <Card className="border-green-500/20 shadow-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent" />
                <CardHeader className="pb-3 relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-md"
                      >
                        <CheckCircle className="h-6 w-6 text-white" />
                      </motion.div>
                      <div>
                        <CardTitle>Leave Approvals</CardTitle>
                        <CardDescription>
                          Your leave approval status and decisions
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-500/10">
                        {approvedCount} Approved
                      </Badge>
                      <Badge variant="destructive" className="bg-red-500/10">
                        {rejectedCount} Rejected
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                {/* Search for Approvals */}
                <div className="px-6 pb-4 relative z-10">
                  <motion.div
                    animate={{ scale: [1, 1.01, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="relative"
                  >
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search approvals..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background/50 backdrop-blur-sm border-green-500/20"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </motion.div>
                </div>

                <CardContent className="relative z-10">
                  {isLoading ? (
                    <div className="text-center py-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      </motion.div>
                      <h3 className="text-lg font-semibold mb-2">Loading approvals...</h3>
                      <p className="text-muted-foreground">Fetching approval updates</p>
                    </div>
                  ) : filteredLeaves.filter(l => l.metadata?.status === 'approved' || l.metadata?.status === 'rejected').length === 0 ? (
                    <div className="text-center py-12">
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                      </motion.div>
                      <h3 className="text-lg font-semibold mb-2">No approval records</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        {searchQuery
                          ? `No approvals match "${searchQuery}".`
                          : "No leave approvals or rejections found."}
                      </p>
                    </div>
                  ) : (
                    <motion.div
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                      className="space-y-4"
                    >
                      {filteredLeaves
                        .filter(leave => leave.metadata?.status === 'approved' || leave.metadata?.status === 'rejected')
                        .map((leave, index) => (
                          <motion.div
                            key={leave.id}
                            variants={fadeInUp}
                            whileHover={{ scale: 1.005 }}
                            className={cn(
                              "p-4 rounded-lg border bg-card/50 hover:bg-muted/30 transition-colors backdrop-blur-sm",
                              leave.metadata?.isSupervisorLeave && "border-l-4 border-l-blue-500"
                            )}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-start gap-3">
                                  <motion.div
                                    whileHover={{ rotate: 360 }}
                                    transition={{ duration: 0.5 }}
                                    className={cn(
                                      "p-2 rounded-lg",
                                      leave.metadata?.status === 'approved' ? "bg-gradient-to-br from-green-500 to-green-600" : "bg-gradient-to-br from-red-500 to-red-600"
                                    )}
                                  >
                                    {leave.metadata?.status === 'approved' ? (
                                      <CheckCircle className="h-4 w-4 text-white" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-white" />
                                    )}
                                  </motion.div>
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-semibold text-sm">{leave.title}</h4>
                                      <motion.div
                                        whileHover={{ scale: 1.1 }}
                                      >
                                        <Badge variant={
                                          leave.metadata?.status === 'approved' ? 'default' : 'destructive'
                                        } className="text-xs capitalize">
                                          {leave.metadata?.status}
                                        </Badge>
                                      </motion.div>
                                      {leave.metadata?.leaveType && (
                                        <Badge variant="outline" className="text-xs">
                                          {leave.metadata.leaveType}
                                        </Badge>
                                      )}
                                      {leave.metadata?.isSupervisorLeave && (
                                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                          <User className="h-3 w-3 mr-1" />
                                          Your Leave
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {leave.message}
                                    </p>
                                    {leave.metadata?.employeeName && (
                                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          <span>Employee: {leave.metadata.employeeName}</span>
                                        </div>
                                        {leave.metadata?.fromDate && leave.metadata?.toDate && (
                                          <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>{formatDate(leave.metadata.fromDate)} - {formatDate(leave.metadata.toDate)}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {leave.metadata?.managerName && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <User className="h-3 w-3" />
                                        <span>Processed by: {leave.metadata.managerName}</span>
                                      </div>
                                    )}
                                    {leave.metadata?.rejectionReason && (
                                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                                        <span className="font-medium text-red-700">Rejection Reason:</span> {leave.metadata.rejectionReason}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      {formatTime(leave.timestamp)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleViewDetails(leave)}
                                    title="View details"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Details
                                  </Button>
                                </motion.div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Notification Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border-primary/30 shadow-2xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {viewNotification && getTypeIcon(viewNotification.type)}
                Notification Details
              </DialogTitle>
            </DialogHeader>
            {viewNotification && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={cn(
                      "p-2 rounded-lg",
                      viewNotification.isRead 
                        ? "bg-muted" 
                        : viewNotification.type === 'leave' && viewNotification.metadata?.status === 'approved'
                        ? "bg-green-500/10"
                        : viewNotification.type === 'leave' && viewNotification.metadata?.status === 'rejected'
                        ? "bg-red-500/10"
                        : viewNotification.type === 'task'
                        ? "bg-blue-500/10"
                        : "bg-primary/10"
                    )}
                  >
                    {getTypeIcon(viewNotification.type)}
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-semibold">{viewNotification.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {viewNotification.type}
                      </Badge>
                      {!viewNotification.isRead && (
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      )}
                      {viewNotification.metadata?.priority && (
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(viewNotification.metadata.priority)}`} />
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Message</h4>
                  <div className="p-3 border rounded-md bg-muted/50">
                    <p className="text-sm">{viewNotification.message}</p>
                  </div>
                </div>
                
                {/* Task Metadata */}
                {viewNotification.type === 'task' && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Task Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {viewNotification.metadata?.taskTitle && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Task Title</p>
                          <p className="font-medium">{viewNotification.metadata.taskTitle}</p>
                        </div>
                      )}
                      {viewNotification.metadata?.description && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Description</p>
                          <div className="p-2 border rounded-md bg-muted/30">
                            <p className="text-sm">{viewNotification.metadata.description}</p>
                          </div>
                        </div>
                      )}
                      {viewNotification.metadata?.siteName && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Site</p>
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{viewNotification.metadata.siteName}</p>
                          </div>
                        </div>
                      )}
                      {viewNotification.metadata?.assignedToName && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Assignee</p>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{viewNotification.metadata.assignedToName}</p>
                            {viewNotification.metadata?.isAssignedToMe && (
                              <Badge variant="secondary" className="ml-2">You</Badge>
                            )}
                          </div>
                        </div>
                      )}
                      {viewNotification.metadata?.clientName && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Client</p>
                          <p className="font-medium">{viewNotification.metadata.clientName}</p>
                        </div>
                      )}
                      {viewNotification.metadata?.priority && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Priority</p>
                          <Badge variant={getPriorityBadge(viewNotification.metadata.priority)} className="capitalize">
                            {viewNotification.metadata.priority}
                          </Badge>
                        </div>
                      )}
                      {viewNotification.metadata?.status && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Status</p>
                          <Badge variant={getStatusBadge(viewNotification.metadata.status)} className="capitalize">
                            {viewNotification.metadata.status.replace('-', ' ')}
                          </Badge>
                        </div>
                      )}
                      {viewNotification.metadata?.deadline && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Deadline</p>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{formatDate(viewNotification.metadata.deadline)}</p>
                          </div>
                        </div>
                      )}
                      {viewNotification.metadata?.action && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Action</p>
                          <Badge variant="outline" className="capitalize">
                            {viewNotification.metadata.action}
                          </Badge>
                        </div>
                      )}
                      {viewNotification.metadata?.requiresAction && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Action Required</p>
                          <motion.div
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                          >
                            <Badge variant="destructive" className="animate-pulse">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Immediate attention needed
                            </Badge>
                          </motion.div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Leave Metadata */}
                {viewNotification.type === 'leave' && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Leave Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {viewNotification.metadata?.employeeName && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Employee</p>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{viewNotification.metadata.employeeName}</p>
                            {viewNotification.metadata?.isSupervisorLeave && (
                              <Badge variant="secondary" className="ml-2">You</Badge>
                            )}
                          </div>
                        </div>
                      )}
                      {viewNotification.metadata?.leaveType && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Leave Type</p>
                          <Badge variant="outline" className="capitalize">
                            {viewNotification.metadata.leaveType}
                          </Badge>
                        </div>
                      )}
                      {viewNotification.metadata?.status && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Status</p>
                          <Badge variant={
                            viewNotification.metadata.status === 'approved' ? 'default' : 
                            viewNotification.metadata.status === 'rejected' ? 'destructive' : 'secondary'
                          } className="capitalize">
                            {viewNotification.metadata.status}
                          </Badge>
                        </div>
                      )}
                      {viewNotification.metadata?.department && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Department</p>
                          <p className="font-medium">{viewNotification.metadata.department}</p>
                        </div>
                      )}
                      {viewNotification.metadata?.fromDate && viewNotification.metadata?.toDate && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Leave Period</p>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{formatDate(viewNotification.metadata.fromDate)}</span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{formatDate(viewNotification.metadata.toDate)}</span>
                            </div>
                            {viewNotification.metadata?.totalDays && (
                              <Badge variant="secondary" className="ml-auto">
                                {viewNotification.metadata.totalDays} days
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      {viewNotification.metadata?.managerName && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Processed By</p>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{viewNotification.metadata.managerName}</p>
                          </div>
                        </div>
                      )}
                      {viewNotification.metadata?.reason && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Reason</p>
                          <div className="p-2 border rounded-md bg-muted/30">
                            <p className="text-sm">{viewNotification.metadata.reason}</p>
                          </div>
                        </div>
                      )}
                      {viewNotification.metadata?.rejectionReason && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Rejection Reason</p>
                          <div className="p-2 border border-red-200 rounded-md bg-red-50">
                            <p className="text-sm text-red-700">{viewNotification.metadata.rejectionReason}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Time</p>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="font-medium">{formatTime(viewNotification.timestamp)}</span>
                    </div>
                  </div>
                  
                  {viewNotification.metadata?.createdAt && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Created At</p>
                      <p className="font-medium text-sm">{formatDateTime(viewNotification.metadata.createdAt)}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 pt-4">
                  {!viewNotification.isRead ? (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        handleMarkAsRead(viewNotification.id);
                        setDialogOpen(false);
                      }}
                      className="flex-1"
                    >
                      <CheckCheck className="mr-2 h-4 w-4" />
                      Mark as Read
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setDialogOpen(false);
                      }}
                      className="flex-1"
                    >
                      Close
                    </Button>
                  )}
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      handleDelete(viewNotification.id);
                      setDialogOpen(false);
                    }}
                    className="flex-1"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupervisorNotification;