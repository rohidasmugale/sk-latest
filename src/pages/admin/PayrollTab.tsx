import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Download, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  IndianRupee, 
  Calendar,
  CheckCircle,
  FileText,
  Printer,
  Send,
  Sheet,
  MoreHorizontal,
  Loader2,
  Users,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";

// Dialog Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// API Services
import { payrollApi, salaryStructureApi, salarySlipApi, employeeApi } from "@/services/payrollApi";

// Types
interface Employee {
  _id: string;
  id?: string;
  employeeId: string;
  name: string;
  email?: string;
  phone?: string;
  department: string;
  position: string;
  salary: number; // Monthly salary
  status: string;
  accountNumber?: string;
  ifscCode?: string;
  bankBranch?: string;
  bankName?: string;
  gender?: string;
  dateOfJoining?: string;
  aadharNumber?: string;
  panNumber?: string;
  esicNumber?: string;
  uanNumber?: string;
  providentFund?: number; // Employee's PF contribution
  professionalTax?: number; // Professional tax if available
  permanentAddress?: string;
  localAddress?: string;
}

interface SalaryStructure {
  _id: string;
  id?: string;
  employeeId: string;
  basicSalary: number;
  hra: number;
  da: number;
  specialAllowance: number;
  conveyance: number;
  medicalAllowance: number;
  otherAllowances: number;
  providentFund: number;
  professionalTax: number;
  incomeTax: number;
  otherDeductions: number;
  leaveEncashment: number;
  arrears: number;
  esic: number;
  advance: number;
  mlwf: number;
  effectiveFrom?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface Payroll {
  _id: string;
  id?: string;
  employeeId: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'pending' | 'processed' | 'paid' | 'hold' | 'part-paid';
  paymentDate?: string;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaves: number;
  paidAmount: number;
  paymentStatus: 'pending' | 'paid' | 'hold' | 'part-paid';
  notes?: string;
  overtimeHours?: number;
  overtimeAmount?: number;
  bonus?: number;
  providentFund?: number;
  esic?: number;
  professionalTax?: number;
  mlwf?: number;
  advance?: number;
  uniformAndId?: number;
  fine?: number;
  otherDeductions?: number;
  da?: number;
  hra?: number;
  otherAllowances?: number;
  leaveEncashment?: number;
  arrears?: number;
  createdAt?: string;
  updatedAt?: string;
  employee?: Employee;
}

interface SalarySlip {
  _id: string;
  id?: string;
  payrollId: string;
  employeeId: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  generatedDate: string;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaves: number;
  slipNumber: string;
  downloadUrl?: string;
  emailSent?: boolean;
  emailSentAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Attendance {
  employeeId: string;
  date: string;
  status: 'present' | 'absent' | 'half-day';
  checkIn?: string;
  checkOut?: string;
  overtimeHours?: number;
}

interface Leave {
  _id: string;
  id?: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
}

interface PayrollSummary {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  holdAmount: number;
  partPaidAmount: number;
  processedCount: number;
  pendingCount: number;
  paidCount: number;
  holdCount: number;
  partPaidCount: number;
  totalEmployees: number;
  totalRecords: number;
  activeEmployees: number;
  employeesWithStructure: number;
  employeesWithoutStructure: number;
  payrollMonth: string;
}

interface PayrollTabProps {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
}

// Helper function to get item ID
const getItemId = (item: any): string => {
  if (!item) return '';
  if (item._id) return item._id;
  if (item.id) return item.id;
  console.warn('No ID found for item:', item);
  return '';
};

const PayrollTab = ({
  selectedMonth,
  setSelectedMonth
}: PayrollTabProps) => {
  const [activePayrollTab, setActivePayrollTab] = useState("salary-slips");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary>({
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    holdAmount: 0,
    partPaidAmount: 0,
    processedCount: 0,
    pendingCount: 0,
    paidCount: 0,
    holdCount: 0,
    partPaidCount: 0,
    totalEmployees: 0,
    totalRecords: 0,
    activeEmployees: 0,
    employeesWithStructure: 0,
    employeesWithoutStructure: 0,
    payrollMonth: ""
  });
  
  // Loading states
  const [loading, setLoading] = useState({
    employees: false,
    payroll: false,
    structures: false,
    slips: false,
    summary: false
  });

  // Dialog states
  const [isAddingStructure, setIsAddingStructure] = useState(false);
  const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);
  const [processDialog, setProcessDialog] = useState<{ open: boolean; employee: Employee | null }>({ open: false, employee: null });
  const [paymentStatusDialog, setPaymentStatusDialog] = useState<{ open: boolean; payroll: Payroll | null }>({ open: false, payroll: null });
  const [slipDialog, setSlipDialog] = useState<{ open: boolean; salarySlip: SalarySlip | null }>({ open: false, salarySlip: null });
  const [processAllDialog, setProcessAllDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; structure: SalaryStructure | null }>({ open: false, structure: null });

  // Payment status form
  const [paymentStatusForm, setPaymentStatusForm] = useState({
    status: "paid",
    paidAmount: "",
    notes: "",
    paymentDate: new Date().toISOString().split('T')[0]
  });

  // Salary structure form - Auto-filled with employee data
  const [structureForm, setStructureForm] = useState({
    employeeId: "",
    basicSalary: "",
    hra: "",
    da: "",
    specialAllowance: "",
    conveyance: "",
    medicalAllowance: "",
    otherAllowances: "",
    providentFund: "",
    professionalTax: "",
    incomeTax: "",
    otherDeductions: "",
    leaveEncashment: "",
    arrears: "",
    esic: "",
    advance: "",
    mlwf: ""
  });

  // Fetch data on component mount and when selectedMonth changes
  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      setLoading(prev => ({ 
        ...prev, 
        employees: true, 
        payroll: true, 
        structures: true, 
        slips: true,
        summary: true 
      }));

      // Fetch employees
      const employeesResponse = await employeeApi.getAll({ status: 'active' });
      console.log('Employees response:', employeesResponse);
      if (employeesResponse.success) {
        setEmployees(employeesResponse.data || []);
      } else {
        toast.error('Failed to fetch employees: ' + (employeesResponse.message || 'Unknown error'));
      }

      // Fetch payroll for selected month
      const payrollResponse = await payrollApi.getAll({ month: selectedMonth });
      console.log('Payroll response:', payrollResponse);
      if (payrollResponse.success) {
        setPayroll(payrollResponse.data || []);
      } else {
        toast.error('Failed to fetch payroll: ' + (payrollResponse.message || 'Unknown error'));
      }

      // Fetch salary structures
      const structuresResponse = await salaryStructureApi.getAll({ isActive: true });
      console.log('Structures response:', structuresResponse);
      if (structuresResponse.success) {
        const structuresData = structuresResponse.data || [];
        console.log('Structures data:', structuresData);
        setSalaryStructures(structuresData);
      } else {
        toast.error('Failed to fetch salary structures: ' + (structuresResponse.message || 'Unknown error'));
      }

      // Fetch salary slips
      const slipsResponse = await salarySlipApi.getAll({ month: selectedMonth });
      console.log('Slips response:', slipsResponse);
      if (slipsResponse.success) {
        setSalarySlips(slipsResponse.data || []);
      } else {
        toast.error('Failed to fetch salary slips: ' + (slipsResponse.message || 'Unknown error'));
      }

      // Fetch payroll summary
      const summaryResponse = await payrollApi.getSummary({ month: selectedMonth });
      console.log('Summary response:', summaryResponse);
      if (summaryResponse.success) {
        setPayrollSummary(summaryResponse.data || {
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          holdAmount: 0,
          partPaidAmount: 0,
          processedCount: 0,
          pendingCount: 0,
          paidCount: 0,
          holdCount: 0,
          partPaidCount: 0,
          totalEmployees: 0,
          totalRecords: 0,
          activeEmployees: 0,
          employeesWithStructure: 0,
          employeesWithoutStructure: 0,
          payrollMonth: selectedMonth
        });
      } else {
        toast.error('Failed to fetch summary: ' + (summaryResponse.message || 'Unknown error'));
      }

