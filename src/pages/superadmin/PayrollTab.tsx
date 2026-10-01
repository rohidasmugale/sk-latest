import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from 'axios';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Download, Search, Filter, Plus, Edit, Trash2, Eye, IndianRupee, Calendar,
  CheckCircle, FileText, Printer, Send, Loader2, Users, FileSpreadsheet,
  AlertCircle, RefreshCw, Upload, XCircle, RotateCcw,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  payrollApi, salaryStructureApi, salarySlipApi, employeeApi,
} from "@/services/payrollApi";
import AuditLogTab from "./AuditLogTab";

// ─── Types ───────────────────────────────────────────────────────────────
interface Employee {
  _id: string; id?: string; employeeId: string; name: string; email?: string;
  phone?: string; department: string; position: string; salary: number;
  status: string; accountNumber?: string; ifscCode?: string; bankBranch?: string;
  bankName?: string; gender?: string; dateOfJoining?: string;
  aadharNumber?: string; panNumber?: string; esicNumber?: string;
  uanNumber?: string; providentFund?: number; professionalTax?: number;
  permanentAddress?: string; localAddress?: string;
  site?: string; siteName?: string; siteId?: string;
  profileStatus?: "complete" | "incomplete";
}

interface SalaryStructure {
  _id: string; id?: string; employeeId: string;
  basicSalary: number; hra: number; da: number; specialAllowance: number;
  conveyance: number; medicalAllowance: number; otherAllowances: number;
  providentFund: number; professionalTax: number; incomeTax: number;
  otherDeductions: number; leaveEncashment: number; arrears: number;
  esic: number; advance: number; mlwf: number;
  effectiveFrom?: string; isActive?: boolean;
  createdAt?: string; updatedAt?: string;
}

interface Payroll {
  _id: string; id?: string; employeeId: string; month: string;
  basicSalary: number; allowances: number; deductions: number; netSalary: number;
  status: "pending" | "processed" | "paid" | "hold" | "part-paid";
  paymentDate?: string; presentDays: number; absentDays: number; halfDays: number;
  leaves: number; paidAmount: number;
  paymentStatus: "pending" | "paid" | "hold" | "part-paid";
  notes?: string; overtimeHours?: number; overtimeAmount?: number; bonus?: number;
  providentFund?: number; esic?: number; professionalTax?: number; mlwf?: number;
  advance?: number; uniformAndId?: number; fine?: number; otherDeductions?: number;
  da?: number; hra?: number; otherAllowances?: number; leaveEncashment?: number;
  arrears?: number;
  deductionBreakdown?: {
    additionalDeductions: number;
    items: Array<{ type: string; amount: number; description: string; id: string }>;
  };
  manualAdjustments?: Array<{
    amount: number;
    reason: string;
    adjustedBy: string;
    adjustedAt: string;
  }>;
  createdAt?: string; updatedAt?: string; employee?: Employee;
}

interface SalarySlip {
  _id: string; id?: string; payrollId: string; employeeId: string; month: string;
  basicSalary: number; allowances: number; deductions: number; netSalary: number;
  generatedDate: string; presentDays: number; absentDays: number; halfDays: number;
  leaves: number; slipNumber: string; downloadUrl?: string;
  emailSent?: boolean; emailSentAt?: string; createdAt?: string; updatedAt?: string;
}

interface Attendance {
  employeeId: string; employeeName?: string; date: string;
  status: "present" | "absent" | "half-day";
  checkIn?: string; checkOut?: string; overtimeHours?: number;
}

interface Leave {
  _id: string; id?: string; employeeId: string; startDate: string; endDate: string;
  type: string; reason: string; status: "pending" | "approved" | "rejected";
  approvedBy?: string; approvedAt?: string; createdAt?: string;
}

interface PayrollSummary {
  totalAmount: number; paidAmount: number; pendingAmount: number; holdAmount: number;
  partPaidAmount: number; processedCount: number; pendingCount: number; paidCount: number;
  holdCount: number; partPaidCount: number; totalEmployees: number; totalRecords: number;
  activeEmployees: number; employeesWithStructure: number;
  employeesWithoutStructure: number; payrollMonth: string;
}

interface PayrollTabProps {
  selectedMonth: string; setSelectedMonth: (month: string) => void;
  selectedSite: string; sites: Site[];
}

interface Site {
  _id: string; name: string; clientName: string; location: string; areaSqft: number;
  services: string[]; status: 'active' | 'inactive'; contractValue: number;
  contractEndDate: string; staffDeployment: Array<{ role: string; count: number }>;
  totalStaff?: number; managerCount?: number; supervisorCount?: number;
  addedBy?: string; addedByRole?: string; manager?: string; clientId?: string;
  contractStartDate?: string; createdAt?: string; updatedAt?: string;
}

const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

const getItemId = (item: any): string => {
  if (!item) return "";
  if (item._id) return item._id;
  if (item.id) return item.id;
  return "";
};

const PayrollTab = ({ selectedMonth, setSelectedMonth, selectedSite, sites }: PayrollTabProps) => {
  const [activePayrollTab, setActivePayrollTab] = useState("salary-slips");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [slipPaidDays, setSlipPaidDays] = useState<number | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary>({
    totalAmount: 0, paidAmount: 0, pendingAmount: 0, holdAmount: 0, partPaidAmount: 0,
    processedCount: 0, pendingCount: 0, paidCount: 0, holdCount: 0, partPaidCount: 0,
    totalEmployees: 0, totalRecords: 0, activeEmployees: 0,
    employeesWithStructure: 0, employeesWithoutStructure: 0, payrollMonth: "",
  });

  const [loading, setLoading] = useState({
    employees: false, payroll: false, structures: false, slips: false, summary: false,
  });

  const [isAddingStructure, setIsAddingStructure] = useState(false);
  const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);
  const [processDialog, setProcessDialog] = useState<{ open: boolean; employee: Employee | null }>({ open: false, employee: null });
  const [paymentStatusDialog, setPaymentStatusDialog] = useState<{ open: boolean; payroll: Payroll | null }>({ open: false, payroll: null });
  const [slipDialog, setSlipDialog] = useState<{ open: boolean; salarySlip: SalarySlip | null }>({ open: false, salarySlip: null });
  const [processAllDialog, setProcessAllDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; structure: SalaryStructure | null }>({ open: false, structure: null });

  const [paymentStatusForm, setPaymentStatusForm] = useState({
    status: "paid", paidAmount: "", notes: "",
    paymentDate: new Date().toISOString().split("T")[0],
  });

  const [structureForm, setStructureForm] = useState({
    employeeId: "", basicSalary: "", hra: "", da: "", specialAllowance: "",
    conveyance: "", medicalAllowance: "", otherAllowances: "", providentFund: "",
    professionalTax: "", incomeTax: "", otherDeductions: "", leaveEncashment: "",
    arrears: "", esic: "", advance: "", mlwf: "",
  });
  const [payrollItemsPerPage, setPayrollItemsPerPage] = useState(10);
  const [payrollPage, setPayrollPage] = useState(1);
  const [payrollRecordsPage, setPayrollRecordsPage] = useState(1);
  const [payrollRecordsPerPage, setPayrollRecordsPerPage] = useState(6);

  const [importStructureDialogOpen, setImportStructureDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importValidationResults, setImportValidationResults] = useState<{
    valid: any[]; invalid: any[]; missingEmployees: string[];
  }>({ valid: [], invalid: [], missingEmployees: [] });
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const [deductionPreview, setDeductionPreview] = useState<{
    additionalDeductions: number;
    items: Array<{ type: string; amount: number; description: string; id: string }>;
  }>({ additionalDeductions: 0, items: [] });

  // ─── Currency formatter (whole rupees, no decimals) ─────────────────
  const fmtMoney = (n: number | undefined | null): string =>
    Math.round(n || 0).toLocaleString('en-IN');

  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [adjustDialog, setAdjustDialog] = useState<{
    open: boolean;
    payroll: Payroll | null;
  }>({ open: false, payroll: null });

  const [adjustForm, setAdjustForm] = useState({
    amount: "",
    reason: "",
  });

  // ─── Bulk selection state ───────────────────────────────────────────
  const [selectedPayrollIds, setSelectedPayrollIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkStatusDialog, setBulkStatusDialog] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkDeleteForm, setBulkDeleteForm] = useState({ reason: "" });
  const [bulkStatusForm, setBulkStatusForm] = useState({
    status: "paid" as "paid" | "hold" | "pending",
    paymentDate: new Date().toISOString().split("T")[0],
  });

  // ─── Site filtering ─────────────────────────────────────────────────
  const siteFilteredEmployees = useMemo(() => {
    if (!selectedSite || selectedSite === 'all') return employees;
    return employees.filter(emp =>
      emp.site === selectedSite || emp.siteId === selectedSite ||
      emp.siteName === selectedSite ||
      sites.some(s => s._id === selectedSite && (s.name === emp.site || s.name === emp.siteName))
    );
  }, [employees, selectedSite, sites]);

  const formatMonthYear = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long' }) + ' ' + year;
  };

  const getDaysInMonth = (monthStr: string) => {
    if (!monthStr) return 30;
    const [year, month] = monthStr.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  };

  const filteredPayroll = useMemo(() => {
    const empIds = new Set(siteFilteredEmployees.map(e => e.employeeId));
    return payroll.filter(p => empIds.has(p.employeeId));
  }, [payroll, siteFilteredEmployees]);

  const filteredSalaryStructures = useMemo(() => {
    const empIds = new Set(siteFilteredEmployees.map(e => e.employeeId));
    return salaryStructures.filter(s => empIds.has(s.employeeId));
  }, [salaryStructures, siteFilteredEmployees]);

  const filteredSalarySlips = useMemo(() => {
    const empIds = new Set(siteFilteredEmployees.map(e => e.employeeId));
    return salarySlips.filter(s => empIds.has(s.employeeId));
  }, [salarySlips, siteFilteredEmployees]);

  const employeesWithStructure = useMemo(() => {
    return siteFilteredEmployees.filter((emp) =>
      filteredSalaryStructures.some((s) => s.employeeId === emp.employeeId)
    );
  }, [siteFilteredEmployees, filteredSalaryStructures]);

  const employeesWithoutStructure = useMemo(() => {
    return siteFilteredEmployees.filter(
      (emp) => !filteredSalaryStructures.some((s) => s.employeeId === emp.employeeId)
    );
  }, [siteFilteredEmployees, filteredSalaryStructures]);

  const filteredEmployees = useMemo(() => {
    return siteFilteredEmployees.filter((employee) => {
      const matchesSearch =
        employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department?.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === "all") return matchesSearch;
      const employeeStructure = filteredSalaryStructures.find((s) => s.employeeId === employee.employeeId);
      if (statusFilter === "with-structure") return matchesSearch && employeeStructure;
      if (statusFilter === "without-structure") return matchesSearch && !employeeStructure;
      return matchesSearch;
    });
  }, [siteFilteredEmployees, searchTerm, statusFilter, filteredSalaryStructures]);

  const paginatedFilteredEmployees = useMemo(() => {
    const start = (payrollPage - 1) * payrollItemsPerPage;
    return filteredEmployees.slice(start, start + payrollItemsPerPage);
  }, [filteredEmployees, payrollPage, payrollItemsPerPage]);

  const paginatedPayrollRecords = useMemo(() => {
    const start = (payrollRecordsPage - 1) * payrollRecordsPerPage;
    return filteredPayroll.slice(start, start + payrollRecordsPerPage);
  }, [filteredPayroll, payrollRecordsPage, payrollRecordsPerPage]);

  // ─── Bulk selection derived values ──────────────────────────────────
  const allVisibleSelected = useMemo(() => {
    if (paginatedPayrollRecords.length === 0) return false;
    return paginatedPayrollRecords.every((r) => selectedPayrollIds.has(getItemId(r)));
  }, [paginatedPayrollRecords, selectedPayrollIds]);

  const togglePayrollSelection = (id: string) => {
    if (!id) return;
    setSelectedPayrollIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isPayrollSelected = (id: string) => selectedPayrollIds.has(id);

  const selectAllVisible = () => {
    const visibleIds = paginatedPayrollRecords.map((r) => getItemId(r)).filter(Boolean);
    setSelectedPayrollIds(new Set(visibleIds));
  };

  const clearSelection = () => setSelectedPayrollIds(new Set());

  // ─── Fetch attendance ───────────────────────────────────────────────
  const fetchAttendanceForMonth = async (month: string) => {
    try {
      const [year, monthNum] = month.split('-');
      const startDate = `${year}-${monthNum}-01`;
      const endDate = new Date(Number(year), Number(monthNum), 0).toISOString().split('T')[0];
      const response = await axios.get(`${API_URL}/attendance`, {
        params: { startDate, endDate, limit: 10000 }
      });
      let records = response.data?.data || response.data || [];
      if (!Array.isArray(records)) records = [];
      setAttendance(records.map((r: any) => ({
        employeeId: r.employeeId, employeeName: r.employeeName, date: r.date,
        status: r.status, checkIn: r.checkInTime, checkOut: r.checkOutTime,
        overtimeHours: r.overtimeHours
      })));
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    }
  };

  const fetchAttendanceRecordsForMonth = async (month: string): Promise<Attendance[]> => {
    try {
      const [year, monthNum] = month.split('-');
      const startDate = `${year}-${monthNum}-01`;
      const endDate = new Date(Number(year), Number(monthNum), 0).toISOString().split('T')[0];
      const response = await axios.get(`${API_URL}/attendance`, {
        params: { startDate, endDate, limit: 10000 }
      });
      let records = response.data?.data || response.data || [];
      if (!Array.isArray(records)) records = [];
      return records.map((r: any) => ({
        employeeId: r.employeeId, employeeName: r.employeeName,
        date: r.date, status: r.status,
      }));
    } catch (error) {
      console.error('Failed to fetch attendance for month:', month, error);
      return [];
    }
  };

  const computePaidDays = (employeeId: string, month: string, records: Attendance[]): number | null => {
    const employee = employees.find(e => e.employeeId === employeeId || e._id === employeeId);
    if (!employee) return null;
    const monthAttendance = records.filter((a) => {
      const empIdStr = String(a.employeeId);
      const matches =
        empIdStr === String(employee._id) ||
        empIdStr === String(employee.employeeId) ||
        a.employeeName?.trim().toLowerCase() === employee.name?.trim().toLowerCase();
      return matches && a.date?.startsWith(month);
    });
    let absentDays = 0, halfDays = 0;
    monthAttendance.forEach(a => {
      const status = a.status?.toLowerCase() || '';
      if (status === 'half-day' || status === 'half day') halfDays++;
      else if (status !== 'present') absentDays++;
    });
    return getDaysInMonth(month) - absentDays - halfDays * 0.5;
  };

  const fetchAllData = async () => {
    try {
      setLoading({ employees: true, payroll: true, structures: true, slips: true, summary: true });
      const [employeesRes, payrollRes, structuresRes, slipsRes] = await Promise.all([
        employeeApi.getAll({ status: 'active', limit: 10000 }),
        payrollApi.getAll({ month: selectedMonth, limit: 10000 }),
        salaryStructureApi.getAll({ isActive: true }),
        salarySlipApi.getAll({ month: selectedMonth }),
      ]);
      if (employeesRes.success) setEmployees(employeesRes.data || []); else setEmployees([]);
      if (payrollRes.success) setPayroll(payrollRes.data || []); else setPayroll([]);
      if (structuresRes.success) setSalaryStructures(structuresRes.data || []); else setSalaryStructures([]);
      if (slipsRes.success) setSalarySlips(slipsRes.data || []); else setSalarySlips([]);
      toast.success('Data loaded successfully');
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data. Please check your API connection.");
    } finally {
      setLoading({ employees: false, payroll: false, structures: false, slips: false, summary: false });
    }
  };

  const updateSummary = (empList: Employee[], payList: Payroll[], structList: SalaryStructure[]) => {
    const totalAmount = payList.reduce((sum, item) => sum + (item.netSalary || 0), 0);
    const paidAmount = payList.reduce((sum, item) => sum + (item.paidAmount || 0), 0);
    const pending = payList.filter(p => p.status === 'pending');
    const processed = payList.filter(p => p.status === 'processed');
    const paid = payList.filter(p => p.status === 'paid');
    const hold = payList.filter(p => p.status === 'hold');
    const partPaid = payList.filter(p => p.status === 'part-paid');
    const employeesWithStructureCount = empList.filter(emp =>
      structList.some(s => s.employeeId === emp.employeeId)
    ).length;

    setPayrollSummary({
      totalAmount, paidAmount,
      pendingAmount: pending.reduce((sum, p) => sum + (p.netSalary || 0), 0),
      holdAmount: hold.reduce((sum, p) => sum + (p.netSalary || 0), 0),
      partPaidAmount: partPaid.reduce((sum, p) => sum + (p.netSalary || 0), 0),
      processedCount: processed.length, pendingCount: pending.length,
      paidCount: paid.length, holdCount: hold.length, partPaidCount: partPaid.length,
      totalEmployees: empList.length, totalRecords: payList.length,
      activeEmployees: empList.filter(e => e.status === 'active').length,
      employeesWithStructure: employeesWithStructureCount,
      employeesWithoutStructure: empList.length - employeesWithStructureCount,
      payrollMonth: selectedMonth,
    });
  };

  useEffect(() => {
    updateSummary(siteFilteredEmployees, filteredPayroll, filteredSalaryStructures);
  }, [siteFilteredEmployees, filteredPayroll, filteredSalaryStructures]);

  useEffect(() => {
    if (selectedMonth) fetchAttendanceForMonth(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => { fetchAllData(); }, [selectedMonth]);

  // Clear selection whenever month changes (avoids stale IDs from a different month)
  useEffect(() => { clearSelection(); }, [selectedMonth]);

  // Fetch deduction preview when process dialog opens
  useEffect(() => {
    if (processDialog.open && processDialog.employee) {
      const fetchPreview = async () => {
        try {
          const response = await axios.get(`${API_URL}/payroll/preview-deductions`, {
            params: { employeeId: processDialog.employee?.employeeId, month: selectedMonth },
          });
          if (response.data.success) setDeductionPreview(response.data.data);
          else setDeductionPreview({ additionalDeductions: 0, items: [] });
        } catch (error) {
          console.error('Failed to fetch deduction preview:', error);
          setDeductionPreview({ additionalDeductions: 0, items: [] });
        }
      };
      fetchPreview();
    } else {
      setDeductionPreview({ additionalDeductions: 0, items: [] });
    }
  }, [processDialog.open, processDialog.employee, selectedMonth]);

  useEffect(() => {
    const compute = async () => {
      if (!slipDialog.salarySlip) { setSlipPaidDays(null); return; }
      const slip = slipDialog.salarySlip;
      const records = (slip.month === selectedMonth && attendance.length > 0)
        ? attendance
        : await fetchAttendanceRecordsForMonth(slip.month);
      const paid = computePaidDays(slip.employeeId, slip.month, records);
      setSlipPaidDays(paid);
    };
    compute();
  }, [slipDialog.salarySlip, selectedMonth, attendance, employees]);

  // ─── Helper functions ───────────────────────────────────────────────
  const getEmployeeAttendance = (employeeId: string) => {
    const employee = employees.find(e => e.employeeId === employeeId || e._id === employeeId);
    if (!employee) return { presentDays: 0, absentDays: 0, halfDays: 0, totalWorkingDays: 22 };

    const monthAttendance = attendance.filter((a) => {
      const matchesEmpId =
        a.employeeId === employee._id ||
        a.employeeId === employee.employeeId ||
        (a.employeeName?.trim().toLowerCase() === employee.name?.trim().toLowerCase());
      return matchesEmpId && a.date?.startsWith(selectedMonth);
    });

    let presentDays = 0, absentDays = 0, halfDays = 0;
    monthAttendance.forEach(a => {
      const status = a.status?.toLowerCase() || '';
      if (status === 'present') presentDays++;
      else if (status === 'half-day' || status === 'half day') halfDays++;
      else absentDays++;
    });
    return { presentDays, absentDays, halfDays, totalWorkingDays: 22 };
  };

  const getEmployeeLeaves = (_: string) => 0;

  const calculateSalary = (employeeId: string, structure: SalaryStructure) => {
    if (!structure || !structure.basicSalary) return 0;
    const attendance = getEmployeeAttendance(employeeId);
    const totalLeaves = getEmployeeLeaves(employeeId);
    const totalWorkingDays = attendance.totalWorkingDays;
    if (totalWorkingDays === 0) return 0;

    const dailyRate = structure.basicSalary / totalWorkingDays;
    const halfDayRate = dailyRate / 2;
    const earnedBasicSalary = attendance.presentDays * dailyRate + attendance.halfDays * halfDayRate;
    const salaryLoss = attendance.absentDays * dailyRate + totalLeaves * dailyRate;
    const netBasicSalary = Math.max(0, earnedBasicSalary - salaryLoss);

    const totalAllowances =
      (structure.hra || 0) + (structure.da || 0) + (structure.specialAllowance || 0) +
      (structure.conveyance || 0) + (structure.medicalAllowance || 0) +
      (structure.otherAllowances || 0) + (structure.leaveEncashment || 0) + (structure.arrears || 0);

    const totalDeductions =
      (structure.providentFund || 0) + (structure.professionalTax || 0) +
      (structure.incomeTax || 0) + (structure.otherDeductions || 0) +
      (structure.esic || 0) + (structure.advance || 0) + (structure.mlwf || 0);

    return Math.max(0, netBasicSalary + totalAllowances - totalDeductions);
  };

  const getPayrollCalculationDetails = (employeeId: string) => {
    const structure = filteredSalaryStructures.find((s) => s.employeeId === employeeId);
    if (!structure) return null;
    const attendance = getEmployeeAttendance(employeeId);
    const totalLeaves = getEmployeeLeaves(employeeId);
    const calculatedSalary = calculateSalary(employeeId, structure);
    const totalAllowances =
      (structure.hra || 0) + (structure.da || 0) + (structure.specialAllowance || 0) +
      (structure.conveyance || 0) + (structure.medicalAllowance || 0) +
      (structure.otherAllowances || 0) + (structure.leaveEncashment || 0) + (structure.arrears || 0);
    const totalDeductions =
      (structure.providentFund || 0) + (structure.professionalTax || 0) +
      (structure.incomeTax || 0) + (structure.otherDeductions || 0) +
      (structure.esic || 0) + (structure.advance || 0) + (structure.mlwf || 0);
    const dailyRate = structure.basicSalary / attendance.totalWorkingDays;
    const basicSalaryEarned = attendance.presentDays * dailyRate + (attendance.halfDays * dailyRate) / 2;
    const salaryDeductions = attendance.absentDays * dailyRate + totalLeaves * dailyRate;
    const netBasicSalary = basicSalaryEarned - salaryDeductions;

    return {
      structure, attendance, totalLeaves, calculatedSalary, totalAllowances,
      totalDeductions, dailyRate, basicSalaryEarned, salaryDeductions, netBasicSalary,
    };
  };

  // ─── Action handlers ────────────────────────────────────────────────
  const handleProcessPayroll = async (employeeId: string) => {
    const employee = siteFilteredEmployees.find((e) => e.employeeId === employeeId);
    if (!employee) { toast.error("Employee not found"); return; }
    const structure = filteredSalaryStructures.find((s) => s.employeeId === employeeId);
    if (!structure) { toast.error("Salary structure not found"); return; }
    const existingPayroll = filteredPayroll.find(p => p.employeeId === employeeId && p.month === selectedMonth);
    if (existingPayroll) { toast.error("Payroll already processed for " + selectedMonth); return; }

    const attendanceData = getEmployeeAttendance(employeeId);
    const leavesCount = getEmployeeLeaves(employeeId);
    const calculatedSalary = calculateSalary(employeeId, structure);

    const payrollData = {
      employeeId, month: selectedMonth,
      basicSalary: structure.basicSalary,
      allowances: (structure.hra || 0) + (structure.da || 0) + (structure.specialAllowance || 0) +
        (structure.conveyance || 0) + (structure.medicalAllowance || 0) +
        (structure.otherAllowances || 0) + (structure.leaveEncashment || 0) + (structure.arrears || 0),
      deductions: (structure.providentFund || 0) + (structure.professionalTax || 0) +
        (structure.incomeTax || 0) + (structure.otherDeductions || 0) +
        (structure.esic || 0) + (structure.advance || 0) + (structure.mlwf || 0),
      netSalary: calculatedSalary,
      status: "processed",
      presentDays: attendanceData.presentDays,
      absentDays: attendanceData.absentDays,
      halfDays: attendanceData.halfDays,
      leaves: leavesCount,
      paidAmount: 0, paymentStatus: "pending",
      da: structure.da, hra: structure.hra,
      providentFund: structure.providentFund, professionalTax: structure.professionalTax,
      esic: structure.esic, advance: structure.advance, mlwf: structure.mlwf,
      leaveEncashment: structure.leaveEncashment, arrears: structure.arrears,
      createdBy: "system", updatedBy: "system",
      employeeDetails: {
        accountNumber: employee.accountNumber, ifscCode: employee.ifscCode,
        bankBranch: employee.bankBranch, bankName: employee.bankName,
        aadharNumber: employee.aadharNumber, panNumber: employee.panNumber,
        esicNumber: employee.esicNumber, uanNumber: employee.uanNumber,
        permanentAddress: employee.permanentAddress, localAddress: employee.localAddress,
      },
    };

    try {
      const response = await payrollApi.process(payrollData);
      if (response.success) {
        toast.success("Payroll processed successfully", { description: `Salary processed for ${employee.name}` });
        if (response.data) setPayroll((prev) => [...prev, response.data!]);
        setProcessDialog({ open: false, employee: null });
        fetchAllData();
      } else {
        toast.error(response.message || "Failed to process payroll");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to process payroll");
    }
  };

  const handleUpdatePaymentStatus = async () => {
    if (!paymentStatusDialog.payroll) { toast.error("Payroll is missing"); return; }
    const payrollId = getItemId(paymentStatusDialog.payroll);
    if (!payrollId) { toast.error("Payroll ID is missing"); return; }

    if (paymentStatusForm.status === "part-paid") {
      const paidAmount = parseFloat(paymentStatusForm.paidAmount);
      if (isNaN(paidAmount) || paidAmount <= 0) { toast.error("Enter a valid paid amount"); return; }
      if (paidAmount > (paymentStatusDialog.payroll.netSalary || 0)) { toast.error("Paid amount exceeds net salary"); return; }
    }
    if ((paymentStatusForm.status === "paid" || paymentStatusForm.status === "part-paid") && !paymentStatusForm.paymentDate) {
      toast.error("Payment date is required"); return;
    }
    try {
      const response = await payrollApi.updatePaymentStatus(payrollId, paymentStatusForm);
      if (response.success) {
        toast.success("Payment status updated");
        setPayroll((prev) => prev.map((p) => {
          const pId = getItemId(p);
          if (pId === payrollId && response.data) return { ...p, ...response.data };
          return p;
        }));
        setPaymentStatusDialog({ open: false, payroll: null });
        setPaymentStatusForm({
          status: "paid", paidAmount: "", notes: "",
          paymentDate: new Date().toISOString().split("T")[0],
        });
        fetchAllData();
      } else {
        toast.error(response.message || "Failed to update payment status");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update payment status");
    }
  };

  const handleProcessAllPayroll = async () => {
    if (employeesWithStructure.length === 0) {
      toast.error("No employees with salary structures found"); return;
    }
    try {
      const employeeIds = employeesWithStructure.map((emp) => emp.employeeId);
      const attendanceMap: any = {};
      for (const employee of employeesWithStructure) {
        const att = getEmployeeAttendance(employee.employeeId);
        const leaves = getEmployeeLeaves(employee.employeeId);
        attendanceMap[employee.employeeId] = {
          presentDays: att.presentDays, absentDays: att.absentDays,
          halfDays: att.halfDays, leaves, totalWorkingDays: att.totalWorkingDays,
        };
      }
      const response = await payrollApi.bulkProcess({ month: selectedMonth, employeeIds, attendanceMap });
      if (response.success) {
        toast.success(`Payroll processed for ${response.results?.length || 0} employees`);
        setProcessAllDialog(false);
        fetchAllData();
      } else {
        toast.error(response.message || "Failed to process payroll");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to process payroll");
    }
  };

  const handleAddStructure = async () => {
    if (!structureForm.employeeId) { toast.error("Please select an employee"); return; }
    try {
      const employee = siteFilteredEmployees.find((e) => e.employeeId === structureForm.employeeId);
      if (!employee) { toast.error("Employee not found"); return; }
      const salaryStructureData = {
        employeeId: structureForm.employeeId,
        basicSalary: parseFloat(structureForm.basicSalary) || employee.salary || 0,
        hra: parseFloat(structureForm.hra) || 0,
        da: parseFloat(structureForm.da) || 0,
        specialAllowance: parseFloat(structureForm.specialAllowance) || 0,
        conveyance: parseFloat(structureForm.conveyance) || 0,
        medicalAllowance: parseFloat(structureForm.medicalAllowance) || 0,
        otherAllowances: parseFloat(structureForm.otherAllowances) || 0,
        providentFund: parseFloat(structureForm.providentFund) || employee.providentFund || 0,
        professionalTax: parseFloat(structureForm.professionalTax) || employee.professionalTax || 0,
        incomeTax: parseFloat(structureForm.incomeTax) || 0,
        otherDeductions: parseFloat(structureForm.otherDeductions) || 0,
        leaveEncashment: parseFloat(structureForm.leaveEncashment) || 0,
        arrears: parseFloat(structureForm.arrears) || 0,
        esic: parseFloat(structureForm.esic) || 0,
        advance: parseFloat(structureForm.advance) || 0,
        mlwf: parseFloat(structureForm.mlwf) || 0,
        isActive: true,
      };
      const response = await salaryStructureApi.create(salaryStructureData);
      if (response.success) {
        toast.success("Salary structure added", { description: `Structure configured for ${employee.name}` });
        setSalaryStructures((prev) => [...prev, response.data!]);
        setIsAddingStructure(false);
        resetStructureForm();
        fetchAllData();
      } else {
        toast.error(response.message || "Failed to add salary structure");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add salary structure");
    }
  };

  const handleUpdateStructure = async () => {
    if (!editingStructure) return;
    try {
      const updates = {
        basicSalary: parseFloat(structureForm.basicSalary) || 0,
        hra: parseFloat(structureForm.hra) || 0,
        da: parseFloat(structureForm.da) || 0,
        specialAllowance: parseFloat(structureForm.specialAllowance) || 0,
        conveyance: parseFloat(structureForm.conveyance) || 0,
        medicalAllowance: parseFloat(structureForm.medicalAllowance) || 0,
        otherAllowances: parseFloat(structureForm.otherAllowances) || 0,
        providentFund: parseFloat(structureForm.providentFund) || 0,
        professionalTax: parseFloat(structureForm.professionalTax) || 0,
        incomeTax: parseFloat(structureForm.incomeTax) || 0,
        otherDeductions: parseFloat(structureForm.otherDeductions) || 0,
        leaveEncashment: parseFloat(structureForm.leaveEncashment) || 0,
        arrears: parseFloat(structureForm.arrears) || 0,
        esic: parseFloat(structureForm.esic) || 0,
        advance: parseFloat(structureForm.advance) || 0,
        mlwf: parseFloat(structureForm.mlwf) || 0,
      };
      const response = await salaryStructureApi.update(getItemId(editingStructure), updates);
      if (response.success) {
        toast.success("Salary structure updated successfully");
        setSalaryStructures((prev) => prev.map((s) => {
          const sId = getItemId(s);
          if (sId === getItemId(editingStructure) && response.data) return response.data!;
          return s;
        }));
        setEditingStructure(null);
        resetStructureForm();
        fetchAllData();
      } else {
        toast.error(response.message || "Failed to update salary structure");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update salary structure");
    }
  };

  const handleDeleteStructure = async (id: string) => {
    if (!id) { toast.error("Structure ID is missing"); return; }
    try {
      const response = await salaryStructureApi.delete(id);
      if (response.success) {
        toast.success("Salary structure deleted successfully");
        setSalaryStructures((prev) => prev.filter((s) => getItemId(s) !== id));
        setDeleteDialog({ open: false, structure: null });
        fetchAllData();
      } else {
        toast.error(response.message || "Failed to delete salary structure");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete salary structure");
    }
  };

  const handleEditStructure = (structure: SalaryStructure) => {
    setEditingStructure(structure);
    setStructureForm({
      employeeId: structure.employeeId || "",
      basicSalary: structure.basicSalary.toString(),
      hra: (structure.hra || 0).toString(),
      da: (structure.da || 0).toString(),
      specialAllowance: (structure.specialAllowance || 0).toString(),
      conveyance: (structure.conveyance || 0).toString(),
      medicalAllowance: (structure.medicalAllowance || 0).toString(),
      otherAllowances: (structure.otherAllowances || 0).toString(),
      providentFund: (structure.providentFund || 0).toString(),
      professionalTax: (structure.professionalTax || 0).toString(),
      incomeTax: (structure.incomeTax || 0).toString(),
      otherDeductions: (structure.otherDeductions || 0).toString(),
      leaveEncashment: (structure.leaveEncashment || 0).toString(),
      arrears: (structure.arrears || 0).toString(),
      esic: (structure.esic || 0).toString(),
      advance: (structure.advance || 0).toString(),
      mlwf: (structure.mlwf || 0).toString(),
    });
  };

  const handleGenerateSalarySlip = async (payrollId: string) => {
    if (!payrollId) { toast.error("Payroll ID is missing"); return; }
    try {
      const response = await salarySlipApi.generate({ payrollId });
      if (response.success) {
        toast.success("Salary slip generated successfully");
        if (response.data) {
          setSalarySlips((prev) => [...prev, response.data!]);
          setSlipDialog({ open: true, salarySlip: response.data! });
        }
      } else {
        toast.error(response.message || "Failed to generate salary slip");
      }
    } catch (error: any) {
      const existingSlip = error.response?.data?.data;
      if (error.response?.status === 400 && existingSlip) {
        setSalarySlips((prev) => {
          if (!prev.find(s => s._id === existingSlip._id)) return [...prev, existingSlip];
          return prev;
        });
        setSlipDialog({ open: true, salarySlip: existingSlip });
        toast.info("Salary slip already exists");
        return;
      }
      toast.error(error.response?.data?.message || "Failed to generate salary slip");
    }
  };

  // ─── DELETE SALARY SLIP ─────────────────────────────────────────────
  const handleDeleteSlip = async () => {
    if (!slipDialog.salarySlip) return;
    const slipId = getItemId(slipDialog.salarySlip);
    if (!slipId) {
      toast.error("Salary slip ID is missing");
      return;
    }

    if (!confirm(
      "Delete this salary slip?\n\n" +
      "You can regenerate it after re-processing the payroll."
    )) return;

    try {
      const response = await axios.delete(
        `${API_URL}/salary-slips/${slipId}`,
        { headers: authHeaders() }
      );
      if (response.data.success) {
        toast.success("Salary slip deleted");
        setSlipDialog({ open: false, salarySlip: null });
        fetchAllData();
      } else {
        toast.error(response.data.message || "Failed to delete slip");
      }
    } catch (error: any) {
      console.error("Error deleting salary slip:", error);
      toast.error(error.response?.data?.message || "Failed to delete salary slip");
    }
  };

  // ─── OPEN ADJUST DIALOG ─────────────────────────────────────────────
  const handleOpenAdjust = (payroll: Payroll) => {
    setAdjustDialog({ open: true, payroll });
    setAdjustForm({ amount: "", reason: "" });
  };

  // ─── SAVE ADJUSTMENT ────────────────────────────────────────────────
  const handleSaveAdjustment = async () => {
    if (!adjustDialog.payroll) return;
    const payrollId = getItemId(adjustDialog.payroll);
    if (!payrollId) { toast.error("Payroll ID missing"); return; }

    const amount = parseFloat(adjustForm.amount);
    if (isNaN(amount) || amount === 0) {
      toast.error("Amount must be non-zero");
      return;
    }
    if (!adjustForm.reason || adjustForm.reason.trim().length < 3) {
      toast.error("Please enter a reason (min 3 characters)");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/payroll/${payrollId}/adjust`,
        { amount, reason: adjustForm.reason.trim() },
        { headers: authHeaders() }
      );
      if (response.data.success) {
        toast.success("Adjustment added", {
          description: `New net salary: ₹${fmtMoney(response.data.newNetSalary)}`,
        });
        setAdjustDialog({ open: false, payroll: null });
        setAdjustForm({ amount: "", reason: "" });
        fetchAllData();
      } else {
        toast.error(response.data.message || "Failed to add adjustment");
      }
    } catch (error: any) {
      console.error("Error adding adjustment:", error);
      toast.error(error.response?.data?.message || "Failed to add adjustment");
    }
  };

  // ─── REMOVE ADJUSTMENT ──────────────────────────────────────────────
  const handleRemoveAdjustment = async (payrollId: string, index: number) => {
    if (!confirm("Remove this adjustment? Net salary will be recalculated.")) return;
    try {
      const response = await axios.delete(
        `${API_URL}/payroll/${payrollId}/adjust/${index}`,
        { headers: authHeaders() }
      );
      if (response.data.success) {
        toast.success("Adjustment removed");
        fetchAllData();
      } else {
        toast.error(response.data.message || "Failed to remove adjustment");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to remove adjustment");
    }
  };

  // ─── BULK DELETE ────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedPayrollIds);
    if (ids.length === 0) { toast.error("No records selected"); return; }

    setBulkActionLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/payroll/bulk-delete`,
        { ids, reason: bulkDeleteForm.reason.trim() },
        { headers: authHeaders() }
      );

      if (response.data.success) {
        const { deleted, skipped, errors } = response.data.data;
        toast.success(`Deleted ${deleted} record(s)`, {
          description: [
            skipped.length > 0 ? `${skipped.length} skipped (slip exists)` : '',
            errors.length > 0 ? `${errors.length} failed` : '',
          ].filter(Boolean).join(' · ') || undefined,
        });
        setBulkDeleteDialog(false);
        setBulkDeleteForm({ reason: "" });
        clearSelection();
        fetchAllData();
      } else {
        toast.error(response.data.message || "Bulk delete failed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Bulk delete failed");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // ─── BULK PAYMENT STATUS ────────────────────────────────────────────
  const handleBulkPaymentStatus = async () => {
    const ids = Array.from(selectedPayrollIds);
    if (ids.length === 0) { toast.error("No records selected"); return; }

    setBulkActionLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/payroll/bulk-payment-status`,
        {
          ids,
          status: bulkStatusForm.status,
          paymentDate: bulkStatusForm.status === 'paid' ? bulkStatusForm.paymentDate : undefined,
        },
        { headers: authHeaders() }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        setBulkStatusDialog(false);
        clearSelection();
        fetchAllData();
      } else {
        toast.error(response.data.message || "Bulk status update failed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Bulk status update failed");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // ─── BULK GENERATE SLIPS ────────────────────────────────────────────
  const handleBulkGenerateSlips = async () => {
    const ids = Array.from(selectedPayrollIds);
    if (ids.length === 0) { toast.error("No records selected"); return; }

    setBulkActionLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/payroll/bulk-generate-slips`,
        { ids },
        { headers: authHeaders() }
      );

      if (response.data.success) {
        const { generated, skipped } = response.data.data;
        toast.success(`Generated ${generated} slip(s)`, {
          description: skipped.length > 0 ? `${skipped.length} skipped (already exist)` : undefined,
        });
        clearSelection();
        fetchAllData();
      } else {
        toast.error(response.data.message || "Bulk generate failed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Bulk generate failed");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // ─── DELETE PAYROLL RECORD ──────────────────────────────────────────
  const handleDeletePayroll = async (payrollId: string) => {
    if (!payrollId) {
      toast.error("Payroll ID is missing");
      return;
    }

    const slip = filteredSalarySlips.find(s => s.payrollId === payrollId);
    if (slip) {
      toast.error("Cannot delete payroll — salary slip exists", {
        description: "Delete the salary slip first (open it → Delete Slip).",
      });
      return;
    }

    if (!confirm(
      "Delete this payroll record?\n\n" +
      "• Consumed fines will be marked as ACTIVE again.\n" +
      "• Advance repayments will be reversed.\n" +
      "• You can re-process payroll afterward."
    )) return;

    try {
      const response = await axios.delete(
        `${API_URL}/payroll/${payrollId}`,
        { headers: authHeaders() }
      );
      if (response.data.success) {
        toast.success("Payroll record deleted", {
          description: "Consumed deductions/advances have been reversed.",
        });
        fetchAllData();
      } else {
        toast.error(response.data.message || "Failed to delete payroll");
      }
    } catch (error: any) {
      console.error("Error deleting payroll:", error);
      toast.error(error.response?.data?.message || "Failed to delete payroll");
    }
  };

  // ─── REPROCESS PAYROLL (Delete + Recreate) ──────────────────────────
  const handleReprocessPayroll = async (payrollId: string, employee: Employee) => {
    if (!payrollId) {
      toast.error("Payroll ID is missing");
      return;
    }

    const slip = filteredSalarySlips.find(s => s.payrollId === payrollId);
    if (slip) {
      toast.error("Cannot reprocess — salary slip exists", {
        description: "Delete the salary slip first (open it → Delete Slip).",
      });
      return;
    }

    if (!confirm(
      `Reprocess payroll for ${employee.name}?\n\n` +
      "This will:\n" +
      "• Delete the current payroll record\n" +
      "• Reverse any consumed fines/advances\n" +
      "• You can then process fresh payroll with the latest data."
    )) return;

    try {
      const response = await axios.delete(
        `${API_URL}/payroll/${payrollId}`,
        { headers: authHeaders() }
      );
      if (response.data.success) {
        toast.success("Payroll removed — ready to reprocess", {
          description: `Click "Process Salary" for ${employee.name} to create a fresh record.`,
        });
        fetchAllData();
      } else {
        toast.error(response.data.message || "Failed to reprocess payroll");
      }
    } catch (error: any) {
      console.error("Error reprocessing payroll:", error);
      toast.error(error.response?.data?.message || "Failed to reprocess payroll");
    }
  };

  const handleViewSalarySlip = (salarySlip: SalarySlip) => {
    setSlipDialog({ open: true, salarySlip });
  };

  // ─── PRINT SALARY SLIP ──────────────────────────────────────────────
  const handlePrintSalarySlip = () => {
    if (!slipDialog.salarySlip) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Please allow popups for this site"); return; }

    const employee = siteFilteredEmployees.find(
      (e) => e.employeeId === slipDialog.salarySlip!.employeeId
    );
    if (!employee) return;

    const slip = slipDialog.salarySlip;

    const payrollRecord = filteredPayroll.find(
      (p) => p.employeeId === slip.employeeId && p.month === slip.month
    );
    const structure = salaryStructures.find((s) => s.employeeId === slip.employeeId);

    const pf = payrollRecord?.providentFund ?? structure?.providentFund ?? 0;
    const esic = payrollRecord?.esic ?? structure?.esic ?? 0;
    const pt = payrollRecord?.professionalTax ?? structure?.professionalTax ?? 0;
    const mlwf = payrollRecord?.mlwf ?? structure?.mlwf ?? 0;
    const structureAdv = payrollRecord?.advance ?? structure?.advance ?? 0;

    const items = payrollRecord?.deductionBreakdown?.items || [];
    const advanceTotal = items.filter(i => i.type === 'advance').reduce((s, i) => s + i.amount, 0);
    const fineTotal = items.filter(i => i.type === 'fine').reduce((s, i) => s + i.amount, 0);
    const otherTotal = items.filter(i => i.type === 'other').reduce((s, i) => s + i.amount, 0);

    const totalDeductions = pf + esic + pt + mlwf + structureAdv + advanceTotal + fineTotal + otherTotal;
    const grossTotal = (slip.basicSalary || 0) + (slip.allowances || 0);
    const paidDays = slip.presentDays ?? slipPaidDays ?? 0;

    const [year, monthNum] = slip.month.split('-');
    const monthLabel = new Date(parseInt(year), parseInt(monthNum) - 1)
      .toLocaleString('default', { month: 'short', year: '2-digit' }).toUpperCase();

    const siteName = sites.find(s => s._id === (employee.siteId || employee.site))?.name
      || employee.siteName || employee.site || 'N/A';

    const additionalRowsHtml = items.length > 0
      ? items.map((item: any) => `
          <tr>
            <td style="padding:6px 8px;border:1px solid #ddd;">${item.type === 'advance' ? 'ADVANCE' :
          item.type === 'fine' ? 'FINE' : 'OTHER'
        }</td>
            <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;color:#dc2626;">-₹${fmtMoney(item.amount)}</td>
            <td style="padding:6px 8px;border:1px solid #ddd;font-size:11px;color:#555;">${item.description || ''}</td>
          </tr>`).join('')
      : '';

    const adjustments = payrollRecord?.manualAdjustments || [];
    const adjustmentsTotal = adjustments.reduce((s, a) => s + (a.amount || 0), 0);
    const adjustmentsRowsHtml = adjustments.length > 0
      ? adjustments.map((adj: any) => `
          <tr>
            <td style="padding:6px 8px;border:1px solid #ddd;">${adj.amount >= 0 ? 'BONUS' : 'ADJUSTMENT'}</td>
            <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;color:${adj.amount >= 0 ? '#16a34a' : '#dc2626'};">
              ${adj.amount >= 0 ? '+' : ''}₹${fmtMoney(adj.amount)}
            </td>
            <td style="padding:6px 8px;border:1px solid #ddd;font-size:11px;color:#555;">
              ${adj.reason || ''}
            </td>
          </tr>`).join('')
      : '';

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Slip - ${employee.name}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; font-size: 13px; }
          .outer { border: 1px solid #000; padding: 12px; }
          .top-note { text-align: center; font-size: 11px; }
          .company-name { text-align: center; font-size: 22px; font-weight: bold; margin: 4px 0; }
          .company-addr { text-align: center; font-size: 12px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; }
          .meta td { border: 1px solid #000; padding: 4px 6px; font-size: 12px; }
          .emol th, .emol td { border: 1px solid #000; padding: 5px 8px; font-size: 12px; }
          .emol th { background: #f0f0f0; text-align: center; }
          .amt { text-align: right; }
          .total-row td { font-weight: bold; background: #f9f9f9; }
          .net-payable { text-align: right; font-size: 15px; font-weight: bold; margin-top: 10px; }
          .sign { text-align: right; margin-top: 30px; font-size: 12px; }
          .footer-note { text-align: center; font-size: 10px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="outer">
          <div class="top-note">Wages Slip Rule 27(2) Maharashtra Minimum Wages Rules, 1963</div>
          <div class="company-name">S K ENTERPRISES</div>
          <div class="company-addr">Office No 505, Global Square, Deccan College Road, Yerwada, Pune 411006</div>

          <table class="meta">
            <tr>
              <td><strong>MONTH:</strong> ${monthLabel}</td>
              <td><strong>SITE NAME:</strong> ${siteName}</td>
              <td><strong>SR. NO:</strong> ${employee.employeeId}</td>
            </tr>
            <tr>
              <td><strong>Name:</strong> ${employee.name}</td>
              <td><strong>Paid Days:</strong> ${paidDays}</td>
              <td><strong>UAN:</strong> ${employee.uanNumber || '-'}</td>
            </tr>
            <tr>
              <td><strong>Designation:</strong> ${employee.position || 'N/A'}</td>
              <td><strong>ESIC NO:</strong> ${employee.esicNumber || '-'}</td>
              <td><strong>Bank A/C:</strong> ${employee.accountNumber || 'N/A'}</td>
            </tr>
          </table>

          <table class="emol" style="margin-top:8px;">
            <tr><th>EMOLUMENTS</th><th>AMOUNT</th><th>DEDUCTIONS</th><th>AMOUNT</th></tr>
            <tr><td>BASIC</td><td class="amt">₹${fmtMoney(slip.basicSalary)}</td><td>PF</td><td class="amt">₹${fmtMoney(pf)}</td></tr>
            <tr><td>DA</td><td class="amt">₹${fmtMoney(payrollRecord?.da || structure?.da || 0)}</td><td>ESIC</td><td class="amt">₹${fmtMoney(esic)}</td></tr>
            <tr><td>HRA</td><td class="amt">₹${fmtMoney(payrollRecord?.hra || structure?.hra || 0)}</td><td>PT</td><td class="amt">₹${fmtMoney(pt)}</td></tr>
            <tr><td>OTHERS</td><td class="amt">₹${fmtMoney(payrollRecord?.otherAllowances || structure?.otherAllowances || 0)}</td><td>MLWF</td><td class="amt">₹${fmtMoney(mlwf)}</td></tr>
            <tr><td>BONUS</td><td class="amt">₹0</td><td>ADVANCE</td><td class="amt">₹${fmtMoney(advanceTotal || structureAdv)}</td></tr>
            <tr><td>LEAVE</td><td class="amt">₹${fmtMoney(payrollRecord?.leaveEncashment || structure?.leaveEncashment || 0)}</td><td>FINE</td><td class="amt">₹${fmtMoney(fineTotal)}</td></tr>
            <tr><td>ARREARS</td><td class="amt">₹${fmtMoney(payrollRecord?.arrears || structure?.arrears || 0)}</td><td>UNIFORM/ID</td><td class="amt">₹${fmtMoney(otherTotal)}</td></tr>
            <tr class="total-row">
              <td>TOTAL</td><td class="amt">₹${fmtMoney(grossTotal)}</td>
              <td>TOTAL DEDUCTION</td><td class="amt">₹${fmtMoney(totalDeductions)}</td>
            </tr>
          </table>

          ${items.length > 0 ? `
            <div style="margin-top:12px;">
              <div style="font-weight:bold;font-size:13px;background:#fef3c7;padding:5px 8px;border:1px solid #ddd;">Additional Deductions Breakdown</div>
              <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead>
                  <tr style="background:#fef3c7;">
                    <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Type</th>
                    <th style="padding:6px 8px;border:1px solid #ddd;text-align:right;">Amount</th>
                    <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Description</th>
                  </tr>
                </thead>
                <tbody>${additionalRowsHtml}</tbody>
              </table>
            </div>` : ''}

          ${adjustments.length > 0 ? `
            <div style="margin-top:12px;">
              <div style="font-weight:bold;font-size:13px;background:#dcfce7;padding:5px 8px;border:1px solid #ddd;">Adjustments / Bonus</div>
              <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead>
                  <tr style="background:#dcfce7;">
                    <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Type</th>
                    <th style="padding:6px 8px;border:1px solid #ddd;text-align:right;">Amount</th>
                    <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Reason</th>
                  </tr>
                </thead>
                <tbody>${adjustmentsRowsHtml}</tbody>
              </table>
            </div>` : ''}

          <div class="net-payable">NET PAYABLE: ₹${fmtMoney((slip.netSalary || 0) + adjustmentsTotal)}</div>

          <div class="sign">for S K Enterprises<br/><br/><br/>Auth. Sign.</div>
          <div class="footer-note">THIS IS COMPUTER GENERATED SLIP NOT REQUIRED SIGNATURE &amp; STAMP</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = function () {
      printWindow.print();
      setTimeout(() => printWindow.close(), 1000);
    };
  };

  const handleSendSalarySlip = async () => {
    if (!slipDialog.salarySlip) return;
    const slipId = getItemId(slipDialog.salarySlip);
    if (!slipId) { toast.error("Salary slip ID is missing"); return; }
    try {
      const response = await salarySlipApi.markAsEmailed(slipId);
      if (response.success) {
        toast.success("Salary slip sent!");
        setSalarySlips((prev) => prev.map((slip) =>
          getItemId(slip) === slipId ? { ...slip, emailSent: true, emailSentAt: new Date().toISOString() } : slip
        ));
        setSlipDialog({ open: false, salarySlip: null });
      } else {
        toast.error(response.message || "Failed to send salary slip");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send salary slip");
    }
  };

  const handleExportPayrollExcel = async () => {
    if (!filteredPayroll || filteredPayroll.length === 0) {
      toast.error("No payroll data to export for selected site"); return;
    }
    try {
      const response = await payrollApi.export({
        month: selectedMonth, format: "csv",
        site: selectedSite !== 'all' ? selectedSite : undefined,
      });
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `payroll-${selectedMonth}${selectedSite !== 'all' ? '-filtered' : ''}.csv`);
      document.body.appendChild(link); link.click(); link.remove();
      toast.success("Payroll exported successfully");
    } catch (error: any) {
      let errorMessage = "Failed to export payroll";
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          errorMessage = json.message || errorMessage;
        } catch { errorMessage = await error.response.data.text() || errorMessage; }
      } else {
        errorMessage = error.response?.data?.message || error.message || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  const handleExportClientReport = async () => {
    try {
      const response = await payrollApi.export({
        month: selectedMonth, format: 'client-template',
        site: selectedSite !== 'all' ? selectedSite : undefined,
      });
      const blob = new Blob([response], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `client-payroll-${selectedMonth}.xlsx`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Client report exported successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to export client report');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; bgColor: string; textColor: string; borderColor: string }> = {
      pending: { label: "Pending", bgColor: "bg-amber-50", textColor: "text-amber-800", borderColor: "border-amber-200" },
      processed: { label: "Processed", bgColor: "bg-blue-50", textColor: "text-blue-800", borderColor: "border-blue-200" },
      paid: { label: "Paid", bgColor: "bg-green-50", textColor: "text-green-800", borderColor: "border-green-200" },
      hold: { label: "Hold", bgColor: "bg-red-50", textColor: "text-red-800", borderColor: "border-red-200" },
      "part-paid": { label: "Part Paid", bgColor: "bg-orange-50", textColor: "text-orange-800", borderColor: "border-orange-200" },
    };
    const config = statusConfig[status] || {
      label: status, bgColor: "bg-gray-50", textColor: "text-gray-800", borderColor: "border-gray-200",
    };
    return (
      <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
        <div className="h-2 w-2 rounded-full bg-current mr-2"></div>
        {config.label}
      </div>
    );
  };

  const getEmployeeDetails = (employeeId: string) =>
    siteFilteredEmployees.find((e) => e.employeeId === employeeId) || null;

  const calculateStructureTotals = () => {
    const basic = parseFloat(structureForm.basicSalary) || 0;
    const hra = parseFloat(structureForm.hra) || 0;
    const da = parseFloat(structureForm.da) || 0;
    const specialAllowance = parseFloat(structureForm.specialAllowance) || 0;
    const conveyance = parseFloat(structureForm.conveyance) || 0;
    const medicalAllowance = parseFloat(structureForm.medicalAllowance) || 0;
    const otherAllowances = parseFloat(structureForm.otherAllowances) || 0;
    const leaveEncashment = parseFloat(structureForm.leaveEncashment) || 0;
    const arrears = parseFloat(structureForm.arrears) || 0;
    const providentFund = parseFloat(structureForm.providentFund) || 0;
    const professionalTax = parseFloat(structureForm.professionalTax) || 0;
    const incomeTax = parseFloat(structureForm.incomeTax) || 0;
    const otherDeductions = parseFloat(structureForm.otherDeductions) || 0;
    const esic = parseFloat(structureForm.esic) || 0;
    const advance = parseFloat(structureForm.advance) || 0;
    const mlwf = parseFloat(structureForm.mlwf) || 0;
    const totalEarnings = basic + hra + da + specialAllowance + conveyance + medicalAllowance + otherAllowances + leaveEncashment + arrears;
    const totalDeductions = providentFund + professionalTax + incomeTax + otherDeductions + esic + advance + mlwf;
    return { totalEarnings, totalDeductions, netSalary: totalEarnings - totalDeductions };
  };

  const resetStructureForm = () => {
    setStructureForm({
      employeeId: "", basicSalary: "", hra: "", da: "", specialAllowance: "",
      conveyance: "", medicalAllowance: "", otherAllowances: "", providentFund: "",
      professionalTax: "", incomeTax: "", otherDeductions: "", leaveEncashment: "",
      arrears: "", esic: "", advance: "", mlwf: "",
    });
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = siteFilteredEmployees.find((e) => e.employeeId === employeeId);
    if (employee) {
      setStructureForm((prev) => ({
        ...prev, employeeId,
        basicSalary: (employee.salary ?? 0).toString(),
        providentFund: (employee.providentFund ?? 0).toString(),
        professionalTax: (employee.professionalTax ?? 0).toString(),
      }));
    }
  };

  const handleOpenPaymentStatus = (payroll: Payroll) => {
    const payrollId = getItemId(payroll);
    if (!payrollId) { toast.error("Payroll ID missing"); return; }
    setPaymentStatusDialog({ open: true, payroll });
    setPaymentStatusForm({
      status: payroll.paymentStatus || "pending",
      paidAmount: payroll.paidAmount?.toString() || "0",
      notes: payroll.notes || "",
      paymentDate: payroll.paymentDate || new Date().toISOString().split("T")[0],
    });
  };

  const getMonthOptions = () => {
    const options = [];
    const currentYear = new Date().getFullYear();
    for (let year = 2024; year <= currentYear + 1; year++) {
      for (let month = 1; month <= 12; month++) {
        const value = `${year}-${String(month).padStart(2, '0')}`;
        const label = new Date(year, month - 1).toLocaleString('default', { month: 'long' }) + ` ${year}`;
        options.push({ value, label });
      }
    }
    return options;
  };
  const monthOptions = getMonthOptions();

  const handleRefreshData = () => fetchAllData();

  // ─── Import structures ──────────────────────────────────────────────
  const downloadStructureTemplate = () => {
    const headers = ['Employee ID*', 'Employee Name', 'Basic Salary', 'HRA', 'DA', 'Special Allowance', 'Conveyance', 'Medical Allowance', 'Other Allowances', 'Provident Fund', 'Professional Tax', 'Income Tax', 'Other Deductions', 'Leave Encashment', 'Arrears', 'ESIC', 'Advance', 'MLWF'];
    const sample = ['EMP001', 'John Doe', '25000', '5000', '3000', '2000', '1000', '1500', '0', '1800', '200', '0', '0', '0', '0', '0', '0', '0'];
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Salary Structures');
    XLSX.writeFile(wb, 'Salary_Structure_Template.xlsx');
  };

  const readStructureFile = (file: File): Promise<any[]> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          resolve(XLSX.utils.sheet_to_json(sheet, { defval: '' }));
        } catch (error) { reject(error); }
      };
      reader.readAsBinaryString(file);
    });

  const validateStructureRows = (rows: any[]) => {
    const valid: any[] = [];
    const invalid: any[] = [];
    const missingEmployees: string[] = [];
    const errors: string[] = [];
    const employeeMap = new Map(siteFilteredEmployees.map(e => [e.employeeId, e]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const empId = row['Employee ID']?.toString().trim();
      if (!empId) { errors.push(`Row ${rowNum}: Missing Employee ID`); invalid.push(row); continue; }
      const employee = employeeMap.get(empId);
      if (!employee) { missingEmployees.push(`${empId} (Row ${rowNum})`); invalid.push(row); continue; }
      valid.push({
        employeeId: empId,
        basicSalary: parseFloat(row['Basic Salary']) || 0,
        hra: parseFloat(row['HRA']) || 0,
        da: parseFloat(row['DA']) || 0,
        specialAllowance: parseFloat(row['Special Allowance']) || 0,
        conveyance: parseFloat(row['Conveyance']) || 0,
        medicalAllowance: parseFloat(row['Medical Allowance']) || 0,
        otherAllowances: parseFloat(row['Other Allowances']) || 0,
        providentFund: parseFloat(row['Provident Fund']) || 0,
        professionalTax: parseFloat(row['Professional Tax']) || 0,
        incomeTax: parseFloat(row['Income Tax']) || 0,
        otherDeductions: parseFloat(row['Other Deductions']) || 0,
        leaveEncashment: parseFloat(row['Leave Encashment']) || 0,
        arrears: parseFloat(row['Arrears']) || 0,
        esic: parseFloat(row['ESIC']) || 0,
        advance: parseFloat(row['Advance']) || 0,
        mlwf: parseFloat(row['MLWF']) || 0,
      });
    }
    setImportErrors(errors);
    return { valid, invalid, missingEmployees };
  };

  const handleStructureFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportLoading(true);
    try {
      const data = await readStructureFile(file);
      setImportPreview(data);
      const results = validateStructureRows(data);
      setImportValidationResults(results);
      if (results.valid.length > 0) toast.success(`${results.valid.length} valid structures ready`);
      if (results.missingEmployees.length > 0) toast.warning(`${results.missingEmployees.length} employees not found`);
    } catch {
      toast.error('Failed to read file');
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportStructures = async () => {
    if (importValidationResults.valid.length === 0) { toast.error('No valid structures to import'); return; }
    setImportLoading(true);
    try {
      const response = await salaryStructureApi.import(importValidationResults.valid);
      if (response.success) {
        toast.success(`Imported ${response.data?.length || importValidationResults.valid.length} structures`);
        setImportStructureDialogOpen(false);
        resetImport();
        fetchAllData();
      } else {
        toast.error(response.message || 'Import failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const resetImport = () => {
    setImportFile(null);
    setImportPreview([]);
    setImportValidationResults({ valid: [], invalid: [], missingEmployees: [] });
    setImportErrors([]);
  };

  if (loading.employees && loading.payroll && loading.structures && loading.slips) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-4 border-gray-200"></div>
          <div className="absolute top-0 left-0 h-20 w-20 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Loading Payroll Data</p>
          <p className="text-sm text-muted-foreground max-w-md">Fetching employees, salary structures, and payroll records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Process Salary Dialog ─────────────────────────────────────── */}
      <Dialog open={processDialog.open} onOpenChange={(open) => setProcessDialog({ open, employee: null })}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">Process Salary</DialogTitle>
                <DialogDescription className="mt-1">
                  Confirm salary processing for <span className="font-semibold text-gray-900">{processDialog.employee?.name}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {processDialog.employee && (() => {
            const calculation = getPayrollCalculationDetails(processDialog.employee.employeeId);
            if (!calculation) {
              return (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">Salary structure not found</p>
                  <p className="text-sm text-muted-foreground mb-4">Please add a salary structure first.</p>
                  <Button onClick={() => {
                    handleEmployeeSelect(processDialog.employee!.employeeId);
                    setIsAddingStructure(true);
                    setActivePayrollTab("salary-structures");
                    setProcessDialog({ open: false, employee: null });
                  }}>Add Salary Structure</Button>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Employee:</span>
                    <div>{processDialog.employee.name}</div>
                    <div className="text-muted-foreground">{processDialog.employee.employeeId}</div>
                  </div>
                  <div>
                    <span className="font-medium">Department:</span>
                    <div>{processDialog.employee.department}</div>
                  </div>
                </div>

                <div className="border rounded-lg p-3 bg-gray-50">
                  <h4 className="font-medium mb-2">Bank Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-gray-600">Account:</span><div className="font-medium">{processDialog.employee.accountNumber || "N/A"}</div></div>
                    <div><span className="text-gray-600">IFSC:</span><div className="font-medium">{processDialog.employee.ifscCode || "N/A"}</div></div>
                    <div><span className="text-gray-600">Bank:</span><div className="font-medium">{processDialog.employee.bankName || "N/A"}</div></div>
                    <div><span className="text-gray-600">Branch:</span><div className="font-medium">{processDialog.employee.bankBranch || "N/A"}</div></div>
                  </div>
                  {(!processDialog.employee?.accountNumber || !processDialog.employee?.ifscCode) && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                      ⚠️ Bank account or IFSC missing — payment will need manual handling.
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2">Attendance Summary</h4>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div className="text-center"><div className="font-medium text-green-600">{calculation.attendance.presentDays}</div><div className="text-xs text-muted-foreground">Present</div></div>
                      <div className="text-center"><div className="font-medium text-red-600">{calculation.attendance.absentDays}</div><div className="text-xs text-muted-foreground">Absent</div></div>
                      <div className="text-center"><div className="font-medium text-yellow-600">{calculation.attendance.halfDays}</div><div className="text-xs text-muted-foreground">Half Days</div></div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2">Salary Calculation</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Basic Salary:</span><span className="font-medium">₹{fmtMoney(calculation.structure.basicSalary)}</span></div>
                      <div className="flex justify-between text-green-600"><span>Earned Basic:</span><span>+₹{fmtMoney(calculation.basicSalaryEarned)}</span></div>
                      <div className="flex justify-between text-red-600"><span>Deductions (Absent/Leaves):</span><span>-₹{fmtMoney(calculation.salaryDeductions)}</span></div>
                      <div className="flex justify-between border-t pt-1"><span className="font-medium">Net Basic Salary:</span><span className="font-medium">₹{fmtMoney(calculation.netBasicSalary)}</span></div>
                      <div className="flex justify-between"><span>Allowances:</span><span className="text-green-600">+₹{fmtMoney(calculation.totalAllowances)}</span></div>
                      <div className="flex justify-between"><span>Deductions:</span><span className="text-red-600">-₹{fmtMoney(calculation.totalDeductions)}</span></div>

                      {deductionPreview.items.length > 0 && (
                        <div className="border rounded-lg p-3 bg-orange-50">
                          <h4 className="font-medium mb-2 text-orange-800">Additional Deductions</h4>
                          <div className="space-y-1 text-sm">
                            {deductionPreview.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between">
                                <span>
                                  {item.type === 'advance' ? 'Salary Advance' : item.type === 'fine' ? 'Fine/Penalty' : 'Other Deduction'}
                                  {item.description && <span className="text-xs text-gray-500 ml-1">({item.description})</span>}
                                </span>
                                <span className="text-red-600">-₹{fmtMoney(item.amount)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between font-bold border-t pt-1">
                              <span>Total Additional Deductions</span>
                              <span className="text-red-600">-₹{fmtMoney(deductionPreview.additionalDeductions)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between border-t pt-2 font-bold">
                        <span>Final Net Salary:</span>
                        <span className="text-lg">₹{fmtMoney(calculation.calculatedSalary)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDialog({ open: false, employee: null })}>Cancel</Button>
            <Button onClick={() => processDialog.employee && handleProcessPayroll(processDialog.employee.employeeId)}
              disabled={!getPayrollCalculationDetails(processDialog.employee?.employeeId || "")}>
              <CheckCircle className="mr-2 h-4 w-4" /> Process Salary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Payment Status Dialog ─────────────────────────────────────── */}
      <Dialog open={paymentStatusDialog.open} onOpenChange={(open) => setPaymentStatusDialog({ open, payroll: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Payment Status</DialogTitle>
            <DialogDescription>Update payment status for {paymentStatusDialog.payroll?.employee?.name || "Employee"}</DialogDescription>
          </DialogHeader>

          {paymentStatusDialog.payroll && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600 mb-2">₹{fmtMoney(paymentStatusDialog.payroll.netSalary)}</div>
                  <div className="text-sm text-gray-700">Total Net Salary</div>
                  {paymentStatusDialog.payroll.paidAmount && paymentStatusDialog.payroll.paidAmount > 0 && (
                    <div className="text-sm text-green-600 mt-1">Already Paid: ₹{fmtMoney(paymentStatusDialog.payroll.paidAmount)}</div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Payment Status *</Label>
                <Select value={paymentStatusForm.status} onValueChange={(value) => {
                  setPaymentStatusForm((prev) => ({ ...prev, status: value, paidAmount: value !== "part-paid" ? "" : prev.paidAmount }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="hold">Hold</SelectItem>
                    <SelectItem value="part-paid">Part Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentStatusForm.status === "part-paid" && (
                <div className="space-y-2">
                  <Label htmlFor="paidAmount">Paid Amount *</Label>
                  <Input id="paidAmount" type="number" placeholder="Enter paid amount"
                    value={paymentStatusForm.paidAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      const maxAmount = paymentStatusDialog.payroll?.netSalary || 0;
                      const numericValue = parseFloat(value) || 0;
                      if (numericValue > maxAmount) {
                        toast.error(`Amount cannot exceed ₹${fmtMoney(maxAmount)}`);
                        setPaymentStatusForm((prev) => ({ ...prev, paidAmount: maxAmount.toString() }));
                      } else {
                        setPaymentStatusForm((prev) => ({ ...prev, paidAmount: value }));
                      }
                    }}
                    min="0" max={paymentStatusDialog.payroll?.netSalary || 0} />
                  {paymentStatusDialog.payroll && (
                    <div className="text-xs text-muted-foreground">
                      Remaining: ₹{fmtMoney((paymentStatusDialog.payroll.netSalary || 0) - (parseFloat(paymentStatusForm.paidAmount) || 0))}
                    </div>
                  )}
                </div>
              )}

              {(paymentStatusForm.status === "paid" || paymentStatusForm.status === "part-paid") && (
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date *</Label>
                  <Input id="paymentDate" type="date" value={paymentStatusForm.paymentDate}
                    onChange={(e) => setPaymentStatusForm((prev) => ({ ...prev, paymentDate: e.target.value }))} required />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <textarea id="notes"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Add any notes..."
                  value={paymentStatusForm.notes}
                  onChange={(e) => setPaymentStatusForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentStatusDialog({ open: false, payroll: null })}>Cancel</Button>
            <Button onClick={handleUpdatePaymentStatus}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Adjust Payroll Dialog ─────────────────────────────────────── */}
      <Dialog open={adjustDialog.open} onOpenChange={(open) => setAdjustDialog({ open, payroll: null })}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-emerald-600" />
              Adjust Payroll
            </DialogTitle>
            <DialogDescription>
              Add a bonus or one-time deduction. This will not change the original salary calculation.
            </DialogDescription>
          </DialogHeader>

          {adjustDialog.payroll && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Current Net Salary</div>
                <div className="text-2xl font-bold text-gray-800">
                  ₹{fmtMoney(adjustDialog.payroll.netSalary)}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  placeholder="Positive for bonus, negative for deduction"
                  value={adjustForm.amount}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, amount: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Use <strong>+</strong> for bonus, <strong>−</strong> for deduction (e.g. 500 or -200)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Reason * <span className="text-xs text-muted-foreground">(required)</span></Label>
                <textarea
                  className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Diwali bonus, correction for last month underpayment"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, reason: e.target.value }))}
                  rows={3}
                />
              </div>

              {adjustForm.amount && !isNaN(parseFloat(adjustForm.amount)) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-700">New Net Salary:</span>
                    <span className="font-bold text-emerald-800">
                      ₹{fmtMoney(
                        (adjustDialog.payroll.netSalary || 0) + (parseFloat(adjustForm.amount) || 0)
                      )}
                    </span>
                  </div>
                </div>
              )}

              {adjustDialog.payroll.manualAdjustments && adjustDialog.payroll.manualAdjustments.length > 0 && (
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-2">Existing Adjustments</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {adjustDialog.payroll.manualAdjustments.map((adj, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs border-b pb-1 last:border-0">
                        <div className="flex-1">
                          <div className={adj.amount >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {adj.amount >= 0 ? '+' : ''}₹{fmtMoney(adj.amount)}
                          </div>
                          <div className="text-muted-foreground">{adj.reason}</div>
                          <div className="text-gray-400">
                            by {adj.adjustedBy} on {new Date(adj.adjustedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 h-6 w-6 p-0"
                          onClick={() =>
                            handleRemoveAdjustment(getItemId(adjustDialog.payroll!), idx)
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog({ open: false, payroll: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAdjustment}
              disabled={!adjustForm.amount || !adjustForm.reason.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Save Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Bulk Delete Dialog ────────────────────────────────────────── */}
      <AlertDialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Delete {selectedPayrollIds.size} Payroll Record(s)?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the selected records and reverse any consumed fines/advances.
              Records with existing salary slips will be skipped automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Reason (optional, for audit log)</Label>
              <textarea
                className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. Reprocessing this month's payroll with corrected attendance"
                value={bulkDeleteForm.reason}
                onChange={(e) => setBulkDeleteForm({ reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete {selectedPayrollIds.size} Record(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Bulk Payment Status Dialog ────────────────────────────────── */}
      <Dialog open={bulkStatusDialog} onOpenChange={setBulkStatusDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Bulk Update Payment Status
            </DialogTitle>
            <DialogDescription>
              Apply the same payment status to all {selectedPayrollIds.size} selected record(s).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Status *</Label>
              <Select
                value={bulkStatusForm.status}
                onValueChange={(v) => setBulkStatusForm((p) => ({ ...p, status: v as any }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid (full net salary)</SelectItem>
                  <SelectItem value="hold">Hold</SelectItem>
                  <SelectItem value="pending">Pending (reset paid amount to 0)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bulkStatusForm.status === 'paid' && (
              <div className="space-y-2">
                <Label>Payment Date *</Label>
                <Input
                  type="date"
                  value={bulkStatusForm.paymentDate}
                  onChange={(e) => setBulkStatusForm((p) => ({ ...p, paymentDate: e.target.value }))}
                />
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              ⚠️ This will overwrite any existing paid amount / payment date on the selected records.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusDialog(false)} disabled={bulkActionLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkPaymentStatus}
              disabled={bulkActionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {bulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Update {selectedPayrollIds.size} Record(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Salary Slip Dialog (screen view) ──────────────────────────── */}
      <Dialog open={slipDialog.open} onOpenChange={(open) => setSlipDialog({ open, salarySlip: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600" /> Salary Slip</DialogTitle>
          </DialogHeader>

          {slipDialog.salarySlip && (() => {
            const employee = getEmployeeDetails(slipDialog.salarySlip!.employeeId);
            if (!employee) return null;
            return (
              <div className="space-y-6 p-1">
                <div className="border-b pb-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold">Salary Slip</h2>
                      <p className="text-muted-foreground">{formatMonthYear(slipDialog.salarySlip.month)}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-lg font-semibold">{employee.name}</div>
                      <div className="text-sm text-muted-foreground">{employee.employeeId}</div>
                      <div className="text-sm text-muted-foreground">{employee.department}</div>
                      <div className="text-sm text-muted-foreground">Designation: {employee.position || "N/A"}</div>
                      <div className="text-sm text-muted-foreground">Site: {employee.siteName || employee.site || "N/A"}</div>
                      <div className="text-sm text-muted-foreground">UAN: {employee.uanNumber || "N/A"} | ESIC: {employee.esicNumber || "N/A"}</div>
                      <div className="text-sm text-muted-foreground">
                        Paid Days: {slipDialog.salarySlip.presentDays ?? slipPaidDays ?? '-'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Bank: {employee.accountNumber ? `XXXX${employee.accountNumber.slice(-4)}` : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}


          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handlePrintSalarySlip}
              className="sm:flex-1"
            >
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>

            <Button
              variant="outline"
              onClick={handleSendSalarySlip}
              className="sm:flex-1"
            >
              <Send className="mr-2 h-4 w-4" /> Send Email
            </Button>

            <Button
              variant="outline"
              onClick={handleDeleteSlip}
              className="sm:flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Slip
            </Button>

            <Button
              onClick={() => setSlipDialog({ open: false, salarySlip: null })}
              className="sm:flex-1"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Process All Payroll Dialog ────────────────────────────────── */}
      <AlertDialog open={processAllDialog} onOpenChange={setProcessAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Process All Payroll</AlertDialogTitle>
            <AlertDialogDescription>
              This will process payroll for all {employeesWithStructure.length} employees with salary structures for {selectedMonth} in the selected site. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleProcessAllPayroll}>Process All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Delete Structure Dialog ───────────────────────────────────── */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, structure: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Salary Structure</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the salary structure for {deleteDialog.structure && getEmployeeDetails(deleteDialog.structure.employeeId)?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDialog.structure && handleDeleteStructure(getItemId(deleteDialog.structure))}
              className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Import Salary Structures Dialog ───────────────────────────── */}
      <Dialog open={importStructureDialogOpen} onOpenChange={(open) => { setImportStructureDialogOpen(open); if (!open) resetImport(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Salary Structures</DialogTitle>
            <DialogDescription>Upload an Excel file with employee salary structures. Employee IDs must exist in the currently selected site.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Upload Excel File</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-gray-50">
                <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleStructureFileSelect}
                  className="hidden" disabled={importLoading} id="structure-import-file" />
                <Label htmlFor="structure-import-file" className="cursor-pointer">
                  <Upload className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">{importLoading ? 'Processing...' : 'Click to upload or drag & drop'}</p>
                  <p className="text-xs text-gray-500">Supports .xlsx, .xls, .csv</p>
                </Label>
                {importFile && (
                  <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="truncate">{importFile.name}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={downloadStructureTemplate} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" /> Download Template
              </Button>
            </div>

            {importValidationResults.valid.length > 0 && (
              <div className="border rounded-lg p-3 bg-green-50">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <h3 className="font-semibold text-green-800 text-sm">Valid Structures ({importValidationResults.valid.length})</h3>
                </div>
                <div className="max-h-32 overflow-y-auto text-xs">
                  {importValidationResults.valid.map((s, idx) => (
                    <div key={idx} className="py-1 border-b border-green-200 last:border-0">
                      {s.employeeId} – ₹{fmtMoney(s.basicSalary)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importValidationResults.missingEmployees.length > 0 && (
              <div className="border rounded-lg p-3 bg-yellow-50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-800 text-sm">Employees Not Found ({importValidationResults.missingEmployees.length})</h3>
                </div>
                <div className="max-h-32 overflow-y-auto text-xs">
                  {importValidationResults.missingEmployees.map((m, idx) => (
                    <div key={idx} className="py-1 border-b border-yellow-200 last:border-0">{m}</div>
                  ))}
                </div>
              </div>
            )}

            {importErrors.length > 0 && (
              <div className="border rounded-lg p-3 bg-red-50">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <h3 className="font-semibold text-red-800 text-sm">Errors ({importErrors.length})</h3>
                </div>
                <div className="max-h-32 overflow-y-auto text-xs">
                  {importErrors.map((err, idx) => (
                    <div key={idx} className="py-1 border-b border-red-200 last:border-0 text-red-700">{err}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleImportStructures}
                disabled={importValidationResults.valid.length === 0 || importLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700">
                {importLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</>) : (`Import ${importValidationResults.valid.length} Structures`)}
              </Button>
              <Button variant="outline" onClick={() => { setImportStructureDialogOpen(false); resetImport(); }} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Header ───────────────────────────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <IndianRupee className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Payroll Management</h1>

              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="pl-9 w-full sm:w-[180px] bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" onClick={handleRefreshData} disabled={Object.values(loading).some(l => l)} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${loading.payroll ? 'animate-spin' : ''}`} /> Refresh
              </Button>

              <Button variant="outline" onClick={handleExportPayrollExcel} disabled={filteredPayroll.length === 0} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Export
              </Button>
              <Button variant="outline" onClick={handleExportClientReport} disabled={filteredPayroll.length === 0} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Export excel
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Compact Stats Bar ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white px-4 py-3">
          <div className="flex items-center gap-2 pr-3 border-r last:border-r-0">
            <IndianRupee className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-muted-foreground">Total Payroll</span>
            <span className="text-sm font-bold">₹{fmtMoney(payrollSummary.totalAmount)}</span>

          </div>

          <div className="flex items-center gap-2 pr-3 border-r last:border-r-0">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-xs text-muted-foreground">Processed</span>
            <span className="text-sm font-bold text-green-600">{payrollSummary.processedCount}</span>
          </div>

          <div className="flex items-center gap-2 pr-3 border-r last:border-r-0">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-muted-foreground">Pending</span>

            <span className="text-xs text-muted-foreground">(₹{fmtMoney(payrollSummary.pendingAmount)})</span>
          </div>

          <div className="flex items-center gap-2 pr-3 border-r last:border-r-0">
            <Users className="h-4 w-4 text-gray-600" />
            <span className="text-xs text-muted-foreground">Employees</span>
            <span className="text-sm font-bold">{siteFilteredEmployees.length}</span>

          </div>

          <div className="flex items-center gap-2 pr-3 border-r last:border-r-0">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">With Structure</span>
            <span className="text-sm font-bold text-green-600">{payrollSummary.employeesWithStructure}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Without Structure</span>
            <span className="text-sm font-bold text-red-600">{payrollSummary.employeesWithoutStructure}</span>
          </div>
        </div>

        {/* ─── Main Tabs ─────────────────────────────────────────────── */}
        <Card className="hover:shadow-md transition-all duration-200 border">
          <CardHeader>
            <CardTitle>Payroll Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activePayrollTab} onValueChange={setActivePayrollTab} className="w-full">
              <TabsList className="flex flex-wrap gap-1 sm:gap-2 w-full h-auto p-1 bg-gray-100 rounded-lg">
                <TabsTrigger value="salary-slips" className="flex-1 min-w-[100px] sm:min-w-[140px] text-xs sm:text-sm">Salary Processing</TabsTrigger>
                <TabsTrigger value="salary-structures" className="flex-1 min-w-[100px] sm:min-w-[140px] text-xs sm:text-sm">Salary Structures</TabsTrigger>
                <TabsTrigger value="payroll-records" className="flex-1 min-w-[100px] sm:min-w-[140px] text-xs sm:text-sm">Payroll Records</TabsTrigger>
                <TabsTrigger value="audit-log" className="flex-1 min-w-[100px] sm:min-w-[140px] text-xs sm:text-sm">
                  Audit Log
                </TabsTrigger>
              </TabsList>

              {/* ─── Salary Processing Tab ────────────────────────────── */}
              <TabsContent value="salary-slips" className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search employees..." className="pl-8 w-full sm:w-[250px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        <SelectItem value="with-structure">With Salary Structure</SelectItem>
                        <SelectItem value="without-structure">Without Salary Structure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => setProcessAllDialog(true)} disabled={employeesWithStructure.length === 0} className="w-full sm:w-auto">
                    <CheckCircle className="mr-2 h-4 w-4" /> Process All Payroll
                  </Button>
                </div>

                {loading.employees ? (
                  <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Salary Structure</TableHead>
                            <TableHead>Attendance</TableHead>
                            <TableHead>Calculated Salary</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEmployees.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="py-12">
                                <div className="flex flex-col items-center justify-center text-center space-y-4">
                                  <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center"><Users className="h-8 w-8 text-gray-400" /></div>
                                  <div className="space-y-1">
                                    <p className="font-medium text-gray-900">{searchTerm ? "No matching employees found" : "No employees available"}</p>
                                    <p className="text-sm text-gray-500 max-w-sm">{searchTerm ? "Try adjusting your search terms or filters" : employees.length === 0 ? "No employees have been added yet" : "All employees already have salary structures configured"}</p>
                                  </div>
                                  {searchTerm && <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }} size="sm">Clear search</Button>}
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedFilteredEmployees.map((employee, index) => {
                              const structure = filteredSalaryStructures.find(s => s.employeeId === employee.employeeId);
                              const payrollRecord = filteredPayroll.find(p => p.employeeId === employee.employeeId && p.month === selectedMonth);
                              const attendance = getEmployeeAttendance(employee.employeeId);
                              const calculatedSalary = structure ? calculateSalary(employee.employeeId, structure) : 0;

                              return (
                                <TableRow key={employee.employeeId || employee._id || `employee-${index}`} className="hover:bg-gray-50/50 border-b border-gray-100">
                                  <TableCell>
                                    <div className="flex items-start space-x-3">
                                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <span className="font-medium text-blue-700">{employee.name?.charAt(0) || 'E'}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{employee.name}</p>
                                        <p className="text-sm text-gray-500">{employee.employeeId}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{employee.department}</p>
                                        {employee.accountNumber && <div className="flex items-center gap-1 mt-1"><div className="h-2 w-2 rounded-full bg-green-500"></div><span className="text-xs text-gray-500">Bank account configured</span></div>}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell><div className="text-sm text-gray-700">{employee.department}</div></TableCell>
                                  <TableCell>
                                    {structure ? (
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Configured</Badge>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Not Configured</Badge>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <div className="flex items-center gap-1">
                                        <span className="text-green-600">P: {attendance.presentDays}</span>
                                        <span className="text-red-600">A: {attendance.absentDays}</span>
                                        <span className="text-yellow-600">H: {attendance.halfDays}</span>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell><div className="font-medium text-gray-900">₹{fmtMoney(calculatedSalary)}</div></TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      {structure ? (
                                        payrollRecord ? (
                                          <div className="flex items-center gap-2">
                                            {getStatusBadge(payrollRecord.status)}
                                            <div className="flex gap-1">
                                              <Button size="sm" variant="ghost" onClick={() => handleOpenPaymentStatus(payrollRecord)} className="h-8 w-8 p-0" title="Update payment status"><Edit className="h-4 w-4" /></Button>
                                              <Button size="sm" variant="ghost" onClick={() => {
                                                const payrollId = getItemId(payrollRecord);
                                                if (!payrollId) { toast.error("Payroll ID missing"); return; }
                                                const slip = filteredSalarySlips.find(s => s.payrollId === payrollId);
                                                if (slip) handleViewSalarySlip(slip);
                                                else handleGenerateSalarySlip(payrollId);
                                              }} className="h-8 w-8 p-0" title="View salary slip"><Eye className="h-4 w-4" /></Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <Button size="sm" onClick={() => setProcessDialog({ open: true, employee })} className="bg-blue-600 hover:bg-blue-700">Process Salary</Button>
                                        )
                                      ) : (
                                        <Button size="sm" variant="outline" onClick={() => { handleEmployeeSelect(employee.employeeId); setIsAddingStructure(true); setActivePayrollTab("salary-structures"); }} className="border-red-200 text-red-700 hover:bg-red-50">Add Structure</Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {filteredEmployees.length > payrollItemsPerPage && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing {Math.min((payrollPage - 1) * payrollItemsPerPage + 1, filteredEmployees.length)} to {Math.min(payrollPage * payrollItemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} employees
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={String(payrollItemsPerPage)} onValueChange={(value) => { setPayrollItemsPerPage(parseInt(value)); setPayrollPage(1); }}>
                            <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="25">25</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" onClick={() => setPayrollPage(p => Math.max(1, p - 1))} disabled={payrollPage === 1} className="h-8 w-8 p-0">‹</Button>
                          <span className="text-sm">{payrollPage} / {Math.ceil(filteredEmployees.length / payrollItemsPerPage)}</span>
                          <Button variant="outline" size="sm" onClick={() => setPayrollPage(p => Math.min(Math.ceil(filteredEmployees.length / payrollItemsPerPage), p + 1))} disabled={payrollPage === Math.ceil(filteredEmployees.length / payrollItemsPerPage)} className="h-8 w-8 p-0">›</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* ─── Salary Structures Tab ─────────────────────────────── */}
              <TabsContent value="salary-structures" className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-lg font-semibold">Salary Structures</h3>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button onClick={() => setIsAddingStructure(true)} className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" /> Add Structure
                    </Button>
                    <Button variant="outline" onClick={() => setImportStructureDialogOpen(true)} className="w-full sm:w-auto">
                      <Upload className="mr-2 h-4 w-4" /> Import
                    </Button>
                  </div>
                </div>

                {(isAddingStructure || editingStructure) && (
                  <Card className="border shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center"><FileText className="h-5 w-5 text-blue-600" /></div>
                          <div>
                            {editingStructure ? "Edit Salary Structure" : "Add Salary Structure"}
                            <p className="text-sm font-normal text-gray-600 mt-1">Configure earnings, deductions, and allowances for employee compensation</p>
                          </div>
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => { setIsAddingStructure(false); setEditingStructure(null); resetStructureForm(); }} className="h-8 w-8 p-0">✕</Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="employeeId">Employee *</Label>
                        <Select value={structureForm.employeeId} onValueChange={(value) => { if (value && value !== "no-employees") handleEmployeeSelect(value); }} disabled={!!editingStructure}>
                          <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                          <SelectContent>
                            {employeesWithoutStructure.length > 0 ? employeesWithoutStructure.map((employee) => (
                              <SelectItem key={employee.employeeId} value={employee.employeeId}>
                                {employee.name} ({employee.employeeId}) - {employee.department} - ₹{fmtMoney(employee.salary)}
                              </SelectItem>
                            )) : <SelectItem value="no-employees" disabled>All employees have salary structures</SelectItem>}
                          </SelectContent>
                        </Select>

                        {structureForm.employeeId && (() => {
                          const selectedEmployee = siteFilteredEmployees.find(e => e.employeeId === structureForm.employeeId);
                          if (!selectedEmployee) return null;
                          return (
                            <div className="text-sm text-muted-foreground mt-1 p-2 bg-gray-50 rounded">
                              <div>Monthly Salary: ₹{fmtMoney(selectedEmployee.salary)}</div>
                              {selectedEmployee.accountNumber && <div>Bank Account: XXXX{selectedEmployee.accountNumber.slice(-4)}</div>}
                              {selectedEmployee.providentFund && <div>PF Contribution: ₹{fmtMoney(selectedEmployee.providentFund)}</div>}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-4 text-lg">EARNINGS</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="basic" className="font-medium">GROSS *</Label>
                              <Input id="basic" type="number" placeholder="Basic Salary" value={structureForm.basicSalary}
                                onChange={(e) => setStructureForm((prev) => ({ ...prev, basicSalary: e.target.value }))} required />
                              <p className="text-xs text-muted-foreground">Auto-filled from employee's monthly salary</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="da" className="font-medium">DA</Label>
                              <Input id="da" type="number" placeholder="Dearness Allowance" value={structureForm.da}
                                onChange={(e) => setStructureForm((prev) => ({ ...prev, da: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="hra" className="font-medium">HRA</Label>
                              <Input id="hra" type="number" placeholder="House Rent Allowance" value={structureForm.hra}
                                onChange={(e) => setStructureForm((prev) => ({ ...prev, hra: e.target.value }))} />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="cca" className="font-medium">CCA</Label>
                              <Input id="cca" type="number" placeholder="City Compensatory Allowance" value={structureForm.conveyance}
                                onChange={(e) => setStructureForm((prev) => ({ ...prev, conveyance: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="medical" className="font-medium">MEDICAL</Label>
                              <Input id="medical" type="number" placeholder="Medical Allowance" value={structureForm.medicalAllowance}
                                onChange={(e) => setStructureForm((prev) => ({ ...prev, medicalAllowance: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="otherAll" className="font-medium">OTHER ALL</Label>
                              <Input id="otherAll" type="number" placeholder="Other Allowances" value={structureForm.otherAllowances}
                                onChange={(e) => setStructureForm((prev) => ({ ...prev, otherAllowances: e.target.value }))} />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="bonus" className="font-medium">BONUS</Label>
                              <Input id="bonus" type="number" placeholder="Bonus" value={structureForm.specialAllowance}
                                onChange={(e) => setStructureForm((prev) => ({ ...prev, specialAllowance: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="leave" className="font-medium">LEAVE</Label>
                              <Input id="leave" type="number" placeholder="Leave Encashment" value={structureForm.leaveEncashment}
                                onChange={(e) => setStructureForm((prev) => ({ ...prev, leaveEncashment: e.target.value }))} />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="arrears" className="font-medium">ARREARS</Label>
                              <Input id="arrears" type="number" placeholder="Arrears" value={structureForm.arrears}
                                onChange={(e) => setStructureForm((prev) => ({ ...prev, arrears: e.target.value }))} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-4 text-lg">DEDUCTIONS</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="pf" className="font-medium">PF</Label>
                              <Input id="pf" type="number" placeholder="Provident Fund" value={structureForm.providentFund}
                                onChange={(e) => setStructureForm((prev) => ({ ...prev, providentFund: e.target.value }))} />
                              <p className="text-xs text-muted-foreground">Auto-filled from employee data if available</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="esic" className="font-medium">ESIC</Label>
                              <Input id="esic" type="number" placeholder="ESIC Contribution" value={structureForm.esic}
                                onChange={(e) => setStructureForm((prev) => ({ ...prev, esic: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="advance" className="font-medium">ADVANCE</Label>
                              <Input id="advance" type="number" placeholder="Advance Deduction" value={structureForm.advance}
                                onChange={(e) => setStructureForm((prev) => ({ ...prev, advance: e.target.value }))} />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="mlwf" className="font-medium">MLWF</Label>
                              <Input id="mlwf" type="number" placeholder="MLWF Deduction" value={structureForm.mlwf}
                                onChange={(e) => setStructureForm((prev) => ({ ...prev, mlwf: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="professionTax" className="font-medium">Profession Tax</Label>
                              <Input id="professionTax" type="number" placeholder="Professional Tax" value={structureForm.professionalTax}
                                onChange={(e) => setStructureForm((prev) => ({ ...prev, professionalTax: e.target.value }))} />
                              <p className="text-xs text-muted-foreground">Auto-filled from employee data if available</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="incomeTax" className="font-medium">INCOME TAX</Label>
                              <Input id="incomeTax" type="number" placeholder="Income Tax" value={structureForm.incomeTax}
                                onChange={(e) => setStructureForm((prev) => ({ ...prev, incomeTax: e.target.value }))} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold mb-3">Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Net Total:</span>
                              <span className="font-medium text-green-600">₹{fmtMoney(calculateStructureTotals().totalEarnings)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Deductions:</span>
                              <span className="font-medium text-red-600">₹{fmtMoney(calculateStructureTotals().totalDeductions)}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between border-t pt-2">
                              <span className="font-semibold">Net Salary:</span>
                              <span className="font-bold text-lg">₹{fmtMoney(calculateStructureTotals().netSalary)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-4">
                        <Button onClick={editingStructure ? handleUpdateStructure : handleAddStructure}
                          disabled={!structureForm.basicSalary || !structureForm.employeeId || structureForm.employeeId === "no-employees"}
                          className="flex-1">
                          {editingStructure ? "Update Structure" : "Add Structure"}
                        </Button>
                        <Button variant="outline" onClick={() => { setIsAddingStructure(false); setEditingStructure(null); resetStructureForm(); }} className="flex-1">Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {loading.structures ? (
                  <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Basic Salary</TableHead>
                          <TableHead>Allowances</TableHead>
                          <TableHead>Deductions</TableHead>
                          <TableHead>Total CTC</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSalaryStructures.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No salary structures found for the selected site</TableCell></TableRow>
                        ) : (
                          filteredSalaryStructures.map((structure, index) => {
                            const employee = siteFilteredEmployees.find(e => e.employeeId === structure.employeeId);
                            if (!employee) return null;
                            const totalAllowances = (structure.hra || 0) + (structure.da || 0) + (structure.specialAllowance || 0) + (structure.conveyance || 0) + (structure.medicalAllowance || 0) + (structure.otherAllowances || 0) + (structure.leaveEncashment || 0) + (structure.arrears || 0);
                            const totalDeductions = (structure.providentFund || 0) + (structure.professionalTax || 0) + (structure.incomeTax || 0) + (structure.otherDeductions || 0) + (structure.esic || 0) + (structure.advance || 0) + (structure.mlwf || 0);
                            const totalCTC = (structure.basicSalary || 0) + totalAllowances;

                            return (
                              <TableRow key={structure._id || structure.id || `structure-${index}`} className="hover:bg-gray-50/50 border-b border-gray-100">
                                <TableCell>
                                  <div className="flex items-start space-x-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                      <span className="font-medium text-blue-700">{employee.name?.charAt(0) || 'E'}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-900 truncate">{employee.name}</p>
                                      <p className="text-sm text-gray-500">{employee.employeeId}</p>
                                      <p className="text-xs text-gray-400 mt-0.5">{employee.department}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-4 w-4 mr-1" />
                                    {fmtMoney(structure.basicSalary)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">Monthly: ₹{fmtMoney(employee.salary)}</div>
                                </TableCell>
                                <TableCell><div className="flex items-center"><IndianRupee className="h-4 w-4 mr-1" />{fmtMoney(totalAllowances)}</div></TableCell>
                                <TableCell><div className="flex items-center"><IndianRupee className="h-4 w-4 mr-1" />{fmtMoney(totalDeductions)}</div></TableCell>
                                <TableCell><div className="font-medium flex items-center"><IndianRupee className="h-4 w-4 mr-1" />{fmtMoney(totalCTC)}</div></TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => handleEditStructure(structure)}><Edit className="h-4 w-4" /></Button>
                                    <Button size="sm" variant="outline" onClick={() => setDeleteDialog({ open: true, structure })}><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* ─── Payroll Records Tab ─────────────────────────────── */}
              <TabsContent value="payroll-records" className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">Payroll Records - {selectedMonth}</h3>
                    <p className="text-sm text-muted-foreground">
                      Total Records: {filteredPayroll.length} | Total Amount: ₹
                      {fmtMoney(filteredPayroll.reduce((sum, p) => sum + (p.netSalary || 0), 0))}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer accent-blue-600"
                        checked={allVisibleSelected}
                        onChange={(e) => {
                          if (e.target.checked) selectAllVisible();
                          else clearSelection();
                        }}
                      />
                      Select all on page
                    </label>
                    <Button variant="outline" size="sm" onClick={handleExportPayrollExcel} disabled={filteredPayroll.length === 0}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" /> Export
                    </Button>
                  </div>
                </div>

                {loading.payroll ? (
                  <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : filteredPayroll.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                    <p className="text-lg font-medium">No payroll records found</p>
                    <p className="text-sm text-muted-foreground mb-4">Try selecting a different month or site filter</p>
                    <Button onClick={fetchAllData} variant="outline"><Loader2 className="mr-2 h-4 w-4" /> Retry Loading Data</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {paginatedPayrollRecords.map((record, index) => {
                        const employee = siteFilteredEmployees.find(e => e.employeeId === record.employeeId);
                        const recordId = getItemId(record);
                        const isSelected = isPayrollSelected(recordId);
                        return (
                          <Card
                            key={record._id || index}
                            className={`hover:shadow-md transition-all duration-200 border ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/40' : ''
                              }`}
                          >
                            <CardContent className="pt-6">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{employee?.name || 'Unknown'}</div>
                                  <div className="text-sm text-muted-foreground">{record.employeeId}</div>
                                </div>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 mt-0.5 cursor-pointer accent-blue-600"
                                  checked={isSelected}
                                  onChange={() => togglePayrollSelection(recordId)}
                                />
                              </div>
                              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                                <div><div className="text-gray-600">Department</div><div className="font-medium">{employee?.department || 'N/A'}</div></div>
                                <div><div className="text-gray-600">Status</div><div>{getStatusBadge(record.status)}</div></div>
                              </div>
                              <div className="mt-4 flex justify-between items-center border-t pt-4">
                                <span className="text-gray-700">Net Salary:</span>
                                <span className="font-bold text-lg">₹{fmtMoney(record.netSalary)}</span>
                              </div>
                              <div className="mt-2 flex justify-between items-center">
                                <span className="text-gray-700">Paid:</span>
                                <span className="font-medium text-green-600">₹{fmtMoney(record.paidAmount)}</span>
                              </div>

                              <div className="mt-4 grid grid-cols-3 gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleOpenPaymentStatus(record)}>
                                  Status
                                </Button>
                                <Button size="sm" variant="outline" className="text-emerald-600 hover:bg-emerald-50"
                                  onClick={() => handleOpenAdjust(record)} title="Add Manual Adjustment">
                                  <IndianRupee className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="text-amber-600 hover:bg-amber-50"
                                  onClick={() => {
                                    const newNotes = prompt("Edit notes:", record.notes || "");
                                    if (newNotes === null) return;
                                    axios.patch(`${API_URL}/payroll/${getItemId(record)}/notes`, { notes: newNotes }, { headers: authHeaders() })
                                      .then(() => { toast.success("Notes updated"); fetchAllData(); })
                                      .catch(() => toast.error("Failed to update notes"));
                                  }} title="Edit Notes">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => {
                                  const payrollId = getItemId(record);
                                  const slip = filteredSalarySlips.find(s => s.payrollId === payrollId);
                                  if (slip) handleViewSalarySlip(slip);
                                  else handleGenerateSalarySlip(payrollId);
                                }} title="View / Generate Slip">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="text-blue-600 hover:bg-blue-50"
                                  onClick={() => {
                                    if (!employee) { toast.error("Employee not found"); return; }
                                    handleReprocessPayroll(getItemId(record), employee);
                                  }} title="Reprocess Payroll">
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeletePayroll(getItemId(record))} title="Delete Payroll">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {filteredPayroll.length > payrollRecordsPerPage && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing {Math.min((payrollRecordsPage - 1) * payrollRecordsPerPage + 1, filteredPayroll.length)} to{" "}
                          {Math.min(payrollRecordsPage * payrollRecordsPerPage, filteredPayroll.length)} of {filteredPayroll.length} records
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={String(payrollRecordsPerPage)} onValueChange={(value) => { setPayrollRecordsPerPage(parseInt(value)); setPayrollRecordsPage(1); }}>
                            <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="6">6</SelectItem>
                              <SelectItem value="12">12</SelectItem>
                              <SelectItem value="24">24</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" onClick={() => setPayrollRecordsPage(p => Math.max(1, p - 1))} disabled={payrollRecordsPage === 1} className="h-8 w-8 p-0">‹</Button>
                          <span className="text-sm">{payrollRecordsPage} / {Math.ceil(filteredPayroll.length / payrollRecordsPerPage)}</span>
                          <Button variant="outline" size="sm" onClick={() => setPayrollRecordsPage(p => Math.min(Math.ceil(filteredPayroll.length / payrollRecordsPerPage), p + 1))} disabled={payrollRecordsPage === Math.ceil(filteredPayroll.length / payrollRecordsPerPage)} className="h-8 w-8 p-0">›</Button>
                        </div>
                      </div>
                    )}

                    {/* ─── Floating Bulk Action Bar ─────────────────────── */}
                    {selectedPayrollIds.size > 0 && (
                      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white border shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3">
                        <div className="text-sm font-medium">
                          <span className="text-blue-600 font-bold">{selectedPayrollIds.size}</span> selected
                        </div>
                        <div className="h-6 w-px bg-gray-200" />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setBulkStatusDialog(true)}
                          className="text-green-700 border-green-300 hover:bg-green-50"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" /> Mark Paid / Hold
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBulkGenerateSlips}
                          disabled={bulkActionLoading}
                          className="text-blue-700 border-blue-300 hover:bg-blue-50"
                        >
                          {bulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                          Generate Slips
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setBulkDeleteDialog(true)}
                          className="text-red-700 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                        <div className="h-6 w-px bg-gray-200" />
                        <Button size="sm" variant="ghost" onClick={clearSelection} className="text-gray-500">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="audit-log" className="space-y-4">
                <AuditLogTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PayrollTab;