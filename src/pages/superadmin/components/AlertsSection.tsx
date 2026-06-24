// pages/superadmin/SuperadminWorkQueries.tsx
import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Search, 
  Eye, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  MessageCircle, 
  User, 
  Trash2,
  RefreshCw,
  Building2,
  Loader2,
  Mail,
  MapPin,
  Info,
  Menu,
  Home,
  Users,
  BarChart3,
  LogOut,
  Settings,
  ClipboardList,
  Image as ImageIcon,
  ZoomIn,
  X,
  Reply,
  Filter,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  FileText,
  Activity
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useRole } from "@/context/RoleContext";
import axios from "axios";

// API URL
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');
// Types
interface WorkQuery {
  _id: string;
  queryId: string;
  title: string;
  description: string;
  serviceId?: string;
  serviceTitle?: string;
  serviceType?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'resolved' | 'rejected';
  category: string;
  reportedBy: {
    userId: string;
    name: string;
    role: string;
  };
  supervisorId: string;
  supervisorName: string;
  superadminResponse?: string;
  responseDate?: string;
  comments: Array<{
    userId: string;
    name: string;
    comment: string;
    timestamp: string;
  }>;
  images?: Array<{
    url: string;
    publicId: string;
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Statistics {
  total: number;
  statusCounts: {
    pending: number;
    'in-progress': number;
    resolved: number;
    rejected: number;
  };
  priorityCounts: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  supervisorStats: Array<{
    supervisorId: string;
    supervisorName: string;
    total: number;
    pending: number;
    resolved: number;
  }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Dashboard Header Component
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
      </div>
    </motion.header>
  );
};

// Reusable Components
const PriorityBadge = ({ priority }: { priority: string }) => {
  const styles = {
    low: "bg-green-100 text-green-800 border-green-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    critical: "bg-red-100 text-red-800 border-red-200"
  };

  const icons = {
    low: <CheckCircle className="h-3 w-3" />,
    medium: <Clock className="h-3 w-3" />,
    high: <AlertCircle className="h-3 w-3" />,
    critical: <AlertCircle className="h-3 w-3" />
  };

  return (
    <Badge variant="outline" className={`${styles[priority as keyof typeof styles]} flex items-center gap-1`}>
      {icons[priority as keyof typeof icons]}
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    "in-progress": "bg-blue-100 text-blue-800 border-blue-200",
    resolved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200"
  };

  const icons = {
    pending: <Clock className="h-3 w-3" />,
    "in-progress": <AlertCircle className="h-3 w-3" />,
    resolved: <CheckCircle className="h-3 w-3" />,
    rejected: <X className="h-3 w-3" />
  };

  return (
    <Badge variant="outline" className={`${styles[status as keyof typeof styles]} flex items-center gap-1`}>
      {icons[status as keyof typeof icons]}
      {status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
    </Badge>
  );
};

// Response Dialog Component
const ResponseDialog = ({ 
  query, 
  open, 
  onClose, 
  onRespond 
}: { 
  query: WorkQuery | null; 
  open: boolean; 
  onClose: () => void; 
  onRespond: (id: string, status: string, response: string) => Promise<void>;
}) => {
  const [status, setStatus] = useState<string>('resolved');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query) {
      setStatus(query.status === 'pending' ? 'resolved' : query.status);
      setResponse(query.superadminResponse || '');
    }
  }, [query]);

  const handleSubmit = async () => {
    if (!query) return;
    
    if (status === 'resolved' && !response.trim()) {
      toast.error('Please provide a response when resolving the query');
      return;
    }

    setLoading(true);
    try {
      await onRespond(query._id, status, response);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Respond to Work Query</DialogTitle>
          <DialogDescription>
            Query: {query?.queryId} - {query?.title}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Response *</Label>
            <Textarea
              placeholder="Enter your response to this query..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={5}
              required={status === 'resolved'}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Reply className="h-4 w-4 mr-2" />}
            Submit Response
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// View Details Dialog
const ViewDetailsDialog = ({ query, open, onClose }: { query: WorkQuery | null; open: boolean; onClose: () => void }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch {
      return "Invalid date";
    }
  };

  if (!query) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Query Details - {query.queryId}</DialogTitle>
          <DialogDescription>
            Submitted by {query.supervisorName} on {formatDate(query.createdAt)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="font-semibold">Title</Label>
              <p className="mt-1 text-sm">{query.title}</p>
            </div>
            <div>
              <Label className="font-semibold">Service</Label>
              <p className="mt-1 text-sm">{query.serviceId}</p>
            </div>
            <div>
              <Label className="font-semibold">Priority</Label>
              <div className="mt-1"><PriorityBadge priority={query.priority} /></div>
            </div>
            <div>
              <Label className="font-semibold">Status</Label>
              <div className="mt-1"><StatusBadge status={query.status} /></div>
            </div>
            <div>
              <Label className="font-semibold">Category</Label>
              <p className="mt-1 text-sm capitalize">{query.category.replace(/-/g, ' ')}</p>
            </div>
            <div>
              <Label className="font-semibold">Submitted By</Label>
              <div className="mt-1 flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{query.supervisorName}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="font-semibold">Description</Label>
            <p className="mt-1 text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
              {query.description}
            </p>
          </div>

          {/* Images */}
          {query.images && query.images.length > 0 && (
            <div>
              <Label className="font-semibold mb-2 block">Photos ({query.images.length})</Label>
              <div className="grid grid-cols-3 gap-2">
                {query.images.map((image, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer group"
                    onClick={() => setSelectedImage(image.url)}
                  >
                    <img
                      src={image.url}
                      alt={`Query photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="h-6 w-6 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Superadmin Response */}
          {query.superadminResponse && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <Label className="font-semibold text-green-900">Superadmin Response</Label>
              <p className="mt-1 text-sm text-green-800 whitespace-pre-wrap">
                {query.superadminResponse}
              </p>
              {query.responseDate && (
                <div className="text-xs text-green-600 mt-2">
                  Responded on: {formatDate(query.responseDate)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Full Screen Image Viewer */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
            <div className="relative w-full h-full min-h-[300px] flex items-center justify-center bg-black">
              {selectedImage && (
                <img 
                  src={selectedImage} 
                  alt="Full size" 
                  className="max-w-full max-h-[85vh] object-contain"
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
const SuperadminWorkQueries = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ onMenuClick?: () => void }>();
  const { user, isAuthenticated, role } = useRole();
  
  const [workQueries, setWorkQueries] = useState<WorkQuery[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  
  const [loading, setLoading] = useState({
    queries: false,
    statistics: false,
    responding: false
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [supervisorFilter, setSupervisorFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  
  const [selectedQueryForResponse, setSelectedQueryForResponse] = useState<WorkQuery | null>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [selectedQueryForView, setSelectedQueryForView] = useState<WorkQuery | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Check mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch work queries
  const fetchWorkQueries = async () => {
    setLoading(prev => ({ ...prev, queries: true }));
    try {
      const response = await axios.get(`${API_URL}/work-queries/superadmin/all`, {
        params: {
          search: searchTerm || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          supervisorId: supervisorFilter !== 'all' ? supervisorFilter : undefined,
          page: pagination.page,
          limit: pagination.limit
        }
      });
      
      if (response.data.success) {
        setWorkQueries(response.data.data);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        toast.error(response.data.message || 'Failed to fetch work queries');
      }
    } catch (error: any) {
      console.error('Error fetching work queries:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch work queries');
    } finally {
      setLoading(prev => ({ ...prev, queries: false }));
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    setLoading(prev => ({ ...prev, statistics: true }));
    try {
      const response = await axios.get(`${API_URL}/work-queries/superadmin/statistics`);
      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(prev => ({ ...prev, statistics: false }));
    }
  };

  // Update query response
  const updateQueryResponse = async (id: string, status: string, response: string) => {
    setLoading(prev => ({ ...prev, responding: true }));
    try {
      const res = await axios.patch(`${API_URL}/work-queries/${id}/superadmin-response`, {
        status,
        superadminResponse: response
      });
      
      if (res.data.success) {
        toast.success(`Query ${status} successfully`);
        fetchWorkQueries();
        fetchStatistics();
      } else {
        toast.error(res.data.message || 'Failed to update query');
      }
    } catch (error: any) {
      console.error('Error updating query:', error);
      toast.error(error.response?.data?.message || 'Failed to update query');
    } finally {
      setLoading(prev => ({ ...prev, responding: false }));
    }
  };

  // Initial load
  useEffect(() => {
    if (isAuthenticated && role === 'superadmin') {
      fetchWorkQueries();
      fetchStatistics();
    }
  }, [pagination.page, pagination.limit]);

  // Handle filter changes
  useEffect(() => {
    if (isAuthenticated && role === 'superadmin') {
      fetchWorkQueries();
    }
  }, [searchTerm, statusFilter, priorityFilter, supervisorFilter]);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleRefresh = () => {
    fetchWorkQueries();
    fetchStatistics();
  };

  const handleRespond = (query: WorkQuery) => {
    setSelectedQueryForResponse(query);
    setIsResponseDialogOpen(true);
  };

  const handleViewDetails = (query: WorkQuery) => {
    setSelectedQueryForView(query);
    setIsViewDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch {
      return "Invalid date";
    }
  };

  // Get unique supervisors for filter
  const uniqueSupervisors = statistics?.supervisorStats || [];

  // Check access
  if (!isAuthenticated || role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>
              Only Superadmins can access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')} className="w-full">Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader 
        title="Work Query Management" 
        subtitle="View and manage all work queries from all supervisors"
        onMenuClick={outletContext?.onMenuClick}
      />
      
      <div className="p-4 md:p-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Queries</p>
                  <p className="text-2xl md:text-3xl font-bold text-blue-600">
                    {loading.statistics ? "..." : statistics?.total || 0}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl md:text-3xl font-bold text-yellow-600">
                    {loading.statistics ? "..." : statistics?.statusCounts?.pending || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl md:text-3xl font-bold text-blue-600">
                    {loading.statistics ? "..." : statistics?.statusCounts?.['in-progress'] || 0}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Resolved</p>
                  <p className="text-2xl md:text-3xl font-bold text-green-600">
                    {loading.statistics ? "..." : statistics?.statusCounts?.resolved || 0}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Supervisor Stats Summary */}
        {statistics?.supervisorStats && statistics.supervisorStats.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Supervisor Summary</CardTitle>
              <CardDescription>Query statistics by supervisor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supervisor</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Pending</TableHead>
                      <TableHead className="text-center">Resolved</TableHead>
                      <TableHead className="text-center">Resolution Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statistics.supervisorStats.map((sup) => (
                      <TableRow key={sup.supervisorId}>
                        <TableCell className="font-medium">{sup.supervisorName}</TableCell>
                        <TableCell className="text-center">{sup.total}</TableCell>
                        <TableCell className="text-center text-yellow-600">{sup.pending}</TableCell>
                        <TableCell className="text-center text-green-600">{sup.resolved}</TableCell>
                        <TableCell className="text-center">
                          {sup.total > 0 ? Math.round((sup.resolved / sup.total) * 100) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Queries Table */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg md:text-xl">All Work Queries</CardTitle>
                <CardDescription>View and respond to queries from all supervisors</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRefresh} disabled={loading.queries} size={isMobileView ? "sm" : "default"}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading.queries ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" onClick={() => setShowFilters(!showFilters)} size={isMobileView ? "sm" : "default"}>
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 md:p-6 pt-0">
            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by title, ID, description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Supervisor</Label>
                  <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Supervisors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Supervisors</SelectItem>
                      {uniqueSupervisors.map((sup) => (
                        <SelectItem key={sup.supervisorId} value={sup.supervisorId}>
                          {sup.supervisorName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Queries Table */}
            {loading.queries ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="mt-4 text-muted-foreground">Loading work queries...</p>
              </div>
            ) : workQueries.length === 0 ? (
              <div className="text-center py-12 border rounded-lg">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium">No queries found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || supervisorFilter !== 'all'
                    ? "No work queries match your current filters."
                    : "No work queries have been submitted yet."}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Query ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Supervisor</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workQueries.map((query) => (
                        <TableRow key={query._id}>
                          <TableCell className="font-mono text-sm">
                            {query.queryId}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <div className="font-medium truncate">{query.title}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {query.description.substring(0, 50)}...
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{query.supervisorName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <div className="text-sm truncate">{query.serviceId}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <PriorityBadge priority={query.priority} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={query.status} />
                          </TableCell>
                          <TableCell>
                            <div className="text-sm whitespace-nowrap">
                              {formatDate(query.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewDetails(query)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              
                              {query.status !== 'resolved' && query.status !== 'rejected' && (
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  onClick={() => handleRespond(query)}
                                  disabled={loading.responding}
                                >
                                  <Reply className="h-3 w-3 mr-1" />
                                  Respond
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
                    <div className="text-sm text-muted-foreground order-2 sm:order-1">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </div>
                    <div className="flex items-center gap-2 order-1 sm:order-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={pagination.page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
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
      </div>

      {/* Response Dialog */}
      <ResponseDialog
        query={selectedQueryForResponse}
        open={isResponseDialogOpen}
        onClose={() => {
          setIsResponseDialogOpen(false);
          setSelectedQueryForResponse(null);
        }}
        onRespond={updateQueryResponse}
      />

      {/* View Details Dialog */}
      <ViewDetailsDialog
        query={selectedQueryForView}
        open={isViewDialogOpen}
        onClose={() => {
          setIsViewDialogOpen(false);
          setSelectedQueryForView(null);
        }}
      />
    </div>
  );
};

export default SuperadminWorkQueries;