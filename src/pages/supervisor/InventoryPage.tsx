import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload,
  Plus,
  Search,
  Package,
  UserCheck,
  AlertTriangle,
  Eye,
  Trash2,
  Download,
  Edit,
  History,
  Building,
  Shield,
  Wrench,
  Printer,
  Palette,
  ShoppingBag,
  Coffee,
  BarChart3,
  MapPin,
  RefreshCw,
  Cpu,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Database,
  UserCog,
  Camera,
  Loader2,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inventoryService, type FrontendInventoryItem } from '@/services/inventoryService';
import { machineService, type FrontendMachine, type MachineStats, type MaintenanceRecordDTO } from '@/services/machineService';
import { useRole } from '@/context/RoleContext';
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { useOutletContext } from "react-router-dom";
import { siteService, type Site } from '@/services/SiteService';
import taskService, { type Task } from '@/services/TaskService';

// Types
interface Department {
  value: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface InventoryStats {
  totalItems: number;
  lowStockItems: number;
  totalValue: number;
}

// Machine Update type with multiple images
interface MachineUpdate {
  id: string;
  machineId: string;
  machineName: string;
  modelNumber: string;
  site: string;
  description: string;
  status: 'operational' | 'maintenance' | 'out-of-service';
  photoUrls: string[];
  updatedBy: string;
  updatedAt: string;
}

type InventoryItem = FrontendInventoryItem;
type Machine = FrontendMachine;

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');
const apiClient = axios.create({ baseURL: API_URL });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sk_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
const machineStatusOptions = [
  { value: 'operational', label: 'Operational', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  { value: 'maintenance', label: 'Under Maintenance', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  { value: 'out-of-service', label: 'Out of Service', color: 'bg-red-100 text-red-800', icon: XCircle },
];

// Camera Component
const CameraComponent = ({ onCapture, onClose }: { onCapture: (imageData: string) => void; onClose: () => void }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const streamRef = React.useRef<MediaStream | null>(null);

  React.useEffect(() => {
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

  React.useEffect(() => {
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

// Machine View Dialog Component
const MachineViewDialog = ({ machine, open, onClose }: { machine: Machine | null; open: boolean; onClose: () => void }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const machineImages = machine?.photoUrls || [];

  if (!machine) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Cpu className="h-5 w-5" />
            Machine Details: {machine.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {machineImages.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Images</Label>
              <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
                <img 
                  src={machineImages[currentImageIndex]} 
                  alt={`${machine.name} - ${currentImageIndex + 1}`}
                  className="w-full h-80 object-contain bg-gray-50"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      const noImageDiv = document.createElement('div');
                      noImageDiv.className = 'flex items-center justify-center h-80 bg-gray-100';
                      noImageDiv.innerHTML = '<div class="text-center"><ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" /><p class="text-gray-500">No image available</p></div>';
                      parent.appendChild(noImageDiv);
                    }
                  }}
                />
                {machineImages.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                      onClick={() => setCurrentImageIndex(prev => prev === 0 ? machineImages.length - 1 : prev - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                      onClick={() => setCurrentImageIndex(prev => prev === machineImages.length - 1 ? 0 : prev + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              <div className="flex gap-2 justify-center">
                {machineImages.map((_, idx) => (
                  <button
                    key={idx}
                    className={`h-2 w-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-primary w-4' : 'bg-gray-300'}`}
                    onClick={() => setCurrentImageIndex(idx)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Machine Name</div>
              <div className="font-medium">{machine.name}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Model Number</div>
              <div className="font-medium">{machine.model || 'N/A'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Cost</div>
              <div className="font-medium">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(machine.cost)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Quantity</div>
              <div className="font-medium">{machine.quantity}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Purchase Date</div>
              <div className="font-medium">{new Date(machine.purchaseDate).toLocaleDateString()}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Status</div>
              <Badge className={machine.status === 'operational' ? 'bg-green-100 text-green-800' : machine.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                {machine.status}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Location/Site</div>
              <div className="font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {machine.location || 'Not assigned'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Department</div>
              <div className="font-medium">{machine.department || 'N/A'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Assigned To</div>
              <div className="font-medium flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                {machine.assignedTo || 'Not assigned'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Last Maintenance</div>
              <div className="font-medium">{machine.lastMaintenanceDate ? new Date(machine.lastMaintenanceDate).toLocaleDateString() : 'N/A'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Next Maintenance</div>
              <div className="font-medium">{machine.nextMaintenanceDate ? new Date(machine.nextMaintenanceDate).toLocaleDateString() : 'N/A'}</div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-gray-500">Description</div>
              <div className="text-sm">{machine.description || 'No description available'}</div>
            </div>
          </div>

          {machine.maintenanceHistory && machine.maintenanceHistory.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Maintenance History</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {machine.maintenanceHistory.map((record, idx) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <div className="font-medium">{record.type}</div>
                        <div className="text-sm text-gray-600">{record.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">{new Date(record.date).toLocaleDateString()}</div>
                        <div className="text-sm font-medium">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(record.cost)}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Performed by: {record.performedBy}</div>
                    {record.status && (
                      <Badge className="mt-1 text-xs" variant={record.status === 'pending' ? 'outline' : record.status === 'approved' ? 'default' : 'destructive'}>
                        {record.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Multiple Image Upload Component
const MultipleImageUpload = ({ 
  images, 
  onImagesChange, 
  onCaptureImage 
}: { 
  images: string[]; 
  onImagesChange: (images: string[]) => void; 
  onCaptureImage: () => void;
}) => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages: string[] = [];
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5MB`);
        continue;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    validFiles.forEach(file => {
      const previewUrl = URL.createObjectURL(file);
      newImages.push(previewUrl);
    });

    onImagesChange([...images, ...newImages]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-3">
      <Label>Upload Photos (Multiple)</Label>
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
        <div className="flex flex-wrap gap-2 justify-center mb-3">
          <Button variant="outline" onClick={onCaptureImage}>
            <Camera className="h-4 w-4 mr-2" />
            Take Photo
          </Button>
          <label>
            <Button variant="outline" asChild>
              <div className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </div>
            </Button>
            <Input 
              type="file" 
              accept="image/*" 
              multiple 
              className="hidden" 
              onChange={handleFileUpload} 
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          PNG, JPG up to 5MB each. You can select multiple files at once.
        </p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-3">
          {images.map((img, idx) => (
            <div key={idx} className="relative group">
              <img 
                src={img} 
                alt={`Preview ${idx + 1}`} 
                className="w-full h-24 object-cover rounded-lg border"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(idx)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const InventoryPage = () => {
  const outletContext = useOutletContext<{ onMenuClick?: () => void }>();
  const { user, role } = useRole();
  
  // State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineUpdates, setMachineUpdates] = useState<MachineUpdate[]>([]);
  const [assignedSites, setAssignedSites] = useState<Site[]>([]);
  const [allSites, setAllSites] = useState<Site[]>([]); // Added to store all sites
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [changeHistoryDialogOpen, setChangeHistoryDialogOpen] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    lowStockItems: 0,
    totalValue: 0,
  });
  
  // Machine states
  const [machineDialogOpen, setMachineDialogOpen] = useState(false);
  const [editMachine, setEditMachine] = useState<Machine | null>(null);
  const [viewMachine, setViewMachine] = useState<Machine | null>(null);
  const [viewMachineDialogOpen, setViewMachineDialogOpen] = useState(false);
  const [machineSearchQuery, setMachineSearchQuery] = useState("");
  const [machineStats, setMachineStats] = useState<MachineStats | null>(null);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [selectedMachineForMaintenance, setSelectedMachineForMaintenance] = useState<string | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  
  // Update states with multiple images
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedMachineForUpdate, setSelectedMachineForUpdate] = useState<Machine | null>(null);
  const [updateFormData, setUpdateFormData] = useState({
    site: '',
    description: '',
    status: 'operational' as 'operational' | 'maintenance' | 'out-of-service',
    photoFiles: [] as File[],
    photoPreviews: [] as string[],
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [fetchMachineLoading, setFetchMachineLoading] = useState(false);
  const [fetchMachineQuery, setFetchMachineQuery] = useState({ name: '', model: '' });
  
  // Camera states
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [tempImageForUpload, setTempImageForUpload] = useState<string | null>(null);
  
  // Track active tab
  const [activeTab, setActiveTab] = useState("inventory");
  
  const [usingLocalMachineStats, setUsingLocalMachineStats] = useState(false);
  const [backendConnected, setBackendConnected] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  
  // New item form state
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: "",
    sku: "",
    department: "cleaning",
    category: "",
    site: "1",
    assignedManager: "",
    quantity: 0,
    price: 0,
    costPrice: 0,
    supplier: "",
    reorderLevel: 10,
    description: "",
  });

  // New machine form state
  const [newMachine, setNewMachine] = useState<Partial<Machine>>({
    name: "",
    cost: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    quantity: 1,
    description: "",
    status: 'operational',
    location: "",
    model: "",
    department: "",
    assignedTo: "",
  });

  // Maintenance form state
  const [maintenanceRecord, setMaintenanceRecord] = useState<MaintenanceRecordDTO>({
    type: "Routine",
    description: "",
    cost: 0,
    performedBy: "",
  });

  const maintenanceTypes = [
    "Routine",
    "Preventive",
    "Corrective",
    "Emergency",
    "Scheduled",
    "Overhaul"
  ];

  const departments: Department[] = [
    { value: "cleaning", label: "Cleaning", icon: Shield },
    { value: "maintenance", label: "Maintenance", icon: Wrench },
    { value: "office", label: "Office Supplies", icon: Printer },
    { value: "paint", label: "Paint", icon: Palette },
    { value: "tools", label: "Tools", icon: ShoppingBag },
    { value: "canteen", label: "Canteen", icon: Coffee },
  ];

  // Remove hardcoded sites - will fetch from database
  const managers = ["John Doe", "Jane Smith", "Robert Johnson", "Sarah Wilson", "Michael Brown"];
  
  const categories = {
    cleaning: ["Tools", "Chemicals", "Equipment", "Supplies"],
    maintenance: ["Tools", "Safety", "Equipment", "Parts"],
    office: ["Furniture", "Stationery", "Electronics", "Supplies"],
    paint: ["Paints", "Brushes", "Rollers", "Accessories"],
    tools: ["Power Tools", "Hand Tools", "Safety Gear", "Consumables"],
    canteen: ["Food Items", "Beverages", "Utensils", "Cleaning"],
  };

  // Check if mobile view
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load machine updates from localStorage
  React.useEffect(() => {
    const storedUpdates = localStorage.getItem('machineUpdates');
    if (storedUpdates) {
      const updates = JSON.parse(storedUpdates);
      const migratedUpdates = updates.map((update: any) => ({
        ...update,
        photoUrls: update.photoUrls || (update.photoUrl ? [update.photoUrl] : [])
      }));
      setMachineUpdates(migratedUpdates);
      saveMachineUpdates(migratedUpdates);
    }
  }, []);

  // Fetch assigned sites for supervisor based on tasks
  React.useEffect(() => {
    if (role === 'supervisor' && user) {
      fetchAssignedSites();
    }
  }, [role, user]);

  // Fetch all sites for machine location dropdown
  React.useEffect(() => {
    fetchAllSites();
  }, []);

  const fetchAllSites = async () => {
    try {
      const sitesData = await siteService.getAllSites();
      setAllSites(sitesData || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const fetchAssignedSites = async () => {
    try {
      const supervisorId = user?._id || user?.id;
      
      if (!supervisorId) {
        console.warn('No supervisor ID found');
        setAssignedSites([]);
        return;
      }

      console.log(`👤 Fetching assigned sites for supervisor: ${supervisorId}`);

      const [allSites, allTasks] = await Promise.all([
        siteService.getAllSites(),
        taskService.getAllTasks()
      ]);

      const supervisorTasks = allTasks.filter(task => {
        const isAssignedInNewFormat = task.assignedUsers?.some(
          assignedUser => assignedUser.userId === supervisorId && assignedUser.role === 'supervisor'
        );
        const isAssignedInOldFormat = task.assignedTo === supervisorId;
        return isAssignedInNewFormat || isAssignedInOldFormat;
      });

      console.log(`✅ Found ${supervisorTasks.length} tasks assigned to supervisor`);

      const uniqueSiteIds = [...new Set(supervisorTasks.map(task => task.siteId).filter(Boolean))];
      const sitesWithTasks = allSites.filter(site => uniqueSiteIds.includes(site._id));
      
      setAssignedSites(sitesWithTasks);
      
    } catch (error) {
      console.error('Error fetching assigned sites:', error);
      setAssignedSites([]);
    }
  };

  const saveMachineUpdates = (updates: MachineUpdate[]) => {
    localStorage.setItem('machineUpdates', JSON.stringify(updates));
    setMachineUpdates(updates);
  };

  const calculateStats = (itemsList: InventoryItem[]): InventoryStats => {
    const totalItems = itemsList.length;
    const lowStockItems = itemsList.filter(item => item.quantity <= item.reorderLevel).length;
    const totalValue = itemsList.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
    return { totalItems, lowStockItems, totalValue };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateLocalMachineStats = () => {
    const totalMachines = machines.length;
    const totalMachineValue = machines.reduce((sum, machine) => sum + (machine.cost * machine.quantity), 0);
    const operationalMachines = machines.filter(m => m.status === 'operational').length;
    const maintenanceMachines = machines.filter(m => m.status === 'maintenance').length;
    const outOfServiceMachines = machines.filter(m => m.status === 'out-of-service').length;
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const today = new Date();
    
    const upcomingMaintenanceCount = machines.filter(machine => {
      if (!machine.nextMaintenanceDate) return false;
      try {
        const nextMaintenanceDate = new Date(machine.nextMaintenanceDate);
        return nextMaintenanceDate <= thirtyDaysFromNow && nextMaintenanceDate >= today;
      } catch {
        return false;
      }
    }).length;

    const machinesByDepartment = machines.reduce((acc, machine) => {
      const dept = machine.department || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const machinesByLocation = machines.reduce((acc, machine) => {
      const location = machine.location || 'Unassigned';
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalMachines,
      totalMachineValue,
      operationalMachines,
      maintenanceMachines,
      outOfServiceMachines,
      averageMachineCost: totalMachines > 0 ? totalMachineValue / totalMachines : 0,
      machinesByDepartment,
      machinesByLocation,
      upcomingMaintenanceCount
    };
  };
const getSupervisorSiteNames = useCallback(async (supervisorId: string): Promise<string[]> => {
  try {
    const res = await apiClient.get('/tasks', { params: { limit: 1000 } });
    let tasks = res.data?.data || res.data || [];
    if (!Array.isArray(tasks)) tasks = [];
    const siteSet = new Set<string>();
    tasks.forEach((task: any) => {
      const assigned = task.assignedUsers?.some((u: any) => u.userId === supervisorId);
      const assignedOld = task.assignedTo === supervisorId;
      if ((assigned || assignedOld) && task.siteName) {
        siteSet.add(task.siteName);
      }
    });
    return Array.from(siteSet);
  } catch (error) {
    console.error("Error fetching supervisor sites:", error);
    return [];
  }
}, []);
  const fetchData = async () => {
    try {
      setLoading(true);
      setUsingLocalMachineStats(false);
      setBackendConnected(true);
      
      let inventoryFilters = {};
      let machineFilters = {};
      
      if (role === 'supervisor' && user) {
        inventoryFilters = { assignedManager: user.name };
        machineFilters = { assignedTo: user.name };
      }
      
      const itemsData = await inventoryService.getItems(inventoryFilters);
let machinesData: FrontendMachine[] = [];

if (role === 'supervisor' && user) {
  // Get supervisor's site names from tasks
  const supervisorId = user._id || user.id;
  const siteNames = await getSupervisorSiteNames(supervisorId);
  if (siteNames.length === 0) {
    machinesData = [];
  } else {
    const allMachines = await machineService.getMachines();
    machinesData = allMachines.filter(m => 
      m.location && siteNames.some(site => site.toLowerCase() === m.location.toLowerCase())
    );
  }
} else {
  machinesData = await machineService.getMachines(machineFilters);
}

setItems(itemsData || []);
setMachines(machinesData || []);
    
      
      try {
        const statsData = await machineService.getMachineStats();
        setMachineStats(statsData);
        setUsingLocalMachineStats(false);
      } catch (statsError: any) {
        console.warn('Stats endpoint unavailable, using local calculation');
        setUsingLocalMachineStats(true);
        const localStats = calculateLocalMachineStats();
        setMachineStats(localStats);
      }
      
      setStats(calculateStats(itemsData || []));
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setBackendConnected(false);
      setItems([]);
      setMachines([]);
      setUsingLocalMachineStats(true);
      setMachineStats(calculateLocalMachineStats());
      setStats({ totalItems: 0, lowStockItems: 0, totalValue: 0 });
      toast.warning("Backend connection issue. Using local data.");
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      await fetchData();
      await fetchAllSites();
      if (role === 'supervisor') {
        await fetchAssignedSites();
      }
      toast.success("Data refreshed successfully!");
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getDepartmentIcon = (department: string) => {
    const dept = departments.find(d => d.value === department);
    return dept ? dept.icon : Package;
  };

  const getCategoriesForDepartment = (dept: string) => {
    return categories[dept as keyof typeof categories] || [];
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDepartment === "all" || item.department === selectedDepartment;
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesDept && matchesCategory;
  });

  const filteredMachines = machines.filter(machine => {
    const matchesSearch = 
      machine.name.toLowerCase().includes(machineSearchQuery.toLowerCase()) ||
      machine.model?.toLowerCase().includes(machineSearchQuery.toLowerCase()) ||
      machine.location?.toLowerCase().includes(machineSearchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleDeleteItem = async (itemId: string) => {
    try {
      await inventoryService.deleteItem(itemId);
      const updatedItems = items.filter(item => item.id !== itemId);
      setItems(updatedItems);
      setStats(calculateStats(updatedItems));
      toast.success("Item deleted successfully!");
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error("Failed to delete item");
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.sku) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const assignedManager = role === 'supervisor' && user ? user.name : (newItem.assignedManager || "John Doe");
      
      const itemData: Omit<InventoryItem, 'id' | '_id' | 'createdAt' | 'updatedAt'> = {
        sku: newItem.sku.toUpperCase(),
        name: newItem.name,
        department: newItem.department || "cleaning",
        category: newItem.category || "Tools",
        site: newItem.site || "1",
        assignedManager: assignedManager,
        quantity: newItem.quantity || 0,
        price: newItem.price || 0,
        costPrice: newItem.costPrice || 0,
        supplier: newItem.supplier || "",
        reorderLevel: newItem.reorderLevel || 10,
        description: newItem.description,
        changeHistory: [{
          date: new Date().toISOString().split('T')[0],
          change: "Created",
          user: role === 'supervisor' && user ? user.name : "Supervisor",
          quantity: newItem.quantity || 0
        }],
      };

      const createdItem = await inventoryService.createItem(itemData);
      const updatedItems = [...items, createdItem];
      setItems(updatedItems);
      setStats(calculateStats(updatedItems));
      setItemDialogOpen(false);
      resetNewItemForm();
      toast.success("Item added successfully!");
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error("Failed to add item");
    }
  };

  const handleEditItem = async () => {
    if (!editItem) return;

    try {
      const { id, createdAt, updatedAt, ...updateData } = editItem;
      const originalItem = items.find(item => item.id === editItem.id);
      if (originalItem && editItem.quantity !== originalItem.quantity) {
        updateData.changeHistory = [
          ...(editItem.changeHistory || []),
          {
            date: new Date().toISOString().split('T')[0],
            change: "Updated",
            user: role === 'supervisor' && user ? user.name : "Supervisor",
            quantity: editItem.quantity - originalItem.quantity
          }
        ];
      }

      const updatedItem = await inventoryService.updateItem(editItem.id, updateData);
      const updatedItems = items.map(item => item.id === updatedItem.id ? updatedItem : item);
      setItems(updatedItems);
      setStats(calculateStats(updatedItems));
      setEditItem(null);
      setItemDialogOpen(false);
      toast.success("Item updated successfully!");
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error("Failed to update item");
    }
  };

  const handleAddMachine = async () => {
    if (!newMachine.name || !newMachine.cost || !newMachine.purchaseDate) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const assignedTo = role === 'supervisor' && user ? user.name : newMachine.assignedTo;

      const machineData = {
        name: newMachine.name,
        cost: newMachine.cost || 0,
        purchaseDate: newMachine.purchaseDate,
        quantity: newMachine.quantity || 1,
        description: newMachine.description,
        status: newMachine.status || 'operational',
        location: newMachine.location, // This will store the site NAME, not city
        model: newMachine.model,
        department: newMachine.department,
        assignedTo: assignedTo,
        lastMaintenanceDate: newMachine.lastMaintenanceDate,
        nextMaintenanceDate: newMachine.nextMaintenanceDate,
      };

      if (editMachine) {
        const updatedMachine = await machineService.updateMachine(editMachine.id, machineData);
        const updatedMachines = machines.map(machine => machine.id === editMachine.id ? updatedMachine : machine);
        setMachines(updatedMachines);
        toast.success("Machine updated successfully!");
      } else {
        const createdMachine = await machineService.createMachine(machineData);
        setMachines([...machines, createdMachine]);
        toast.success("Machine added successfully!");
      }

      try {
        const statsData = await machineService.getMachineStats();
        setMachineStats(statsData);
        setUsingLocalMachineStats(false);
      } catch {
        setUsingLocalMachineStats(true);
        setMachineStats(calculateLocalMachineStats());
      }
      
      setMachineDialogOpen(false);
      resetNewMachineForm();
      setEditMachine(null);
    } catch (error) {
      console.error('Failed to save machine:', error);
      toast.error("Failed to save machine");
    }
  };

  const handleEditMachine = (machine: Machine) => {
    setEditMachine(machine);
    setNewMachine({
      name: machine.name,
      cost: machine.cost,
      purchaseDate: machine.purchaseDate,
      quantity: machine.quantity,
      description: machine.description,
      status: machine.status,
      location: machine.location,
      model: machine.model,
      department: machine.department,
      assignedTo: machine.assignedTo,
      lastMaintenanceDate: machine.lastMaintenanceDate,
      nextMaintenanceDate: machine.nextMaintenanceDate,
    });
    setMachineDialogOpen(true);
  };

  const handleViewMachine = async (machineId: string) => {
    try {
      console.log('Fetching machine details for ID:', machineId);
      const machine = await machineService.getMachineById(machineId);
      console.log('Machine details fetched:', machine);
      setViewMachine(machine);
      setViewMachineDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch machine details:', error);
      toast.error("Failed to fetch machine details");
    }
  };

  const handleDeleteMachine = async (machineId: string) => {
    try {
      await machineService.deleteMachine(machineId);
      const updatedMachines = machines.filter(machine => machine.id !== machineId);
      setMachines(updatedMachines);
      
      try {
        const statsData = await machineService.getMachineStats();
        setMachineStats(statsData);
        setUsingLocalMachineStats(false);
      } catch {
        setUsingLocalMachineStats(true);
        setMachineStats(calculateLocalMachineStats());
      }
      
      toast.success("Machine deleted successfully!");
    } catch (error) {
      console.error('Failed to delete machine:', error);
      toast.error("Failed to delete machine");
    }
  };

  const handleAddMaintenance = async () => {
    if (!selectedMachineForMaintenance || !maintenanceRecord.type || !maintenanceRecord.description || !maintenanceRecord.performedBy) {
      toast.error("Please fill in all maintenance record fields");
      return;
    }

    try {
      setMaintenanceLoading(true);
      const updatedMachine = await machineService.addMaintenanceRecord(
        selectedMachineForMaintenance,
        maintenanceRecord
      );
      
      const updatedMachines = machines.map(machine => 
        machine.id === selectedMachineForMaintenance ? updatedMachine : machine
      );
      setMachines(updatedMachines);
      
      setMaintenanceRecord({
        type: "Routine",
        description: "",
        cost: 0,
        performedBy: "",
      });
      setSelectedMachineForMaintenance(null);
      setMaintenanceDialogOpen(false);
      toast.success("Maintenance record added successfully!");
    } catch (error) {
      console.error('Failed to add maintenance record:', error);
      toast.error("Failed to add maintenance record");
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const handleFetchMachineForUpdate = async () => {
    if (!fetchMachineQuery.name && !fetchMachineQuery.model) {
      toast.error("Please enter machine name or model number");
      return;
    }

    setFetchMachineLoading(true);
    try {
      const allMachines = await machineService.getMachines();
      const foundMachine = allMachines.find(m => 
        m.name.toLowerCase().includes(fetchMachineQuery.name.toLowerCase()) ||
        m.model?.toLowerCase().includes(fetchMachineQuery.model.toLowerCase())
      );

      if (!foundMachine) {
        toast.error("No machine found with the given name or model");
        return;
      }

      setSelectedMachineForUpdate(foundMachine);
      setUpdateFormData({
        site: foundMachine.location || '',
        description: '',
        status: foundMachine.status,
        photoFiles: [],
        photoPreviews: [],
      });
      setUpdateDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch machine:', error);
      toast.error("Failed to fetch machine details");
    } finally {
      setFetchMachineLoading(false);
    }
  };

  const handleMultiplePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5MB`);
        continue;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    if (newFiles.length === 0) return;

    setUpdateFormData(prev => ({
      ...prev,
      photoFiles: [...prev.photoFiles, ...newFiles],
      photoPreviews: [...prev.photoPreviews, ...newPreviews],
    }));
  };

  const removePhoto = (index: number) => {
    setUpdateFormData(prev => ({
      ...prev,
      photoFiles: prev.photoFiles.filter((_, i) => i !== index),
      photoPreviews: prev.photoPreviews.filter((_, i) => i !== index),
    }));
  };

  const handleCapturePhoto = (imageData: string) => {
    setTempImageForUpload(imageData);
  };

  const addCapturedPhoto = () => {
    if (tempImageForUpload) {
      fetch(tempImageForUpload)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `captured-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setUpdateFormData(prev => ({
            ...prev,
            photoFiles: [...prev.photoFiles, file],
            photoPreviews: [...prev.photoPreviews, tempImageForUpload],
          }));
          setShowCameraDialog(false);
          setTempImageForUpload(null);
          toast.success("Photo added successfully!");
        });
    }
  };

  const uploadMultiplePhotos = async (files: File[], type: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const file of files) {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type);

      try {
        const response = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          const photoUrl = data.url || data.data?.url;
          if (photoUrl) {
            uploadedUrls.push(photoUrl);
          }
        }
      } catch (error) {
        console.error('Error uploading file:', file.name, error);
      }
    }
    
    return uploadedUrls;
  };

  const handleSubmitUpdate = async () => {
    if (!selectedMachineForUpdate) {
      toast.error("No machine selected");
      return;
    }

    if (!updateFormData.site) {
      toast.error("Please select a site");
      return;
    }

    setUpdateLoading(true);
    try {
      const uploadedUrls = await uploadMultiplePhotos(updateFormData.photoFiles, 'machine-update');

      const newUpdate: MachineUpdate = {
        id: Date.now().toString(),
        machineId: selectedMachineForUpdate.id,
        machineName: selectedMachineForUpdate.name,
        modelNumber: selectedMachineForUpdate.model || '',
        site: updateFormData.site,
        description: updateFormData.description,
        status: updateFormData.status,
        photoUrls: uploadedUrls,
        updatedBy: user?.name || 'Supervisor',
        updatedAt: new Date().toISOString(),
      };

      const updatedUpdates = [newUpdate, ...machineUpdates];
      saveMachineUpdates(updatedUpdates);

      if (selectedMachineForUpdate.location !== updateFormData.site) {
        await machineService.updateMachine(selectedMachineForUpdate.id, {
          ...selectedMachineForUpdate,
          location: updateFormData.site,
          status: updateFormData.status,
        });
        
        const updatedMachines = machines.map(m => 
          m.id === selectedMachineForUpdate.id 
            ? { ...m, location: updateFormData.site, status: updateFormData.status }
            : m
        );
        setMachines(updatedMachines);
      } else if (selectedMachineForUpdate.status !== updateFormData.status) {
        await machineService.updateMachine(selectedMachineForUpdate.id, {
          ...selectedMachineForUpdate,
          status: updateFormData.status,
        });
        
        const updatedMachines = machines.map(m => 
          m.id === selectedMachineForUpdate.id 
            ? { ...m, status: updateFormData.status }
            : m
        );
        setMachines(updatedMachines);
      }

      toast.success(`Machine update recorded successfully with ${uploadedUrls.length} photo(s)!`);
      setUpdateDialogOpen(false);
      setSelectedMachineForUpdate(null);
      setUpdateFormData({
        site: '',
        description: '',
        status: 'operational',
        photoFiles: [],
        photoPreviews: [],
      });
      setFetchMachineQuery({ name: '', model: '' });
      
      await fetchData();
    } catch (error) {
      console.error('Failed to submit update:', error);
      toast.error("Failed to submit update");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteUpdate = (updateId: string) => {
    const updatedUpdates = machineUpdates.filter(u => u.id !== updateId);
    saveMachineUpdates(updatedUpdates);
    toast.success("Update deleted successfully!");
  };

  const resetNewMachineForm = () => {
    setNewMachine({
      name: "",
      cost: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      quantity: 1,
      description: "",
      status: 'operational',
      location: "",
      model: "",
      department: "",
      assignedTo: "",
    });
  };

  const resetNewItemForm = () => {
    setNewItem({
      name: "",
      sku: "",
      department: "cleaning",
      category: "",
      site: "1",
      assignedManager: "",
      quantity: 0,
      price: 0,
      costPrice: 0,
      supplier: "",
      reorderLevel: 10,
      description: "",
    });
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditItem(item);
    setItemDialogOpen(true);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const dataLines = lines.slice(1);
      
      let importedCount = 0;
      let failedCount = 0;
      
      for (const line of dataLines) {
        if (!line.trim()) continue;
        const columns = line.split(',');
        if (columns.length < 10) {
          failedCount++;
          continue;
        }
        
        try {
          const assignedManager = role === 'supervisor' && user ? user.name : columns[5].trim();
          
          const itemData: Omit<InventoryItem, 'id' | '_id' | 'createdAt' | 'updatedAt'> = {
            sku: columns[0].trim().toUpperCase(),
            name: columns[1].trim(),
            department: columns[2].trim().toLowerCase(),
            category: columns[3].trim(),
            site: columns[4].trim(),
            assignedManager: assignedManager,
            quantity: parseInt(columns[6].trim()) || 0,
            price: parseFloat(columns[7].trim()) || 0,
            costPrice: parseFloat(columns[8].trim()) || 0,
            supplier: columns[9].trim(),
            reorderLevel: parseInt(columns[10]?.trim()) || 10,
            description: columns[11]?.trim() || "",
            changeHistory: [{
              date: new Date().toISOString().split('T')[0],
              change: "Created",
              user: role === 'supervisor' && user ? user.name : "Supervisor",
              quantity: parseInt(columns[6].trim()) || 0
            }]
          };
          
          await inventoryService.createItem(itemData);
          importedCount++;
        } catch (error) {
          failedCount++;
          console.error('Failed to import row:', line, error);
        }
      }
      
      toast.success(`Imported ${importedCount} items successfully!`);
      if (failedCount > 0) toast.error(`${failedCount} items failed to import`);
      setImportDialogOpen(false);
      await fetchData();
    } catch (error) {
      console.error('Failed to parse CSV:', error);
      toast.error("Failed to import items. Check CSV format.");
    }

  };

  const handleExport = () => {
    if (items.length === 0) {
      toast.error("No items to export");
      return;
    }

    const csvContent = [
      ["SKU", "Name", "Department", "Category", "Site", "Manager", "Quantity", "Price", "Supplier", "Reorder Level"],
      ...items.map(item => [
        item.sku,
        item.name,
        departments.find(d => d.value === item.department)?.label || item.department,
        item.category,
        item.site,
        item.assignedManager,
        item.quantity.toString(),
        item.price.toString(),
        item.supplier,
        item.reorderLevel.toString()
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Inventory exported successfully!");
  };

  const handleExportMachines = async () => {
    try {
      if (machines.length === 0) {
        toast.error("No machines to export");
        return;
      }

      const csvContent = [
        ["Name", "Cost", "Purchase Date", "Quantity", "Status", "Location/Site", "Model", "Department", "Assigned To"],
        ...machines.map(machine => [
          machine.name,
          machine.cost.toString(),
          new Date(machine.purchaseDate).toISOString().split('T')[0],
          machine.quantity.toString(),
          machine.status,
          machine.location || '',
          machine.model || '',
          machine.department || '',
          machine.assignedTo || ''
        ])
      ].map(row => row.join(",")).join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `machines-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Machines exported successfully!");
    } catch (error) {
      console.error('Failed to export machines:', error);
      toast.error("Failed to export machines");
    }
  };

  const calculateMachineAge = (purchaseDate: string) => {
    const purchase = new Date(purchaseDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - purchase.getTime());
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    return Math.floor(diffYears);
  };

  const machineStatsDisplay = machineStats || calculateLocalMachineStats();

  React.useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Inventory Management" subtitle="Loading your data..." onMenuClick={outletContext?.onMenuClick} />
        <div className="container mx-auto p-4 md:p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading data from backend...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Inventory Management" 
        subtitle="Manage and track your inventory, machinery, and site updates" 
        onMenuClick={outletContext?.onMenuClick}
      />
      
      <div className="container mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Inventory Management</h1>
            <p className="text-sm text-muted-foreground">Manage and track your inventory and machinery across all sites</p>
            
            {role === 'supervisor' && user && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <UserCog className="h-3 w-3 mr-1" />
                  Supervisor Dashboard
                </Badge>
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  <UserCheck className="h-3 w-3 mr-1" />
                  {user.name}
                </Badge>
                {assignedSites.length > 0 && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Building className="h-3 w-3 mr-1" />
                    {assignedSites.length} Site(s) Assigned
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 mr-2">
              <div className={`h-2 w-2 rounded-full ${backendConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {backendConnected ? 'Backend connected' : 'Backend offline'}
              </span>
            </div>
            
            <Button variant="outline" size={isMobileView ? "icon" : "default"} onClick={refreshData} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''} ${!isMobileView ? 'mr-2' : ''}`} />
              {!isMobileView && "Refresh"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItems}</div>
              <p className="text-xs text-muted-foreground">
                {role === 'supervisor' ? 'Your items only' : 'Across all departments'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.lowStockItems}</div>
              <p className="text-xs text-muted-foreground">Need reordering</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
              <p className="text-xs text-muted-foreground">Current inventory value</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="inventory" className="w-full" onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <TabsList className="w-full sm:w-auto grid grid-cols-3 h-auto">
              <TabsTrigger value="inventory" className="text-xs sm:text-sm py-2">
                <Package className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Inventory</span>
                <span className="xs:hidden">Inv</span> ({items.length})
              </TabsTrigger>
              <TabsTrigger value="machines" className="text-xs sm:text-sm py-2">
                <Cpu className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Machines</span>
                <span className="xs:hidden">Mach</span> ({machines.length})
              </TabsTrigger>
              <TabsTrigger value="updates" className="text-xs sm:text-sm py-2">
                <Building className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Updates</span>
                <span className="xs:hidden">Upd</span> ({machineUpdates.length})
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              {activeTab === "inventory" && (
                <Button onClick={() => { setEditItem(null); setItemDialogOpen(true); }} size={isMobileView ? "sm" : "default"}>
                  <Plus className="mr-2 h-4 w-4" />
                  {!isMobileView && "Add Item"}
                  {isMobileView && "Add"}
                </Button>
              )}
              
              {activeTab === "machines" && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {usingLocalMachineStats && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      <Database className="h-3 w-3 mr-1" />
                      Local
                    </Badge>
                  )}
                  {role !== 'supervisor' && !isMobileView && (
                    <Button variant="outline" onClick={handleExportMachines} disabled={machines.length === 0} size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  )}
                  <Button onClick={() => { setEditMachine(null); resetNewMachineForm(); setMachineDialogOpen(true); }} size={isMobileView ? "sm" : "default"}>
                    <Plus className="mr-2 h-4 w-4" />
                    {!isMobileView && "Add Machine"}
                    {isMobileView && "Add"}
                  </Button>
                </div>
              )}
              
              {activeTab === "updates" && (
                <Button onClick={() => { setSelectedMachineForUpdate(null); setUpdateFormData({ site: '', description: '', status: 'operational', photoFiles: [], photoPreviews: [] }); setFetchMachineQuery({ name: '', model: '' }); setUpdateDialogOpen(true); }} size={isMobileView ? "sm" : "default"}>
                  <Plus className="mr-2 h-4 w-4" />
                  {!isMobileView && "Add Update"}
                  {isMobileView && "Add"}
                </Button>
              )}
            </div>
          </div>

          {/* INVENTORY TAB */}
          <TabsContent value="inventory">
            <Card>
              <CardContent className="p-4 md:p-6">
                {/* Filters */}
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                  </div>
                  
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(dept => {
                        const Icon = dept.icon;
                        return (
                          <SelectItem key={dept.value} value={dept.value}>
                            <div className="flex items-center gap-2"><Icon className="h-4 w-4" />{dept.label}</div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={selectedDepartment === "all"}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {selectedDepartment !== "all" && getCategoriesForDepartment(selectedDepartment).map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Table */}
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Manager</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-lg font-medium">No items found</p>
                            <p className="text-muted-foreground">Try adjusting your search or filters</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredItems.map((item) => {
                          const DeptIcon = getDepartmentIcon(item.department);
                          const isLowStock = item.quantity <= item.reorderLevel;
                          
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{item.name}</span>
                                </div>
                                {item.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</p>}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                  <DeptIcon className="h-3 w-3" />
                                  {departments.find(d => d.value === item.department)?.label}
                                </Badge>
                                <div className="text-xs text-muted-foreground mt-1">{item.category}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <UserCheck className="h-3 w-3" />
                                  {item.assignedManager}
                                  {role === 'supervisor' && item.assignedManager === user?.name && <Badge variant="secondary" className="h-5 text-xs ml-1">You</Badge>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${isLowStock ? 'text-amber-600' : ''}`}>{item.quantity}</span>
                                  {isLowStock && <Badge variant="outline" className="text-xs border-amber-200 bg-amber-50 text-amber-700"><AlertTriangle className="h-3 w-3 mr-1" />Low</Badge>}
                                </div>
                                <div className="text-xs text-muted-foreground">Reorder: {item.reorderLevel}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{formatCurrency(item.price)}</div>
                                <div className="text-xs text-muted-foreground">Cost: {formatCurrency(item.costPrice)}</div>
                              </TableCell>
                              <TableCell>
                                {isLowStock ? <Badge variant="destructive" className="text-xs">Low Stock</Badge> : <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">In Stock</Badge>}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}><Edit className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => { setEditItem(item); setItemDialogOpen(true); }}><Eye className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => setChangeHistoryDialogOpen(item.id)}><History className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MACHINES TAB */}
          <TabsContent value="machines">
            <Card>
              <CardHeader>
                <CardTitle>Machine Management</CardTitle>
                <CardDescription>Add, manage, and track machinery equipment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search machines by name, model, location..." value={machineSearchQuery} onChange={(e) => setMachineSearchQuery(e.target.value)} className="pl-10" />
                  </div>
                  <Button variant="outline" onClick={() => setMaintenanceDialogOpen(true)} disabled={machines.length === 0} className="w-full sm:w-auto">
                    <Wrench className="mr-2 h-4 w-4" />
                    Add Maintenance
                  </Button>
                </div>

                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Machine Name</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Purchase Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Location/Site</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMachines.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <Cpu className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-lg font-medium">No machines found</p>
                            <p className="text-muted-foreground">Add your first machine to get started</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMachines.map((machine) => {
                          const statusOption = machineStatusOptions.find(s => s.value === machine.status);
                          const StatusIcon = statusOption?.icon || CheckCircle;
                          const machineAge = calculateMachineAge(machine.purchaseDate);
                          
                          return (
                            <TableRow key={machine.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Cpu className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{machine.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>{machine.model || 'N/A'}</TableCell>
                              <TableCell className="font-medium">{machine.quantity}</TableCell>
                              <TableCell>
                                <div className="font-medium">{formatCurrency(machine.cost)}</div>
                                <div className="text-xs text-muted-foreground">Total: {formatCurrency(machine.cost * machine.quantity)}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1"><Calendar className="h-3 w-3 text-muted-foreground" />{formatDate(machine.purchaseDate)}</div>
                                <div className="text-xs text-muted-foreground">Age: {machineAge} year{machineAge !== 1 ? 's' : ''}</div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`${statusOption?.color} border-0 flex items-center gap-1 w-fit`}>
                                  <StatusIcon className="h-3 w-3" />
                                  {statusOption?.label}
                                </Badge>
                                {machine.nextMaintenanceDate && <div className="text-xs text-muted-foreground mt-1">Next: {formatDate(machine.nextMaintenanceDate)}</div>}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  {machine.location || 'Not assigned'}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleViewMachine(machine.id)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleEditMachine(machine)}><Edit className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => { setSelectedMachineForMaintenance(machine.id); setMaintenanceDialogOpen(true); }}><Wrench className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteMachine(machine.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* UPDATES TAB */}
          <TabsContent value="updates">
            <Card>
              <CardHeader>
                <CardTitle>Site Updates</CardTitle>
                <CardDescription>
                  Track machine assignments and status updates across your assigned sites
                  {role === 'supervisor' && assignedSites.length > 0 && (
                    <span className="block text-sm text-muted-foreground mt-1">
                      You have access to {assignedSites.length} site(s): {assignedSites.map(s => s.name).join(', ')}
                    </span>
                  )}
                  {role === 'supervisor' && assignedSites.length === 0 && (
                    <span className="block text-sm text-amber-600 mt-1">
                      No sites assigned yet. Sites will appear here once you have tasks assigned to them.
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Machine Name</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Site</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Photos</TableHead>
                        <TableHead>Updated By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {machineUpdates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <Building className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-lg font-medium">No updates found</p>
                            <p className="text-muted-foreground">Click the "Add Update" button to record your first site update.</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        machineUpdates
                          .filter(update => {
                            if (role !== 'supervisor') return true;
                            const siteExists = assignedSites.some(site => site.name === update.site);
                            return siteExists;
                          })
                          .map((update) => {
                            const statusOption = machineStatusOptions.find(s => s.value === update.status);
                            const StatusIcon = statusOption?.icon || CheckCircle;
                            
                            return (
                              <TableRow key={update.id}>
                                <TableCell><div className="flex items-center gap-2"><Cpu className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{update.machineName}</span></div></TableCell>
                                <TableCell>{update.modelNumber || 'N/A'}</TableCell>
                                <TableCell><div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{update.site}</div></TableCell>
                                <TableCell><Badge className={`${statusOption?.color} border-0 flex items-center gap-1 w-fit`}><StatusIcon className="h-3 w-3" />{statusOption?.label}</Badge></TableCell>
                                <TableCell className="max-w-xs truncate">{update.description || '-'}</TableCell>
                                <TableCell>
                                  <div className="flex -space-x-2">
                                    {update.photoUrls && update.photoUrls.slice(0, 3).map((url, idx) => (
                                      <img 
                                        key={idx}
                                        src={url} 
                                        alt={`Photo ${idx + 1}`} 
                                        className="h-8 w-8 rounded-full object-cover border-2 border-white cursor-pointer"
                                        onClick={() => window.open(url, '_blank')}
                                      />
                                    ))}
                                    {update.photoUrls && update.photoUrls.length > 3 && (
                                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium border-2 border-white">
                                        +{update.photoUrls.length - 3}
                                      </div>
                                    )}
                                    {(!update.photoUrls || update.photoUrls.length === 0) && (
                                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell><div className="flex items-center gap-1"><UserCheck className="h-3 w-3" />{update.updatedBy}</div></TableCell>
                                <TableCell>{formatDate(update.updatedAt)}</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteUpdate(update.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Machine View Dialog */}
        <MachineViewDialog 
          machine={viewMachine} 
          open={viewMachineDialogOpen} 
          onClose={() => setViewMachineDialogOpen(false)} 
        />

        {/* ADD/EDIT ITEM DIALOG */}
        <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editItem ? 'Edit Item' : 'Add New Item'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Item Name *</Label><Input value={editItem ? editItem.name : newItem.name} onChange={(e) => editItem ? setEditItem({...editItem, name: e.target.value}) : setNewItem({...newItem, name: e.target.value})} placeholder="Enter item name" required /></div>
              <div className="space-y-2"><Label>SKU *</Label><Input value={editItem ? editItem.sku : newItem.sku} onChange={(e) => editItem ? setEditItem({...editItem, sku: e.target.value.toUpperCase()}) : setNewItem({...newItem, sku: e.target.value.toUpperCase()})} placeholder="Enter SKU (e.g., INV-001)" required /></div>
              <div className="space-y-2"><Label>Department *</Label><Select value={editItem ? editItem.department : newItem.department} onValueChange={(value) => editItem ? setEditItem({...editItem, department: value, category: ''}) : setNewItem({...newItem, department: value, category: ''})}><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{departments.map(dept => (<SelectItem key={dept.value} value={dept.value}><div className="flex items-center gap-2">{dept.label}</div></SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Category *</Label><Select value={editItem ? editItem.category : newItem.category} onValueChange={(value) => editItem ? setEditItem({...editItem, category: value}) : setNewItem({...newItem, category: value})} disabled={!editItem?.department && !newItem.department}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{(editItem ? getCategoriesForDepartment(editItem.department) : getCategoriesForDepartment(newItem.department || '')).map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Assigned Manager *</Label>{role === 'supervisor' && user ? (<div className="p-2 border rounded-md bg-gray-50"><div className="flex items-center gap-2"><UserCheck className="h-4 w-4" /><span>{user.name}</span><Badge variant="secondary" className="h-5 text-xs ml-1">You</Badge></div></div>) : (<Select value={editItem ? editItem.assignedManager : newItem.assignedManager} onValueChange={(value) => editItem ? setEditItem({...editItem, assignedManager: value}) : setNewItem({...newItem, assignedManager: value})}><SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger><SelectContent>{managers.map(manager => (<SelectItem key={manager} value={manager}>{manager}</SelectItem>))}</SelectContent></Select>)}</div>
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" min="0" value={editItem ? editItem.quantity : newItem.quantity} onChange={(e) => editItem ? setEditItem({...editItem, quantity: parseInt(e.target.value) || 0}) : setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})} placeholder="Enter quantity" required /></div>
              <div className="space-y-2"><Label>Reorder Level *</Label><Input type="number" min="0" value={editItem ? editItem.reorderLevel : newItem.reorderLevel} onChange={(e) => editItem ? setEditItem({...editItem, reorderLevel: parseInt(e.target.value) || 0}) : setNewItem({...newItem, reorderLevel: parseInt(e.target.value) || 0})} placeholder="Enter reorder level" required /></div>
              <div className="space-y-2"><Label>Price *</Label><Input type="number" step="0.01" min="0" value={editItem ? editItem.price : newItem.price} onChange={(e) => editItem ? setEditItem({...editItem, price: parseFloat(e.target.value) || 0}) : setNewItem({...newItem, price: parseFloat(e.target.value) || 0})} placeholder="Enter price" required /></div>
              <div className="space-y-2"><Label>Cost Price *</Label><Input type="number" step="0.01" min="0" value={editItem ? editItem.costPrice : newItem.costPrice} onChange={(e) => editItem ? setEditItem({...editItem, costPrice: parseFloat(e.target.value) || 0}) : setNewItem({...newItem, costPrice: parseFloat(e.target.value) || 0})} placeholder="Enter cost price" required /></div>
              <div className="space-y-2 col-span-1 md:col-span-2"><Label>Supplier *</Label><Input value={editItem ? editItem.supplier : newItem.supplier} onChange={(e) => editItem ? setEditItem({...editItem, supplier: e.target.value}) : setNewItem({...newItem, supplier: e.target.value})} placeholder="Enter supplier name" required /></div>
              <div className="space-y-2 col-span-1 md:col-span-2"><Label>Description</Label><Textarea value={editItem ? editItem.description : newItem.description} onChange={(e) => editItem ? setEditItem({...editItem, description: e.target.value}) : setNewItem({...newItem, description: e.target.value})} placeholder="Enter item description" rows={3} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => { setItemDialogOpen(false); setEditItem(null); resetNewItemForm(); }}>Cancel</Button><Button onClick={editItem ? handleEditItem : handleAddItem}>{editItem ? 'Update Item' : 'Add Item'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ADD/EDIT MACHINE DIALOG - Updated with Site Dropdown from Database */}
        <Dialog open={machineDialogOpen} onOpenChange={(open) => { setMachineDialogOpen(open); if (!open) { setEditMachine(null); resetNewMachineForm(); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editMachine ? 'Edit Machine' : 'Add New Machine'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Machine Name *</Label><Input value={newMachine.name} onChange={(e) => setNewMachine({...newMachine, name: e.target.value})} placeholder="Enter machine name" required /></div>
              <div className="space-y-2"><Label>Model Number</Label><Input value={newMachine.model} onChange={(e) => setNewMachine({...newMachine, model: e.target.value})} placeholder="Enter model number" /></div>
              <div className="space-y-2"><Label>Cost/Price *</Label><Input type="number" step="0.01" min="0" value={newMachine.cost} onChange={(e) => setNewMachine({...newMachine, cost: parseFloat(e.target.value) || 0})} placeholder="Enter cost" required /></div>
              <div className="space-y-2"><Label>Purchase Date *</Label><Input type="date" value={newMachine.purchaseDate} onChange={(e) => setNewMachine({...newMachine, purchaseDate: e.target.value})} required /></div>
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" min="1" value={newMachine.quantity} onChange={(e) => setNewMachine({...newMachine, quantity: parseInt(e.target.value) || 1})} placeholder="Enter quantity" required /></div>
              <div className="space-y-2"><Label>Status *</Label><Select value={newMachine.status} onValueChange={(value: 'operational' | 'maintenance' | 'out-of-service') => setNewMachine({...newMachine, status: value})}><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger><SelectContent>{machineStatusOptions.map(status => (<SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Department</Label><Input value={newMachine.department} onChange={(e) => setNewMachine({...newMachine, department: e.target.value})} placeholder="Enter department" /></div>
              {/* Location/Site dropdown - Now fetches from database */}
              <div className="space-y-2">
                <Label>Location/Site *</Label>
                <Select value={newMachine.location} onValueChange={(value) => setNewMachine({...newMachine, location: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSites.length > 0 ? (
                      allSites.map(site => (
                        <SelectItem key={site._id} value={site.name}>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            {site.name}
                            <span className="text-xs text-muted-foreground">({site.location})</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-sites" disabled>No sites available. Please add sites first.</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Select the site where this machine is located/working</p>
              </div>
              <div className="space-y-2"><Label>Assigned To</Label>{role === 'supervisor' && user ? (<div className="p-2 border rounded-md bg-gray-50"><div className="flex items-center gap-2"><UserCheck className="h-4 w-4" /><span>{user.name}</span><Badge variant="secondary" className="h-5 text-xs ml-1">You</Badge></div></div>) : (<Input value={newMachine.assignedTo} onChange={(e) => setNewMachine({...newMachine, assignedTo: e.target.value})} placeholder="Enter assigned person" />)}</div>
              <div className="space-y-2"><Label>Last Maintenance Date</Label><Input type="date" value={newMachine.lastMaintenanceDate} onChange={(e) => setNewMachine({...newMachine, lastMaintenanceDate: e.target.value})} /></div>
              <div className="space-y-2"><Label>Next Maintenance Date</Label><Input type="date" value={newMachine.nextMaintenanceDate} onChange={(e) => setNewMachine({...newMachine, nextMaintenanceDate: e.target.value})} /></div>
              <div className="space-y-2 col-span-1 md:col-span-2"><Label>Description</Label><Textarea value={newMachine.description} onChange={(e) => setNewMachine({...newMachine, description: e.target.value})} placeholder="Enter machine description" rows={3} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => { setMachineDialogOpen(false); setEditMachine(null); resetNewMachineForm(); }}>Cancel</Button><Button onClick={handleAddMachine}>{editMachine ? 'Update Machine' : 'Add Machine'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ADD/EDIT UPDATE DIALOG */}
        <Dialog open={updateDialogOpen} onOpenChange={(open) => { setUpdateDialogOpen(open); if (!open) { setSelectedMachineForUpdate(null); setUpdateFormData({ site: '', description: '', status: 'operational', photoFiles: [], photoPreviews: [] }); setFetchMachineQuery({ name: '', model: '' }); setTempImageForUpload(null); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{selectedMachineForUpdate ? 'Record Site Update' : 'Find Machine for Update'}</DialogTitle></DialogHeader>
            
            {!selectedMachineForUpdate ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Search by Machine Name or Model Number</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Enter machine name" value={fetchMachineQuery.name} onChange={(e) => setFetchMachineQuery({ ...fetchMachineQuery, name: e.target.value })} className="flex-1" />
                    <span className="text-muted-foreground self-center">or</span>
                    <Input placeholder="Enter model number" value={fetchMachineQuery.model} onChange={(e) => setFetchMachineQuery({ ...fetchMachineQuery, model: e.target.value })} className="flex-1" />
                  </div>
                </div>
                <Button onClick={handleFetchMachineForUpdate} disabled={fetchMachineLoading || (!fetchMachineQuery.name && !fetchMachineQuery.model)} className="w-full">
                  {fetchMachineLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Searching...</> : <><Search className="mr-2 h-4 w-4" />Find Machine</>}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-primary" />
                    <div><p className="font-semibold">{selectedMachineForUpdate.name}</p><p className="text-sm text-muted-foreground">Model: {selectedMachineForUpdate.model || 'N/A'}</p></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Select Site *</Label>
                  <Select value={updateFormData.site} onValueChange={(value) => setUpdateFormData({...updateFormData, site: value})}>
                    <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                    <SelectContent>
                      {role === 'supervisor' 
                        ? (assignedSites.length > 0 
                            ? assignedSites.map(site => (
                                <SelectItem key={site._id} value={site.name}>{site.name}</SelectItem>
                              ))
                            : <SelectItem value="no-sites" disabled>No sites assigned. Please contact admin.</SelectItem>
                          )
                        : allSites.map(site => (
                            <SelectItem key={site._id} value={site.name}>{site.name}</SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                  {role === 'supervisor' && assignedSites.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No sites are currently assigned to you. Sites will appear here once you have tasks assigned to them.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={updateFormData.status} onValueChange={(value: 'operational' | 'maintenance' | 'out-of-service') => setUpdateFormData({...updateFormData, status: value})}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {machineStatusOptions.map(status => (<SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea value={updateFormData.description} onChange={(e) => setUpdateFormData({...updateFormData, description: e.target.value})} placeholder="Enter any additional notes about the site update..." rows={3} />
                </div>

                <div className="space-y-3">
                  <Label>Upload Photos (Multiple)</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2 justify-center mb-3">
                      <Button variant="outline" onClick={() => setShowCameraDialog(true)}>
                        <Camera className="h-4 w-4 mr-2" />
                        Take Photo
                      </Button>
                      <label>
                        <Button variant="outline" asChild>
                          <div className="cursor-pointer">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Files
                          </div>
                        </Button>
                        <Input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          className="hidden" 
                          onChange={handleMultiplePhotoUpload} 
                        />
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      PNG, JPG up to 5MB each. You can select multiple files at once.
                    </p>
                  </div>

                  {updateFormData.photoPreviews.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-3">
                      {updateFormData.photoPreviews.map((preview, idx) => (
                        <div key={idx} className="relative group">
                          <img 
                            src={preview} 
                            alt={`Preview ${idx + 1}`} 
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removePhoto(idx)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => { setSelectedMachineForUpdate(null); setUpdateFormData({ site: '', description: '', status: 'operational', photoFiles: [], photoPreviews: [] }); }}>Back</Button>
                  <Button onClick={handleSubmitUpdate} disabled={updateLoading || (role === 'supervisor' && assignedSites.length === 0)}>
                    {updateLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : <><Building className="mr-2 h-4 w-4" />Submit Update</>}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Camera Dialog for Photo Capture */}
        <Dialog open={showCameraDialog} onOpenChange={(open) => { if (!open) { setTempImageForUpload(null); } setShowCameraDialog(open); }}>
          <DialogContent className="max-w-md p-0 overflow-hidden">
            <DialogHeader className="px-4 pt-4 pb-2">
              <DialogTitle className="flex items-center gap-2 text-lg"><Camera className="h-5 w-5" />Take Photo for Update</DialogTitle>
            </DialogHeader>
            <div className="px-4 pb-4">
              {!tempImageForUpload ? (
                <CameraComponent onCapture={handleCapturePhoto} onClose={() => setShowCameraDialog(false)} />
              ) : (
                <>
                  <div className="bg-gray-100 rounded-lg overflow-hidden">
                    <img src={tempImageForUpload} alt="Captured" className="w-full h-80 object-contain" />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={addCapturedPhoto} className="flex-1 bg-green-600 hover:bg-green-700">
                      <Upload className="h-4 w-4 mr-2" />
                      Add to Update
                    </Button>
                    <Button variant="outline" onClick={() => setTempImageForUpload(null)}>
                      <Camera className="h-4 w-4 mr-2" />
                      Retake
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Maintenance Dialog */}
        <Dialog open={maintenanceDialogOpen} onOpenChange={(open) => { setMaintenanceDialogOpen(open); if (!open) { setSelectedMachineForMaintenance(null); setMaintenanceRecord({ type: "Routine", description: "", cost: 0, performedBy: "" }); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Maintenance Record</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Select Machine *</Label><Select value={selectedMachineForMaintenance || ""} onValueChange={setSelectedMachineForMaintenance}><SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger><SelectContent>{machines.map(machine => (<SelectItem key={machine.id} value={machine.id}>{machine.name} {machine.model ? `(${machine.model})` : ''} - Site: {machine.location || 'Not assigned'}</SelectItem>))}</SelectContent></Select></div>
              {selectedMachineForMaintenance && (<><div className="space-y-2"><Label>Maintenance Type *</Label><Select value={maintenanceRecord.type} onValueChange={(value) => setMaintenanceRecord({...maintenanceRecord, type: value})}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>{maintenanceTypes.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Description *</Label><Textarea value={maintenanceRecord.description} onChange={(e) => setMaintenanceRecord({...maintenanceRecord, description: e.target.value})} placeholder="Describe the maintenance performed" rows={3} /></div>
              <div className="space-y-2"><Label>Cost</Label><Input type="number" step="0.01" min="0" value={maintenanceRecord.cost} onChange={(e) => setMaintenanceRecord({...maintenanceRecord, cost: parseFloat(e.target.value) || 0})} placeholder="Enter maintenance cost" /></div>
              <div className="space-y-2"><Label>Performed By *</Label><Input value={maintenanceRecord.performedBy} onChange={(e) => setMaintenanceRecord({...maintenanceRecord, performedBy: e.target.value})} placeholder="Enter technician name" /></div></>)}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setMaintenanceDialogOpen(false)}>Cancel</Button><Button onClick={handleAddMaintenance} disabled={!selectedMachineForMaintenance || maintenanceLoading}>{maintenanceLoading ? "Adding..." : "Add Maintenance"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change History Dialog */}
        <Dialog open={!!changeHistoryDialogOpen} onOpenChange={() => setChangeHistoryDialogOpen(null)}>
          <DialogContent><DialogHeader><DialogTitle>Change History</DialogTitle></DialogHeader>
            {changeHistoryDialogOpen && (() => { const item = items.find(item => item.id === changeHistoryDialogOpen); return item?.changeHistory && item.changeHistory.length > 0 ? item.changeHistory.map((change, index) => (<div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between text-sm p-2 bg-muted/50 rounded gap-1"><span>{change.date}</span><span>{change.change}</span><span>by {change.user}</span><span className={`font-medium ${change.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>{change.quantity > 0 ? '+' : ''}{change.quantity}</span></div>)) : <p className="text-sm text-muted-foreground text-center py-4">No change history available</p>; })()}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default InventoryPage;