// src/components/hrms/tabs/ReportsTab.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  Calendar, 
  FileText, 
  Users, 
  IndianRupee, 
  Loader2, 
  RefreshCw, 
  AlertTriangle,
  TrendingUp,
  BarChart3,
  PieChart,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  ChevronRight,
  Eye,
  Printer,
  FileSpreadsheet,
  Database,
  ShieldAlert,
  Activity
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import axios from "axios";

// API Services
import { payrollApi } from "@/services/payrollApi";

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
  salary: number;
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
  providentFund?: number;
  professionalTax?: number;
  permanentAddress?: string;
  localAddress?: string;
  documents?: Array<{
    type: string;
    expiryDate: string;
    status: string;
  }>;
}

interface Attendance {
  employeeId: string;
  date: string;
  status: "present" | "absent" | "half-day" | "late";
  checkIn?: string;
  checkOut?: string;
  overtimeHours?: number;
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
  status: "pending" | "processed" | "paid" | "hold" | "part-paid";
  paymentDate?: string;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaves: number;
  paidAmount: number;
  paymentStatus: "pending" | "paid" | "hold" | "part-paid";
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

interface ReportsTabProps {
  employees: Employee[];
  attendance: Attendance[];
  selectedMonth?: string;
}

interface PayrollSummary {
  total: number;
  processed: number;
  pending: number;
  paid: number;
  hold: number;
  partPaid: number;
  totalAmount: number;
}

interface EmployeeCounts {
  total: number;
  active: number;
  left: number;
  departments: {
    [key: string]: number;
  };
}

interface APIAttendance {
  _id?: string;
  id?: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  status: string;
  checkIn?: string;
  checkOut?: string;
  overtimeHours?: number;
  department?: string;
  hoursWorked?: number;
  remarks?: string;
}
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

const ReportsTab = ({ employees, attendance, selectedMonth = new Date().toISOString().slice(0, 7) }: ReportsTabProps) => {
  // State for payroll data
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary>({
    total: 0,
    processed: 0,
    pending: 0,
    paid: 0,
    hold: 0,
    partPaid: 0,
    totalAmount: 0
  });

  // State for API fetched data
  const [attendanceData, setAttendanceData] = useState<APIAttendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  
  const [employeeCounts, setEmployeeCounts] = useState<EmployeeCounts>({
    total: 0,
    active: 0,
    left: 0,
    departments: {}
  });
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch all data
  useEffect(() => {
    fetchPayrollData();
    fetchAttendanceData();
    fetchEmployeeCounts();
  }, [selectedMonth]);

  // Fetch attendance data from API
  const fetchAttendanceData = async () => {
    try {
      setAttendanceLoading(true);
      setAttendanceError(null);
      
      const response = await axios.get(`${API_URL}/attendance`);
      
      if (response.data && response.data.success) {
        const apiData = response.data.data || response.data.attendance || [];
        
        if (!Array.isArray(apiData)) {
          console.error("API data is not an array:", apiData);
          setAttendanceError("Invalid data format received from server");
          setAttendanceData([]);
          return;
        }
        
        // Transform API data
        const transformedAttendance = apiData.map((att: any) => ({
          id: att._id || att.id || `att_${Date.now()}_${Math.random()}`,
          employeeId: att.employeeId || att.employeeID || "",
          employeeName: att.employeeName || att.name || "",
          date: att.date || new Date().toISOString().split('T')[0],
          checkIn: att.checkIn || att.checkInTime || "",
          checkOut: att.checkOut || att.checkOutTime || "",
          status: att.status || "present",
          department: att.department || "",
          hoursWorked: att.hoursWorked || 0,
          overtimeHours: att.overtimeHours || 0,
          remarks: att.remarks || ""
        }));
        
        setAttendanceData(transformedAttendance);
      } else {
        const errorMsg = response.data?.message || "Failed to fetch attendance data";
        setAttendanceError(errorMsg);
        console.error("API Error:", errorMsg);
      }
    } catch (err: any) {
      console.error("Error fetching attendance data:", err);
      const errorMsg = err.response?.data?.message || err.message || "Network error occurred";
      setAttendanceError(errorMsg);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Fetch payroll data for the selected month
  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      
      // Fetch payroll records for the selected month
      const response = await payrollApi.getAll({
        month: selectedMonth,
        limit: 1000 // Fetch all records for the month
      });

      console.log("Payroll API Response:", response);

      if (response.success && response.data) {
        const payrollData = Array.isArray(response.data) ? response.data : [];
        setPayroll(payrollData);
        
        // Calculate counts and total amount
        const counts = {
          total: payrollData.length,
          processed: payrollData.filter(p => p.status === "processed").length,
          pending: payrollData.filter(p => p.status === "pending").length,
          paid: payrollData.filter(p => p.status === "paid").length,
          hold: payrollData.filter(p => p.status === "hold").length,
          partPaid: payrollData.filter(p => p.status === "part-paid").length,
          totalAmount: payrollData.reduce((sum, p) => sum + (p.netSalary || 0), 0)
        };

        console.log("Payroll Summary Calculated:", counts);
        setPayrollSummary(counts);
      } else {
        console.error("Failed to fetch payroll data:", response.message);
        toast.error("Failed to fetch payroll data");
        setPayroll([]);
        setPayrollSummary({
          total: 0,
          processed: 0,
          pending: 0,
          paid: 0,
          hold: 0,
          partPaid: 0,
          totalAmount: 0
        });
      }
    } catch (error: any) {
      console.error("Error fetching payroll data:", error);
      toast.error(error.message || "Error fetching payroll data");
      setPayroll([]);
      setPayrollSummary({
        total: 0,
        processed: 0,
        pending: 0,
        paid: 0,
        hold: 0,
        partPaid: 0,
        totalAmount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch employee counts from API
  const fetchEmployeeCounts = async () => {
    try {
      setEmployeesLoading(true);
      setEmployeesError(null);
      
      // Fetch all employees to calculate counts
      const response = await axios.get(`${API_URL}/employees`);
      
      console.log("Employees API Response for counts:", response.data);
      
      if (response.data && response.data.success) {
        const employeesData = response.data.data || response.data.employees || [];
        
        if (!Array.isArray(employeesData)) {
          console.error("Employees data is not an array:", employeesData);
          setEmployeesError("Invalid employees data format");
          return;
        }
        
        // Calculate counts
        const total = employeesData.length;
        const active = employeesData.filter((emp: any) => emp.status === "active").length;
        const left = employeesData.filter((emp: any) => emp.status === "left").length;
        
        // Calculate department-wise counts
        const departments: { [key: string]: number } = {};
        employeesData.forEach((emp: any) => {
          const dept = emp.department || "Unknown";
          departments[dept] = (departments[dept] || 0) + 1;
        });
        
        setEmployeeCounts({
          total,
          active,
          left,
          departments
        });
        
        console.log("Calculated employee counts:", {
          total,
          active,
          left,
          departments
        });
      } else {
        const errorMsg = response.data?.message || "Failed to fetch employee data";
        setEmployeesError(errorMsg);
        console.error("Employees API Error:", errorMsg);
        
        // Fallback: calculate from props if available
        if (employees && Array.isArray(employees)) {
          const total = employees.length;
          const active = employees.filter(emp => emp.status === "active").length;
          const left = employees.filter(emp => emp.status === "left").length;
          const departments: { [key: string]: number } = {};
          
          employees.forEach(emp => {
            const dept = emp.department || "Unknown";
            departments[dept] = (departments[dept] || 0) + 1;
          });
          
          setEmployeeCounts({
            total,
            active,
            left,
            departments
          });
        }
      }
    } catch (err: any) {
      console.error("Error fetching employee counts:", err);
      const errorMsg = err.response?.data?.message || err.message || "Network error occurred";
      setEmployeesError(errorMsg);
      
      // Fallback: calculate from props
      if (employees && Array.isArray(employees)) {
        const total = employees.length;
        const active = employees.filter(emp => emp.status === "active").length;
        const left = employees.filter(emp => emp.status === "left").length;
        const departments: { [key: string]: number } = {};
        
        employees.forEach(emp => {
          const dept = emp.department || "Unknown";
          departments[dept] = (departments[dept] || 0) + 1;
        });
        
        setEmployeeCounts({
          total,
          active,
          left,
          departments
        });
      }
    } finally {
      setEmployeesLoading(false);
    }
  };

  // Calculate attendance summary from actual data
  const calculateAttendanceSummary = (attendance: APIAttendance[]) => {
    if (!attendance || !Array.isArray(attendance) || attendance.length === 0) {
      return {
        present: 0,
        absent: 0,
        late: 0,
        halfDay: 0,
        total: 0
      };
    }

    const presentCount = attendance.filter(a => a.status?.toLowerCase() === "present").length;
    const absentCount = attendance.filter(a => a.status?.toLowerCase() === "absent").length;
    const lateCount = attendance.filter(a => a.status?.toLowerCase() === "late").length;
    const halfDayCount = attendance.filter(a => a.status?.toLowerCase() === "half-day").length;
    const totalCount = attendance.length;

    return {
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      halfDay: halfDayCount,
      total: totalCount
    };
  };

  const attendanceSummary = calculateAttendanceSummary(attendanceData);

  // Document expiry report
  const documentExpiryReport = employees.flatMap(emp =>
    emp.documents?.map(doc => ({
      employee: emp.name,
      document: doc.type,
      expiryDate: doc.expiryDate,
      status: doc.status
    })) || []
  );

  // Helper function to export data as CSV
  const exportToCSV = (data: any[], headers: string[], fileName: string) => {
    try {
      if (!data || data.length === 0) {
        toast.error(`No data to export for ${fileName}`);
        return;
      }

      // Prepare CSV content
      const csvRows = [
        headers.join(","),
        ...data.map(row => {
          const values = headers.map(header => {
            // Handle nested properties
            const value = header.includes('.') 
              ? header.split('.').reduce((obj, key) => obj?.[key], row)
              : row[header] || "";
            
            // Format the value for CSV
            const stringValue = String(value);
            // Escape quotes and wrap in quotes if contains comma, newline, or quotes
            if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          });
          return values.join(",");
        })
      ];

      const csvContent = csvRows.join("\n");
      
      // Create and download file
      const blob = new Blob([csvContent], { 
        type: "text/csv;charset=utf-8;" 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${fileName}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${data.length} records to ${fileName}.csv`);
      
    } catch (err: any) {
      console.error(`Error exporting ${fileName}:`, err);
      toast.error(`Failed to export ${fileName}`);
    }
  };

  // Export employees
  const handleExportEmployees = () => {
    const headers = [
      "Employee ID",
      "Name",
      "Email",
      "Phone",
      "Department",
      "Position",
      "Salary",
      "Status",
      "Date of Joining",
      "Gender",
      "Aadhar Number",
      "PAN Number"
    ];

    const data = employees.map(emp => ({
      "Employee ID": emp.employeeId,
      "Name": emp.name,
      "Email": emp.email || "",
      "Phone": emp.phone || "",
      "Department": emp.department,
      "Position": emp.position,
      "Salary": emp.salary,
      "Status": emp.status,
      "Date of Joining": emp.dateOfJoining || "",
      "Gender": emp.gender || "",
      "Aadhar Number": emp.aadharNumber || "",
      "PAN Number": emp.panNumber || ""
    }));

    exportToCSV(data, headers, "employees");
  };

  // Export attendance
  const handleExportAttendance = () => {
    if (!attendanceData || attendanceData.length === 0) {
      toast.error("No attendance data to export");
      return;
    }

    const headers = [
      "Date",
      "Employee ID",
      "Employee Name",
      "Department",
      "Status",
      "Check In",
      "Check Out",
      "Hours Worked",
      "Overtime Hours",
      "Remarks"
    ];

    exportToCSV(attendanceData, headers, "attendance");
  };

  // Export payroll
  const handleExportPayroll = () => {
    if (!payroll || payroll.length === 0) {
      toast.error("No payroll data to export");
      return;
    }

    const headers = [
      "Employee ID",
      "Month",
      "Basic Salary",
      "Allowances",
      "Deductions",
      "Net Salary",
      "Status",
      "Present Days",
      "Absent Days",
      "Leaves",
      "Overtime Hours",
      "Payment Date"
    ];

    const data = payroll.map(p => ({
      "Employee ID": p.employeeId,
      "Month": p.month,
      "Basic Salary": p.basicSalary,
      "Allowances": p.allowances,
      "Deductions": p.deductions,
      "Net Salary": p.netSalary,
      "Status": p.status,
      "Present Days": p.presentDays,
      "Absent Days": p.absentDays,
      "Leaves": p.leaves,
      "Overtime Hours": p.overtimeHours || 0,
      "Payment Date": p.paymentDate || ""
    }));

    exportToCSV(data, headers, "payroll");
  };

  // Export all reports
  const handleExportAllReports = () => {
    try {
      // Create a zip file with all reports
      const reports = [
        { name: "employees", data: employees, headers: ["Employee ID", "Name", "Department", "Position", "Status"] },
        { name: "attendance", data: attendanceData, headers: ["Date", "Employee ID", "Employee Name", "Status", "Hours Worked"] },
        { name: "payroll", data: payroll, headers: ["Employee ID", "Month", "Net Salary", "Status", "Payment Date"] }
      ];

      let allExportsCompleted = 0;
      const totalExports = reports.filter(r => r.data && r.data.length > 0).length;

      if (totalExports === 0) {
        toast.error("No data available to export");
        return;
      }

      reports.forEach(report => {
        if (report.data && report.data.length > 0) {
          setTimeout(() => {
            exportToCSV(report.data, report.headers, report.name);
            allExportsCompleted++;
            
            if (allExportsCompleted === totalExports) {
              toast.success("All reports exported successfully!");
            }
          }, allExportsCompleted * 100); // Stagger exports slightly
        }
      });

    } catch (err: any) {
      console.error("Error exporting all reports:", err);
      toast.error("Failed to export all reports");
    }
  };

  // Export document expiry report
  const handleExportDocuments = () => {
    if (documentExpiryReport.length === 0) {
      toast.error("No document data to export");
      return;
    }

    const headers = ["Employee", "Document Type", "Expiry Date", "Status"];
    exportToCSV(documentExpiryReport, headers, "document_expiry");
  };

  // Refresh all data
  const handleRefreshAll = () => {
    fetchPayrollData();
    fetchAttendanceData();
    fetchEmployeeCounts();
  };

  // New: Calculate department distribution for visualization
  const getDepartmentDistribution = () => {
    return Object.entries(employeeCounts.departments)
      .map(([name, count]) => ({
        name,
        count,
        percentage: employeeCounts.total > 0 ? (count / employeeCounts.total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  };

  // New: Calculate attendance percentage
  const getAttendancePercentage = () => {
    if (attendanceSummary.total === 0) return 0;
    return (attendanceSummary.present / attendanceSummary.total) * 100;
  };

  // New: Calculate payroll completion percentage
  const getPayrollCompletionPercentage = () => {
    if (payrollSummary.total === 0) return 0;
    return ((payrollSummary.paid + payrollSummary.partPaid) / payrollSummary.total) * 100;
  };

  // New: Get recent payroll activities
  const getRecentPayrollActivities = () => {
    return payroll
      .sort((a, b) => new Date(b.updatedAt || "").getTime() - new Date(a.updatedAt || "").getTime())
      .slice(0, 5);
  };

  // New: Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "hold":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "part-paid":
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "valid": return "default";
      case "expired": return "destructive";
      case "expiring": return "secondary";
      default: return "outline";
    }
  };

  const formatMonth = (monthString: string) => {
    if (!monthString) return "Current Month";
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Reports Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive overview of your HR analytics for {formatMonth(selectedMonth)}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Database className="h-3 w-3" />
              {employeeCounts.total} Employees
            </Badge>
            <Badge variant="outline" className="gap-1">
              <IndianRupee className="h-3 w-3" />
              {formatCurrency(payrollSummary.totalAmount)}
            </Badge>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefreshAll}
            disabled={loading || attendanceLoading || employeesLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${(loading || attendanceLoading || employeesLoading) ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Error States */}
      {(attendanceError || employeesError) && (
        <div className="space-y-2">
          {attendanceError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-300">Attendance Data Error</p>
                    <p className="text-sm text-red-700 dark:text-red-400">{attendanceError}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={fetchAttendanceData}
                  disabled={attendanceLoading}
                >
                  {attendanceLoading ? "Retrying..." : "Retry"}
                </Button>
              </div>
            </div>
          )}
          {employeesError && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-300">Employee Data Error</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">{employeesError}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={fetchEmployeeCounts}
                  disabled={employeesLoading}
                >
                  {employeesLoading ? "Retrying..." : "Retry"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-2">
            <IndianRupee className="h-4 w-4" />
            Payroll
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <Calendar className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="employees" className="gap-2">
            <Users className="h-4 w-4" />
            Employees
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="text-muted-foreground">Total Employees</span>
                  <Users className="h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{employeeCounts.total}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-sm text-muted-foreground">
                    <span className="text-green-600 font-medium">{employeeCounts.active} active</span>
                    {" • "}
                    <span className="text-red-600">{employeeCounts.left} left</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {((employeeCounts.active / employeeCounts.total) * 100 || 0).toFixed(1)}% active
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="text-muted-foreground">Total Payroll</span>
                  <IndianRupee className="h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatCurrency(payrollSummary.totalAmount)}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-sm text-muted-foreground">
                    {payrollSummary.total} records
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getPayrollCompletionPercentage().toFixed(1)}% completed
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="text-muted-foreground">Attendance Rate</span>
                  <TrendingUp className="h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{getAttendancePercentage().toFixed(1)}%</div>
                <div className="mt-2 space-y-2">
                  <Progress value={getAttendancePercentage()} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{attendanceSummary.present} present</span>
                    <span>{attendanceSummary.absent} absent</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="text-muted-foreground">Departments</span>
                  <PieChart className="h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{Object.keys(employeeCounts.departments).length}</div>
                <div className="text-sm text-muted-foreground mt-2">
                  <div className="flex items-center justify-between">
                    <span>Largest department:</span>
                    <span className="font-medium">
                      {getDepartmentDistribution()[0]?.name || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Employees in largest:</span>
                    <span className="font-medium">
                      {getDepartmentDistribution()[0]?.count || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Charts Area */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Department Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Department Distribution</CardTitle>
                <CardDescription>Employee count per department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getDepartmentDistribution().map((dept) => (
                    <div key={dept.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-primary"></div>
                          <span className="font-medium">{dept.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{dept.count}</span>
                          <span className="text-sm text-muted-foreground">
                            ({dept.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <Progress value={dept.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payroll Status */}
            <Card>
              <CardHeader>
                <CardTitle>Payroll Status Overview</CardTitle>
                <CardDescription>Current month payroll distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: "Paid", value: payrollSummary.paid, color: "bg-green-500" },
                    { label: "Pending", value: payrollSummary.pending, color: "bg-yellow-500" },
                    { label: "Hold", value: payrollSummary.hold, color: "bg-red-500" },
                    { label: "Part Paid", value: payrollSummary.partPaid, color: "bg-orange-500" },
                    { label: "Processed", value: payrollSummary.processed, color: "bg-blue-500" },
                  ].map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${item.color}`}></div>
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <span className="font-bold">{item.value}</span>
                      </div>
                      <Progress 
                        value={(item.value / payrollSummary.total) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Payroll Activities</CardTitle>
              <CardDescription>Latest payroll updates and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getRecentPayrollActivities().map((payroll) => (
                  <div key={payroll._id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(payroll.status)}
                      <div>
                        <p className="font-medium">{payroll.employeeId}</p>
                        <p className="text-sm text-muted-foreground">
                          {payroll.month} • {formatCurrency(payroll.netSalary)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={
                        payroll.status === "paid" ? "bg-green-50 text-green-700" :
                        payroll.status === "pending" ? "bg-yellow-50 text-yellow-700" :
                        payroll.status === "hold" ? "bg-red-50 text-red-700" :
                        "bg-gray-50 text-gray-700"
                      }>
                        {payroll.status}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payroll Details</CardTitle>
                    <CardDescription>{formatMonth(selectedMonth)} payroll records</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleExportPayroll}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="grid grid-cols-4 p-4 font-medium border-b">
                    <div>Employee ID</div>
                    <div>Name</div>
                    <div>Net Salary</div>
                    <div>Status</div>
                  </div>
                  {payroll.slice(0, 8).map((p) => (
                    <div key={p._id} className="grid grid-cols-4 p-4 border-b hover:bg-muted/50">
                      <div className="font-medium">{p.employeeId}</div>
                      <div>{p.employee?.name || "N/A"}</div>
                      <div className="font-bold">{formatCurrency(p.netSalary)}</div>
                      <div>
                        <Badge variant="outline" className={
                          p.status === "paid" ? "bg-green-50 text-green-700" :
                          p.status === "pending" ? "bg-yellow-50 text-yellow-700" :
                          p.status === "hold" ? "bg-red-50 text-red-700" :
                          "bg-gray-50 text-gray-700"
                        }>
                          {p.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payroll Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="text-2xl font-bold text-center mb-4">
                      {formatCurrency(payrollSummary.totalAmount)}
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Records</span>
                        <span className="font-medium">{payrollSummary.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Processed</span>
                        <Badge variant="secondary">{payrollSummary.processed}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Paid</span>
                        <Badge className="bg-green-100 text-green-800">{payrollSummary.paid}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pending</span>
                        <Badge className="bg-yellow-100 text-yellow-800">{payrollSummary.pending}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hold</span>
                        <Badge className="bg-red-100 text-red-800">{payrollSummary.hold}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Part Paid</span>
                        <Badge className="bg-orange-100 text-orange-800">{payrollSummary.partPaid}</Badge>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleExportAllReports}>
                    <Download className="h-4 w-4 mr-2" />
                    Export All Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Summary</CardTitle>
                <CardDescription>Monthly attendance overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Attendance Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{attendanceSummary.present}</div>
                      <div className="text-sm text-muted-foreground">Present</div>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{attendanceSummary.absent}</div>
                      <div className="text-sm text-muted-foreground">Absent</div>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">{attendanceSummary.late}</div>
                      <div className="text-sm text-muted-foreground">Late</div>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{attendanceSummary.halfDay}</div>
                      <div className="text-sm text-muted-foreground">Half Day</div>
                    </div>
                  </div>

                  {/* Attendance Percentage */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Attendance Rate</span>
                      <span className="text-2xl font-bold">{getAttendancePercentage().toFixed(1)}%</span>
                    </div>
                    <Progress value={getAttendancePercentage()} className="h-3" />
                  </div>

                  <Button variant="outline" onClick={handleExportAttendance} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Attendance Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance</CardTitle>
                <CardDescription>Latest attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attendanceData.slice(0, 6).map((record, index) => (
                    <div key={record.id || index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${
                          record.status === "present" ? "bg-green-500" :
                          record.status === "absent" ? "bg-red-500" :
                          record.status === "late" ? "bg-yellow-500" :
                          "bg-blue-500"
                        }`}></div>
                        <div>
                          <p className="font-medium">{record.employeeName || record.employeeId}</p>
                          <p className="text-sm text-muted-foreground">
                            {record.date} • {record.department || "N/A"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {record.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Employee Statistics</CardTitle>
                <CardDescription>Department-wise distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getDepartmentDistribution().map((dept) => (
                    <div key={dept.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{dept.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {dept.count} employees
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{dept.percentage.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">of total</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Document Expiry</CardTitle>
                    <CardDescription>Expiring documents in the next 90 days</CardDescription>
                  </div>
                  <ShieldAlert className="h-5 w-5 text-yellow-500" />
                </div>
              </CardHeader>
              <CardContent>
                {documentExpiryReport.length > 0 ? (
                  <div className="space-y-4">
                    {documentExpiryReport.slice(0, 5).map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{doc.employee}</p>
                          <p className="text-sm text-muted-foreground">{doc.document}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{doc.expiryDate}</p>
                          <Badge variant={getStatusColor(doc.status)}>
                            {doc.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" onClick={handleExportDocuments} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Export Document Report
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No document expiry data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions Footer */}
      <div className="sticky bottom-4 flex justify-center">
        <Card className="shadow-lg border-primary/20 max-w-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-medium">Quick Actions</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleExportEmployees} title="Export Employees">
                  <Users className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportPayroll} title="Export Payroll">
                  <FileText className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportAttendance} title="Export Attendance">
                  <Calendar className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handleExportAllReports} title="Export All Reports">
                  <Database className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsTab;