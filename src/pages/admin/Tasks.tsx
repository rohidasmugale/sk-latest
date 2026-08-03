import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Search, Eye, Plus, Edit, Trash2, Calendar, User, Filter, Download, Clock, AlertCircle, CheckCircle2, Building } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { siteService, Site } from "@/services/SiteService";

const taskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  assignedTo: z.string().min(2, "Please select an assignee"),
  position: z.enum(["Manager", "Supervisor", "Employee"]),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["pending", "in-progress", "completed"]),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().max(500).optional(),
  siteId: z.string().optional(),
});

type Task = {
  id: number;
  title: string;
  assignedTo: string;
  position: string;
  priority: string;
  status: string;
  dueDate: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  siteId?: string;
  siteName?: string;
};

const teamMembers = [
  { name: "John Manager", position: "Manager" },
  { name: "Sarah Manager", position: "Manager" },
  { name: "Alice Supervisor", position: "Supervisor" },
  { name: "Bob Supervisor", position: "Supervisor" },
  { name: "Mike Employee", position: "Employee" },
  { name: "Emma Employee", position: "Employee" },
];

// Site Filter Component
const SiteFilter: React.FC<{
  selectedSite: string;
  onSiteChange: (value: string) => void;
  sites: Site[];
  isLoading?: boolean;
}> = ({ selectedSite, onSiteChange, sites, isLoading = false }) => {
  return (
    <div className="flex items-center gap-2">
      <Building className="h-4 w-4 text-gray-500" />
      <select
        value={selectedSite}
        onChange={(e) => onSiteChange(e.target.value)}
        disabled={isLoading}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white text-sm min-w-[180px]"
      >
        <option value="all">🏢 All Sites</option>
        {sites.map((site) => (
          <option key={site._id} value={site._id}>
            {site.name}
          </option>
        ))}
      </select>
      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
    </div>
  );
};

const Tasks = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  
  // Site state
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [isLoadingSites, setIsLoadingSites] = useState<boolean>(false);
  
  const [tasks, setTasks] = useState<Task[]>([
    { 
      id: 1, 
      title: "Update HRMS Module", 
      assignedTo: "John Manager", 
      position: "Manager",
      priority: "high", 
      status: "in-progress", 
      dueDate: "2025-01-15", 
      description: "Update the HRMS module with new features and improvements",
      createdAt: "2024-12-01",
      updatedAt: "2024-12-19",
      siteId: "site1",
      siteName: "Mumbai Office"
    },
    { 
      id: 2, 
      title: "Prepare Monthly Report", 
      assignedTo: "Sarah Manager", 
      position: "Manager",
      priority: "medium", 
      status: "pending", 
      dueDate: "2025-01-20",
      createdAt: "2024-12-10",
      updatedAt: "2024-12-10",
      siteId: "site2",
      siteName: "Delhi Branch"
    },
    { 
      id: 3, 
      title: "Review Leave Requests", 
      assignedTo: "Alice Supervisor", 
      position: "Supervisor",
      priority: "high", 
      status: "in-progress", 
      dueDate: "2025-01-12",
      createdAt: "2024-12-05",
      updatedAt: "2024-12-18",
      siteId: "site1",
      siteName: "Mumbai Office"
    },
    { 
      id: 4, 
      title: "Employee Training Session", 
      assignedTo: "Bob Supervisor", 
      position: "Supervisor",
      priority: "low", 
      status: "completed", 
      dueDate: "2025-01-10",
      createdAt: "2024-11-28",
      updatedAt: "2024-12-10",
      siteId: "site3",
      siteName: "Bangalore Tech Park"
    },
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch sites
  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    setIsLoadingSites(true);
    try {
      const sitesData = await siteService.getAllSites();
      setSites(sitesData || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
    } finally {
      setIsLoadingSites(false);
    }
  };

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      assignedTo: "",
      position: "Manager",
      priority: "medium",
      status: "pending",
      dueDate: "",
      description: "",
      siteId: "",
    },
  });

  const updateStatus = (id: number, status: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { 
        ...task, 
        status,
        updatedAt: new Date().toISOString().split('T')[0]
      } : task
    ));
    toast.success(`Task status updated to ${status.replace('-', ' ')}!`);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    const matchesPosition = positionFilter === "all" || task.position === positionFilter;
    const matchesSite = selectedSite === "all" || task.siteId === selectedSite || task.siteName === selectedSite;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesPosition && matchesSite;
  });

  const handleOpenDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      form.reset({
        title: task.title,
        assignedTo: task.assignedTo,
        position: task.position as "Manager" | "Supervisor" | "Employee",
        priority: task.priority as "low" | "medium" | "high",
        status: task.status as "pending" | "in-progress" | "completed",
        dueDate: task.dueDate,
        description: task.description || "",
        siteId: task.siteId || "",
      });
    } else {
      setEditingTask(null);
      form.reset({
        title: "",
        assignedTo: "",
        position: "Manager",
        priority: "medium",
        status: "pending",
        dueDate: "",
        description: "",
        siteId: "",
      });
    }
    setDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof taskSchema>) => {
    const selectedSite = sites.find(s => s._id === values.siteId);
    
    if (editingTask) {
      setTasks(tasks.map(t => 
        t.id === editingTask.id ? { 
          ...t, 
          ...values,
          siteName: selectedSite?.name || t.siteName,
          updatedAt: new Date().toISOString().split('T')[0]
        } : t
      ));
      toast.success("Task updated successfully!");
    } else {
      const newTask: Task = {
        id: Math.max(0, ...tasks.map(t => t.id)) + 1,
        title: values.title,
        assignedTo: values.assignedTo,
        position: values.position,
        priority: values.priority,
        status: values.status,
        dueDate: values.dueDate,
        description: values.description,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        siteId: values.siteId,
        siteName: selectedSite?.name || "Unspecified Site",
      };
      setTasks([...tasks, newTask]);
      toast.success("Task created successfully!");
    }
    setDialogOpen(false);
    form.reset();
  };

  const handleDelete = () => {
    if (taskToDelete) {
      const taskName = tasks.find(t => t.id === taskToDelete)?.title;
      setTasks(tasks.filter(t => t.id !== taskToDelete));
      toast.success(`Task "${taskName}" deleted successfully!`);
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setViewDialogOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getPositionColor = (position: string) => {
    switch(position) {
      case 'Manager': return 'default';
      case 'Supervisor': return 'secondary';
      case 'Employee': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'in-progress': return <Clock className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const exportTasks = () => {
    toast.success("Tasks exported successfully!");
  };

  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const overdue = tasks.filter(t => isOverdue(t.dueDate)).length;

    return { total, completed, inProgress, pending, overdue };
  };

  const stats = getTaskStats();

  // Get site name for display
  const getSiteName = () => {
    if (selectedSite === 'all') return 'All Sites';
    const site = sites.find(s => s._id === selectedSite);
    return site ? site.name : 'Unknown Site';
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Task Management" subtitle="View and manage all assigned tasks" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        {/* Site Filter Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SiteFilter
            selectedSite={selectedSite}
            onSiteChange={setSelectedSite}
            sites={sites}
            isLoading={isLoadingSites}
          />
          <span className="text-xs text-muted-foreground">
            {selectedSite !== 'all' && `Showing: ${getSiteName()}`}
          </span>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</p>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.pending}</p>
                </div>
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p>
                </div>
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-foreground">All Tasks</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportTasks} className="border-border">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks, assignees, or descriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background border-border"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] bg-background border-border">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="all" className="focus:bg-accent">All Status</SelectItem>
                    <SelectItem value="pending" className="focus:bg-accent">Pending</SelectItem>
                    <SelectItem value="in-progress" className="focus:bg-accent">In Progress</SelectItem>
                    <SelectItem value="completed" className="focus:bg-accent">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[130px] bg-background border-border">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="all" className="focus:bg-accent">All Priority</SelectItem>
                    <SelectItem value="high" className="focus:bg-accent">High</SelectItem>
                    <SelectItem value="medium" className="focus:bg-accent">Medium</SelectItem>
                    <SelectItem value="low" className="focus:bg-accent">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="w-[130px] bg-background border-border">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Position" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="all" className="focus:bg-accent">All Positions</SelectItem>
                    <SelectItem value="Manager" className="focus:bg-accent">Manager</SelectItem>
                    <SelectItem value="Supervisor" className="focus:bg-accent">Supervisor</SelectItem>
                    <SelectItem value="Employee" className="focus:bg-accent">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="text-foreground">Task</TableHead>
                    <TableHead className="text-foreground">Assigned To</TableHead>
                    <TableHead className="text-foreground">Position</TableHead>
                    <TableHead className="text-foreground">Priority</TableHead>
                    <TableHead className="text-foreground">Status</TableHead>
                    <TableHead className="text-foreground">Due Date</TableHead>
                    <TableHead className="text-foreground">Site</TableHead>
                    <TableHead className="text-right text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow className="hover:bg-transparent border-border">
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No tasks found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => (
                      <TableRow 
                        key={task.id} 
                        className={`border-border hover:bg-accent/50 ${
                          isOverdue(task.dueDate) ? "bg-red-50 dark:bg-red-950/20" : ""
                        }`}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{task.title}</p>
                            {task.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground">{task.assignedTo}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getPositionColor(task.position) as any}
                            className="capitalize"
                          >
                            {task.position}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getPriorityColor(task.priority) as any} 
                            className="capitalize"
                          >
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            <Select value={task.status} onValueChange={(value) => updateStatus(task.id, value)}>
                              <SelectTrigger className="w-[130px] bg-background border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-background border-border">
                                <SelectItem value="pending" className="focus:bg-accent">Pending</SelectItem>
                                <SelectItem value="in-progress" className="focus:bg-accent">In Progress</SelectItem>
                                <SelectItem value="completed" className="focus:bg-accent">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className={
                              isOverdue(task.dueDate) 
                                ? "text-red-600 dark:text-red-400 font-medium" 
                                : "text-foreground"
                            }>
                              {new Date(task.dueDate).toLocaleDateString()}
                              {isOverdue(task.dueDate) && " (Overdue)"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {task.siteName ? (
                            <Badge variant="outline" className="text-xs">
                              <Building className="h-3 w-3 mr-1" />
                              {task.siteName}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleViewDetails(task)}
                              title="View Details"
                              className="hover:bg-accent"
                            >
                              <Eye className="h-4 w-4 text-foreground" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleOpenDialog(task)}
                              title="Edit Task"
                              className="hover:bg-accent"
                            >
                              <Edit className="h-4 w-4 text-foreground" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setTaskToDelete(task.id);
                                setDeleteDialogOpen(true);
                              }}
                              title="Delete Task"
                              className="hover:bg-accent hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Add/Edit Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingTask ? "Edit Task" : "Create New Task"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Task Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter task title" 
                        {...field} 
                        className="bg-background border-border text-foreground"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Assigned To</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border text-foreground">
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border-border">
                          {teamMembers.map((member) => (
                            <SelectItem key={member.name} value={member.name} className="focus:bg-accent text-foreground">
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Position</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border text-foreground">
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border-border">
                          <SelectItem value="Manager" className="focus:bg-accent text-foreground">Manager</SelectItem>
                          <SelectItem value="Supervisor" className="focus:bg-accent text-foreground">Supervisor</SelectItem>
                          <SelectItem value="Employee" className="focus:bg-accent text-foreground">Employee</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Due Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          className="bg-background border-border text-foreground"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border text-foreground">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border-border">
                          <SelectItem value="low" className="focus:bg-accent text-foreground">Low</SelectItem>
                          <SelectItem value="medium" className="focus:bg-accent text-foreground">Medium</SelectItem>
                          <SelectItem value="high" className="focus:bg-accent text-foreground">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background border-border text-foreground">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background border-border">
                        <SelectItem value="pending" className="focus:bg-accent text-foreground">Pending</SelectItem>
                        <SelectItem value="in-progress" className="focus:bg-accent text-foreground">In Progress</SelectItem>
                        <SelectItem value="completed" className="focus:bg-accent text-foreground">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="siteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Site</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background border-border text-foreground">
                          <SelectValue placeholder="Select site" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background border-border">
                        <SelectItem value="" className="focus:bg-accent text-foreground">No Site</SelectItem>
                        {sites.map((site) => (
                          <SelectItem key={site._id} value={site._id} className="focus:bg-accent text-foreground">
                            {site.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter task description" 
                        className="min-h-[100px] bg-background border-border text-foreground"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  className="border-border text-foreground hover:bg-accent"
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTask ? "Update Task" : "Create Task"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Task Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Task Details</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{selectedTask.title}</h3>
                {selectedTask.description && (
                  <p className="text-muted-foreground mt-2">{selectedTask.description}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Assigned To</label>
                  <p className="font-medium text-foreground">{selectedTask.assignedTo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Position</label>
                  <Badge variant={getPositionColor(selectedTask.position) as any} className="capitalize">
                    {selectedTask.position}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Priority</label>
                  <Badge variant={getPriorityColor(selectedTask.priority) as any} className="capitalize">
                    {selectedTask.priority}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedTask.status)}
                    <span className="capitalize text-foreground">{selectedTask.status.replace('-', ' ')}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                  <p className={`font-medium ${
                    isOverdue(selectedTask.dueDate) 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-foreground'
                  }`}>
                    {new Date(selectedTask.dueDate).toLocaleDateString()}
                    {isOverdue(selectedTask.dueDate) && " (Overdue)"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="font-medium text-foreground">{new Date(selectedTask.createdAt).toLocaleDateString()}</p>
                </div>
                {selectedTask.siteName && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Site</label>
                    <p className="font-medium text-foreground">{selectedTask.siteName}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Task</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete the task{" "}
              <strong className="text-foreground">"{tasks.find(t => t.id === taskToDelete)?.title}"</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-accent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Tasks;