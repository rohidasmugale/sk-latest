// src/pages/Operations/components/AssignTaskSection.tsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createNotificationForSuperadmin } from '@/lib/notificationHelper';
import { 
  Calendar, 
  Clock, 
  User, 
  Building, 
  Briefcase,
  AlertCircle,
  CheckCircle,
  Loader2,
  Save,
  ArrowRight,
  Users,
  FileText,
  MapPin,
  Target,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  Trash2,
  MessageSquare,
  Paperclip,
  Download,
  Upload,
  X,
  AlertTriangle,
  Check,
  RefreshCw,
  Plus,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX
} from "lucide-react";
import { format, isAfter, isBefore, differenceInDays } from "date-fns";
import assignTaskService, { 
  type AssignTask, 
  type CreateAssignTaskRequest,
  type UpdateAssignTaskRequest,
  type UpdateStatusRequest,
  type AddHourlyUpdateRequest,
  type AddAttachmentRequest,
  type HourlyUpdate,
  type Attachment
} from "@/services/assignTaskService";
import taskService, { type Site, type Assignee, type ExtendedSite, type Task, type AssignedUser } from "@/services/TaskService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ==================== Types ====================
interface SiteStaffInfo {
  userId: string;
  name: string;
  role: 'manager' | 'supervisor';
  taskCount: number;
  taskIds: string[];
}

interface TaskStaffingStatus {
  currentManagers: number;
  currentSupervisors: number;
  requiredManagers: number;
  requiredSupervisors: number;
  missingManagers: number;
  missingSupervisors: number;
  isManagerRequirementMet: boolean;
  isSupervisorRequirementMet: boolean;
  isFullyStaffed: boolean;
}