      toast.success('Data loaded successfully');

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data. Please try again.');
    } finally {
      setLoading(prev => ({ 
        ...prev, 
        employees: false, 
        payroll: false, 
        structures: false, 
        slips: false,
        summary: false 
      }));
    }
  };

  // Get employees with salary structure
  const employeesWithStructure = useMemo(() => {
    return employees.filter(emp => 
      salaryStructures.some(s => s.employeeId === emp.employeeId)
    );
  }, [employees, salaryStructures]);

  // Get employees without salary structure
  const employeesWithoutStructure = useMemo(() => {
    return employees.filter(emp => 
      !salaryStructures.some(s => s.employeeId === emp.employeeId)
    );
  }, [employees, salaryStructures]);

  // Filter employees based on search and status
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = 
        employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (statusFilter === "all") return matchesSearch;
      
      const employeeStructure = salaryStructures.find(s => s.employeeId === employee.employeeId);
      if (statusFilter === "with-structure") return matchesSearch && employeeStructure;
      if (statusFilter === "without-structure") return matchesSearch && !employeeStructure;
      
      return matchesSearch;
    });
  }, [employees, searchTerm, statusFilter, salaryStructures]);

  // Mock attendance function - Replace with actual API call
  const getEmployeeAttendance = (employeeId: string) => {
    // Mock attendance data
    const monthAttendance = attendance.filter(a => 
      a.employeeId === employeeId && a.date?.startsWith(selectedMonth)
    );
    const presentDays = monthAttendance.filter(a => a.status === "present").length;
    const absentDays = monthAttendance.filter(a => a.status === "absent").length;
    const halfDays = monthAttendance.filter(a => a.status === "half-day").length;
    
    return { presentDays, absentDays, halfDays, totalWorkingDays: 22 };
  };

  // Mock leaves function - Replace with actual API call
  const getEmployeeLeaves = (employeeId: string) => {
    const monthLeaves = leaves.filter(l => 
      l.employeeId === employeeId && 
      l.startDate?.startsWith(selectedMonth) &&
      l.status === "approved"
    );
    return monthLeaves.length;
  };

  // Calculate salary based on attendance and leaves
  const calculateSalary = (employeeId: string, structure: SalaryStructure) => {
    if (!structure || !structure.basicSalary) return 0;
    
    const attendance = getEmployeeAttendance(employeeId);
    const totalLeaves = getEmployeeLeaves(employeeId);
    
    const totalWorkingDays = attendance.totalWorkingDays;
    if (totalWorkingDays === 0) return 0;

    // Calculate daily rate based on basic salary
    const dailyRate = structure.basicSalary / totalWorkingDays;
    const halfDayRate = dailyRate / 2;
    
    // Calculate earned basic salary based on attendance
    const earnedBasicSalary = 
      (attendance.presentDays * dailyRate) +
      (attendance.halfDays * halfDayRate);
    
    // Calculate loss for absent days and leaves
    const salaryLoss = 
      (attendance.absentDays * dailyRate) +
      (totalLeaves * dailyRate);

    // Net basic salary after deductions for absences and leaves
    const netBasicSalary = Math.max(0, earnedBasicSalary - salaryLoss);

    // Allowances (fixed)
    const totalAllowances = (structure.hra || 0) + (structure.da || 0) + (structure.specialAllowance || 0) + 
                           (structure.conveyance || 0) + (structure.medicalAllowance || 0) + (structure.otherAllowances || 0) +
                           (structure.leaveEncashment || 0) + (structure.arrears || 0);
    
    // Deductions (fixed)
    const totalDeductions = (structure.providentFund || 0) + (structure.professionalTax || 0) + 
                           (structure.incomeTax || 0) + (structure.otherDeductions || 0) +
                           (structure.esic || 0) + (structure.advance || 0) + (structure.mlwf || 0);

    // Total net salary
    const netSalary = netBasicSalary + totalAllowances - totalDeductions;

    return Math.max(0, netSalary);
  };

  // Get payroll calculation details for process dialog
  const getPayrollCalculationDetails = (employeeId: string) => {
    const structure = salaryStructures.find(s => s.employeeId === employeeId);
    if (!structure) return null;

    const attendance = getEmployeeAttendance(employeeId);
    const totalLeaves = getEmployeeLeaves(employeeId);
    const calculatedSalary = calculateSalary(employeeId, structure);

    const totalAllowances = (structure.hra || 0) + (structure.da || 0) + (structure.specialAllowance || 0) + 
                           (structure.conveyance || 0) + (structure.medicalAllowance || 0) + (structure.otherAllowances || 0) +
                           (structure.leaveEncashment || 0) + (structure.arrears || 0);
    const totalDeductions = (structure.providentFund || 0) + (structure.professionalTax || 0) + 
                           (structure.incomeTax || 0) + (structure.otherDeductions || 0) +
                           (structure.esic || 0) + (structure.advance || 0) + (structure.mlwf || 0);

    // Calculate daily rate and salary adjustments
    const dailyRate = structure.basicSalary / attendance.totalWorkingDays;
    const basicSalaryEarned = (attendance.presentDays * dailyRate) + (attendance.halfDays * dailyRate / 2);
    const salaryDeductions = (attendance.absentDays * dailyRate) + (totalLeaves * dailyRate);
    const netBasicSalary = basicSalaryEarned - salaryDeductions;

    return {
      structure,
      attendance,
      totalLeaves,
      calculatedSalary,
      totalAllowances,
      totalDeductions,
      dailyRate,
      basicSalaryEarned,
      salaryDeductions,
      netBasicSalary
    };
  };

  // Process payroll for an employee
  const handleProcessPayroll = async (employeeId: string) => {
    try {
      const employee = employees.find(e => e.employeeId === employeeId);
      if (!employee) {
        toast.error('Employee not found');
        return;
      }

      const structure = salaryStructures.find(s => s.employeeId === employeeId);
      if (!structure) {
        toast.error('Salary structure not found for this employee');
        return;
      }

      // Check if payroll already exists for this month
      const existingPayroll = payroll.find(p => 
        p.employeeId === employeeId && p.month === selectedMonth
      );
      
      if (existingPayroll) {
        toast.error('Payroll already processed for this employee for ' + selectedMonth);
        return;
      }

      const attendanceData = getEmployeeAttendance(employeeId);
      const leavesCount = getEmployeeLeaves(employeeId);

      // Calculate salary
      const calculatedSalary = calculateSalary(employeeId, structure);

      // Auto-fill bank and PF details from employee data
      const payrollData = {
        employeeId,
        month: selectedMonth,
        basicSalary: structure.basicSalary,
        allowances: (structure.hra || 0) + (structure.da || 0) + (structure.specialAllowance || 0) + 
                   (structure.conveyance || 0) + (structure.medicalAllowance || 0) + (structure.otherAllowances || 0) +
                   (structure.leaveEncashment || 0) + (structure.arrears || 0),
        deductions: (structure.providentFund || 0) + (structure.professionalTax || 0) + 
                   (structure.incomeTax || 0) + (structure.otherDeductions || 0) +
                   (structure.esic || 0) + (structure.advance || 0) + (structure.mlwf || 0),
        netSalary: calculatedSalary,
        status: 'processed',
        presentDays: attendanceData.presentDays,
        absentDays: attendanceData.absentDays,
        halfDays: attendanceData.halfDays,
        leaves: leavesCount,
        paidAmount: 0, // Start with 0
        paymentStatus: 'pending',
        da: structure.da,
        hra: structure.hra,
        providentFund: structure.providentFund,
        professionalTax: structure.professionalTax,
        esic: structure.esic,
        advance: structure.advance,
        mlwf: structure.mlwf,
        leaveEncashment: structure.leaveEncashment,
        arrears: structure.arrears,
        createdBy: 'system',
        updatedBy: 'system',
        // Auto-filled employee details
        employeeDetails: {
          accountNumber: employee.accountNumber,
          ifscCode: employee.ifscCode,
          bankBranch: employee.bankBranch,
          bankName: employee.bankName,
          aadharNumber: employee.aadharNumber,
          panNumber: employee.panNumber,
          esicNumber: employee.esicNumber,
          uanNumber: employee.uanNumber,
          permanentAddress: employee.permanentAddress,
          localAddress: employee.localAddress
        }
      };

      console.log('Processing payroll with data:', payrollData);

      const response = await payrollApi.process(payrollData);

      if (response.success) {
        toast.success('Payroll processed successfully');
        
        // Add the new payroll to state
        if (response.data) {
          setPayroll(prev => [...prev, response.data!]);
        }
        
        setProcessDialog({ open: false, employee: null });
        fetchData(); // Refresh data
      } else {
        toast.error(response.message || 'Failed to process payroll');
      }
    } catch (error: any) {
      console.error('Error processing payroll:', error);
      toast.error(error.response?.data?.message || 'Failed to process payroll');
    }
  };

  // Update payment status
  const handleUpdatePaymentStatus = async () => {
    if (!paymentStatusDialog.payroll) {
      toast.error('Payroll is missing');
      return;
    }

    const payrollId = getItemId(paymentStatusDialog.payroll);
    if (!payrollId) {
      toast.error('Payroll ID is missing');
      return;
    }

    // Validate form
    if (paymentStatusForm.status === 'part-paid') {
      const paidAmount = parseFloat(paymentStatusForm.paidAmount);
      if (isNaN(paidAmount) || paidAmount <= 0) {
        toast.error('Please enter a valid paid amount for part-paid status');
        return;
      }
      if (paidAmount > (paymentStatusDialog.payroll.netSalary || 0)) {
        toast.error('Paid amount cannot exceed net salary');
        return;
      }
    }

    if ((paymentStatusForm.status === 'paid' || paymentStatusForm.status === 'part-paid') && !paymentStatusForm.paymentDate) {
      toast.error('Payment date is required');
      return;
    }

    try {
      console.log('Updating payment status for payroll ID:', payrollId, 'with data:', paymentStatusForm);
      
      const response = await payrollApi.updatePaymentStatus(
        payrollId,
        paymentStatusForm
      );

      if (response.success) {
        toast.success('Payment status updated successfully');
        
        // Update the payroll in state
        setPayroll(prev => prev.map(p => {
          const pId = getItemId(p);
          if (pId === payrollId && response.data) {
            return { ...p, ...response.data };
          }
          return p;
        }));
        
        setPaymentStatusDialog({ open: false, payroll: null });
        setPaymentStatusForm({
          status: "paid",
          paidAmount: "",
          notes: "",
          paymentDate: new Date().toISOString().split('T')[0]
        });
        fetchData(); // Refresh summary
      } else {
        toast.error(response.message || 'Failed to update payment status');
      }
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update payment status';
      toast.error(errorMessage);
    }
  };

  // Process all payroll
  const handleProcessAllPayroll = async () => {
    if (employeesWithStructure.length === 0) {
      toast.error('No employees with salary structures found');
      return;
    }

    try {
      const employeeIds = employeesWithStructure.map(emp => emp.employeeId);
      const attendanceMap: any = {};

      // Prepare attendance data for all employees
      for (const employee of employeesWithStructure) {
        const attendance = getEmployeeAttendance(employee.employeeId);
        const leaves = getEmployeeLeaves(employee.employeeId);
        attendanceMap[employee.employeeId] = {
          presentDays: attendance.presentDays,
          absentDays: attendance.absentDays,
          halfDays: attendance.halfDays,
          leaves,
          totalWorkingDays: attendance.totalWorkingDays
        };
      }

      const response = await payrollApi.bulkProcess({
        month: selectedMonth,
        employeeIds,
        attendanceMap
      });

      if (response.success) {
        toast.success(`Payroll processed for ${response.results?.length || 0} employees`);
        setProcessAllDialog(false);
        fetchData(); // Refresh data
      } else {
        toast.error(response.message || 'Failed to process payroll');
      }
    } catch (error: any) {
      console.error('Error processing bulk payroll:', error);
      toast.error(error.response?.data?.message || 'Failed to process payroll');
    }
  };

  // Add new salary structure - Auto-fill basic salary from employee data
  const handleAddStructure = async () => {
    if (!structureForm.employeeId) {
      toast.error('Please select an employee');
      return;
    }

    try {
      // Get employee data for auto-filling
      const employee = employees.find(e => e.employeeId === structureForm.employeeId);
      if (!employee) {
        toast.error('Employee not found');
        return;
      }

      // Convert string values to numbers
      const salaryStructureData = {
        employeeId: structureForm.employeeId,
        basicSalary: parseFloat(structureForm.basicSalary) || employee.salary || 0, // Use employee's monthly salary as basic
        hra: parseFloat(structureForm.hra) || 0,
        da: parseFloat(structureForm.da) || 0,
        specialAllowance: parseFloat(structureForm.specialAllowance) || 0,
        conveyance: parseFloat(structureForm.conveyance) || 0,
        medicalAllowance: parseFloat(structureForm.medicalAllowance) || 0,
        otherAllowances: parseFloat(structureForm.otherAllowances) || 0,
        providentFund: parseFloat(structureForm.providentFund) || (employee.providentFund || 0), // Auto-fill PF if available
        professionalTax: parseFloat(structureForm.professionalTax) || (employee.professionalTax || 0), // Auto-fill PT if available
        incomeTax: parseFloat(structureForm.incomeTax) || 0,
        otherDeductions: parseFloat(structureForm.otherDeductions) || 0,
        leaveEncashment: parseFloat(structureForm.leaveEncashment) || 0,
        arrears: parseFloat(structureForm.arrears) || 0,
        esic: parseFloat(structureForm.esic) || 0,
        advance: parseFloat(structureForm.advance) || 0,
        mlwf: parseFloat(structureForm.mlwf) || 0,
        isActive: true
      };

      const response = await salaryStructureApi.create(salaryStructureData);

      if (response.success) {
        toast.success('Salary structure added successfully');
        setSalaryStructures(prev => [...prev, response.data!]);
        setIsAddingStructure(false);
        resetStructureForm();
        fetchData(); // Refresh summary
      } else {
        toast.error(response.message || 'Failed to add salary structure');
      }
    } catch (error: any) {
      console.error('Error adding salary structure:', error);
      toast.error(error.response?.data?.message || 'Failed to add salary structure');
    }
  };

  // Update salary structure
  const handleUpdateStructure = async () => {
    if (!editingStructure) return;

    try {
      // Convert string values to numbers
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
        mlwf: parseFloat(structureForm.mlwf) || 0
      };

      const response = await salaryStructureApi.update(getItemId(editingStructure), updates);

      if (response.success) {
        toast.success('Salary structure updated successfully');
        setSalaryStructures(prev => prev.map(s => {
          const sId = getItemId(s);
          if (sId === getItemId(editingStructure) && response.data) {
            return response.data!;
          }
          return s;
        }));
        setEditingStructure(null);
        resetStructureForm();
      } else {
        toast.error(response.message || 'Failed to update salary structure');
      }
    } catch (error: any) {
      console.error('Error updating salary structure:', error);
      toast.error(error.response?.data?.message || 'Failed to update salary structure');
    }
  };

  // Delete salary structure
  const handleDeleteStructure = async (id: string) => {
    if (!id) {
      toast.error('Structure ID is missing');
      return;
    }

    try {
      const response = await salaryStructureApi.delete(id);

      if (response.success) {
        toast.success('Salary structure deleted successfully');
        setSalaryStructures(prev => prev.filter(s => getItemId(s) !== id));
        setDeleteDialog({ open: false, structure: null });
        fetchData(); // Refresh summary
      } else {
        toast.error(response.message || 'Failed to delete salary structure');
      }
    } catch (error: any) {
      console.error('Error deleting salary structure:', error);
      toast.error(error.response?.data?.message || 'Failed to delete salary structure');
    }
  };

  // Edit salary structure
  const handleEditStructure = (structure: SalaryStructure) => {
    setEditingStructure(structure);
    setStructureForm({
      employeeId: structure.employeeId,
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
      mlwf: (structure.mlwf || 0).toString()
    });
  };

  // Generate salary slip
  const handleGenerateSalarySlip = async (payrollId: string) => {
    if (!payrollId) {
      toast.error('Payroll ID is missing');
      return;
    }

    try {
      console.log('Generating salary slip for payroll ID:', payrollId);
      
      const response = await salarySlipApi.generate({ payrollId });

      if (response.success) {
        toast.success('Salary slip generated successfully');
        
        // Add the new salary slip to state
        if (response.data) {
          setSalarySlips(prev => [...prev, response.data!]);
          setSlipDialog({ open: true, salarySlip: response.data! });
        }
      } else {
        toast.error(response.message || 'Failed to generate salary slip');
      }
    } catch (error: any) {
      console.error('Error generating salary slip:', error);
      toast.error(error.response?.data?.message || 'Failed to generate salary slip');
    }
  };

  // View salary slip
  const handleViewSalarySlip = (salarySlip: SalarySlip) => {
    setSlipDialog({ open: true, salarySlip });
  };

  // Print salary slip
  const handlePrintSalarySlip = () => {
    if (!slipDialog.salarySlip) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const employee = employees.find(e => e.employeeId === slipDialog.salarySlip!.employeeId);
      if (!employee) return;

      // Get salary structure for detailed breakdown
      const structure = salaryStructures.find(s => s.employeeId === slipDialog.salarySlip!.employeeId);

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Salary Slip - ${employee.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .slip-title { font-size: 20px; margin-bottom: 10px; }
            .employee-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
            .breakdown { width: 100%; border-collapse: collapse; }
            .breakdown td { padding: 8px; border-bottom: 1px solid #eee; }
            .breakdown .amount { text-align: right; }
            .total { font-weight: bold; border-top: 2px solid #333; }
            .attendance-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center; margin-top: 20px; }
            .attendance-item { padding: 10px; border-radius: 5px; }
            .present { background: #d1fae5; color: #065f46; }
            .absent { background: #fee2e2; color: #991b1b; }
            .half-day { background: #fef3c7; color: #92400e; }
            .leaves { background: #dbeafe; color: #1e40af; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">S K ENTERPRISES</div>
            <div class="slip-title">SALARY SLIP</div>
            <div>Period: ${slipDialog.salarySlip.month}</div>
            <div>Wages Slip Rule 27(2) Maharashtra Minimum Wages Rules, 1963</div>
          </div>
          
          <div class="employee-info">
            <div>
              <strong>Name:</strong> ${employee.name}<br>
              <strong>Employee ID:</strong> ${employee.employeeId}<br>
              <strong>Department:</strong> ${employee.department}<br>
              <strong>Bank Account:</strong> ${employee.accountNumber || 'N/A'}<br>
              <strong>Bank:</strong> ${employee.bankName || 'N/A'} - ${employee.bankBranch || 'N/A'}
            </div>
            <div>
              <strong>Generated Date:</strong> ${new Date(slipDialog.salarySlip.generatedDate).toLocaleDateString()}<br>
              <strong>Slip Number:</strong> ${slipDialog.salarySlip.slipNumber}<br>
              <strong>Aadhar:</strong> ${employee.aadharNumber || 'N/A'}<br>
              <strong>PAN:</strong> ${employee.panNumber || 'N/A'}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <!-- Earnings Section -->
            <div class="section">
              <div class="section-title">EARNINGS</div>
              <table class="breakdown">
                <tr>
                  <td>BASIC</td>
                  <td class="amount">₹${slipDialog.salarySlip.basicSalary.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>DA</td>
                  <td class="amount">₹${(structure?.da || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>HRA</td>
                  <td class="amount">₹${(structure?.hra || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>CCA</td>
                  <td class="amount">₹${(structure?.conveyance || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>BONUS</td>
                  <td class="amount">₹${(structure?.specialAllowance || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>LEAVE</td>
                  <td class="amount">₹${(structure?.leaveEncashment || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>MEDICAL</td>
                  <td class="amount">₹${(structure?.medicalAllowance || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>ARREARS</td>
                  <td class="amount">₹${(structure?.arrears || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>OTHER ALL</td>
                  <td class="amount">₹${(structure?.otherAllowances || 0).toLocaleString()}</td>
                </tr>
                <tr class="total">
                  <td><strong>TOTAL EARNINGS</strong></td>
                  <td class="amount"><strong>₹${slipDialog.salarySlip.allowances.toLocaleString()}</strong></td>
                </tr>
              </table>
            </div>

            <!-- Deductions Section -->
            <div class="section">
              <div class="section-title">DEDUCTIONS</div>
              <table class="breakdown">
                <tr>
                  <td>PF</td>
                  <td class="amount">-₹${(structure?.providentFund || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>ESIC</td>
                  <td class="amount">-₹${(structure?.esic || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>ADVANCE</td>
                  <td class="amount">-₹${(structure?.advance || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>MLWF</td>
                  <td class="amount">-₹${(structure?.mlwf || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Profession Tax</td>
                  <td class="amount">-₹${(structure?.professionalTax || 0).toLocaleString()}</td>
                </tr>
                <tr class="total">
                  <td><strong>TOTAL DEDUCTIONS</strong></td>
                  <td class="amount"><strong>-₹${slipDialog.salarySlip.deductions.toLocaleString()}</strong></td>
                </tr>
              </table>
            </div>
          </div>

          <div class="section">
            <div class="section-title">NET SALARY</div>
            <table class="breakdown">
              <tr class="total">
                <td><strong>NET PAYABLE</strong></td>
                <td class="amount"><strong>₹${slipDialog.salarySlip.netSalary.toLocaleString()}</strong></td>
              </tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Attendance Summary</div>
            <div class="attendance-grid">
              <div class="attendance-item present">
                <div style="font-size: 18px; font-weight: bold;">${slipDialog.salarySlip.presentDays}</div>
                <div>Present</div>
              </div>
              <div class="attendance-item absent">
                <div style="font-size: 18px; font-weight: bold;">${slipDialog.salarySlip.absentDays}</div>
                <div>Absent</div>
              </div>
              <div class="attendance-item half-day">
                <div style="font-size: 18px; font-weight: bold;">${slipDialog.salarySlip.halfDays}</div>
                <div>Half Days</div>
              </div>
              <div class="attendance-item leaves">
                <div style="font-size: 18px; font-weight: bold;">${slipDialog.salarySlip.leaves}</div>
                <div>Leaves</div>
              </div>
            </div>
          </div>

          <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
            <p>Office No 505, Global Square, Deccan College Road, Yerwada, Pune 411006</p>
            <p>THIS IS COMPUTER GENERATED SLIP NOT REQUIRED SIGNATURE & STAMP</p>
          </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Send salary slip via email
  const handleSendSalarySlip = async () => {
    if (!slipDialog.salarySlip) return;

    const slipId = getItemId(slipDialog.salarySlip);
    if (!slipId) {
      toast.error('Salary slip ID is missing');
      return;
    }

    try {
      const response = await salarySlipApi.markAsEmailed(slipId);

      if (response.success) {
        toast.success("Salary slip sent to employee's email!");
        
        // Update the salary slip in state
        setSalarySlips(prev => prev.map(slip => 
          getItemId(slip) === slipId ? { 
            ...slip, 
            emailSent: true, 
            emailSentAt: new Date().toISOString() 
          } : slip
        ));
        
        setSlipDialog({ open: false, salarySlip: null });
      } else {
        toast.error(response.message || 'Failed to send salary slip');
      }
    } catch (error: any) {
      console.error('Error sending salary slip:', error);
      toast.error(error.response?.data?.message || 'Failed to send salary slip');
    }
  };

  // Export payroll data to Excel format
  const handleExportPayrollExcel = async () => {
    if (!payroll || payroll.length === 0) {
      toast.error("No payroll data to export");
      return;
    }

    try {
      const response = await payrollApi.export({
        month: selectedMonth,
        format: 'csv'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll-${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Payroll exported successfully');
    } catch (error: any) {
      console.error('Error exporting payroll:', error);
      toast.error(error.response?.data?.message || 'Failed to export payroll');
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      processed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      paid: "bg-green-100 text-green-800 hover:bg-green-100",
      hold: "bg-red-100 text-red-800 hover:bg-red-100",
      "part-paid": "bg-orange-100 text-orange-800 hover:bg-orange-100"
    };

    const statusLabels: Record<string, string> = {
      pending: "Pending",
      processed: "Processed",
      paid: "Paid",
      hold: "Hold",
      "part-paid": "Part Paid"
    };

    return (
      <Badge variant="secondary" className={variants[status] || "bg-gray-100 text-gray-800"}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  // Get employee details
  const getEmployeeDetails = (employeeId: string) => {
    return employees.find(e => e.employeeId === employeeId) || null;
  };

  // Calculate totals for salary structure
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

    const totalEarnings = basic + hra + da + specialAllowance + conveyance + 
                         medicalAllowance + otherAllowances + leaveEncashment + arrears;
    
    const totalDeductions = providentFund + professionalTax + incomeTax + 
                           otherDeductions + esic + advance + mlwf;
    
    const netSalary = totalEarnings - totalDeductions;

    return { totalEarnings, totalDeductions, netSalary };
  };

  // Reset structure form
  const resetStructureForm = () => {
    setStructureForm({
      employeeId: "",
      basicSalary: "",
      hra: "",
      da: "",
      specialAllowance: "",
      conveyance: "",
      medicalAllowance: "",
      otherAllowances: "",
      providentFund: "",
      professionalTax: "",
      incomeTax: "",
      otherDeductions: "",
      leaveEncashment: "",
      arrears: "",
      esic: "",
      advance: "",
      mlwf: ""
    });
  };

  // Handle employee selection for salary structure - Auto-fill basic salary
  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(e => e.employeeId === employeeId);
    if (employee) {
      setStructureForm(prev => ({
        ...prev,
        employeeId,
        basicSalary: employee.salary.toString(), // Auto-fill basic salary from employee's monthly salary
        // Optionally auto-fill PF and PT if available in employee data
        providentFund: (employee.providentFund || 0).toString(),
        professionalTax: (employee.professionalTax || 0).toString()
      }));
    }
  };

  // Handle open payment status dialog
  const handleOpenPaymentStatus = (payroll: Payroll) => {
    const payrollId = getItemId(payroll);
    if (!payrollId) {
      console.error('Payroll ID is missing:', payroll);
      toast.error('Cannot update payment status: Payroll ID is missing');
      return;
    }
    
    setPaymentStatusDialog({ open: true, payroll });
    setPaymentStatusForm({
      status: payroll.paymentStatus || 'pending',
      paidAmount: payroll.paidAmount?.toString() || "0",
      notes: payroll.notes || "",
      paymentDate: payroll.paymentDate || new Date().toISOString().split('T')[0]
    });
  };

  // Month options
  const monthOptions = [
    { value: '2024-01', label: 'January 2024' },
    { value: '2024-02', label: 'February 2024' },
    { value: '2024-03', label: 'March 2024' },
    { value: '2024-04', label: 'April 2024' },
    { value: '2024-05', label: 'May 2024' },
    { value: '2024-06', label: 'June 2024' },
    { value: '2024-07', label: 'July 2024' },
    { value: '2024-08', label: 'August 2024' },
    { value: '2024-09', label: 'September 2024' },
    { value: '2024-10', label: 'October 2024' },
    { value: '2024-11', label: 'November 2024' },
    { value: '2024-12', label: 'December 2024' },
    { value: '2025-01', label: 'January 2025' },
    { value: '2025-02', label: 'February 2025' },
    { value: '2025-03', label: 'March 2025' },
    { value: '2025-04', label: 'April 2025' },
    { value: '2025-05', label: 'May 2025' },
    { value: '2025-06', label: 'June 2025' },
    { value: '2025-07', label: 'July 2025' },
    { value: '2025-08', label: 'August 2025' },
    { value: '2025-09', label: 'September 2025' },
    { value: '2025-10', label: 'October 2025' },
    { value: '2025-11', label: 'November 2025' },
    { value: '2025-12', label: 'December 2025' }
  ];

  // Refresh data
  const handleRefreshData = () => {
    fetchData();
  };

  // Debug logging
  useEffect(() => {
    console.log('Salary Structures Updated:', {
      count: salaryStructures.length,
      data: salaryStructures,
      firstStructure: salaryStructures[0]
    });
  }, [salaryStructures]);

  useEffect(() => {
    console.log('Employees Updated:', {
      count: employees.length,
      data: employees
    });
  }, [employees]);

  useEffect(() => {
    console.log('Payroll data loaded:', {
      count: payroll.length,
      firstRecord: payroll[0],
      ids: payroll.map(p => ({ id: getItemId(p), employeeId: p.employeeId }))
    });
  }, [payroll]);

  if (loading.employees && loading.payroll && loading.structures && loading.slips) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Loading payroll data...</p>
          <p className="text-sm text-muted-foreground">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Process Salary Dialog */}
      <Dialog open={processDialog.open} onOpenChange={(open) => setProcessDialog({ open, employee: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Process Salary
            </DialogTitle>
            <DialogDescription>
              Confirm salary processing for {processDialog.employee?.name}
            </DialogDescription>
          </DialogHeader>
          
          {processDialog.employee && (() => {
            const calculation = getPayrollCalculationDetails(processDialog.employee.employeeId);
            if (!calculation) {
              return (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">Salary structure not found</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Please add a salary structure for this employee first.
                  </p>
                  <Button
                    onClick={() => {
                      handleEmployeeSelect(processDialog.employee!.employeeId);
                      setIsAddingStructure(true);
                      setActivePayrollTab("salary-structures");
                      setProcessDialog({ open: false, employee: null });
                    }}
                  >
                    Add Salary Structure
                  </Button>
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

                {/* Employee Bank Details */}
                <div className="border rounded-lg p-3 bg-gray-50">
                  <h4 className="font-medium mb-2">Bank Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600">Account:</span>
                      <div className="font-medium">{processDialog.employee.accountNumber || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">IFSC:</span>
                      <div className="font-medium">{processDialog.employee.ifscCode || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Bank:</span>
                      <div className="font-medium">{processDialog.employee.bankName || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Branch:</span>
                      <div className="font-medium">{processDialog.employee.bankBranch || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2">Attendance Summary</h4>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div className="text-center">
                        <div className="font-medium text-green-600">{calculation.attendance.presentDays}</div>
                        <div className="text-xs text-muted-foreground">Present</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-red-600">{calculation.attendance.absentDays}</div>
                        <div className="text-xs text-muted-foreground">Absent</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-yellow-600">{calculation.attendance.halfDays}</div>
                        <div className="text-xs text-muted-foreground">Half Days</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-blue-600">{calculation.totalLeaves}</div>
                        <div className="text-xs text-muted-foreground">Leaves</div>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2">Salary Calculation</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Basic Salary:</span>
                        <span className="font-medium">₹{calculation.structure.basicSalary?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Earned Basic:</span>
                        <span>+₹{calculation.basicSalaryEarned.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Deductions (Absent/Leaves):</span>
                        <span>-₹{calculation.salaryDeductions.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="font-medium">Net Basic Salary:</span>
                        <span className="font-medium">₹{calculation.netBasicSalary.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Allowances:</span>
                        <span className="text-green-600">+₹{calculation.totalAllowances.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Deductions:</span>
                        <span className="text-red-600">-₹{calculation.totalDeductions.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-bold">
                        <span>Final Net Salary:</span>
                        <span className="text-lg">₹{calculation.calculatedSalary.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDialog({ open: false, employee: null })}>
              Cancel
            </Button>
            <Button 
              onClick={() => processDialog.employee && handleProcessPayroll(processDialog.employee.employeeId)}
              disabled={!getPayrollCalculationDetails(processDialog.employee?.employeeId || '')}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Process Salary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Status Dialog */}
      <Dialog open={paymentStatusDialog.open} onOpenChange={(open) => setPaymentStatusDialog({ open, payroll: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Payment Status</DialogTitle>
            <DialogDescription>
              Update payment status for {paymentStatusDialog.payroll?.employee?.name || 'Employee'}
            </DialogDescription>
          </DialogHeader>
          
          {paymentStatusDialog.payroll && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600 mb-2">
                    ₹{paymentStatusDialog.payroll.netSalary?.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-700">
                    Total Net Salary
                  </div>
                  {paymentStatusDialog.payroll.paidAmount && paymentStatusDialog.payroll.paidAmount > 0 && (
                    <div className="text-sm text-green-600 mt-1">
                      Already Paid: ₹{paymentStatusDialog.payroll.paidAmount.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Payment Status *</Label>
                <Select 
                  value={paymentStatusForm.status} 
                  onValueChange={(value) => {
                    console.log('Status changed to:', value);
                    setPaymentStatusForm(prev => ({ 
                      ...prev, 
                      status: value,
                      paidAmount: value !== 'part-paid' ? '' : prev.paidAmount
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
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
                  <Input
                    id="paidAmount"
                    type="number"
                    placeholder="Enter paid amount"
                    value={paymentStatusForm.paidAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      const maxAmount = paymentStatusDialog.payroll?.netSalary || 0;
                      const numericValue = parseFloat(value) || 0;
                      
                      if (numericValue > maxAmount) {
                        toast.error(`Amount cannot exceed ₹${maxAmount.toLocaleString()}`);
                        setPaymentStatusForm(prev => ({ 
                          ...prev, 
                          paidAmount: maxAmount.toString() 
                        }));
                      } else {
                        setPaymentStatusForm(prev => ({ ...prev, paidAmount: value }));
                      }
                    }}
                    min="0"
                    max={paymentStatusDialog.payroll?.netSalary || 0}
                  />
                  {paymentStatusDialog.payroll && (
                    <div className="text-xs text-muted-foreground">
                      Remaining: ₹{(
                        (paymentStatusDialog.payroll.netSalary || 0) - 
                        (parseFloat(paymentStatusForm.paidAmount) || 0)
                      ).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {(paymentStatusForm.status === "paid" || paymentStatusForm.status === "part-paid") && (
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentStatusForm.paymentDate}
                    onChange={(e) => setPaymentStatusForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <textarea
                  id="notes"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Add any notes..."
                  value={paymentStatusForm.notes}
                  onChange={(e) => setPaymentStatusForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentStatusDialog({ open: false, payroll: null })}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePaymentStatus}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Salary Slip Dialog */}
      <Dialog open={slipDialog.open} onOpenChange={(open) => setSlipDialog({ open, salarySlip: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Salary Slip
            </DialogTitle>
          </DialogHeader>
          
          {slipDialog.salarySlip && (() => {
            const employee = getEmployeeDetails(slipDialog.salarySlip!.employeeId);
            if (!employee) return null;

            return (
              <div className="space-y-6 p-1">
                {/* Salary Slip Header */}
                <div className="border-b pb-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold">Salary Slip</h2>
                      <p className="text-muted-foreground">{slipDialog.salarySlip.month}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-lg font-semibold">{employee.name}</div>
                      <div className="text-sm text-muted-foreground">{employee.employeeId}</div>
                      <div className="text-sm text-muted-foreground">{employee.department}</div>
                      <div className="text-sm text-muted-foreground">
                        Bank: {employee.accountNumber ? `XXXX${employee.accountNumber.slice(-4)}` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Earnings */}
                <div>
                  <h3 className="font-semibold mb-3">Earnings</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Basic Salary</span>
                      <span>₹{slipDialog.salarySlip.basicSalary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Allowances</span>
                      <span className="text-green-600">₹{slipDialog.salarySlip.allowances.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-medium">
                      <span>Gross Earnings</span>
                      <span>₹{(slipDialog.salarySlip.basicSalary + slipDialog.salarySlip.allowances).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h3 className="font-semibold mb-3">Deductions</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Deductions</span>
                      <span className="text-red-600">-₹{slipDialog.salarySlip.deductions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Net Salary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Net Salary</span>
                    <span className="text-xl sm:text-2xl font-bold text-green-600">
                      ₹{slipDialog.salarySlip.netSalary.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Attendance Summary */}
                <div>
                  <h3 className="font-semibold mb-3">Attendance Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="bg-green-50 rounded p-3 text-center">
                      <div className="font-semibold text-green-600 text-lg">{slipDialog.salarySlip.presentDays}</div>
                      <div className="text-muted-foreground">Present</div>
                    </div>
                    <div className="bg-red-50 rounded p-3 text-center">
                      <div className="font-semibold text-red-600 text-lg">{slipDialog.salarySlip.absentDays}</div>
                      <div className="text-muted-foreground">Absent</div>
                    </div>
                    <div className="bg-yellow-50 rounded p-3 text-center">
                      <div className="font-semibold text-yellow-600 text-lg">{slipDialog.salarySlip.halfDays}</div>
                      <div className="text-muted-foreground">Half Days</div>
                    </div>
                    <div className="bg-blue-50 rounded p-3 text-center">
                      <div className="font-semibold text-blue-600 text-lg">{slipDialog.salarySlip.leaves}</div>
                      <div className="text-muted-foreground">Leaves</div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground text-center border-t pt-4">
                  Generated on {new Date(slipDialog.salarySlip.generatedDate).toLocaleDateString()} | 
                  Slip Number: {slipDialog.salarySlip.slipNumber}
                </div>
              </div>
            );
          })()}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handlePrintSalarySlip} className="sm:flex-1">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={handleSendSalarySlip} className="sm:flex-1">
              <Send className="mr-2 h-4 w-4" />
              Send Email
            </Button>
            <Button onClick={() => setSlipDialog({ open: false, salarySlip: null })} className="sm:flex-1">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process All Payroll Dialog */}
      <AlertDialog open={processAllDialog} onOpenChange={setProcessAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Process All Payroll</AlertDialogTitle>
            <AlertDialogDescription>
              This will process payroll for all {employeesWithStructure.length} employees with salary structures for {selectedMonth}. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleProcessAllPayroll}>
              Process All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Structure Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, structure: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Salary Structure</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the salary structure for {
                deleteDialog.structure && getEmployeeDetails(deleteDialog.structure.employeeId)?.name
              }? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteDialog.structure && handleDeleteStructure(getItemId(deleteDialog.structure))}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Payroll Management</h2>
          <p className="text-muted-foreground">Manage employee salaries, payroll processing, and salary slips</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportPayrollExcel} disabled={payroll.length === 0}>
            <Sheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={handleRefreshData}>
            <Loader2 className={`mr-2 h-4 w-4 ${loading.payroll ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              Total Payroll
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{payrollSummary.totalAmount.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {payrollSummary.totalRecords} records
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{payrollSummary.processedCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              ₹{payrollSummary.totalAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{payrollSummary.paidCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              ₹{payrollSummary.paidAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{payrollSummary.holdCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              ₹{payrollSummary.holdAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Part Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{payrollSummary.partPaidCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              ₹{payrollSummary.partPaidAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{payrollSummary.pendingCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              ₹{payrollSummary.pendingAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {payrollSummary.activeEmployees} active
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">With Salary Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{payrollSummary.employeesWithStructure}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Ready for payroll
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Without Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{payrollSummary.employeesWithoutStructure}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Needs structure setup
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activePayrollTab} onValueChange={setActivePayrollTab} className="w-full">
           <TabsList className="flex flex-wrap gap-1 sm:gap-2 w-full h-auto p-1 bg-gray-100 rounded-lg">
  <TabsTrigger 
    value="salary-slips" 
    className="flex-1 min-w-[100px] sm:min-w-[140px] text-xs sm:text-sm whitespace-nowrap"
  >
    Salary Processing
  </TabsTrigger>
  <TabsTrigger 
    value="salary-structures" 
    className="flex-1 min-w-[100px] sm:min-w-[140px] text-xs sm:text-sm whitespace-nowrap"
  >
    Salary Structures
  </TabsTrigger>
  <TabsTrigger 
    value="payroll-records" 
    className="flex-1 min-w-[100px] sm:min-w-[140px] text-xs sm:text-sm whitespace-nowrap"
  >
    Payroll Records
  </TabsTrigger>
</TabsList>

            {/* Salary Processing Tab */}
            <TabsContent value="salary-slips" className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employees..."
                      className="pl-8 w-full sm:w-[250px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
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
                <Button 
                  onClick={() => setProcessAllDialog(true)} 
                  disabled={employeesWithStructure.length === 0}
                  className="w-full sm:w-auto"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Process All Payroll
                </Button>
              </div>

              {loading.employees ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Salary Structure</TableHead>
                        <TableHead>Attendance</TableHead>
                        <TableHead>Leaves</TableHead>
                        <TableHead>Calculated Salary</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {searchTerm ? 'No employees found matching your search' : 'No employees found'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEmployees.map((employee, index) => {
                          const structure = salaryStructures.find(s => s.employeeId === employee.employeeId);
                          const payrollRecord = payroll.find(p => 
                            p.employeeId === employee.employeeId && p.month === selectedMonth
                          );
                          const attendance = getEmployeeAttendance(employee.employeeId);
                          const totalLeaves = getEmployeeLeaves(employee.employeeId);
                          const calculatedSalary = structure ? calculateSalary(employee.employeeId, structure) : 0;

                          return (
                            <TableRow key={employee.employeeId || employee._id || `employee-${index}`}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{employee.name}</div>
                                  <div className="text-sm text-muted-foreground">{employee.employeeId}</div>
                                  <div className="text-xs text-gray-500">
                                    {employee.accountNumber ? `Bank: XXXX${employee.accountNumber.slice(-4)}` : 'No bank account'}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{employee.department}</TableCell>
                              <TableCell>
                                {structure ? (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                                    Configured
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">
                                    Not Configured
                                  </Badge>
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
                              <TableCell>
                                <Badge variant="secondary">{totalLeaves} days</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium flex items-center">
                                  <IndianRupee className="h-4 w-4 mr-1" />
                                  {calculatedSalary.toFixed(2)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {structure ? (
                                    payrollRecord ? (
                                      <>
                                        {getStatusBadge(payrollRecord.status)}
                                        {payrollRecord._id && (
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => handleOpenPaymentStatus(payrollRecord)}
                                          >
                                            Status
                                          </Button>
                                        )}
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => {
                                            const payrollId = getItemId(payrollRecord);
                                            if (!payrollId) {
                                              toast.error('Cannot generate slip: Payroll ID missing');
                                              return;
                                            }
                                            
                                            const slip = salarySlips.find(s => s.payrollId === payrollId);
                                            if (slip) {
                                              handleViewSalarySlip(slip);
                                            } else {
                                              handleGenerateSalarySlip(payrollId);
                                            }
                                          }}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </>
                                    ) : (
                                      <Button 
                                        size="sm" 
                                        onClick={() => setProcessDialog({ open: true, employee })}
                                      >
                                        Process Salary
                                      </Button>
                                    )
                                  ) : (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => {
                                        handleEmployeeSelect(employee.employeeId);
                                        setIsAddingStructure(true);
                                        setActivePayrollTab("salary-structures");
                                      }}
                                    >
                                      Add Structure
                                    </Button>
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
              )}
            </TabsContent>

            {/* Salary Structures Tab */}
            <TabsContent value="salary-structures" className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-semibold">Salary Structures</h3>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button onClick={() => setIsAddingStructure(true)} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Structure
                  </Button>
                </div>
              </div>

              {/* Add/Edit Salary Structure Form */}
              {(isAddingStructure || editingStructure) && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {editingStructure ? "Edit Salary Structure" : "Add Salary Structure"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="employeeId">Employee *</Label>
                      <Select 
                        value={structureForm.employeeId} 
                        onValueChange={(value) => {
                          if (value && value !== "no-employees") {
                            handleEmployeeSelect(value);
                          }
                        }}
                        disabled={!!editingStructure}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employeesWithoutStructure.length > 0 ? (
                            employeesWithoutStructure.map(employee => (
                              <SelectItem 
                                key={employee.employeeId} 
                                value={employee.employeeId}
                              >
                                {employee.name} ({employee.employeeId}) - {employee.department} - ₹{employee.salary.toLocaleString()}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-employees" disabled>
                              All employees have salary structures
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      
                      {structureForm.employeeId && (() => {
                        const selectedEmployee = employees.find(e => e.employeeId === structureForm.employeeId);
                        if (!selectedEmployee) return null;
                        
                        return (
                          <div className="text-sm text-muted-foreground mt-1 p-2 bg-gray-50 rounded">
                            <div>Monthly Salary: ₹{selectedEmployee.salary.toLocaleString()}</div>
                            {selectedEmployee.accountNumber && (
                              <div>Bank Account: XXXX{selectedEmployee.accountNumber.slice(-4)}</div>
                            )}
                            {selectedEmployee.providentFund && (
                              <div>PF Contribution: ₹{selectedEmployee.providentFund.toLocaleString()}</div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Earnings Section */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-4 text-lg">EARNINGS</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="basic" className="font-medium">BASIC *</Label>
                            <Input
                              id="basic"
                              type="number"
                              placeholder="Basic Salary"
                              value={structureForm.basicSalary}
                              onChange={(e) => setStructureForm(prev => ({ ...prev, basicSalary: e.target.value }))}
                              required
                            />
                            <p className="text-xs text-muted-foreground">
                              Auto-filled from employee's monthly salary
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="da" className="font-medium">DA</Label>
                            <Input
                              id="da"
                              type="number"
                              placeholder="Dearness Allowance"
                              value={structureForm.da}
                              onChange={(e) => setStructureForm(prev => ({ ...prev, da: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="hra" className="font-medium">HRA</Label>
                            <Input
                              id="hra"
                              type="number"
                              placeholder="House Rent Allowance"
                              value={structureForm.hra}
                              onChange={(e) => setStructureForm(prev => ({ ...prev, hra: e.target.value }))}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="cca" className="font-medium">CCA</Label>
                            <Input
                              id="cca"
                              type="number"
                              placeholder="City Compensatory Allowance"
                              value={structureForm.conveyance}
                              onChange={(e) => setStructureForm(prev => ({ ...prev, conveyance: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="medical" className="font-medium">MEDICAL</Label>
                            <Input
                              id="medical"
                              type="number"
                              placeholder="Medical Allowance"
                              value={structureForm.medicalAllowance}
                              onChange={(e) => setStructureForm(prev => ({ ...prev, medicalAllowance: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="otherAll" className="font-medium">OTHER ALL</Label>
                            <Input
                              id="otherAll"
                              type="number"
                              placeholder="Other Allowances"
                              value={structureForm.otherAllowances}
                              onChange={(e) => setStructureForm(prev => ({ ...prev, otherAllowances: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Additional Earnings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="bonus" className="font-medium">BONUS</Label>
                            <Input
                              id="bonus"
                              type="number"
                              placeholder="Bonus"
                              value={structureForm.specialAllowance}
                              onChange={(e) => setStructureForm(prev => ({ ...prev, specialAllowance: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="leave" className="font-medium">LEAVE</Label>
                            <Input
                              id="leave"
                              type="number"
                              placeholder="Leave Encashment"
                              value={structureForm.leaveEncashment}
                              onChange={(e) => setStructureForm(prev => ({ 
                                ...prev, 
                                leaveEncashment: e.target.value 
                              }))}
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="arrears" className="font-medium">ARREARS</Label>
                            <Input
                              id="arrears"
                              type="number"
                              placeholder="Arrears"
                              value={structureForm.arrears}
                              onChange={(e) => setStructureForm(prev => ({ 
                                ...prev, 
                                arrears: e.target.value 
                              }))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Deductions Section */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-4 text-lg">DEDUCTIONS</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="pf" className="font-medium">PF</Label>
                            <Input
                              id="pf"
                              type="number"
                              placeholder="Provident Fund"
                              value={structureForm.providentFund}
                              onChange={(e) => setStructureForm(prev => ({ ...prev, providentFund: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">
                              Auto-filled from employee data if available
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="esic" className="font-medium">ESIC</Label>
                            <Input
                              id="esic"
                              type="number"
                              placeholder="ESIC Contribution"
                              value={structureForm.esic}
                              onChange={(e) => setStructureForm(prev => ({ 
                                ...prev, 
                                esic: e.target.value 
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="advance" className="font-medium">ADVANCE</Label>
                            <Input
                              id="advance"
                              type="number"
                              placeholder="Advance Deduction"
                              value={structureForm.advance}
                              onChange={(e) => setStructureForm(prev => ({ 
                                ...prev, 
                                advance: e.target.value 
                              }))}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="mlwf" className="font-medium">MLWF</Label>
                            <Input
                              id="mlwf"
                              type="number"
                              placeholder="MLWF Deduction"
                              value={structureForm.mlwf}
                              onChange={(e) => setStructureForm(prev => ({ 
                                ...prev, 
                                mlwf: e.target.value 
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="professionTax" className="font-medium">Profession Tax</Label>
                            <Input
                              id="professionTax"
                              type="number"
                              placeholder="Professional Tax"
                              value={structureForm.professionalTax}
                              onChange={(e) => setStructureForm(prev => ({ ...prev, professionalTax: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">
                              Auto-filled from employee data if available
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="incomeTax" className="font-medium">INCOME TAX</Label>
                            <Input
                              id="incomeTax"
                              type="number"
                              placeholder="Income Tax"
                              value={structureForm.incomeTax}
                              onChange={(e) => setStructureForm(prev => ({ ...prev, incomeTax: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Total Earnings:</span>
                            <span className="font-medium text-green-600">
                              ₹{calculateStructureTotals().totalEarnings.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Deductions:</span>
                            <span className="font-medium text-red-600">
                              ₹{calculateStructureTotals().totalDeductions.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between border-t pt-2">
                            <span className="font-semibold">Net Salary:</span>
                            <span className="font-bold text-lg">
                              ₹{calculateStructureTotals().netSalary.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-4">
                      <Button 
                        onClick={editingStructure ? handleUpdateStructure : handleAddStructure}
                        disabled={!structureForm.basicSalary || !structureForm.employeeId || structureForm.employeeId === "no-employees"}
                        className="flex-1"
                      >
                        {editingStructure ? "Update Structure" : "Add Structure"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsAddingStructure(false);
                          setEditingStructure(null);
                          resetStructureForm();
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Salary Structures List */}
              {loading.structures ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
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
                      {salaryStructures.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No salary structures found
                          </TableCell>
                        </TableRow>
                      ) : (
                        salaryStructures.map((structure, index) => {
                          const employee = employees.find(e => e.employeeId === structure.employeeId);
                          const totalAllowances = (structure.hra || 0) + (structure.da || 0) + (structure.specialAllowance || 0) + 
                                                (structure.conveyance || 0) + (structure.medicalAllowance || 0) + (structure.otherAllowances || 0) +
                                                (structure.leaveEncashment || 0) + (structure.arrears || 0);
                          const totalDeductions = (structure.providentFund || 0) + (structure.professionalTax || 0) + 
                                                (structure.incomeTax || 0) + (structure.otherDeductions || 0) +
                                                (structure.esic || 0) + (structure.advance || 0) + (structure.mlwf || 0);
                          const totalCTC = (structure.basicSalary || 0) + totalAllowances;

                          if (!employee) return null;

                          return (
                            <TableRow key={structure._id || structure.id || `structure-${index}`}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{employee.name}</div>
                                  <div className="text-sm text-muted-foreground">{employee.employeeId}</div>
                                  <div className="text-xs text-gray-500">
                                    {employee.accountNumber ? `Bank: XXXX${employee.accountNumber.slice(-4)}` : 'No bank'}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <IndianRupee className="h-4 w-4 mr-1" />
                                  {(structure.basicSalary || 0).toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Monthly: ₹{employee.salary.toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <IndianRupee className="h-4 w-4 mr-1" />
                                  {totalAllowances.toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <IndianRupee className="h-4 w-4 mr-1" />
                                  {totalDeductions.toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium flex items-center">
                                  <IndianRupee className="h-4 w-4 mr-1" />
                                  {totalCTC.toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleEditStructure(structure)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setDeleteDialog({ open: true, structure })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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

            {/* Payroll Records Tab */}
            <TabsContent value="payroll-records" className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Payroll Records - {selectedMonth}</h3>
                  <p className="text-sm text-muted-foreground">
                    Total Records: {payroll.length} | Total Amount: ₹{payroll.reduce((sum, p) => sum + (p.netSalary || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportPayrollExcel} disabled={payroll.length === 0}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>

              {loading.payroll ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[1400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">SR</TableHead>
                          <TableHead>BANK AC</TableHead>
                          <TableHead>BRANCH</TableHead>
                          <TableHead>IFSC CODE</TableHead>
                          <TableHead>NAMES</TableHead>
                          <TableHead className="w-8">G</TableHead>
                          <TableHead>MONTH</TableHead>
                          <TableHead>DEP</TableHead>
                          <TableHead>STATUS</TableHead>
                          <TableHead>IN HAND</TableHead>
                          <TableHead>DESG</TableHead>
                          <TableHead>DAYS</TableHead>
                          <TableHead>OT</TableHead>
                          <TableHead>BASIC</TableHead>
                          <TableHead>DA</TableHead>
                          <TableHead>HRA</TableHead>
                          <TableHead>OTHER</TableHead>
                          <TableHead>LEAVE</TableHead>
                          <TableHead>BONUS</TableHead>
                          <TableHead>OT AMOUNT</TableHead>
                          <TableHead>GROSS</TableHead>
                          <TableHead>PF</TableHead>
                          <TableHead>ESIC</TableHead>
                          <TableHead>PT</TableHead>
                          <TableHead>MLWF</TableHead>
                          <TableHead>ADVANCE</TableHead>
                          <TableHead>UNI & ID</TableHead>
                          <TableHead>FINE</TableHead>
                          <TableHead>DED</TableHead>
                          <TableHead>OTHER DED</TableHead>
                          <TableHead>NET</TableHead>
                          <TableHead>ACTIONS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payroll.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={32} className="text-center py-8 text-muted-foreground">
                              No payroll records found for {selectedMonth}
                            </TableCell>
                          </TableRow>
                        ) : (
                          payroll.map((record, index) => {
                            const employee = employees.find(e => e.employeeId === record.employeeId);
                            if (!employee) return null;

                            const grossSalary = (record.basicSalary || 0) + (record.allowances || 0);

                            return (
                              <TableRow key={record._id || record.id || `payroll-${index}`}>
                                <TableCell className="font-medium">{index + 1}</TableCell>
                                <TableCell>{employee.accountNumber || "N/A"}</TableCell>
                                <TableCell>{employee.bankBranch || "N/A"}</TableCell>
                                <TableCell>{employee.ifscCode || "N/A"}</TableCell>
                                <TableCell className="font-medium">{employee.name}</TableCell>
                                <TableCell>{employee.gender?.charAt(0) || "N/A"}</TableCell>
                                <TableCell>{record.month}</TableCell>
                                <TableCell>{employee.department}</TableCell>
                                <TableCell>{getStatusBadge(record.status)}</TableCell>
                                <TableCell className="font-medium">
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {(record.paidAmount || 0).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell>{employee.position}</TableCell>
                                <TableCell>{record.presentDays || 0}</TableCell>
                                <TableCell>{record.overtimeHours || 0}</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {(record.basicSalary || 0).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {(record.da || 0).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {(record.hra || 0).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {(record.otherAllowances || 0).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell>{record.leaves || 0}</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {(record.bonus || 0).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {(record.overtimeAmount || 0).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {grossSalary.toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {(record.providentFund || 0).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {(record.esic || 0).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {(record.professionalTax || 0).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {(record.mlwf || 0).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {(record.advance || 0).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {(record.uniformAndId || 0).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {(record.fine || 0).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {(record.deductions || 0).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <IndianRupee className="h-3 w-3 mr-1" />
                                    {(record.otherDeductions || 0).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                  <div className="flex items-center">
                                    <IndianRupee className="h-4 w-4 mr-1" />
                                    {(record.netSalary || 0).toLocaleString()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleOpenPaymentStatus(record)}>
                                        Update Status
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => {
                                        const payrollId = getItemId(record);
                                        if (!payrollId) {
                                          toast.error('Cannot generate slip: Payroll ID missing');
                                          return;
                                        }
                                        
                                        const slip = salarySlips.find(s => s.payrollId === payrollId);
                                        if (slip) {
                                          handleViewSalarySlip(slip);
                                        } else {
                                          handleGenerateSalarySlip(payrollId);
                                        }
                                      }}>
                                        {salarySlips.find(s => s.payrollId === getItemId(record)) ? "View Slip" : "Generate Slip"}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollTab;