"use client";

import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Paperclip, 
  Download,
  Eye,
  Upload,
  MessageSquare,
  Calendar,
  User,
  Shield,
  Building,
  Filter,
  Loader2,
  FileText,
  Menu,
  X,
  Home,
  Users,
  BarChart3,
  LogOut,
  Trash2,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useRole } from "@/context/RoleContext";
import taskService, { Task, Attachment } from "@/services/TaskService";
import { siteService, Site } from "@/services/SiteService";
import NotificationService from '@/lib/notificationService';
import { createNotificationForSuperadmin } from '@/lib/notificationHelper';
// Dashboard Header Component with Hamburger Menu
interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  showMenu?: boolean;
}

const DashboardHeader = ({ title, subtitle, onMenuClick, showMenu = true }: DashboardHeaderProps) => {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4 sticky top-0 z-40 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Hamburger Menu for Mobile */}
          {showMenu && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="lg:hidden hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {subtitle && (
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Menu Button Alternative (if needed) */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </motion.header>
  );
};

// Mobile Navigation Drawer Component
interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  userName: string;
  userRole: string;
}

const MobileNavDrawer = ({ isOpen, onClose, onNavigate, userName, userRole }: MobileNavDrawerProps) => {
  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/supervisor' },
    { icon: Users, label: 'Employees', path: '/supervisor/employees' },
    { icon: FileText, label: 'Tasks', path: '/supervisor/tasks' },
    { icon: User, label: 'Profile', path: '/supervisor/profile' },
    { icon: BarChart3, label: 'Reports', path: '/supervisor/reports' },
    { icon: Settings, label: 'Settings', path: '/supervisor/settings' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-800 shadow-xl z-50 lg:hidden"
          >
            <div className="flex flex-col h-full">
              {/* Drawer Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* User Info */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    {userName?.charAt(0) || 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {userName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {userRole}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto p-4">
                <nav className="space-y-2">
                  {navItems.map((item) => (
                    <Button
                      key={item.path}
                      variant="ghost"
                      className="w-full justify-start gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        onNavigate(item.path);
                        onClose();
                      }}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  ))}
                </nav>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => {
                    localStorage.removeItem('sk_user');
                    window.location.href = '/login';
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Main Supervisor Tasks Section Component
const SupervisorTasksSection = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ onMenuClick?: () => void }>();
  const { user: authUser, isAuthenticated } = useRole();
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignedSites, setAssignedSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showUpdatesDialog, setShowUpdatesDialog] = useState(false);
  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [hourlyUpdateText, setHourlyUpdateText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0
  });

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (authUser && isAuthenticated) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [authUser, isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const supervisorId = authUser?._id || authUser?.id;
      if (!supervisorId) {
        throw new Error("Supervisor ID not found");
      }

      console.log(`👤 Fetching tasks for supervisor: ${supervisorId}`);

      // Fetch all tasks and sites
      const [allSites, allTasks] = await Promise.all([
        siteService.getAllSites(),
        taskService.getAllTasks()
      ]);

      // Filter tasks where this supervisor is assigned
      const supervisorTasks = allTasks.filter(task => {
        // Check new format (assignedUsers array)
        const isAssignedInNewFormat = task.assignedUsers?.some(
          user => user.userId === supervisorId && user.role === 'supervisor'
        );
        
        // Check old format (single assignee)
        const isAssignedInOldFormat = task.assignedTo === supervisorId;
        
        return isAssignedInNewFormat || isAssignedInOldFormat;
      });

      console.log(`✅ Found ${supervisorTasks.length} tasks assigned to supervisor`);
      setTasks(supervisorTasks);

      // Extract unique site IDs from supervisor's tasks
      const uniqueSiteIds = [...new Set(supervisorTasks.map(task => task.siteId))];
      
      // Filter sites to only those where supervisor has tasks
      const sitesWithTasks = allSites.filter(site => uniqueSiteIds.includes(site._id));
      
      console.log(`🏢 Found ${sitesWithTasks.length} sites with assigned tasks`);
      setAssignedSites(sitesWithTasks);

      // Calculate stats
      calculateStats(supervisorTasks);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (taskList: Task[]) => {
    const now = new Date();
    const stats = {
      totalTasks: taskList.length,
      completedTasks: taskList.filter(t => t.status === 'completed').length,
      pendingTasks: taskList.filter(t => t.status === 'pending').length,
      inProgressTasks: taskList.filter(t => t.status === 'in-progress').length,
      overdueTasks: taskList.filter(t => 
        t.status !== 'completed' && 
        t.status !== 'cancelled' && 
        new Date(t.dueDateTime) < now
      ).length
    };
    setStats(stats);
  };

 const handleUpdateStatus = async (taskId: string, status: Task["status"]) => {
  try {
    const task = tasks.find(t => t._id === taskId);
    if (!task) {
      toast.error("Task not found");
      return;
    }
    
    const supervisorId = authUser?._id || authUser?.id;
    if (!supervisorId) {
      toast.error("Supervisor ID not found");
      return;
    }
    
    // ✅ Update status (as before)
    await taskService.updateTaskStatus(taskId, { 
      status,
      userId: supervisorId 
    });
    
    // ✅ If status is 'completed', also stop persistent notifications (if any)
    if (status === 'completed') {
      NotificationService.completeTaskNotification(taskId);
       if (task) {
    createNotificationForSuperadmin(
      `✅ Task Completed: ${task.title}`,
      `Task "${task.title}" at ${task.siteName} completed by ${authUser?.name || 'Supervisor'}`,
      'success',
      'medium',
      {
        taskId: task._id,
        siteName: task.siteName,
        taskTitle: task.title,
        completedBy: authUser?.name
      },
      'task_completed'
    );
  }
      console.log(`🔔 Stopped persistent sound for task ${taskId}`);
    }
    
    // ========== DISPATCH EVENTS ==========
    // Get the full task object (with title, siteName, etc.)
    const updatedTask = tasks.find(t => t._id === taskId);
    if (updatedTask) {
      // 1) Always dispatch a general update event
      window.dispatchEvent(new CustomEvent('task-updated', {
        detail: {
          taskId: updatedTask._id,
          taskTitle: updatedTask.title,
          siteName: updatedTask.siteName,
          newStatus: status,
          updatedBy: authUser?.name || 'Supervisor',
          notificationType: 'task_status_update'
        }
      }));
      
      // 2) If completed, also dispatch task-completed
      if (status === 'completed') {
        window.dispatchEvent(new CustomEvent('task-completed', {
          detail: {
            taskId: updatedTask._id,
            taskTitle: updatedTask.title,
            siteName: updatedTask.siteName,
            completedBy: authUser?.name || 'Supervisor'
          }
        }));
      }
    }
    
    // Refresh data and show toast (unchanged)
    await fetchData();
    toast.success("Task status updated!");
  } catch (error: any) {
      console.error("Error updating task:", error);
      toast.error(error.message || "Failed to update task");
    }
  };

  const handleAddHourlyUpdate = async (taskId: string) => {
    if (!hourlyUpdateText.trim()) {
      toast.error("Please enter an update");
      return;
    }

    const supervisorId = authUser?._id || authUser?.id;
    if (!supervisorId) {
      toast.error("Supervisor ID not found");
      return;
    }

    try {
      await taskService.addHourlyUpdate(taskId, {
        content: hourlyUpdateText,
        submittedBy: supervisorId
      });

      await fetchData();
      setHourlyUpdateText("");
      toast.success("Hourly update added!");
      setShowUpdatesDialog(false);
    } catch (error: any) {
      console.error("Error adding hourly update:", error);
      toast.error(error.message || "Failed to add update");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, taskId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      if (files.length === 1) {
        await taskService.uploadAttachment(taskId, files[0]);
      } else {
        await taskService.uploadMultipleAttachments(taskId, Array.from(files));
      }
      
      await fetchData();
      toast.success(`${files.length} file(s) uploaded successfully!`);
    } catch (error: any) {
      console.error("Error uploading files:", error);
      toast.error(error.message || "Failed to upload files");
    }
  };

  const handleDeleteAttachment = async (taskId: string, attachmentId: string) => {
    try {
      await taskService.deleteAttachment(taskId, attachmentId);
      await fetchData();
      toast.success("Attachment deleted!");
    } catch (error: any) {
      console.error("Error deleting attachment:", error);
      toast.error(error.message || "Failed to delete attachment");
    }
  };

  const handleDownloadAttachment = async (attachment: Attachment) => {
    try {
      await taskService.downloadAttachment(attachment);
    } catch (error: any) {
      console.error("Error downloading attachment:", error);
      toast.error(error.message || "Failed to download attachment");
    }
  };

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetails(true);
  };

  const handleMenuClick = () => {
    if (outletContext?.onMenuClick) {
      outletContext.onMenuClick();
    } else {
      setMobileMenuOpen(true);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const getSupervisorName = () => {
    return authUser?.name || "Supervisor";
  };

  const getSiteName = (siteId: string) => {
    const site = assignedSites.find(s => s._id === siteId);
    return site ? site.name : "Unknown Site";
  };

  const getClientName = (siteId: string) => {
    const site = assignedSites.find(s => s._id === siteId);
    return site ? site.clientName : "Unknown Client";
  };

  const getAssignedByName = (task: Task): string => {
    // Try to find the manager who assigned this task
    // This would need to be enhanced with a users service
    return "Manager";
  };

  const getTaskSpecificStatus = (task: Task): string => {
    const supervisorId = authUser?._id || authUser?.id;
    if (!supervisorId) return task.status;
    
    const user = task.assignedUsers?.find(u => u.userId === supervisorId);
    return user ? user.status : task.status;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return "No date set";
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Invalid date";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in-progress': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      case 'in-progress': return <Clock className="h-3 w-3" />;
      case 'pending': return <AlertCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const getHourlyUpdatesCount = (task: Task) => {
    return (task.hourlyUpdates || []).length;
  };

  const getAttachmentsCount = (task: Task) => {
    return (task.attachments || []).length;
  };

  const isOverdue = (task: Task): boolean => {
    if (task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.dueDateTime) < new Date();
  };

  const filteredTasks = tasks.filter(task => {
    if (!task) return false;
    
    // Filter by site
    const matchesSite = selectedSite === "all" || task.siteId === selectedSite;
    
    // Filter by status
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    
    // Filter by search query
    const matchesSearch = 
      task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getSiteName(task.siteId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSite && matchesStatus && matchesSearch;
  });

  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardHeader 
          title="My Tasks" 
          subtitle="Tasks assigned to you"
          onMenuClick={handleMenuClick}
        />
        <MobileNavDrawer
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onNavigate={handleNavigate}
          userName={getSupervisorName()}
          userRole="Supervisor"
        />
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 md:p-8 text-center">
              <AlertCircle className="h-12 w-12 md:h-16 md:w-16 mx-auto text-yellow-500 mb-4" />
              <h2 className="text-lg md:text-xl font-bold mb-2">Authentication Required</h2>
              <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mb-4">
                Please log in to view your tasks.
              </p>
              <Button onClick={() => window.location.href = '/login'} className="w-full sm:w-auto">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardHeader 
          title="My Tasks" 
          subtitle="Loading your assigned tasks..."
          onMenuClick={handleMenuClick}
        />
        <MobileNavDrawer
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onNavigate={handleNavigate}
          userName={getSupervisorName()}
          userRole="Supervisor"
        />
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary" />
            <p className="ml-3 text-sm md:text-base text-gray-500 dark:text-gray-400">Loading your tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader 
        title="My Tasks" 
        subtitle="View and manage tasks assigned to you"
        onMenuClick={handleMenuClick}
      />

      <MobileNavDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onNavigate={handleNavigate}
        userName={getSupervisorName()}
        userRole="Supervisor"
      />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
        <Card>
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg md:text-xl">My Assigned Tasks</CardTitle>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Shield className="h-4 w-4 text-green-600" />
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                    Logged in as <span className="font-medium text-green-600">{getSupervisorName()}</span>
                  </p>
                  <Badge variant="outline" className="ml-0 sm:ml-2 text-xs">
                    Supervisor
                  </Badge>
                </div>
              </div>
              <Button variant="outline" onClick={fetchData} size={isMobileView ? "sm" : "default"} className="w-full sm:w-auto">
                <Loader2 className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <div className="space-y-4 md:space-y-6">
              {/* Supervisor Dashboard Summary - Mobile Optimized */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs md:text-sm font-medium text-blue-700">Total</p>
                        <p className="text-lg md:text-2xl font-bold text-blue-900">{stats.totalTasks}</p>
                      </div>
                      <FileText className="h-5 w-5 md:h-8 md:w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs md:text-sm font-medium text-green-700">Done</p>
                        <p className="text-lg md:text-2xl font-bold text-green-900">{stats.completedTasks}</p>
                      </div>
                      <CheckCircle className="h-5 w-5 md:h-8 md:w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs md:text-sm font-medium text-yellow-700">Progress</p>
                        <p className="text-lg md:text-2xl font-bold text-yellow-900">{stats.inProgressTasks}</p>
                      </div>
                      <Clock className="h-5 w-5 md:h-8 md:w-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs md:text-sm font-medium text-purple-700">Pending</p>
                        <p className="text-lg md:text-2xl font-bold text-purple-900">{stats.pendingTasks}</p>
                      </div>
                      <AlertCircle className="h-5 w-5 md:h-8 md:w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-red-50 border-red-200 col-span-2 md:col-span-1">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs md:text-sm font-medium text-red-700">Overdue</p>
                        <p className="text-lg md:text-2xl font-bold text-red-900">{stats.overdueTasks}</p>
                      </div>
                      <AlertCircle className="h-5 w-5 md:h-8 md:w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters - Mobile Optimized */}
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[160px] md:w-[180px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger className="w-full sm:w-[160px] md:w-[180px]">
                      <Building className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Site" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sites ({assignedSites.length})</SelectItem>
                      {assignedSites.map(site => (
                        <SelectItem key={site._id} value={site._id}>
                          <div className="flex items-center gap-2">
                            <Building className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{site.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Tasks Table/Grid - Mobile Optimized */}
              {filteredTasks.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 md:p-8 text-center">
                    <FileText className="h-10 w-10 md:h-12 md:w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-base md:text-lg font-medium mb-2">No Tasks Found</h3>
                    <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mb-4">
                      {tasks.length === 0 ? (
                        "You don't have any tasks assigned to you yet."
                      ) : (
                        "No tasks match your filters. Try adjusting your search criteria."
                      )}
                    </p>
                    {tasks.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setSelectedSite("all");
                      }}>
                        Clear Filters
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Mobile View - Card Grid */}
                  {isMobileView ? (
                    <div className="space-y-3">
                      {filteredTasks.map((task) => {
                        const taskStatus = getTaskSpecificStatus(task);
                        const overdue = isOverdue(task);
                        
                        return (
                          <Card key={task._id} className={`overflow-hidden ${overdue ? 'border-red-200 bg-red-50/50' : ''}`}>
                            <CardContent className="p-4">
                              {/* Task Header */}
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                                    {task.title || "Untitled Task"}
                                    {overdue && (
                                      <Badge variant="destructive" className="text-xs">
                                        Overdue
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 line-clamp-2 mt-1">
                                    {task.description || "No description"}
                                  </div>
                                </div>
                                <Badge variant={getPriorityColor(task.priority) as any} className="ml-2">
                                  {task.priority}
                                </Badge>
                              </div>

                              {/* Task Details */}
                              <div className="space-y-2 mt-3">
                                <div className="flex items-center gap-2 text-xs">
                                  <Building className="h-3 w-3 text-gray-500" />
                                  <span className="font-medium">{getSiteName(task.siteId)}</span>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-gray-600">{task.clientName}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs">
                                  <User className="h-3 w-3 text-gray-500" />
                                  <span>Assigned by: {getAssignedByName(task)}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs">
                                  <Calendar className="h-3 w-3 text-gray-500" />
                                  <span>Due: {formatDate(task.dueDateTime)}</span>
                                </div>

                                <div className="flex items-center justify-between mt-2">
                                  <Badge variant={getStatusColor(taskStatus) as any}>
                                    <span className="flex items-center gap-1">
                                      {getStatusIcon(taskStatus)}
                                      {taskStatus}
                                    </span>
                                  </Badge>
                                  
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2"
                                      onClick={() => {
                                        setSelectedTask(task);
                                        setShowUpdatesDialog(true);
                                      }}
                                    >
                                      <MessageSquare className="h-3 w-3 mr-1" />
                                      {getHourlyUpdatesCount(task)}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2"
                                      onClick={() => {
                                        setSelectedTask(task);
                                        setShowAttachmentsDialog(true);
                                      }}
                                    >
                                      <Paperclip className="h-3 w-3 mr-1" />
                                      {getAttachmentsCount(task)}
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="grid grid-cols-2 gap-2 mt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewTask(task)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                                
                                {taskStatus !== "completed" && taskStatus !== "cancelled" && (
                                  <>
                                    {taskStatus !== "in-progress" && (
                                      <Button 
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUpdateStatus(task._id, "in-progress")}
                                        className="text-blue-600 border-blue-200"
                                      >
                                        <Clock className="h-3 w-3 mr-1" />
                                        Start
                                      </Button>
                                    )}
                                    
                                    {taskStatus === "in-progress" && (
                                      <Button 
                                        size="sm"
                                        onClick={() => handleUpdateStatus(task._id, "completed")}
                                        className="text-green-600 bg-green-50 border-green-200 hover:bg-green-100"
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Complete
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    /* Desktop View - Table */
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Task Details</TableHead>
                            <TableHead className="whitespace-nowrap">Site & Client</TableHead>
                            <TableHead className="whitespace-nowrap">Assigned By</TableHead>
                            <TableHead className="whitespace-nowrap">Priority</TableHead>
                            <TableHead className="whitespace-nowrap">My Status</TableHead>
                            <TableHead className="whitespace-nowrap">Due Date & Time</TableHead>
                            <TableHead className="whitespace-nowrap">Updates</TableHead>
                            <TableHead className="whitespace-nowrap">Attachments</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTasks.map((task) => {
                            const taskStatus = getTaskSpecificStatus(task);
                            const overdue = isOverdue(task);
                            
                            return (
                              <TableRow key={task._id} className={overdue ? "bg-red-50/50" : ""}>
                                <TableCell className="font-medium">
                                  <div>
                                    <div className="font-semibold flex items-center gap-2">
                                      {task.title || "Untitled Task"}
                                      {overdue && (
                                        <Badge variant="destructive" className="text-xs">
                                          Overdue
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500 line-clamp-2">
                                      {task.description || "No description"}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1">
                                      <Building className="h-3 w-3" />
                                      <span className="font-medium">{getSiteName(task.siteId)}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {task.clientName}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-blue-600" />
                                    <span className="font-medium">{getAssignedByName(task)}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getPriorityColor(task.priority) as any}>
                                    {task.priority === "high" && <AlertCircle className="mr-1 h-3 w-3" />}
                                    {task.priority}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getStatusColor(taskStatus) as any}>
                                    <span className="flex items-center gap-1">
                                      {getStatusIcon(taskStatus)}
                                      {taskStatus}
                                    </span>
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {formatDate(task.dueDateTime)}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center gap-1"
                                    onClick={() => {
                                      setSelectedTask(task);
                                      setShowUpdatesDialog(true);
                                    }}
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                    {getHourlyUpdatesCount(task)}
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center gap-1"
                                    onClick={() => {
                                      setSelectedTask(task);
                                      setShowAttachmentsDialog(true);
                                    }}
                                  >
                                    <Paperclip className="h-4 w-4" />
                                    {getAttachmentsCount(task)}
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewTask(task)}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
                                    </Button>
                                    
                                    {taskStatus !== "completed" && taskStatus !== "cancelled" && (
                                      <>
                                        {taskStatus !== "in-progress" && (
                                          <Button 
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleUpdateStatus(task._id, "in-progress")}
                                            className="text-blue-600"
                                          >
                                            <Clock className="h-3 w-3 mr-1" />
                                            Start
                                          </Button>
                                        )}
                                        
                                        <Button 
                                          size="sm"
                                          onClick={() => handleUpdateStatus(task._id, "completed")}
                                          className="text-green-600"
                                        >
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Complete
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Details Dialog - Mobile Optimized */}
      {selectedTask && (
        <Dialog open={showTaskDetails} onOpenChange={setShowTaskDetails}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Eye className="h-5 w-5" />
                Task Details
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 md:space-y-6">
              {/* Task Info */}
              <div>
                <h3 className="font-semibold text-base md:text-lg mb-2">{selectedTask.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
                  {selectedTask.description}
                </p>
              </div>

              {/* Metadata - Mobile Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <div className="text-xs md:text-sm text-gray-500">Site</div>
                  <div className="font-medium text-sm md:text-base flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {getSiteName(selectedTask.siteId)}
                  </div>
                </div>
                <div>
                  <div className="text-xs md:text-sm text-gray-500">Client</div>
                  <div className="font-medium text-sm md:text-base">{getClientName(selectedTask.siteId)}</div>
                </div>
                <div>
                  <div className="text-xs md:text-sm text-gray-500">Priority</div>
                  <Badge variant={getPriorityColor(selectedTask.priority) as any} className="mt-1">
                    {selectedTask.priority}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs md:text-sm text-gray-500">My Status</div>
                  <Badge variant={getStatusColor(getTaskSpecificStatus(selectedTask)) as any} className="mt-1">
                    <span className="flex items-center gap-1">
                      {getStatusIcon(getTaskSpecificStatus(selectedTask))}
                      {getTaskSpecificStatus(selectedTask)}
                    </span>
                  </Badge>
                </div>
                <div>
                  <div className="text-xs md:text-sm text-gray-500">Deadline</div>
                  <div className="font-medium text-sm md:text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(selectedTask.deadline)}
                  </div>
                </div>
                <div>
                  <div className="text-xs md:text-sm text-gray-500">Due Date & Time</div>
                  <div className="font-medium text-sm md:text-base">
                    {formatDate(selectedTask.dueDateTime)}
                  </div>
                </div>
              </div>

              {/* All Assignees */}
              {selectedTask.assignedUsers && selectedTask.assignedUsers.length > 0 && (
                <div>
                  <div className="text-xs md:text-sm text-gray-500 mb-2">All Assignees</div>
                  <div className="space-y-2">
                    {selectedTask.assignedUsers.map((user, index) => {
                      const isMe = user.userId === (authUser?._id || authUser?.id);
                      return (
                        <div key={index} className="flex items-center gap-2 p-2 md:p-3 border rounded">
                          <User className="h-4 w-4 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                              {user.name}
                              {isMe && (
                                <Badge variant="outline" className="text-xs bg-green-50">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </div>
                          </div>
                          <Badge variant="outline" className="ml-auto text-xs">
                            {user.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                {getTaskSpecificStatus(selectedTask) !== 'completed' && 
                 getTaskSpecificStatus(selectedTask) !== 'cancelled' && (
                  <>
                    {getTaskSpecificStatus(selectedTask) !== 'in-progress' && (
                      <Button
                        variant="outline"
                        className="flex-1 w-full sm:w-auto"
                        size={isMobileView ? "default" : "sm"}
                        onClick={() => {
                          handleUpdateStatus(selectedTask._id, 'in-progress');
                          setShowTaskDetails(false);
                        }}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Start Task
                      </Button>
                    )}
                    <Button
                      className="flex-1 w-full sm:w-auto"
                      size={isMobileView ? "default" : "sm"}
                      onClick={() => {
                        handleUpdateStatus(selectedTask._id, 'completed');
                        setShowTaskDetails(false);
                      }}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Completed
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  className="flex-1 w-full sm:w-auto"
                  size={isMobileView ? "default" : "sm"}
                  onClick={() => setShowTaskDetails(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Hourly Updates Dialog - Mobile Optimized */}
      {selectedTask && (
        <Dialog open={showUpdatesDialog} onOpenChange={setShowUpdatesDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-4 md:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5" />
                <span className="truncate">Updates: {selectedTask.title || "Untitled Task"}</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-3">
                {selectedTask.hourlyUpdates && selectedTask.hourlyUpdates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No hourly updates yet
                  </div>
                ) : (
                  selectedTask.hourlyUpdates?.map((update, index) => (
                    <div key={update.id || `update-${index}`} className="border rounded-lg p-3 md:p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">Update #{selectedTask.hourlyUpdates!.length - index}</div>
                            <div className="text-xs text-gray-500">
                              {formatDateTime(update.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm mt-2">{update.content}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t pt-4">
                <Textarea
                  placeholder="Add a new hourly update..."
                  value={hourlyUpdateText}
                  onChange={(e) => setHourlyUpdateText(e.target.value)}
                  rows={3}
                  className="mb-3 text-sm"
                />
                <Button 
                  onClick={() => handleAddHourlyUpdate(selectedTask._id)}
                  className="w-full"
                >
                  Add Hourly Update
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Attachments Dialog - Mobile Optimized */}
      {selectedTask && (
        <Dialog open={showAttachmentsDialog} onOpenChange={setShowAttachmentsDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-4 md:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Paperclip className="h-5 w-5" />
                <span className="truncate">Attachments: {selectedTask.title || "Untitled Task"}</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <span className="text-xs md:text-sm text-gray-500">
                  {(selectedTask.attachments || []).length} file(s) attached
                </span>
                <label className="cursor-pointer w-full sm:w-auto">
                  <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Files
                      <Input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, selectedTask._id)}
                      />
                    </div>
                  </Button>
                </label>
              </div>
              
              <div className="space-y-3">
                {!selectedTask.attachments || selectedTask.attachments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No attachments yet
                  </div>
                ) : (
                  selectedTask.attachments.map((attachment) => (
                    <div key={attachment.id} className="border rounded-lg p-3 md:p-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Paperclip className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{attachment.filename || "Unnamed file"}</div>
                            <div className="text-xs text-gray-500">
                              {attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : "Unknown size"} • {formatDateTime(attachment.uploadedAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => taskService.previewAttachment(attachment)}
                            className="h-8 px-2"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadAttachment(attachment)}
                            className="h-8 px-2"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAttachment(selectedTask._id, attachment.id)}
                            className="h-8 px-2"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SupervisorTasksSection;