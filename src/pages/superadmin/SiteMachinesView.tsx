import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Wrench, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import axios from 'axios';

// API base URL – consistent with your other components
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

// Interface for machine data (adjust to match your backend response)
interface Machine {
  _id: string;
  machineId: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'warning' | string;
  lastMaintenance?: string;
  ipAddress?: string;
  siteName?: string;
  location?: string;
  // add other fields as needed
}

const SiteMachinesView: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const siteName = decodeURIComponent(siteId || '');

  useEffect(() => {
    if (siteName) {
      loadMachines();
    }
  }, [siteName]);

  // 🔁 Replace mock with real API call
  const loadMachines = async () => {
    setLoading(true);
    try {
      // Option 1: If your backend supports filtering by siteName as query param
      const response = await axios.get(`${API_URL}/machines`, {
        params: { siteName: siteName }
      });

      // Option 2: If you have a dedicated endpoint like /machines/site/:siteName
      // const response = await axios.get(`${API_URL}/machines/site/${encodeURIComponent(siteName)}`);

      let machinesData: Machine[] = [];
      if (response.data.success && Array.isArray(response.data.data)) {
        machinesData = response.data.data;
      } else if (Array.isArray(response.data)) {
        machinesData = response.data;
      } else if (response.data.machines && Array.isArray(response.data.machines)) {
        machinesData = response.data.machines;
      } else {
        machinesData = [];
      }

      setMachines(machinesData);
      if (machinesData.length === 0) {
        toast.info(`No machines found for ${siteName}`);
      }
    } catch (error: any) {
      console.error('Error fetching machines:', error);
      toast.error('Failed to load machine details', {
        description: error.message || 'Please try again later'
      });
      setMachines([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const lowerStatus = status?.toLowerCase();
    switch (lowerStatus) {
      case 'online': return <Badge className="bg-green-100 text-green-800">Online</Badge>;
      case 'offline': return <Badge variant="destructive">Offline</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Helper to format date if needed
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Machines – {siteName}</h1>
          <Button variant="outline" size="sm" onClick={loadMachines} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" /> Machine Inventory & Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : machines.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No machines found for this site.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Machine ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Maintenance</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {machines.map((machine) => (
                      <TableRow key={machine._id || machine.machineId}>
                        <TableCell className="font-mono text-xs">
                          {machine.machineId || machine._id?.slice(-6)}
                        </TableCell>
                        <TableCell className="font-medium">{machine.name}</TableCell>
                        <TableCell>{machine.type}</TableCell>
                        <TableCell>{getStatusBadge(machine.status)}</TableCell>
                        <TableCell>{formatDate(machine.lastMaintenance)}</TableCell>
                        <TableCell>{machine.ipAddress || machine.ip || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SiteMachinesView;