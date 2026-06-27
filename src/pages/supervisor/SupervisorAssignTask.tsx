// pages/supervisor/SupervisorAssignTask.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import NotificationService from '@/lib/notificationService';
import { createNotificationForSuperadmin } from '@/lib/notificationHelper';
import { 
  Search, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  ChevronDown,
  ChevronUp,
  Paperclip, 
  Download,
  Eye,
  Upload,
  MessageSquare,
  Calendar,
  User,
  Shield,
  Building,
  Filter,
  Loader2,
  FileText,
  Menu,
  X,
  Home,
  Users,
  BarChart3,
  LogOut,
  Trash2,
  Settings,
  Briefcase,
  CircleDot,
  XCircle,
  Camera,
  Image as ImageIcon,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useRole } from "@/context/RoleContext";
import { format } from "date-fns";

// ==================== INTERFACES ====================

export interface AssignTask {
  _id: string;
  taskTitle: string;
  description: string;
  startDate: string;
  endDate: string;
  dueDateTime: string;
  priority: 'high' | 'medium' | 'low';
  taskType: string;
  siteId: string;
  siteName: string;
  siteLocation: string;
  clientName: string;
  assignedManagers: Array<{
    userId: string;
    name: string;
    role: 'manager';
    assignedAt: string;
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  }>;
  assignedSupervisors: Array<{
    userId: string;
    name: string;
    role: 'supervisor';
    assignedAt: string;
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  }>;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  completionPercentage?: number;
  isOverdue?: boolean;
  hourlyUpdates?: Array<{
    id: string;
    content: string;
    timestamp: string;
    submittedBy: string;
    submittedByName: string;
  }>;
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
    uploadedAt: string;
    uploadedBy: string;
    uploadedByName: string;
    size: number;
    type: string;
  }>;
}

interface TaskWithPersonalStatus extends AssignTask {
  personalStatus: string;
  myAssignedAt?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');
// ==================== HEADER COMPONENT ====================

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

// ==================== MOBILE NAV DRAWER ====================

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  userName: string;
  userRole: string;
}

const MobileNavDrawer = ({ isOpen, onClose, onNavigate, userName, userRole }: MobileNavDrawerProps) => {
  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/supervisor' },
    { icon: Users, label: 'Employees', path: '/supervisor/employees' },
    { icon: FileText, label: 'Tasks', path: '/supervisor/tasks' },
    { icon: User, label: 'Profile', path: '/supervisor/profile' },
    { icon: BarChart3, label: 'Reports', path: '/supervisor/reports' },
    { icon: Settings, label: 'Settings', path: '/supervisor/settings' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          />
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-800 shadow-xl z-50 lg:hidden"
          >
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    {userName?.charAt(0) || 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {userName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {userRole}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <nav className="space-y-2">
                  {navItems.map((item) => (
                    <Button
                      key={item.path}
                      variant="ghost"
                      className="w-full justify-start gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        onNavigate(item.path);
                        onClose();
                      }}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  ))}
                </nav>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => {
                    localStorage.removeItem('sk_user');
                    window.location.href = '/login';
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ==================== CAMERA COMPONENT ====================

interface CameraComponentProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

const CameraComponent: React.FC<CameraComponentProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    checkCameraDevices();
    return () => {
      stopCamera();
    };
  }, []);

  const checkCameraDevices = async () => {
    try {
      setIsLoading(true);
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      
      if (videoDevices.length === 0) {
        setError('No camera found on this device');
        setHasPermission(false);
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setError(null);
      
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err: any) {
      console.error('Camera permission error:', err);
      setHasPermission(false);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      setIsLoading(true);
      stopCamera();
      
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsLoading(false);
        };
      }
    } catch (err: any) {
      console.error('Error starting camera:', err);
      setError(`Failed to start camera: ${err.message}`);
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(imageData);
        stopCamera();
      } else {
        setError('Video not ready. Please wait a moment.');
      }
    }
  };

  useEffect(() => {
    if (hasPermission && selectedDeviceId) {
      startCamera();
    }
  }, [hasPermission, selectedDeviceId]);

  if (isLoading && hasPermission === null) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="mt-2 text-sm text-gray-500">Checking camera...</p>
      </div>
    );
  }

  if (!hasPermission || error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-center text-red-600 mb-4">{error || 'Camera access required'}</p>
        <Button onClick={checkCameraDevices} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {devices.length > 1 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Camera</label>
          <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
            <SelectTrigger>
              <SelectValue placeholder="Select camera" />
            </SelectTrigger>
            <SelectContent>
              {devices.map(device => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ minHeight: '320px' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-auto max-h-96 object-cover"
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button onClick={capturePhoto} className="flex-1 bg-blue-600 hover:bg-blue-700">
          <Camera className="h-4 w-4 mr-2" />
          Capture Photo
        </Button>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const SupervisorAssignTask: React.FC = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ onMenuClick?: () => void }>();
  const { user, isAuthenticated } = useRole();
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskWithPersonalStatus[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TaskWithPersonalStatus[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskWithPersonalStatus | null>(null);
  const [uniqueSites, setUniqueSites] = useState<Array<{ id: string; name: string }>>([]);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Dialog states
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showUpdatesDialog, setShowUpdatesDialog] = useState(false);
  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [hourlyUpdateText, setHourlyUpdateText] = useState('');
  
  // Camera states
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedAttachmentTask, setSelectedAttachmentTask] = useState<TaskWithPersonalStatus | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // UI states
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0
  });

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch tasks on mount
  useEffect(() => {
    if (user && isAuthenticated) {
      fetchTasks();
    } else {
      setLoading(false);
    }
  }, [user, isAuthenticated]);

  // Apply filters whenever dependencies change
  useEffect(() => {
    applyFilters();
  }, [tasks, searchQuery, statusFilter, priorityFilter, siteFilter]);

  // ==================== DATA FETCHING ====================

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      const supervisorId = user?._id || user?.id;
      const supervisorName = user?.name;
      
      if (!supervisorId) {
        console.error('No supervisor ID found');
        toast.error('Supervisor ID not found');
        setTasks([]);
        return;
      }

      console.log('👤 Fetching tasks for supervisor:', { supervisorId, supervisorName });

      const response = await fetch(`${API_URL}/assigntasks`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      console.log('📊 Raw response data:', responseData);

      let allTasks: AssignTask[] = [];
      
      if (Array.isArray(responseData)) {
        allTasks = responseData;
      } else if (responseData.tasks && Array.isArray(responseData.tasks)) {
        allTasks = responseData.tasks;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        allTasks = responseData.data;
      } else {
        const possibleArrays = Object.values(responseData).filter(val => Array.isArray(val));
        if (possibleArrays.length > 0) {
          allTasks = possibleArrays[0] as AssignTask[];
        } else {
          console.error('❌ Unexpected response format:', responseData);
          throw new Error('Invalid response format from server');
        }
      }
      
      console.log(`📊 Total tasks in database: ${allTasks.length}`);

      const myTasks = allTasks.filter(task => {
        if (!task.assignedSupervisors || !Array.isArray(task.assignedSupervisors)) {
          return false;
        }
        
        if (task.assignedSupervisors.length === 0) {
          return false;
        }
        
        return task.assignedSupervisors.some(supervisor => {
          const supervisorUserId = supervisor.userId;
          
          const matchById = String(supervisorUserId) === String(supervisorId);
          const matchByIdFull = String(supervisorUserId) === String(user?._id);
          const matchByIdShort = String(supervisorUserId) === String(user?.id);
          const matchByName = supervisor.name?.toLowerCase().trim() === supervisorName?.toLowerCase().trim();
          
          return matchById || matchByIdFull || matchByIdShort || matchByName;
        });
      });

      console.log(`✅ Found ${myTasks.length} tasks assigned to this supervisor`);

      const tasksWithPersonalStatus: TaskWithPersonalStatus[] = myTasks.map(task => {
        const myInfo = task.assignedSupervisors?.find(supervisor => {
          const supervisorUserId = supervisor.userId;
          const matchById = String(supervisorUserId) === String(supervisorId);
          const matchByIdFull = String(supervisorUserId) === String(user?._id);
          const matchByIdShort = String(supervisorUserId) === String(user?.id);
          const matchByName = supervisor.name?.toLowerCase().trim() === supervisorName?.toLowerCase().trim();
          
          return matchById || matchByIdFull || matchByIdShort || matchByName;
        });
        
        return {
          ...task,
          personalStatus: myInfo?.status || 'pending',
          myAssignedAt: myInfo?.assignedAt
        };
      });

      setTasks(tasksWithPersonalStatus);

      const sites = new Map<string, string>();
      tasksWithPersonalStatus.forEach(task => {
        if (task.siteId && task.siteName) {
          sites.set(task.siteId, task.siteName);
        }
      });
      setUniqueSites(Array.from(sites.entries()).map(([id, name]) => ({ id, name })));

      calculateStats(tasksWithPersonalStatus);

      if (myTasks.length === 0) {
        toast.info('No tasks assigned to you yet');
      } else {
        toast.success(`Found ${myTasks.length} task(s) assigned to you`);
      }

    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast.error(error.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // ==================== STATISTICS ====================

  const calculateStats = (taskList: TaskWithPersonalStatus[]) => {
    const now = new Date();
    const stats = {
      totalTasks: taskList.length,
      completedTasks: taskList.filter(t => t.personalStatus === 'completed').length,
      pendingTasks: taskList.filter(t => t.personalStatus === 'pending').length,
      inProgressTasks: taskList.filter(t => t.personalStatus === 'in-progress').length,
      overdueTasks: taskList.filter(t => 
        t.personalStatus !== 'completed' && 
        t.personalStatus !== 'cancelled' && 
        new Date(t.dueDateTime) < now
      ).length
    };
    setStats(stats);
  };

  // ==================== FILTERING ====================

  const applyFilters = () => {
    let filtered = [...tasks];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.taskTitle.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.siteName.toLowerCase().includes(query) ||
        task.clientName.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.personalStatus === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    if (siteFilter !== 'all') {
      filtered = filtered.filter(task => task.siteId === siteFilter);
    }

    setFilteredTasks(filtered);
  };

  // ==================== ACTIONS ====================
const handleUpdatePersonalStatus = async (taskId: string, newStatus: string) => {
  try {
    setUpdatingStatus(taskId);
    
    const task = tasks.find(t => t._id === taskId);
    if (!task) {
      toast.error('Task not found');
      return;
    }
    
    const supervisorId = user?._id || user?.id;
    if (!supervisorId) {
      toast.error('Supervisor ID not found');
      return;
    }
    
    const supervisorIndex = task.assignedSupervisors?.findIndex(supervisor => {
      const supervisorUserId = supervisor.userId;
      const matchById = String(supervisorUserId) === String(supervisorId);
      const matchByIdFull = String(supervisorUserId) === String(user?._id);
      const matchByIdShort = String(supervisorUserId) === String(user?.id);
      
      return matchById || matchByIdFull || matchByIdShort;
    });
    
    if (supervisorIndex === -1 || supervisorIndex === undefined) {
      toast.error('Could not find your assignment in this task');
      return;
    }
    
    const updatedSupervisors = [...(task.assignedSupervisors || [])];
    
    updatedSupervisors[supervisorIndex] = {
      ...updatedSupervisors[supervisorIndex],
      status: newStatus as any
    };
    
    const response = await fetch(`${API_URL}/assigntasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assignedSupervisors: updatedSupervisors
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update status');
    }
    
    // ✅ When task is marked as completed - notify Superadmin
    if (newStatus === 'completed') {
      const taskTitle = task.taskTitle;
      const employeeName = user?.name || 'Supervisor';
      
      // ✅ Create notification for Superadmin
      await createNotificationForSuperadmin(
        `✅ Task Completed: ${taskTitle}`,
        `${employeeName} completed "${taskTitle}" at ${task.siteName}`,
        'success',
        'medium',
        {
          taskId: task._id,
          siteName: task.siteName,
          taskTitle: taskTitle,
          completedBy: employeeName,
          notificationType: 'task_completed'
        }
      );
      
      // ✅ Also notify via NotificationService (for sound)
      NotificationService.completeTaskNotification(taskId);
      
      console.log(`✅ Task ${taskId} marked as completed and Superadmin notified`);
    }
    
    toast.success(`Your status updated to ${newStatus}`);
    await fetchTasks();
    
  } catch (error: any) {
    console.error('Error updating status:', error);
    toast.error(error.message || 'Failed to update status');
  } finally {
    setUpdatingStatus(null);
  }
};
  const handleAddHourlyUpdate = async (taskId: string) => {
    if (!hourlyUpdateText.trim()) {
      toast.error('Please enter an update');
      return;
    }

    const supervisorId = user?._id || user?.id;
    const supervisorName = user?.name;

    if (!supervisorId || !supervisorName) {
      toast.error('User information not found');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/assigntasks/${taskId}/hourly-updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: hourlyUpdateText,
          submittedBy: supervisorId,
          submittedByName: supervisorName
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add hourly update');
      }

      toast.success('Hourly update added');
      setHourlyUpdateText('');
      setShowUpdatesDialog(false);
      await fetchTasks();
    } catch (error: any) {
      console.error('Error adding hourly update:', error);
      toast.error(error.message || 'Failed to add update');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, taskId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const supervisorId = user?._id || user?.id;
    const supervisorName = user?.name;

    if (!supervisorId || !supervisorName) {
      toast.error('User information not found');
      return;
    }

    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('uploadedBy', supervisorId);
        formData.append('uploadedByName', supervisorName);

        console.log(`📎 Uploading file: ${file.name}`);

        const response = await fetch(`${API_URL}/assigntasks/${taskId}/attachments`, {
          method: 'POST',
          body: formData,
        });

        const responseText = await response.text();
        console.log('📨 Upload response:', response.status, responseText);

        if (!response.ok) {
          let errorMessage = `Failed to upload ${file.name}`;
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            errorMessage = responseText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const result = JSON.parse(responseText);
        console.log('✅ Upload successful, attachment:', result.attachment);
        
        return { success: true, fileName: file.name, attachment: result.attachment };
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        return { success: false, fileName: file.name, error };
      }
    });

    const loadingToast = toast.loading(`Uploading ${files.length} file(s)...`);

    try {
      const results = await Promise.all(uploadPromises);
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      toast.dismiss(loadingToast);

      if (successful > 0) {
        toast.success(`${successful} file(s) uploaded successfully`);
        await fetchTasks();
      }
      
      if (failed > 0) {
        toast.error(`${failed} file(s) failed to upload`);
      }

    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Error in file upload:', error);
      toast.error(error.message || 'Failed to upload files');
    } finally {
      e.target.value = '';
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

  const handleDeleteAttachment = async (taskId: string, attachmentId: string) => {
    try {
      const response = await fetch(`${API_URL}/assigntasks/${taskId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete attachment');
      }

      toast.success('Attachment deleted');
      await fetchTasks();
    } catch (error: any) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
    }
  };

  const handleCapturePhoto = (imageData: string) => {
    setCapturedImage(imageData);
  };

  const uploadCapturedPhoto = async () => {
    if (!capturedImage || !selectedAttachmentTask) {
      toast.error("No photo captured or task not selected");
      return;
    }

    const supervisorId = user?._id || user?.id;
    const supervisorName = user?.name;

    if (!supervisorId || !supervisorName) {
      toast.error('User information not found');
      return;
    }

    try {
      setUploadingPhoto(true);
      
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const file = new File([blob], `task-photo-${Date.now()}.jpg`, { 
        type: 'image/jpeg' 
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadedBy', supervisorId);
      formData.append('uploadedByName', supervisorName);

      console.log(`📎 Uploading captured photo for task: ${selectedAttachmentTask._id}`);

      const uploadResponse = await fetch(`${API_URL}/assigntasks/${selectedAttachmentTask._id}/attachments`, {
        method: 'POST',
        body: formData,
      });

      const responseText = await uploadResponse.text();
      console.log('📨 Upload response:', uploadResponse.status, responseText);

      if (!uploadResponse.ok) {
        let errorMessage = 'Failed to upload photo';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      toast.success('Photo uploaded successfully!');
      
      setShowCameraDialog(false);
      setCapturedImage(null);
      
      await fetchTasks();
      
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ==================== UTILITY FUNCTIONS ====================

  const handleMenuClick = () => {
    if (outletContext?.onMenuClick) {
      outletContext.onMenuClick();
    } else {
      setMobileMenuOpen(true);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const getSupervisorName = () => {
    return user?.name || 'Supervisor';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
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

  const getPersonalStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      case 'in-progress': return <Clock className="h-3 w-3" />;
      case 'pending': return <CircleDot className="h-3 w-3" />;
      case 'cancelled': return <XCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const isOverdue = (task: TaskWithPersonalStatus): boolean => {
    if (task.personalStatus === 'completed' || task.personalStatus === 'cancelled') return false;
    return new Date(task.dueDateTime) < new Date();
  };

  // ==================== RENDER ====================

  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardHeader 
          title="My Tasks" 
          subtitle="Tasks assigned to you"
          onMenuClick={handleMenuClick}
        />
        <MobileNavDrawer
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onNavigate={handleNavigate}
          userName={getSupervisorName()}
          userRole="Supervisor"
        />
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 md:p-8 text-center">
              <AlertCircle className="h-12 w-12 md:h-16 md:w-16 mx-auto text-yellow-500 mb-4" />
              <h2 className="text-lg md:text-xl font-bold mb-2">Authentication Required</h2>
              <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mb-4">
                Please log in to view your tasks.
              </p>
              <Button onClick={() => window.location.href = '/login'} className="w-full sm:w-auto">
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardHeader 
          title="My Tasks" 
          subtitle="Loading your assigned tasks..."
          onMenuClick={handleMenuClick}
        />
        <MobileNavDrawer
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onNavigate={handleNavigate}
          userName={getSupervisorName()}
          userRole="Supervisor"
        />
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary" />
            <p className="ml-3 text-sm md:text-base text-gray-500 dark:text-gray-400">Loading your tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader 
        title="My Assigned Tasks" 
        subtitle="Tasks assigned to you by Super Admin"
        onMenuClick={handleMenuClick}
      />

      <MobileNavDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onNavigate={handleNavigate}
        userName={getSupervisorName()}
        userRole="Supervisor"
      />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-blue-700">Total</p>
                  <p className="text-lg md:text-2xl font-bold text-blue-900">{stats.totalTasks}</p>
                </div>
                <FileText className="h-5 w-5 md:h-8 md:w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-green-700">Done</p>
                  <p className="text-lg md:text-2xl font-bold text-green-900">{stats.completedTasks}</p>
                </div>
                <CheckCircle className="h-5 w-5 md:h-8 md:w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-yellow-700">Progress</p>
                  <p className="text-lg md:text-2xl font-bold text-yellow-900">{stats.inProgressTasks}</p>
                </div>
                <Clock className="h-5 w-5 md:h-8 md:w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-purple-700">Pending</p>
                  <p className="text-lg md:text-2xl font-bold text-purple-900">{stats.pendingTasks}</p>
                </div>
                <CircleDot className="h-5 w-5 md:h-8 md:w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-red-50 border-red-200 col-span-2 md:col-span-1">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-red-700">Overdue</p>
                  <p className="text-lg md:text-2xl font-bold text-red-900">{stats.overdueTasks}</p>
                </div>
                <AlertCircle className="h-5 w-5 md:h-8 md:w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium">Tasks Assigned by Super Admin</h3>
                <p className="text-sm text-muted-foreground">
                  You have {tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you.
                  {tasks.length > 0 && ' Update your status as you make progress.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search your tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <Filter className="h-4 w-4" />
                Filters
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">My Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
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
                <div>
                  <label className="text-sm font-medium mb-1 block">Site</label>
                  <Select value={siteFilter} onValueChange={setSiteFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sites" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sites</SelectItem>
                      {uniqueSites.map(site => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Assigned Tasks
              <Badge variant="outline" className="ml-2">
                {filteredTasks.length} of {tasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No tasks found</p>
                <p className="text-sm">
                  {tasks.length === 0 
                    ? 'You have no tasks assigned to you yet'
                    : 'Try adjusting your search or filters'}
                </p>
                {tasks.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setPriorityFilter('all');
                      setSiteFilter('all');
                    }}
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mobile View - Cards */}
                {isMobileView ? (
                  <div className="space-y-3">
                    {filteredTasks.map((task) => {
                      const overdue = isOverdue(task);
                      
                      return (
                        <Card key={task._id} className={`overflow-hidden ${overdue ? 'border-red-200 bg-red-50/50' : ''}`}>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                                    {task.taskTitle}
                                    {overdue && (
                                      <Badge variant="destructive" className="text-xs">
                                        Overdue
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 line-clamp-2 mt-1">
                                    {task.description}
                                  </div>
                                </div>
                                <Badge variant={getPriorityColor(task.priority) as any} className="ml-2">
                                  {task.priority}
                                </Badge>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs">
                                  <Building className="h-3 w-3 text-gray-500" />
                                  <span className="font-medium">{task.siteName}</span>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-gray-600">{task.clientName}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs">
                                  <Calendar className="h-3 w-3 text-gray-500" />
                                  <span>Due: {formatDate(task.dueDateTime)}</span>
                                </div>

                                <div className="flex items-center gap-2 text-xs">
                                  <User className="h-3 w-3 text-gray-500" />
                                  <span>Created by: {task.createdByName}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <Badge className={getPersonalStatusColor(task.personalStatus)}>
                                    <span className="flex items-center gap-1">
                                      {getStatusIcon(task.personalStatus)}
                                      {task.personalStatus}
                                    </span>
                                  </Badge>
                                  
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2"
                                      onClick={() => {
                                        setSelectedTask(task);
                                        setShowUpdatesDialog(true);
                                      }}
                                    >
                                      <MessageSquare className="h-3 w-3 mr-1" />
                                      {task.hourlyUpdates?.length || 0}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2"
                                      onClick={() => {
                                        setSelectedTask(task);
                                        setSelectedAttachmentTask(task);
                                        setShowAttachmentsDialog(true);
                                      }}
                                    >
                                      <Paperclip className="h-3 w-3 mr-1" />
                                      {task.attachments?.length || 0}
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setShowViewDialog(true);
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                                
                                {task.personalStatus === 'pending' && (
                                  <Button 
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdatePersonalStatus(task._id, 'in-progress')}
                                    disabled={updatingStatus === task._id}
                                    className="text-blue-600 border-blue-200"
                                  >
                                    {updatingStatus === task._id ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <Clock className="h-3 w-3 mr-1" />
                                    )}
                                    Start
                                  </Button>
                                )}
                                
                                {task.personalStatus === 'in-progress' && (
                                  <Button 
                                    size="sm"
                                    onClick={() => handleUpdatePersonalStatus(task._id, 'completed')}
                                    disabled={updatingStatus === task._id}
                                    className="text-green-600 bg-green-50 border-green-200 hover:bg-green-100"
                                  >
                                    {updatingStatus === task._id ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                    )}
                                    Complete
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[250px]">Task Details</TableHead>
                          <TableHead>Site & Client</TableHead>
                          <TableHead>Created By</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>My Status</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Updates</TableHead>
                          <TableHead>Files</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTasks.map((task) => {
                          const overdue = isOverdue(task);
                          
                          return (
                            <TableRow key={task._id} className={overdue ? 'bg-red-50/50' : ''}>
                              <TableCell>
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {task.taskTitle}
                                    {overdue && (
                                      <Badge variant="destructive" className="text-xs">
                                        Overdue
                                      </Badge>
                                    )}
                                  </div>
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
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium">{task.createdByName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={getPersonalStatusColor(task.personalStatus)}>
                                  <span className="flex items-center gap-1">
                                    {getStatusIcon(task.personalStatus)}
                                    {task.personalStatus}
                                  </span>
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(task.dueDateTime)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex items-center gap-1"
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setShowUpdatesDialog(true);
                                  }}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  {task.hourlyUpdates?.length || 0}
                                </Button>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex items-center gap-1"
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setSelectedAttachmentTask(task);
                                    setShowAttachmentsDialog(true);
                                  }}
                                >
                                  <Paperclip className="h-4 w-4" />
                                  {task.attachments?.length || 0}
                                </Button>
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedTask(task);
                                      setShowViewDialog(true);
                                    }}
                                    title="View Details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  
                                  {task.personalStatus === 'pending' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUpdatePersonalStatus(task._id, 'in-progress')}
                                      disabled={updatingStatus === task._id}
                                      className="text-blue-600"
                                    >
                                      {updatingStatus === task._id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Clock className="h-3 w-3 mr-1" />
                                      )}
                                      Start
                                    </Button>
                                  )}
                                  
                                  {task.personalStatus === 'in-progress' && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdatePersonalStatus(task._id, 'completed')}
                                      disabled={updatingStatus === task._id}
                                      className="text-green-600"
                                    >
                                      {updatingStatus === task._id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                      )}
                                      Complete
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Task Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Task Details
            </DialogTitle>
            <DialogDescription>
              View complete details of the assigned task including site information, dates, and supervisor assignments.
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={getPriorityColor(selectedTask.priority)}>
                  {selectedTask.priority} Priority
                </Badge>
                <Badge className={getPersonalStatusColor(selectedTask.personalStatus)}>
                  My Status: {selectedTask.personalStatus}
                </Badge>
                <Badge variant="outline">{selectedTask.taskType}</Badge>
              </div>

              <div>
                <h3 className="font-semibold text-lg">{selectedTask.taskTitle}</h3>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {selectedTask.description}
                </p>
              </div>

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

              {selectedTask.assignedSupervisors && selectedTask.assignedSupervisors.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      All Supervisors in this Task ({selectedTask.assignedSupervisors.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedTask.assignedSupervisors.map((supervisor, idx) => {
                        const isMe = String(supervisor.userId) === String(user?._id || user?.id);
                        return (
                          <div key={idx} className={`flex items-center justify-between p-2 border rounded ${
                            isMe ? 'bg-blue-50 border-blue-200' : ''
                          }`}>
                            <div className="flex items-center gap-2">
                              <Briefcase className={`h-4 w-4 ${isMe ? 'text-blue-600' : 'text-gray-500'}`} />
                              <div>
                                <p className="font-medium flex items-center gap-2">
                                  {supervisor.name}
                                  {isMe && (
                                    <Badge variant="outline" className="text-xs bg-blue-100">
                                      You
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Status: {supervisor.status}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className={isMe ? 'bg-blue-100' : ''}>
                              {supervisor.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded-lg">
                <p>Created by: <span className="font-medium text-foreground">{selectedTask.createdByName}</span></p>
                <p>Created at: <span className="font-medium text-foreground">{formatDateTime(selectedTask.createdAt)}</span></p>
                {selectedTask.myAssignedAt && (
                  <p>Assigned to you: <span className="font-medium text-foreground">{formatDateTime(selectedTask.myAssignedAt)}</span></p>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowViewDialog(false)}
                >
                  Close
                </Button>
                {selectedTask.personalStatus === 'pending' && (
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => {
                      handleUpdatePersonalStatus(selectedTask._id, 'in-progress');
                      setShowViewDialog(false);
                    }}
                    disabled={updatingStatus === selectedTask._id}
                  >
                    {updatingStatus === selectedTask._id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Clock className="mr-2 h-4 w-4" />
                    )}
                    Start Task
                  </Button>
                )}
                {selectedTask.personalStatus === 'in-progress' && (
                  <Button
                    variant="default"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      handleUpdatePersonalStatus(selectedTask._id, 'completed');
                      setShowViewDialog(false);
                    }}
                    disabled={updatingStatus === selectedTask._id}
                  >
                    {updatingStatus === selectedTask._id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hourly Updates Dialog */}
      <Dialog open={showUpdatesDialog} onOpenChange={setShowUpdatesDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Hourly Updates
            </DialogTitle>
            <DialogDescription>
              View and add hourly updates for this task to track progress.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              <div className="space-y-3">
                {!selectedTask.hourlyUpdates || selectedTask.hourlyUpdates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hourly updates yet
                  </div>
                ) : (
                  selectedTask.hourlyUpdates.map((update, index) => (
                    <div key={update.id || index} className="border rounded-lg p-4">
                      <p className="text-sm">{update.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDateTime(update.timestamp)} - {update.submittedByName}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t pt-4">
                <Textarea
                  placeholder="Add a new hourly update..."
                  value={hourlyUpdateText}
                  onChange={(e) => setHourlyUpdateText(e.target.value)}
                  rows={3}
                  className="mb-3"
                />
                <Button onClick={() => handleAddHourlyUpdate(selectedTask._id)} className="w-full">
                  Add Hourly Update
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Camera Dialog */}
      <Dialog open={showCameraDialog} onOpenChange={(open) => {
        if (!open) {
          setCapturedImage(null);
        }
        setShowCameraDialog(open);
      }}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Camera className="h-5 w-5" />
              Take Photo for Task
            </DialogTitle>
            <DialogDescription>
              Capture a photo to attach to this task. Ensure good lighting for clear photos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-4 pb-4">
            {!capturedImage ? (
              <CameraComponent 
                onCapture={handleCapturePhoto}
                onClose={() => setShowCameraDialog(false)}
              />
            ) : (
              <>
                <div className="bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={capturedImage} 
                    alt="Captured" 
                    className="w-full h-80 object-contain"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    onClick={uploadCapturedPhoto}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setCapturedImage(null);
                    }}
                    disabled={uploadingPhoto}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Retake
                  </Button>
                </div>
              </>
            )}
          </div>
          
          <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-500">
            <span className="font-semibold">Tip:</span> Ensure good lighting and capture the task progress clearly.
          </div>
        </DialogContent>
      </Dialog>

      {/* Attachments Dialog */}
      <Dialog open={showAttachmentsDialog} onOpenChange={setShowAttachmentsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Attachments
            </DialogTitle>
            <DialogDescription>
              View, upload, or capture photos for this task.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAttachmentTask && (
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">
                  {(selectedAttachmentTask.attachments || []).length} file(s) attached
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setShowCameraDialog(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Take Photo
                  </Button>
                  <label>
                    <Button variant="outline" size="sm" asChild>
                      <div className="flex items-center gap-2 cursor-pointer">
                        <Upload className="h-4 w-4" />
                        Upload Files
                        <Input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, selectedAttachmentTask._id)}
                        />
                      </div>
                    </Button>
                  </label>
                </div>
              </div>
              
              <div className="space-y-3">
                {!selectedAttachmentTask.attachments || selectedAttachmentTask.attachments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Paperclip className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No attachments yet</p>
                    <p className="text-xs mt-1">Take a photo or upload files to see them here</p>
                  </div>
                ) : (
                  selectedAttachmentTask.attachments.map((attachment, index) => (
                    <div key={attachment.id || index} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {attachment.type?.startsWith('image/') ? (
                            <ImageIcon className="h-5 w-5 text-blue-500" />
                          ) : (
                            <Paperclip className="h-5 w-5 text-muted-foreground" />
                          )}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAttachment(selectedAttachmentTask._id, attachment.id)}
                            title="Delete"
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupervisorAssignTask;