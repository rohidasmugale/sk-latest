// src/pages/ManagerOperations/components/ManagerAssignedTasks.tsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Calendar, 
  Clock, 
  User, 
  Building, 
  Briefcase,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowRight,
  Users,
  FileText,
  MapPin,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageSquare,
  Paperclip,
  Download,
  Upload,
  X,
  AlertTriangle,
  Check,
  RefreshCw,
  Flag,
  Hourglass,
  CheckCheck,
  XCircle
} from "lucide-react";
import { format, isAfter, isBefore, differenceInDays } from "date-fns";
import assignTaskService, { 
  type AssignTask, 
  type UpdateStatusRequest,
  type AddHourlyUpdateRequest,
  type HourlyUpdate,
  type Attachment
} from "@/services/assignTaskService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// ==================== Types ====================
interface ManagerTaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  highPriority: number;
}

// ==================== Task Details Dialog Component ====================
const ManagerTaskDetailsDialog = ({ 
  task, 
  open, 
  onOpenChange,
  onStatusUpdate,
  onAddUpdate,
  onAddAttachment,
  managerId
}: { 
  task: AssignTask; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (taskId: string, status: string) => Promise<void>;
  onAddUpdate: (taskId: string, content: string) => Promise<void>;
  onAddAttachment: (taskId: string, file: File) => Promise<void>;
  managerId: string;
}) => {
  const [activeTab, setActiveTab] = useState<"details" | "updates" | "attachments">("details");
  const [updateText, setUpdateText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [managerTaskStatus, setManagerTaskStatus] = useState<string>("");

  // Get current manager's status for this task
  useEffect(() => {
    if (task && managerId) {
      const managerAssignment = task.assignedManagers?.find(m => m.userId === managerId);
      if (managerAssignment) {
        setManagerTaskStatus(managerAssignment.status);
      }
    }
  }, [task, managerId]);

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, "destructive" | "default" | "secondary" | "outline"> = { 
      high: 'destructive', 
      medium: 'default', 
      low: 'secondary' 
    };
    return colors[priority] || 'outline';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, "default" | "destructive" | "secondary" | "outline"> = { 
      completed: 'default', 
      'in-progress': 'default', 
      pending: 'secondary',
      cancelled: 'destructive'
    };
    return colors[status] || 'outline';
  };

  const handleAddUpdate = async () => {
    if (!updateText.trim()) {
      toast.error("Please enter an update");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddUpdate(task._id, updateText);
      setUpdateText("");
      toast.success("Update added successfully");
    } catch (error) {
      console.error("Error adding update:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadAttachment = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddAttachment(task._id, selectedFile);
      setSelectedFile(null);
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateManagerStatus = async (newStatus: string) => {
    try {
      await onStatusUpdate(task._id, newStatus);
      setManagerTaskStatus(newStatus);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  const getFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Check if task is overdue
  const isOverdue = task.isOverdue && task.status !== 'completed';

  // Get days until due
  const getDaysUntilDue = () => {
    if (task.daysUntilDue !== undefined) {
      return task.daysUntilDue;
    }
    const dueDate = new Date(task.dueDateTime);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysUntilDue = getDaysUntilDue();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5" />
            {task.taskTitle}
          </DialogTitle>
          <DialogDescription>
            Assigned by {task.createdByName} on {formatDate(task.createdAt)}
          </DialogDescription>
        </DialogHeader>

        {/* Status and Priority Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant={getPriorityColor(task.priority)} className="text-sm">
            <Flag className="h-3 w-3 mr-1" />
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
          </Badge>
          <Badge variant={getStatusColor(task.status)} className="text-sm">
            {task.status === 'completed' ? <CheckCheck className="h-3 w-3 mr-1" /> : 
             task.status === 'cancelled' ? <XCircle className="h-3 w-3 mr-1" /> : 
             task.status === 'in-progress' ? <RefreshCw className="h-3 w-3 mr-1" /> : 
             <Hourglass className="h-3 w-3 mr-1" />}
            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
          </Badge>
          {isOverdue && (
            <Badge variant="destructive" className="text-sm">
              <AlertCircle className="h-3 w-3 mr-1" />
              Overdue
            </Badge>
          )}
          <Badge variant="outline" className="text-sm">
            {task.taskType}
          </Badge>
        </div>

        {/* Due Date Warning */}
        {!isOverdue && daysUntilDue <= 3 && daysUntilDue > 0 && task.status !== 'completed' && (
          <div className="mb-4 p-3 bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <p className="text-sm text-orange-800 dark:text-orange-300">
              Due in {daysUntilDue} {daysUntilDue === 1 ? 'day' : 'days'}. Please complete soon.
            </p>
          </div>
        )}

        {/* Overdue Warning */}
        {isOverdue && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              Task is overdue by {Math.abs(daysUntilDue)} days. Please update status immediately.
            </p>
          </div>
        )}

        {/* My Status Section */}
        <Card className="mb-4 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              My Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant={getStatusColor(managerTaskStatus)} className="text-sm">
                  {managerTaskStatus === 'completed' ? <CheckCheck className="h-3 w-3 mr-1" /> : 
                   managerTaskStatus === 'cancelled' ? <XCircle className="h-3 w-3 mr-1" /> : 
                   managerTaskStatus === 'in-progress' ? <RefreshCw className="h-3 w-3 mr-1" /> : 
                   <Hourglass className="h-3 w-3 mr-1" />}
                  Your Status: {managerTaskStatus}
                </Badge>
              </div>
              <div className="flex gap-2">
                {managerTaskStatus !== 'completed' && managerTaskStatus !== 'cancelled' && (
                  <>
                    {managerTaskStatus === 'pending' && (
                      <Button 
                        size="sm"
                        onClick={() => handleUpdateManagerStatus('in-progress')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Start Task
                      </Button>
                    )}
                    {managerTaskStatus === 'in-progress' && (
                      <Button 
                        size="sm"
                        onClick={() => handleUpdateManagerStatus('completed')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark Complete
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Overall Task Progress</span>
            <span className="font-medium">{task.completionPercentage}%</span>
          </div>
          <Progress value={task.completionPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            Based on all assigned staff completion status
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="updates">
              Updates
              {task.hourlyUpdates?.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {task.hourlyUpdates.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="attachments">
              Attachments
              {task.attachments?.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {task.attachments.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Site Information */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Site Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Site Name</p>
                    <p className="font-medium flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      {task.siteName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{task.clientName}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {task.siteLocation}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Task Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Task Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(task.startDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(task.endDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(task.dueDateTime)}
                      </p>
                    </div>
                  </div>
                  {task.completionNotes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Completion Notes</p>
                      <p className="text-sm">{task.completionNotes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Other Assigned Staff */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Other Assigned Staff
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Other Managers */}
                  {task.assignedManagers && task.assignedManagers.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Other Managers</p>
                      <div className="space-y-2">
                        {task.assignedManagers
                          .filter(m => m.userId !== managerId)
                          .map((manager, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(manager.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{manager.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Assigned: {formatDate(manager.assignedAt)}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={getStatusColor(manager.status)} className="text-xs">
                                {manager.status}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Supervisors */}
                  {task.assignedSupervisors && task.assignedSupervisors.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Supervisors</p>
                      <div className="space-y-2">
                        {task.assignedSupervisors.map((supervisor, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {getInitials(supervisor.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{supervisor.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Assigned: {formatDate(supervisor.assignedAt)}
                                </p>
                              </div>
                            </div>
                            <Badge variant={getStatusColor(supervisor.status)} className="text-xs">
                              {supervisor.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {task.assignedManagers.filter(m => m.userId !== managerId).length === 0 && 
                   task.assignedSupervisors.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No other staff assigned to this task
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Updates Tab */}
          <TabsContent value="updates" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Add New Update
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Enter your hourly update..."
                    value={updateText}
                    onChange={(e) => setUpdateText(e.target.value)}
                    rows={3}
                  />
                  <Button 
                    onClick={handleAddUpdate}
                    disabled={isSubmitting || !updateText.trim()}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Add Update
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Update History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {task.hourlyUpdates && task.hourlyUpdates.length > 0 ? (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                      {task.hourlyUpdates.map((update, idx) => (
                        <div key={update.id || idx} className="border-l-2 border-primary pl-4 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px]">
                                {getInitials(update.submittedByName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{update.submittedByName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(update.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm">{update.content}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No updates yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attachments Tab */}
          <TabsContent value="attachments" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload New File
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleUploadAttachment}
                      disabled={isSubmitting || !selectedFile}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {selectedFile.name} ({getFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {task.attachments && task.attachments.length > 0 ? (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {task.attachments.map((attachment, idx) => (
                        <div key={attachment.id || idx} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{attachment.filename}</p>
                              <p className="text-xs text-muted-foreground">
                                Uploaded by {attachment.uploadedByName} • {getFileSize(attachment.size)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(attachment.url, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = attachment.url;
                                link.download = attachment.filename;
                                link.click();
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No attachments yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        {/* Close Button */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ==================== Main ManagerAssignedTasks Component ====================
const ManagerAssignedTasks = () => {
  // State for tasks
  const [tasks, setTasks] = useState<AssignTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<AssignTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AssignTask | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    searchQuery: '',
    showOverdueOnly: false
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Stats state
  const [stats, setStats] = useState<ManagerTaskStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    highPriority: 0
  });

  // Mock current user - in real app, this would come from auth context
  const currentUser = {
    id: "current-user-id",
    name: "John Manager",
    role: "manager"
  };

  // Load tasks on mount
  useEffect(() => {
    fetchManagerTasks();
  }, []);

  // Apply filters when tasks or filters change
  useEffect(() => {
    applyFilters();
  }, [tasks, filters]);

  // Calculate stats when tasks change
  useEffect(() => {
    calculateStats();
  }, [tasks]);

  const fetchManagerTasks = async () => {
    try {
      setIsLoading(true);
      console.log('📋 Fetching tasks for manager:', currentUser.id);
      
      const response = await assignTaskService.getAllAssignTasks({
        managerId: currentUser.id,
        limit: 100,
        sortBy: 'dueDateTime',
        sortOrder: 'asc'
      });
      
      console.log('✅ Manager tasks fetched:', response);
      setTasks(response.tasks || []);
    } catch (error: any) {
      console.error("❌ Error fetching manager tasks:", error);
      toast.error(error.message || "Failed to load tasks");
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = () => {
    const newStats: ManagerTaskStats = {
      total: tasks.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      highPriority: 0
    };

    tasks.forEach(task => {
      // Get manager's personal status for this task
      const managerAssignment = task.assignedManagers?.find(m => m.userId === currentUser.id);
      const managerStatus = managerAssignment?.status || task.status;

      // Count by status
      if (managerStatus === 'pending') newStats.pending++;
      else if (managerStatus === 'in-progress') newStats.inProgress++;
      else if (managerStatus === 'completed') newStats.completed++;
      
      // Count overdue
      if (task.isOverdue && task.status !== 'completed') newStats.overdue++;
      
      // Count high priority
      if (task.priority === 'high') newStats.highPriority++;
    });

    setStats(newStats);
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(task => {
        const managerAssignment = task.assignedManagers?.find(m => m.userId === currentUser.id);
        const managerStatus = managerAssignment?.status || task.status;
        return managerStatus === filters.status;
      });
    }

    // Apply priority filter
    if (filters.priority) {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }

    // Apply overdue filter
    if (filters.showOverdueOnly) {
      filtered = filtered.filter(task => task.isOverdue && task.status !== 'completed');
    }

    // Apply search query
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.taskTitle.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.siteName.toLowerCase().includes(query) ||
        task.clientName.toLowerCase().includes(query)
      );
    }

    setFilteredTasks(filtered);
  };

  const handleStatusUpdate = async (taskId: string, status: string) => {
     try {
    const statusData: UpdateStatusRequest = { 
      status: status as any,
      userId: currentUser.id,
      userRole: 'manager'
    };
    await assignTaskService.updateTaskStatus(taskId, statusData);
    
    // ✅ NEW: Dispatch events
    const task = tasks.find(t => t._id === taskId);
    if (task) {
      window.dispatchEvent(new CustomEvent('task-updated', {
        detail: {
          taskId: task._id,
          taskTitle: task.taskTitle,
          siteName: task.siteName,
          newStatus: status,
          updatedBy: currentUser.name
        }
      }));
      
      if (status === 'completed') {
        window.dispatchEvent(new CustomEvent('task-completed', {
          detail: {
            taskId: task._id,
            taskTitle: task.taskTitle,
            siteName: task.siteName,
            completedBy: currentUser.name
          }
        }));
      }
    }
      
      toast.success(`Task status updated to ${status}`);
      
      // Refresh tasks
      await fetchManagerTasks();
      
      // Update selected task if it's open
      if (selectedTask && selectedTask._id === taskId) {
        const updatedTask = await assignTaskService.getAssignTaskById(taskId);
        if (updatedTask) {
          setSelectedTask(updatedTask);
        }
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleAddUpdate = async (taskId: string, content: string) => {
    try {
      const updateData: AddHourlyUpdateRequest = {
        content,
        submittedBy: currentUser.id,
        submittedByName: currentUser.name
      };
      
      await assignTaskService.addHourlyUpdate(taskId, updateData);
      
      toast.success("Update added successfully");
      
      // Refresh tasks
      await fetchManagerTasks();
      
      // Update selected task
      if (selectedTask && selectedTask._id === taskId) {
        const updatedTask = await assignTaskService.getAssignTaskById(taskId);
        if (updatedTask) {
          setSelectedTask(updatedTask);
        }
      }
    } catch (error: any) {
      console.error("Error adding update:", error);
      throw error;
    }
  };

  const handleAddAttachment = async (taskId: string, file: File) => {
    try {
      // In a real app, you would upload the file to a storage service first
      // and then save the URL. For now, we'll create a mock URL
      const mockUrl = URL.createObjectURL(file);
      
      const attachmentData = {
        filename: file.name,
        url: mockUrl,
        size: file.size,
        type: file.type,
        uploadedBy: currentUser.id,
        uploadedByName: currentUser.name
      };
      
      await assignTaskService.addAttachment(taskId, attachmentData);
      
      toast.success("File uploaded successfully");
      
      // Refresh tasks
      await fetchManagerTasks();
      
      // Update selected task
      if (selectedTask && selectedTask._id === taskId) {
        const updatedTask = await assignTaskService.getAssignTaskById(taskId);
        if (updatedTask) {
          setSelectedTask(updatedTask);
        }
      }
    } catch (error: any) {
      console.error("Error adding attachment:", error);
      throw error;
    }
  };

  const handleViewTask = (task: AssignTask) => {
    setSelectedTask(task);
    setShowTaskDetails(true);
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      searchQuery: '',
      showOverdueOnly: false
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const getStatusVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      pending: "secondary",
      "in-progress": "default",
      completed: "default",
      cancelled: "destructive"
    };
    return variants[status] || "outline";
  };

  const getPriorityVariant = (priority: string): "default" | "destructive" | "secondary" | "outline" => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      high: "destructive",
      medium: "default",
      low: "secondary"
    };
    return variants[priority] || "outline";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCheck className="h-3 w-3" />;
      case 'cancelled': return <XCircle className="h-3 w-3" />;
      case 'in-progress': return <RefreshCw className="h-3 w-3" />;
      default: return <Hourglass className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-900/20">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.highPriority}</div>
            <p className="text-xs text-muted-foreground">High Priority</p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Assigned Tasks
              <Badge variant="outline" className="ml-2">
                {filteredTasks.length} of {tasks.length} tasks
              </Badge>
            </CardTitle>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="pl-8 w-full md:w-64"
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
              
              {(filters.status || filters.priority || filters.showOverdueOnly || filters.searchQuery) && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  size="sm"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select 
                    value={filters.status || "all"} 
                    onValueChange={(v) => setFilters(prev => ({ ...prev, status: v === "all" ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select 
                    value={filters.priority || "all"} 
                    onValueChange={(v) => setFilters(prev => ({ ...prev, priority: v === "all" ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="overdueOnly"
                    checked={filters.showOverdueOnly}
                    onChange={(e) => setFilters(prev => ({ ...prev, showOverdueOnly: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="overdueOnly" className="cursor-pointer">
                    Show Overdue Only
                  </Label>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No tasks assigned to you</p>
              <p className="text-sm">When tasks are assigned to you, they will appear here</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task Title</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>My Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map(task => {
                    const managerAssignment = task.assignedManagers?.find(m => m.userId === currentUser.id);
                    const managerStatus = managerAssignment?.status || task.status;
                    const isOverdue = task.isOverdue && task.status !== 'completed';
                    const daysUntilDue = task.daysUntilDue !== undefined ? task.daysUntilDue : 
                      differenceInDays(new Date(task.dueDateTime), new Date());
                    
                    return (
                      <TableRow key={task._id} className={isOverdue ? "bg-destructive/5" : ""}>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-1">
                              {task.taskTitle}
                              {task.hourlyUpdates?.length > 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{task.hourlyUpdates.length} updates</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {task.description.substring(0, 50)}...
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            <span className="text-sm">{task.siteName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityVariant(task.priority)} className="text-xs">
                            <Flag className="h-3 w-3 mr-1" />
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(managerStatus)} className="text-xs">
                            {getStatusIcon(managerStatus)}
                            <span className="ml-1">{managerStatus}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(task.dueDateTime)}
                            </span>
                            {task.status !== 'completed' && (
                              <span className={`text-xs ${
                                daysUntilDue < 0 ? 'text-destructive' : 
                                daysUntilDue < 3 ? 'text-orange-500' : 'text-muted-foreground'
                              }`}>
                                {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : 
                                 daysUntilDue === 0 ? 'Due today' : 
                                 `${daysUntilDue} days left`}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={task.completionPercentage} className="w-16 h-2" />
                            <span className="text-xs">{task.completionPercentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewTask(task)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {managerStatus === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusUpdate(task._id, 'in-progress')}
                                title="Start Task"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            {managerStatus === 'in-progress' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusUpdate(task._id, 'completed')}
                                title="Mark Complete"
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
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
        </CardContent>
      </Card>

      {/* Task Details Dialog */}
      {selectedTask && (
        <ManagerTaskDetailsDialog
          task={selectedTask}
          open={showTaskDetails}
          onOpenChange={setShowTaskDetails}
          onStatusUpdate={handleStatusUpdate}
          onAddUpdate={handleAddUpdate}
          onAddAttachment={handleAddAttachment}
          managerId={currentUser.id}
        />
      )}
    </div>
  );
};

export default ManagerAssignedTasks;