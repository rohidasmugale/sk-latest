import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import axios from "axios";
import { Camera, Upload, Trash2, X, UserPlus, Mail, Phone, Calendar, Briefcase, CheckCircle, XCircle, Search, Loader2, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
// Import the full employee onboarding
import { Employee } from "@/services/ShiftService";
import OnboardingTab from './../../pages/superadmin/OnboardingTab';
// ✅ No named import – we'll infer the props type
// Import site and client services
import { siteService, Client, CreateSiteRequest } from "@/services/SiteService";
import { crmService } from "@/services/crmService";

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

interface UnifiedCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  allowedTabs?: string[];
}

// ---------- EnhancedUserForm ----------
interface FormUserData {
  name: string;
  email: string;
  password: string;
  role: "admin" | "manager" | "supervisor";
  department: string;
  phone: string;
  status: "active" | "inactive";
  joinDate: string;
  photoFile?: File | null;
}

const EnhancedUserForm = ({
  onSubmit,
  isEditing = false,
  presetRole,
}: {
  onSubmit: (data: FormUserData) => void;
  isEditing?: boolean;
  presetRole?: "admin" | "manager" | "supervisor";
}) => {
  const [formData, setFormData] = useState<FormUserData>({
    name: "",
    email: "",
    password: "",
    role: presetRole || "admin",
    department: "",
    phone: "",
    status: "active",
    joinDate: new Date().toISOString().split("T")[0],
  });
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    if (streamRef.current) stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
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
    } catch (error) {
      const err = error as Error;
      toast.error(err.name === "NotAllowedError" ? "Camera permission denied" : "Cannot access camera");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL("image/jpeg", 0.9);
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
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], `user-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
          setPhotoFile(file);
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
      if (!file.type.startsWith("image/")) return toast.error("Please select an image");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, photoFile });
  };

  return (
    <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="space-y-6 p-1">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Full Name *</Label>
          <div className="relative">
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="pl-10 h-11 rounded-lg"
            />
            <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Email *</Label>
            <div className="relative">
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="pl-10 h-11 rounded-lg"
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Password {!isEditing && "*"}</Label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!isEditing}
              className="h-11 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!presetRole && (
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(v: "admin" | "manager" | "supervisor") => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Department</Label>
            <Select
              value={formData.department}
              onValueChange={(v) => setFormData({ ...formData, department: v })}
            >
              <SelectTrigger className="h-11 rounded-lg">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {["IT", "HR", "Finance", "Operations", "Marketing", "Sales", "Admin", "Engineering", "Support"].map(
                  (dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Join Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={formData.joinDate}
                onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                className="pl-10 h-11 rounded-lg"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="pl-10 h-11 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Photo Upload Section */}
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

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-semibold">Capture Photo</h3>
                <Button variant="ghost" size="sm" onClick={() => { setShowCamera(false); stopCamera(); setCapturedImage(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4">
                {!capturedImage ? (
                  <>
                    <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-64 object-cover" />
                      <div className="absolute bottom-2 left-0 right-0 text-center">
                        <span className="inline-block bg-black/50 text-white text-xs px-2 py-1 rounded">Camera active</span>
                      </div>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex gap-2 mt-4">
                      <Button onClick={capturePhoto} className="flex-1 bg-blue-600">Capture</Button>
                      <Button variant="outline" onClick={() => { setShowCamera(false); stopCamera(); }}>Cancel</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <img src={capturedImage} alt="Captured" className="w-full h-64 object-contain bg-gray-100 rounded" />
                    <div className="flex gap-2 mt-4">
                      <Button onClick={useCapturedPhoto} className="flex-1 bg-green-600">Use Photo</Button>
                      <Button variant="outline" onClick={retakePhoto}>Retake</Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Status</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={formData.status === "active" ? "default" : "outline"}
              onClick={() => setFormData({ ...formData, status: "active" })}
              className="flex gap-2"
            >
              <CheckCircle className="h-4 w-4" /> Active
            </Button>
            <Button
              type="button"
              variant={formData.status === "inactive" ? "default" : "outline"}
              onClick={() => setFormData({ ...formData, status: "inactive" })}
              className="flex gap-2"
            >
              <XCircle className="h-4 w-4" /> Inactive
            </Button>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-700">
        {isEditing ? "Update User" : "Create User"}
      </Button>
    </motion.form>
  );
};

// ===================== SITE FORM =====================
const SiteForm = ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => {
  const [loading, setLoading] = useState(false);
   const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [staffDeployment, setStaffDeployment] = useState<Array<{ role: string; count: number }>>([]);
  const [error, setError] = useState<string | null>(null);

  const ServicesList = ["Housekeeping", "Security", "Parking", "Waste Management"];
  const StaffRoles = [
    "Manager", "Supervisor", "Housekeeping Staff", "Security Guard",
    "Parking Attendant", "Waste Collector"
  ];

  // Client service wrapper
  const clientService = {
    async getAllClients(): Promise<Client[]> {
      const crmClients = await crmService.clients.getAll();
      return crmClients.map(c => ({ _id: c._id, name: c.name, company: c.company, email: c.email, phone: c.phone, city: c.city || "", state: "" }));
    },
    async searchClients(query: string): Promise<Client[]> {
      const crmClients = await crmService.clients.getAll(query);
      return crmClients.map(c => ({ _id: c._id, name: c.name, company: c.company, email: c.email, phone: c.phone, city: c.city || "", state: "" }));
    }
  };

  useEffect(() => {
    const fetchClients = async () => {
      setIsLoadingClients(true);
      try {
        const data = await clientService.getAllClients();
        setClients(data);
        if (data.length > 0 && !selectedClientId) {
          setSelectedClientId(data[0]._id);
        }
      } catch (err) {
        console.error("Error fetching clients:", err);
        toast.error("Failed to load clients from CRM");
      } finally {
        setIsLoadingClients(false);
      }
    };
    fetchClients();
  }, []);

  const toggleService = (service: string) => {
    setSelectedServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const updateStaffCount = (role: string, count: number) => {
    setStaffDeployment(prev => {
      const existing = prev.find(item => item.role === role);
      if (existing) {
        return prev.map(item =>
          item.role === role ? { ...item, count: Math.max(0, count) } : item
        );
      }
      return [...prev, { role, count }];
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    const client = clients.find(c => c._id === selectedClientId);
    if (!client) {
      toast.error("Please select a client from the list");
      return;
    }

    const siteData: CreateSiteRequest = {
      name: formData.get("site-name") as string,
      clientName: client.name,
      clientId: client._id,
      location: formData.get("location") as string,
      areaSqft: Number(formData.get("area-sqft")) || 0,
      contractValue: Number(formData.get("contract-value")) || 0,
      contractEndDate: formData.get("contract-end-date") as string,
      services: selectedServices,
      staffDeployment: staffDeployment.filter(item => item.count > 0),
      status: "active"
    };

    const validationErrors = siteService.validateSiteData(siteData);
    if (validationErrors.length > 0) {
      validationErrors.forEach(err => toast.error(err));
      return;
    }

    setLoading(true);
    try {
      await siteService.createSite(siteData);
      toast.success("Site added successfully!");
      onSuccess();
    } catch (error) {
      console.error("Error creating site:", error);
      const err = error as Error;
      toast.error(err.message || "Failed to create site");
      setError(err.message || "Failed to create site");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4 px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Site Name *</Label>
          <Input name="site-name" required placeholder="Enter site name" />
        </div>
        <div className="space-y-2">
          <Label>Location *</Label>
          <Input name="location" required placeholder="Enter location" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Select Client from CRM *</Label>
        {isLoadingClients ? (
          <div className="flex items-center space-x-2 p-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading clients from CRM...</span>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients in CRM..."
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  if (e.target.value.length >= 2) {
                    clientService.searchClients(e.target.value).then(setClients);
                  } else if (e.target.value.length === 0) {
                    clientService.getAllClients().then(setClients);
                  }
                }}
                className="pl-10 mb-2"
              />
            </div>
            <div className="border rounded-md max-h-60 overflow-y-auto">
              {clients.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No clients found in CRM.
                  <br />
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-1"
                    onClick={() => {
                      toast.info("Please add clients in the CRM section first");
                    }}
                  >
                    Add clients in CRM
                  </Button>
                </div>
              ) : (
                <div className="space-y-1 p-1">
                  {clients.map((client) => (
                    <div
                      key={client._id}
                      className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
                        selectedClientId === client._id ? "bg-blue-50 border border-blue-200" : ""
                      }`}
                      onClick={() => setSelectedClientId(client._id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{client.name}</div>
                          <div className="text-xs text-muted-foreground">{client.company}</div>
                        </div>
                        {selectedClientId === client._id && (
                          <Badge variant="outline" className="text-xs">Selected</Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center space-x-2 text-xs text-muted-foreground">
                        {client.email && <div className="flex items-center"><Mail className="h-3 w-3 mr-1" /> {client.email}</div>}
                        {client.phone && <div className="flex items-center"><Phone className="h-3 w-3 mr-1" /> {client.phone}</div>}
                        {client.city && <div className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> {client.city}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Area (sqft) *</Label>
          <Input name="area-sqft" type="number" required min={1} defaultValue="1000" />
        </div>
        <div className="space-y-2">
          <Label>Contract Value (₹) *</Label>
          <Input name="contract-value" type="number" required min={0} defaultValue="100000" />
        </div>
        <div className="space-y-2">
          <Label>Contract End Date *</Label>
          <Input
            name="contract-end-date"
            type="date"
            required
            min={new Date().toISOString().split("T")[0]}
            defaultValue={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
          />
        </div>
      </div>

      <div className="border p-4 rounded-md">
        <p className="font-medium mb-3">Services for this Site</p>
        <div className="grid grid-cols-2 gap-2">
          {ServicesList.map((service) => (
            <div key={service} className="flex items-center space-x-2">
              <Checkbox
                id={`site-service-${service}`}
                checked={selectedServices.includes(service)}
                onCheckedChange={() => toggleService(service)}
              />
              <label htmlFor={`site-service-${service}`} className="cursor-pointer text-sm">
                {service}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="border p-4 rounded-md">
        <p className="font-medium mb-3">Staff Deployment</p>
        <div className="space-y-3">
          {StaffRoles.map((role) => {
            const deployment = staffDeployment.find(item => item.role === role);
            const count = deployment?.count || 0;
            return (
              <div key={role} className="flex items-center justify-between">
                <span className="text-sm">{role}</span>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateStaffCount(role, count - 1)}
                    disabled={count <= 0}
                    className="h-7 w-7 p-0"
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    value={count}
                    onChange={(e) => updateStaffCount(role, parseInt(e.target.value) || 0)}
                    className="w-16 text-center h-7 text-sm"
                    min="0"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateStaffCount(role, count + 1)}
                    className="h-7 w-7 p-0"
                  >
                    +
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 p-2 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Create Site
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
export const UnifiedCreateModal = ({ open, onOpenChange, onSuccess, employees, setEmployees, allowedTabs }: UnifiedCreateModalProps) => {
  const [activeTab, setActiveTab] = useState("employee");
  const [loading, setLoading] = useState(false);

  // ✅ Define the props type for OnboardingTab here
  type OnboardingTabProps = React.ComponentProps<typeof OnboardingTab>;

  // Define all possible tabs and filter based on allowedTabs prop
  const allTabs = ['employee', 'client', 'site', 'admin', 'manager', 'supervisor'];
  const visibleTabs = allowedTabs && allowedTabs.length ? allTabs.filter(tab => allowedTabs.includes(tab)) : allTabs;

  // Client form state
  const [clientForm, setClientForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    city: "Mumbai",
    address: "",
    contactPerson: "",
    value: "",
    industry: "MALL",
  });

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/crm/clients`, clientForm);
      if (response.data.success) {
        toast.success("Client created successfully");
        onSuccess();
        onOpenChange(false);
        setClientForm({
          name: "", company: "", email: "", phone: "", city: "Pune",
          address: "", contactPerson: "", value: "", industry: "MALL"
        });
      }
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || "Failed to create client");
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (data: FormUserData) => {
    setLoading(true);
    let createdUserId: string | null = null;
    try {
      const payload = {
        username: data.email.split("@")[0],
        email: data.email,
        password: data.password,
        role: data.role,
        firstName: data.name.split(" ")[0] || "",
        lastName: data.name.split(" ").slice(1).join(" ") || "",
        department: data.department,
        phone: data.phone,
        joinDate: data.joinDate,
      };
      const response = await axios.post(`${API_URL}/users`, payload);
      if (response.data.success) {
        createdUserId = response.data.user?._id || response.data.user?.id;
        if (data.photoFile && createdUserId) {
          const formData = new FormData();
          formData.append("photo", data.photoFile);
          await axios.post(`${API_URL}/attendance/register-face/${createdUserId}`, formData);
          toast.success(`Face registered for ${data.name}`);
        }
        toast.success(`${data.role.charAt(0).toUpperCase() + data.role.slice(1)} created successfully`);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(response.data.message || "Failed to create user");
      }
    } catch (error) {
      console.error("User creation error:", error);
      const err = error as Error;
      toast.error(err.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold">Create New</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6">
            <TabsList className="grid gap-1 w-full" style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}>
              {visibleTabs.map(tab => (
                <TabsTrigger key={tab} value={tab}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Employee Tab */}
          {visibleTabs.includes('employee') && (
            <TabsContent value="employee" className="p-0 mt-4">
              <div className="max-h-[70vh] overflow-y-auto px-6 pb-6">
                <OnboardingTab
                  {...({
                    employees: employees,
                    setEmployees: setEmployees,
                    salaryStructures: [],
                    setSalaryStructures: () => {},
                    newJoinees: [],
                    setNewJoinees: () => {},
                    leftEmployees: [],
                    setLeftEmployees: () => {},
                  } as unknown as OnboardingTabProps)}
                />
              </div>
            </TabsContent>
          )}

          {/* Client Tab */}
          {visibleTabs.includes('client') && (
            <TabsContent value="client">
              <form onSubmit={handleClientSubmit} className="space-y-4 py-4 px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Client Name *</Label><Input required value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Company *</Label><Input required value={clientForm.company} onChange={e => setClientForm({...clientForm, company: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Email *</Label><Input type="email" required value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Phone *</Label><Input required value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} /></div>
                  <div className="space-y-2"><Label>City</Label><Input value={clientForm.city} onChange={e => setClientForm({...clientForm, city: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Expected Value *</Label><Input required value={clientForm.value} onChange={e => setClientForm({...clientForm, value: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Industry</Label><Select value={clientForm.industry} onValueChange={v => setClientForm({...clientForm, industry: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MALL">MALL</SelectItem><SelectItem value="COMMERCIAL">COMMERCIAL</SelectItem><SelectItem value="Banking">Banking</SelectItem><SelectItem value="Healthcare">Healthcare</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Address</Label><Textarea value={clientForm.address} onChange={e => setClientForm({...clientForm, address: e.target.value})} className="min-h-[80px]" placeholder="Enter full address" /></div>
                  <div className="space-y-2"><Label>Contact Person</Label><Input value={clientForm.contactPerson} onChange={e => setClientForm({...clientForm, contactPerson: e.target.value})} placeholder="Contact person name" /></div>
                </div>
                <Button type="submit" disabled={loading} className="w-full">{loading ? "Creating..." : "Create Client"}</Button>
              </form>
            </TabsContent>
          )}

          {/* Site Tab */}
          {visibleTabs.includes('site') && (
            <TabsContent value="site">
              <SiteForm
                onSuccess={() => {
                  onSuccess();
                  onOpenChange(false);
                }}
                onCancel={() => onOpenChange(false)}
              />
            </TabsContent>
          )}

          {/* Admin Tab */}
          {visibleTabs.includes('admin') && (
            <TabsContent value="admin">
              <div className="py-4 px-6">
                <EnhancedUserForm onSubmit={handleUserSubmit} presetRole="admin" />
              </div>
            </TabsContent>
          )}

          {/* Manager Tab */}
          {visibleTabs.includes('manager') && (
            <TabsContent value="manager">
              <div className="py-4 px-6">
                <EnhancedUserForm onSubmit={handleUserSubmit} presetRole="manager" />
              </div>
            </TabsContent>
          )}

          {/* Supervisor Tab */}
          {visibleTabs.includes('supervisor') && (
            <TabsContent value="supervisor">
              <div className="py-4 px-6">
                <EnhancedUserForm onSubmit={handleUserSubmit} presetRole="supervisor" />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};