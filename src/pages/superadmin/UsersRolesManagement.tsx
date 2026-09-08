"use client";
import { useSearchParams } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { DashboardSidebar } from "@/components/shared/DashboardSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Shield,
  Briefcase,
  Users,
  Mail,
  Phone,
  MapPin,
  UserCog,
  Filter,
  Calendar,
  ChevronDown,
  UserPlus,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  Sparkles,
  Eye,
  Coffee,
  LogIn,
  LogOut,
  Timer,
  Award,
  Crown,
  Building,
  AlertCircle,
  Loader2,
  UserCheck,
  UserX,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Percent,
  UserCircle,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Save,
  Info,
  Target,
  AlertTriangle,
  UserMinus,
  Menu,
  Globe,
  Home,
  ChevronDown as ChevronDownIcon,
  Camera,
  ExternalLink,
  Upload, X,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import userService from "@/services/userService";
import axios from "axios";
import type { User, UserRole, CreateUserData } from "@/types/user";

// API URL
const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

interface AttendanceStatus {
  isCheckedIn: boolean;
  isOnBreak: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  lastCheckInDate?: string | null;
}

interface SiteAssignment {
  siteId: string;
  siteName: string;
  clientName?: string;
  location?: string;
}

const formatDateForDisplay = (dateValue: any): string => {
  if (!dateValue) return 'N/A';
  try {
    if (typeof dateValue === 'string') {
      const dateMatch = dateValue.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) return dateMatch[1];
      return dateValue;
    }
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toISOString().split('T')[0];
  } catch (error) {
    return 'N/A';
  }
};

const formatDateForAPI = (dateValue: any): string => {
  if (!dateValue) return new Date().toISOString();
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return new Date().toISOString();
    return date.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
};

const formatTimeForDisplay = (timestamp: string | null): string => {
  if (!timestamp || timestamp === "-" || timestamp === "" || timestamp === "null") return "-";
  try {
    if (typeof timestamp === 'string' && (timestamp.includes('AM') || timestamp.includes('PM'))) {
      return timestamp;
    }
    if (timestamp.includes('T')) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }
    }
    const timeParts = timestamp.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0]);
      const minutes = timeParts[1];
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${period}`;
    }
    return timestamp;
  } catch (error) {
    return timestamp || "-";
  }
};

const formatDuration = (hours: number): string => {
  if (!hours || hours === 0) return "0m";
  const totalMinutes = Math.round(hours * 60);
  const hoursPart = Math.floor(totalMinutes / 60);
  const minutesPart = totalMinutes % 60;
  if (hoursPart > 0 && minutesPart > 0) {
    return `${hoursPart}h ${minutesPart}m`;
  } else if (hoursPart > 0) {
    return `${hoursPart}h`;
  } else {
    return `${minutesPart}m`;
  }
};

const getDayOfWeek = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ParticleBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950/20"></div>
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-300/10 dark:bg-purple-500/5 rounded-full blur-3xl"></div>
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-300/10 dark:bg-blue-500/5 rounded-full blur-3xl"></div>
  </div>
);

const CARD_GRADIENTS = {
  admin: {
    light: "bg-gradient-to-br from-white to-red-50/50 dark:from-gray-900 dark:to-red-950/20",
    border: "border-red-100 dark:border-red-900/30",
    icon: "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40"
  },
  manager: {
    light: "bg-gradient-to-br from-white to-emerald-50/50 dark:from-gray-900 dark:to-emerald-950/20",
    border: "border-emerald-100 dark:border-emerald-900/30",
    icon: "bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40"
  },
  supervisor: {
    light: "bg-gradient-to-br from-white to-amber-50/50 dark:from-gray-900 dark:to-amber-950/20",
    border: "border-amber-100 dark:border-amber-900/30",
    icon: "bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40"
  },
  employee: {
    light: "bg-gradient-to-br from-white to-indigo-50/50 dark:from-gray-900 dark:to-indigo-950/20",
    border: "border-indigo-100 dark:border-indigo-900/30",
    icon: "bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/40 dark:to-indigo-800/40"
  },
  stats: {
    total: {
      light: "bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/20",
      border: "border-blue-100 dark:border-blue-900/30",
      icon: "bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40"
    },
    active: {
      light: "bg-gradient-to-br from-white to-green-50/50 dark:from-gray-900 dark:to-green-950/20",
      border: "border-green-100 dark:border-green-900/30",
      icon: "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40"
    }
  }
};

const UserAvatar = ({ name, role, size = "md" }: { name: string; role: UserRole; size?: "sm" | "md" | "lg" }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base"
  };
  const gradients = {
    admin: "bg-gradient-to-br from-red-500 to-pink-600 dark:from-red-600 dark:to-pink-700",
    manager: "bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700",
    supervisor: "bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700",
    employee: "bg-gradient-to-br from-indigo-500 to-violet-600 dark:from-indigo-600 dark:to-violet-700"
  };
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`${sizeClasses[size]} ${gradients[role]} rounded-xl flex items-center justify-center text-white font-semibold shadow-lg relative overflow-hidden group`}
    >
      <div className="absolute inset-0 bg-white/10 dark:bg-white/5 group-hover:bg-white/20 dark:group-hover:bg-white/10 transition-colors"></div>
      <span className="relative z-10">{initials}</span>
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white bg-white dark:bg-gray-100"
      />
    </motion.div>
  );
};

interface FormUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  phone: string;
  status: 'active' | 'inactive';
  joinDate: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoFile?: File | null;
  assignedSites?: string[];
}

const departments = ['Housekeeping', 'Security', 'Parking', 'Waste Management', 'Others', 'Admin', 'Operations'];
const roles: UserRole[] = ['admin', 'manager', 'supervisor', 'employee'];

const UserForm = ({
  onSubmit,
  isEditing = false,
  user = null,
  presetRole = null
}: {
  onSubmit: (data: FormUserData) => void;
  isEditing?: boolean;
  user?: User | null;
  presetRole?: UserRole | null;
}) => {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [availableSites, setAvailableSites] = useState<{ _id: string; name: string }[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [formData, setFormData] = useState<FormUserData>({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: presetRole || user?.role || 'admin',
    department: user?.department || '',
    phone: user?.phone || '',
    status: user?.status || 'active',
    joinDate: user?.joinDate
      ? (typeof user.joinDate === 'string' ? user.joinDate.split('T')[0] : new Date(user.joinDate).toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0],
    assignedSites: user?.assignedSites || [],
  });

  const startCamera = async () => {
    if (streamRef.current) stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().then(resolve).catch(resolve);
            };
          }
        });
      }
      setShowCamera(true);
      setCapturedImage(null);
      toast.success("Camera started");
    } catch (error: any) {
      toast.error(error.name === 'NotAllowedError' ? "Camera permission denied" : "Cannot access camera");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageData);
        stopCamera();
        toast.success("Photo captured");
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const useCapturedPhoto = () => {
    if (capturedImage) {
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `user-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setPhotoFile(file);
          if (photoPreview) URL.revokeObjectURL(photoPreview);
          setPhotoPreview(URL.createObjectURL(file));
          setShowCamera(false);
          setCapturedImage(null);
          toast.success("Photo added");
        })
        .catch(() => toast.error("Error processing photo"));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      setPhotoFile(file);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(URL.createObjectURL(file));
      toast.success("Photo selected");
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (user && 'photo' in user && user.photo) {
      setPhotoPreview(user.photo as string);
    }
  }, [user]);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        setLoadingSites(true);
        const response = await axios.get(`${API_URL}/sites`);
        let sitesData = [];
        if (response.data?.success && Array.isArray(response.data.data)) {
          sitesData = response.data.data;
        } else if (Array.isArray(response.data)) {
          sitesData = response.data;
        } else if (Array.isArray(response.data?.sites)) {
          sitesData = response.data.sites;
        }
        setAvailableSites(sitesData);
      } catch (err) {
        console.error('Error fetching sites for user form:', err);
        setAvailableSites([]);
      } finally {
        setLoadingSites(false);
      }
    };
    fetchSites();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, photoFile });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-6 p-1"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
          <div className="relative">
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              required
              className="pl-10 h-11 rounded-lg"
            />
            <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@company.com"
                required
                className="pl-10 h-11 rounded-lg"
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password {!isEditing && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={isEditing ? "Leave blank to keep current" : "••••••••"}
              required={!isEditing}
              className="h-11 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!presetRole && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${role === 'admin' ? 'bg-red-500' :
                          role === 'manager' ? 'bg-emerald-500' :
                            role === 'supervisor' ? 'bg-amber-500' : 'bg-indigo-500'
                          }`} />
                        <span className="font-medium">{role.charAt(0).toUpperCase() + role.slice(1)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Department</Label>
            <Select
              value={formData.department}
              onValueChange={(value) => setFormData({ ...formData, department: value })}
            >
              <SelectTrigger className="h-11 rounded-lg">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {formData.role === 'supervisor' && (
            <div className="space-y-2 col-span-full">
              <Label className="text-sm font-medium">Assigned Sites</Label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {loadingSites ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading sites...
                  </div>
                ) : availableSites.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sites found. Add sites first.</p>
                ) : (
                  availableSites.map(site => (
                    <div key={site._id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`site-${site._id}`}
                        checked={formData.assignedSites?.includes(site.name) || false}
                        onChange={(e) => {
                          const current = formData.assignedSites || [];
                          const updated = e.target.checked
                            ? [...current, site.name]
                            : current.filter(s => s !== site.name);
                          setFormData({ ...formData, assignedSites: updated });
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`site-${site._id}`} className="text-sm font-normal cursor-pointer">
                        {site.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
              {formData.assignedSites && formData.assignedSites.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Selected: {formData.assignedSites.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Join Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={formData.joinDate}
                onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                required
                className="pl-10 h-11 rounded-lg"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                required
                className="pl-10 h-11 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Profile Photo (for Face Recognition)</Label>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={startCamera}>
              <Camera className="h-4 w-4 mr-2" /> Take Photo
            </Button>
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Upload Photo
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </div>
          {photoPreview && (
            <div className="flex items-center gap-2 mt-2">
              <img src={photoPreview} alt="Preview" className="w-12 h-12 rounded-full object-cover border" />
              <Button type="button" variant="ghost" size="sm" onClick={handleRemovePhoto}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Status</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={formData.status === 'active' ? "default" : "outline"}
              onClick={() => setFormData({ ...formData, status: 'active' })}
              className="flex gap-2"
            >
              <CheckCircle className="h-4 w-4" /> Active
            </Button>
            <Button
              type="button"
              variant={formData.status === 'inactive' ? "default" : "outline"}
              onClick={() => setFormData({ ...formData, status: 'inactive' })}
              className="flex gap-2"
            >
              <XCircle className="h-4 w-4" /> Inactive
            </Button>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <Button type="submit" className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-700">
          {isEditing ? "Update User" : "Create User"}
        </Button>
      </div>

      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Capture Photo</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCamera(false);
                  stopCamera();
                  setCapturedImage(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              {!capturedImage ? (
                <>
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute bottom-2 left-0 right-0 text-center">
                      <div className="inline-block bg-black bg-opacity-50 text-white text-sm px-2 py-1 rounded">
                        Camera is active
                      </div>
                    </div>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex gap-2 mt-4">
                    <Button onClick={capturePhoto} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <Camera className="h-4 w-4 mr-2" /> Capture Photo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCamera(false);
                        stopCamera();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-gray-100 rounded-lg overflow-hidden">
                    <img src={capturedImage} alt="Captured" className="w-full h-64 object-contain" />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={useCapturedPhoto} className="flex-1 bg-green-600 hover:bg-green-700">
                      <Check className="h-4 w-4 mr-2" /> Use This Photo
                    </Button>
                    <Button variant="outline" onClick={retakePhoto}>
                      <Camera className="h-4 w-4 mr-2" /> Retake
                    </Button>
                  </div>
                </>
              )}
            </div>
            <div className="p-4 bg-gray-50 border-t rounded-b-lg">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Tips:</span> Ensure good lighting and face the camera directly.
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.form>
  );
};

const UserList = ({
  title,
  icon: Icon,
  roleFilter,
  description,
  refreshTrigger,
  autoOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  roleFilter: UserRole[];
  description: string;
  refreshTrigger: number;
  autoOpen?: boolean;
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (autoOpen) {
      setDialogOpen(true);
    }
  }, [autoOpen]);

  const fetchAssignedSites = async (userId: string): Promise<SiteAssignment[]> => {
    try {
      return [];
    } catch (error) {
      console.error('Error fetching assigned sites:', error);
      return [];
    }
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUsers();
      const filteredUsers = data.allUsers.filter(user =>
        roleFilter.includes(user.role)
      );
      setUsers(filteredUsers);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshTrigger]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' ||
      (filter === 'active' && user.status === 'active') ||
      (filter === 'inactive' && user.status === 'inactive');
    return matchesSearch && matchesFilter;
  });

  const handleAddUser = async (formData: FormUserData) => {
    try {
      const [firstName, ...lastNameParts] = formData.name.split(' ');
      const lastName = lastNameParts.join(' ');
      const userData: CreateUserData = {
        username: formData.email.split('@')[0],
        email: formData.email,
        password: formData.password,
        role: formData.role as 'admin' | 'manager' | 'supervisor' | 'employee' | 'superadmin',
        firstName,
        lastName,
        department: formData.department,
        phone: formData.phone,
        joinDate: formatDateForAPI(formData.joinDate),
        site: formData.department || '',
        assignedSites: formData.assignedSites || [],
        siteName: formData.assignedSites?.[0] || '',
      };
      const newUser = await userService.createUser(userData);
      setUsers(prev => [...prev, newUser as User]);
      if (formData.photoFile && newUser._id) {
        try {
          const faceFormData = new FormData();
          faceFormData.append("photo", formData.photoFile);
          await axios.post(`${API_URL}/attendance/register-face/${newUser._id}`, faceFormData);
          toast.success(`Face registered for ${newUser.name}`);
        } catch (faceError) {
          console.error('Face registration failed:', faceError);
          toast.warning(`User created but face registration failed. They can register later.`);
        }
      }
      toast.success(`${title.slice(0, -1)} added successfully`, {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />
      });
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add user');
    }
  };

  const handleEditUser = async (formData: FormUserData, userId: string) => {
    try {
      const updateData = new FormData();
      updateData.append('name', formData.name);
      updateData.append('email', formData.email);
      updateData.append('role', formData.role);
      updateData.append('department', formData.department || '');
      updateData.append('phone', formData.phone || '');
      updateData.append('isActive', String(formData.status === 'active'));
      updateData.append('joinDate', formatDateForAPI(formData.joinDate));
      updateData.append('assignedSites', JSON.stringify(formData.assignedSites || []));
      updateData.append('siteName', formData.assignedSites?.[0] || '');
      if (formData.photoFile) {
        updateData.append('profilePhoto', formData.photoFile);
      }
      if (formData.password) {
        updateData.append('password', formData.password);
      }
      const updatedUser = await userService.updateUserWithPhoto(userId, updateData);
      if (formData.photoFile) {
        try {
          const faceFormData = new FormData();
          faceFormData.append("photo", formData.photoFile);
          await axios.post(`${API_URL}/attendance/register-face/${userId}`, faceFormData);
          toast.success(`Face updated for ${updatedUser.name}`);
        } catch (faceError) {
          console.error('Face update failed:', faceError);
          toast.warning('User updated but face registration failed.');
        }
      }
      setUsers(prev => prev.map(user =>
        user._id === userId ? { ...user, ...updatedUser, status: updatedUser.isActive ? 'active' : 'inactive' } : user
      ));
      toast.success(`${title.slice(0, -1)} updated successfully`, {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await userService.deleteUser(userId);
      setUsers(prev => prev.filter(user => user._id !== userId));
      toast.success(`${title.slice(0, -1)} deleted successfully`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const updatedUser = await userService.toggleUserStatus(userId);
      setUsers(prev => prev.map(user =>
        user._id === userId ? { ...user, ...updatedUser, status: updatedUser.isActive ? 'active' : 'inactive' } : user
      ));
      toast.success('Status updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const getRoleColor = (role: UserRole) => {
    const colors = {
      admin: "bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800",
      manager: "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
      supervisor: "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
      employee: "bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800",
      super_admin: "bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
    };
    return colors[role];
  };

  const getGradientStyle = () => {
    if (title.includes('Admin')) return CARD_GRADIENTS.admin;
    if (title.includes('Manager')) return CARD_GRADIENTS.manager;
    if (title.includes('Supervisor')) return CARD_GRADIENTS.supervisor;
    return CARD_GRADIENTS.employee;
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-[400px] flex items-center justify-center"
      >
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-muted rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <Icon className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
          </div>
          <p className="mt-4 text-muted-foreground font-medium">Loading {title.toLowerCase()}...</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Fetching your team members</p>
        </div>
      </motion.div>
    );
  }

  const gradientStyle = getGradientStyle();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 md:p-6 rounded-2xl border shadow-sm ${gradientStyle.light} ${gradientStyle.border}`}>
        <div className="flex items-center gap-3 md:gap-4">
          <div className={`p-2 md:p-3 rounded-xl ${gradientStyle.icon}`}>
            <Icon className={`h-5 w-5 md:h-6 md:w-6 ${title.includes('Admin') ? 'text-red-600 dark:text-red-400' :
              title.includes('Manager') ? 'text-emerald-600 dark:text-emerald-400' :
                title.includes('Supervisor') ? 'text-amber-600 dark:text-amber-400' :
                  'text-indigo-600 dark:text-indigo-400'
              }`} />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
              {title}
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-2 py-0.5 md:px-3 md:py-1 text-sm md:text-sm font-normal bg-white/50 dark:bg-black/30 backdrop-blur-sm text-foreground rounded-full"
              >
                {filteredUsers.length} members
              </motion.span>
            </h3>
            <p className="text-sm md:text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="h-9 md:h-11 px-4 md:px-6 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm md:text-base">
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </motion.div>
          </DialogTrigger>
          <DialogContent className="max-w-2xl border shadow-2xl rounded-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 md:p-6">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-bold text-white">Add New {title.slice(0, -1)}</DialogTitle>
                <p className="text-sm md:text-sm text-blue-100 mt-2">Invite a new team member to join your organization</p>
              </DialogHeader>
            </div>
            <div className="p-4 md:p-6">
              <UserForm onSubmit={handleAddUser} presetRole={title === "Administrators" ? "admin" : title === "Managers" ? "manager" : title === "Supervisors" ? "supervisor" : null} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${title.toLowerCase()} by name, email, or department...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 md:pl-11 h-10 md:h-12 rounded-xl text-sm"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-10 md:h-12 min-w-[120px] md:min-w-[140px] rounded-xl text-sm">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${gradientStyle.light} ${gradientStyle.border}`}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-white/50 dark:bg-black/20 backdrop-blur-sm">
              <TableRow className="hover:bg-transparent border-b border-gray-100 dark:border-gray-800">
                <TableHead className="py-3 md:py-4 text-sm md:text-sm font-semibold">Member</TableHead>
                <TableHead className="py-3 md:py-4 text-sm md:text-sm font-semibold hidden md:table-cell">Contact</TableHead>
                <TableHead className="py-3 md:py-4 text-sm md:text-sm font-semibold">Role</TableHead>
                <TableHead className="py-3 md:py-4 text-sm md:text-sm font-semibold hidden lg:table-cell">Department</TableHead>
                <TableHead className="py-3 md:py-4 text-sm md:text-sm font-semibold hidden xl:table-cell">Joined</TableHead>
                <TableHead className="py-3 md:py-4 text-sm md:text-sm font-semibold">Status</TableHead>
                <TableHead className="py-3 md:py-4 text-sm md:text-sm font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 md:py-12 text-center">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center"
                      >
                        <div className="p-3 md:p-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 mb-3 md:mb-4">
                          <Users className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-base md:text-lg font-medium text-foreground">No {title.toLowerCase()} found</h3>
                        <p className="text-sm md:text-sm text-muted-foreground mt-1">
                          {searchTerm ? 'Try adjusting your search' : `Get started by adding your first ${title.slice(0, -1).toLowerCase()}`}
                        </p>
                      </motion.div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className="group hover:bg-white/30 dark:hover:bg-black/20 border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <TableCell className="py-3 md:py-4">
                        <div className="flex items-center gap-2 md:gap-3">
                          <UserAvatar name={user.name} role={user.role} size="sm" />
                          <div className="min-w-0">
                            <div className="font-semibold text-sm md:text-base text-foreground truncate max-w-[120px] md:max-w-none">
                              {user.name}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1 md:hidden">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate max-w-[100px]">{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 md:py-4 hidden md:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate max-w-[150px]">{user.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span>{user.phone || 'N/A'}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 md:py-4">
                        <Badge className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg font-medium text-sm whitespace-nowrap ${getRoleColor(user.role)}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-3 md:py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground hidden xl:block" />
                          <span className="text-sm whitespace-nowrap">{user.department || 'N/A'}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 md:py-4 hidden xl:table-cell">
                        <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDateForDisplay(user.joinDate)}
                        </div>
                      </TableCell>

                      <TableCell className="py-3 md:py-4">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-full font-medium text-sm whitespace-nowrap ${user.status === 'active'
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                          : 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                          }`}>
                          {user.status === 'active' ? (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </motion.div>
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          <span className="capitalize hidden sm:inline">{user.status || 'inactive'}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 md:py-4">
                        <div className="flex justify-end gap-1 md:gap-2">
                          {/* ATTENDANCE BUTTONS REMOVED - Users & Roles no longer handles attendance */}

                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(user._id)}
                              className={`h-8 w-8 md:h-9 md:w-9 rounded-lg ${user.role === 'admin' ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' :
                                user.role === 'manager' ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' :
                                  user.role === 'supervisor' ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' :
                                    'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                }`}
                              title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                            >
                              {user.status === 'active' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </Button>
                          </motion.div>

                          <Dialog>
                            <DialogTrigger asChild>
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-8 w-8 md:h-9 md:w-9 rounded-lg ${user.role === 'admin' ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' :
                                    user.role === 'manager' ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' :
                                      user.role === 'supervisor' ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' :
                                        'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                    }`}
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </motion.div>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl border shadow-2xl rounded-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
                              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 md:p-6">
                                <DialogHeader>
                                  <DialogTitle className="text-xl md:text-2xl font-bold text-white">Edit {title.slice(0, -1)}</DialogTitle>
                                  <p className="text-sm md:text-sm text-blue-100 mt-2">Update user information</p>
                                </DialogHeader>
                              </div>
                              <div className="p-4 md:p-6">
                                <UserForm
                                  user={user}
                                  onSubmit={(data) => handleEditUser(data, user._id)}
                                  isEditing={true}
                                />
                              </div>
                            </DialogContent>
                          </Dialog>

                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user._id)}
                              className={`h-8 w-8 md:h-9 md:w-9 rounded-lg ${user.role === 'admin' ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' :
                                user.role === 'manager' ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' :
                                  user.role === 'supervisor' ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' :
                                    'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                }`}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </div>
    </motion.div>
  );
};

const UsersRolesManagement = () => {
  const [activeTab, setActiveTab] = useState("admins");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [autoOpenAdd, setAutoOpenAdd] = useState<"managers" | "supervisors" | "admins" | null>(null);

  useEffect(() => {
    const addParam = searchParams.get("add");
    const tabParam = searchParams.get("tab");
    if (addParam === "true") {
      if (tabParam === "managers") {
        setActiveTab("managers");
        setAutoOpenAdd("managers");
      } else if (tabParam === "supervisors") {
        setActiveTab("supervisors");
        setAutoOpenAdd("supervisors");
      } else if (tabParam === "admins") {
        setActiveTab("admins");
        setAutoOpenAdd("admins");
      }
      searchParams.delete("add");
      searchParams.delete("tab");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleMenuClick = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const handleMobileClose = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-50/30 dark:to-blue-950/10 relative overflow-hidden">
      <ParticleBackground />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <DashboardHeader
          title="Users & Roles Management"
          subtitle="Manage your team with precision and elegance"
          onMenuClick={handleMenuClick}
        />
      </motion.div>

      {mobileSidebarOpen && (
        <DashboardSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={handleMobileClose}
        />
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="px-3 sm:px-4 md:px-6 lg:px-8 max-w-screen-2xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <Card className="border shadow-xl rounded-2xl overflow-hidden bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
            <CardContent className="p-0">
              <Tabs defaultValue="admins" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-3 sm:px-4 md:px-6 pt-4 md:pt-6">
                  <TabsList className={`grid w-full ${isMobileView ? 'grid-cols-3' : 'grid-cols-3'} gap-1 md:gap-2 p-1 bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-gray-800 dark:to-gray-700/50 rounded-xl md:rounded-2xl`}>
                    <TabsTrigger
                      value="admins"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-white data-[state=active]:to-red-50/50 data-[state=active]:dark:from-gray-800 data-[state=active]:dark:to-red-950/20 data-[state=active]:shadow-lg rounded-lg md:rounded-xl py-2 md:py-3 transition-all text-sm md:text-sm"
                    >
                      <div className="flex items-center gap-1 md:gap-2">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gradient-to-r from-red-500 to-pink-600"></div>
                        <UserCog className="h-3 w-3 md:h-4 md:w-4" />
                        <span className="hidden sm:inline">Admins</span>
                        <span className="sm:hidden">Admin</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger
                      value="managers"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-white data-[state=active]:to-emerald-50/50 data-[state=active]:dark:from-gray-800 data-[state=active]:dark:to-emerald-950/20 data-[state=active]:shadow-lg rounded-lg md:rounded-xl py-2 md:py-3 transition-all text-sm md:text-sm"
                    >
                      <div className="flex items-center gap-1 md:gap-2">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"></div>
                        <Briefcase className="h-3 w-3 md:h-4 md:w-4" />
                        <span className="hidden sm:inline">Managers</span>
                        <span className="sm:hidden">Mgr</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger
                      value="supervisors"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-white data-[state=active]:to-amber-50/50 data-[state=active]:dark:from-gray-800 data-[state=active]:dark:to-amber-950/20 data-[state=active]:shadow-lg rounded-lg md:rounded-xl py-2 md:py-3 transition-all text-sm md:text-sm"
                    >
                      <div className="flex items-center gap-1 md:gap-2">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600"></div>
                        <Shield className="h-3 w-3 md:h-4 md:w-4" />
                        <span className="hidden sm:inline">Supervisors</span>
                        <span className="sm:hidden">Supv</span>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-3 sm:p-4 md:p-6">
                      <TabsContent value="admins" className="m-0">
                        <UserList
                          title="Administrators"
                          icon={UserCog}
                          roleFilter={['admin']}
                          description="Full system access and control"
                          refreshTrigger={refreshTrigger}
                          autoOpen={activeTab === 'admins' && autoOpenAdd === 'admins'}
                        />
                      </TabsContent>

                      <TabsContent value="managers" className="m-0">
                        <UserList
                          title="Managers"
                          icon={Briefcase}
                          roleFilter={['manager']}
                          description="Department leadership and oversight"
                          refreshTrigger={refreshTrigger}
                          autoOpen={activeTab === 'managers' && autoOpenAdd === 'managers'}
                        />
                      </TabsContent>

                      <TabsContent value="supervisors" className="m-0">
                        <UserList
                          title="Supervisors"
                          icon={Shield}
                          roleFilter={['supervisor']}
                          refreshTrigger={refreshTrigger}
                          autoOpen={activeTab === 'supervisors' && autoOpenAdd === 'supervisors'}
                        />
                      </TabsContent>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default UsersRolesManagement;