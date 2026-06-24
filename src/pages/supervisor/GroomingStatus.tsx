import { useState, useEffect, useCallback, useRef } from "react";
import { BackButton } from "@/components/shared/BackButton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useRole } from "@/context/RoleContext";

interface Employee {
  _id: string;
  name: string;
  employeeId: string;
  siteName: string;
  gender?: "male" | "female";
}

interface GroomingRecord {
  employeeId: string;
  date: string;
  [key: string]: any;
}

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

const apiClient = axios.create({ baseURL: API_URL });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sk_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function GroomingStatus() {
  const { user: currentUser, isAuthenticated } = useRole();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [presentEmployeeIds, setPresentEmployeeIds] = useState<Set<string>>(new Set());
  const [records, setRecords] = useState<Map<string, GroomingRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  
  const initialLoadDone = useRef(false);

  const getSupervisorSiteNames = useCallback(async (): Promise<string[]> => {
    if (!currentUser) return [];
    const supervisorId = currentUser._id || currentUser.id;
    try {
      const res = await apiClient.get('/tasks', { params: { limit: 1000 } });
      let tasks = res.data?.data || res.data || [];
      if (!Array.isArray(tasks)) tasks = [];
      const siteSet = new Set<string>();
      tasks.forEach((task: any) => {
        const assigned = task.assignedUsers?.some((u: any) => u.userId === supervisorId);
        const assignedTo = task.assignedTo === supervisorId;
        if ((assigned || assignedTo) && task.siteName) {
          siteSet.add(task.siteName);
        }
      });
      return Array.from(siteSet);
    } catch (error) {
      console.error("Error fetching tasks for grooming:", error);
      return [];
    }
  }, [currentUser]);

  const fetchEmployees = useCallback(async () => {
    const supervisorSites = await getSupervisorSiteNames();
    if (supervisorSites.length === 0) {
      setEmployees([]);
      return [];
    }
    try {
      const res = await apiClient.get('/employees', { params: { limit: 1000 } });
      let allEmployees = res.data?.data || res.data?.employees || res.data || [];
      if (!Array.isArray(allEmployees)) allEmployees = [];
      const filtered = allEmployees
        .filter((emp: any) => {
          const empSite = emp.siteName || '';
          return supervisorSites.some(site => site.toLowerCase() === empSite.toLowerCase());
        })
        .map((emp: any) => ({
          _id: emp._id,
          name: emp.name,
          employeeId: emp.employeeId,
          siteName: emp.siteName,
          gender: emp.gender?.toLowerCase() === 'female' ? 'female' : 'male'
        }));
      setEmployees(filtered);
      return filtered;
    } catch (error) {
      console.error("Error fetching employees for grooming:", error);
      toast.error("Failed to load employees");
      return [];
    }
  }, [getSupervisorSiteNames]);

  const fetchPresentEmployees = useCallback(async () => {
    try {
      const res = await apiClient.get('/attendance', { params: { date: today } });
      let records = res.data?.data || res.data || [];
      if (!Array.isArray(records)) records = [];
      const presentIds = new Set<string>();
      records.forEach((rec: any) => {
        if (rec.status === 'present' || rec.status === 'half-day') {
          presentIds.add(rec.employeeId);
        }
      });
      setPresentEmployeeIds(presentIds);
      return presentIds;
    } catch (error) {
      console.error("Error fetching attendance:", error);
      return new Set<string>();
    }
  }, [today]);

  const fetchGroomingRecords = useCallback(async (empList: Employee[]) => {
    if (empList.length === 0) return;
    try {
      const res = await apiClient.get('/grooming/today');
      const recordsArray = res.data?.data || res.data || [];
      const map = new Map<string, GroomingRecord>();
      recordsArray.forEach((r: GroomingRecord) => {
        map.set(r.employeeId, r);
      });
      setRecords(map);
      localStorage.setItem('grooming_backup', JSON.stringify(recordsArray));
    } catch (error: any) {
      console.error("Error fetching grooming records:", error);
      const cached = localStorage.getItem('grooming_backup');
      if (cached) {
        const arr = JSON.parse(cached);
        const map = new Map();
        arr.forEach((r: GroomingRecord) => map.set(r.employeeId, r));
        setRecords(map);
        toast.warning("Using cached grooming data");
      }
    }
  }, []);

  useEffect(() => {
    if (!currentUser || !isAuthenticated || currentUser.role !== "supervisor") {
      setLoading(false);
      return;
    }
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const loadAll = async () => {
      setLoading(true);
      const empList = await fetchEmployees();
      const presentIds = await fetchPresentEmployees();
      if (empList.length > 0 && presentIds.size > 0) {
        await fetchGroomingRecords(empList);
      }
      setLoading(false);
    };
    loadAll();
  }, [currentUser, isAuthenticated, fetchEmployees, fetchPresentEmployees, fetchGroomingRecords]);

  const updateChecklist = (empId: string, field: string, checked: boolean) => {
    setRecords(prev => {
      const employee = employees.find(e => e._id === empId);
      const gender = employee?.gender || 'male';
      const getDefault = () => ({
        employeeId: empId,
        date: today,
        shirt: false,
        pant: false,
        cap: false,
        shoes: false,
        idCard: false,
        apron: false,
        westcoat: false,
        ...(gender === 'female' ? { nails: false, singleBangles: false, studs: false } : { shaving: false, haircut: false, nails: false })
      });
      const existing = prev.get(empId) || getDefault();
      const updated = { ...existing, [field]: checked };
      const newMap = new Map(prev);
      newMap.set(empId, updated);
      return newMap;
    });
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const payload = Array.from(records.values()).map(r => ({ ...r, date: today }));
      const response = await apiClient.post('/grooming/batch', { records: payload });
      console.log("Save response:", response.data);
      toast.success("Grooming status saved");
      const empList = employees; // use current list
      await fetchGroomingRecords(empList);
    } catch (error: any) {
      console.error("Save error:", error.response?.data || error.message);
      toast.error(`Save failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const countWithoutUniform = () => {
    let count = 0;
    for (const emp of employees) {
      if (!presentEmployeeIds.has(emp._id)) continue;
      const rec = records.get(emp._id);
      if (!rec) {
        count++;
        continue;
      }
      const gender = emp.gender || 'male';
      if (gender === 'female') {
        if (!rec.shirt || !rec.pant || !rec.cap || !rec.shoes || !rec.idCard ||
            !rec.nails || !rec.singleBangles || !rec.studs) {
          count++;
        }
      } else {
        if (!rec.shirt || !rec.pant || !rec.cap || !rec.shoes || !rec.idCard ||
            !rec.shaving || !rec.haircut || !rec.nails) {
          count++;
        }
      }
    }
    return count;
  };

  const renderCheckbox = (empId: string, field: string) => {
    const rec = records.get(empId) || {};
    return (
      <Checkbox
        checked={!!rec[field]}
        onCheckedChange={(c) => updateChecklist(empId, field, !!c)}
      />
    );
  };

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>;

  const presentEmployees = employees.filter(emp => presentEmployeeIds.has(emp._id));

  if (presentEmployees.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <BackButton />
        <div className="text-center py-8 text-muted-foreground">
          <Building className="h-12 w-12 mx-auto mb-2" />
          <p>No present employees found for your assigned sites today.</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <BackButton />
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Grooming Status</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchGroomingRecords(employees)}>
            <RefreshCw className="h-4 w-4 mr-1" /> Reload
          </Button>
          <Badge variant="destructive" className="text-sm">Without uniform: {countWithoutUniform()}</Badge>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Employee</th>
              <th className="p-2 text-center">Shirt</th>
              <th className="p-2 text-center">Pant</th>
              <th className="p-2 text-center">Cap</th>
              <th className="p-2 text-center">Shoes</th>
              <th className="p-2 text-center">ID Card</th>
              <th className="p-2 text-center">Nails</th>
              <th className="p-2 text-center">Single Bangles</th>
              <th className="p-2 text-center">Studs</th>
              <th className="p-2 text-center">Shaving</th>
              <th className="p-2 text-center">Haircut</th>
              <th className="p-2 text-center">Apron</th>
              <th className="p-2 text-center">Westcoat</th>
            </tr>
          </thead>
          <tbody>
            {presentEmployees.map(emp => {
              const gender = emp.gender || 'male';
              return (
                <tr key={emp._id} className="border-t">
                  <td className="p-2">
                    <div className="font-medium">{emp.name}</div>
                    <div className="text-xs text-muted-foreground">{emp.employeeId}</div>
                    <div className="text-[10px] text-muted-foreground">{gender}</div>
                  </td>
                  <td className="p-2 text-center">{renderCheckbox(emp._id, "shirt")}</td>
                  <td className="p-2 text-center">{renderCheckbox(emp._id, "pant")}</td>
                  <td className="p-2 text-center">{renderCheckbox(emp._id, "cap")}</td>
                  <td className="p-2 text-center">{renderCheckbox(emp._id, "shoes")}</td>
                  <td className="p-2 text-center">{renderCheckbox(emp._id, "idCard")}</td>
                  
                  {gender === 'female' ? (
                    <>
                      <td className="p-2 text-center">{renderCheckbox(emp._id, "nails")}</td>
                      <td className="p-2 text-center">{renderCheckbox(emp._id, "singleBangles")}</td>
                      <td className="p-2 text-center">{renderCheckbox(emp._id, "studs")}</td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-center">-</td>
                    </>
                  ) : (
                    <>
                      <td className="p-2 text-center">{renderCheckbox(emp._id, "nails")}</td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-center">{renderCheckbox(emp._id, "shaving")}</td>
                      <td className="p-2 text-center">{renderCheckbox(emp._id, "haircut")}</td>
                    </>
                  )}
                  <td className="p-2 text-center">{renderCheckbox(emp._id, "apron")}</td>
                  <td className="p-2 text-center">{renderCheckbox(emp._id, "westcoat")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button onClick={saveAll} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save Today's Grooming Status"}
      </Button>
    </div>
  );
}