// ==================== Staffing Status Indicator Component ====================
const StaffingStatusIndicator = ({ status }: { status: TaskStaffingStatus }) => {
  if (status.isFullyStaffed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-green-600">
              <UserCheck className="h-4 w-4" />
              <span className="text-xs font-medium">Fully Staffed</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{status.currentManagers}/{status.requiredManagers} Managers • {status.currentSupervisors}/{status.requiredSupervisors} Supervisors</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">Missing Staff</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            {!status.isManagerRequirementMet && (
              <p className="text-xs">Need {status.missingManagers} more manager{status.missingManagers !== 1 ? 's' : ''}</p>
            )}
            {!status.isSupervisorRequirementMet && (
              <p className="text-xs">Need {status.missingSupervisors} more supervisor{status.missingSupervisors !== 1 ? 's' : ''}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Current: {status.currentManagers}/{status.requiredManagers} Mgrs, {status.currentSupervisors}/{status.requiredSupervisors} Sups
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ==================== Task Details Dialog Component ====================
const TaskDetailsDialog = ({ 
  task, 
  open, 
  onOpenChange,
  onStatusUpdate,
  onAddUpdate,
  onAddAttachment,
  onEdit,
  onDelete,
  sites,
  siteStaffMap
}: { 
  task: AssignTask; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (taskId: string, status: string) => Promise<void>;
  onAddUpdate: (taskId: string, content: string) => Promise<void>;
  onAddAttachment: (taskId: string, file: File) => Promise<void>;
  onEdit: (task: AssignTask) => void;
  onDelete: (taskId: string) => Promise<void>;
  sites: ExtendedSite[];
  siteStaffMap: Map<string, { managers: SiteStaffInfo[], supervisors: SiteStaffInfo[] }>;
}) => {
  const [activeTab, setActiveTab] = useState<"details" | "updates" | "attachments">("details");
  const [updateText, setUpdateText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getPriorityColor = (priority: string) => {
    const colors = { high: 'destructive', medium: 'default', low: 'secondary' };
    return colors[priority as keyof typeof colors] || 'outline';
  };

  const getStatusColor = (status: string) => {
    const colors = { 
      completed: 'default', 
      'in-progress': 'default', 
      pending: 'secondary',
      cancelled: 'destructive'
    };
    return colors[status as keyof typeof colors] || 'outline';
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(task._id);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting task:", error);
    } finally {
      setIsDeleting(false);
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

  const allStaff = [...(task.assignedManagers || []), ...(task.assignedSupervisors || [])];
  const completedStaff = allStaff.filter(s => s.status === 'completed').length;
  const totalStaff = allStaff.length;

  // Get all staff assigned to this site from other tasks
  const siteStaff = siteStaffMap.get(task.siteId);

  // Calculate staffing status
  const site = sites.find(s => s._id === task.siteId);
  const staffingStatus: TaskStaffingStatus = {
    currentManagers: task.assignedManagers.length,
    currentSupervisors: task.assignedSupervisors.length,
    requiredManagers: site?.managerCount || 0,
    requiredSupervisors: site?.supervisorCount || 0,
    missingManagers: Math.max(0, (site?.managerCount || 0) - task.assignedManagers.length),
    missingSupervisors: Math.max(0, (site?.supervisorCount || 0) - task.assignedSupervisors.length),
    isManagerRequirementMet: task.assignedManagers.length >= (site?.managerCount || 0),
    isSupervisorRequirementMet: task.assignedSupervisors.length >= (site?.supervisorCount || 0),
    isFullyStaffed: task.assignedManagers.length >= (site?.managerCount || 0) && 
                    task.assignedSupervisors.length >= (site?.supervisorCount || 0)
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5" />
            {task.taskTitle}
          </DialogTitle>
          <DialogDescription>
            Created by {task.createdByName} on {formatDate(task.createdAt)}
          </DialogDescription>
        </DialogHeader>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(task)}
            className="flex items-center gap-1"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </Button>
        </div>

        {/* Status and Priority Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant={getPriorityColor(task.priority)} className="text-sm">
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
          </Badge>
          <Badge variant={getStatusColor(task.status)} className="text-sm">
            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
          </Badge>
          {task.isOverdue && task.status !== 'completed' && (
            <Badge variant="destructive" className="text-sm">
              Overdue
            </Badge>
          )}
          <Badge variant="outline" className="text-sm">
            {task.taskType}
          </Badge>
        </div>

        {/* Staffing Status */}
        <div className="mb-4 p-3 bg-primary/5 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="font-medium">Staffing Status:</span>
            </div>
            <StaffingStatusIndicator status={staffingStatus} />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
            <div>
              <span className="text-muted-foreground">Managers:</span>
              <span className={`ml-2 font-medium ${!staffingStatus.isManagerRequirementMet ? 'text-amber-600' : 'text-green-600'}`}>
                {task.assignedManagers.length}/{site?.managerCount || 0}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Supervisors:</span>
              <span className={`ml-2 font-medium ${!staffingStatus.isSupervisorRequirementMet ? 'text-amber-600' : 'text-green-600'}`}>
                {task.assignedSupervisors.length}/{site?.supervisorCount || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {totalStaff > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Completion Progress</span>
              <span className="font-medium">{task.completionPercentage}%</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${task.completionPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedStaff} of {totalStaff} staff completed
            </p>
          </div>
        )}

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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Site Name</p>
                    <p className="font-medium">{task.siteName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{task.clientName}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{task.siteLocation}</p>
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
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">{formatDate(task.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="font-medium">{formatDate(task.endDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="font-medium">{formatDate(task.dueDateTime)}</p>
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

            {/* Assigned Staff */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assigned Staff (This Task)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {task.assignedManagers && task.assignedManagers.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Managers ({task.assignedManagers.length}/{site?.managerCount || 0})</p>
                      <div className="space-y-2">
                        {task.assignedManagers.map((manager, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{manager.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Assigned: {formatDate(manager.assignedAt)}
                                </p>
                              </div>
                            </div>
                            <Badge variant={manager.status === 'completed' ? 'default' : 'secondary'}>
                              {manager.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {task.assignedSupervisors && task.assignedSupervisors.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Supervisors ({task.assignedSupervisors.length}/{site?.supervisorCount || 0})</p>
                      <div className="space-y-2">
                        {task.assignedSupervisors.map((supervisor, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{supervisor.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Assigned: {formatDate(supervisor.assignedAt)}
                                </p>
                              </div>
                            </div>
                            <Badge variant={supervisor.status === 'completed' ? 'default' : 'secondary'}>
                              {supervisor.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {totalStaff === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No staff assigned to this task
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* All Staff Assigned to this Site */}
            {siteStaff && (siteStaff.managers.length > 0 || siteStaff.supervisors.length > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    All Staff Assigned to {task.siteName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {siteStaff.managers.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Managers ({siteStaff.managers.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {siteStaff.managers.map(manager => (
                            <Badge key={manager.userId} variant="outline" className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {manager.name}
                              <span className="text-xs ml-1 bg-primary/10 px-1 rounded">
                                {manager.taskCount} {manager.taskCount === 1 ? 'task' : 'tasks'}
                              </span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {siteStaff.supervisors.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Supervisors ({siteStaff.supervisors.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {siteStaff.supervisors.map(supervisor => (
                            <Badge key={supervisor.userId} variant="outline" className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {supervisor.name}
                              <span className="text-xs ml-1 bg-primary/10 px-1 rounded">
                                {supervisor.taskCount} {supervisor.taskCount === 1 ? 'task' : 'tasks'}
                              </span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
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
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{update.submittedByName}</span>
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
                              <p className="font-medium">{attachment.filename}</p>
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

        {/* Status Update Buttons */}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          {task.status !== 'completed' && task.status !== 'cancelled' && (
            <>
              <Button
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => onStatusUpdate(task._id, 'completed')}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark Complete
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => onStatusUpdate(task._id, 'cancelled')}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel Task
              </Button>
            </>
          )}
          {task.status === 'pending' && (
            <Button
              variant="default"
              className="flex-1"
              onClick={() => onStatusUpdate(task._id, 'in-progress')}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Start Progress
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ==================== Assign Task Form Dialog Component ====================
const AssignTaskFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  sites,
  siteStaffMap,
  selectedSiteId,
  setSelectedSiteId,
  selectedManagers,
  setSelectedManagers,
  selectedSupervisors,
  setSelectedSupervisors,
  taskTitle,
  setTaskTitle,
  description,
  setDescription,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  dueDateTime,
  setDueDateTime,
  priority,
  setPriority,
  taskType,
  setTaskType,
  siteStaffForSelected,
  siteStaffingRequirements,
  isLoadingSites,
  isLoadingStaff,
  isSubmitting,
  resetForm,
  editMode = false
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  sites: ExtendedSite[];
  siteStaffMap: Map<string, { managers: SiteStaffInfo[], supervisors: SiteStaffInfo[] }>;
  selectedSiteId: string;
  setSelectedSiteId: (id: string) => void;
  selectedManagers: string[];
  setSelectedManagers: (ids: string[]) => void;
  selectedSupervisors: string[];
  setSelectedSupervisors: (ids: string[]) => void;
  taskTitle: string;
  setTaskTitle: (title: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  dueDateTime: string;
  setDueDateTime: (date: string) => void;
  priority: "high" | "medium" | "low";
  setPriority: (priority: "high" | "medium" | "low") => void;
  taskType: string;
  setTaskType: (type: string) => void;
  siteStaffForSelected: { managers: SiteStaffInfo[], supervisors: SiteStaffInfo[] } | null;
  siteStaffingRequirements: {
    requiredManagers: number;
    requiredSupervisors: number;
    currentManagers: number;
    currentSupervisors: number;
  } | null;
  isLoadingSites: boolean;
  isLoadingStaff: boolean;
  isSubmitting: boolean;
  resetForm: () => void;
  editMode?: boolean;
}) => {
  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onOpenChange(false);
    }
  };

  // Calculate staffing status
  const staffingStatus: TaskStaffingStatus = {
    currentManagers: selectedManagers.length,
    currentSupervisors: selectedSupervisors.length,
    requiredManagers: siteStaffingRequirements?.requiredManagers || 0,
    requiredSupervisors: siteStaffingRequirements?.requiredSupervisors || 0,
    missingManagers: Math.max(0, (siteStaffingRequirements?.requiredManagers || 0) - selectedManagers.length),
    missingSupervisors: Math.max(0, (siteStaffingRequirements?.requiredSupervisors || 0) - selectedSupervisors.length),
    isManagerRequirementMet: selectedManagers.length >= (siteStaffingRequirements?.requiredManagers || 0),
    isSupervisorRequirementMet: selectedSupervisors.length >= (siteStaffingRequirements?.requiredSupervisors || 0),
    isFullyStaffed: selectedManagers.length >= (siteStaffingRequirements?.requiredManagers || 0) && 
                    selectedSupervisors.length >= (siteStaffingRequirements?.requiredSupervisors || 0)
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {editMode ? "Edit Task" : "Assign New Task to Site"}
          </DialogTitle>
          <DialogDescription>
            {editMode 
              ? "Update the task details and staff assignments" 
              : "Fill in the task details and select staff to assign"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Site Selection */}
          <div className="space-y-2">
            <Label htmlFor="site" className="text-base font-semibold">
              Select Site <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={selectedSiteId || "placeholder"} 
              onValueChange={(value) => {
                if (value !== "placeholder") {
                  setSelectedSiteId(value);
                }
              }}
              disabled={isLoadingSites || editMode}
            >
              <SelectTrigger id="site" className="w-full">
                <SelectValue placeholder={isLoadingSites ? "Loading sites..." : "Choose a site to assign task"} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingSites ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="ml-2">Loading...</span>
                  </div>
                ) : sites.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No sites found
                  </div>
                ) : (
                  <>
                    <SelectItem value="placeholder" disabled className="hidden">
                      Select a site
                    </SelectItem>
                    {sites.map(site => (
                      <SelectItem key={site._id} value={site._id}>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          <span>{site.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({site.clientName})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedSiteId && selectedSiteId !== "placeholder" && (
            <>
              {/* Site Details Card */}
              <Card className="bg-primary/5 border-primary/10">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Location:</span>
                        <span>{sites.find(s => s._id === selectedSiteId)?.location || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Client:</span>
                        <span>{sites.find(s => s._id === selectedSiteId)?.clientName || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Staffing Requirements:</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={siteStaffingRequirements?.requiredManagers ? "default" : "outline"}>
                          Managers: {siteStaffingRequirements?.requiredManagers || 0}
                        </Badge>
                        <Badge variant={siteStaffingRequirements?.requiredSupervisors ? "default" : "outline"}>
                          Supervisors: {siteStaffingRequirements?.requiredSupervisors || 0}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Staffing Status */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Selection Status:</span>
                      <StaffingStatusIndicator status={staffingStatus} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Managers selected:</span>
                        <span className={`ml-2 font-medium ${!staffingStatus.isManagerRequirementMet && staffingStatus.requiredManagers > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {selectedManagers.length}/{siteStaffingRequirements?.requiredManagers || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Supervisors selected:</span>
                        <span className={`ml-2 font-medium ${!staffingStatus.isSupervisorRequirementMet && staffingStatus.requiredSupervisors > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {selectedSupervisors.length}/{siteStaffingRequirements?.requiredSupervisors || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Currently Assigned Staff from Tasks */}
                  {siteStaffForSelected && (siteStaffForSelected.managers.length > 0 || siteStaffForSelected.supervisors.length > 0) && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Staff Already Assigned to this Site (from all tasks):</p>
                      <div className="space-y-3">
                        {siteStaffForSelected.managers.length > 0 && (
                          <div>
                            <span className="text-xs text-muted-foreground">Managers:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {siteStaffForSelected.managers.map(m => (
                                <Badge key={m.userId} variant="outline" className="text-xs flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {m.name}
                                  <span className="ml-1 text-[10px] bg-primary/10 px-1 rounded">
                                    {m.taskCount} {m.taskCount === 1 ? 'task' : 'tasks'}
                                  </span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {siteStaffForSelected.supervisors.length > 0 && (
                          <div>
                            <span className="text-xs text-muted-foreground">Supervisors:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {siteStaffForSelected.supervisors.map(s => (
                                <Badge key={s.userId} variant="outline" className="text-xs flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  {s.name}
                                  <span className="ml-1 text-[10px] bg-primary/10 px-1 rounded">
                                    {s.taskCount} {s.taskCount === 1 ? 'task' : 'tasks'}
                                  </span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Task Details */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Task Details</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taskTitle">
                      Task Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="taskTitle"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="Enter task title"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="taskType">
                      Task Type <span className="text-destructive">*</span>
                    </Label>
                    <Select value={taskType} onValueChange={setTaskType}>
                      <SelectTrigger id="taskType">
                        <SelectValue placeholder="Select task type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inspection">Inspection</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="audit">Audit</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="safety">Safety Check</SelectItem>
                        <SelectItem value="equipment">Equipment Check</SelectItem>
                        <SelectItem value="routine">Routine</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter detailed task description"
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">
                      Start Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endDate">
                      End Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dueDateTime">
                      Due Date & Time <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="dueDateTime"
                      type="datetime-local"
                      value={dueDateTime}
                      onChange={(e) => setDueDateTime(e.target.value)}
                      min={endDate ? new Date(endDate).toISOString().slice(0, 16) : undefined}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">
                    Priority <span className="text-destructive">*</span>
                  </Label>
                  <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Staff Assignment */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Assign Staff</Label>
                
                {/* Managers Section */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Select Managers
                      <Badge variant="outline" className="ml-2">
                        {selectedManagers.length} / {siteStaffingRequirements?.requiredManagers || 0} selected
                      </Badge>
                      {!staffingStatus.isManagerRequirementMet && staffingStatus.requiredManagers > 0 && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Need {staffingStatus.missingManagers} more
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStaff ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : !siteStaffForSelected || siteStaffForSelected.managers.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No managers assigned to this site from any tasks
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {siteStaffForSelected.managers.map(manager => (
                          <div
                            key={manager.userId}
                            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedManagers.includes(manager.userId)
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-primary/5'
                            }`}
                            onClick={() => {
                              setSelectedManagers(prev => {
                                if (prev.includes(manager.userId)) {
                                  return prev.filter(id => id !== manager.userId);
                                } else {
                                  // Check limit
                                  if (siteStaffingRequirements && prev.length + 1 > siteStaffingRequirements.requiredManagers) {
                                    toast.error(`Maximum ${siteStaffingRequirements.requiredManagers} manager(s) allowed`);
                                    return prev;
                                  }
                                  return [...prev, manager.userId];
                                }
                              });
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{manager.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Already in {manager.taskCount} {manager.taskCount === 1 ? 'task' : 'tasks'}
                                </div>
                              </div>
                            </div>
                            {selectedManagers.includes(manager.userId) ? (
                              <UserCheck className="h-5 w-5 text-primary" />
                            ) : (
                              <UserPlus className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Supervisors Section */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Select Supervisors
                      <Badge variant="outline" className="ml-2">
                        {selectedSupervisors.length} / {siteStaffingRequirements?.requiredSupervisors || 0} selected
                      </Badge>
                      {!staffingStatus.isSupervisorRequirementMet && staffingStatus.requiredSupervisors > 0 && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Need {staffingStatus.missingSupervisors} more
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStaff ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : !siteStaffForSelected || siteStaffForSelected.supervisors.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No supervisors assigned to this site from any tasks
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {siteStaffForSelected.supervisors.map(supervisor => (
                          <div
                            key={supervisor.userId}
                            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedSupervisors.includes(supervisor.userId)
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-primary/5'
                            }`}
                            onClick={() => {
                              setSelectedSupervisors(prev => {
                                if (prev.includes(supervisor.userId)) {
                                  return prev.filter(id => id !== supervisor.userId);
                                } else {
                                  // Check limit
                                  if (siteStaffingRequirements && prev.length + 1 > siteStaffingRequirements.requiredSupervisors) {
                                    toast.error(`Maximum ${siteStaffingRequirements.requiredSupervisors} supervisor(s) allowed`);
                                    return prev;
                                  }
                                  return [...prev, supervisor.userId];
                                }
                              });
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{supervisor.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Already in {supervisor.taskCount} {supervisor.taskCount === 1 ? 'task' : 'tasks'}
                                </div>
                              </div>
                            </div>
                            {selectedSupervisors.includes(supervisor.userId) ? (
                              <UserCheck className="h-5 w-5 text-primary" />
                            ) : (
                              <UserPlus className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Summary Card */}
              <Card className="bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowRight className="h-4 w-4" />
                    <span className="font-medium">Assignment Summary</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Task:</span>
                      <div className="font-medium">{taskTitle || "Untitled"}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Site:</span>
                      <div className="font-medium">{sites.find(s => s._id === selectedSiteId)?.name}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Managers:</span>
                      <div className="font-medium">{selectedManagers.length} selected</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Supervisors:</span>
                      <div className="font-medium">{selectedSupervisors.length} selected</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration:</span>
                      <div className="font-medium">
                        {startDate && endDate ? 
                          `${format(new Date(startDate), "MMM dd")} - ${format(new Date(endDate), "MMM dd, yyyy")}` 
                          : "Not set"}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Due:</span>
                      <div className="font-medium">
                        {dueDateTime ? format(new Date(dueDateTime), "MMM dd, yyyy h:mm a") : "Not set"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Form Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!selectedSiteId || selectedSiteId === "placeholder" || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editMode ? "Updating..." : "Assigning..."}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {editMode ? "Update Task" : "Assign Task"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ==================== Edit Task Form Dialog Component ====================
const EditTaskFormDialog = ({
  open,
  onOpenChange,
  task,
  onSubmit,
  sites,
  siteStaffMap,
  siteStaffForSelected,
  siteStaffingRequirements,
  isLoadingSites,
  isLoadingStaff,
  isSubmitting
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: AssignTask;
  onSubmit: (e: React.FormEvent, updatedTask: AssignTask) => Promise<void>;
  sites: ExtendedSite[];
  siteStaffMap: Map<string, { managers: SiteStaffInfo[], supervisors: SiteStaffInfo[] }>;
  siteStaffForSelected: { managers: SiteStaffInfo[], supervisors: SiteStaffInfo[] } | null;
  siteStaffingRequirements: {
    requiredManagers: number;
    requiredSupervisors: number;
    currentManagers: number;
    currentSupervisors: number;
  } | null;
  isLoadingSites: boolean;
  isLoadingStaff: boolean;
  isSubmitting: boolean;
}) => {
  // Form state
  const [taskTitle, setTaskTitle] = useState(task.taskTitle);
  const [description, setDescription] = useState(task.description);
  const [startDate, setStartDate] = useState(task.startDate.split('T')[0]);
  const [endDate, setEndDate] = useState(task.endDate.split('T')[0]);
  const [dueDateTime, setDueDateTime] = useState(task.dueDateTime.slice(0, 16));
  const [priority, setPriority] = useState<"high" | "medium" | "low">(task.priority);
  const [taskType, setTaskType] = useState(task.taskType);
  
  // Staff selection state - initialize with current assigned staff
  const [selectedManagers, setSelectedManagers] = useState<string[]>(
    task.assignedManagers.map(m => m.userId)
  );
  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>(
    task.assignedSupervisors.map(s => s.userId)
  );

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setTaskTitle(task.taskTitle);
      setDescription(task.description);
      setStartDate(task.startDate.split('T')[0]);
      setEndDate(task.endDate.split('T')[0]);
      setDueDateTime(task.dueDateTime.slice(0, 16));
      setPriority(task.priority);
      setTaskType(task.taskType);
      setSelectedManagers(task.assignedManagers.map(m => m.userId));
      setSelectedSupervisors(task.assignedSupervisors.map(s => s.userId));
    }
  }, [task]);

  // Calculate staffing status
  const staffingStatus: TaskStaffingStatus = {
    currentManagers: selectedManagers.length,
    currentSupervisors: selectedSupervisors.length,
    requiredManagers: siteStaffingRequirements?.requiredManagers || 0,
    requiredSupervisors: siteStaffingRequirements?.requiredSupervisors || 0,
    missingManagers: Math.max(0, (siteStaffingRequirements?.requiredManagers || 0) - selectedManagers.length),
    missingSupervisors: Math.max(0, (siteStaffingRequirements?.requiredSupervisors || 0) - selectedSupervisors.length),
    isManagerRequirementMet: selectedManagers.length >= (siteStaffingRequirements?.requiredManagers || 0),
    isSupervisorRequirementMet: selectedSupervisors.length >= (siteStaffingRequirements?.requiredSupervisors || 0),
    isFullyStaffed: selectedManagers.length >= (siteStaffingRequirements?.requiredManagers || 0) && 
                    selectedSupervisors.length >= (siteStaffingRequirements?.requiredSupervisors || 0)
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!taskTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }
    
    if (!startDate || !endDate || !dueDateTime) {
      toast.error("Please fill in all date fields");
      return;
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const due = new Date(dueDateTime);
    
    if (isAfter(start, end)) {
      toast.error("End date must be after start date");
      return;
    }
    
    if (isAfter(end, due)) {
      toast.error("Due date must be after end date");
      return;
    }
    
    // Validate staffing requirements
    if (siteStaffingRequirements) {
      if (selectedManagers.length > siteStaffingRequirements.requiredManagers) {
        toast.error(`Site only requires ${siteStaffingRequirements.requiredManagers} manager(s)`);
        return;
      }
      
      if (selectedSupervisors.length > siteStaffingRequirements.requiredSupervisors) {
        toast.error(`Site only requires ${siteStaffingRequirements.requiredSupervisors} supervisor(s)`);
        return;
      }
    }
    
    // Get full manager objects - preserve existing status and assignedAt for unchanged managers
    const managersToAssign = siteStaffForSelected?.managers
      .filter(m => selectedManagers.includes(m.userId))
      .map(m => {
        const existing = task.assignedManagers.find(am => am.userId === m.userId);
        return {
          userId: m.userId,
          name: m.name,
          role: 'manager' as const,
          assignedAt: existing?.assignedAt || new Date().toISOString(),
          status: existing?.status || 'pending'
        };
      }) || [];
   
   // Get full supervisor objects
    const supervisorsToAssign = siteStaffForSelected?.supervisors
      .filter(s => selectedSupervisors.includes(s.userId))
      .map(s => {
        const existing = task.assignedSupervisors.find(as => as.userId === s.userId);
        return {
          userId: s.userId,
          name: s.name,
          role: 'supervisor' as const,
          assignedAt: existing?.assignedAt || new Date().toISOString(),
          status: existing?.status || 'pending'
        };
      }) || [];
    
    // Create updated task object
    const updatedTask: AssignTask = {
      ...task,
      taskTitle,
      description,
      startDate,
      endDate,
      dueDateTime,
      priority,
      taskType,
      assignedManagers: managersToAssign,
      assignedSupervisors: supervisorsToAssign
    };
    
    await onSubmit(e, updatedTask);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Task
          </DialogTitle>
          <DialogDescription>
            Update the task details and staff assignments
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Site Information (Read-only) */}
          <Card className="bg-primary/5 border-primary/10">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Site:</span>
                    <span>{task.siteName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Location:</span>
                    <span>{task.siteLocation}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Client:</span>
                    <span>{task.clientName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Staffing Requirements:</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={siteStaffingRequirements?.requiredManagers ? "default" : "outline"}>
                      Managers: {siteStaffingRequirements?.requiredManagers || 0}
                    </Badge>
                    <Badge variant={siteStaffingRequirements?.requiredSupervisors ? "default" : "outline"}>
                      Supervisors: {siteStaffingRequirements?.requiredSupervisors || 0}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Staffing Status */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Selection Status:</span>
                  <StaffingStatusIndicator status={staffingStatus} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Managers selected:</span>
                    <span className={`ml-2 font-medium ${!staffingStatus.isManagerRequirementMet && staffingStatus.requiredManagers > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {selectedManagers.length}/{siteStaffingRequirements?.requiredManagers || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Supervisors selected:</span>
                    <span className={`ml-2 font-medium ${!staffingStatus.isSupervisorRequirementMet && staffingStatus.requiredSupervisors > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {selectedSupervisors.length}/{siteStaffingRequirements?.requiredSupervisors || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Currently Assigned Staff from Tasks */}
              {siteStaffForSelected && (siteStaffForSelected.managers.length > 0 || siteStaffForSelected.supervisors.length > 0) && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Staff Already Assigned to this Site (from all tasks):</p>
                  <div className="space-y-3">
                    {siteStaffForSelected.managers.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">Managers:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {siteStaffForSelected.managers.map(m => (
                            <Badge key={m.userId} variant="outline" className="text-xs flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {m.name}
                              <span className="ml-1 text-[10px] bg-primary/10 px-1 rounded">
                                {m.taskCount} {m.taskCount === 1 ? 'task' : 'tasks'}
                              </span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {siteStaffForSelected.supervisors.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">Supervisors:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {siteStaffForSelected.supervisors.map(s => (
                            <Badge key={s.userId} variant="outline" className="text-xs flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {s.name}
                              <span className="ml-1 text-[10px] bg-primary/10 px-1 rounded">
                                {s.taskCount} {s.taskCount === 1 ? 'task' : 'tasks'}
                              </span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Details */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Task Details</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-taskTitle">
                  Task Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-taskTitle"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Enter task title"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-taskType">
                  Task Type <span className="text-destructive">*</span>
                </Label>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger id="edit-taskType">
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="audit">Audit</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="safety">Safety Check</SelectItem>
                    <SelectItem value="equipment">Equipment Check</SelectItem>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter detailed task description"
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startDate">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-endDate">
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-dueDateTime">
                  Due Date & Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-dueDateTime"
                  type="datetime-local"
                  value={dueDateTime}
                  onChange={(e) => setDueDateTime(e.target.value)}
                  min={endDate ? new Date(endDate).toISOString().slice(0, 16) : undefined}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-priority">
                Priority <span className="text-destructive">*</span>
              </Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger id="edit-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Staff Assignment */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Assign Staff</Label>
            
            {/* Managers Section */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Select Managers
                  <Badge variant="outline" className="ml-2">
                    {selectedManagers.length} / {siteStaffingRequirements?.requiredManagers || 0} selected
                  </Badge>
                  {!staffingStatus.isManagerRequirementMet && staffingStatus.requiredManagers > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      Need {staffingStatus.missingManagers} more
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStaff ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !siteStaffForSelected || siteStaffForSelected.managers.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No managers assigned to this site from any tasks
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {siteStaffForSelected.managers.map(manager => (
                      <div
                        key={manager.userId}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedManagers.includes(manager.userId)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-primary/5'
                        }`}
                        onClick={() => {
                          setSelectedManagers(prev => {
                            if (prev.includes(manager.userId)) {
                              return prev.filter(id => id !== manager.userId);
                            } else {
                              // Check limit
                              if (siteStaffingRequirements && prev.length + 1 > siteStaffingRequirements.requiredManagers) {
                                toast.error(`Maximum ${siteStaffingRequirements.requiredManagers} manager(s) allowed`);
                                return prev;
                              }
                              return [...prev, manager.userId];
                            }
                          });
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{manager.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Already in {manager.taskCount} {manager.taskCount === 1 ? 'task' : 'tasks'}
                            </div>
                          </div>
                        </div>
                        {selectedManagers.includes(manager.userId) ? (
                          <UserCheck className="h-5 w-5 text-primary" />
                        ) : (
                          <UserPlus className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Supervisors Section */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Select Supervisors
                  <Badge variant="outline" className="ml-2">
                    {selectedSupervisors.length} / {siteStaffingRequirements?.requiredSupervisors || 0} selected
                  </Badge>
                  {!staffingStatus.isSupervisorRequirementMet && staffingStatus.requiredSupervisors > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      Need {staffingStatus.missingSupervisors} more
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStaff ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !siteStaffForSelected || siteStaffForSelected.supervisors.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No supervisors assigned to this site from any tasks
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {siteStaffForSelected.supervisors.map(supervisor => (
                      <div
                        key={supervisor.userId}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedSupervisors.includes(supervisor.userId)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-primary/5'
                        }`}
                        onClick={() => {
                          setSelectedSupervisors(prev => {
                            if (prev.includes(supervisor.userId)) {
                              return prev.filter(id => id !== supervisor.userId);
                            } else {
                              // Check limit
                              if (siteStaffingRequirements && prev.length + 1 > siteStaffingRequirements.requiredSupervisors) {
                                toast.error(`Maximum ${siteStaffingRequirements.requiredSupervisors} supervisor(s) allowed`);
                                return prev;
                              }
                              return [...prev, supervisor.userId];
                            }
                          });
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{supervisor.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Already in {supervisor.taskCount} {supervisor.taskCount === 1 ? 'task' : 'tasks'}
                            </div>
                          </div>
                        </div>
                        {selectedSupervisors.includes(supervisor.userId) ? (
                          <UserCheck className="h-5 w-5 text-primary" />
                        ) : (
                          <UserPlus className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Task
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ==================== Main AssignTaskSection Component ====================
const AssignTaskSection = () => {
  // State for sites
  const [sites, setSites] = useState<ExtendedSite[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  
  // Tasks state
  const [assignTasks, setAssignTasks] = useState<AssignTask[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<AssignTask | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<AssignTask | null>(null);
  
  // Site staff map - derived from allTasks
  const [siteStaffMap, setSiteStaffMap] = useState<Map<string, { managers: SiteStaffInfo[], supervisors: SiteStaffInfo[] }>>(new Map());
  
  // Filter and pagination state
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    siteId: '',
    taskType: '',
    searchQuery: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  useEffect(() => {
  if (!pagination) {
    setPagination({
      page: 1,
      limit: 10,
      total: 0,
      pages: 0
    });
  }
}, [pagination]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Form state
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [taskTitle, setTaskTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dueDateTime, setDueDateTime] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [taskType, setTaskType] = useState("routine");
  
  // Staff selection state
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  
  // Site-specific staffing data
  const [siteStaffForSelected, setSiteStaffForSelected] = useState<{ managers: SiteStaffInfo[], supervisors: SiteStaffInfo[] } | null>(null);
  const [siteStaffingRequirements, setSiteStaffingRequirements] = useState<{
    requiredManagers: number;
    requiredSupervisors: number;
    currentManagers: number;
    currentSupervisors: number;
  } | null>(null);

  // Load data on mount
  useEffect(() => {
    fetchSites();
    fetchAllTasks();
    fetchAssignTasks();
  }, []);

  // Build site staff map from allTasks
  useEffect(() => {
    if (allTasks.length > 0) {
      const map = new Map<string, { managers: SiteStaffInfo[], supervisors: SiteStaffInfo[] }>();
      
      allTasks.forEach(task => {
        if (!task.siteId) return;
        
        const siteId = task.siteId;
        if (!map.has(siteId)) {
          map.set(siteId, { managers: [], supervisors: [] });
        }
        
        const siteData = map.get(siteId)!;
        
        // Process managers
        task.assignedUsers?.forEach(user => {
          if (user.role === 'manager') {
            const existingManager = siteData.managers.find(m => m.userId === user.userId);
            if (existingManager) {
              existingManager.taskCount += 1;
              existingManager.taskIds.push(task._id);
            } else {
              siteData.managers.push({
                userId: user.userId,
                name: user.name,
                role: 'manager',
                taskCount: 1,
                taskIds: [task._id]
              });
            }
          } else if (user.role === 'supervisor') {
            const existingSupervisor = siteData.supervisors.find(s => s.userId === user.userId);
            if (existingSupervisor) {
              existingSupervisor.taskCount += 1;
              existingSupervisor.taskIds.push(task._id);
            } else {
              siteData.supervisors.push({
                userId: user.userId,
                name: user.name,
                role: 'supervisor',
                taskCount: 1,
                taskIds: [task._id]
              });
            }
          }
        });
      });
      
      setSiteStaffMap(map);
      console.log('📊 Site staff map built:', map);
    }
  }, [allTasks]);

  // Update site staff when selected site changes
  useEffect(() => {
    if (selectedSiteId) {
      const site = sites.find(s => s._id === selectedSiteId);
      const staff = siteStaffMap.get(selectedSiteId) || { managers: [], supervisors: [] };
      
      setSiteStaffForSelected(staff);
      
      setSiteStaffingRequirements({
        requiredManagers: site?.managerCount || 0,
        requiredSupervisors: site?.supervisorCount || 0,
        currentManagers: staff.managers.length,
        currentSupervisors: staff.supervisors.length
      });
      
      // Reset selections
      setSelectedManagers([]);
      setSelectedSupervisors([]);
    } else {
      setSiteStaffForSelected(null);
      setSiteStaffingRequirements(null);
      setSelectedManagers([]);
      setSelectedSupervisors([]);
    }
  }, [selectedSiteId, sites, siteStaffMap]);

  // Fetch sites from API
  const fetchSites = async () => {
    try {
      setIsLoadingSites(true);
      console.log('📋 Fetching sites from API...');
      
      const sitesData = await taskService.getAllSites();
      
      console.log('✅ Sites fetched:', sitesData);
      setSites(sitesData || []);
    } catch (error: any) {
      console.error("❌ Error fetching sites:", error);
      toast.error(error.message || "Failed to load sites");
      setSites([]);
    } finally {
      setIsLoadingSites(false);
    }
  };

  // Fetch all tasks (to get assignedUsers)
  const fetchAllTasks = async () => {
    try {
      setIsLoadingStaff(true);
      console.log('📋 Fetching all tasks to get assigned staff...');
      
      const tasksData = await taskService.getAllTasks();
      
      console.log('✅ Tasks fetched:', tasksData.length);
      setAllTasks(tasksData || []);
    } catch (error: any) {
      console.error("❌ Error fetching tasks:", error);
      toast.error(error.message || "Failed to load tasks");
      setAllTasks([]);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  // Fetch assign tasks with filters
 const fetchAssignTasks = async () => {
  try {
    setIsLoadingTasks(true);
    console.log('📋 Fetching assign tasks with filters:', filters);
    
    const response = await assignTaskService.getAllAssignTasks({
      status: filters.status || undefined,
      priority: filters.priority || undefined,
      siteId: filters.siteId || undefined,
      taskType: filters.taskType || undefined,
      page: pagination.page,
      limit: pagination.limit,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    
    console.log('✅ Assign tasks fetched:', response);
    setAssignTasks(response.tasks || []);
    
    // ✅ Add fallback for pagination
    if (response.pagination) {
      setPagination(response.pagination);
    } else {
      // If no pagination from API, use defaults
      setPagination({
        page: 1,
        limit: 10,
        total: response.tasks?.length || 0,
        pages: 1
      });
    }
  } catch (error: any) {
    console.error("❌ Error fetching assign tasks:", error);
    toast.error(error.message || "Failed to load tasks");
    setAssignTasks([]);
    // ✅ Set default pagination on error
    setPagination({
      page: 1,
      limit: 10,
      total: 0,
      pages: 0
    });
  } finally {
    setIsLoadingTasks(false);
  }
};

  // Apply filters when they change
  useEffect(() => {
    fetchAssignTasks();
  }, [filters.status, filters.priority, filters.siteId, filters.taskType, pagination.page]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.searchQuery) {
        handleSearch();
      } else if (!filters.status && !filters.priority && !filters.siteId && !filters.taskType) {
        fetchAssignTasks();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [filters.searchQuery]);

  const handleSearch = async () => {
    if (!filters.searchQuery.trim()) {
      fetchAssignTasks();
      return;
    }

    try {
      setIsLoadingTasks(true);
      console.log('🔍 Searching tasks with query:', filters.searchQuery);
      
      const results = await assignTaskService.searchTasks({
  query: filters.searchQuery,
  status: filters.status || undefined,
  priority: filters.priority || undefined,
  siteId: filters.siteId || undefined,
  taskType: filters.taskType || undefined
});
      
      console.log('✅ Search results:', results);
      setAssignTasks(results);
    } catch (error: any) {
      console.error("❌ Error searching tasks:", error);
      toast.error(error.message || "Failed to search tasks");
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Handle form submission for creating new task
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!selectedSiteId) {
      toast.error("Please select a site");
      return;
    }
    
    if (!taskTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }
    
    if (!startDate || !endDate || !dueDateTime) {
      toast.error("Please fill in all date fields");
      return;
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const due = new Date(dueDateTime);
    
    if (isAfter(start, end)) {
      toast.error("End date must be after start date");
      return;
    }
    
    if (isAfter(end, due)) {
      toast.error("Due date must be after end date");
      return;
    }
    
    // Validate staffing requirements
    if (siteStaffingRequirements) {
      if (selectedManagers.length > siteStaffingRequirements.requiredManagers) {
        toast.error(`Site only requires ${siteStaffingRequirements.requiredManagers} manager(s)`);
        return;
      }
      
      if (selectedSupervisors.length > siteStaffingRequirements.requiredSupervisors) {
        toast.error(`Site only requires ${siteStaffingRequirements.requiredSupervisors} supervisor(s)`);
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      const selectedSite = sites.find(s => s._id === selectedSiteId);
      if (!selectedSite) throw new Error("Site not found");
      
      // Get full manager objects from site staff map
      const managersToAssign = siteStaffForSelected?.managers
        .filter(m => selectedManagers.includes(m.userId))
        .map(m => ({
          userId: m.userId,
          name: m.name,
          role: 'manager' as const
        })) || [];
      
      // Get full supervisor objects from site staff map
      const supervisorsToAssign = siteStaffForSelected?.supervisors
        .filter(s => selectedSupervisors.includes(s.userId))
        .map(s => ({
          userId: s.userId,
          name: s.name,
          role: 'supervisor' as const
        })) || [];
      
      // Create task data
      const taskData: CreateAssignTaskRequest = {
        taskTitle,
        description,
        startDate,
        endDate,
        dueDateTime,
        priority,
        taskType,
        siteId: selectedSite._id,
        siteName: selectedSite.name,
        siteLocation: selectedSite.location,
        clientName: selectedSite.clientName,
        assignedManagers: managersToAssign,
        assignedSupervisors: supervisorsToAssign,
        createdBy: "current-user-id",
        createdByName: "Current User"
      };
      
      console.log('📝 Creating assign task:', taskData);
      const newTask = await assignTaskService.createAssignTask(taskData);
console.log('✅ Task created:', newTask);
toast.success("Task assigned successfully!");

// 🔔 Notify all assigned supervisors
if (newTask && newTask.assignedSupervisors) {
  newTask.assignedSupervisors.forEach((supervisor: any) => {
    window.dispatchEvent(new CustomEvent('task-assigned', {
      detail: {
        taskId: newTask._id,
        taskTitle: newTask.taskTitle,
        assignedToName: supervisor.name,
        assignedToId: supervisor.userId,
        siteName: newTask.siteName,
        priority: newTask.priority,
      }
    }));
  });
  // 🔔 Notify superadmin of new task creation
if (newTask) {
  createNotificationForSuperadmin(
    `📋 New Task: ${newTask.taskTitle}`,
    `Task "${newTask.taskTitle}" assigned to ${newTask.siteName} – Priority: ${newTask.priority}`,
    'info',
    newTask.priority === 'high' ? 'high' : 'medium',
    {
      taskId: newTask._id,
      siteName: newTask.siteName,
      priority: newTask.priority,
      taskTitle: newTask.taskTitle
    },
    'task_creation'
  );
}
}

      
      // Refresh tasks list
      fetchAssignTasks();
      fetchAllTasks(); // Refresh to update staff map
      
      // Reset form and close dialog
      resetForm();
      setShowAssignForm(false);
      
    } catch (error: any) {
      console.error("❌ Error assigning task:", error);
      toast.error(error.message || "Failed to assign task");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form submission for editing task
// Handle form submission for editing task
const handleEditSubmit = async (e: React.FormEvent, updatedTask: AssignTask) => {
  e.preventDefault();
  
  if (!taskToEdit) return;
  
  setIsSubmitting(true);
  
  try {
    // Prepare update data
    const updateData: UpdateAssignTaskRequest = {
      taskTitle: updatedTask.taskTitle,
      description: updatedTask.description,
      startDate: updatedTask.startDate,
      endDate: updatedTask.endDate,
      dueDateTime: updatedTask.dueDateTime,
      priority: updatedTask.priority,
      taskType: updatedTask.taskType,
      assignedManagers: updatedTask.assignedManagers,
      assignedSupervisors: updatedTask.assignedSupervisors
    };
    
    console.log('📝 Updating task:', taskToEdit._id, updateData);
    
    // SINGLE call to update the task
    const result = await assignTaskService.updateAssignTask(taskToEdit._id, updateData);
    
    console.log('✅ Task updated:', result);
    toast.success("Task updated successfully!");
    
    // 🔔 Dispatch for new supervisors (compare old vs new)
    const oldSupervisorIds = new Set(taskToEdit.assignedSupervisors?.map(s => s.userId) || []);
    const newSupervisors = result.assignedSupervisors?.filter(s => !oldSupervisorIds.has(s.userId)) || [];
    
    newSupervisors.forEach((supervisor: any) => {
      window.dispatchEvent(new CustomEvent('task-assigned', {
        detail: {
          taskId: result._id,
          taskTitle: result.taskTitle,
          assignedToName: supervisor.name,
          assignedToId: supervisor.userId,
          siteName: result.siteName,
          priority: result.priority,
        }
      }));
    });
    // 🔔 Notify superadmin of task update (if status changed to 'completed')
if (result.status === 'completed' && taskToEdit.status !== 'completed') {
  createNotificationForSuperadmin(
    `✅ Task Completed: ${result.taskTitle}`,
    `Task "${result.taskTitle}" at ${result.siteName} has been completed`,
    'success',
    'medium',
    {
      taskId: result._id,
      siteName: result.siteName,
      taskTitle: result.taskTitle
    },
    'task_completed'
  );
}
    // 🎯 If status changed to 'completed', stop persistent sound
    if (result.status === 'completed' && taskToEdit.status !== 'completed') {
      window.dispatchEvent(new CustomEvent('task-completed', {
        detail: { taskId: result._id }
      }));
    }
    
    // Refresh tasks list
    fetchAssignTasks();
    fetchAllTasks(); // Refresh to update staff map
    
    // Update selected task if it's open
    if (selectedTask && selectedTask._id === taskToEdit._id) {
      setSelectedTask(result);
    }
    
    // Close edit form
    setShowEditForm(false);
    setTaskToEdit(null);
    
  } catch (error: any) {
    console.error("❌ Error updating task:", error);
    toast.error(error.message || "Failed to update task");
  } finally {
    setIsSubmitting(false);
  }
};

  // Reset form
  const resetForm = () => {
    setSelectedSiteId("");
    setTaskTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setDueDateTime("");
    setPriority("medium");
    setTaskType("routine");
    setSelectedManagers([]);
    setSelectedSupervisors([]);
  };

  // Handle status update
  const handleStatusUpdate = async (taskId: string, status: string) => {
    try {
      const statusData: UpdateStatusRequest = { 
        status: status as any 
      };
      
      await assignTaskService.updateTaskStatus(taskId, statusData);
      
      toast.success(`Task marked as ${status}`);
      
      // Refresh tasks
      fetchAssignTasks();
      
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

  // Handle add update
  const handleAddUpdate = async (taskId: string, content: string) => {
    try {
      const updateData: AddHourlyUpdateRequest = {
        content,
        submittedBy: "current-user-id",
        submittedByName: "Current User"
      };
      
      await assignTaskService.addHourlyUpdate(taskId, updateData);
      
      toast.success("Update added successfully");
      
      // Refresh tasks
      fetchAssignTasks();
      
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

  // Handle add attachment
  const handleAddAttachment = async (taskId: string, file: File) => {
    try {
      // In a real app, you would upload the file to a storage service first
      // and then save the URL. For now, we'll create a mock URL
      const mockUrl = URL.createObjectURL(file);
      
      const attachmentData: AddAttachmentRequest = {
        filename: file.name,
        url: mockUrl,
        size: file.size,
        type: file.type,
        uploadedBy: "current-user-id",
        uploadedByName: "Current User"
      };
      
      await assignTaskService.addAttachment(taskId, attachmentData);
      
      toast.success("File uploaded successfully");
      
      // Refresh tasks
      fetchAssignTasks();
      
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

  // Handle delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      await assignTaskService.deleteAssignTask(taskId);
      toast.success("Task deleted successfully");
      fetchAssignTasks();
      fetchAllTasks(); // Refresh to update staff map
      if (selectedTask && selectedTask._id === taskId) {
        setShowTaskDetails(false);
        setSelectedTask(null);
      }
    } catch (error: any) {
      console.error("Error deleting task:", error);
      toast.error(error.message || "Failed to delete task");
    }
  };

  // Handle view task
  const handleViewTask = (task: AssignTask) => {
    setSelectedTask(task);
    setShowTaskDetails(true);
  };

  // Handle edit task
  const handleEditTask = (task: AssignTask) => {
    setTaskToEdit(task);
    setSelectedSiteId(task.siteId);
    setShowEditForm(true);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      siteId: '',
      taskType: '',
      searchQuery: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchAssignTasks();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      pending: "secondary",
      "in-progress": "default",
      completed: "default",
      cancelled: "destructive"
    };
    return variants[status] || "outline";
  };

  // Get priority badge variant
  const getPriorityVariant = (priority: string): "default" | "destructive" | "secondary" | "outline" => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      high: "destructive",
      medium: "default",
      low: "secondary"
    };
    return variants[priority] || "outline";
  };

  // Calculate staffing status for a task
  const getTaskStaffingStatus = (task: AssignTask): TaskStaffingStatus => {
    const site = sites.find(s => s._id === task.siteId);
    return {
      currentManagers: task.assignedManagers.length,
      currentSupervisors: task.assignedSupervisors.length,
      requiredManagers: site?.managerCount || 0,
      requiredSupervisors: site?.supervisorCount || 0,
      missingManagers: Math.max(0, (site?.managerCount || 0) - task.assignedManagers.length),
      missingSupervisors: Math.max(0, (site?.supervisorCount || 0) - task.assignedSupervisors.length),
      isManagerRequirementMet: task.assignedManagers.length >= (site?.managerCount || 0),
      isSupervisorRequirementMet: task.assignedSupervisors.length >= (site?.supervisorCount || 0),
      isFullyStaffed: task.assignedManagers.length >= (site?.managerCount || 0) && 
                      task.assignedSupervisors.length >= (site?.supervisorCount || 0)
    };
  };

  return (
    <div className="space-y-6">
      {/* Header with Assign Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Task Assignment</h2>
          <p className="text-muted-foreground">Create and manage tasks assigned to sites</p>
        </div>
        <Button onClick={() => setShowAssignForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Assign New Task
        </Button>
      </div>

      {/* Assign Task Form Dialog */}
      <AssignTaskFormDialog
        open={showAssignForm}
        onOpenChange={setShowAssignForm}
        onSubmit={handleSubmit}
        sites={sites}
        siteStaffMap={siteStaffMap}
        selectedSiteId={selectedSiteId}
        setSelectedSiteId={setSelectedSiteId}
        selectedManagers={selectedManagers}
        setSelectedManagers={setSelectedManagers}
        selectedSupervisors={selectedSupervisors}
        setSelectedSupervisors={setSelectedSupervisors}
        taskTitle={taskTitle}
        setTaskTitle={setTaskTitle}
        description={description}
        setDescription={setDescription}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        dueDateTime={dueDateTime}
        setDueDateTime={setDueDateTime}
        priority={priority}
        setPriority={setPriority}
        taskType={taskType}
        setTaskType={setTaskType}
        siteStaffForSelected={siteStaffForSelected}
        siteStaffingRequirements={siteStaffingRequirements}
        isLoadingSites={isLoadingSites}
        isLoadingStaff={isLoadingStaff}
        isSubmitting={isSubmitting}
        resetForm={resetForm}
      />

      {/* Edit Task Form Dialog */}
      {taskToEdit && (
        <EditTaskFormDialog
          open={showEditForm}
          onOpenChange={setShowEditForm}
          task={taskToEdit}
          onSubmit={handleEditSubmit}
          sites={sites}
          siteStaffMap={siteStaffMap}
          siteStaffForSelected={siteStaffForSelected}
          siteStaffingRequirements={siteStaffingRequirements}
          isLoadingSites={isLoadingSites}
          isLoadingStaff={isLoadingStaff}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Tasks List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Assigned Tasks
              <Badge variant="outline" className="ml-2">
                {pagination.total} total
              </Badge>
            </CardTitle>
            
            {/* Search and Filter Controls */}
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="pl-8 w-64"
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
              
              {(filters.status || filters.priority || filters.siteId || filters.taskType) && (
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
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select 
                    value={filters.status || "all"} 
                    onValueChange={(v) => setFilters(prev => ({ ...prev, status: v === "all" ? "" : v, page: 1 }))}
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
                    onValueChange={(v) => setFilters(prev => ({ ...prev, priority: v === "all" ? "" : v, page: 1 }))}
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

                <div>
                  <Label>Site</Label>
                  <Select 
                    value={filters.siteId || "all"} 
                    onValueChange={(v) => setFilters(prev => ({ ...prev, siteId: v === "all" ? "" : v, page: 1 }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Sites" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {sites.map(site => (
                        <SelectItem key={site._id} value={site._id}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Task Type</Label>
                  <Select 
                    value={filters.taskType || "all"} 
                    onValueChange={(v) => setFilters(prev => ({ ...prev, taskType: v === "all" ? "" : v, page: 1 }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="audit">Audit</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="safety">Safety</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="routine">Routine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingTasks ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : assignTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No tasks assigned yet</p>
              <p className="text-sm">Click the "Assign New Task" button to create your first task</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task Title</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Assigned Staff</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignTasks.map(task => {
                    const totalStaff = task.assignedManagers.length + task.assignedSupervisors.length;
                    const isOverdue = task.isOverdue && task.status !== 'completed';
                    const staffingStatus = getTaskStaffingStatus(task);
                    
                    return (
                      <TableRow key={task._id} className={isOverdue ? "bg-destructive/5" : ""}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{task.taskTitle}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {task.description.substring(0, 50)}...
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            <span>{task.siteName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              <span className="text-xs">
                                Managers: {task.assignedManagers.length}/{staffingStatus.requiredManagers}
                              </span>
                              {!staffingStatus.isManagerRequirementMet && staffingStatus.requiredManagers > 0 && (
                                <Badge variant="destructive" className="text-[10px] h-4 px-1">
                                  Need {staffingStatus.missingManagers}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-3 w-3" />
                              <span className="text-xs">
                                Supervisors: {task.assignedSupervisors.length}/{staffingStatus.requiredSupervisors}
                              </span>
                              {!staffingStatus.isSupervisorRequirementMet && staffingStatus.requiredSupervisors > 0 && (
                                <Badge variant="destructive" className="text-[10px] h-4 px-1">
                                  Need {staffingStatus.missingSupervisors}
                                </Badge>
                              )}
                            </div>
                            {staffingStatus.isFullyStaffed && (
                              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 text-[10px] h-4">
                                Fully Staffed
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityVariant(task.priority)}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={getStatusVariant(task.status)}>
                              {task.status}
                            </Badge>
                            {isOverdue && (
                              <Badge variant="destructive">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs">{formatDate(task.dueDateTime)}</span>
                            {task.daysUntilDue !== undefined && task.status !== 'completed' && (
                              <span className={`text-xs ${
                                task.daysUntilDue < 0 ? 'text-destructive' : 
                                task.daysUntilDue < 3 ? 'text-orange-500' : 'text-muted-foreground'
                              }`}>
                                {task.daysUntilDue < 0 ? `${Math.abs(task.daysUntilDue)} days overdue` : 
                                 task.daysUntilDue === 0 ? 'Due today' : 
                                 `${task.daysUntilDue} days left`}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className={`h-2 rounded-full ${
                                  task.completionPercentage === 100 ? 'bg-green-500' : 'bg-primary'
                                }`}
                                style={{ width: `${task.completionPercentage}%` }}
                              />
                            </div>
                            <span className="text-xs">{task.completionPercentage}%</span>
                          </div>
                          {totalStaff > 0 && (
                            <div className="text-xs text-muted-foreground text-center">
                              {task.assignedManagers.filter(m => m.status === 'completed').length +
                               task.assignedSupervisors.filter(s => s.status === 'completed').length}/{totalStaff}
                            </div>
                          )}
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTask(task)}
                              title="Edit Task"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteTask(task._id)}
                              title="Delete Task"
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

              {/* Pagination */}
             {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} tasks
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Task Details Dialog */}
      {selectedTask && (
        <TaskDetailsDialog
          task={selectedTask}
          open={showTaskDetails}
          onOpenChange={setShowTaskDetails}
          onStatusUpdate={handleStatusUpdate}
          onAddUpdate={handleAddUpdate}
          onAddAttachment={handleAddAttachment}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          sites={sites}
          siteStaffMap={siteStaffMap}
        />
      )}
    </div>
  );
};

export default AssignTaskSection;