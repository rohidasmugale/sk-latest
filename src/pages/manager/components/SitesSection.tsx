"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Building2, 
  MapPin, 
  Users, 
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Briefcase,
  User,
  Eye,
  Paperclip,
  FileText,
  DollarSign,
  Square,
  ChevronRight,
  Layers,
  Sun,
  Moon
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useRole } from "@/context/RoleContext";
import taskService, { Task, ExtendedSite, Attachment } from "@/services/TaskService";
import { siteService } from "@/services/SiteService";
import { format } from "date-fns";

// Extended types for manager view
interface ManagerSite extends ExtendedSite {
  tasks: Task[];
  taskStats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  staffStats: {
    total: number;
    managers: number;
    supervisors: number;
    employees: number;
  };
}

interface ManagerTask extends Task {
  siteDetails?: ExtendedSite;
}

const ManagerSitesPage = () => {
  const { user: authUser, isAuthenticated } = useRole();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<ManagerSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<ManagerSite | null>(null);
  const [selectedTask, setSelectedTask] = useState<ManagerTask | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (authUser && isAuthenticated) {
      fetchManagerData();
    } else {
      setLoading(false);
    }
  }, [authUser, isAuthenticated]);

  const fetchManagerData = async () => {
    try {
      setLoading(true);
      
      const managerId = authUser?._id || authUser?.id;
      if (!managerId) {
        throw new Error("Manager ID not found");
      }

      const [allSites, allTasks] = await Promise.all([
        siteService.getAllSites(),
        taskService.getAllTasks()
      ]);

      const managerSites = allSites.filter(site => {
        const siteTasks = allTasks.filter(task => task.siteId === site._id);
        const isManagerAssigned = siteTasks.some(task => 
          task.assignedUsers?.some(user => 
            user.userId === managerId && user.role === 'manager'
          )
        );
        const isManagerAssignedOld = siteTasks.some(task => 
          task.assignedTo === managerId
        );
        return isManagerAssigned || isManagerAssignedOld;
      });

      const transformedSites: ManagerSite[] = managerSites.map(site => {
        const siteTasks = allTasks.filter(task => task.siteId === site._id);
        const taskStats = {
          total: siteTasks.length,
          pending: siteTasks.filter(t => t.status === 'pending').length,
          inProgress: siteTasks.filter(t => t.status === 'in-progress').length,
          completed: siteTasks.filter(t => t.status === 'completed').length,
          cancelled: siteTasks.filter(t => t.status === 'cancelled').length
        };
        const staffStats = {
          total: site.staffDeployment?.reduce((sum, item) => sum + (item.count || 0), 0) || 0,
          managers: site.staffDeployment?.find(d => d.role === 'Manager')?.count || 0,
          supervisors: site.staffDeployment?.find(d => d.role === 'Supervisor')?.count || 0,
          employees: site.staffDeployment?.filter(d => 
            !['Manager', 'Supervisor'].includes(d.role)
          ).reduce((sum, item) => sum + (item.count || 0), 0) || 0
        };
        return {
          ...site,
          tasks: siteTasks,
          taskStats,
          staffStats,
          managerCount: staffStats.managers,
          supervisorCount: staffStats.supervisors
        };
      });

      setSites(transformedSites);
      if (transformedSites.length > 0) {
        setSelectedSite(transformedSites[0]);
      }

    } catch (error: any) {
      console.error("Error fetching manager data:", error);
      toast.error(error.message || "Failed to load your sites");
    } finally {
      setLoading(false);
    }
  };

  const handleViewTask = (task: Task) => {
    const siteDetails = sites.find(s => s._id === task.siteId);
    setSelectedTask({ ...task, siteDetails });
    setShowTaskDetails(true);
  };

  const handleUpdateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      await taskService.updateTaskStatus(taskId, { status });
      toast.success("Task status updated!");
      await fetchManagerData();
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast.error(error.message || "Failed to update task");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return dateString;
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

  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="My Sites" subtitle="Manage your assigned sites and tasks" />
        <div className="p-6 max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
              <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
              <p className="text-muted-foreground mb-4">
                Please log in to view your assigned sites.
              </p>
              <Button onClick={() => window.location.href = '/login'}>
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
      <div className="min-h-screen bg-background">
        <DashboardHeader title="My Sites" subtitle="Loading your assigned sites..." />
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading your sites...</p>
          </div>
        </div>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="My Sites" subtitle="Manage your assigned sites and tasks" />
        <div className="p-6 max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Sites Assigned</h2>
              <p className="text-muted-foreground mb-6">
                You haven't been assigned to any sites yet. Please contact your administrator.
              </p>
              <Button onClick={fetchManagerData} variant="outline">
                Refresh
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="My Sites" 
        subtitle={`You are managing ${sites.length} site${sites.length > 1 ? 's' : ''}`} 
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sites</p>
                  <p className="text-2xl font-bold">{sites.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold">
                    {sites.reduce((sum, site) => sum + site.taskStats.total, 0)}
                  </p>
                </div>
                <Briefcase className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Tasks</p>
                  <p className="text-2xl font-bold">
                    {sites.reduce((sum, site) => sum + site.taskStats.pending, 0)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Tasks</p>
                  <p className="text-2xl font-bold">
                    {sites.reduce((sum, site) => sum + site.taskStats.completed, 0)}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Your Sites</CardTitle>
              <CardDescription>Select a site to view details</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto px-4 pb-4 space-y-3">
                {sites.map((site) => (
                  <motion.div
                    key={site._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all hover:shadow-md mt-3 ${
                        selectedSite?._id === site._id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedSite(site)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold">{site.name}</div>
                          <Badge variant={site.status === 'active' ? 'default' : 'secondary'}>
                            {site.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {site.location}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {site.clientName}
                          </div>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-3 w-3" />
                            <span className="font-medium">{site.taskStats.total} tasks</span>
                            <span className="text-xs text-muted-foreground">
                              ({site.taskStats.pending} pending, {site.taskStats.completed} completed)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            <span className="font-medium">{site.staffStats.total} staff</span>
                            <span className="text-xs text-muted-foreground">
                              ({site.staffStats.managers} mgr, {site.staffStats.supervisors} sup)
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            {selectedSite ? (
              <>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedSite.name}</CardTitle>
                      <CardDescription>{selectedSite.location}</CardDescription>
                    </div>
                    <Badge variant={selectedSite.status === 'active' ? 'default' : 'secondary'} className="text-sm">
                      {selectedSite.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="tasks">Tasks</TabsTrigger>
                      <TabsTrigger value="staff">Staff</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">Area</div>
                            <div className="text-xl font-bold flex items-center gap-2">
                              <Square className="h-4 w-4" />
                              {selectedSite.areaSqft?.toLocaleString()} sqft
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">Contract Value</div>
                            <div className="text-xl font-bold flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              {selectedSite.contractValue?.toLocaleString('en-IN', {
                                style: 'currency',
                                currency: 'INR',
                                maximumFractionDigits: 0
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* ✅ NEW: Shift Timings Card */}
                      {selectedSite.shifts && selectedSite.shifts.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Shift Timings
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {selectedSite.shifts.map((shift, idx) => (
                              <div key={idx} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                                <div>
                                  <div className="font-medium">{shift.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {shift.startTime} – {shift.endTime}
                                    {shift.graceMinutes && ` (Grace: ${shift.graceMinutes} min)`}
                                  </div>
                                </div>
                                {shift.isOvernight && (
                                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                    <Moon className="h-3 w-3 mr-1" /> Overnight
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      <div>
                        <h3 className="font-semibold mb-2">Services</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedSite.services?.map((service, index) => (
                            <Badge key={index} variant="secondary">
                              {service}
                            </Badge>
                          ))}
                          {(!selectedSite.services || selectedSite.services.length === 0) && (
                            <p className="text-sm text-muted-foreground">No services assigned</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Briefcase className="h-4 w-4" />
                              <div className="font-medium">Tasks</div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>Total:</span>
                                <span className="font-bold">{selectedSite.taskStats.total}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Pending:</span>
                                <span className="text-yellow-600">{selectedSite.taskStats.pending}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>In Progress:</span>
                                <span className="text-blue-600">{selectedSite.taskStats.inProgress}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Completed:</span>
                                <span className="text-green-600">{selectedSite.taskStats.completed}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="h-4 w-4" />
                              <div className="font-medium">Staff</div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>Total:</span>
                                <span className="font-bold">{selectedSite.staffStats.total}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Managers:</span>
                                <span>{selectedSite.staffStats.managers}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Supervisors:</span>
                                <span>{selectedSite.staffStats.supervisors}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Other Staff:</span>
                                <span>{selectedSite.staffStats.employees}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="tasks" className="space-y-4">
                      {selectedSite.tasks.length === 0 ? (
                        <div className="text-center py-8">
                          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No tasks assigned to this site</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                          {selectedSite.tasks.map((task) => (
                            <Card key={task._id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <div className="font-semibold">{task.title}</div>
                                    <div className="text-sm text-muted-foreground line-clamp-1">
                                      {task.description}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Badge variant={getPriorityColor(task.priority)}>
                                      {task.priority}
                                    </Badge>
                                    <Badge variant={getStatusColor(task.status)}>
                                      <span className="flex items-center gap-1">
                                        {getStatusIcon(task.status)}
                                        {task.status}
                                      </span>
                                    </Badge>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    Due: {formatDate(task.dueDateTime)}
                                  </div>
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Users className="h-3 w-3" />
                                    {task.assignedUsers?.length || 1} assignee(s)
                                  </div>
                                </div>

                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewTask(task)}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                  {task.status !== 'completed' && task.status !== 'cancelled' && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateTaskStatus(task._id, 'completed')}
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Complete
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="staff" className="space-y-4">
                      {!selectedSite.staffDeployment || selectedSite.staffDeployment.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No staff deployed to this site</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                          {selectedSite.staffDeployment.map((deploy, index) => (
                            <Card key={index}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                      <div className="font-medium">{deploy.role}</div>
                                      <div className="text-sm text-muted-foreground">
                                        Staff assigned to this role
                                      </div>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-lg">
                                    {deploy.count} {deploy.count === 1 ? 'person' : 'people'}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}

                          <Card className="bg-primary/5">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Users className="h-5 w-5 text-primary" />
                                  <div>
                                    <div className="font-medium">Total Staff</div>
                                    <div className="text-sm text-muted-foreground">
                                      All roles combined
                                    </div>
                                  </div>
                                </div>
                                <Badge variant="default" className="text-lg">
                                  {selectedSite.staffStats.total} total
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </>
            ) : (
              <CardContent className="p-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a site to view details</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {selectedTask && (
        <Dialog open={showTaskDetails} onOpenChange={setShowTaskDetails}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Task Details
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">{selectedTask.title}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedTask.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Site</div>
                  <div className="font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {selectedTask.siteDetails?.name || selectedTask.siteName}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Client</div>
                  <div className="font-medium">{selectedTask.clientName}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Priority</div>
                  <Badge variant={getPriorityColor(selectedTask.priority)}>
                    {selectedTask.priority}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant={getStatusColor(selectedTask.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(selectedTask.status)}
                      {selectedTask.status}
                    </span>
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Deadline</div>
                  <div className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(selectedTask.deadline)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Due Date & Time</div>
                  <div className="font-medium">
                    {formatDate(selectedTask.dueDateTime)}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-2">Assignees</div>
                <div className="space-y-2">
                  {selectedTask.assignedUsers?.map((user, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <User className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-auto">
                        {user.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Attachments</div>
                  <div className="space-y-2">
                    {selectedTask.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{attachment.filename}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(attachment.uploadedAt)}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(attachment.url, '_blank')}
                        >
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                {selectedTask.status !== 'completed' && selectedTask.status !== 'cancelled' && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleUpdateTaskStatus(selectedTask._id, 'completed');
                      setShowTaskDetails(false);
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as Completed
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowTaskDetails(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ManagerSitesPage;