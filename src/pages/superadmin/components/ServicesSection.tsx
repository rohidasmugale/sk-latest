// components/superadmin/ServicesSection.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Plus, Eye, Users } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  updatedAt: string;
}

const ServicesSection = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [adminServices, setAdminServices] = useState<Service[]>([]);
  const [allSharedServices, setAllSharedServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [viewServiceDialog, setViewServiceDialog] = useState<string | null>(null);

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');
  // Fetch all services
  const fetchServices = async () => {
    try {
      setLoading(true);
      // Fetch all services (superadmin sees everything)
      const response = await fetch(`${API_URL}/services`);
      
      if (!response.ok) throw new Error('Failed to fetch services');
      
      const data = await response.json();
      if (data.success) {
        const transformedServices = data.data.map((service: any) => ({
          _id: service._id,
          name: service.name,
          status: service.status,
          assignedTeam: service.assignedTeam,
          lastChecked: new Date(service.lastChecked).toLocaleDateString('en-IN'),
          description: service.description,
          createdBy: service.createdBy,
          createdByRole: service.createdByRole,
          isVisibleToAll: service.isVisibleToAll,
          sharedWithRoles: service.sharedWithRoles || [],
          visibility: service.visibility,
          createdAt: new Date(service.createdAt).toLocaleDateString('en-IN'),
          updatedAt: new Date(service.updatedAt).toLocaleDateString('en-IN')
        }));
        
        setServices(transformedServices);
        
        // Filter admin services
        const adminServices = transformedServices.filter(
          (service: Service) => service.createdByRole === 'admin'
        );
        setAdminServices(adminServices);
        
        // Get shared services
        const sharedResponse = await fetch(`${API_URL}/services/shared`);
        if (sharedResponse.ok) {
          const sharedData = await sharedResponse.json();
          if (sharedData.success) {
            setAllSharedServices(sharedData.data.map((service: any) => ({
              _id: service._id,
              name: service.name,
              status: service.status,
              assignedTeam: service.assignedTeam,
              lastChecked: new Date(service.lastChecked).toLocaleDateString('en-IN'),
              description: service.description,
              createdBy: service.createdBy,
              createdByRole: service.createdByRole,
              createdAt: new Date(service.createdAt).toLocaleDateString('en-IN')
            })));
          }
        }
      }
    } catch (error) {
      toast.error("Failed to fetch services");
      console.error("Error fetching services:", error);
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
        createdBy: "Super Admin",
        createdByRole: "superadmin",
        isVisibleToAll: true,
        sharedWithRoles: ['admin'], // Auto-share with admin
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
    } catch (error: any) {
      toast.error(error.message || "Failed to create service");
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
          updatedBy: "Super Admin",
          updatedByRole: "superadmin"
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
        
        setAdminServices(prev => prev.map(service => 
          service._id === serviceId ? { 
            ...service, 
            status,
            lastChecked: new Date().toLocaleDateString('en-IN'),
          } : service
        ));
        
        setAllSharedServices(prev => prev.map(service => 
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

  const getStatusColor = (status: Service["status"]) => {
    const colors = {
      operational: "default",
      maintenance: "secondary",
      down: "destructive"
    };
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
                    Note: Services added by superadmin are automatically visible to admin.
                  </p>
                  <Button type="submit" className="w-full">Add Service</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Services ({services.length})</TabsTrigger>
              <TabsTrigger value="admin">Admin Services ({adminServices.length})</TabsTrigger>
              <TabsTrigger value="shared">Shared Services ({allSharedServices.length})</TabsTrigger>
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
                        <div className="flex items-center justify-between">
                          <Badge variant={getStatusColor(service.status) as "default" | "destructive" | "outline" | "secondary"}>
                            {service.status}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs">
                            <Users className="h-3 w-3" />
                            <span>Visible to: {service.isVisibleToAll ? 'All' : 'Specific Roles'}</span>
                          </div>
                        </div>
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
                        {/* No Delete Button for Superadmin */}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="admin">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading admin services...</p>
                </div>
              ) : adminServices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No services added by admin yet.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {adminServices.map((service) => (
                    <Card key={service._id} className="relative border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {service.name}
                            <Badge variant="outline" className="text-xs bg-blue-50">
                              Added by Admin
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
                        <Badge variant={getStatusColor(service.status) as "default" | "destructive" | "outline" | "secondary"}>
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
                        {/* No Delete Button for Superadmin (even for admin services) */}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="shared">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading shared services...</p>
                </div>
              ) : allSharedServices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No shared services found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service Name</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Last Checked</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allSharedServices.map((service) => (
                      <TableRow key={service._id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>{service.createdBy}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {service.createdByRole}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(service.status)}>
                            {service.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{service.assignedTeam}</TableCell>
                        <TableCell>{service.lastChecked}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setViewServiceDialog(service._id)}
                            >
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUpdateStatus(service._id, "operational")}
                            >
                              Set Operational
                            </Button>
                            {/* No Delete Button in shared services table */}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* View Service Dialog (Without Delete Button) */}
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
                {/* No Delete Button in View Dialog */}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicesSection;