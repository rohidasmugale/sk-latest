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
  siteId?: string;
  gender?: "male" | "female";
  position?: string;
  department?: string;
  role?: string;
}

interface GroomingRecord {
  employeeId: string;
  date: string;
  siteId?: string;
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
  const [supervisorSiteIds, setSupervisorSiteIds] = useState<string[]>([]);
  const today = new Date().toISOString().split("T")[0];

  const initialLoadDone = useRef(false);

  // Fetch site IDs AND names for the supervisor (from tasks)
  const getSupervisorSitesInfo = useCallback(async (): Promise<{ ids: string[]; names: string[] }> => {
    if (!currentUser) return { ids: [], names: [] };
    try {
      const supervisorId = currentUser._id || currentUser.id;
      const supervisorName = currentUser.name;
      const response = await apiClient.get('/tasks', { params: { limit: 1000 } });
      let allTasks = response.data?.data || response.data || [];
      if (!Array.isArray(allTasks)) allTasks = [];

      const siteIdSet = new Set<string>();
      const siteNameSet = new Set<string>();
      allTasks.forEach((task: any) => {
        const assigned =
          task.assignedUsers?.some((u: any) =>
            u.userId === supervisorId ||
            (u.name && supervisorName && u.name.toLowerCase() === supervisorName.toLowerCase())
          ) || task.assignedTo === supervisorId;
        if (assigned) {
          if (task.siteId) siteIdSet.add(task.siteId);
          if (task.siteName) siteNameSet.add(task.siteName.trim().toLowerCase());
        }
      });

      return { ids: Array.from(siteIdSet), names: Array.from(siteNameSet) };
    } catch (error) {
      console.error("Error fetching sites for grooming:", error);
      return { ids: [], names: [] };
    }
  }, [currentUser]);

  // Fetch employees with siteId OR siteName fallback (same as Attendance)
  // ✅ EXCLUDE supervisors/managers - they inspect, not get inspected
  const fetchEmployeesForSites = useCallback(async (siteIds: string[], siteNames: string[]): Promise<Employee[]> => {
    if (siteIds.length === 0 && siteNames.length === 0) {
      setEmployees([]);
      return [];
    }
    try {
      const res = await apiClient.get('/employees', { params: { limit: 1000 } });
      let allEmployees = res.data?.data || res.data?.employees || res.data || [];
      if (!Array.isArray(allEmployees)) allEmployees = [];

      // Filter: active + site-matched + NOT supervisor/manager
      const filtered = allEmployees
        .filter((emp: any) => {
          if (emp.status !== 'active') return false;
          const empSiteId = emp.siteId;
          const empSiteName = (emp.siteName || emp.site || '').trim().toLowerCase();
          const siteMatch = siteIds.includes(empSiteId) || siteNames.includes(empSiteName);
          if (!siteMatch) return false;

          // ✅ EXCLUDE supervisors and managers
          const position = (emp.position || '').toLowerCase();
          const department = (emp.department || '').toLowerCase();
          const role = (emp.role || '').toLowerCase();
          const isManagerOrSupervisor =
            position.includes('manager') || position.includes('supervisor') ||
            department.includes('manager') || department.includes('supervisor') ||
            role === 'manager' || role === 'supervisor';

          return !isManagerOrSupervisor;
        })
        .map((emp: any) => ({
          _id: emp._id,
          name: emp.name,
          employeeId: emp.employeeId,
          siteName: emp.siteName,
          siteId: emp.siteId,
          gender: emp.gender?.toLowerCase() === 'female' ? 'female' : 'male',
          position: emp.position,
          department: emp.department,
          role: emp.role,
        }));

      setEmployees(filtered);
      return filtered;
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
      return [];
    }
  }, []);

  // Fetch present employees (attendance records)
  // ✅ FIXED: Added limit: 1000 to get ALL records
  const fetchPresentEmployees = useCallback(async (empList: Employee[]) => {
    try {
      const res = await apiClient.get('/attendance', {
        params: { date: today, limit: 1000 }   // ✅ Added limit: 1000
      });
      let records = res.data?.data || res.data || [];
      if (!Array.isArray(records)) records = [];

      const presentIds = new Set<string>();
      records.forEach((rec: any) => {
        if (rec.status !== 'present' && rec.status !== 'half-day') return;

        // Match on _id, employeeId, or name — same logic as Attendance.tsx
        const match = empList.find(e =>
          e._id === rec.employeeId ||
          e.employeeId === rec.employeeId ||
          e.name === rec.employeeName
        );
        if (match) presentIds.add(match._id);
      });

      setPresentEmployeeIds(presentIds);
      return presentIds;
    } catch (error) {
      console.error("Error fetching attendance:", error);
      return new Set<string>();
    }
  }, [today]);

  // Fetch grooming records for given siteIds
  const fetchGroomingRecords = useCallback(async (empList: Employee[], siteIds: string[]) => {
    if (empList.length === 0 || siteIds.length === 0) return;

    const map = new Map<string, GroomingRecord>();
    let anySuccess = false;

    for (const siteId of siteIds) {
      try {
        const res = await apiClient.get('/grooming', {
          params: { date: today, siteId }
        });
        const recordsArray = res.data?.data || res.data || [];
        recordsArray.forEach((r: GroomingRecord) => {
          map.set(r.employeeId, r);
        });
        anySuccess = true;
      } catch (error: any) {
        console.warn(`Failed to fetch grooming for site ${siteId}:`, error.message);
      }
    }

    if (anySuccess) {
      setRecords(map);
      localStorage.setItem('grooming_backup', JSON.stringify(Array.from(map.values())));
    } else {
      const cached = localStorage.getItem('grooming_backup');
      if (cached) {
        try {
          const arr = JSON.parse(cached);
          const cacheMap = new Map();
          arr.forEach((r: GroomingRecord) => cacheMap.set(r.employeeId, r));
          setRecords(cacheMap);
          toast.warning("Using cached grooming data");
        } catch (e) {
          console.error('Failed to parse cache:', e);
        }
      }
    }
  }, [today]);

  // Initial load
  useEffect(() => {
    if (!currentUser || !isAuthenticated || currentUser.role !== "supervisor") {
      setLoading(false);
      return;
    }
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const loadAll = async () => {
      setLoading(true);
      const { ids: siteIds, names: siteNames } = await getSupervisorSitesInfo();
      setSupervisorSiteIds(siteIds);

      const empList = await fetchEmployeesForSites(siteIds, siteNames);
      const presentIds = await fetchPresentEmployees(empList);

      if (empList.length > 0 && presentIds.size > 0) {
        await fetchGroomingRecords(empList, siteIds);
      }
      setLoading(false);
    };
    loadAll();
  }, [currentUser, isAuthenticated, getSupervisorSitesInfo, fetchEmployeesForSites, fetchPresentEmployees, fetchGroomingRecords]);

  // Update checklist
  const updateChecklist = (empId: string, field: string, checked: boolean) => {
    setRecords(prev => {
      const employee = employees.find(e => e._id === empId);
      if (!employee) {
        console.warn(`Employee ${empId} not found in list`);
        return prev;
      }
      const gender = employee.gender || 'male';
      const employeeSiteId = employee.siteId || '';

      const getDefault = () => ({
        employeeId: empId,
        siteId: employeeSiteId || supervisorSiteIds[0] || '',
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

  // Save
  const saveAll = async () => {
    setSaving(true);
    try {
      const payload = Array.from(records.values()).map(r => ({ ...r, date: today }));
      const response = await apiClient.post('/grooming/batch', { records: payload });
      toast.success("Grooming status saved");
      await fetchGroomingRecords(employees, supervisorSiteIds);
    } catch (error: any) {
      console.error("Save error:", error);
      const message = error.response?.data?.message || error.message || "Network error – please check your connection and try again.";
      toast.error(`Save failed: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  // Counts
  const countWithoutUniform = () => {
    let count = 0;
    for (const emp of employees) {
      if (!presentEmployeeIds.has(emp._id)) continue;
      const rec = records.get(emp._id);
      if (!rec) continue;
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

  const countNotSubmitted = () => {
    let count = 0;
    for (const emp of employees) {
      if (presentEmployeeIds.has(emp._id) && !records.has(emp._id)) {
        count++;
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
    <div className="p-2 sm:p-4 space-y-4">
      <BackButton />
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h1 className="text-lg sm:text-xl font-bold">Grooming Status</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchGroomingRecords(employees, supervisorSiteIds)}>
            <RefreshCw className="h-4 w-4 mr-1" /> Reload
          </Button>
          <Badge variant="destructive" className="text-xs sm:text-sm">
            Without uniform: {countWithoutUniform()}
          </Badge>
          <Badge variant="outline" className="text-xs sm:text-sm">
            Not checked: {countNotSubmitted()}
          </Badge>
        </div>
      </div>

      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <table className="w-full text-xs sm:text-sm border min-w-[640px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-1 sm:p-2 text-left">Employee</th>
              <th className="p-1 sm:p-2 text-center">Shirt</th>
              <th className="p-1 sm:p-2 text-center">Pant</th>
              <th className="p-1 sm:p-2 text-center">Cap</th>
              <th className="p-1 sm:p-2 text-center">Shoes</th>
              <th className="p-1 sm:p-2 text-center">ID Card</th>
              <th className="p-1 sm:p-2 text-center">Nails</th>
              <th className="p-1 sm:p-2 text-center">S. Bangles</th>
              <th className="p-1 sm:p-2 text-center">Studs</th>
              <th className="p-1 sm:p-2 text-center">Shaving</th>
              <th className="p-1 sm:p-2 text-center">Haircut</th>
              <th className="p-1 sm:p-2 text-center">Apron</th>
              <th className="p-1 sm:p-2 text-center">Westcoat</th>
            </tr>
          </thead>
          <tbody>
            {presentEmployees.map(emp => {
              const gender = emp.gender || 'male';
              return (
                <tr key={emp._id} className="border-t">
                  <td className="p-1 sm:p-2">
                    <div className="font-medium text-xs sm:text-sm">{emp.name}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">{emp.employeeId}</div>
                    <div className="text-[8px] sm:text-[10px] text-muted-foreground">{gender}</div>
                  </td>
                  <td className="p-1 sm:p-2 text-center">{renderCheckbox(emp._id, "shirt")}</td>
                  <td className="p-1 sm:p-2 text-center">{renderCheckbox(emp._id, "pant")}</td>
                  <td className="p-1 sm:p-2 text-center">{renderCheckbox(emp._id, "cap")}</td>
                  <td className="p-1 sm:p-2 text-center">{renderCheckbox(emp._id, "shoes")}</td>
                  <td className="p-1 sm:p-2 text-center">{renderCheckbox(emp._id, "idCard")}</td>

                  {gender === 'female' ? (
                    <>
                      <td className="p-1 sm:p-2 text-center">{renderCheckbox(emp._id, "nails")}</td>
                      <td className="p-1 sm:p-2 text-center">{renderCheckbox(emp._id, "singleBangles")}</td>
                      <td className="p-1 sm:p-2 text-center">{renderCheckbox(emp._id, "studs")}</td>
                      <td className="p-1 sm:p-2 text-center">-</td>
                      <td className="p-1 sm:p-2 text-center">-</td>
                    </>
                  ) : (
                    <>
                      <td className="p-1 sm:p-2 text-center">{renderCheckbox(emp._id, "nails")}</td>
                      <td className="p-1 sm:p-2 text-center">-</td>
                      <td className="p-1 sm:p-2 text-center">-</td>
                      <td className="p-1 sm:p-2 text-center">{renderCheckbox(emp._id, "shaving")}</td>
                      <td className="p-1 sm:p-2 text-center">{renderCheckbox(emp._id, "haircut")}</td>
                    </>
                  )}
                  <td className="p-1 sm:p-2 text-center">{renderCheckbox(emp._id, "apron")}</td>
                  <td className="p-1 sm:p-2 text-center">{renderCheckbox(emp._id, "westcoat")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button onClick={saveAll} disabled={saving} className="w-full">
        {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
        {saving ? "Saving..." : "Save Today's Grooming Status"}
      </Button>
    </div>
  );
}