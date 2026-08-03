import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ClipboardList, MoreHorizontal, Edit, Trash2, CheckCircle, PlayCircle, Building, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { siteService, Site } from "@/services/SiteService";

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

// Task interface with site
interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed";
  dueDate: string;
  createdAt: string;
  siteId?: string;
  siteName?: string;
}

// Employee interface with site
interface Employee {
  id: number;
  name: string;
  role: string;
  supervisor: string;
  site: string;
  phone: string;
  status: "active" | "inactive";
  siteId?: string;
}

// Sample employee data with site associations
const sampleEmployees: Employee[] = [
  { id: 1, name: "Alice Johnson", role: "Security Guard", supervisor: "Bob Smith", site: "Mumbai Office", phone: "+91 98765 43210", status: "active" },
  { id: 2, name: "Bob Smith", role: "Security Supervisor", supervisor: "Carol White", site: "Mumbai Office", phone: "+91 98765 43211", status: "active" },
  { id: 3, name: "Carol White", role: "Security Manager", supervisor: "Dave Brown", site: "Mumbai Office", phone: "+91 98765 43212", status: "active" },
  { id: 4, name: "Dave Brown", role: "Housekeeping Staff", supervisor: "Eve Davis", site: "Delhi Branch", phone: "+91 98765 43213", status: "active" },
  { id: 5, name: "Eve Davis", role: "Housekeeping Supervisor", supervisor: "Frank Wilson", site: "Delhi Branch", phone: "+91 98765 43214", status: "active" },
  { id: 6, name: "Frank Wilson", role: "Parking Attendant", supervisor: "Grace Lee", site: "Bangalore Tech Park", phone: "+91 98765 43215", status: "inactive" },
];

const Employees = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [employees, setEmployees] = useState<Employee[]>(sampleEmployees);
  
  // Site state
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [isLoadingSites, setIsLoadingSites] = useState<boolean>(false);
  
  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium" as "low" | "medium" | "high",
    dueDate: "",
    siteId: ""
  });

  // Get site name for display
  const getSiteDisplayName = () => {
    if (selectedSite === 'all') return 'All Sites';
    const site = allSites.find(s => s._id === selectedSite);
    return site ? site.name : 'Unknown Site';
  };

  // Load tasks from localStorage on component mount
  useEffect(() => {
    const savedTasks = localStorage.getItem('employeeTasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
    fetchSites();
  }, []);

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    localStorage.setItem('employeeTasks', JSON.stringify(tasks));
  }, [tasks]);

  // Fetch sites
  const fetchSites = async () => {
    try {
      setIsLoadingSites(true);
      const sitesData = await siteService.getAllSites();
      setAllSites(sitesData || []);
      console.log("✅ Loaded sites:", sitesData.length);
    } catch (error) {
      console.error("Error fetching sites:", error);
      setAllSites([]);
    } finally {
      setIsLoadingSites(false);
    }
  };

  // Filter employees by selected site
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSite = selectedSite === "all" || 
      employee.siteId === selectedSite || 
      employee.site === selectedSite ||
      employee.site === allSites.find(s => s._id === selectedSite)?.name;
    
    return matchesSearch && matchesSite;
  });

  // Get employee by ID
  const getEmployeeById = (id: string) => {
    return employees.find(e => e.id === parseInt(id));
  };

  // Get site name for task
  const getSiteNameForTask = (task: Task) => {
    if (task.siteName) return task.siteName;
    const site = allSites.find(s => s._id === task.siteId);
    return site ? site.name : "Unknown Site";
  };

  const handleAddTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const selectedSite = allSites.find(s => s._id === taskForm.siteId);
    const assignedEmployee = getEmployeeById(taskForm.assignedTo);
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: taskForm.title,
      description: taskForm.description,
      assignedTo: taskForm.assignedTo,
      priority: taskForm.priority,
      status: "pending",
      dueDate: taskForm.dueDate,
      createdAt: new Date().toISOString().split('T')[0],
      siteId: taskForm.siteId || undefined,
      siteName: selectedSite?.name || assignedEmployee?.site || "Unknown Site"
    };

    setTasks(prev => [newTask, ...prev]);
    toast.success("Task assigned successfully!");
    setTaskDialogOpen(false);
    
    // Reset form
    setTaskForm({
      title: "",
      description: "",
      assignedTo: "",
      priority: "medium",
      dueDate: "",
      siteId: ""
    });
  };

  const handleEditTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTask) return;

    const selectedSite = allSites.find(s => s._id === taskForm.siteId);
    const assignedEmployee = getEmployeeById(taskForm.assignedTo);

    const updatedTask: Task = {
      ...editingTask,
      title: taskForm.title,
      description: taskForm.description,
      assignedTo: taskForm.assignedTo,
      priority: taskForm.priority,
      dueDate: taskForm.dueDate,
      siteId: taskForm.siteId || editingTask.siteId,
      siteName: selectedSite?.name || assignedEmployee?.site || editingTask.siteName || "Unknown Site"
    };

    setTasks(prev => prev.map(task => task.id === editingTask.id ? updatedTask : task));
    toast.success("Task updated successfully!");
    setTaskDialogOpen(false);
    setEditingTask(null);
    
    // Reset form
    setTaskForm({
      title: "",
      description: "",
      assignedTo: "",
      priority: "medium",
      dueDate: "",
      siteId: ""
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    toast.success("Task deleted successfully!");
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
    toast.success(`Task marked as ${newStatus.replace('-', ' ')}`);
  };

  const openEditTaskDialog = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      priority: task.priority,
      dueDate: task.dueDate,
      siteId: task.siteId || ""
    });
    setTaskDialogOpen(true);
  };

  const handleTaskInputChange = (field: string, value: string) => {
    setTaskForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "default";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "in-progress": return "secondary";
      case "pending": return "outline";
      default: return "outline";
    }
  };

  // Calculate stats based on filtered employees
  const totalEmployees = filteredEmployees.length;
  const activeEmployees = filteredEmployees.filter(e => e.status === "active").length;
  
  // Filter tasks by selected site
  const filteredTasks = tasks.filter(task => {
    if (selectedSite === "all") return true;
    return task.siteId === selectedSite || task.siteName === selectedSite;
  });
  
  const totalTasks = filteredTasks.length;
  const pendingTasks = filteredTasks.filter(t => t.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Employees Management" />
      
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
            sites={allSites}
            isLoading={isLoadingSites}
          />
          <span className="text-xs text-muted-foreground">
            {selectedSite !== 'all' && `Showing: ${getSiteDisplayName()}`}
          </span>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEmployees}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {activeEmployees}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTasks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingTasks}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Section */}
        {filteredTasks.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Assigned Tasks</CardTitle>
              <Badge variant="outline" className="ml-2">
                {filteredTasks.length} tasks
              </Badge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task Title</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => {
                    const employee = getEmployeeById(task.assignedTo);
                    return (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{task.title}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {task.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{employee?.name || "Unknown"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            <Building className="h-3 w-3 mr-1" />
                            {getSiteNameForTask(task)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{task.dueDate}</TableCell>
                        <TableCell>{task.createdAt}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {task.status !== "completed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateTaskStatus(
                                  task.id, 
                                  task.status === "pending" ? "in-progress" : "completed"
                                )}
                              >
                                {task.status === "pending" ? (
                                  <PlayCircle className="h-4 w-4 mr-1" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                )}
                                {task.status === "pending" ? "Start" : "Complete"}
                              </Button>
                            )}
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditTaskDialog(task)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Task
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Task
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Employees Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>All Employees</CardTitle>
            <div className="flex gap-2">
              <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Assign Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTask ? "Edit Task" : "Assign New Task"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={editingTask ? handleEditTask : handleAddTask} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Task Title</Label>
                      <Input 
                        id="title" 
                        placeholder="Enter task title" 
                        value={taskForm.title}
                        onChange={(e) => handleTaskInputChange("title", e.target.value)}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description" 
                        placeholder="Enter task description" 
                        value={taskForm.description}
                        onChange={(e) => handleTaskInputChange("description", e.target.value)}
                        required 
                      />
                    </div>
                    
                    {/* Site Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="site">Site</Label>
                      <Select 
                        value={taskForm.siteId} 
                        onValueChange={(value) => handleTaskInputChange("siteId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select site" />
                        </SelectTrigger>
                        <SelectContent>
                          {allSites.map((site) => (
                            <SelectItem key={site._id} value={site._id}>
                              {site.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="assignedTo">Assign To</Label>
                      <Select 
                        value={taskForm.assignedTo} 
                        onValueChange={(value) => handleTaskInputChange("assignedTo", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredEmployees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id.toString()}>
                              {employee.name} - {employee.role} ({employee.site})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select 
                          value={taskForm.priority} 
                          onValueChange={(value: "low" | "medium" | "high") => handleTaskInputChange("priority", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input 
                          id="dueDate" 
                          type="date" 
                          value={taskForm.dueDate}
                          onChange={(e) => handleTaskInputChange("dueDate", e.target.value)}
                          required 
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">
                      {editingTask ? "Update Task" : "Assign Task"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.role}</TableCell>
                    <TableCell>{employee.supervisor}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{employee.site}</Badge>
                    </TableCell>
                    <TableCell>{employee.phone}</TableCell>
                    <TableCell>
                      <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setEditingTask(null);
                          setTaskForm(prev => ({ 
                            ...prev, 
                            assignedTo: employee.id.toString(),
                            siteId: allSites.find(s => s.name === employee.site)?.id || ""
                          }));
                          setTaskDialogOpen(true);
                        }}
                      >
                        <ClipboardList className="h-4 w-4 mr-1" />
                        Assign Task
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Employees;