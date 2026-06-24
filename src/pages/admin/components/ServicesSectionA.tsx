// components/admin/AdminServicesSection.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Plus, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Service {
  _id: string;
  name: string;
  status: 'operational' | 'maintenance' | 'down';
  assignedTeam: string;
  lastChecked: string;
  description?: string;
  createdBy: string;
  createdByRole: string;
  isVisibleToAll: boolean;
  sharedWithRoles: string[];
  visibility: 'all' | 'specific_roles';
  createdAt: string;
}

// Helper to get error message from unknown
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
};

// Helper to safely extract service data from unknown response
const parseServiceData = (data: unknown): Service[] => {
  if (!data || typeof data !== 'object') return [];
  
  // Check if it's an array
  if (Array.isArray(data)) {
    return data.map(item => item as Service);
  }
  
  // Check if it has a data property (common API pattern)
  if ('data' in data && Array.isArray(data.data)) {
    return data.data.map(item => item as Service);
  }
  
  return [];
};

const AdminServicesSection = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [superadminServices, setSuperadminServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [viewServiceDialog, setViewServiceDialog] = useState<string | null>(null);
 const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

  // Fetch services for admin role
  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/services?role=admin`);
      
      if (!response.ok) throw new Error('Failed to fetch services');
      
      const result = await response.json();
      
      // Handle both { success: true, data: [...] } and direct array
      let rawServices: unknown[] = [];
      if (result.success && Array.isArray(result.data)) {
        rawServices = result.data;
      } else if (Array.isArray(result)) {
        rawServices = result;
      } else if (Array.isArray(result.data)) {
        rawServices = result.data;
      }
      
      // Map and transform safely
      const transformedServices = rawServices
        .map((item: unknown) => {
          const service = item as Record<string, unknown>;
          return {
            _id: service._id as string || '',
            name: service.name as string || 'Unnamed Service',
            status: (service.status as 'operational' | 'maintenance' | 'down') || 'operational',
            assignedTeam: service.assignedTeam as string || 'Unassigned',
            lastChecked: service.lastChecked 
              ? new Date(service.lastChecked as string).toLocaleDateString('en-IN')
              : new Date().toLocaleDateString('en-IN'),
            description: service.description as string || '',
            createdBy: service.createdBy as string || 'Unknown',
            createdByRole: service.createdByRole as string || 'admin',
            isVisibleToAll: service.isVisibleToAll as boolean ?? true,
            sharedWithRoles: Array.isArray(service.sharedWithRoles) 
              ? service.sharedWithRoles.map((r: unknown) => String(r))
              : [],
            visibility: (service.visibility as 'all' | 'specific_roles') || 'all',
            createdAt: service.createdAt 
              ? new Date(service.createdAt as string).toLocaleDateString('en-IN')
              : new Date().toLocaleDateString('en-IN')
          } as Service;
        })
        .filter(service => service._id !== ''); // Filter out invalid entries
      
      setServices(transformedServices);
      
      // Filter superadmin services
      const superadminServices = transformedServices.filter(
        (service: Service) => service.createdByRole === 'superadmin'
      );
      setSuperadminServices(superadminServices);
    } catch (error) {
      toast.error("Failed to fetch services");
      console.error("Error fetching services:", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleAddService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      
      const serviceData = {
        name: formData.get("name") as string,
        status: formData.get("status") as 'operational' | 'maintenance' | 'down',
        assignedTeam: formData.get("assignedTeam") as string,
        description: formData.get("description") as string,
        createdBy: "Admin User",
        createdByRole: "admin",
        isVisibleToAll: true,
        sharedWithRoles: ['superadmin'],
        visibility: 'all'
      };
      
      const response = await fetch(`${API_URL}/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create service');
      }
      
      const data = await response.json();
      if (data.success) {
        toast.success("Service created successfully");
        setServiceDialogOpen(false);
        fetchServices();
      }
    } catch (error) {
      toast.error(getErrorMessage(error) || "Failed to create service");
      console.error("Error creating service:", error);
    }
  };

  const handleUpdateStatus = async (serviceId: string, status: Service["status"]) => {
    try {
      const response = await fetch(`${API_URL}/services/${serviceId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status,
          updatedBy: "Admin User",
          updatedByRole: "admin"
        })
      });
      
      if (!response.ok) throw new Error('Failed to update service status');
      
      const data = await response.json();
      if (data.success) {
        // Update all service lists
        setServices(prev => prev.map(service => 
          service._id === serviceId ? { 
            ...service, 
            status,
            lastChecked: new Date().toLocaleDateString('en-IN'),
          } : service
        ));
        
        setSuperadminServices(prev => prev.map(service => 
          service._id === serviceId ? { 
            ...service, 
            status,
            lastChecked: new Date().toLocaleDateString('en-IN'),
          } : service
        ));
        
        toast.success(`Service status updated to ${status}`);
      }
    } catch (error) {
      toast.error("Failed to update service status");
      console.error("Error updating service status:", error);
    }
  };

  const handleDeleteService = async (serviceId: string, createdByRole: string) => {
    // Admin can only delete services they created
    if (createdByRole !== 'admin') {
      toast.error("You can only delete services you created");
      return;
    }
    
    if (!confirm("Are you sure you want to delete this service? This action cannot be undone.")) return;
    
    try {
      const response = await fetch(`${API_URL}/services/${serviceId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete service');
      }
      
      const data = await response.json();
      if (data.success) {
        // Remove from all lists
        setServices(prev => prev.filter(service => service._id !== serviceId));
        setSuperadminServices(prev => prev.filter(service => service._id !== serviceId));
        
        toast.success("Service deleted successfully");
      }
    } catch (error) {
      toast.error(getErrorMessage(error) || "Failed to delete service");
      console.error("Error deleting service:", error);
    }
  };

  // ✅ Fixed: Return type matches Badge variant prop
 const getStatusColor = (status: Service["status"]): "default" | "secondary" | "destructive" => {
  const colors = {
    operational: "default",
    maintenance: "secondary",
    down: "destructive"
  } as const;  // ✅ This makes values literal types
  return colors[status];
};

  const getStatusIcon = (status: Service["status"]) => {
    const icons = {
      operational: <CheckCircle className="h-4 w-4" />,
      maintenance: <Clock className="h-4 w-4" />,
      down: <XCircle className="h-4 w-4" />
    };
    return icons[status];
  };

  const getServiceById = (id: string) => services.find(service => service._id === id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Service Monitoring</CardTitle>
          <div className="flex gap-2">
            <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Add Service</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Service</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddService} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Service Name</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue="operational">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operational">Operational</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="down">Down</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assignedTeam">Assigned Team</Label>
                      <Input id="assignedTeam" name="assignedTeam" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" rows={3} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Note: Services added by admin are automatically visible to superadmin.
                  </p>
                  <Button type="submit" className="w-full">Add Service</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All Services ({services.length})</TabsTrigger>
              <TabsTrigger value="superadmin">SuperAdmin Services ({superadminServices.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading services...</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {services.map((service) => (
                    <Card key={service._id} className="relative">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {service.name}
                            <Badge variant="outline" className="text-xs">
                              {service.createdByRole}
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            {getStatusIcon(service.status)}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewServiceDialog(service._id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* ✅ Fixed: No cast needed – function returns correct type */}
                        <Badge variant={getStatusColor(service.status)}>
                          {service.status}
                        </Badge>
                        <div className="text-sm space-y-1">
                          <p className="text-muted-foreground">Team: {service.assignedTeam}</p>
                          <p className="text-muted-foreground">Last checked: {service.lastChecked}</p>
                          <p className="text-xs text-muted-foreground">
                            Created by: {service.createdBy} ({service.createdByRole})
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created: {service.createdAt}
                          </p>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button 
                            size="sm" 
                            variant={service.status === "operational" ? "default" : "outline"}
                            onClick={() => handleUpdateStatus(service._id, "operational")}
                          >
                            Operational
                          </Button>
                          <Button 
                            size="sm" 
                            variant={service.status === "maintenance" ? "secondary" : "outline"}
                            onClick={() => handleUpdateStatus(service._id, "maintenance")}
                          >
                            Maintenance
                          </Button>
                          <Button 
                            size="sm" 
                            variant={service.status === "down" ? "destructive" : "outline"}
                            onClick={() => handleUpdateStatus(service._id, "down")}
                          >
                            Down
                          </Button>
                        </div>
                        {service.createdByRole === 'admin' && (
                          <div className="pt-2">
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="w-full"
                              onClick={() => handleDeleteService(service._id, service.createdByRole)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Service
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="superadmin">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading superadmin services...</p>
                </div>
              ) : superadminServices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No services added by superadmin yet.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {superadminServices.map((service) => (
                    <Card key={service._id} className="relative border-l-4 border-l-purple-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {service.name}
                            <Badge variant="outline" className="text-xs bg-purple-50">
                              Added by SuperAdmin
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            {getStatusIcon(service.status)}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewServiceDialog(service._id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Badge variant={getStatusColor(service.status)}>
                          {service.status}
                        </Badge>
                        <div className="text-sm space-y-1">
                          <p className="text-muted-foreground">Team: {service.assignedTeam}</p>
                          <p className="text-muted-foreground">Last checked: {service.lastChecked}</p>
                          <p className="text-muted-foreground">Description: {service.description || 'No description'}</p>
                          <p className="text-xs text-muted-foreground">
                            Created by: {service.createdBy} ({service.createdByRole})
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created: {service.createdAt}
                          </p>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button 
                            size="sm" 
                            variant={service.status === "operational" ? "default" : "outline"}
                            onClick={() => handleUpdateStatus(service._id, "operational")}
                          >
                            Operational
                          </Button>
                          <Button 
                            size="sm" 
                            variant={service.status === "maintenance" ? "secondary" : "outline"}
                            onClick={() => handleUpdateStatus(service._id, "maintenance")}
                          >
                            Maintenance
                          </Button>
                          <Button 
                            size="sm" 
                            variant={service.status === "down" ? "destructive" : "outline"}
                            onClick={() => handleUpdateStatus(service._id, "down")}
                          >
                            Down
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* View Service Dialog */}
      <Dialog open={!!viewServiceDialog} onOpenChange={(open) => !open && setViewServiceDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Service Details</DialogTitle>
          </DialogHeader>
          {viewServiceDialog && getServiceById(viewServiceDialog) && (() => {
            const service = getServiceById(viewServiceDialog)!;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><strong>Name:</strong> {service.name}</div>
                  <div><strong>Status:</strong> 
                    <Badge variant={getStatusColor(service.status)} className="ml-2">
                      {service.status}
                    </Badge>
                  </div>
                  <div><strong>Assigned Team:</strong> {service.assignedTeam}</div>
                  <div><strong>Visibility:</strong> {service.isVisibleToAll ? 'All' : 'Specific Roles'}</div>
                  <div><strong>Created By:</strong> {service.createdBy}</div>
                  <div><strong>Role:</strong> {service.createdByRole}</div>
                  <div><strong>Last Checked:</strong> {service.lastChecked}</div>
                  <div><strong>Created At:</strong> {service.createdAt}</div>
                </div>
                {service.description && (
                  <div>
                    <strong>Description:</strong>
                    <div className="mt-1 p-2 border rounded">{service.description}</div>
                  </div>
                )}
                {service.sharedWithRoles && service.sharedWithRoles.length > 0 && (
                  <div>
                    <strong>Shared With Roles:</strong>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {service.sharedWithRoles.map(role => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {service.createdByRole === 'admin' && (
                  <div className="pt-4">
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        setViewServiceDialog(null);
                        handleDeleteService(service._id, service.createdByRole);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete This Service
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminServicesSection;