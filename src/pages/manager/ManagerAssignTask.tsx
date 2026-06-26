// pages/manager/ManagerAssignTask.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  FileText, 
  Calendar, 
  Eye, 
  Loader2,
  Building,
  User,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Shield,
  AlertCircle,
  Paperclip,
  Download,
  Upload,
  MessageSquare,
  Trash2,
  Users,
  CircleDot,
  History,
  ChevronRight,
  Camera,
  Image as ImageIcon,
  RefreshCw,
  Menu  // Added Menu icon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { assignTaskService, type AssignTask } from '@/services/assignTaskService';
import { taskService } from '@/services/TaskService';
import { format } from 'date-fns';
import { useRole } from '@/context/RoleContext';
import ManagerAssignTaskPopup from './ManagerAssignTaskPopup';
import { useOutletContext } from 'react-router-dom'; // Added for outlet context
import { motion } from 'framer-motion'; // Added for animations

interface SiteStaffCounts {
  [siteId: string]: {
    managers: number;
    supervisors: number;
    totalManagers: number;
    totalSupervisors: number;
  };
}

// Extended interface to include personal assignment info
interface AssignTaskWithPersonal extends AssignTask {
  isCreatedByMe?: boolean;
  isAssignedToMe?: boolean;
  derivedStatus?: 'pending' | 'in-progress' | 'completed' | 'cancelled';
}

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');
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

const ManagerAssignTask: React.FC = () => {
  const { user } = useRole();
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>(); // Get onMenuClick from outlet context
  const [showPopup, setShowPopup] = useState(false);
  const [tasks, setTasks] = useState<AssignTaskWithPersonal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AssignTaskWithPersonal | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [hourlyUpdateText, setHourlyUpdateText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [showAssignPopup, setShowAssignPopup] = useState(false);
  
  // Camera states
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedAttachmentTask, setSelectedAttachmentTask] = useState<AssignTaskWithPersonal | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // State for site staff counts
  const [siteStaffCounts, setSiteStaffCounts] = useState<SiteStaffCounts>({});
  const [isLoadingStaffCounts, setIsLoadingStaffCounts] = useState(false);
  
  // State for site staff data (for view dialog)
  const [siteStaffData, setSiteStaffData] = useState<{ 
    managers: Array<{ userId: string; name: string; taskCount: number }>,
    supervisors: Array<{ userId: string; name: string; taskCount: number }>
  }>({ managers: [], supervisors: [] });
  
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  // Fetch tasks on mount - only tasks relevant to this manager
  useEffect(() => {
    if (user) {
      fetchManagerTasks();
    }
  }, [user]);

  // Fetch staff counts whenever tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      calculateSiteStaffCounts();
    }
  }, [tasks]);

  const fetchManagerTasks = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const managerId = user._id || user.id;
      
      // Fetch tasks created by this manager AND tasks where this manager is assigned
      const [createdTasks, assignedTasks] = await Promise.all([
        assignTaskService.getTasksByManager(managerId),
        assignTaskService.getTasksWithManager(managerId)
      ]);
      
      console.log('📊 Created tasks:', createdTasks.map(t => ({
        id: t._id,
        title: t.taskTitle,
        attachments: t.attachments?.length || 0,
        attachmentsData: t.attachments
      })));
      
      console.log('📊 Assigned tasks:', assignedTasks.map(t => ({
        id: t._id,
        title: t.taskTitle,
        attachments: t.attachments?.length || 0,
        attachmentsData: t.attachments
      })));
      
      // Combine and deduplicate tasks with personal flags
      const allTasksMap = new Map<string, AssignTaskWithPersonal>();
      
      [...createdTasks, ...assignedTasks].forEach(task => {
        // Ensure arrays exist
        if (!task.attachments) {
          task.attachments = [];
        }
        if (!task.hourlyUpdates) {
          task.hourlyUpdates = [];
        }
        
        // Calculate derived status based on supervisors
        const derivedStatus = calculateTaskStatusFromSupervisors(task);
        
        const taskWithPersonal: AssignTaskWithPersonal = {
          ...task,
          isCreatedByMe: task.createdBy === managerId,
          isAssignedToMe: task.assignedManagers?.some(m => m.userId === managerId) || false,
          derivedStatus: derivedStatus
        };
        allTasksMap.set(task._id, taskWithPersonal);
      });
      
      const allTasks = Array.from(allTasksMap.values());
      
      console.log('✅ Final tasks with attachments:', allTasks.map(t => ({
        id: t._id,
        title: t.taskTitle,
        attachmentsCount: t.attachments?.length || 0,
        attachments: t.attachments,
        derivedStatus: t.derivedStatus
      })));
      
      setTasks(allTasks);
      
    } catch (error) {
      console.error('Error fetching manager tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to calculate task status based on supervisor statuses
  const calculateTaskStatusFromSupervisors = (task: AssignTask): 'pending' | 'in-progress' | 'completed' | 'cancelled' => {
    if (!task.assignedSupervisors || task.assignedSupervisors.length === 0) {
      return task.status; // Fallback to task status if no supervisors
    }
    
    const supervisorStatuses = task.assignedSupervisors.map(s => s.status);
    
    // If any supervisor has 'in-progress', task is in-progress
    if (supervisorStatuses.includes('in-progress')) {
      return 'in-progress';
    }
    
    // If all supervisors have 'completed', task is completed
    if (supervisorStatuses.every(status => status === 'completed')) {
      return 'completed';
    }
    
    // If any supervisor has 'cancelled', task is cancelled
    if (supervisorStatuses.includes('cancelled')) {
      return 'cancelled';
    }
    
    // If all supervisors have 'pending', task is pending
    if (supervisorStatuses.every(status => status === 'pending')) {
      return 'pending';
    }
    
    // Default case - mix of pending and completed, show as in-progress
    return 'in-progress';
  };

  // Function to get supervisor status summary with counts
  const getSupervisorStatusSummary = (task: AssignTaskWithPersonal) => {
    if (!task.assignedSupervisors || task.assignedSupervisors.length === 0) {
      return { 
        status: task.status,
        counts: { pending: 0, inProgress: 0, completed: 0, cancelled: 0, total: 0 },
        message: 'No supervisors assigned'
      };
    }
    
    const counts = {
      pending: task.assignedSupervisors.filter(s => s.status === 'pending').length,
      inProgress: task.assignedSupervisors.filter(s => s.status === 'in-progress').length,
      completed: task.assignedSupervisors.filter(s => s.status === 'completed').length,
      cancelled: task.assignedSupervisors.filter(s => s.status === 'cancelled').length,
      total: task.assignedSupervisors.length
    };
    
    // Determine status message
    let message = '';
    if (counts.inProgress > 0) {
      message = `${counts.inProgress} supervisor(s) in progress`;
    } else if (counts.completed === counts.total) {
      message = 'All supervisors completed';
    } else if (counts.cancelled > 0) {
      message = `${counts.cancelled} supervisor(s) cancelled`;
    } else {
      message = `${counts.pending} supervisor(s) pending`;
    }
    
    return {
      status: task.derivedStatus || task.status,
      counts,
      message
    };
  };

  const calculateSiteStaffCounts = async () => {
    try {
      setIsLoadingStaffCounts(true);
      
      // Get all tasks to calculate staff counts
      const allTasks = await taskService.getAllTasks();
      
      const counts: SiteStaffCounts = {};
      
      allTasks.forEach(task => {
        if (!task.siteId) return;
        
        if (!counts[task.siteId]) {
          counts[task.siteId] = {
            managers: 0,
            supervisors: 0,
            totalManagers: 0,
            totalSupervisors: 0
          };
        }
        
        // Count unique managers and supervisors for this site
        const uniqueManagers = new Set();
        const uniqueSupervisors = new Set();
        
        task.assignedUsers?.forEach(user => {
          if (user.role === 'manager') {
            uniqueManagers.add(user.userId);
          } else if (user.role === 'supervisor') {
            uniqueSupervisors.add(user.userId);
          }
        });
        
        counts[task.siteId].managers = uniqueManagers.size;
        counts[task.siteId].supervisors = uniqueSupervisors.size;
        
        // Also get total counts including duplicates across tasks
        counts[task.siteId].totalManagers += task.assignedUsers?.filter(u => u.role === 'manager').length || 0;
        counts[task.siteId].totalSupervisors += task.assignedUsers?.filter(u => u.role === 'supervisor').length || 0;
      });
      
      setSiteStaffCounts(counts);
    } catch (error) {
      console.error('Error calculating site staff counts:', error);
    } finally {
      setIsLoadingStaffCounts(false);
    }
  };

  // Fetch site staff for view dialog
  const fetchSiteStaff = async (siteId: string) => {
    try {
      setIsLoadingStaff(true);
      const staffData = await taskService.getSiteStaffWithCounts(siteId);
      setSiteStaffData(staffData);
    } catch (error) {
      console.error('Error fetching site staff:', error);
      toast.error('Failed to load staff for this site');
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const handleViewTask = async (task: AssignTaskWithPersonal) => {
    try {
      // Fetch the latest task data to ensure attachments are up to date
      const updatedTask = await assignTaskService.getAssignTaskById(task._id);
      if (updatedTask) {
        const derivedStatus = calculateTaskStatusFromSupervisors(updatedTask);
        const taskWithPersonal: AssignTaskWithPersonal = {
          ...updatedTask,
          isCreatedByMe: updatedTask.createdBy === (user?._id || user?.id),
          isAssignedToMe: updatedTask.assignedManagers?.some(m => m.userId === (user?._id || user?.id)) || false,
          derivedStatus: derivedStatus
        };
        setSelectedTask(taskWithPersonal);
      } else {
        const derivedStatus = calculateTaskStatusFromSupervisors(task);
        setSelectedTask({
          ...task,
          derivedStatus: derivedStatus
        });
      }
      setShowViewDialog(true);
      await fetchSiteStaff(task.siteId);
      
      console.log('📋 Viewing task with attachments:', {
        taskId: task._id,
        attachments: selectedTask?.attachments
      });
    } catch (error) {
      console.error('Error fetching task details:', error);
      const derivedStatus = calculateTaskStatusFromSupervisors(task);
      setSelectedTask({
        ...task,
        derivedStatus: derivedStatus
      });
      setShowViewDialog(true);
      await fetchSiteStaff(task.siteId);
    }
  };

  const handleUpdatePersonalStatus = async (taskId: string, newStatus: string) => {
    try {
      const task = tasks.find(t => t._id === taskId);
      if (!task) return;
      
      const managerId = user?._id || user?.id;
      if (!managerId) {
        toast.error('Manager ID not found');
        return;
      }

      // Find the index of the current manager in the assignedManagers array
      const managerIndex = task.assignedManagers?.findIndex(manager => 
        manager.userId === managerId
      );

      if (managerIndex === -1 || managerIndex === undefined) {
        // Manager is not in assignedManagers, so we need to update the overall task status
        await assignTaskService.updateTaskStatus(taskId, newStatus);
        toast.success(`Task marked as ${newStatus}`);
      } else {
        // Update the manager's personal status in the assignedManagers array
        const updatedManagers = [...(task.assignedManagers || [])];
        updatedManagers[managerIndex] = {
          ...updatedManagers[managerIndex],
          status: newStatus as any,
          updatedAt: new Date().toISOString()
        };

        const response = await fetch(`${API_URL}/assigntasks/${taskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assignedManagers: updatedManagers
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update personal status');
        }
 // ✅ NEW: Dispatch event
    const task = tasks.find(t => t._id === taskId);
    if (task) {
      window.dispatchEvent(new CustomEvent('task-updated', {
        detail: {
          taskId: task._id,
          taskTitle: task.taskTitle,
          siteName: task.siteName,
          newStatus,
          updatedBy: user?.name || 'Manager',
          notificationType: 'task_status_update'
        }
      }));
      
      // If completed, also dispatch task-completed
      if (newStatus === 'completed') {
        window.dispatchEvent(new CustomEvent('task-completed', {
          detail: {
            taskId: task._id,
            taskTitle: task.taskTitle,
            siteName: task.siteName,
            completedBy: user?.name || 'Manager'
          }
        }));
      }
    }
        toast.success(`Your status updated to ${newStatus}`);
      }
      
      fetchManagerTasks(); // Refresh tasks
      
      // Update selected task if it's being viewed
      if (selectedTask && selectedTask._id === taskId) {
        const updatedTask = await assignTaskService.getAssignTaskById(taskId);
        if (updatedTask) {
          const derivedStatus = calculateTaskStatusFromSupervisors(updatedTask);
          setSelectedTask({
            ...updatedTask,
            isCreatedByMe: updatedTask.createdBy === (user?._id || user?.id),
            isAssignedToMe: updatedTask.assignedManagers?.some(m => m.userId === (user?._id || user?.id)) || false,
            derivedStatus: derivedStatus
          });
        }
      }
    } catch (error: any) {
      console.error('Error updating personal status:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleAddHourlyUpdate = async (taskId: string) => {
    if (!hourlyUpdateText.trim()) {
      toast.error('Please enter an update');
      return;
    }

    const managerId = user?._id || user?.id;
    const managerName = user?.name;

    if (!managerId || !managerName) {
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
          submittedBy: managerId,
          submittedByName: managerName
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add hourly update');
      }

      toast.success('Hourly update added');
      setHourlyUpdateText('');
      
      // Refresh the selected task if it's open
      if (selectedTask && selectedTask._id === taskId) {
        const updatedTask = await assignTaskService.getAssignTaskById(taskId);
        if (updatedTask) {
          const derivedStatus = calculateTaskStatusFromSupervisors(updatedTask);
          setSelectedTask({
            ...updatedTask,
            isCreatedByMe: updatedTask.createdBy === managerId,
            isAssignedToMe: updatedTask.assignedManagers?.some(m => m.userId === managerId) || false,
            derivedStatus: derivedStatus
          });
        }
      }
      
      fetchManagerTasks();
    } catch (error: any) {
      console.error('Error adding hourly update:', error);
      toast.error(error.message || 'Failed to add update');
    }
  };

  // Camera Functions
  const handleCapturePhoto = (imageData: string) => {
    setCapturedImage(imageData);
  };

  const uploadCapturedPhoto = async () => {
    if (!capturedImage || !selectedAttachmentTask) {
      toast.error("No photo captured or task not selected");
      return;
    }

    const managerId = user?._id || user?.id;
    const managerName = user?.name;

    if (!managerId || !managerName) {
      toast.error('User information not found');
      return;
    }

    try {
      setUploadingPhoto(true);
      
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Create a file from the blob
      const file = new File([blob], `task-photo-${Date.now()}.jpg`, { 
        type: 'image/jpeg' 
      });

      // Upload to server
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadedBy', managerId);
      formData.append('uploadedByName', managerName);

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
      
      // Close camera dialog
      setShowCameraDialog(false);
      setCapturedImage(null);
      
      // Refresh the selected task if it's open
      if (selectedTask && selectedTask._id === selectedAttachmentTask._id) {
        const updatedTask = await assignTaskService.getAssignTaskById(selectedAttachmentTask._id);
        if (updatedTask) {
          const derivedStatus = calculateTaskStatusFromSupervisors(updatedTask);
          setSelectedTask({
            ...updatedTask,
            isCreatedByMe: updatedTask.createdBy === managerId,
            isAssignedToMe: updatedTask.assignedManagers?.some(m => m.userId === managerId) || false,
            derivedStatus: derivedStatus
          });
        }
      }
      
      await fetchManagerTasks();
      
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, taskId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const managerId = user?._id || user?.id;
    const managerName = user?.name;

    if (!managerId || !managerName) {
      toast.error('User information not found');
      return;
    }
    
    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('uploadedBy', managerId);
        formData.append('uploadedByName', managerName);

        console.log(`📎 Uploading file to Cloudinary via backend: ${file.name}`);

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
        return { 
          success: true, 
          fileName: file.name, 
          attachment: result.attachment || result 
        };
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        return { success: false, fileName: file.name, error };
      }
    });

    const loadingToast = toast.loading(`Uploading ${files.length} file(s) to Cloudinary...`);

    try {
      const results = await Promise.all(uploadPromises);
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      toast.dismiss(loadingToast);

      if (successful > 0) {
        toast.success(`${successful} file(s) uploaded successfully to Cloudinary`);
        
        // Refresh the selected task if it's open
        if (selectedTask && selectedTask._id === taskId) {
          const updatedTask = await assignTaskService.getAssignTaskById(taskId);
          if (updatedTask) {
            console.log('📋 Updated task after upload:', {
              taskId: updatedTask._id,
              attachments: updatedTask.attachments
            });
            
            const derivedStatus = calculateTaskStatusFromSupervisors(updatedTask);
            setSelectedTask({
              ...updatedTask,
              isCreatedByMe: updatedTask.createdBy === managerId,
              isAssignedToMe: updatedTask.assignedManagers?.some(m => m.userId === managerId) || false,
              derivedStatus: derivedStatus
            });
          }
        }
        
        await fetchManagerTasks();
      }
      
      if (failed > 0) {
        toast.error(`${failed} file(s) failed to upload to Cloudinary`);
      }

      results.filter(r => !r.success).forEach(r => {
        console.error(`Failed to upload ${r.fileName}:`, r.error);
      });

    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Error in file upload:', error);
      toast.error(error.message || 'Failed to upload files to Cloudinary');
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
      
      // Refresh the selected task if it's open
      if (selectedTask && selectedTask._id === taskId) {
        const updatedTask = await assignTaskService.getAssignTaskById(taskId);
        if (updatedTask) {
          const derivedStatus = calculateTaskStatusFromSupervisors(updatedTask);
          setSelectedTask({
            ...updatedTask,
            isCreatedByMe: updatedTask.createdBy === (user?._id || user?.id),
            isAssignedToMe: updatedTask.assignedManagers?.some(m => m.userId === (user?._id || user?.id)) || false,
            derivedStatus: derivedStatus
          });
        }
      }
      
      fetchManagerTasks();
    } catch (error: any) {
      console.error('Error deleting attachment:', error);
      toast.error('Failed to delete attachment');
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
      case 'pending': return <CircleDot className="h-3 w-3" />;
      case 'cancelled': return <XCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const getManagerStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  // Get staff counts for a specific site
  const getStaffCountsForSite = (siteId: string) => {
    return siteStaffCounts[siteId] || { managers: 0, supervisors: 0, totalManagers: 0, totalSupervisors: 0 };
  };

  // Filter tasks based on search, filters, and tab
  const filteredTasks = tasks.filter(task => {
    // Use derived status for filtering if available, otherwise use task.status
    const displayStatus = task.derivedStatus || task.status;
    
    // Tab filter
    if (activeTab === 'pending' && displayStatus !== 'pending') return false;
    if (activeTab === 'in-progress' && displayStatus !== 'in-progress') return false;
    if (activeTab === 'completed' && displayStatus !== 'completed') return false;
    
    // Assignment filter
    if (assignmentFilter === 'created-by-me' && !task.isCreatedByMe) return false;
    if (assignmentFilter === 'assigned-to-me' && !task.isAssignedToMe) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        task.taskTitle.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.siteName.toLowerCase().includes(query) ||
        task.clientName.toLowerCase().includes(query) ||
        (task.createdByName && task.createdByName.toLowerCase().includes(query));
      
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && displayStatus !== statusFilter) {
      return false;
    }

    // Priority filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }

    return true;
  });

  // Get counts for tabs based on derived status
  const getTasksByDisplayStatus = (status: string) => {
    return tasks.filter(t => (t.derivedStatus || t.status) === status);
  };

  const pendingCount = getTasksByDisplayStatus('pending').length;
  const inProgressCount = getTasksByDisplayStatus('in-progress').length;
  const completedCount = getTasksByDisplayStatus('completed').length;
  const createdByMeCount = tasks.filter(t => t.isCreatedByMe).length;
  const assignedToMeCount = tasks.filter(t => t.isAssignedToMe).length;

  // Get recent updates (last 3)
  const getRecentUpdates = () => {
    if (!selectedTask?.hourlyUpdates) return [];
    return [...selectedTask.hourlyUpdates]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3);
  };

  // Get recent attachments (last 3)
  const getRecentAttachments = () => {
    if (!selectedTask?.attachments) return [];
    return [...selectedTask.attachments]
      .sort((a, b) => {
        const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 3);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gradient-to-b from-background to-background/80"
    >
      {/* Header with Hamburger Menu - Mobile Responsive */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-card border-b border-border px-4 md:px-6 py-4 sticky top-0 z-40"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu for Mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Manager Tasks</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                View and manage tasks assigned to you or created by you
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <Button 
              onClick={() => setShowAssignPopup(true)} 
              size="sm" 
              className="bg-primary text-xs sm:text-sm whitespace-nowrap"
            >
              <Plus className="mr-1 h-4 w-4" />
              <span className="hidden xs:inline">Assign Task</span>
              <span className="xs:hidden">Assign</span>
            </Button>
            <Badge variant="outline" className="hidden sm:flex px-3 py-1">
              <Shield className="h-4 w-4 mr-2" />
              Manager View
            </Badge>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-start gap-2 md:gap-3">
              <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-sm md:text-base">Tasks Overview</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Showing tasks where you are assigned as a manager and tasks you have created.
                  {tasks.length > 0 && (
                    <span className="ml-1 font-medium">
                      ({createdByMeCount} created, {assignedToMeCount} assigned to you)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks by title, site, or assigned by..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Assignment</label>
                  <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Tasks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tasks</SelectItem>
                      <SelectItem value="created-by-me">Created by me</SelectItem>
                      <SelectItem value="assigned-to-me">Assigned to me</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks Tabs and Table */}
        <Card>
          <CardHeader className="pb-0 px-4 md:px-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" className="text-xs sm:text-sm">
                  All
                  <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">{tasks.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs sm:text-sm">
                  Pending
                  {pendingCount > 0 && <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">{pendingCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="in-progress" className="text-xs sm:text-sm">
                  Progress
                  {inProgressCount > 0 && <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">{inProgressCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-xs sm:text-sm">
                  Done
                  {completedCount > 0 && <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">{completedCount}</Badge>}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No tasks found</p>
                <p className="text-sm">
                  {tasks.length === 0 
                    ? 'No tasks have been assigned to you yet'
                    : 'Try adjusting your search or filters'}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Task Details</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Sup Progress</TableHead>
                      <TableHead>Your Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Updates</TableHead>
                      <TableHead>Files</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => {
                      const staffCounts = getStaffCountsForSite(task.siteId);
                      const supervisorSummary = getSupervisorStatusSummary(task);
                      const displayStatus = task.derivedStatus || task.status;
                      
                      // Find current manager's status if they are assigned to this task
                      const myManagerInfo = task.isAssignedToMe 
                        ? task.assignedManagers?.find(m => m.userId === (user?._id || user?.id))
                        : null;
                      
                      return (
                        <TableRow key={task._id}>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">{task.taskTitle}</div>
                              <div className="text-xs text-muted-foreground line-clamp-2">
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
                            {task.isCreatedByMe ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs whitespace-nowrap">
                                Created by me
                              </Badge>
                            ) : task.isAssignedToMe ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs whitespace-nowrap">
                                Assigned to me
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Other
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isLoadingStaffCounts ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-xs">
                                  <User className="h-3 w-3 text-blue-600" />
                                  <span className="font-medium">{staffCounts.managers}</span>
                                  <span className="text-muted-foreground">Mgr</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs">
                                  <Briefcase className="h-3 w-3 text-emerald-600" />
                                  <span className="font-medium">{staffCounts.supervisors}</span>
                                  <span className="text-muted-foreground">Sup</span>
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {task.assignedSupervisors && task.assignedSupervisors.length > 0 ? (
                              <div className="space-y-1 min-w-[100px]">
                                <div className="flex items-center gap-1 text-xs">
                                  <div className="flex gap-1 flex-wrap">
                                    {supervisorSummary.counts.inProgress > 0 && (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                        {supervisorSummary.counts.inProgress} IP
                                      </Badge>
                                    )}
                                    {supervisorSummary.counts.completed > 0 && (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                        {supervisorSummary.counts.completed} Done
                                      </Badge>
                                    )}
                                    {supervisorSummary.counts.pending > 0 && (
                                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                                        {supervisorSummary.counts.pending} Pending
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {supervisorSummary.message}
                                </p>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-xs">
                                No supervisors
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {myManagerInfo ? (
                              getManagerStatusBadge(myManagerInfo.status)
                            ) : task.isCreatedByMe ? (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                Creator
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-xs">
                                Not assigned
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(displayStatus)}
                              <Badge variant={getStatusColor(displayStatus)} className="text-xs">
                                {displayStatus}
                              </Badge>
                            </div>
                            {task.isOverdue && displayStatus !== 'completed' && (
                              <Badge variant="destructive" className="mt-1 text-xs">
                                Overdue
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-xs">
                              <div>Start: {formatDate(task.startDate)}</div>
                              <div>Due: {formatDateTime(task.dueDateTime)}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-1"
                              onClick={() => {
                                setSelectedTask(task);
                                setShowHistoryDialog(true);
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
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewTask(task)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {task.isAssignedToMe && myManagerInfo && (
                                <>
                                  {myManagerInfo.status === 'pending' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleUpdatePersonalStatus(task._id, 'in-progress')}
                                      title="Start Task"
                                      className="text-blue-600 hover:text-blue-700"
                                    >
                                      <Clock className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {myManagerInfo.status === 'in-progress' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleUpdatePersonalStatus(task._id, 'completed')}
                                      title="Mark Complete"
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                </>
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

        {/* All dialogs remain the same */}
        {/* View Task Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Task Details
              </DialogTitle>
              <DialogDescription>
                View task details and recent activity
              </DialogDescription>
            </DialogHeader>

            {selectedTask && (
              <div className="space-y-6">
                {/* Status and Priority Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getPriorityColor(selectedTask.priority)}>
                    {selectedTask.priority} Priority
                  </Badge>
                  <Badge variant={getStatusColor(selectedTask.derivedStatus || selectedTask.status)}>
                    {selectedTask.derivedStatus || selectedTask.status}
                  </Badge>
                  {selectedTask.isOverdue && (selectedTask.derivedStatus || selectedTask.status) !== 'completed' && (
                    <Badge variant="destructive">Overdue</Badge>
                  )}
                  <Badge variant="outline">{selectedTask.taskType}</Badge>
                </div>

                {/* Task Information */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedTask.taskTitle}</h3>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {selectedTask.description}
                    </p>
                  </div>

                  {/* Assignment Info */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Assignment Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Assigned By</p>
                          <p className="font-medium">{selectedTask.createdByName || 'Superadmin'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Assigned At</p>
                          <p className="font-medium">{formatDateTime(selectedTask.createdAt)}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Your Role</p>
                          <Badge variant="outline" className="mt-1">
                            {selectedTask.isCreatedByMe 
                              ? 'You created this task' 
                              : selectedTask.isAssignedToMe
                              ? 'You are assigned as manager'
                              : 'You are viewing this task'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

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

                  {/* Dates */}
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

                  {/* Managers assigned to this task */}
                  {selectedTask.assignedManagers && selectedTask.assignedManagers.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Managers in this task ({selectedTask.assignedManagers.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {selectedTask.assignedManagers.map((manager, idx) => {
                            const isMe = manager.userId === (user?._id || user?.id);
                            return (
                              <div key={idx} className={`flex items-center justify-between p-2 border rounded ${
                                isMe ? 'bg-blue-100 border-blue-300' : 'bg-blue-50/50'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-blue-600" />
                                  <div>
                                    <p className="font-medium">
                                      {manager.name}
                                      {isMe && <span className="ml-2 text-xs text-blue-600">(You)</span>}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Assigned: {formatDateTime(manager.assignedAt)}
                                    </p>
                                  </div>
                                </div>
                                {getManagerStatusBadge(manager.status)}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Supervisor Progress Summary */}
                  {selectedTask.assignedSupervisors && selectedTask.assignedSupervisors.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Supervisor Progress ({selectedTask.assignedSupervisors.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {/* Status Summary Bars */}
                          <div className="space-y-2">
                            {(() => {
                              const counts = {
                                pending: selectedTask.assignedSupervisors!.filter(s => s.status === 'pending').length,
                                inProgress: selectedTask.assignedSupervisors!.filter(s => s.status === 'in-progress').length,
                                completed: selectedTask.assignedSupervisors!.filter(s => s.status === 'completed').length,
                                cancelled: selectedTask.assignedSupervisors!.filter(s => s.status === 'cancelled').length
                              };
                              
                              return (
                                <>
                                  {counts.inProgress > 0 && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs w-20">In Progress:</span>
                                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-blue-500 rounded-full" 
                                          style={{ width: `${(counts.inProgress / selectedTask.assignedSupervisors!.length) * 100}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-medium">{counts.inProgress}</span>
                                    </div>
                                  )}
                                  {counts.completed > 0 && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs w-20">Completed:</span>
                                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-green-500 rounded-full" 
                                          style={{ width: `${(counts.completed / selectedTask.assignedSupervisors!.length) * 100}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-medium">{counts.completed}</span>
                                    </div>
                                  )}
                                  {counts.pending > 0 && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs w-20">Pending:</span>
                                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-yellow-500 rounded-full" 
                                          style={{ width: `${(counts.pending / selectedTask.assignedSupervisors!.length) * 100}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-medium">{counts.pending}</span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          {/* Supervisor List */}
                          <div className="space-y-2 mt-3">
                            <p className="text-xs font-medium mb-2">Supervisor Status:</p>
                            {selectedTask.assignedSupervisors.map((supervisor, idx) => {
                              return (
                                <div key={idx} className="flex items-center justify-between p-2 border rounded bg-emerald-50/50">
                                  <div className="flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-emerald-600" />
                                    <div>
                                      <p className="font-medium">{supervisor.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Assigned: {formatDateTime(supervisor.assignedAt)}
                                      </p>
                                    </div>
                                  </div>
                                  {supervisor.status === 'completed' && (
                                    <Badge className="bg-green-100 text-green-800 border-green-200">
                                      Completed
                                    </Badge>
                                  )}
                                  {supervisor.status === 'in-progress' && (
                                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                      In Progress
                                    </Badge>
                                  )}
                                  {supervisor.status === 'pending' && (
                                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                      Pending
                                    </Badge>
                                  )}
                                  {supervisor.status === 'cancelled' && (
                                    <Badge className="bg-red-100 text-red-800 border-red-200">
                                      Cancelled
                                    </Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Staff Information */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Staff Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Loading state */}
                        {isLoadingStaff && (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span className="ml-2 text-sm">Loading staff...</span>
                          </div>
                        )}

                        {/* All staff at this site */}
                        {!isLoadingStaff && siteStaffData && (siteStaffData.managers.length > 0 || siteStaffData.supervisors.length > 0) && (
                          <div>
                            <p className="text-sm font-medium mb-3 flex items-center gap-2 text-muted-foreground">
                              <Building className="h-4 w-4" />
                              All Staff at {selectedTask.siteName}
                            </p>
                            
                            {/* All managers at site */}
                            {siteStaffData.managers.length > 0 && (
                              <div className="mb-4">
                                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  All Managers ({siteStaffData.managers.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {siteStaffData.managers.map(manager => {
                                    const isInThisTask = selectedTask.assignedManagers?.some(m => m.userId === manager.userId);
                                    return (
                                      <Badge 
                                        key={manager.userId} 
                                        variant="outline" 
                                        className={`flex items-center gap-1 py-1 px-2 ${
                                          isInThisTask 
                                            ? 'bg-blue-100 border-blue-300 text-blue-700' 
                                            : 'bg-gray-50'
                                        }`}
                                      >
                                        <User className={`h-3 w-3 ${isInThisTask ? 'text-blue-600' : 'text-gray-500'}`} />
                                        {manager.name}
                                        <span className="text-[10px] ml-1 bg-primary/10 px-1 rounded">
                                          {manager.taskCount} {manager.taskCount === 1 ? 'task' : 'tasks'}
                                        </span>
                                        {isInThisTask && (
                                          <span className="text-[10px] ml-1 text-blue-600">(in this task)</span>
                                        )}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {/* All supervisors at site */}
                            {siteStaffData.supervisors.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  All Supervisors ({siteStaffData.supervisors.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {siteStaffData.supervisors.map(supervisor => {
                                    const isInThisTask = selectedTask.assignedSupervisors?.some(s => s.userId === supervisor.userId);
                                    return (
                                      <Badge 
                                        key={supervisor.userId} 
                                        variant="outline" 
                                        className={`flex items-center gap-1 py-1 px-2 ${
                                          isInThisTask 
                                            ? 'bg-emerald-100 border-emerald-300 text-emerald-700' 
                                            : 'bg-gray-50'
                                        }`}
                                      >
                                        <Briefcase className={`h-3 w-3 ${isInThisTask ? 'text-emerald-600' : 'text-gray-500'}`} />
                                        {supervisor.name}
                                        <span className="text-[10px] ml-1 bg-primary/10 px-1 rounded">
                                          {supervisor.taskCount} {supervisor.taskCount === 1 ? 'task' : 'tasks'}
                                        </span>
                                        {isInThisTask && (
                                          <span className="text-[10px] ml-1 text-emerald-600">(in this task)</span>
                                        )}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* No staff at site */}
                        {!isLoadingStaff && siteStaffData.managers.length === 0 && siteStaffData.supervisors.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                            <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="text-lg font-medium">No staff found</p>
                            <p className="text-sm mt-1">No managers or supervisors are assigned to this site</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activity Section */}
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Recent Activity
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowViewDialog(false);
                          setShowHistoryDialog(true);
                        }}
                        className="flex items-center gap-2"
                      >
                        <History className="h-4 w-4" />
                        View Full History
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Recent Updates */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Recent Updates
                              <Badge variant="outline" className="ml-2">
                                {selectedTask.hourlyUpdates?.length || 0} total
                              </Badge>
                            </p>
                          </div>
                          <div className="space-y-2">
                            {getRecentUpdates().length > 0 ? (
                              getRecentUpdates().map((update, index) => (
                                <div key={update.id || index} className="border rounded-lg p-3">
                                  <p className="text-sm">{update.content}</p>
                                  <div className="flex items-center justify-between mt-2">
                                    <p className="text-xs text-muted-foreground">
                                      {formatDateTime(update.timestamp)} - {update.submittedByName}
                                    </p>
                                    <Badge variant="outline" className="text-xs">
                                      {update.submittedBy === (user?._id || user?.id) ? 'Manager' : 'Supervisor'}
                                    </Badge>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                No updates yet
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Recent Attachments */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium flex items-center gap-2">
                              <Paperclip className="h-4 w-4" />
                              Recent Attachments
                              <Badge variant="outline" className="ml-2">
                                {selectedTask.attachments?.length || 0} total
                              </Badge>
                            </p>
                          </div>
                          <div className="space-y-2">
                            {getRecentAttachments().length > 0 ? (
                              getRecentAttachments().map((attachment, index) => (
                                <div key={attachment.id || index} className="border rounded-lg p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1">
                                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium">{attachment.filename}</p>
                                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                          <span>Uploaded by: {attachment.uploadedBy || attachment.uploadedByName || 'Unknown'}</span>
                                          <span>•</span>
                                          <span>{attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : 'Unknown size'}</span>
                                          <span>•</span>
                                          <span>{attachment.uploadedAt ? formatDateTime(attachment.uploadedAt) : 'Date unknown'}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => window.open(attachment.url, '_blank')}
                                        title="View"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDownloadAttachment(attachment.url, attachment.filename)}
                                        title="Download"
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                No attachments yet
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Add Update Section */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Add Update
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Add a new update..."
                      value={hourlyUpdateText}
                      onChange={(e) => setHourlyUpdateText(e.target.value)}
                      rows={2}
                      className="mb-2"
                    />
                    <Button 
                      size="sm" 
                      onClick={() => {
                        handleAddHourlyUpdate(selectedTask._id);
                        setHourlyUpdateText('');
                      }}
                      className="w-full"
                    >
                      Add Update
                    </Button>
                  </CardContent>
                </Card>

                {/* Upload Files Section with Camera Option */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Files
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedAttachmentTask(selectedTask);
                          setShowCameraDialog(true);
                        }}
                        className="flex items-center gap-2 flex-1"
                      >
                        <Camera className="h-4 w-4" />
                        Take Photo
                      </Button>
                      <label className="flex-1">
                        <Button variant="outline" size="sm" asChild className="w-full">
                          <div className="flex items-center justify-center gap-2 cursor-pointer">
                            <Upload className="h-4 w-4" />
                            Upload Files
                            <Input
                              type="file"
                              multiple
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, selectedTask._id)}
                            />
                          </div>
                        </Button>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                {/* Status Update Buttons for current manager */}
                {selectedTask.isAssignedToMe && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Update Your Status</h4>
                    <div className="flex gap-2">
                      {(() => {
                        const myManagerInfo = selectedTask.assignedManagers?.find(
                          m => m.userId === (user?._id || user?.id)
                        );
                        
                        if (!myManagerInfo) return null;
                        
                        return (
                          <>
                            {myManagerInfo.status === 'pending' && (
                              <Button
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                onClick={() => handleUpdatePersonalStatus(selectedTask._id, 'in-progress')}
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                Start Task
                              </Button>
                            )}
                            
                            {myManagerInfo.status === 'in-progress' && (
                              <Button
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={() => handleUpdatePersonalStatus(selectedTask._id, 'completed')}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark Complete
                              </Button>
                            )}
                            
                            {myManagerInfo.status !== 'completed' && myManagerInfo.status !== 'cancelled' && (
                              <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={() => handleUpdatePersonalStatus(selectedTask._id, 'cancelled')}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel
                              </Button>
                            )}
                          </>
                        );
                      })()}
                      
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowViewDialog(false)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}

                {/* If manager is not assigned but created the task */}
                {selectedTask.isCreatedByMe && !selectedTask.isAssignedToMe && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Task Actions</h4>
                    <div className="flex gap-2">
                      {(selectedTask.derivedStatus || selectedTask.status) === 'pending' && (
                        <Button
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleUpdatePersonalStatus(selectedTask._id, 'in-progress')}
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          Start Progress
                        </Button>
                      )}
                      
                      {(selectedTask.derivedStatus || selectedTask.status) === 'in-progress' && (
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleUpdatePersonalStatus(selectedTask._id, 'completed')}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark Complete
                        </Button>
                      )}
                      
                      {(selectedTask.derivedStatus || selectedTask.status) !== 'completed' && (selectedTask.derivedStatus || selectedTask.status) !== 'cancelled' && (
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleUpdatePersonalStatus(selectedTask._id, 'cancelled')}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel Task
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowViewDialog(false)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <History className="h-5 w-5" />
                Task History - {selectedTask?.taskTitle}
              </DialogTitle>
              <DialogDescription>
                View all hourly updates and attachments
              </DialogDescription>
            </DialogHeader>

            {selectedTask && (
              <Tabs defaultValue="updates" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="updates" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Hourly Updates
                    <Badge variant="secondary" className="ml-2">
                      {selectedTask.hourlyUpdates?.length || 0}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments
                    <Badge variant="secondary" className="ml-2">
                      {selectedTask.attachments?.length || 0}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="updates" className="space-y-4 mt-4">
                  {!selectedTask.hourlyUpdates || selectedTask.hourlyUpdates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No hourly updates yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...selectedTask.hourlyUpdates]
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map((update, index) => (
                          <div key={update.id || index} className="border rounded-lg p-4">
                            <p className="text-sm">{update.content}</p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(update.timestamp)} - {update.submittedByName}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {update.submittedBy === (user?._id || user?.id) ? 'Manager' : 'Supervisor'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="attachments" className="space-y-4 mt-4">
                  {!selectedTask.attachments || selectedTask.attachments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Paperclip className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No attachments yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...selectedTask.attachments]
                        .sort((a, b) => {
                          const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
                          const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
                          return dateB - dateA;
                        })
                        .map((attachment, index) => (
                          <div key={attachment.id || index} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <Paperclip className="h-5 w-5 text-muted-foreground" />
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{attachment.filename}</div>
                                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    <span>Uploaded by: {attachment.uploadedBy || attachment.uploadedByName || 'Unknown'}</span>
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
                                  onClick={() => handleDeleteAttachment(selectedTask._id, attachment.id)}
                                  title="Delete"
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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

        {/* Attachments Dialog with Camera Option */}
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

        {/* Assign Task Popup */}
        <ManagerAssignTaskPopup
          open={showAssignPopup}
          onOpenChange={setShowAssignPopup}
          onTaskCreated={fetchManagerTasks}
        />
      </div>
    </motion.div>
  );
};

export default ManagerAssignTask;