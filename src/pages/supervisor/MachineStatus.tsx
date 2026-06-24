import { useState, useEffect, useCallback } from "react";
import { BackButton } from "@/components/shared/BackButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building, Search, CheckCircle, AlertCircle, XCircle, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/context/RoleContext";
import { machineService, type FrontendMachine } from "@/services/machineService";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

const apiClient = axios.create({ baseURL: API_URL });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sk_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Status options
const STATUS_OPTIONS = [
  { value: 'operational', label: 'Operational', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  { value: 'maintenance', label: 'Under Maintenance', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  { value: 'out-of-service', label: 'Out of Service', color: 'bg-red-100 text-red-800', icon: XCircle },
];

export default function MachineStatus() {
  const { user: currentUser, role } = useRole();
  const [machines, setMachines] = useState<FrontendMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Local remark state: store the current remark value per machine while editing
  const [editingRemark, setEditingRemark] = useState<{ [key: string]: string }>({});

  // Helper: get supervisor site names from tasks
  const getSupervisorSiteNames = useCallback(async (): Promise<string[]> => {
    if (!currentUser || role !== "supervisor") return [];
    const supervisorId = currentUser._id || currentUser.id;
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
      console.error("Error fetching tasks for machine status:", error);
      return [];
    }
  }, [currentUser, role]);

  const fetchMachines = async () => {
    try {
      let filteredMachines: FrontendMachine[] = [];
      const allMachines = await machineService.getMachines();

      if (role === "supervisor") {
        const siteNames = await getSupervisorSiteNames();
        if (siteNames.length === 0) {
          setMachines([]);
          setLoading(false);
          return;
        }
        filteredMachines = allMachines.filter(m =>
          m.location && siteNames.some(site => site.toLowerCase() === m.location.toLowerCase())
        );
      } else {
        filteredMachines = allMachines;
      }
      setMachines(filteredMachines);
      // Initialize editing remarks with existing remarks
      const initialRemarks: { [key: string]: string } = {};
      filteredMachines.forEach(m => {
        initialRemarks[m._id] = m.remark || "";
      });
      setEditingRemark(initialRemarks);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load machines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchMachines();
    else setLoading(false);
  }, [currentUser, role]);

  const updateMachineStatus = async (machineId: string, newStatus: string) => {
  const machine = machines.find(m => m._id === machineId);
  if (!machine) return;
  if (!window.confirm(`Change status of "${machine.name}" to ${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}?`)) return;

  setUpdating(machineId);
  try {
    // Include the current remark to prevent it from being wiped
    await machineService.updateMachine(machineId, {
      status: newStatus,
      remark: machine.remark || ""  // preserve existing remark
    });
    setMachines(prev =>
      prev.map(m => (m._id === machineId ? { ...m, status: newStatus } : m))
    );
    toast.success(`Status updated to ${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}`);
  } catch (error) {
    toast.error("Update failed");
  } finally {
    setUpdating(null);
  }
};

  const handleRemarkChange = (machineId: string, value: string) => {
    setEditingRemark(prev => ({ ...prev, [machineId]: value }));
  };

  const saveRemark = async (machineId: string) => {
    const newRemark = editingRemark[machineId];
    const machine = machines.find(m => m._id === machineId);
    if (!machine) return;
    if (machine.remark === newRemark) return; // no change

    try {
      await machineService.updateMachine(machineId, { remark: newRemark });
      setMachines(prev =>
        prev.map(m => (m._id === machineId ? { ...m, remark: newRemark } : m))
      );
      toast.success("Remark saved");
    } catch (error) {
      toast.error("Failed to save remark");
      // revert local change
      setEditingRemark(prev => ({ ...prev, [machineId]: machine.remark || "" }));
    }
  };

  const filteredMachines = machines.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.manufacturer && m.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.model && m.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.serialNumber && m.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4 space-y-4">
      <BackButton />
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h1 className="text-xl font-bold">Machine Status</h1>
        <div className="relative w-64">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, manufacturer, model, serial..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {filteredMachines.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Building className="h-12 w-12 mx-auto mb-2" />
          <p>No machines found for your assigned sites.</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium">Machine Name</th>
                <th className="p-3 text-left font-medium">Location</th>
                <th className="p-3 text-left font-medium">Manufacturer</th>
                <th className="p-3 text-left font-medium">Model No</th>
                <th className="p-3 text-left font-medium">Serial No</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Remark</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMachines.map(machine => {
                const statusOption = STATUS_OPTIONS.find(s => s.value === machine.status);
                const StatusIcon = statusOption?.icon || CheckCircle;
                const currentRemark = editingRemark[machine._id] ?? machine.remark ?? "";

                return (
                  <tr key={machine._id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{machine.name}</td>
                    <td className="p-3">{machine.location || '-'}</td>
                    <td className="p-3">{machine.manufacturer || '-'}</td>
                    <td className="p-3">{machine.model || '-'}</td>
                    <td className="p-3">{machine.serialNumber || '-'}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={`${statusOption?.color} border-0 flex items-center gap-1 w-fit text-xs`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusOption?.label}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Input
                          value={currentRemark}
                          onChange={(e) => handleRemarkChange(machine._id, e.target.value)}
                          className="h-8 text-sm flex-1 min-w-[100px]"
                          placeholder="Add remark..."
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => saveRemark(machine._id)}
                          disabled={currentRemark === (machine.remark || "")}
                          title="Save remark"
                          className="h-8 px-2"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                    <td className="p-3">
                      {/* Status dropdown – allowed for supervisor, admin, manager, superadmin */}
                      {['superadmin', 'admin', 'manager', 'supervisor'].includes(role) && (
                        <Select
                          value={machine.status}
                          onValueChange={(value) => updateMachineStatus(machine._id, value)}
                          disabled={updating === machine._id}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue placeholder="Change status" />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(opt => {
                              const Icon = opt.icon;
                              return (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-3 w-3" />
                                    {opt.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      )}
                      {!['superadmin', 'admin', 'manager', 'supervisor'].includes(role) && (
                        <span className="text-xs text-muted-foreground">Read only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}