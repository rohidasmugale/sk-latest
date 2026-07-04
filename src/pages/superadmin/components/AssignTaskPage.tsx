// pages/AssignTaskPage.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  FileText, 
  Calendar, 
  Eye, 
  Edit, 
  Trash2,
  Loader2,
  Building,
  User,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Users,
  MessageSquare,
  Paperclip,
  Download,
  History
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import AssignTaskPopup from './AssignTaskPopup';
import { assignTaskService, type AssignTask } from '@/services/assignTaskService';
import { taskService } from '@/services/TaskService';
import { format } from 'date-fns';
import { createNotificationForSuperadmin } from '@/lib/notificationHelper';
// Add interface for site staff counts
interface SiteStaffCounts {
  [siteId: string]: {
    managers: number;
    supervisors: number;
    totalManagers: number;
    totalSupervisors: number;
  };
}

// Extended interface to include derived status
interface AssignTaskWithDerivedStatus extends AssignTask {
  derivedStatus?: 'pending' | 'in-progress' | 'completed' | 'cancelled';
}
interface AssignTaskPageProps {
  refreshTrigger?: number;
}
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

const AssignTaskPage: React.FC<AssignTaskPageProps> = ({ refreshTrigger = 0 }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [tasks, setTasks] = useState<AssignTaskWithDerivedStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AssignTaskWithDerivedStatus | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  
  // State for site staff counts
  const [siteStaffCounts, setSiteStaffCounts] = useState<SiteStaffCounts>({});
  const [isLoadingStaffCounts, setIsLoadingStaffCounts] = useState(false);
  
  // State for site staff data (for view dialog)
  const [siteStaffData, setSiteStaffData] = useState<{ 
    managers: Array<{ userId: string; name: string; taskCount: number }>,
    supervisors: Array<{ userId: string; name: string; taskCount: number }>
  }>({ managers: [], supervisors: [] });
  
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
useEffect(() => {
    if (refreshTrigger > 0) {
      fetchTasks();
    }
  }, [refreshTrigger]);
   useEffect(() => {
    const handleRefresh = (event: CustomEvent) => {
      if (event.detail?.tasks) {
        const fetchedTasks = event.detail.tasks;
        // Calculate derived status for each task
        const tasksWithDerivedStatus = fetchedTasks.map((task: AssignTask) => {
          const derivedStatus = calculateTaskStatusFromAssignments(task);
          return {
            ...task,
            derivedStatus
          };
        });
        setTasks(tasksWithDerivedStatus);
        toast.success('Tasks updated');
      } else {
        // If no data provided, fetch fresh
        fetchTasks();
      }
    };
     window.addEventListener('refreshOperations', handleRefresh as EventListener);
    return () => window.removeEventListener('refreshOperations', handleRefresh as EventListener);
  }, []);
  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
    fetchSites();
  }, []);

  // Fetch staff counts whenever tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      calculateSiteStaffCounts();
    }
  }, [tasks]);

  const fetchSites = async () => {
    try {
      const sitesData = await taskService.getAllSites();
      setSites(sitesData || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const fetchedTasks = await assignTaskService.getAllAssignTasks();
      
      // Calculate derived status for each task based on assigned users
      const tasksWithDerivedStatus = fetchedTasks.map(task => {
        const derivedStatus = calculateTaskStatusFromAssignments(task);
        return {
          ...task,
          derivedStatus
        };
      });
      
      setTasks(tasksWithDerivedStatus);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate task status based on all assigned users (managers and supervisors)
  const calculateTaskStatusFromAssignments = (task: AssignTask): 'pending' | 'in-progress' | 'completed' | 'cancelled' => {
    // Collect all assigned users' statuses
    const allStatuses: string[] = [];
    
    if (task.assignedManagers && task.assignedManagers.length > 0) {
      allStatuses.push(...task.assignedManagers.map(m => m.status));
    }
    
    if (task.assignedSupervisors && task.assignedSupervisors.length > 0) {
      allStatuses.push(...task.assignedSupervisors.map(s => s.status));
    }
    
    // If no assigned users, return task status
    if (allStatuses.length === 0) {
      return task.status;
    }
    
    // If any user has 'in-progress', task is in-progress
    if (allStatuses.includes('in-progress')) {
      return 'in-progress';
    }
    
    // If any user has 'cancelled', task is cancelled
    if (allStatuses.includes('cancelled')) {
      return 'cancelled';
    }
    
    // If all users have 'completed', task is completed
    if (allStatuses.every(status => status === 'completed')) {
      return 'completed';
    }
    
    // If all users have 'pending', task is pending
    if (allStatuses.every(status => status === 'pending')) {
      return 'pending';
    }
    
    // Mixed statuses (some pending, some completed) - show as in-progress
    return 'in-progress';
  };

  // Get assignment progress summary
  const getAssignmentProgressSummary = (task: AssignTaskWithDerivedStatus) => {
    const managers = task.assignedManagers || [];
    const supervisors = task.assignedSupervisors || [];
    const totalAssigned = managers.length + supervisors.length;
    
    if (totalAssigned === 0) {
      return { message: 'No staff assigned', counts: { pending: 0, inProgress: 0, completed: 0, cancelled: 0, total: 0 } };
    }
    
    const allAssignments = [
      ...managers.map(m => ({ role: 'manager', ...m })),
      ...supervisors.map(s => ({ role: 'supervisor', ...s }))
    ];
    
    const counts = {
      pending: allAssignments.filter(a => a.status === 'pending').length,
      inProgress: allAssignments.filter(a => a.status === 'in-progress').length,
      completed: allAssignments.filter(a => a.status === 'completed').length,
      cancelled: allAssignments.filter(a => a.status === 'cancelled').length,
      total: totalAssigned
    };
    
    let message = '';
    if (counts.inProgress > 0) {
      message = `${counts.inProgress} staff in progress`;
    } else if (counts.completed === totalAssigned) {
      message = 'All staff completed';
    } else if (counts.cancelled > 0) {
      message = `${counts.cancelled} staff cancelled`;
    } else {
      message = `${counts.pending} staff pending`;
    }
    
    return { message, counts };
  };

  const calculateSiteStaffCounts = async () => {
    try {
      setIsLoadingStaffCounts(true);
      
      // Get all tasks to calculate staff counts
      const allTasks = await taskService.getAllTasks();
      
      const counts: SiteStaffCounts = {};
      
      allTasks.forEach(task => {
        if (!task.siteId) return;
        
        if (!counts[task.siteId]) {
          counts[task.siteId] = {
            managers: 0,
            supervisors: 0,
            totalManagers: 0,
            totalSupervisors: 0
          };
        }
        
        // Count unique managers and supervisors for this site
        const uniqueManagers = new Set();
        const uniqueSupervisors = new Set();
        
        task.assignedUsers?.forEach(user => {
          if (user.role === 'manager') {
            uniqueManagers.add(user.userId);
          } else if (user.role === 'supervisor') {
            uniqueSupervisors.add(user.userId);
          }
        });
        
        counts[task.siteId].managers = uniqueManagers.size;
        counts[task.siteId].supervisors = uniqueSupervisors.size;
        
        // Also get total counts including duplicates across tasks
        counts[task.siteId].totalManagers += task.assignedUsers?.filter(u => u.role === 'manager').length || 0;
        counts[task.siteId].totalSupervisors += task.assignedUsers?.filter(u => u.role === 'supervisor').length || 0;
      });
      
      setSiteStaffCounts(counts);
      console.log('✅ Site staff counts calculated:', counts);
    } catch (error) {
      console.error('Error calculating site staff counts:', error);
    } finally {
      setIsLoadingStaffCounts(false);
    }
  };

  // Add function to fetch site staff
  const fetchSiteStaff = async (siteId: string) => {
    try {
      setIsLoadingStaff(true);
      const staffData = await taskService.getSiteStaffWithCounts(siteId);
      setSiteStaffData(staffData);
      console.log(`✅ Found ${staffData.managers.length} managers and ${staffData.supervisors.length} supervisors for site`);
    } catch (error) {
      console.error('Error fetching site staff:', error);
      toast.error('Failed to load staff for this site');
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const handleViewTask = async (task: AssignTaskWithDerivedStatus) => {
    try {
      // Fetch the latest task data to ensure we have latest statuses
      const updatedTask = await assignTaskService.getAssignTaskById(task._id);
      if (updatedTask) {
        const derivedStatus = calculateTaskStatusFromAssignments(updatedTask);
        const taskWithDerived: AssignTaskWithDerivedStatus = {
          ...updatedTask,
          derivedStatus
        };
        setSelectedTask(taskWithDerived);
      } else {
        setSelectedTask(task);
      }
      setShowViewDialog(true);
      
      // Fetch staff for this site
      await fetchSiteStaff(task.siteId);
    } catch (error) {
      console.error('Error fetching task details:', error);
      setSelectedTask(task);
      setShowViewDialog(true);
      await fetchSiteStaff(task.siteId);
    }
  };

  const handleViewHistory = (task: AssignTaskWithDerivedStatus) => {
    setSelectedTask(task);
    setShowHistoryDialog(true);
  };

  const handleEditTask = (task: AssignTaskWithDerivedStatus) => {
    setSelectedTask(task);
    setShowEditPopup(true);
    setShowViewDialog(false); // Close view dialog when opening edit
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await assignTaskService.deleteAssignTask(taskId);
      toast.success('Task deleted successfully');
      fetchTasks();
      
      // Close view dialog if open and it's the deleted task
      if (selectedTask && selectedTask._id === taskId) {
        setShowViewDialog(false);
        setSelectedTask(null);
      }
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast.error(error.message || 'Failed to delete task');
    }
  };

  const handleTaskUpdated = () => {
    fetchTasks();
    setShowEditPopup(false);
    setSelectedTask(null);
  };

  const handleEditFromView = () => {
    if (selectedTask) {
      setShowViewDialog(false);
      // Small delay to ensure view dialog closes before edit opens
      setTimeout(() => {
        setShowEditPopup(true);
      }, 100);
    }
  };

  const handleDownloadAttachment = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      console.error('Error downloading attachment:', error);
      toast.error('Failed to download file');
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
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'cancelled': return <XCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const getUserStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  // Get staff counts for a specific site
  const getStaffCountsForSite = (siteId: string) => {
    return siteStaffCounts[siteId] || { managers: 0, supervisors: 0, totalManagers: 0, totalSupervisors: 0 };
  };

  // Filter tasks based on search and filters (use derived status for filtering)
  const filteredTasks = tasks.filter(task => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        task.taskTitle.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.siteName.toLowerCase().includes(query) ||
        task.clientName.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;
    }

    // Use derived status for filtering if available, otherwise use task.status
    const displayStatus = task.derivedStatus || task.status;

    // Status filter
    if (statusFilter !== 'all' && displayStatus !== statusFilter) {
      return false;
    }

    // Priority filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }

    return true;
  });

  // Get counts by derived status
  const getTasksByStatus = (status: string) => {
    return tasks.filter(t => (t.derivedStatus || t.status) === status).length;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Assign Task</h1>
          <p className="text-muted-foreground">Create and manage tasks assigned to sites</p>
        </div>
        <Button onClick={() => setShowPopup(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Assign New Task
        </Button>
      </div>

      {/* Summary Cards */}
        {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
              <p className="text-2xl font-bold">{tasks.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">{getTasksByStatus('in-progress')}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-green-600">{getTasksByStatus('completed')}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cancelled</p>
              <p className="text-2xl font-bold text-red-600">{getTasksByStatus('cancelled')}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks by title, description, site..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Priority</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Assigned Tasks
            <Badge variant="outline" className="ml-2">
              {filteredTasks.length} of {tasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No tasks found</p>
              <p className="text-sm">
                {tasks.length === 0 
                  ? 'Click the "Assign New Task" button to create your first task'
                  : 'Try adjusting your search or filters'}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Task Details</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Staff at Site</TableHead>
                    <TableHead>Assignment Progress</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => {
                    const staffCounts = getStaffCountsForSite(task.siteId);
                    const progress = getAssignmentProgressSummary(task);
                    const displayStatus = task.derivedStatus || task.status;
                    
                    return (
                      <TableRow key={task._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{task.taskTitle}</div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {task.description}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Type: {task.taskType}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              <span className="text-sm font-medium">{task.siteName}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {task.clientName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isLoadingStaffCounts ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs">
                                <User className="h-3 w-3 text-blue-600" />
                                <span className="font-medium">{staffCounts.managers}</span>
                                <span className="text-muted-foreground">Mgr</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                <Briefcase className="h-3 w-3 text-emerald-600" />
                                <span className="font-medium">{staffCounts.supervisors}</span>
                                <span className="text-muted-foreground">Sup</span>
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.assignedManagers?.length || task.assignedSupervisors?.length ? (
                            <div className="space-y-1 min-w-[140px]">
                              <div className="flex items-center gap-1 text-xs">
                                <div className="flex gap-1 flex-wrap">
                                  {progress.counts.inProgress > 0 && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                      {progress.counts.inProgress} IP
                                    </Badge>
                                  )}
                                  {progress.counts.completed > 0 && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                      {progress.counts.completed} Done
                                    </Badge>
                                  )}
                                  {progress.counts.pending > 0 && (
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                                      {progress.counts.pending} Pending
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {progress.message}
                              </p>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              No staff assigned
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(displayStatus)}
                            <Badge variant={getStatusColor(displayStatus)}>
                              {displayStatus}
                            </Badge>
                          </div>
                          {task.isOverdue && displayStatus !== 'completed' && (
                            <Badge variant="destructive" className="mt-1 text-xs">
                              Overdue
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            <div>Start: {formatDate(task.startDate)}</div>
                            <div>Due: {formatDateTime(task.dueDateTime)}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewHistory(task)}
                              title="View History"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewTask(task)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTask(task)}
                              title="Edit Task"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTask(task._id)}
                              title="Delete Task"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Task Popup */}
      <AssignTaskPopup
        open={showPopup}
        onOpenChange={setShowPopup}
        onTaskCreated={fetchTasks}
      />

      {/* Edit Task Popup */}
      {selectedTask && (
        <AssignTaskPopup
          open={showEditPopup}
          onOpenChange={setShowEditPopup}
          onTaskCreated={handleTaskUpdated}
          taskToEdit={selectedTask}
          isEditMode={true}
        />
      )}

      {/* View Task Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Task Details
            </DialogTitle>
            <DialogDescription>
              Detailed view of the assigned task
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-6">
              {/* Status and Priority Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant={getPriorityColor(selectedTask.priority)}>
                  {selectedTask.priority} Priority
                </Badge>
                <Badge variant={getStatusColor(selectedTask.derivedStatus || selectedTask.status)}>
                  {selectedTask.derivedStatus || selectedTask.status}
                </Badge>
                {selectedTask.isOverdue && (selectedTask.derivedStatus || selectedTask.status) !== 'completed' && (
                  <Badge variant="destructive">Overdue</Badge>
                )}
                <Badge variant="outline">{selectedTask.taskType}</Badge>
              </div>

              {/* Task Information */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedTask.taskTitle}</h3>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {selectedTask.description}
                  </p>
                </div>

                {/* Site Information */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Site Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Site Name</p>
                        <p className="font-medium">{selectedTask.siteName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Client</p>
                        <p className="font-medium">{selectedTask.clientName}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="font-medium">{selectedTask.siteLocation}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Dates */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Dates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Start Date</p>
                        <p className="font-medium">{formatDate(selectedTask.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">End Date</p>
                        <p className="font-medium">{formatDate(selectedTask.endDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Due Date & Time</p>
                        <p className="font-medium">{formatDateTime(selectedTask.dueDateTime)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Assignment Progress Summary */}
                {(selectedTask.assignedManagers?.length || selectedTask.assignedSupervisors?.length) ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Assignment Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Progress Bars */}
                        {(() => {
                          const allAssignments = [
                            ...(selectedTask.assignedManagers || []).map(m => ({ role: 'manager', ...m })),
                            ...(selectedTask.assignedSupervisors || []).map(s => ({ role: 'supervisor', ...s }))
                          ];
                          
                          const counts = {
                            pending: allAssignments.filter(a => a.status === 'pending').length,
                            inProgress: allAssignments.filter(a => a.status === 'in-progress').length,
                            completed: allAssignments.filter(a => a.status === 'completed').length,
                            cancelled: allAssignments.filter(a => a.status === 'cancelled').length,
                            total: allAssignments.length
                          };
                          
                          return (
                            <div className="space-y-2">
                              {counts.inProgress > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs w-20">In Progress:</span>
                                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-blue-500 rounded-full" 
                                      style={{ width: `${(counts.inProgress / counts.total) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium">{counts.inProgress}</span>
                                </div>
                              )}
                              {counts.completed > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs w-20">Completed:</span>
                                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-green-500 rounded-full" 
                                      style={{ width: `${(counts.completed / counts.total) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium">{counts.completed}</span>
                                </div>
                              )}
                              {counts.pending > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs w-20">Pending:</span>
                                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-yellow-500 rounded-full" 
                                      style={{ width: `${(counts.pending / counts.total) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium">{counts.pending}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Managers List */}
                        {selectedTask.assignedManagers && selectedTask.assignedManagers.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2 flex items-center gap-2 text-blue-600">
                              <User className="h-4 w-4" />
                              Managers ({selectedTask.assignedManagers.length})
                            </p>
                            <div className="space-y-2">
                              {selectedTask.assignedManagers.map((manager, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 border rounded bg-blue-50/50">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-blue-600" />
                                    <div>
                                      <p className="font-medium">{manager.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Assigned: {formatDateTime(manager.assignedAt)}
                                      </p>
                                    </div>
                                  </div>
                                  {getUserStatusBadge(manager.status)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Supervisors List */}
                        {selectedTask.assignedSupervisors && selectedTask.assignedSupervisors.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium mb-2 flex items-center gap-2 text-emerald-600">
                              <Briefcase className="h-4 w-4" />
                              Supervisors ({selectedTask.assignedSupervisors.length})
                            </p>
                            <div className="space-y-2">
                              {selectedTask.assignedSupervisors.map((supervisor, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 border rounded bg-emerald-50/50">
                                  <div className="flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-emerald-600" />
                                    <div>
                                      <p className="font-medium">{supervisor.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Assigned: {formatDateTime(supervisor.assignedAt)}
                                      </p>
                                    </div>
                                  </div>
                                  {getUserStatusBadge(supervisor.status)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Staff Information */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Staff Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Loading state */}
                      {isLoadingStaff && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="ml-2 text-sm">Loading staff...</span>
                        </div>
                      )}

                      {/* All staff at this site (from all tasks) */}
                      {!isLoadingStaff && siteStaffData && (siteStaffData.managers.length > 0 || siteStaffData.supervisors.length > 0) && (
                        <div>
                          <p className="text-sm font-medium mb-3 flex items-center gap-2 text-muted-foreground">
                            <Building className="h-4 w-4" />
                            All Staff at {selectedTask.siteName}
                          </p>
                          
                          {/* All managers at site */}
                          {siteStaffData.managers.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                All Managers ({siteStaffData.managers.length})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {siteStaffData.managers.map(manager => {
                                  const isInThisTask = selectedTask.assignedManagers?.some(m => m.userId === manager.userId);
                                  return (
                                    <Badge 
                                      key={manager.userId} 
                                      variant="outline" 
                                      className={`flex items-center gap-1 py-1 px-2 ${
                                        isInThisTask 
                                          ? 'bg-blue-100 border-blue-300 text-blue-700' 
                                          : 'bg-gray-50'
                                      }`}
                                    >
                                      <User className={`h-3 w-3 ${isInThisTask ? 'text-blue-600' : 'text-gray-500'}`} />
                                      {manager.name}
                                      <span className="text-[10px] ml-1 bg-primary/10 px-1 rounded">
                                        {manager.taskCount} {manager.taskCount === 1 ? 'task' : 'tasks'}
                                      </span>
                                      {isInThisTask && (
                                        <span className="text-[10px] ml-1 text-blue-600">(in this task)</span>
                                      )}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* All supervisors at site */}
                          {siteStaffData.supervisors.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                All Supervisors ({siteStaffData.supervisors.length})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {siteStaffData.supervisors.map(supervisor => {
                                  const isInThisTask = selectedTask.assignedSupervisors?.some(s => s.userId === supervisor.userId);
                                  return (
                                    <Badge 
                                      key={supervisor.userId} 
                                      variant="outline" 
                                      className={`flex items-center gap-1 py-1 px-2 ${
                                        isInThisTask 
                                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700' 
                                          : 'bg-gray-50'
                                      }`}
                                    >
                                      <Briefcase className={`h-3 w-3 ${isInThisTask ? 'text-emerald-600' : 'text-gray-500'}`} />
                                      {supervisor.name}
                                      <span className="text-[10px] ml-1 bg-primary/10 px-1 rounded">
                                        {supervisor.taskCount} {supervisor.taskCount === 1 ? 'task' : 'tasks'}
                                      </span>
                                      {isInThisTask && (
                                        <span className="text-[10px] ml-1 text-emerald-600">(in this task)</span>
                                      )}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* No staff at site */}
                      {!isLoadingStaff && siteStaffData.managers.length === 0 && siteStaffData.supervisors.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                          <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p className="text-lg font-medium">No staff found</p>
                          <p className="text-sm mt-1">No managers or supervisors are assigned to this site</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Hourly Updates Summary */}
                {selectedTask.hourlyUpdates && selectedTask.hourlyUpdates.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Recent Updates
                        <Badge variant="outline" className="ml-2">
                          {selectedTask.hourlyUpdates.length} total
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedTask.hourlyUpdates.slice(-3).reverse().map((update, idx) => (
                          <div key={update.id || idx} className="border rounded-lg p-3">
                            <p className="text-sm">{update.content}</p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(update.timestamp)} - {update.submittedByName}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {update.submittedBy === selectedTask.createdBy ? 'Manager' : 'Supervisor'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Attachments Summary */}
                {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        Recent Attachments
                        <Badge variant="outline" className="ml-2">
                          {selectedTask.attachments.length} total
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedTask.attachments.slice(-3).reverse().map((attachment, idx) => (
                          <div key={attachment.id || idx} className="flex items-center justify-between border rounded-lg p-3">
                            <div className="flex items-center gap-2 flex-1">
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{attachment.filename}</p>
                                <p className="text-xs text-muted-foreground">
                                  Uploaded by: {attachment.uploadedByName || attachment.uploadedBy || 'Unknown'}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(attachment.url, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Metadata */}
                <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded-lg">
                  <p>Created by: <span className="font-medium text-foreground">{selectedTask.createdByName}</span></p>
                  <p>Created at: <span className="font-medium text-foreground">{formatDateTime(selectedTask.createdAt)}</span></p>
                  {selectedTask.updatedAt && (
                    <p>Last updated: <span className="font-medium text-foreground">{formatDateTime(selectedTask.updatedAt)}</span></p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowViewDialog(false)}
                >
                  Close
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={handleEditFromView}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Task
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <History className="h-5 w-5" />
              Task History - {selectedTask?.taskTitle}
            </DialogTitle>
            <DialogDescription>
              View all hourly updates and attachments
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <Tabs defaultValue="updates" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="updates" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Hourly Updates
                  <Badge variant="secondary" className="ml-2">
                    {selectedTask.hourlyUpdates?.length || 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="attachments" className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments
                  <Badge variant="secondary" className="ml-2">
                    {selectedTask.attachments?.length || 0}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="updates" className="space-y-4 mt-4">
                {!selectedTask.hourlyUpdates || selectedTask.hourlyUpdates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hourly updates yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...selectedTask.hourlyUpdates]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((update, index) => (
                        <div key={update.id || index} className="border rounded-lg p-4">
                          <p className="text-sm">{update.content}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(update.timestamp)} - {update.submittedByName}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {update.submittedBy === selectedTask.createdBy ? 'Manager' : 'Supervisor'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="attachments" className="space-y-4 mt-4">
                {!selectedTask.attachments || selectedTask.attachments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Paperclip className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No attachments yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...selectedTask.attachments]
                      .sort((a, b) => {
                        const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
                        const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
                        return dateB - dateA;
                      })
                      .map((attachment, index) => (
                        <div key={attachment.id || index} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <Paperclip className="h-5 w-5 text-muted-foreground" />
                              <div className="flex-1">
                                <div className="font-medium text-sm">{attachment.filename}</div>
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  <span>Uploaded by: {attachment.uploadedByName || attachment.uploadedBy || 'Unknown'}</span>
                                  <span>•</span>
                                  <span>{attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : 'Unknown size'}</span>
                                  <span>•</span>
                                  <span>{attachment.uploadedAt ? formatDateTime(attachment.uploadedAt) : 'Date unknown'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(attachment.url, '_blank')}
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadAttachment(attachment.url, attachment.filename)}
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssignTaskPage;