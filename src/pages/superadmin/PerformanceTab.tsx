// src/components/hrms/tabs/DeductionListTab.tsx
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Download,
  IndianRupee,
  Loader2,
  RefreshCw,
  Building2,
  Calendar,
  TrendingUp,
  AlertCircle,
  CreditCard,
  HandCoins,
  Wallet,
  Calculator,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
} from "lucide-react";
import Pagination from "./Pagination";

// Dialog Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// Service
import deductionService, {
  type Deduction,
  type Employee,
  type DeductionStats,
} from "../../services/DeductionService";

// Import Site Service
import { siteService, type Site } from "@/services/SiteService";

// API URL
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

interface DeductionListTabProps {
  // Optional props if you need to manage deductions from parent component
}

// Helper function to calculate days between dates
const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return daysDiff + 1;
};

// Interface for attendance record
interface AttendanceRecord {
  _id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off';
  totalHours: number;
  siteName?: string;
}

// Interface for salary calculation result
interface SalaryCalculationResult {
  employeeId: string;
  employeeName: string;
  monthlySalary: number;
  perDaySalary: number;
  totalDaysInMonth: number;
  presentDays: number;
  absentDays: number;
  deductionAmount: number;
  finalSalary: number;
  attendanceRecords: AttendanceRecord[];
}

// Interface for Advance Form
interface AdvanceFormData {
  siteId: string;
  employeeId: string;
  advanceAmount: string;
  paymentDate: string;
  deductionType: 'monthly' | 'custom';
  monthlyEMI: string;
  customAmount: string;
  customStartDate: string;
  customEndDate: string;
  description: string;
  appliedMonth: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
}

// Interface for Advance Record
interface AdvanceRecord {
  _id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  advanceAmount: number;
  paymentDate: string;
  deductionType: 'monthly' | 'custom';
  monthlyEMI?: number;
  customAmount?: number;
  customStartDate?: string;
  customEndDate?: string;
  description: string;
  appliedMonth: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  remainingAmount: number;
  repaidAmount: number;
  nextInstallmentDate?: string;
  createdAt: string;
  updatedAt: string;
}

// Interface for Confirmation Dialog
interface ConfirmationDialogData {
  open: boolean;
  type: 'deduction' | 'advance';
  employeeId: string;
  employeeName: string;
  amount: number;
  deductionType?: string;
  monthlyDeduction?: number;
  description?: string;
  advanceData?: any;
  onConfirm: () => void;
}

// Interface for View Details Dialog
interface ViewDetailsDialogData {
  open: boolean;
  type: 'deduction' | 'advance';
  data: any;
}

const DeductionListTab = ({}: DeductionListTabProps) => {
  // State
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [advances, setAdvances] = useState<AdvanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [showAdvances, setShowAdvances] = useState<boolean>(false);
  const [viewDetailsDialog, setViewDetailsDialog] = useState<ViewDetailsDialogData>({
    open: false,
    type: 'deduction',
    data: null,
  });
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogData>({
    open: false,
    type: 'deduction',
    employeeId: '',
    employeeName: '',
    amount: 0,
    onConfirm: () => {},
  });
  
  // Attendance and salary calculation states
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [salaryCalculations, setSalaryCalculations] = useState<Map<string, SalaryCalculationResult>>(new Map());
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  const [deductionPage, setDeductionPage] = useState(1);
  const [advancePage, setAdvancePage] = useState(1);
  const [deductionItemsPerPage, setDeductionItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isAddingDeduction, setIsAddingDeduction] = useState(false);
  const [isAddingAdvance, setIsAddingAdvance] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<Deduction | null>(null);
  const [editingAdvance, setEditingAdvance] = useState<AdvanceRecord | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    deduction: Deduction | null;
    advance: AdvanceRecord | null;
    type: 'deduction' | 'advance';
  }>({ open: false, deduction: null, advance: null, type: 'deduction' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalDeductionsCount, setTotalDeductionsCount] = useState(0);
  const [totalAdvancesCount, setTotalAdvancesCount] = useState(0);

  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [deductionStats, setDeductionStats] = useState<DeductionStats>({
    totalDeductions: 0,
    totalAdvances: 0,
    totalFines: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    completedCount: 0,
  });

  // Advance Form state
  const [advanceForm, setAdvanceForm] = useState<AdvanceFormData>({
    siteId: "",
    employeeId: "",
    advanceAmount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    deductionType: "monthly",
    monthlyEMI: "",
    customAmount: "",
    customStartDate: new Date().toISOString().split("T")[0],
    customEndDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split("T")[0],
    description: "",
    appliedMonth: new Date().toISOString().slice(0, 7),
    status: "pending",
  });

  // Deduction form state
  const [deductionForm, setDeductionForm] = useState({
    employeeId: "",
    siteId: "",
    type: "fine" as "fine" | "other",
    amount: "",
    description: "",
    deductionDate: new Date().toISOString().split("T")[0],
    status: "pending" as "pending" | "approved" | "rejected" | "completed",
    appliedMonth: new Date().toISOString().slice(0, 7),
    fineReason: "",
    otherReason: "",
  });

  // Use refs to track mounted state
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch attendance records for selected month
  const fetchAttendanceRecords = useCallback(async (month: string) => {
    if (!month) return [];
    
    setIsLoadingAttendance(true);
    try {
      const [year, monthNum] = month.split('-');
      const startDate = `${year}-${monthNum}-01`;
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0];
      
      console.log(`Fetching attendance records from ${startDate} to ${endDate}`);
      
      const response = await fetch(
        `${API_URL}/attendance?startDate=${startDate}&endDate=${endDate}&limit=10000`
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      let records: AttendanceRecord[] = [];
      
      if (data.success && Array.isArray(data.data)) {
        records = data.data;
      } else if (Array.isArray(data)) {
        records = data;
      } else if (data.attendance && Array.isArray(data.attendance)) {
        records = data.attendance;
      }
      
      const transformedRecords: AttendanceRecord[] = records.map((record: any) => ({
        _id: record._id || record.id,
        employeeId: record.employeeId || record.employee?._id || '',
        employeeName: record.employeeName || record.employee?.name || '',
        date: record.date,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        status: record.status?.toLowerCase() || 'absent',
        totalHours: Number(record.totalHours) || 0,
        siteName: record.siteName || record.site || ''
      }));
      
      console.log(`Loaded ${transformedRecords.length} attendance records for ${month}`);
      setAttendanceRecords(transformedRecords);
      return transformedRecords;
    } catch (error: any) {
      console.error('Error fetching attendance records:', error);
      toast.error('Failed to fetch attendance records', {
        description: error.message || 'Please try again'
      });
      return [];
    } finally {
      setIsLoadingAttendance(false);
    }
  }, []);

  // Calculate salary for an employee based on attendance
  const calculateEmployeeSalary = useCallback((
    employee: Employee,
    attendanceRecords: AttendanceRecord[],
    month: string
  ): SalaryCalculationResult => {
    const monthlySalary = typeof employee.salary === 'number' 
      ? employee.salary 
      : parseFloat(employee.salary as string) || 0;
    
    const employeeAttendance = attendanceRecords.filter(
      record => record.employeeId === employee.employeeId || record.employeeId === employee._id
    );
    
    const [year, monthNum] = month.split('-');
    const totalDaysInMonth = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
    
    const presentDays = employeeAttendance.filter(
      record => record.status === 'present'
    ).length;
    
    const absentDays = totalDaysInMonth - presentDays;
    const perDaySalary = monthlySalary / totalDaysInMonth;
    const deductionAmount = absentDays * perDaySalary;
    const finalSalary = monthlySalary - deductionAmount;
    
    return {
      employeeId: employee.employeeId || employee._id || '',
      employeeName: employee.name,
      monthlySalary,
      perDaySalary,
      totalDaysInMonth,
      presentDays,
      absentDays,
      deductionAmount,
      finalSalary,
      attendanceRecords: employeeAttendance
    };
  }, []);

  // Calculate all employee salaries
  const calculateAllSalaries = useCallback(async () => {
    if (!selectedMonth || employees.length === 0) return;
    
    setIsLoadingAttendance(true);
    try {
      const attendance = await fetchAttendanceRecords(selectedMonth);
      
      const calculations = new Map<string, SalaryCalculationResult>();
      
      employees.forEach(employee => {
        const calculation = calculateEmployeeSalary(employee, attendance, selectedMonth);
        calculations.set(employee.employeeId || employee._id || '', calculation);
      });
      
      setSalaryCalculations(calculations);
      console.log(`Calculated salaries for ${calculations.size} employees`);
    } catch (error) {
      console.error('Error calculating salaries:', error);
    } finally {
      setIsLoadingAttendance(false);
    }
  }, [selectedMonth, employees, fetchAttendanceRecords, calculateEmployeeSalary]);

  // Calculate when month or employees change
  useEffect(() => {
    calculateAllSalaries();
  }, [selectedMonth, employees, calculateAllSalaries]);

  // Filter employees based on selected site ID - for deduction form
  const filterEmployeesBySite = useCallback((siteId: string) => {
    if (!siteId || siteId === "") {
      setFilteredEmployees(employees);
      return;
    }
    
    const selectedSite = sites.find(site => site._id === siteId);
    if (selectedSite && selectedSite.name) {
      const filtered = employees.filter(emp => 
        emp.siteName && emp.siteName.toLowerCase() === selectedSite.name.toLowerCase()
      );
      console.log(`Filtered employees for site "${selectedSite.name}": ${filtered.length} employees`);
      console.log("Filtered employees:", filtered.map(e => ({ name: e.name, siteName: e.siteName })));
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [employees, sites]);

  // When deduction form site changes, filter employees
  useEffect(() => {
    filterEmployeesBySite(deductionForm.siteId);
  }, [deductionForm.siteId, filterEmployeesBySite]);

  // When advance form site changes, filter employees
  useEffect(() => {
    if (advanceForm.siteId && advanceForm.siteId !== "") {
      const selectedSite = sites.find(site => site._id === advanceForm.siteId);
      if (selectedSite && selectedSite.name) {
        const filtered = employees.filter(emp => 
          emp.siteName && emp.siteName.toLowerCase() === selectedSite.name.toLowerCase()
        );
        console.log(`Advance form - Filtered employees for site "${selectedSite.name}": ${filtered.length} employees`);
        setFilteredEmployees(filtered);
      } else {
        setFilteredEmployees(employees);
      }
    } else {
      setFilteredEmployees(employees);
    }
  }, [advanceForm.siteId, employees, sites]);

  const fetchDeductions = useCallback(
    async (forceRefresh = false) => {
      console.log("Fetching deductions...", {
        page: deductionPage,
        limit: deductionItemsPerPage,
        statusFilter,
        typeFilter,
        searchTerm,
      });

      setIsLoading(true);
      try {
        const params: any = {
          page: deductionPage,
          limit: deductionItemsPerPage,
        };

        if (statusFilter !== "all") params.status = statusFilter;
        if (typeFilter !== "all") params.type = typeFilter;
        if (searchTerm) params.search = searchTerm;

        console.log("API params:", params);

        const response = await fetch(
          `${API_URL}/deductions/deductions?${new URLSearchParams(params).toString()}`
        );

        if (!response.ok) {
          throw new Error(
            `API Error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log("API Response data:", data);

        if (!isMounted.current) return;

        if (data.success) {
          const transformedDeductions = data.data
            .filter((deduction: any) => deduction.type !== 'advance')
            .map((deduction: any) => {
              const employeeDetails = deduction.employeeDetails || {};
              return {
                id: deduction._id,
                employeeId:
                  deduction.employeeId || employeeDetails.employeeId || "",
                employeeName:
                  deduction.employeeName || employeeDetails.name || "",
                employeeCode:
                  deduction.employeeCode || employeeDetails.employeeId || "",
                type: deduction.type,
                amount: deduction.amount,
                description: deduction.description || "",
                deductionDate: deduction.deductionDate
                  ? new Date(deduction.deductionDate).toISOString().split("T")[0]
                  : new Date().toISOString().split("T")[0],
                status: deduction.status,
                appliedMonth: deduction.appliedMonth,
                createdAt: deduction.createdAt,
                updatedAt: deduction.updatedAt,
              };
            });

          console.log("Transformed deductions:", transformedDeductions);

          setDeductions(transformedDeductions);
          
          const totalFromApi = data.pagination?.totalItems || 0;
          console.log("Total deductions from API:", totalFromApi);
          setTotalDeductionsCount(totalFromApi);
        } else {
          toast.error("Failed to fetch deductions", {
            description: data.message || "Please try again",
          });
        }
      } catch (error: any) {
        console.error("Error fetching deductions:", error);
        toast.error("Network Error", {
          description: "Unable to connect to the server.",
        });
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    },
    [deductionPage, deductionItemsPerPage, statusFilter, typeFilter, searchTerm]
  );

  // Fetch advances from API
  const fetchAdvances = useCallback(async () => {
    console.log("Fetching advances...");
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/deductions/advances?limit=1000`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!isMounted.current) return;
      
      if (data.success && Array.isArray(data.data)) {
        const transformedAdvances: AdvanceRecord[] = data.data.map((advance: any) => ({
          _id: advance._id,
          employeeId: advance.employeeId,
          employeeName: advance.employeeName,
          employeeCode: advance.employeeCode,
          advanceAmount: advance.advanceAmount,
          paymentDate: advance.paymentDate,
          deductionType: advance.deductionType,
          monthlyEMI: advance.monthlyEMI,
          customAmount: advance.customAmount,
          customStartDate: advance.customStartDate,
          customEndDate: advance.customEndDate,
          description: advance.description,
          appliedMonth: advance.appliedMonth,
          status: advance.status,
          remainingAmount: advance.remainingAmount,
          repaidAmount: advance.repaidAmount,
          nextInstallmentDate: advance.nextInstallmentDate,
          createdAt: advance.createdAt,
          updatedAt: advance.updatedAt,
        }));
        
        setAdvances(transformedAdvances);
        setTotalAdvancesCount(transformedAdvances.length);
        console.log(`Loaded ${transformedAdvances.length} advances`);
      } else {
        setAdvances([]);
        setTotalAdvancesCount(0);
      }
    } catch (error: any) {
      console.error("Error fetching advances:", error);
      toast.error("Failed to fetch advances", {
        description: error.message || "Please try again",
      });
      setAdvances([]);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Fetch sites from API
  const fetchSites = useCallback(async () => {
    setIsLoadingSites(true);
    try {
      console.log("Fetching sites from API...");
      const sitesData = await siteService.getAllSites();
      console.log("Sites fetched:", sitesData);
      
      if (!isMounted.current) return;
      
      setSites(sitesData || []);
      
      if (sitesData && sitesData.length > 0 && !selectedSiteId) {
        setSelectedSiteId(sitesData[0]._id);
      }
    } catch (error: any) {
      console.error("Error fetching sites:", error);
      toast.error("Failed to fetch sites", {
        description: error.message || "Please check your connection",
      });
      setSites([]);
    } finally {
      if (isMounted.current) {
        setIsLoadingSites(false);
      }
    }
  }, [selectedSiteId]);

  // Fetch employees from API
  const fetchEmployees = useCallback(async (forceRefresh = false) => {
    setIsLoadingEmployees(true);
    try {
      console.log("Fetching employees from API...");
      
      const response = await fetch(`${API_URL}/employees?limit=1000`);
      
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`http Error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Employees API response structure:", data);

      if (!isMounted.current) return;

      if (data.success) {
        const employeesArray = data.data || data.employees || data.result || [];
        
        console.log("Employees array length:", employeesArray.length);
        
        if (!Array.isArray(employeesArray)) {
          console.error("Employees data is not an array:", employeesArray);
          toast.error("Data Format Error", {
            description: "Employees data is not in expected array format",
          });
          setEmployees([]);
          return;
        }

        const transformedEmployees = employeesArray
          .filter((employee: any) => employee && (employee._id || employee.id))
          .map((employee: any) => ({
            id: employee._id || employee.id || '',
            _id: employee._id || employee.id || '',
            employeeId: employee.employeeId || employee.code || employee.empId || "",
            name: employee.name || employee.fullName || employee.employeeName || "",
            department: employee.department || employee.dept || "",
            status: employee.status || employee.empStatus || "active",
            designation: employee.designation || employee.position || employee.role || "",
            position: employee.position || employee.designation || employee.role || "",
            email: employee.email || employee.emailId || "",
            phone: employee.phone || employee.phoneNumber || employee.mobile || "",
            salary: employee.salary || employee.baseSalary || 0,
            siteName: employee.siteName || employee.site || "",
            joinDate: employee.dateOfJoining || employee.joiningDate || employee.startDate
              ? new Date(employee.dateOfJoining || employee.joiningDate || employee.startDate).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
          }));

        console.log(`Transformed ${transformedEmployees.length} employees`);
        console.log("Employees with site names:", transformedEmployees.map(e => ({ name: e.name, siteName: e.siteName })));
        setEmployees(transformedEmployees);
        
        if (transformedEmployees.length > 0) {
          console.log("Employees loaded successfully");
        } else {
          console.warn("No employees found in response");
        }
      } else {
        console.error("API returned success=false:", data);
        toast.error("Failed to fetch employees", {
          description: data.message || data.error || "Please check API response",
        });
        setEmployees([]);
      }
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      
      if (error.message.includes('Failed to fetch')) {
        toast.error("Connection Error", {
          description: "Unable to connect to the server. Please ensure:\n1. Backend is running on port 5001\n2. CORS is properly configured\n3. Network connection is stable",
        });
      } else {
        toast.error("API Error", {
          description: error.message || "Unable to fetch employees",
        });
      }
      setEmployees([]);
    } finally {
      if (isMounted.current) {
        setIsLoadingEmployees(false);
      }
    }
  }, []);

  // Fetch deduction statistics
  const fetchDeductionStats = useCallback(async () => {
    try {
     const response = await fetch(`${API_URL}/deductions/deductions/stats`);
        
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          console.log("Stats from API:", data.data);
          setDeductionStats(data.data);
          return;
        }
      }
      
      // Calculate stats from deductions and advances
      let totalAdvancesAmount = advances.reduce((sum, adv) => sum + adv.advanceAmount, 0);
      let totalFinesAmount = deductions.reduce((sum, ded) => sum + (ded.type === 'fine' ? ded.amount : 0), 0);
      let totalDeductionsAmount = totalAdvancesAmount + totalFinesAmount + 
        deductions.reduce((sum, ded) => sum + (ded.type === 'other' ? ded.amount : 0), 0);
      
      setDeductionStats({
        totalDeductions: totalDeductionsAmount,
        totalAdvances: totalAdvancesAmount,
        totalFines: totalFinesAmount,
        pendingCount: deductions.filter(d => d.status === 'pending').length + advances.filter(a => a.status === 'pending').length,
        approvedCount: deductions.filter(d => d.status === 'approved').length + advances.filter(a => a.status === 'approved').length,
        rejectedCount: deductions.filter(d => d.status === 'rejected').length + advances.filter(a => a.status === 'rejected').length,
        completedCount: deductions.filter(d => d.status === 'completed').length + advances.filter(a => a.status === 'completed').length,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [deductions, advances]);

  // Load employees, sites, and deductions on component mount
  useEffect(() => {
    fetchSites();
    fetchEmployees();
    fetchDeductions();
    fetchAdvances();
  }, [fetchSites, fetchEmployees, fetchDeductions, fetchAdvances]);

  // Load deductions when filters or pagination changes
  useEffect(() => {
    fetchDeductions();
  }, [
    deductionPage,
    deductionItemsPerPage,
    statusFilter,
    typeFilter,
    fetchDeductions,
  ]);

  // Load stats when deductions or advances change
  useEffect(() => {
    fetchDeductionStats();
  }, [deductions, advances, fetchDeductionStats]);

  // Filtered data based on view type
  const filteredDataList = useMemo(() => {
    if (showAdvances) {
      return advances.filter((advance) => {
        const employee = employees.find(emp => emp.employeeId === advance.employeeId);
        const matchesSearch =
          employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          advance.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          advance.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          advance.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === "all" || advance.status === statusFilter;

        return matchesSearch && matchesStatus;
      });
    } else {
      return deductions.filter((deduction) => {
        if (!deduction) return false;

        const employee = employees.find(
          (emp) => emp && emp.employeeId === deduction.employeeId
        );
        const matchesSearch =
          employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee?.employeeId
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          deduction.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === "all" || deduction.status === statusFilter;
        const matchesType = typeFilter === "all" || deduction.type === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
      });
    }
  }, [showAdvances, deductions, advances, employees, searchTerm, statusFilter, typeFilter]);

  const paginatedData = filteredDataList.slice(
    ((showAdvances ? advancePage : deductionPage) - 1) * deductionItemsPerPage,
    (showAdvances ? advancePage : deductionPage) * deductionItemsPerPage
  );

  const totalItems = showAdvances ? totalAdvancesCount : totalDeductionsCount;
  const currentPage = showAdvances ? advancePage : deductionPage;
  const setCurrentPage = showAdvances ? setAdvancePage : setDeductionPage;

  // Get monthly deduction amount for an employee
  const getMonthlyDeductionAmount = (employeeId: string, month: string): number => {
    const employeeAdvances = advances.filter(adv => adv.employeeId === employeeId && adv.status !== 'rejected');
    let totalMonthlyDeduction = 0;
    
    employeeAdvances.forEach(advance => {
      if (advance.deductionType === 'monthly' && advance.monthlyEMI) {
        totalMonthlyDeduction += advance.monthlyEMI;
      } else if (advance.deductionType === 'custom' && advance.customAmount) {
        const currentDate = new Date(month + '-01');
        const startDate = new Date(advance.customStartDate || '');
        const endDate = new Date(advance.customEndDate || '');
        
        if (currentDate >= startDate && currentDate <= endDate) {
          totalMonthlyDeduction += advance.customAmount;
        }
      }
    });
    
    return totalMonthlyDeduction;
  };

  // Show confirmation dialog before adding deduction
  const showConfirmationBeforeDeduction = (deductionData: any, employee: Employee, salaryCalc: SalaryCalculationResult | undefined) => {
    const monthlyDeduction = getMonthlyDeductionAmount(deductionData.employeeId, deductionData.appliedMonth);
    const finalAfterAdvance = salaryCalc ? salaryCalc.finalSalary - monthlyDeduction : 0;
    const amount = parseFloat(deductionData.amount);
    
    setConfirmationDialog({
      open: true,
      type: 'deduction',
      employeeId: deductionData.employeeId,
      employeeName: employee.name,
      amount: amount,
      deductionType: deductionData.type === 'fine' ? 'Fine/Penalty' : 'Other Deduction',
      monthlyDeduction: monthlyDeduction,
      description: deductionData.description,
      onConfirm: () => {
        setConfirmationDialog({ ...confirmationDialog, open: false });
        executeAddDeduction(deductionData, employee, salaryCalc);
      },
    });
  };

  // Execute deduction after confirmation
  const executeAddDeduction = async (deductionData: any, employee: Employee, salaryCalc: SalaryCalculationResult | undefined) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${API_URL}/deductions/deductions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deductionData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API Error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Create deduction response:", data);

      if (data.success) {
        const employeeDetails = data.data.employeeDetails || {};
        const newDeduction = {
          id: data.data._id,
          employeeId: data.data.employeeId || employeeDetails.employeeId || "",
          employeeName: data.data.employeeName || employeeDetails.name || "",
          employeeCode: data.data.employeeCode || employeeDetails.employeeId || "",
          type: data.data.type,
          amount: data.data.amount,
          description: data.data.description || "",
          deductionDate: data.data.deductionDate
            ? new Date(data.data.deductionDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          status: data.data.status,
          appliedMonth: data.data.appliedMonth,
          createdAt: data.data.createdAt,
          updatedAt: data.data.updatedAt,
        };

        setDeductions((prev) => [newDeduction, ...(prev || [])]);
        setIsAddingDeduction(false);
        resetDeductionForm();

        toast.success("Success", {
          description: data.message || "Deduction added successfully!",
        });

        fetchDeductions(true);
        fetchDeductionStats();
      } else {
        toast.error("Failed to add deduction", {
          description: data.message || "Please try again",
        });
      }
    } catch (error: any) {
      console.error("Error adding deduction:", error);
      toast.error("Network Error", {
        description:
          error.message ||
          "Unable to save deduction. Please check your connection.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add new deduction (non-advance) with confirmation
  const handleAddDeduction = async () => {
    if (!deductionForm.employeeId || !deductionForm.amount) {
      toast.error("Validation Error", {
        description: "Please fill in all required fields (Employee and Amount)",
      });
      return;
    }

    const employee = filteredEmployees.find(
      (emp) => emp.employeeId === deductionForm.employeeId
    );
    
    if (!employee) {
      toast.error("Employee Not Found", {
        description: "Selected employee not found",
      });
      return;
    }

    const salaryCalc = salaryCalculations.get(employee.employeeId || employee._id || '');
    const deductionAmount = parseFloat(deductionForm.amount);
    const monthlyDeduction = getMonthlyDeductionAmount(deductionForm.employeeId, deductionForm.appliedMonth);
    const finalAfterAdvance = salaryCalc ? salaryCalc.finalSalary - monthlyDeduction : 0;
    
    if (salaryCalc && deductionAmount > finalAfterAdvance) {
      toast.error("Deduction amount exceeds employee's final salary", {
        description: `Employee's final salary after attendance and advance deduction is ₹${deductionService.formatCurrency(finalAfterAdvance)}. Please reduce the deduction amount.`,
      });
      return;
    }

    // Build description with amount and reason
    let description = deductionForm.description || '';
    if (deductionForm.type === 'fine') {
      if (deductionForm.fineReason) {
        description = description ? `${description} - Amount: ₹${deductionForm.amount} | Reason: ${deductionForm.fineReason}` : `Amount: ₹${deductionForm.amount} | Reason: ${deductionForm.fineReason}`;
      } else {
        description = description ? `${description} - Amount: ₹${deductionForm.amount}` : `Amount: ₹${deductionForm.amount}`;
      }
    } else if (deductionForm.type === 'other') {
      if (deductionForm.otherReason) {
        description = description ? `${description} - Amount: ₹${deductionForm.amount} | Reason: ${deductionForm.otherReason}` : `Amount: ₹${deductionForm.amount} | Reason: ${deductionForm.otherReason}`;
      } else {
        description = description ? `${description} - Amount: ₹${deductionForm.amount}` : `Amount: ₹${deductionForm.amount}`;
      }
    }

    const deductionData = {
      employeeId: deductionForm.employeeId,
      employeeName: employee.name,
      employeeCode: employee.employeeId,
      type: deductionForm.type,
      amount: deductionAmount,
      description: description,
      deductionDate: deductionForm.deductionDate,
      status: deductionForm.status,
      appliedMonth: deductionForm.appliedMonth,
    };

    // Show confirmation dialog before proceeding
    showConfirmationBeforeDeduction(deductionData, employee, salaryCalc);
  };

  // Show confirmation before adding advance
  const showConfirmationBeforeAdvance = (advanceData: any, employee: Employee) => {
    const monthlyDeductionAmount = advanceData.deductionType === 'monthly' ? advanceData.monthlyEMI : advanceData.customAmount;
    
    setConfirmationDialog({
      open: true,
      type: 'advance',
      employeeId: advanceData.employeeId,
      employeeName: employee.name,
      amount: advanceData.advanceAmount,
      deductionType: advanceData.deductionType === 'monthly' ? `Monthly EMI (₹${advanceData.monthlyEMI}/month)` : `Custom Deduction (₹${advanceData.customAmount}/month)`,
      monthlyDeduction: monthlyDeductionAmount,
      description: advanceData.description,
      advanceData: advanceData,
      onConfirm: () => {
        setConfirmationDialog({ ...confirmationDialog, open: false });
        executeAddAdvance(advanceData, employee);
      },
    });
  };

  // Execute advance after confirmation
  const executeAddAdvance = async (advanceData: any, employee: Employee) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${API_URL}/deductions/advances`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(advanceData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API Error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Create advance response:", data);

      if (data.success) {
        const newAdvance: AdvanceRecord = {
          _id: data.data._id,
          employeeId: data.data.employeeId,
          employeeName: data.data.employeeName,
          employeeCode: data.data.employeeCode,
          advanceAmount: data.data.advanceAmount,
          paymentDate: data.data.paymentDate,
          deductionType: data.data.deductionType,
          monthlyEMI: data.data.monthlyEMI,
          customAmount: data.data.customAmount,
          customStartDate: data.data.customStartDate,
          customEndDate: data.data.customEndDate,
          description: data.data.description,
          appliedMonth: data.data.appliedMonth,
          status: data.data.status,
          remainingAmount: data.data.remainingAmount,
          repaidAmount: data.data.repaidAmount,
          nextInstallmentDate: data.data.nextInstallmentDate,
          createdAt: data.data.createdAt,
          updatedAt: data.data.updatedAt,
        };

        setAdvances((prev) => [newAdvance, ...(prev || [])]);
        setIsAddingAdvance(false);
        resetAdvanceForm();

        toast.success("Success", {
          description: data.message || "Salary advance added successfully!",
        });

        fetchAdvances();
        fetchDeductionStats();
      } else {
        toast.error("Failed to add advance", {
          description: data.message || "Please try again",
        });
      }
    } catch (error: any) {
      console.error("Error adding advance:", error);
      toast.error("Network Error", {
        description:
          error.message ||
          "Unable to save advance. Please check your connection.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Add Advance with confirmation
  const handleAddAdvance = async () => {
    if (!advanceForm.employeeId || !advanceForm.advanceAmount) {
      toast.error("Validation Error", {
        description: "Please fill in all required fields (Employee and Advance Amount)",
      });
      return;
    }

    const employee = filteredEmployees.find(
      (emp) => emp.employeeId === advanceForm.employeeId
    );
    
    if (!employee) {
      toast.error("Employee Not Found", {
        description: "Selected employee not found",
      });
      return;
    }

    const advanceAmountValue = parseFloat(advanceForm.advanceAmount);
    
    let monthlyEMI = 0;
    let customAmount = 0;
    
    if (advanceForm.deductionType === 'monthly' && advanceForm.monthlyEMI) {
      monthlyEMI = parseFloat(advanceForm.monthlyEMI);
    } else if (advanceForm.deductionType === 'custom' && advanceForm.customAmount) {
      customAmount = parseFloat(advanceForm.customAmount);
    }

    const advanceData = {
      employeeId: advanceForm.employeeId,
      employeeName: employee.name,
      employeeCode: employee.employeeId,
      advanceAmount: advanceAmountValue,
      paymentDate: advanceForm.paymentDate,
      deductionType: advanceForm.deductionType,
      monthlyEMI: monthlyEMI,
      customAmount: customAmount,
      customStartDate: advanceForm.customStartDate,
      customEndDate: advanceForm.customEndDate,
      description: advanceForm.description || `Salary Advance - ${advanceForm.deductionType === 'monthly' ? 'Monthly EMI' : 'Custom Deduction'}`,
      appliedMonth: advanceForm.appliedMonth,
      status: advanceForm.status,
      remainingAmount: advanceAmountValue,
      repaidAmount: 0,
      nextInstallmentDate: advanceForm.paymentDate,
    };

    // Show confirmation dialog
    showConfirmationBeforeAdvance(advanceData, employee);
  };

  // Update deduction
  const handleUpdateDeduction = async () => {
    if (!editingDeduction) return;

    setIsSubmitting(true);
    try {
      const employee = filteredEmployees.find(
        (emp) => emp.employeeId === deductionForm.employeeId
      );

      if (!employee) {
        toast.error("Employee Not Found", {
          description: "Selected employee not found",
        });
        return;
      }

      // Build description with amount and reason
      let description = deductionForm.description || '';
      if (deductionForm.type === 'fine') {
        if (deductionForm.fineReason) {
          description = description ? `${description} - Amount: ₹${deductionForm.amount} | Reason: ${deductionForm.fineReason}` : `Amount: ₹${deductionForm.amount} | Reason: ${deductionForm.fineReason}`;
        } else {
          description = description ? `${description} - Amount: ₹${deductionForm.amount}` : `Amount: ₹${deductionForm.amount}`;
        }
      } else if (deductionForm.type === 'other') {
        if (deductionForm.otherReason) {
          description = description ? `${description} - Amount: ₹${deductionForm.amount} | Reason: ${deductionForm.otherReason}` : `Amount: ₹${deductionForm.amount} | Reason: ${deductionForm.otherReason}`;
        } else {
          description = description ? `${description} - Amount: ₹${deductionForm.amount}` : `Amount: ₹${deductionForm.amount}`;
        }
      }

      const updateData = {
        employeeId: deductionForm.employeeId,
        employeeName: employee.name,
        employeeCode: employee.employeeId,
        type: deductionForm.type,
        amount: parseFloat(deductionForm.amount),
        description: description,
        deductionDate: deductionForm.deductionDate,
        status: deductionForm.status,
        appliedMonth: deductionForm.appliedMonth,
      };

      console.log(`Updating deduction ${editingDeduction.id}:`, updateData);

      const response = await fetch(
        `${API_URL}/deductions/deductions/${editingDeduction.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const altResponse = await fetch(
          `${API_URL}/deductions/${editingDeduction.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
          }
        );

        if (!altResponse.ok) {
          throw new Error(
            `API Error: ${response.status} ${response.statusText}`
          );
        }

        const data = await altResponse.json();

        if (data.success) {
          const updatedDeduction = {
            id: data.data._id,
            employeeId: data.data.employeeId,
            employeeName: data.data.employeeName,
            employeeCode: data.data.employeeCode,
            type: data.data.type,
            amount: data.data.amount,
            description: data.data.description || "",
            deductionDate: data.data.deductionDate
              ? new Date(data.data.deductionDate).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
            status: data.data.status,
            appliedMonth: data.data.appliedMonth,
            createdAt: data.data.createdAt,
            updatedAt: data.data.updatedAt,
          };

          setDeductions((prev) =>
            (prev || []).map((d) =>
              d.id === updatedDeduction.id ? updatedDeduction : d
            )
          );
          setEditingDeduction(null);
          resetDeductionForm();

          toast.success("Success", {
            description: data.message || "Deduction updated successfully!",
          });

          fetchDeductions(true);
          fetchDeductionStats();
        }
      } else {
        const data = await response.json();

        if (data.success) {
          const updatedDeduction = {
            id: data.data._id,
            employeeId: data.data.employeeId,
            employeeName: data.data.employeeName,
            employeeCode: data.data.employeeCode,
            type: data.data.type,
            amount: data.data.amount,
            description: data.data.description || "",
            deductionDate: data.data.deductionDate
              ? new Date(data.data.deductionDate).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
            status: data.data.status,
            appliedMonth: data.data.appliedMonth,
            createdAt: data.data.createdAt,
            updatedAt: data.data.updatedAt,
          };

          setDeductions((prev) =>
            (prev || []).map((d) =>
              d.id === updatedDeduction.id ? updatedDeduction : d
            )
          );
          setEditingDeduction(null);
          resetDeductionForm();

          toast.success("Success", {
            description: data.message || "Deduction updated successfully!",
          });

          fetchDeductions(true);
          fetchDeductionStats();
        }
      }
    } catch (error: any) {
      console.error("Error updating deduction:", error);
      toast.error("Network Error", {
        description:
          error.message ||
          "Unable to update deduction. Please check your connection.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete deduction or advance
  const handleDeleteItem = async () => {
    if (deleteDialog.type === 'deduction' && deleteDialog.deduction) {
      try {
        console.log(`Deleting deduction ${deleteDialog.deduction.id}`);

        const response = await fetch(
          `${API_URL}/deductions/deductions/${deleteDialog.deduction.id}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setDeductions((prev) => (prev || []).filter((d) => d.id !== deleteDialog.deduction?.id));
          setDeleteDialog({ open: false, deduction: null, advance: null, type: 'deduction' });

          toast.success("Success", {
            description: data.message || "Deduction deleted successfully!",
          });

          fetchDeductions(true);
          fetchDeductionStats();
        } else {
          toast.error("Failed to delete deduction", {
            description: data.message || "Please try again",
          });
        }
      } catch (error: any) {
        console.error("Error deleting deduction:", error);
        toast.error("Network Error", {
          description: error.message || "Unable to delete deduction. Please check your connection.",
        });
      }
    } else if (deleteDialog.type === 'advance' && deleteDialog.advance) {
      try {
        console.log(`Deleting advance ${deleteDialog.advance._id}`);

        const response = await fetch(
          `${API_URL}/deductions/advances/${deleteDialog.advance._id}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setAdvances((prev) => (prev || []).filter((a) => a._id !== deleteDialog.advance?._id));
          setDeleteDialog({ open: false, deduction: null, advance: null, type: 'deduction' });

          toast.success("Success", {
            description: data.message || "Advance deleted successfully!",
          });

          fetchAdvances();
          fetchDeductionStats();
        } else {
          toast.error("Failed to delete advance", {
            description: data.message || "Please try again",
          });
        }
      } catch (error: any) {
        console.error("Error deleting advance:", error);
        toast.error("Network Error", {
          description: error.message || "Unable to delete advance. Please check your connection.",
        });
      }
    }
  };

  // Edit deduction
  const handleEditDeduction = (deduction: Deduction) => {
    setEditingDeduction(deduction);
    
    let fineReason = '';
    let otherReason = '';
    let cleanDescription = deduction.description || '';
    
    // Extract amount and reason from description
    const reasonMatch = deduction.description?.match(/Reason: (.+)$/);
    if (reasonMatch) {
      if (deduction.type === 'fine') {
        fineReason = reasonMatch[1];
      } else if (deduction.type === 'other') {
        otherReason = reasonMatch[1];
      }
      cleanDescription = deduction.description?.replace(/Amount: ₹[\d,]+( \| Reason: .+)?$/, '').trim() || '';
    }
    
    setDeductionForm({
      employeeId: deduction.employeeId.toString(),
      siteId: "",
      type: deduction.type,
      amount: deduction.amount.toString(),
      description: cleanDescription,
      deductionDate: deduction.deductionDate || new Date().toISOString().split("T")[0],
      status: deduction.status,
      appliedMonth: deduction.appliedMonth || new Date().toISOString().slice(0, 7),
      fineReason: fineReason,
      otherReason: otherReason,
    });
  };

  // Reset deduction form
  const resetDeductionForm = () => {
    setDeductionForm({
      employeeId: "",
      siteId: "",
      type: "fine",
      amount: "",
      description: "",
      deductionDate: new Date().toISOString().split("T")[0],
      status: "pending",
      appliedMonth: new Date().toISOString().slice(0, 7),
      fineReason: "",
      otherReason: "",
    });
  };

  // Reset advance form
  const resetAdvanceForm = () => {
    setAdvanceForm({
      siteId: "",
      employeeId: "",
      advanceAmount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      deductionType: "monthly",
      monthlyEMI: "",
      customAmount: "",
      customStartDate: new Date().toISOString().split("T")[0],
      customEndDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split("T")[0],
      description: "",
      appliedMonth: new Date().toISOString().slice(0, 7),
      status: "pending",
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const badgeClass = deductionService.getStatusBadgeClass(status);

    return (
      <Badge variant="secondary" className={badgeClass}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Get type badge
  const getTypeBadge = (type: string) => {
    if (type === 'fine') {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
          Fine/Penalty
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
        Other Deduction
      </Badge>
    );
  };

  // Export data to CSV
  const handleExportData = () => {
    if (filteredDataList.length === 0) {
      toast.error("No Data", {
        description: "No data to export",
      });
      return;
    }

    let headers: string[] = [];
    let rows: string[][] = [];

    if (showAdvances) {
      headers = [
        'Employee ID',
        'Employee Name',
        'Advance Amount',
        'Payment Date',
        'Deduction Type',
        'Monthly EMI',
        'Custom Amount',
        'Custom Start Date',
        'Custom End Date',
        'Description',
        'Applied Month',
        'Status',
        'Remaining Amount',
        'Repaid Amount',
        'Created At'
      ];

      rows = filteredDataList.map((advance: any) => [
        advance.employeeCode,
        `"${advance.employeeName}"`,
        advance.advanceAmount,
        advance.paymentDate,
        advance.deductionType === 'monthly' ? 'Monthly Deduction (Fixed EMI)' : 'Custom Deduction',
        advance.monthlyEMI || '-',
        advance.customAmount || '-',
        advance.customStartDate || '-',
        advance.customEndDate || '-',
        `"${advance.description || ''}"`,
        advance.appliedMonth,
        advance.status,
        advance.remainingAmount || '-',
        advance.repaidAmount || '-',
        advance.createdAt
      ]);
    } else {
      headers = [
        'Employee ID',
        'Employee Name',
        'Type',
        'Amount',
        'Description',
        'Reason',
        'Deduction Date',
        'Status',
        'Applied Month',
        'Created At'
      ];

      rows = filteredDataList.map((deduction: any) => {
        let reason = '';
        let cleanDescription = deduction.description || '';
        
        const reasonMatch = deduction.description?.match(/Reason: (.+)$/);
        if (reasonMatch) {
          reason = reasonMatch[1];
          cleanDescription = deduction.description?.replace(/ - Reason: .+$/, '').replace(/Amount: ₹[\d,]+( \| )?/, '').trim() || '';
        }
        
        return [
          deduction.employeeCode,
          `"${deduction.employeeName}"`,
          deduction.type === 'fine' ? 'Fine/Penalty' : 'Other Deduction',
          deduction.amount,
          `"${cleanDescription}"`,
          `"${reason}"`,
          deduction.deductionDate,
          deduction.status,
          deduction.appliedMonth,
          deduction.createdAt
        ];
      });
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${showAdvances ? 'advances' : 'deductions'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Export Successful", {
      description: `Data exported to CSV file`,
    });
  };

  // Handle form input changes
  const handleFormChange = (field: string, value: string) => {
    setDeductionForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle advance form changes
  const handleAdvanceFormChange = (field: keyof AdvanceFormData, value: string) => {
    setAdvanceForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Calculate EMI when advance amount or monthly EMI changes
  const calculateEMI = () => {
    const amount = parseFloat(advanceForm.advanceAmount) || 0;
    const emi = parseFloat(advanceForm.monthlyEMI) || 0;
    if (amount > 0 && emi > 0) {
      const months = Math.ceil(amount / emi);
      return months;
    }
    return 0;
  };

  // Manual refresh function
  const handleManualRefresh = () => {
    fetchSites();
    fetchEmployees(true);
    fetchDeductions(true);
    fetchAdvances();
    fetchDeductionStats();
    calculateAllSalaries();

    toast.info("Refreshing data...");
  };

  // Handle view details
  const handleViewDetails = (item: any, type: 'deduction' | 'advance') => {
    setViewDetailsDialog({
      open: true,
      type: type,
      data: item,
    });
  };

  return (
    <div className="space-y-6">
      {/* View Details Dialog */}
      <Dialog
        open={viewDetailsDialog.open}
        onOpenChange={(open) => setViewDetailsDialog({ ...viewDetailsDialog, open })}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              {viewDetailsDialog.type === 'advance' ? 'Advance Details' : 'Deduction Details'}
            </DialogTitle>
            <DialogDescription>
              Detailed information about this record
            </DialogDescription>
          </DialogHeader>
          
          {viewDetailsDialog.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Employee ID</Label>
                  <p className="font-medium text-sm">{viewDetailsDialog.data.employeeCode || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Employee Name</Label>
                  <p className="font-medium text-sm">{viewDetailsDialog.data.employeeName || '-'}</p>
                </div>
              </div>
              
              {viewDetailsDialog.type === 'advance' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Advance Amount</Label>
                      <p className="font-bold text-lg text-green-600">₹{deductionService.formatCurrency(viewDetailsDialog.data.advanceAmount)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Payment Date</Label>
                      <p className="text-sm">{viewDetailsDialog.data.paymentDate || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Deduction Type</Label>
                      <p className="text-sm">{viewDetailsDialog.data.deductionType === 'monthly' ? 'Monthly EMI' : 'Custom Deduction'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Monthly Deduction</Label>
                      <p className="text-sm font-medium text-orange-600">
                        ₹{deductionService.formatCurrency(viewDetailsDialog.data.deductionType === 'monthly' ? viewDetailsDialog.data.monthlyEMI : viewDetailsDialog.data.customAmount)}/month
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Remaining Amount</Label>
                      <p className="text-sm font-medium text-green-600">₹{deductionService.formatCurrency(viewDetailsDialog.data.remainingAmount)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Repaid Amount</Label>
                      <p className="text-sm">₹{deductionService.formatCurrency(viewDetailsDialog.data.repaidAmount)}</p>
                    </div>
                    {viewDetailsDialog.data.deductionType === 'custom' && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Start Date</Label>
                          <p className="text-sm">{viewDetailsDialog.data.customStartDate || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">End Date</Label>
                          <p className="text-sm">{viewDetailsDialog.data.customEndDate || '-'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Deduction Type</Label>
                      <p className="text-sm">{viewDetailsDialog.data.type === 'fine' ? 'Fine/Penalty' : 'Other Deduction'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Amount</Label>
                      <p className="font-bold text-lg text-red-600">₹{deductionService.formatCurrency(viewDetailsDialog.data.amount)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Deduction Date</Label>
                      <p className="text-sm">{viewDetailsDialog.data.deductionDate || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Applied Month</Label>
                      <p className="text-sm">{viewDetailsDialog.data.appliedMonth || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <div>{getStatusBadge(viewDetailsDialog.data.status)}</div>
                    </div>
                  </div>
                  
                  {viewDetailsDialog.data.type === 'fine' && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Fine Reason</Label>
                      <p className="text-sm bg-gray-50 p-2 rounded border">{viewDetailsDialog.data.fineReason || '-'}</p>
                    </div>
                  )}
                  {viewDetailsDialog.data.type === 'other' && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Deduction Reason</Label>
                      <p className="text-sm bg-gray-50 p-2 rounded border">{viewDetailsDialog.data.otherReason || '-'}</p>
                    </div>
                  )}
                </>
              )}
              
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm bg-gray-50 p-2 rounded border max-h-32 overflow-y-auto">
                  {viewDetailsDialog.data.description || 'No description provided'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Created At</Label>
                  <p className="text-xs text-muted-foreground">{new Date(viewDetailsDialog.data.createdAt).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Last Updated</Label>
                  <p className="text-xs text-muted-foreground">{new Date(viewDetailsDialog.data.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setViewDetailsDialog({ ...viewDetailsDialog, open: false })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmationDialog.open}
        onOpenChange={(open) => setConfirmationDialog({ ...confirmationDialog, open })}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <AlertDialogTitle className="text-lg">
                Confirm {confirmationDialog.type === 'advance' ? 'Salary Advance' : 'Deduction'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left">
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Employee:</span>
                    <span className="font-semibold text-gray-900">{confirmationDialog.employeeName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">
                      {confirmationDialog.type === 'advance' ? 'Advance Amount:' : 'Deduction Amount:'}
                    </span>
                    <span className="font-bold text-lg text-green-600">
                      ₹{deductionService.formatCurrency(confirmationDialog.amount)}
                    </span>
                  </div>
                  {confirmationDialog.deductionType && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">
                        {confirmationDialog.type === 'advance' ? 'Deduction Type:' : 'Deduction Type:'}
                      </span>
                      <span className="text-sm text-gray-600">{confirmationDialog.deductionType}</span>
                    </div>
                  )}
                  {confirmationDialog.monthlyDeduction && confirmationDialog.monthlyDeduction > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">Monthly Deduction:</span>
                      <span className="text-orange-600">₹{deductionService.formatCurrency(confirmationDialog.monthlyDeduction)}/month</span>
                    </div>
                  )}
                  {confirmationDialog.description && (
                    <div className="border-t pt-2 mt-2">
                      <span className="font-medium text-gray-700 block mb-1">Description:</span>
                      <p className="text-sm text-gray-600">{confirmationDialog.description}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mt-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    {confirmationDialog.type === 'advance' 
                      ? 'This advance will be deducted from the employee\'s future salary according to the selected deduction type.'
                      : 'This deduction will be applied to the employee\'s salary for the selected month. Please verify the amount before confirming.'}
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="flex-1 sm:flex-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmationDialog.onConfirm}
              className={`flex-1 sm:flex-none ${
                confirmationDialog.type === 'advance' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm & {confirmationDialog.type === 'advance' ? 'Grant Advance' : 'Apply Deduction'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Advance Dialog */}
      <Dialog
        open={isAddingAdvance}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingAdvance(false);
            resetAdvanceForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandCoins className="h-5 w-5 text-green-600" />
              Add Salary Advance
            </DialogTitle>
            <DialogDescription>
              Provide salary advance to employee with flexible repayment options
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="advance-site" className="flex items-center gap-1">
                Site <span className="text-red-500">*</span>
              </Label>
              <Select
                value={advanceForm.siteId}
                onValueChange={(value) => {
                  handleAdvanceFormChange("siteId", value);
                  // Reset employee selection when site changes
                  handleAdvanceFormChange("employeeId", "");
                }}
                disabled={isLoadingSites}
              >
                <SelectTrigger>
                  {isLoadingSites ? (
                    <div className="flex items-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading sites...
                    </div>
                  ) : (
                    <SelectValue placeholder="Select a site" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site._id} value={site._id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{site.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {site.location}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="advance-employee" className="flex items-center gap-1">
                Employee <span className="text-red-500">*</span>
              </Label>
              <Select
                value={advanceForm.employeeId}
                onValueChange={(value) => handleAdvanceFormChange("employeeId", value)}
                disabled={!advanceForm.siteId || filteredEmployees.length === 0}
              >
                <SelectTrigger>
                  {!advanceForm.siteId ? (
                    <SelectValue placeholder="Select a site first" />
                  ) : filteredEmployees.length === 0 ? (
                    <SelectValue placeholder="No employees at this site" />
                  ) : (
                    <SelectValue placeholder="Select an employee" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {filteredEmployees.map((employee) => {
                    const salaryCalc = salaryCalculations.get(employee.employeeId || employee._id || '');
                    const existingAdvances = advances.filter(a => a.employeeId === employee.employeeId && a.status !== 'rejected');
                    const totalPendingAdvance = existingAdvances.reduce((sum, a) => sum + a.remainingAmount, 0);
                    
                    return (
                      <SelectItem key={employee.employeeId} value={employee.employeeId}>
                        <div className="flex flex-col">
                          <span className="font-medium">{employee.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {employee.employeeId} • {employee.position}
                          </span>
                          {salaryCalc && (
                            <span className="text-xs text-green-600">
                              Salary: ₹{deductionService.formatCurrency(salaryCalc.monthlySalary)}
                            </span>
                          )}
                          {totalPendingAdvance > 0 && (
                            <span className="text-xs text-orange-600">
                              Pending Advance: ₹{deductionService.formatCurrency(totalPendingAdvance)}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="advance-amount" className="flex items-center gap-1">
                Advance Amount (₹) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="advance-amount"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Enter advance amount"
                  value={advanceForm.advanceAmount}
                  onChange={(e) => handleAdvanceFormChange("advanceAmount", e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-date">Payment Date</Label>
              <Input
                id="payment-date"
                type="date"
                value={advanceForm.paymentDate}
                onChange={(e) => handleAdvanceFormChange("paymentDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="advance-applied-month">Applied Month</Label>
              <Input
                id="advance-applied-month"
                type="month"
                value={advanceForm.appliedMonth}
                onChange={(e) => handleAdvanceFormChange("appliedMonth", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Deduction Type</Label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="monthly-deduction"
                    name="deductionType"
                    checked={advanceForm.deductionType === "monthly"}
                    onChange={() => handleAdvanceFormChange("deductionType", "monthly")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="monthly-deduction" className="text-sm cursor-pointer">
                    Monthly Deduction (Fixed EMI)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="custom-deduction"
                    name="deductionType"
                    checked={advanceForm.deductionType === "custom"}
                    onChange={() => handleAdvanceFormChange("deductionType", "custom")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="custom-deduction" className="text-sm cursor-pointer">
                    Custom Deduction (As per user)
                  </Label>
                </div>
              </div>
            </div>

            {advanceForm.deductionType === "monthly" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="monthly-emi">Monthly EMI Amount (₹)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="monthly-emi"
                      type="number"
                      min="0"
                      step="500"
                      placeholder="Enter monthly EMI amount"
                      value={advanceForm.monthlyEMI}
                      onChange={(e) => handleAdvanceFormChange("monthlyEMI", e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This amount will be deducted from employee's salary each month until advance is fully repaid
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Repayment Duration</Label>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-700">
                        {calculateEMI() > 0 
                          ? `Will be repaid in ${calculateEMI()} month(s) with ₹${advanceForm.monthlyEMI} monthly EMI`
                          : "Enter amount and EMI to calculate duration"}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {advanceForm.deductionType === "custom" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="custom-amount">Custom Deduction Amount (₹)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="custom-amount"
                      type="number"
                      min="0"
                      step="500"
                      placeholder="Enter custom deduction amount per month"
                      value={advanceForm.customAmount}
                      onChange={(e) => handleAdvanceFormChange("customAmount", e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-start-date">Deduction Start Date</Label>
                  <Input
                    id="custom-start-date"
                    type="date"
                    value={advanceForm.customStartDate}
                    onChange={(e) => handleAdvanceFormChange("customStartDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-end-date">Deduction End Date</Label>
                  <Input
                    id="custom-end-date"
                    type="date"
                    value={advanceForm.customEndDate}
                    onChange={(e) => handleAdvanceFormChange("customEndDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estimated Duration</Label>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-700">
                        {advanceForm.customStartDate && advanceForm.customEndDate && (
                          `From ${new Date(advanceForm.customStartDate).toLocaleDateString()} to ${new Date(advanceForm.customEndDate).toLocaleDateString()}`
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="advance-status">Status</Label>
              <Select
                value={advanceForm.status}
                onValueChange={(value) => handleAdvanceFormChange("status", value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="advance-description">Description / Reason</Label>
            <Textarea
              id="advance-description"
              placeholder="Enter reason for salary advance..."
              value={advanceForm.description}
              onChange={(e) => handleAdvanceFormChange("description", e.target.value)}
              rows={3}
            />
          </div>

          {advanceForm.advanceAmount && parseFloat(advanceForm.advanceAmount) > 0 && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Advance Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-green-700">Advance Amount:</div>
                <div className="font-medium text-green-800">₹{deductionService.formatCurrency(parseFloat(advanceForm.advanceAmount) || 0)}</div>
                <div className="text-green-700">Deduction Type:</div>
                <div className="font-medium text-green-800">
                  {advanceForm.deductionType === "monthly" ? "Monthly EMI" : "Custom Deduction"}
                </div>
                {advanceForm.deductionType === "monthly" && advanceForm.monthlyEMI && (
                  <>
                    <div className="text-green-700">Monthly EMI:</div>
                    <div className="font-medium text-green-800">₹{deductionService.formatCurrency(parseFloat(advanceForm.monthlyEMI))}</div>
                    <div className="text-green-700">Total Months:</div>
                    <div className="font-medium text-green-800">{calculateEMI()} months</div>
                  </>
                )}
                {advanceForm.deductionType === "custom" && advanceForm.customAmount && (
                  <>
                    <div className="text-green-700">Custom Deduction:</div>
                    <div className="font-medium text-green-800">₹{deductionService.formatCurrency(parseFloat(advanceForm.customAmount))}/month</div>
                  </>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingAdvance(false);
                resetAdvanceForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddAdvance}
              disabled={
                isSubmitting ||
                !advanceForm.employeeId ||
                !advanceForm.advanceAmount ||
                (advanceForm.deductionType === "monthly" && !advanceForm.monthlyEMI) ||
                (advanceForm.deductionType === "custom" && !advanceForm.customAmount)
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <HandCoins className="mr-2 h-4 w-4" />
              Grant Advance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Deduction Dialog */}
      <Dialog
        open={isAddingDeduction || !!editingDeduction}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingDeduction(false);
            setEditingDeduction(null);
            resetDeductionForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingDeduction ? (
                <>
                  <Edit className="h-5 w-5 text-primary" />
                  Edit Deduction
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-primary" />
                  Add New Deduction
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingDeduction
                ? "Update deduction information below"
                : "Fill in the details to add a new salary deduction or fine"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appliedMonth" className="flex items-center gap-1">
                Applied Month <span className="text-red-500">*</span>
              </Label>
              <Input
                id="appliedMonth"
                type="month"
                value={deductionForm.appliedMonth}
                onChange={(e) => handleFormChange("appliedMonth", e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Salary will be calculated based on attendance for this month
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="site" className="flex items-center gap-1">
                Site <span className="text-red-500">*</span>
              </Label>
              <Select
                value={deductionForm.siteId}
                onValueChange={(value) => {
                  handleFormChange("siteId", value);
                  // Reset employee selection when site changes
                  handleFormChange("employeeId", "");
                }}
                disabled={isLoadingSites}
              >
                <SelectTrigger className="w-full">
                  {isLoadingSites ? (
                    <div className="flex items-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading sites...
                    </div>
                  ) : (
                    <SelectValue placeholder="Select a site" />
                  )}
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {sites.map((site) => (
                    <SelectItem
                      key={site._id}
                      value={site._id}
                      className="py-2"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{site.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">
                          {site.location} • {site.clientName}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeId" className="flex items-center gap-1">
                Employee <span className="text-red-500">*</span>
              </Label>
              <Select
                value={deductionForm.employeeId}
                onValueChange={(value) => handleFormChange("employeeId", value)}
                disabled={isLoadingEmployees || !deductionForm.siteId || filteredEmployees.length === 0}
              >
                <SelectTrigger className="w-full">
                  {isLoadingEmployees ? (
                    <div className="flex items-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading employees...
                    </div>
                  ) : !deductionForm.siteId ? (
                    <SelectValue placeholder="Select a site first" />
                  ) : filteredEmployees.length === 0 ? (
                    <SelectValue placeholder="No employees at this site" />
                  ) : (
                    <SelectValue placeholder="Select an employee" />
                  )}
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {filteredEmployees.map((employee) => {
                    const salaryCalc = salaryCalculations.get(employee.employeeId || employee._id || '');
                    const monthlyDeduction = getMonthlyDeductionAmount(employee.employeeId || '', deductionForm.appliedMonth);
                    const finalAfterAdvance = salaryCalc ? salaryCalc.finalSalary - monthlyDeduction : 0;
                    
                    return (
                      <SelectItem
                        key={employee.employeeId}
                        value={employee.employeeId}
                        className="py-2"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{employee.name}</span>
                            {(employee.isManager || false) && (
                              <Badge variant="outline" className="text-[10px]">Manager</Badge>
                            )}
                            {(employee.isSupervisor || false) && (
                              <Badge variant="outline" className="text-[10px]">Supervisor</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {employee.employeeId} • {employee.department}
                          </span>
                          {salaryCalc && (
                            <span className="text-xs text-green-600">
                              Salary: ₹{deductionService.formatCurrency(salaryCalc.monthlySalary)} | 
                              Final: ₹{deductionService.formatCurrency(finalAfterAdvance)}
                            </span>
                          )}
                          {monthlyDeduction > 0 && (
                            <span className="text-xs text-orange-600">
                              Advance Deduction: -₹{deductionService.formatCurrency(monthlyDeduction)}/month
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {deductionForm.employeeId && (
                <div className="text-xs text-muted-foreground mt-1">
                  {(() => {
                    const employee = filteredEmployees.find(e => e.employeeId === deductionForm.employeeId);
                    const salaryCalc = employee ? salaryCalculations.get(employee.employeeId || employee._id || '') : null;
                    const monthlyDeduction = getMonthlyDeductionAmount(deductionForm.employeeId, deductionForm.appliedMonth);
                    
                    if (salaryCalc) {
                      const finalAfterAdvance = salaryCalc.finalSalary - monthlyDeduction;
                      return (
                        <div className="bg-blue-50 p-2 rounded border border-blue-200">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-3 w-3 text-blue-600" />
                            <span className="font-medium text-blue-700">Salary Calculation for {deductionForm.appliedMonth}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <div>Monthly Salary:</div>
                            <div className="font-medium">₹{deductionService.formatCurrency(salaryCalc.monthlySalary)}</div>
                            <div>Present Days:</div>
                            <div>{salaryCalc.presentDays} / {salaryCalc.totalDaysInMonth}</div>
                            <div>Absent Days:</div>
                            <div className="text-red-600">{salaryCalc.absentDays}</div>
                            <div>Attendance Deduction:</div>
                            <div className="text-red-600">-₹{deductionService.formatCurrency(salaryCalc.deductionAmount)}</div>
                            {monthlyDeduction > 0 && (
                              <>
                                <div>Advance Deduction:</div>
                                <div className="text-orange-600">-₹{deductionService.formatCurrency(monthlyDeduction)}</div>
                              </>
                            )}
                            <div className="font-semibold">Final Salary:</div>
                            <div className="font-semibold text-green-600">₹{deductionService.formatCurrency(finalAfterAdvance)}</div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="flex items-center gap-1">
                Deduction Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={deductionForm.type}
                onValueChange={(value) => handleFormChange("type", value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fine" className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                    Fine/Penalty
                  </SelectItem>
                  <SelectItem value="other" className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
                    Other Deduction
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-1">
                Amount (₹) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={deductionForm.amount}
                  onChange={(e) => handleFormChange("amount", e.target.value)}
                  required
                  className="pl-9"
                />
              </div>
              {deductionForm.employeeId && deductionForm.amount && (() => {
                const employee = filteredEmployees.find(e => e.employeeId === deductionForm.employeeId);
                const salaryCalc = employee ? salaryCalculations.get(employee.employeeId || employee._id || '') : null;
                const monthlyDeduction = getMonthlyDeductionAmount(deductionForm.employeeId, deductionForm.appliedMonth);
                const finalAfterAdvance = salaryCalc ? salaryCalc.finalSalary - monthlyDeduction : 0;
                
                if (salaryCalc && parseFloat(deductionForm.amount) > finalAfterAdvance) {
                  return (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      Deduction exceeds final salary after advance deduction (₹{deductionService.formatCurrency(finalAfterAdvance)})
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={deductionForm.status}
                onValueChange={(value) => handleFormChange("status", value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending" className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                    Pending
                  </SelectItem>
                  <SelectItem value="approved" className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                    Approved
                  </SelectItem>
                  <SelectItem value="rejected" className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                    Rejected
                  </SelectItem>
                  <SelectItem value="completed" className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                    Completed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deductionDate">Deduction Date</Label>
              <Input
                id="deductionDate"
                type="date"
                value={deductionForm.deductionDate}
                onChange={(e) => handleFormChange("deductionDate", e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Fine/Penalty Reason - Input Field (Optional) */}
          {deductionForm.type === "fine" && (
            <div className="space-y-2">
              <Label htmlFor="fineReason">Reason for Fine/Penalty (Optional)</Label>
              <Input
                id="fineReason"
                placeholder="Enter reason for fine/penalty..."
                value={deductionForm.fineReason}
                onChange={(e) => handleFormChange("fineReason", e.target.value)}
              />
            </div>
          )}

          {/* Other Deduction Reason - Input Field (Optional) */}
          {deductionForm.type === "other" && (
            <div className="space-y-2">
              <Label htmlFor="otherReason">Reason for Deduction (Optional)</Label>
              <Input
                id="otherReason"
                placeholder="Enter reason for this deduction..."
                value={deductionForm.otherReason}
                onChange={(e) => handleFormChange("otherReason", e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Additional Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Enter additional details about the deduction..."
              value={deductionForm.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingDeduction(false);
                setEditingDeduction(null);
                resetDeductionForm();
              }}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={editingDeduction ? handleUpdateDeduction : handleAddDeduction}
              disabled={
                isSubmitting ||
                !deductionForm.employeeId ||
                !deductionForm.amount ||
                !deductionForm.siteId
              }
              className="flex-1 sm:flex-none"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingDeduction ? "Save Changes" : "Add Deduction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, deduction: null, advance: null, type: 'deduction' })}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <Trash2 className="h-5 w-5" />
              <AlertDialogTitle>
                {deleteDialog.type === 'advance' ? 'Delete Advance' : 'Delete Deduction'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left">
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-md">
                {deleteDialog.type === 'advance' && deleteDialog.advance && (
                  <>
                    <p className="font-medium text-sm">
                      Employee: {deleteDialog.advance.employeeName}
                    </p>
                    <p className="text-sm">
                      Advance Amount: ₹{deductionService.formatCurrency(deleteDialog.advance.advanceAmount)}
                    </p>
                    <p className="text-sm">
                      Payment Date: {deleteDialog.advance.paymentDate}
                    </p>
                    <p className="text-sm">
                      Deduction Type: {deleteDialog.advance.deductionType === 'monthly' ? 'Monthly EMI' : 'Custom Deduction'}
                    </p>
                    {deleteDialog.advance.remainingAmount > 0 && (
                      <p className="text-sm text-orange-600">
                        Remaining Amount: ₹{deductionService.formatCurrency(deleteDialog.advance.remainingAmount)}
                      </p>
                    )}
                  </>
                )}
                {deleteDialog.type === 'deduction' && deleteDialog.deduction && (
                  <>
                    <p className="font-medium text-sm">
                      Employee: {deleteDialog.deduction.employeeName}
                    </p>
                    <p className="text-sm">
                      Amount: ₹{deductionService.formatCurrency(deleteDialog.deduction.amount)}
                    </p>
                    <p className="text-sm">
                      Type: {deleteDialog.deduction.type === 'fine' ? 'Fine/Penalty' : 'Other Deduction'}
                    </p>
                  </>
                )}
              </div>
              <p className="text-sm">
                Are you sure you want to delete this record? This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="flex-1 sm:flex-none">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-red-600 hover:bg-red-700 flex-1 sm:flex-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Deduction & Advance Management</h2>
          <p className="text-muted-foreground">
            Manage salary advances, fines, and other deductions for employees
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleExportData}
            disabled={filteredDataList.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export {showAdvances ? 'Advances' : 'Deductions'}
          </Button>
          <Button 
            onClick={() => setIsAddingAdvance(true)} 
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <HandCoins className="h-4 w-4" />
            Add Advance
          </Button>
          <Button onClick={() => setIsAddingDeduction(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Deduction
          </Button>
        </div>
      </div>

      {/* Month Selector for Salary Calculation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Salary Month:</span>
              </div>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-40"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={calculateAllSalaries}
                disabled={isLoadingAttendance}
              >
                {isLoadingAttendance ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh Salary
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {salaryCalculations.size > 0 && (
                <span>
                  {salaryCalculations.size} employees • 
                  Total Present: {Array.from(salaryCalculations.values()).reduce((sum, calc) => sum + calc.presentDays, 0)} days
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Deductions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <IndianRupee className="h-5 w-5 mr-1" />
              {deductionService.formatCurrency(deductionStats.totalDeductions)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {totalDeductionsCount} records
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Salary Advances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 flex items-center">
              <IndianRupee className="h-5 w-5 mr-1" />
              {deductionService.formatCurrency(deductionStats.totalAdvances)}
            </div>
            <div className="flex items-center mt-1">
              <div className="w-full bg-purple-100 rounded-full h-1.5">
                <div 
                  className="bg-purple-500 h-1.5 rounded-full" 
                  style={{ 
                    width: `${deductionStats.totalAdvances > 0 && deductionStats.totalDeductions > 0 ? 
                      (deductionStats.totalAdvances / deductionStats.totalDeductions) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fines/Penalties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 flex items-center">
              <IndianRupee className="h-5 w-5 mr-1" />
              {deductionService.formatCurrency(deductionStats.totalFines)}
            </div>
            <div className="flex items-center mt-1">
              <div className="w-full bg-orange-100 rounded-full h-1.5">
                <div 
                  className="bg-orange-500 h-1.5 rounded-full" 
                  style={{ 
                    width: `${deductionStats.totalFines > 0 && deductionStats.totalDeductions > 0 ? 
                      (deductionStats.totalFines / deductionStats.totalDeductions) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {deductionStats.pendingCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={!showAdvances ? "default" : "outline"}
          onClick={() => setShowAdvances(false)}
          className="gap-2"
        >
          <CreditCard className="h-4 w-4" />
          Deductions
          {!showAdvances && totalDeductionsCount > 0 && (
            <Badge variant="secondary" className="ml-1 bg-white">
              {totalDeductionsCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={showAdvances ? "default" : "outline"}
          onClick={() => setShowAdvances(true)}
          className="gap-2"
        >
          <HandCoins className="h-4 w-4" />
          Salary Advances
          {showAdvances && totalAdvancesCount > 0 && (
            <Badge variant="secondary" className="ml-1 bg-white">
              {totalAdvancesCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg">
              {showAdvances ? 'Salary Advances' : 'Deduction Records'}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Approved: {deductionStats.approvedCount}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                Rejected: {deductionStats.rejectedCount}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                Completed: {deductionStats.completedCount}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search by employee name, ID, or ${showAdvances ? 'description' : 'description'}...`}
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      fetchDeductions();
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span>Status</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-gray-300 mr-2"></div>
                      All Status
                    </div>
                  </SelectItem>
                  <SelectItem value="pending">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                      Pending
                    </div>
                  </SelectItem>
                  <SelectItem value="approved">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                      Approved
                    </div>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                      Rejected
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                      Completed
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {!showAdvances && (
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[160px]">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span>Type</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-gray-300 mr-2"></div>
                        All Types
                      </div>
                    </SelectItem>
                    <SelectItem value="fine">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                        Fine/Penalty
                      </div>
                    </SelectItem>
                    <SelectItem value="other">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
                        Other
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="outline"
                onClick={handleManualRefresh}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Data Table */}
          <div className="rounded-lg border overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col justify-center items-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <span className="text-muted-foreground">Loading {showAdvances ? 'advances' : 'deductions'}...</span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-semibold">Employee</TableHead>
                        <TableHead className="font-semibold">Salary Details</TableHead>
                        {showAdvances ? (
                          <>
                            <TableHead className="font-semibold">Advance Amount</TableHead>
                            <TableHead className="font-semibold">Payment Date</TableHead>
                            <TableHead className="font-semibold">Deduction Type</TableHead>
                            <TableHead className="font-semibold">Monthly Deduction</TableHead>
                            <TableHead className="font-semibold">Remaining Amount</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead className="font-semibold">Type</TableHead>
                            <TableHead className="font-semibold">Amount</TableHead>
                            <TableHead className="font-semibold">Reason</TableHead>
                          </>
                        )}
                        <TableHead className="font-semibold">Description</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Month</TableHead>
                        <TableHead className="font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={showAdvances ? 10 : 9} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <Search className="h-12 w-12 text-muted-foreground mb-4" />
                              <h3 className="font-medium text-lg mb-1">
                                {showAdvances
                                  ? totalAdvancesCount === 0
                                    ? "No salary advances added yet"
                                    : "No matching advances found"
                                  : deductions.length === 0
                                    ? "No deductions added yet"
                                    : "No matching deductions found"}
                              </h3>
                              <p className="text-muted-foreground text-sm max-w-md text-center">
                                {showAdvances
                                  ? totalAdvancesCount === 0
                                    ? "Get started by adding your first salary advance"
                                    : "Try adjusting your search or filters to find what you're looking for"
                                  : deductions.length === 0
                                    ? "Get started by adding your first deduction"
                                    : "Try adjusting your search or filters to find what you're looking for"}
                              </p>
                              {(showAdvances ? totalAdvancesCount === 0 : deductions.length === 0) && (
                                <div className="flex gap-2 mt-4">
                                  <Button 
                                    onClick={() => setIsAddingAdvance(true)} 
                                    className="gap-2 bg-green-600 hover:bg-green-700"
                                  >
                                    <HandCoins className="h-4 w-4" />
                                    Add Advance
                                  </Button>
                                  <Button 
                                    onClick={() => setIsAddingDeduction(true)} 
                                    className="gap-2"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add Deduction
                                  </Button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedData.map((item: any) => {
                          const employee = employees.find(
                            (emp) => emp.employeeId === (item.employeeId || item.employeeCode)
                          );
                          const salaryCalc = employee ? salaryCalculations.get(employee.employeeId || employee._id || '') : null;
                          const monthlyDeduction = !showAdvances && item.employeeId ? getMonthlyDeductionAmount(item.employeeId, selectedMonth) : 0;
                          const finalAfterAdvance = salaryCalc ? salaryCalc.finalSalary - monthlyDeduction : 0;

                          if (showAdvances) {
                            const advance = item as AdvanceRecord;
                            const monthlyEMIAmount = advance.deductionType === 'monthly' ? (advance.monthlyEMI || 0) : (advance.customAmount || 0);
                            
                            return (
                              <TableRow key={advance._id} className="hover:bg-muted/50 transition-colors">
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="font-medium">
                                      {advance.employeeName}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <Badge variant="outline" className="text-xs font-normal">
                                        {advance.employeeCode}
                                      </Badge>
                                      <span className="text-muted-foreground">
                                        {employee?.department || "N/A"}
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {salaryCalc ? (
                                    <div className="text-xs space-y-0.5">
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">Salary:</span>
                                        <span className="font-medium">₹{deductionService.formatCurrency(salaryCalc.monthlySalary)}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">Final:</span>
                                        <span className="font-medium text-green-600">₹{deductionService.formatCurrency(finalAfterAdvance)}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">
                                    ₹{deductionService.formatCurrency(advance.advanceAmount)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {advance.paymentDate}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                    {advance.deductionType === 'monthly' ? 'Monthly EMI' : 'Custom Deduction'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium text-orange-600">
                                    ₹{deductionService.formatCurrency(monthlyEMIAmount)}/month
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="font-medium text-green-600">
                                      ₹{deductionService.formatCurrency(advance.remainingAmount)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Repaid: ₹{deductionService.formatCurrency(advance.repaidAmount)}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="max-w-xs min-w-[200px]">
                                  <div className="truncate" title={advance.description}>
                                    {advance.description || (
                                      <span className="text-muted-foreground italic">No description</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(advance.status)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-normal">
                                    {advance.appliedMonth || "N/A"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleViewDetails(advance, 'advance')}
                                      title="View Details"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() =>
                                        setDeleteDialog({ open: true, deduction: null, advance, type: 'advance' })
                                      }
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          } else {
                            const deduction = item as Deduction;
                            let reason = '';
                            let cleanDescription = deduction.description || '';
                            
                            const reasonMatch = deduction.description?.match(/Reason: (.+)$/);
                            if (reasonMatch) {
                              reason = reasonMatch[1];
                              cleanDescription = deduction.description?.replace(/ - Reason: .+$/, '').replace(/Amount: ₹[\d,]+( \| )?/, '').trim() || '';
                            }
                            
                            return (
                              <TableRow key={deduction.id} className="hover:bg-muted/50 transition-colors">
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="font-medium">
                                      {deduction.employeeName}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <Badge variant="outline" className="text-xs font-normal">
                                        {deduction.employeeCode}
                                      </Badge>
                                      <span className="text-muted-foreground">
                                        {employee?.department || "N/A"}
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {salaryCalc ? (
                                    <div className="text-xs space-y-0.5">
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">Salary:</span>
                                        <span className="font-medium">₹{deductionService.formatCurrency(salaryCalc.monthlySalary)}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">Final:</span>
                                        <span className="font-medium text-green-600">₹{deductionService.formatCurrency(finalAfterAdvance - parseFloat(deduction.amount))}</span>
                                      </div>
                                      {monthlyDeduction > 0 && (
                                        <div className="flex items-center gap-1 text-orange-600">
                                          <span>Advance Deduction:</span>
                                          <span>-₹{deductionService.formatCurrency(monthlyDeduction)}</span>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">Present:</span>
                                        <span>{salaryCalc.presentDays}/{salaryCalc.totalDaysInMonth}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {getTypeBadge(deduction.type)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center font-medium">
                                    <IndianRupee className="h-4 w-4 mr-1" />
                                    {deductionService.formatCurrency(deduction.amount)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                    {reason || (deduction.type === 'fine' ? 'Not specified' : 'Not specified')}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-xs min-w-[200px]">
                                  <div className="truncate" title={cleanDescription}>
                                    {cleanDescription || (
                                      <span className="text-muted-foreground italic">No description</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(deduction.status)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-normal">
                                    {deduction.appliedMonth || "N/A"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleViewDetails(deduction, 'deduction')}
                                      title="View Details"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditDeduction(deduction)}
                                      title="Edit"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() =>
                                        setDeleteDialog({ open: true, deduction, advance: null, type: 'deduction' })
                                      }
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          }
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {filteredDataList.length > 0 && (
                  <div className="border-t">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(totalItems / deductionItemsPerPage)}
                      totalItems={totalItems}
                      itemsPerPage={deductionItemsPerPage}
                      onPageChange={setCurrentPage}
                      onItemsPerPageChange={(value) => {
                        setDeductionItemsPerPage(value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeductionListTab;