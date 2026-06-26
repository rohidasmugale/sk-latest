import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, User, Briefcase, Building, Calendar, Edit } from 'lucide-react';
import { assignTaskService, type AssignTask, type CreateAssignTaskRequest } from '@/services/assignTaskService';
import { taskService, type ExtendedSite, type StaffWithTaskCount } from '@/services/TaskService';
import { useRole } from '@/context/RoleContext';
import { createNotificationForSuperadmin } from '@/lib/notificationHelper';
interface AssignTaskPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated?: () => void;
  taskToEdit?: AssignTask | null;
  isEditMode?: boolean;
}

interface SiteStaff {
  managers: StaffWithTaskCount[];
  supervisors: StaffWithTaskCount[];
}

const AssignTaskPopup: React.FC<AssignTaskPopupProps> = ({
  open,
  onOpenChange,
  onTaskCreated,
  taskToEdit,
  isEditMode = false
}) => {
  const { user } = useRole();
  
  // Form state
  const [sites, setSites] = useState<ExtendedSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dueDateTime, setDueDateTime] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskType, setTaskType] = useState('routine');
  
  // Staff state
  const [siteStaff, setSiteStaff] = useState<SiteStaff>({ managers: [], supervisors: [] });
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  
  // Loading states
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load task data for edit mode
  useEffect(() => {
    if (open && isEditMode && taskToEdit) {
      loadTaskForEdit();
    } else if (open && !isEditMode) {
      resetForm();
      fetchSites();
    }
  }, [open, isEditMode, taskToEdit]);

  const loadTaskForEdit = () => {
    if (!taskToEdit) return;
    
    console.log('Loading task for edit:', taskToEdit);
    
    setSelectedSiteId(taskToEdit.siteId);
    setTaskTitle(taskToEdit.taskTitle);
    setDescription(taskToEdit.description);
    
    // Format dates for input fields
    setStartDate(taskToEdit.startDate.split('T')[0]);
    setEndDate(taskToEdit.endDate.split('T')[0]);
    setDueDateTime(taskToEdit.dueDateTime.slice(0, 16));
    
    setPriority(taskToEdit.priority);
    setTaskType(taskToEdit.taskType);
    
    // Set selected staff
    setSelectedManagers(taskToEdit.assignedManagers?.map(m => m.userId) || []);
    setSelectedSupervisors(taskToEdit.assignedSupervisors?.map(s => s.userId) || []);
    
    // Fetch sites and then fetch staff for this site
    fetchSites().then(() => {
      if (taskToEdit.siteId) {
        fetchSiteStaff(taskToEdit.siteId);
      }
    });
  };

  // Fetch staff when site changes
  useEffect(() => {
    if (selectedSiteId) {
      fetchSiteStaff(selectedSiteId);
    } else {
      setSiteStaff({ managers: [], supervisors: [] });
      setSelectedManagers([]);
      setSelectedSupervisors([]);
    }
  }, [selectedSiteId]);

  const fetchSites = async () => {
    try {
      setIsLoadingSites(true);
      const sitesData = await taskService.getAllSites();
      setSites(sitesData || []);
      return sitesData;
    } catch (error) {
      console.error('Error fetching sites:', error);
      toast.error('Failed to load sites');
      return [];
    } finally {
      setIsLoadingSites(false);
    }
  };

  const fetchSiteStaff = async (siteId: string) => {
    try {
      setIsLoadingStaff(true);
      
      console.log('🔍 Fetching staff for site:', siteId);
      
      // Get staff with task counts from all tasks
      const staffData = await taskService.getSiteStaffWithCounts(siteId);
      
      console.log('📊 Site staff fetched:', {
        managers: staffData.managers.length,
        supervisors: staffData.supervisors.length,
        managerDetails: staffData.managers,
        supervisorDetails: staffData.supervisors
      });
      
      setSiteStaff(staffData);
      
      if (staffData.supervisors.length === 0) {
        console.warn('⚠️ No supervisors found for this site');
      }
      
    } catch (error) {
      console.error('❌ Error fetching site staff:', error);
      toast.error('Failed to load staff for this site');
      setSiteStaff({ managers: [], supervisors: [] });
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!selectedSiteId) {
      toast.error('Please select a site');
      return;
    }
    
    if (!taskTitle.trim()) {
      toast.error('Please enter task title');
      return;
    }
    
    if (!description.trim()) {
      toast.error('Please enter description');
      return;
    }
    
    if (!startDate || !endDate || !dueDateTime) {
      toast.error('Please fill in all date fields');
      return;
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const due = new Date(dueDateTime);
    
    if (start > end) {
      toast.error('End date must be after start date');
      return;
    }
    
    if (end > due) {
      toast.error('Due date must be after end date');
      return;
    }
    
    // Validate that at least one staff member is selected
    if (selectedManagers.length === 0 && selectedSupervisors.length === 0) {
      toast.error('Please select at least one manager or supervisor');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const selectedSite = sites.find(s => s._id === selectedSiteId);
      if (!selectedSite) throw new Error('Site not found');
      
      // Prepare assigned staff
      const assignedManagers = siteStaff.managers
        .filter(m => selectedManagers.includes(m.userId))
        .map(m => ({ 
          userId: m.userId,
          name: m.name, 
          role: 'manager' as const
        }));
      
      const assignedSupervisors = siteStaff.supervisors
        .filter(s => selectedSupervisors.includes(s.userId))
        .map(s => ({ 
          userId: s.userId,
          name: s.name, 
          role: 'supervisor' as const
        }));
      
      console.log('Final assigned data:', {
        assignedManagers,
        assignedSupervisors,
        managersCount: assignedManagers.length,
        supervisorsCount: assignedSupervisors.length
      });
      
      if (isEditMode && taskToEdit) {
        // Update existing task
        const updateData = {
          taskTitle,
          description,
          startDate,
          endDate,
          dueDateTime,
          priority,
          taskType,
          assignedManagers,
          assignedSupervisors
        };
        
        console.log('Updating task with data:', updateData);
        const updatedTask = await assignTaskService.updateAssignTask(taskToEdit._id, updateData);
        toast.success('Task updated successfully!');
        
        // 🔔 Dispatch for new supervisors
        const oldSupervisorIds = new Set(taskToEdit.assignedSupervisors?.map(s => s.userId) || []);
        const newSupervisors = updatedTask.assignedSupervisors?.filter(s => !oldSupervisorIds.has(s.userId)) || [];
        
        newSupervisors.forEach((supervisor: any) => {
          window.dispatchEvent(new CustomEvent('task-assigned', {
            detail: {
              taskId: updatedTask._id,
              taskTitle: updatedTask.taskTitle,
              assignedToName: supervisor.name,
              assignedToId: supervisor.userId,
              siteName: updatedTask.siteName,
              priority: updatedTask.priority,
            }
          }));
        });
        
        // 🎯 If status changed to 'completed', stop persistent sound
        if (updatedTask.status === 'completed' && taskToEdit.status !== 'completed') {
          window.dispatchEvent(new CustomEvent('task-completed', {
            detail: { taskId: updatedTask._id }
          }));
        }
      } else {
        // Create new task
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
          siteLocation: selectedSite.location || 'N/A',
          clientName: selectedSite.clientName || 'N/A',
          assignedManagers,
          assignedSupervisors,
          createdBy: user?._id || user?.id || 'system',
          createdByName: user?.name || 'Admin'
        };
        
        console.log('Submitting new task data:', JSON.stringify(taskData, null, 2));
        
        const result = await assignTaskService.createAssignTask(taskData);
        console.log('Task created result:', result);
        
        // 🔔 Trigger notification for each assigned supervisor
        if (result && result.assignedSupervisors) {
          result.assignedSupervisors.forEach((supervisor: any) => {
            window.dispatchEvent(new CustomEvent('task-assigned', {
              detail: {
                taskTitle: result.taskTitle,
                taskId: result._id,
                assignedToName: supervisor.name,
                assignedToId: supervisor.userId,
                siteName: result.siteName,
                priority: result.priority,
              }
            }));
          });
           createNotificationForSuperadmin(
    `📋 New Task: ${result.taskTitle}`,
    `Task "${result.taskTitle}" assigned to ${result.siteName} – Priority: ${result.priority}`,
    'info',
    result.priority === 'high' ? 'high' : 'medium',
    {
      taskId: result._id,
      siteName: result.siteName,
      priority: result.priority,
      taskTitle: result.taskTitle
    },
    'task_creation'
  );
        }
        
        toast.success('Task assigned successfully!');
      }
      
      // Reset form and close
      resetForm();
      onOpenChange(false);
      
      // Notify parent
      if (onTaskCreated) {
        onTaskCreated();
      }
      
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast.error(error.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedSiteId('');
    setTaskTitle('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setDueDateTime('');
    setPriority('medium');
    setTaskType('routine');
    setSelectedManagers([]);
    setSelectedSupervisors([]);
    setSiteStaff({ managers: [], supervisors: [] });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onOpenChange(false);
    }
  };

  const selectedSite = sites.find(s => s._id === selectedSiteId);
  const requiredManagers = selectedSite?.managerCount || 0;
  const requiredSupervisors = selectedSite?.supervisorCount || 0;
  
  const isManagerRequirementMet = requiredManagers === 0 || selectedManagers.length >= requiredManagers;
  const isSupervisorRequirementMet = requiredSupervisors === 0 || selectedSupervisors.length >= requiredSupervisors;
  const isFullyStaffed = isManagerRequirementMet && isSupervisorRequirementMet;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {isEditMode ? <Edit className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
            {isEditMode ? 'Edit Task' : 'Assign New Task'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update the task details and staff assignments'
              : 'Fill in the task details and select staff to assign'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Site Selection */}
          <div className="space-y-2">
            <Label htmlFor="site" className="text-base font-semibold">
              Select Site <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={selectedSiteId} 
              onValueChange={setSelectedSiteId}
              disabled={isLoadingSites || (isEditMode && !!taskToEdit)}
            >
              <SelectTrigger id="site">
                <SelectValue placeholder={isLoadingSites ? "Loading sites..." : "Choose a site"} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingSites ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : sites.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No sites found
                  </div>
                ) : (
                  sites.map(site => (
                    <SelectItem key={site._id} value={site._id}>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span>{site.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({site.clientName || 'No Client'})
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Site Details Card */}
          {selectedSiteId && selectedSite && (
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{selectedSite.location || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{selectedSite.clientName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Managers at Site</p>
                    <p className="font-medium">{siteStaff.managers.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Supervisors at Site</p>
                    <p className="font-medium">{siteStaff.supervisors.length}</p>
                  </div>
                </div>

                {/* Staffing Status */}
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Selection Status:</span>
                    {selectedManagers.length > 0 || selectedSupervisors.length > 0 ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Staff Selected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                        No Staff Selected
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Managers Selected:</span>
                      <span className={`ml-2 font-medium ${selectedManagers.length > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                        {selectedManagers.length}
                      </span>
                      {siteStaff.managers.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          (of {siteStaff.managers.length} total)
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Supervisors Selected:</span>
                      <span className={`ml-2 font-medium ${selectedSupervisors.length > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                        {selectedSupervisors.length}
                      </span>
                      {siteStaff.supervisors.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          (of {siteStaff.supervisors.length} total)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task Details */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold">Task Details</h3>
            
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taskType">
                  Task Type <span className="text-destructive">*</span>
                </Label>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger id="taskType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="audit">Audit</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="safety">Safety Check</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
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

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter detailed task description"
                rows={3}
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
          </div>

          {/* Staff Selection */}
          {selectedSiteId && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Select Staff</h3>
              
              {isLoadingStaff ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading staff...</span>
                </div>
              ) : (
                <>
                  {/* Managers Section */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Managers
                      <Badge variant="outline" className="ml-2">
                        {selectedManagers.length} selected
                      </Badge>
                    </Label>
                    
                    {siteStaff.managers.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                        {siteStaff.managers.map(manager => (
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
                                  Tasks: {manager.taskCount}
                                </div>
                              </div>
                            </div>
                            {selectedManagers.includes(manager.userId) && (
                              <Badge variant="default" className="bg-primary">Selected</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground border rounded-lg">
                        No managers found for this site
                      </div>
                    )}
                  </div>

                  {/* Supervisors Section */}
                  <div className="space-y-2 mt-4">
                    <Label className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Supervisors
                      <Badge variant="outline" className="ml-2">
                        {selectedSupervisors.length} selected
                      </Badge>
                    </Label>
                    
                    {siteStaff.supervisors.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                        {siteStaff.supervisors.map(supervisor => (
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
                                  Tasks: {supervisor.taskCount}
                                </div>
                              </div>
                            </div>
                            {selectedSupervisors.includes(supervisor.userId) && (
                              <Badge variant="default" className="bg-primary">Selected</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground border rounded-lg">
                        No supervisors found for this site
                      </div>
                    )}
                  </div>

                  {/* Show message if both are empty */}
                  {siteStaff.managers.length === 0 && siteStaff.supervisors.length === 0 && !isLoadingStaff && (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                      <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No managers or supervisors found for this site</p>
                      <p className="text-xs mt-1">Staff will appear here once they are assigned to tasks</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-2 pt-4 border-t">
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
              disabled={!selectedSiteId || isSubmitting || (selectedManagers.length === 0 && selectedSupervisors.length === 0)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Assigning...'}
                </>
              ) : (
                <>
                  {isEditMode ? <Edit className="mr-2 h-4 w-4" /> : <Calendar className="mr-2 h-4 w-4" />}
                  {isEditMode ? 'Update Task' : 'Assign Task'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssignTaskPopup;