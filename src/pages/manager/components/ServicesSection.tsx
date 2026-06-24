import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Service {
  _id: string;
  name: string;
  status: 'operational' | 'maintenance' | 'down';
  assignedTeam: string;
  lastChecked: string;
  description?: string;
  createdByRole?: string;
  updatedByRole?: string;
}

const ServicesSection = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // API Base URL
 const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');
    // Fetch services from backend
  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/services`);
      
      if (!response.ok) throw new Error('Failed to fetch services');
      
      const data = await response.json();
      if (data.success) {
        // Transform data to match frontend structure
        const transformedServices = data.data.map((service: any) => ({
          _id: service._id,
          id: service._id, // Keep id for compatibility
          name: service.name,
          status: service.status,
          assignedTeam: service.assignedTeam,
          lastChecked: new Date(service.lastChecked).toISOString().split('T')[0],
          description: service.description,
          createdByRole: service.createdByRole || 'manager',
          updatedByRole: service.updatedByRole
        }));
        
        setServices(transformedServices);
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

  const handleUpdateStatus = async (serviceId: string, status: Service["status"]) => {
    try {
      const response = await fetch(`${API_URL}/services/${serviceId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status,
          updatedBy: "Manager User", // You can pass actual user data
          updatedByRole: "manager" // Manager role
        })
      });
      
      if (!response.ok) throw new Error('Failed to update service status');
      
      const data = await response.json();
      if (data.success) {
        // Update local state
        setServices(prev => prev.map(service => 
          service._id === serviceId ? { 
            ...service, 
            status,
            lastChecked: new Date().toISOString().split('T')[0],
            updatedByRole: "manager" // Update the role in local state
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Service Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
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
                      {service.name}
                      {getStatusIcon(service.status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Badge variant={getStatusColor(service.status) as "default" | "destructive" | "outline" | "secondary"}>
                      {service.status}
                    </Badge>
                    <div className="text-sm space-y-1">
                      <p className="text-muted-foreground">Team: {service.assignedTeam}</p>
                      <p className="text-muted-foreground">Last checked: {service.lastChecked}</p>
                      {service.createdByRole && (
                        <p className="text-xs text-muted-foreground">
                          Created by: {service.createdByRole}
                        </p>
                      )}
                      {service.updatedByRole && (
                        <p className="text-xs text-muted-foreground">
                          Last updated by: {service.updatedByRole}
                        </p>
                      )}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default ServicesSection;