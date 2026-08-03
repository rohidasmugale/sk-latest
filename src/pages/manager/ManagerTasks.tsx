import { useState, useEffect } from "react";
import { useRole, User } from "@/context/RoleContext";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, Search, Eye, Edit, Trash2, Loader2, AlertCircle, 
  Users, Shield, ListFilter, RefreshCw, UserCheck, FileText, Building,
  MoreVertical, ChevronDown, ChevronUp, Filter, Menu, Calendar,
  Clock, CheckCircle, XCircle, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useOutletContext } from "react-router-dom";
import { taskService, type Assignee, type Site as TaskServiceSite } from "@/services/TaskService";
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

// Mobile responsive task card
const MobileTaskCard = ({
  task,
  supervisors,
  onView,
  onUpdateStatus,
  onDelete,
  getPriorityColor,
  getSourceBadge,
  formatDate,
  isMobileView
}: {
  task: Task;
  supervisors: Supervisor[];
  onView: (task: Task) => void;
  onUpdateStatus: (taskId: string, status: string) => void;
  onDelete: (taskId: string) => void;
  getPriorityColor: (priority: string) => "default" | "destructive" | "secondary" | "outline";
  getSourceBadge: (task: Task) => JSX.Element;
  formatDate: (date: string) => string;
  isMobileView: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const supervisor = supervisors.find(s => s._id === task.assignedTo);

  return (
    <Card className="mb-3 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-base">{task.title}</h3>
              <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                {task.priority}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-2"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-2">
          <div>
            <p className="text-xs text-muted-foreground">Assigned To</p>
            <div className="flex items-center gap-1 text-sm">
              <Users className="h-3 w-3" />
              <span className="truncate">{task.assignedToName}</span>
              {task.isAssignedToMe && (
                <Badge variant="outline" className="h-4 px-1 text-[10px] bg-green-50 text-green-700 border-green-200">
                  You
                </Badge>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due Date</p>
            <div className="flex items-center gap-1 text-sm">
              <Calendar className="h-3 w-3" />
              {formatDate(task.deadline)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {task.status}
            </Badge>
            {getSourceBadge(task)}
          </div>
          <div className="text-xs text-muted-foreground">
            {task.siteName}
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Full Description</p>
              <p className="text-sm mt-1">{task.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Client</p>
                <p className="text-sm font-medium">{task.clientName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Site</p>
                <p className="text-sm font-medium">{task.siteName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm">{formatDate(task.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm capitalize">{task.taskType || 'routine'}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Update Status</p>
              <Select 
                value={task.status} 
                onValueChange={(value) => onUpdateStatus(task._id, value)}
                disabled={task.source === "superadmin" && !task.isAssignedToMe}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onView(task)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Details
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  if (task.source === "superadmin" && !task.isAssignedToMe) {
                    toast.warning("Cannot edit superadmin tasks");
                  } else {
                    toast.info("Edit feature coming soon");
                  }
                }}
                disabled={task.source === "superadmin" && !task.isAssignedToMe}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => onDelete(task._id)}
                disabled={task.source === "superadmin" && !task.isAssignedToMe}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Types
interface Supervisor {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "supervisor";
  site?: string;
  isActive?: boolean;
}

interface Site {
  _id: string;
  name: string;
  clientName: string;
  location: string;
  status: string;
  managerCount: number;
  supervisorCount: number;
}

// Update Task interface
interface Task {
  _id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  deadline: string;
  dueDateTime?: string;
  siteId: string;
  siteName: string;
  clientName: string;
  taskType?: string;
  attachments: any[];
  hourlyUpdates: any[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  createdById?: string;
  source: "manager" | "superadmin";
  // New field to indicate if task is assigned to current user
  isAssignedToMe?: boolean;
}

// View modes for different perspectives
type ViewMode = "assigned" | "created" | "site" | "all";

const ManagerTasks = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState({
    tasks: false,
    supervisors: false,
    sites: false
  });
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  // Mobile responsive state
  const [isMobileView, setIsMobileView] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Changed from viewSuperadminTasks to viewMode
  const [viewMode, setViewMode] = useState<ViewMode>("created");
  const [activeTab, setActiveTab] = useState("all");
  
  const { user: currentUser, isAuthenticated } = useRole();
  
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Site filter state
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [isLoadingSites, setIsLoadingSites] = useState<boolean>(false);
  
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedTo: "",
    assignedToName: "",
    siteId: "",
    siteName: "",
    clientName: "",
    priority: "medium" as "high" | "medium" | "low",
    deadline: "",
    dueDateTime: "",
    taskType: "routine"
  });

  // Get site name for display
  const getSiteDisplayName = () => {
    if (selectedSite === 'all') return 'All Sites';
    const site = allSites.find(s => s._id === selectedSite);
    return site ? site.name : 'Unknown Site';
  };

  // Check for mobile view on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch all sites for filter dropdown
  const fetchAllSites = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoadingSites(true);
      const sitesData = await siteService.getAllSites();
      
      // Filter sites based on manager's access if needed
      let filteredSites = sitesData || [];
      if (currentUser.site) {
        filteredSites = sitesData.filter(site => 
          site.name === currentUser.site || site._id === currentUser.site
        );
      }
      
      setAllSites(filteredSites);
      console.log("✅ Loaded sites for filter:", filteredSites.length);
    } catch (error) {
      console.error('Error fetching sites for filter:', error);
      setAllSites([]);
    } finally {
      setIsLoadingSites(false);
    }
  };

  // Fetch all sites
  const fetchSites = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(prev => ({ ...prev, sites: true }));
      console.log("Fetching sites...");
      
      const sitesData = await taskService.getAllSites();
      console.log("Sites fetched:", sitesData);
      
      // Filter sites based on manager's access
      let filteredSites = sitesData as Site[];
      if (currentUser.site) {
        filteredSites = sitesData.filter((site: TaskServiceSite) => 
          site.name === currentUser.site
        ) as Site[];
      }
      
      setSites(filteredSites);
      
      // Auto-select the first site if only one is available
      if (filteredSites.length === 1 && !newTask.siteId) {
        const site = filteredSites[0];
        setNewTask(prev => ({
          ...prev,
          siteId: site._id,
          siteName: site.name,
          clientName: site.clientName
        }));
      }
      
    } catch (error: any) {
      console.error('Error fetching sites:', error);
      toast.error(`Failed to load sites: ${error.message}`);
      
      const demoSites: Site[] = [
        {
          _id: "site_1",
          name: currentUser?.site || "Site A",
          clientName: "Client A",
          location: "Location A",
          status: "active",
          managerCount: 1,
          supervisorCount: 2
        }
      ];
      setSites(demoSites);
    } finally {
      setLoading(prev => ({ ...prev, sites: false }));
    }
  };

  // Fetch supervisors
  const fetchSupervisors = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(prev => ({ ...prev, supervisors: true }));
      console.log("Fetching supervisors...");
      
      const assignees = await taskService.getAssigneesByRole('supervisor');
      console.log("Supervisors from taskService:", assignees);
      
      const filteredSupervisors = assignees
        .filter((assignee: Assignee) => assignee.role === 'supervisor')
        .map((assignee: Assignee) => ({
          _id: assignee._id,
          name: assignee.name,
          email: assignee.email,
          phone: assignee.phone,
          role: 'supervisor' as const,
          site: currentUser?.site || "Site A"
        })) as Supervisor[];
      
      setSupervisors(filteredSupervisors);
      
    } catch (error: any) {
      console.error('Error fetching supervisors:', error);
      toast.error(`Failed to load supervisors: ${error.message}`);
      
      const demoSupervisors: Supervisor[] = [
        {
          _id: "sup_1",
          name: "Alice Supervisor",
          email: "alice@example.com",
          phone: "123-456-7890",
          role: "supervisor",
          site: currentUser?.site || "Site A"
        },
        {
          _id: "sup_2",
          name: "Bob Supervisor",
          email: "bob@example.com",
          phone: "123-456-7891",
          role: "supervisor",
          site: currentUser?.site || "Site A"
        }
      ];
      setSupervisors(demoSupervisors);
    } finally {
      setLoading(prev => ({ ...prev, supervisors: false }));
    }
  };

  // Fetch tasks based on view mode
  const fetchTasks = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(prev => ({ ...prev, tasks: true }));
      console.log("Fetching tasks... Current user:", currentUser);
      console.log("View mode:", viewMode);
      console.log("Selected site:", selectedSite);
      
      let fetchedTasks: Task[] = [];
      
      try {
        // Fetch tasks based on view mode
        switch(viewMode) {
          case "assigned":
            // Tasks assigned to current user
            console.log("Fetching tasks assigned to:", currentUser._id);
            try {
              const assignedTasks = await taskService.getTasksByAssignee(currentUser._id);
              console.log("Assigned tasks:", assignedTasks);
              
              // Mark tasks and add source field
              fetchedTasks = assignedTasks.map((task: any) => {
                const isCreatedByCurrentUser = task.createdBy === currentUser._id || task.createdById === currentUser._id;
                return {
                  ...task,
                  source: isCreatedByCurrentUser ? "manager" as const : "superadmin" as const,
                  isAssignedToMe: true
                };
              });
            } catch (assigneeError) {
              console.error("Error fetching assigned tasks, falling back to all tasks:", assigneeError);
              const allTasks = await taskService.getAllTasks();
              fetchedTasks = allTasks
                .filter((task: any) => task.assignedTo === currentUser._id)
                .map((task: any) => ({
                  ...task,
                  source: task.createdBy === currentUser._id ? "manager" as const : "superadmin" as const,
                  isAssignedToMe: true
                }));
            }
            break;
            
          case "created":
            // Tasks created by current user
            console.log("Fetching tasks created by:", currentUser._id);
            try {
              const createdTasks = await taskService.getTasksByCreator(currentUser._id);
              console.log("Created tasks:", createdTasks);
              
              fetchedTasks = createdTasks.map((task: any) => ({
                ...task,
                source: "manager" as const,
                isAssignedToMe: task.assignedTo === currentUser._id
              }));
            } catch (creatorError) {
              console.error("Error fetching created tasks, falling back to all tasks:", creatorError);
              const allTasks = await taskService.getAllTasks();
              fetchedTasks = allTasks
                .filter((task: any) => 
                  task.createdBy === currentUser._id || task.createdById === currentUser._id
                )
                .map((task: any) => ({
                  ...task,
                  source: "manager" as const,
                  isAssignedToMe: task.assignedTo === currentUser._id
                }));
            }
            break;
            
          case "site":
            // All tasks on selected site or current user's site
            const siteFilter = selectedSite !== 'all' ? selectedSite : currentUser.site;
            if (siteFilter) {
              console.log("Fetching tasks for site:", siteFilter);
              try {
                const siteTasks = await taskService.getTasksBySite(siteFilter);
                console.log("Site tasks:", siteTasks);
                
                fetchedTasks = siteTasks.map((task: any) => {
                  const isCreatedByCurrentUser = task.createdBy === currentUser._id || task.createdById === currentUser._id;
                  const isAssignedToCurrentUser = task.assignedTo === currentUser._id;
                  
                  return {
                    ...task,
                    source: isCreatedByCurrentUser ? "manager" as const : "superadmin" as const,
                    isAssignedToMe: isAssignedToCurrentUser
                  };
                });
              } catch (siteError) {
                console.error("Error fetching site tasks, falling back to all tasks:", siteError);
                const allTasks = await taskService.getAllTasks();
                fetchedTasks = allTasks
                  .filter((task: any) => task.siteName === siteFilter || task.siteId === siteFilter)
                  .map((task: any) => {
                    const isCreatedByCurrentUser = task.createdBy === currentUser._id || task.createdById === currentUser._id;
                    const isAssignedToCurrentUser = task.assignedTo === currentUser._id;
                    
                    return {
                      ...task,
                      source: isCreatedByCurrentUser ? "manager" as const : "superadmin" as const,
                      isAssignedToMe: isAssignedToCurrentUser
                    };
                  });
              }
            } else {
              // If user has no site, fall back to all tasks
              const allTasks = await taskService.getAllTasks();
              fetchedTasks = allTasks.map((task: any) => {
                const isCreatedByCurrentUser = task.createdBy === currentUser._id || task.createdById === currentUser._id;
                const isAssignedToCurrentUser = task.assignedTo === currentUser._id;
                
                return {
                  ...task,
                  source: isCreatedByCurrentUser ? "manager" as const : "superadmin" as const,
                  isAssignedToMe: isAssignedToCurrentUser
                };
              });
            }
            break;
            
          case "all":
          default:
            // All tasks
            console.log("Fetching all tasks");
            const allTasks = await taskService.getAllTasks();
            console.log("All tasks fetched:", allTasks);
            
            fetchedTasks = allTasks.map((task: any) => {
              const isCreatedByCurrentUser = task.createdBy === currentUser._id || task.createdById === currentUser._id;
              const isAssignedToCurrentUser = task.assignedTo === currentUser._id;
              
              return {
                ...task,
                source: isCreatedByCurrentUser ? "manager" as const : "superadmin" as const,
                isAssignedToMe: isAssignedToCurrentUser
              };
            });
            break;
        }
        
      } catch (error) {
        console.error("Error fetching tasks from taskService:", error);
        
        // Fallback to demo tasks
        fetchedTasks = getDemoTasks();
        console.log("Using demo tasks:", fetchedTasks);
        
        toast.warning("Using demo data. Check your backend connection.");
      }
      
      setTasks(fetchedTasks);
      
      // Set debug info
      setDebugInfo({
        totalTasks: fetchedTasks.length,
        viewMode: viewMode,
        selectedSite: selectedSite,
        currentUserSite: currentUser.site,
        currentUserId: currentUser._id,
        currentUserRole: currentUser.role,
        assignedToMeCount: fetchedTasks.filter(t => t.isAssignedToMe).length,
        createdByMeCount: fetchedTasks.filter(t => t.source === "manager").length,
        sites: sites.length,
        supervisors: supervisors.length
      });
      
    } catch (error: any) {
      console.error('Error in fetchTasks:', error);
      toast.error(`Failed to load tasks: ${error.message}`);
      
      // Set demo tasks on error
      setTasks(getDemoTasks());
    } finally {
      setLoading(prev => ({ ...prev, tasks: false }));
    }
  };

  // Helper function for demo tasks
  const getDemoTasks = (): Task[] => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    const demoTasks: Task[] = [
      // Tasks assigned to current user
      {
        _id: "assigned_task_1",
        title: "Daily Site Inspection",
        description: "Complete daily safety inspection of all equipment",
        assignedTo: currentUser?._id || "current_user_id",
        assignedToName: currentUser?.name || "Current User",
        priority: "high",
        status: "pending",
        deadline: today.toISOString().split('T')[0],
        siteId: "site_1",
        siteName: currentUser?.site || "Site A",
        clientName: "Client A",
        taskType: "inspection",
        attachments: [],
        hourlyUpdates: [],
        createdAt: lastWeek.toISOString(),
        updatedAt: today.toISOString(),
        createdBy: "superadmin_id",
        createdById: "superadmin_id",
        source: "superadmin",
        isAssignedToMe: true
      },
      {
        _id: "assigned_task_2",
        title: "Team Meeting Preparation",
        description: "Prepare agenda and materials for weekly team meeting",
        assignedTo: currentUser?._id || "current_user_id",
        assignedToName: currentUser?.name || "Current User",
        priority: "medium",
        status: "in-progress",
        deadline: nextWeek.toISOString().split('T')[0],
        siteId: "site_1",
        siteName: currentUser?.site || "Site A",
        clientName: "Client A",
        taskType: "meeting",
        attachments: [],
        hourlyUpdates: [],
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
        createdBy: "another_manager_id",
        createdById: "another_manager_id",
        source: "superadmin",
        isAssignedToMe: true
      },
      // Tasks created by current user
      {
        _id: "created_task_1",
        title: "Monthly Safety Inspection",
        description: "Complete monthly safety inspection report",
        assignedTo: "sup_1",
        assignedToName: "Alice Supervisor",
        priority: "high",
        status: "in-progress",
        deadline: nextWeek.toISOString().split('T')[0],
        siteId: newTask.siteId || "site_1",
        siteName: newTask.siteName || currentUser?.site || "Site A",
        clientName: newTask.clientName || "Client A",
        taskType: "inspection",
        attachments: [],
        hourlyUpdates: [],
        createdAt: lastWeek.toISOString(),
        updatedAt: today.toISOString(),
        createdBy: currentUser?._id,
        createdById: currentUser?._id,
        source: "manager",
        isAssignedToMe: false
      },
      {
        _id: "created_task_2",
        title: "Team Training Session",
        description: "Conduct safety training for new hires",
        assignedTo: "sup_2",
        assignedToName: "Bob Supervisor",
        priority: "medium",
        status: "pending",
        deadline: nextWeek.toISOString().split('T')[0],
        siteId: newTask.siteId || "site_1",
        siteName: newTask.siteName || currentUser?.site || "Site A",
        clientName: newTask.clientName || "Client A",
        taskType: "training",
        attachments: [],
        hourlyUpdates: [],
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
        createdBy: currentUser?._id,
        createdById: currentUser?._id,
        source: "manager",
        isAssignedToMe: false
      },
      // Other tasks on the same site
      {
        _id: "site_task_1",
        title: "Equipment Maintenance",
        description: "Schedule quarterly equipment maintenance",
        assignedTo: "sup_1",
        assignedToName: "Alice Supervisor",
        priority: "medium",
        status: "completed",
        deadline: lastWeek.toISOString().split('T')[0],
        siteId: "site_1",
        siteName: currentUser?.site || "Site A",
        clientName: "Client A",
        taskType: "maintenance",
        attachments: [],
        hourlyUpdates: [],
        createdAt: lastWeek.toISOString(),
        updatedAt: lastWeek.toISOString(),
        createdBy: "superadmin_id",
        createdById: "superadmin_id",
        source: "superadmin",
        isAssignedToMe: false
      }
    ];
    
    return demoTasks;
  };

  // Initialize data
  useEffect(() => {
    if (currentUser && currentUser.role === "manager") {
      console.log("Initializing data for manager:", currentUser);
      fetchSites();
      fetchSupervisors();
      fetchTasks();
      fetchAllSites();
    }
  }, [currentUser]);

  // Refresh tasks when view mode or selected site changes
  useEffect(() => {
    if (currentUser) {
      fetchTasks();
    }
  }, [viewMode, selectedSite]);

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setNewTask(prev => ({ ...prev, [field]: value }));
  };

  // Handle site selection
  const handleSiteSelect = (siteId: string) => {
    const selectedSite = sites.find(s => s._id === siteId);
    if (selectedSite) {
      console.log("Site selected:", selectedSite);
      setNewTask(prev => ({ 
        ...prev, 
        siteId: siteId,
        siteName: selectedSite.name,
        clientName: selectedSite.clientName
      }));
      
      // Refresh supervisors for this site
      fetchSupervisors();
    }
  };

  // Handle supervisor selection
  const handleSupervisorSelect = (supervisorId: string) => {
    const selectedSupervisor = supervisors.find(s => s._id === supervisorId);
    if (selectedSupervisor) {
      console.log("Supervisor selected:", selectedSupervisor);
      setNewTask(prev => ({ 
        ...prev, 
        assignedTo: supervisorId,
        assignedToName: selectedSupervisor.name 
      }));
    }
  };

  // Add new task - FIXED VERSION
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error("Please login to assign tasks");
      return;
    }

    // Validate required fields
    if (!newTask.assignedTo || !newTask.siteId) {
      toast.error("Please select both a supervisor and a site");
      return;
    }
    
    console.log("Creating task with data:", newTask);
    console.log("Current user:", currentUser);
    
    try {
      // Prepare task data - FIXED: Ensure all required fields are present and properly formatted
      const taskData = {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        assignedTo: newTask.assignedTo.trim(),
        assignedToName: newTask.assignedToName.trim(),
        priority: newTask.priority,
        status: "pending",
        deadline: newTask.deadline,
        dueDateTime: newTask.deadline ? `${newTask.deadline}T23:59:59` : new Date().toISOString(),
        siteId: newTask.siteId.trim(),
        siteName: newTask.siteName.trim(),
        clientName: newTask.clientName.trim(),
        taskType: newTask.taskType || "routine",
        createdBy: currentUser._id.trim()
      };
      
      console.log("Sending task data to API:", JSON.stringify(taskData, null, 2));
      
      // Create task using taskService
      const createdTask = await taskService.createTask(taskData);
      console.log("Task created successfully:", createdTask);
      
      // Add source and isAssignedToMe fields for UI
      const taskWithSource: Task = {
        ...createdTask,
        source: "manager",
        isAssignedToMe: createdTask.assignedTo === currentUser._id
      };
      
      // Update local state
      setTasks(prev => [...prev, taskWithSource]);
      toast.success("Task assigned successfully!");
      
      // Reset form
      setDialogOpen(false);
      setNewTask({ 
        title: "", 
        description: "", 
        assignedTo: "",
        assignedToName: "",
        siteId: "",
        siteName: "",
        clientName: "",
        priority: "medium", 
        deadline: "",
        dueDateTime: "",
        taskType: "routine"
      });
      
      // Refresh tasks list
      setTimeout(() => fetchTasks(), 1000);
      
    } catch (err: any) {
      console.error('Error creating task:', err);
      
      // Try to get more specific error message
      let errorMessage = "Failed to assign task. Please try again.";
      if (err.message.includes("Validation error")) {
        errorMessage = "Please check all required fields are filled correctly.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
      
      // Create demo task locally for testing
      const demoTask: Task = {
        _id: `demo_${Date.now()}`,
        title: newTask.title,
        description: newTask.description,
        assignedTo: newTask.assignedTo,
        assignedToName: newTask.assignedToName,
        priority: newTask.priority,
        status: "pending",
        deadline: newTask.deadline,
        dueDateTime: newTask.deadline ? `${newTask.deadline}T23:59:59` : new Date().toISOString(),
        siteId: newTask.siteId,
        siteName: newTask.siteName,
        clientName: newTask.clientName,
        taskType: newTask.taskType || "routine",
        attachments: [],
        hourlyUpdates: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser._id,
        createdById: currentUser._id,
        source: "manager",
        isAssignedToMe: newTask.assignedTo === currentUser._id
      };
      
      setTasks(prev => [...prev, demoTask]);
      toast.success("Task assigned (demo mode)! Check console for details.");
      
      setDialogOpen(false);
      setNewTask({ 
        title: "", 
        description: "", 
        assignedTo: "",
        assignedToName: "",
        siteId: "",
        siteName: "",
        clientName: "",
        priority: "medium", 
        deadline: "",
        dueDateTime: "",
        taskType: "routine"
      });
    }
  };

  // Update task status
  const updateStatus = async (taskId: string, status: string) => {
    try {
      await taskService.updateTaskStatus(taskId, { 
        status: status as "pending" | "in-progress" | "completed" | "cancelled" 
      });
      
      setTasks(tasks.map(task => task._id === taskId ? { 
        ...task, 
        status: status as Task['status'] 
      } : task));
      toast.success("Task status updated!");
      
    } catch (err: any) {
      console.error('Error updating task status:', err);
      toast.error(err.message || "Failed to update task status");
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    const task = tasks.find(t => t._id === taskId);
    
    if (task?.source === "superadmin") {
      toast.error("You cannot delete tasks assigned by superadmin");
      return;
    }
    
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }
    
    try {
      await taskService.deleteTask(taskId);
      setTasks(tasks.filter(task => task._id !== taskId));
      toast.success("Task deleted successfully!");
    } catch (err: any) {
      console.error('Error deleting task:', err);
      toast.error(err.message || "Failed to delete task");
    }
  };

  // View task details
  const handleViewTask = (task: Task) => {
    const supervisor = supervisors.find(s => s._id === task.assignedTo);
    const site = sites.find(s => s._id === task.siteId);
    
    const details = `
      <div class="space-y-3">
        <div>
          <strong>Task:</strong> ${task.title}
        </div>
        <div>
          <strong>Description:</strong> ${task.description}
        </div>
        <div>
          <strong>Assigned To:</strong> ${task.assignedToName} (${supervisor?.email || 'N/A'})
          ${task.isAssignedToMe ? '<span style="color: #10b981; font-weight: bold"> ← Assigned to you</span>' : ''}
        </div>
        <div>
          <strong>Site:</strong> ${task.siteName}
        </div>
        <div>
          <strong>Client:</strong> ${task.clientName}
        </div>
        <div>
          <strong>Priority:</strong> ${task.priority}
        </div>
        <div>
          <strong>Status:</strong> ${task.status}
        </div>
        <div>
          <strong>Due Date:</strong> ${formatDate(task.deadline)}
        </div>
        <div>
          <strong>Created On:</strong> ${formatDate(task.createdAt)}
        </div>
        <div>
          <strong>Source:</strong> ${task.source === "superadmin" ? "Super Admin" : "You (Manager)"}
        </div>
        ${task.taskType ? `<div><strong>Type:</strong> ${task.taskType}</div>` : ''}
      </div>
    `;
    
    toast.info("Task Details", {
      description: details,
      duration: 10000,
    });
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignedToName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === "pending") matchesTab = task.status === "pending";
    else if (activeTab === "in-progress") matchesTab = task.status === "in-progress";
    else if (activeTab === "completed") matchesTab = task.status === "completed";
    else if (activeTab === "cancelled") matchesTab = task.status === "cancelled";
    else if (activeTab === "my-tasks") matchesTab = task.source === "manager";
    else if (activeTab === "superadmin-tasks") matchesTab = task.source === "superadmin";
    else if (activeTab === "assigned-to-me") matchesTab = task.isAssignedToMe === true;
    
    return matchesSearch && matchesTab;
  });

  // Helper functions
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getSourceBadge = (task: Task) => {
    if (task.isAssignedToMe) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
          <UserCheck className="h-3 w-3 mr-1" />
          <span className="hidden sm:inline">Assigned to You</span>
          <span className="sm:hidden">You</span>
        </Badge>
      );
    }
    
    return task.source === "superadmin" ? (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
        <Shield className="h-3 w-3 mr-1" />
        <span className="hidden sm:inline">Super Admin</span>
        <span className="sm:hidden">Admin</span>
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
        <FileText className="h-3 w-3 mr-1" />
        <span className="hidden sm:inline">You Created</span>
        <span className="sm:hidden">You</span>
      </Badge>
    );
  };

  const getViewModeIcon = (mode: ViewMode) => {
    switch(mode) {
      case "assigned":
        return <UserCheck className="h-4 w-4 mr-2" />;
      case "created":
        return <FileText className="h-4 w-4 mr-2" />;
      case "site":
        return <Building className="h-4 w-4 mr-2" />;
      case "all":
        return <ListFilter className="h-4 w-4 mr-2" />;
      default:
        return <ListFilter className="h-4 w-4 mr-2" />;
    }
  };

  const getViewModeText = (mode: ViewMode) => {
    switch(mode) {
      case "assigned":
        return "Tasks Assigned to Me";
      case "created":
        return "Tasks I Created";
      case "site":
        return "All Tasks on My Site";
      case "all":
        return "All Tasks";
      default:
        return "Tasks";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Debug function
  const showDebugInfo = () => {
    console.log("=== DEBUG INFO ===");
    console.log("Current User:", currentUser);
    console.log("Tasks:", tasks);
    console.log("Sites:", sites);
    console.log("Supervisors:", supervisors);
    console.log("View Mode:", viewMode);
    console.log("Active Tab:", activeTab);
    console.log("Search Query:", searchQuery);
    console.log("New Task Form:", newTask);
    console.log("Selected Site:", selectedSite);
    console.log("All Sites:", allSites);
    console.log("===================");
    
    toast.info("Debug info logged to console", {
      description: "Check browser console for detailed information"
    });
  };

  // Check if user is a manager
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader 
          title="Task Management" 
          onMenuClick={onMenuClick}
        />
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 md:p-8 text-center">
              <AlertCircle className="h-12 w-12 md:h-16 md:w-16 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4">
                Please login to access this page
              </p>
              <Button onClick={() => window.location.href = '/login'} className="w-full md:w-auto">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentUser.role !== "manager") {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader 
          title="Task Management" 
          onMenuClick={onMenuClick}
        />
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 md:p-8 text-center">
              <Shield className="h-12 w-12 md:h-16 md:w-16 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4">
                This page is only accessible to managers
              </p>
              <div className="space-y-2 mb-4">
                <Badge variant="outline" className="text-lg capitalize">
                  Your role: {currentUser.role}
                </Badge>
              </div>
              <Button onClick={() => window.location.href = '/dashboard'} className="w-full md:w-auto">
                Go to Dashboard
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
        title="Task Management" 
        subtitle={getViewModeText(viewMode)}
        onMenuClick={onMenuClick}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 md:p-6 space-y-4 md:space-y-6"
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

        {/* Manager Info Card */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold truncate">{currentUser.name}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="default" className="text-xs md:text-sm capitalize">
                    <Shield className="h-3 w-3 mr-1" />
                    {currentUser.role}
                  </Badge>
                  {currentUser.site && (
                    <Badge variant="outline" className="text-xs md:text-sm">
                      <Users className="h-3 w-3 mr-1" />
                      Site: {currentUser.site}
                    </Badge>
                  )}
                  {currentUser.email && (
                    <Badge variant="outline" className="text-xs md:text-sm max-w-full">
                      <span className="truncate">{currentUser.email}</span>
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <ListFilter className="h-4 w-4 text-muted-foreground hidden sm:block" />
                    <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
                      <SelectTrigger className="w-[180px] sm:w-[200px] h-9">
                        <SelectValue placeholder="Select view" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="assigned">
                          <div className="flex items-center">
                            <UserCheck className="h-4 w-4 mr-2" />
                            <span className="truncate">Tasks Assigned to Me</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="created">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-2" />
                            <span className="truncate">Tasks I Created</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="site">
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-2" />
                            <span className="truncate">All Tasks on My Site</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="all">
                          <div className="flex items-center">
                            <ListFilter className="h-4 w-4 mr-2" />
                            <span className="truncate">All Tasks</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isMobileView && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setShowMobileFilters(!showMobileFilters)}
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size={isMobileView ? "sm" : "default"}
                    onClick={showDebugInfo}
                    className="text-xs"
                  >
                    Debug
                  </Button>
                  <Button
                    variant="outline"
                    size={isMobileView ? "sm" : "default"}
                    onClick={fetchTasks}
                    disabled={loading.tasks}
                    className="text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${loading.tasks ? 'animate-spin' : ''}`} />
                    {!isMobileView && "Refresh"}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {tasks.length} tasks • {tasks.filter(t => t.isAssignedToMe).length} assigned • {sites.length} sites
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Filters */}
        {showMobileFilters && isMobileView && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Filter by Status</Label>
                  <Select value={activeTab} onValueChange={setActiveTab}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tasks</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="my-tasks">My Tasks</SelectItem>
                      <SelectItem value="superadmin-tasks">Superadmin Tasks</SelectItem>
                      <SelectItem value="assigned-to-me">Assigned to Me</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Search</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks Card */}
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-6">
            <div>
              <CardTitle className="text-lg md:text-xl">
                {getViewModeText(viewMode)}
              </CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {viewMode === "assigned" 
                  ? "Tasks assigned directly to you"
                  : viewMode === "created"
                  ? "Tasks created by you"
                  : viewMode === "site"
                  ? `All tasks for ${selectedSite !== 'all' ? getSiteDisplayName() : currentUser.site || "your site"}`
                  : "All tasks from all sources"
                }
              </p>
            </div>
            <Button 
              onClick={() => setDialogOpen(true)} 
              disabled={loading.supervisors || supervisors.length === 0 || loading.sites || sites.length === 0}
              className="whitespace-nowrap w-full md:w-auto"
              size={isMobileView ? "default" : "default"}
            >
              <Plus className="mr-2 h-4 w-4" />
              Assign Task
            </Button>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            {/* Desktop Search and Tabs */}
            {!isMobileView && (
              <>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                  <TabsList className="grid grid-cols-8 h-9">
                    <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                    <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
                    <TabsTrigger value="in-progress" className="text-xs">In Progress</TabsTrigger>
                    <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
                    <TabsTrigger value="cancelled" className="text-xs">Cancelled</TabsTrigger>
                    <TabsTrigger value="my-tasks" className="text-xs">My Tasks</TabsTrigger>
                    <TabsTrigger value="superadmin-tasks" className="text-xs">Superadmin</TabsTrigger>
                    <TabsTrigger value="assigned-to-me" className="text-xs">Assigned to Me</TabsTrigger>
                  </TabsList>
                </Tabs>
              </>
            )}

            {/* Tasks Display */}
            {loading.tasks ? (
              <div className="text-center py-12">
                <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm md:text-base text-muted-foreground mt-4">Loading tasks...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm md:text-base text-muted-foreground">
                  {searchQuery 
                    ? "No tasks match your search" 
                    : `No ${activeTab !== "all" ? activeTab : ""} tasks found for this view`
                  }
                </p>
                <Button
                  variant="outline"
                  onClick={fetchTasks}
                  className="mt-4"
                  size={isMobileView ? "sm" : "default"}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Tasks
                </Button>
              </div>
            ) : isMobileView ? (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <MobileTaskCard
                    key={task._id}
                    task={task}
                    supervisors={supervisors}
                    onView={handleViewTask}
                    onUpdateStatus={updateStatus}
                    onDelete={handleDeleteTask}
                    getPriorityColor={getPriorityColor}
                    getSourceBadge={getSourceBadge}
                    formatDate={formatDate}
                    isMobileView={isMobileView}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Task</TableHead>
                      <TableHead className="whitespace-nowrap">Assigned To</TableHead>
                      <TableHead className="whitespace-nowrap">Site/Client</TableHead>
                      <TableHead className="whitespace-nowrap">Source</TableHead>
                      <TableHead className="whitespace-nowrap">Priority</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap">Due Date</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{task.title}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {task.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              {task.assignedToName}
                              {task.isAssignedToMe && (
                                <Badge variant="outline" className="h-4 px-1 text-[10px] bg-green-50 text-green-700 border-green-200">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {supervisors.find(s => s._id === task.assignedTo)?.email || 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="whitespace-nowrap">{task.siteName}</div>
                            <div className="text-xs text-muted-foreground">
                              {task.clientName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getSourceBadge(task)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(task.priority)} className="whitespace-nowrap">
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={task.status} 
                            onValueChange={(value) => updateStatus(task._id, value)}
                            disabled={task.source === "superadmin" && !task.isAssignedToMe}
                          >
                            <SelectTrigger className="w-[130px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(task.deadline)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewTask(task)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (task.source === "superadmin" && !task.isAssignedToMe) {
                                  toast.warning("Cannot edit superadmin tasks");
                                } else {
                                  toast.info("Edit feature coming soon");
                                }
                              }}
                              disabled={task.source === "superadmin" && !task.isAssignedToMe}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTask(task._id)}
                              disabled={task.source === "superadmin" && !task.isAssignedToMe}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assign Task Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assign New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter task title"
                  required
                  className="h-10"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter task description"
                  rows={3}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="site">Site *</Label>
                  <Select
                    value={newTask.siteId}
                    onValueChange={handleSiteSelect}
                    required
                    disabled={loading.sites}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={loading.sites ? "Loading sites..." : "Select site"} />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((site) => (
                        <SelectItem key={site._id} value={site._id}>
                          {site.name} ({site.clientName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="supervisor">Supervisor *</Label>
                  <Select
                    value={newTask.assignedTo}
                    onValueChange={handleSupervisorSelect}
                    required
                    disabled={loading.supervisors || !newTask.siteId}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue 
                        placeholder={
                          !newTask.siteId ? "Select site first" : 
                          loading.supervisors ? "Loading supervisors..." : 
                          "Select supervisor"
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisors.map((supervisor) => (
                        <SelectItem key={supervisor._id} value={supervisor._id}>
                          {supervisor.name} ({supervisor.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority *</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value) => handleInputChange('priority', value)}
                    required
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="deadline">Due Date *</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={newTask.deadline}
                    onChange={(e) => handleInputChange('deadline', e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="h-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="taskType">Task Type</Label>
                <Select
                  value={newTask.taskType}
                  onValueChange={(value) => handleInputChange('taskType', value)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="audit">Audit</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button type="submit" className="w-full h-10" disabled={loading.supervisors || loading.sites}>
                Assign Task
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
};

export default ManagerTasks;