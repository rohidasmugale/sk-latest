// components/manager/ManagerAssignTaskPopup.tsx
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
import { Loader2, User, Briefcase, Building, Calendar, Shield, AlertCircle } from 'lucide-react';
import { assignTaskService, type CreateAssignTaskRequest } from '@/services/assignTaskService';
import { taskService, type ExtendedSite, type StaffWithTaskCount } from '@/services/TaskService';
import { useRole } from '@/context/RoleContext';

interface ManagerAssignTaskPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated?: () => void;
}

interface SiteStaff {
  supervisors: StaffWithTaskCount[];
}
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

const ManagerAssignTaskPopup: React.FC<ManagerAssignTaskPopupProps> = ({
  open,
  onOpenChange,
  onTaskCreated
}) => {
  const { user } = useRole();
  
  // Form state
  const [assignedSites, setAssignedSites] = useState<ExtendedSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dueDateTime, setDueDateTime] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskType, setTaskType] = useState('routine');
  
  // Staff state
  const [siteSupervisors, setSiteSupervisors] = useState<StaffWithTaskCount[]>([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  
  // Loading states
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open && user) {
      resetForm();
      fetchManagerAssignedSites();
    }
  }, [open, user]);

  // Fetch supervisors when site changes
  useEffect(() => {
    if (selectedSiteId) {
      fetchSiteSupervisors(selectedSiteId);
    } else {
      setSiteSupervisors([]);
      setSelectedSupervisors([]);
    }
  }, [selectedSiteId]);

  const fetchManagerAssignedSites = async () => {
    if (!user) return;
    
    try {
      setIsLoadingSites(true);
      const managerId = user._id || user.id;
      
      if (!managerId) {
        toast.error('Manager ID not found');
        return;
      }
      
      console.log('🔍 Fetching sites assigned to manager:', managerId);
      
      // Try to get sites from taskService
      let sites = await taskService.getManagerAssignedSites(managerId);
      
      // If no sites found, try to get from assignTaskService
      if (sites.length === 0) {
        console.log('⚠️ No sites found from taskService, trying assignTaskService...');
        
        // Get tasks where this manager is assigned
        const tasksWithManager = await assignTaskService.getTasksWithManager(managerId);
        
        // Extract unique site IDs
        const siteIds = [...new Set(tasksWithManager.map(task => task.siteId))];
        
        // Get all sites and filter
        const allSites = await taskService.getAllSites();
        sites = allSites.filter(site => siteIds.includes(site._id));
      }
      
      // If still no sites, try to get from tasks created by manager
      if (sites.length === 0) {
        console.log('⚠️ No sites found from assignments, trying created tasks...');
        
        const createdTasks = await assignTaskService.getTasksByManager(managerId);
        const siteIds = [...new Set(createdTasks.map(task => task.siteId))];
        
        const allSites = await taskService.getAllSites();
        sites = allSites.filter(site => siteIds.includes(site._id));
      }
      
      setAssignedSites(sites);
      
      if (sites.length === 0) {
        toast.warning('No sites assigned to you yet');
      } else {
        console.log(`✅ Found ${sites.length} assigned sites:`, sites);
      }
    } catch (error) {
      console.error('Error fetching manager sites:', error);
      toast.error('Failed to load your assigned sites');
      
      // Fallback: show all sites for testing
      try {
        const allSites = await taskService.getAllSites();
        if (allSites.length > 0) {
          console.warn('⚠️ Showing all sites as fallback');
          setAssignedSites(allSites.slice(0, 5));
          toast.info('Showing sample sites for testing');
        }
      } catch (fallbackError) {
        setAssignedSites([]);
      }
    } finally {
      setIsLoadingSites(false);
    }
  };
  
  const fetchSiteSupervisors = async (siteId: string) => {
    try {
      setIsLoadingStaff(true);
      
      console.log('🔍 Fetching supervisors for site:', siteId);
      
      // Get supervisors for this site
      const supervisors = await taskService.getSupervisorsBySite(siteId);
      
      console.log('📊 Site supervisors fetched:', {
        supervisors: supervisors.length,
        supervisorDetails: supervisors
      });
      
      setSiteSupervisors(supervisors);
      
      if (supervisors.length === 0) {
        toast.warning('No supervisors found for this site');
      }
      
    } catch (error) {
      console.error('❌ Error fetching site supervisors:', error);
      toast.error('Failed to load supervisors for this site');
      setSiteSupervisors([]);
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
    
    // Validate that at least one supervisor is selected
    if (selectedSupervisors.length === 0) {
      toast.error('Please select at least one supervisor');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const selectedSite = assignedSites.find(s => s._id === selectedSiteId);
      if (!selectedSite) throw new Error('Site not found');
      
      // Prepare assigned supervisors
      const assignedSupervisors = siteSupervisors
        .filter(s => selectedSupervisors.includes(s.userId))
        .map(s => ({ 
          userId: s.userId,
          name: s.name, 
          role: 'supervisor' as const
        }));
      
      console.log('Final assigned supervisors:', assignedSupervisors);
      
      // Create task data - managers array is empty since this is manager assigning to supervisors
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
        assignedManagers: [], // No managers assigned
        assignedSupervisors,
        createdBy: user?._id || user?.id || 'system',
        createdByName: user?.name || 'Manager'
      };
      
      console.log('Submitting new task data:', JSON.stringify(taskData, null, 2));
      
     
      // Inside ManagerAssignTaskPopup.tsx, handleSubmit function
const result = await assignTaskService.createAssignTask(taskData);
console.log('Task created result:', result);



// Dispatch notification for each assigned supervisor
if (result && result.assignedSupervisors) {
  result.assignedSupervisors.forEach((supervisor: any) => {
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
}
     
      toast.success('Task assigned to supervisor(s) successfully!');
      
      // Reset form and close
      resetForm();
      onOpenChange(false);
      
      // Notify parent
      if (onTaskCreated) {
        onTaskCreated();
      }
      
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error(error.message || 'Failed to create task');
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
    setSelectedSupervisors([]);
    setSiteSupervisors([]);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onOpenChange(false);
    }
  };

  const selectedSite = assignedSites.find(s => s._id === selectedSiteId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Assign Task to Supervisors
          </DialogTitle>
          <DialogDescription>
            Create a new task and assign it to supervisors at your assigned sites
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Manager Task Assignment</p>
                <p className="text-xs text-blue-600">
                  Showing only sites where you are assigned as manager. 
                  Select supervisors to assign this task.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Site Selection */}
          <div className="space-y-2">
            <Label htmlFor="site" className="text-base font-semibold">
              Select Your Site <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={selectedSiteId} 
              onValueChange={setSelectedSiteId}
              disabled={isLoadingSites}
            >
              <SelectTrigger id="site">
                <SelectValue placeholder={isLoadingSites ? "Loading your sites..." : "Choose a site you manage"} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingSites ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : assignedSites.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No sites assigned to you
                  </div>
                ) : (
                  assignedSites.map(site => (
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
            {assignedSites.length === 0 && !isLoadingSites && (
              <p className="text-xs text-amber-600 mt-1">
                You don't have any sites assigned to you yet. Contact superadmin to assign sites.
              </p>
            )}
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
                    <p className="text-sm text-muted-foreground">Supervisors at Site</p>
                    <p className="font-medium">{siteSupervisors.length}</p>
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

          {/* Supervisor Selection */}
          {selectedSiteId && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Select Supervisors</h3>
              
              {isLoadingStaff ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading supervisors...</span>
                </div>
              ) : (
                <>
                  {/* Supervisors Section */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Available Supervisors at {selectedSite?.name}
                      <Badge variant="outline" className="ml-2">
                        {selectedSupervisors.length} selected
                      </Badge>
                    </Label>
                    
                    {siteSupervisors.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                        {siteSupervisors.map(supervisor => (
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
                                  Current Tasks: {supervisor.taskCount}
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
                      <div className="text-center py-8 text-muted-foreground border rounded-lg">
                        <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No supervisors found for this site</p>
                        <p className="text-xs mt-1">Supervisors will appear here once they are assigned to tasks</p>
                      </div>
                    )}
                  </div>

                  {/* Selection Summary */}
                  {selectedSupervisors.length > 0 && (
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-3">
                        <p className="text-sm font-medium text-green-800 mb-2">Selected Supervisors:</p>
                        <div className="flex flex-wrap gap-2">
                          {siteSupervisors
                            .filter(s => selectedSupervisors.includes(s.userId))
                            .map(s => (
                              <Badge key={s.userId} variant="outline" className="bg-white">
                                {s.name}
                              </Badge>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
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
              disabled={!selectedSiteId || isSubmitting || selectedSupervisors.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Assign to {selectedSupervisors.length} Supervisor{selectedSupervisors.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ManagerAssignTaskPopup;