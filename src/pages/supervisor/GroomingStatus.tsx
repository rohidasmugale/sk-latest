import { useState, useEffect, useCallback, useRef } from "react";
import { BackButton } from "@/components/shared/BackButton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useRole } from "@/context/RoleContext";
import employeeService from "@/services/employeeService"; // ✅ Import the same service

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
  const today = new Date().toISOString().split("T")[0];

  const initialLoadDone = useRef(false);

  // ✅ STEP 1: Fetch employees directly from the Supervisor's employee list (Same as Attendance)
  const fetchEmployees = useCallback(async (): Promise<Employee[]> => {
    if (!currentUser) return [];
    try {
      const response = await employeeService.getSupervisorEmployees();
      const allSupervisorEmployees = response?.data || (response as any)?.employees || [];

      const activeEmployees = (Array.isArray(allSupervisorEmployees) ? allSupervisorEmployees : [])
        .filter((emp: any) => emp.status === 'active')
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

      console.log(`✅ Loaded ${activeEmployees.length} active employees for grooming.`);
      setEmployees(activeEmployees);
      return activeEmployees;
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
      return [];
    }
  }, [currentUser]);

  // ✅ STEP 2: Fetch present employees (attendance records) for today
  const fetchPresentEmployees = useCallback(async (empList: Employee[]) => {
    try {
      const res = await apiClient.get('/attendance', {
        params: { date: today, limit: 1000 }
      });
      let records = res.data?.data || res.data || [];
      if (!Array.isArray(records)) records = [];

      const presentIds = new Set<string>();
      records.forEach((rec: any) => {
        if (rec.status !== 'present' && rec.status !== 'half-day') return;

        // Match on _id, employeeId, or name
        const match = empList.find(e =>
          e._id === rec.employeeId ||
          e.employeeId === rec.employeeId ||
          e.name === rec.employeeName
        );
        if (match) presentIds.add(match._id);
      });

      console.log(`✅ Found ${presentIds.size} present employees today.`);
      setPresentEmployeeIds(presentIds);
      return presentIds;
    } catch (error) {
      console.error("Error fetching attendance:", error);
      return new Set<string>();
    }
  }, [today]);

  // ✅ STEP 3: Fetch grooming records for the present employees
  const fetchGroomingRecords = useCallback(async (empList: Employee[]) => {
    if (empList.length === 0) return;

    const map = new Map<string, GroomingRecord>();
    try {
      // Fetch grooming records for today (We don't need siteIds anymore)
      const res = await apiClient.get('/grooming', {
        params: { date: today }
      });
      const recordsArray = res.data?.data || res.data || [];

      recordsArray.forEach((r: GroomingRecord) => {
        map.set(r.employeeId, r);
      });

      setRecords(map);
      localStorage.setItem('grooming_backup', JSON.stringify(Array.from(map.values())));
    } catch (error) {
      console.warn("Failed to fetch grooming records, trying cache...");
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

  // Initial Load
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
      const presentIds = await fetchPresentEmployees(empList);

      if (empList.length > 0) {
        await fetchGroomingRecords(empList);
      }
      setLoading(false);
    };
    loadAll();
  }, [currentUser, isAuthenticated, fetchEmployees, fetchPresentEmployees, fetchGroomingRecords]);

  // Update checklist
  const updateChecklist = (empId: string, field: string, checked: boolean) => {
    setRecords(prev => {
      const employee = employees.find(e => e._id === empId);
      if (!employee) return prev;

      const gender = employee.gender || 'male';
      // Fallback to employee's siteId if it exists, otherwise just empty
      const employeeSiteId = employee.siteId || '';

      const getDefault = () => ({
        employeeId: empId,
        siteId: employeeSiteId,
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
      await apiClient.post('/grooming/batch', { records: payload });
      toast.success("Grooming status saved");
      await fetchGroomingRecords(employees);
    } catch (error: any) {
      console.error("Save error:", error);
      const message = error.response?.data?.message || error.message || "Network error";
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
          !rec.nails || !rec.singleBangles || !rec.studs) count++;
      } else {
        if (!rec.shirt || !rec.pant || !rec.cap || !rec.shoes || !rec.idCard ||
          !rec.shaving || !rec.haircut || !rec.nails) count++;
      }
    }
    return count;
  };

  const countNotSubmitted = () => {
    let count = 0;
    for (const emp of employees) {
      if (presentEmployeeIds.has(emp._id) && !records.has(emp._id)) count++;
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
          <Button variant="outline" size="sm" onClick={() => fetchGroomingRecords(employees)}>
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
          <thead className="bg-gray-50 dark:bg-gray-800">
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