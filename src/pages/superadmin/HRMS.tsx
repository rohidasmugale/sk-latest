// frontend/src/components/hrms/HRMS.tsx
import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { DashboardSidebar } from "@/components/shared/DashboardSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import EmployeesTab from "@/components/shared/EmployeesTab";
import OnboardingTab from "./OnboardingTab";
import AttendanceTab from "./AttendanceTab";
import LeaveManagementTab from "./LeaveManagementTab";
import PayrollTab from "./PayrollTab";
import PerformanceTab from "./PerformanceTab";
import ReportsTab from "./ReportsTab";
import { useSearchParams } from "react-router-dom";
import { 
  LeaveRequest, 
  Attendance, 
  Payroll, 
  Performance, 
  Shift, 
  SalaryStructure, 
  SalarySlip 
} from "./types";
import { Deduction } from "@/services/DeductionService";
import employeeService from "@/services/employeeService";
import { Employee } from "@/types/employee";

const HRMS = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [activeTab, setActiveTab] = useState("employees");
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const handleMobileClose = () => {
    setMobileSidebarOpen(false);
  };

  // Fetch employees when component mounts
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🟡 Fetching employees...');
        const response = await employeeService.getEmployees();
        console.log('🟡 Employees response:', response);
        setEmployees(response.employees || []);
      } catch (err: any) {
        console.error('🔴 Failed to fetch employees:', err);
        setError(err.message || 'Failed to fetch employees');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  useEffect(() => {
    const addParam = searchParams.get("add");
    const tabParam = searchParams.get("tab");
    if (addParam === "true" && tabParam === "onboarding") {
      setActiveTab("onboarding");
      searchParams.delete("add");
      searchParams.delete("tab");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading employees...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-red-500 max-w-md">
          <p className="text-xl font-semibold">Error loading employees</p>
          <p className="mt-2 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="HRMS - Human Resource Management" 
        onMenuClick={handleMenuClick}
      />
      
      {mobileSidebarOpen && (
        <DashboardSidebar 
          mobileOpen={mobileSidebarOpen}
          onMobileClose={handleMobileClose}
        />
      )}
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto">
            <TabsTrigger value="employees" className="flex-1 min-w-[120px]">
              Employees ({employees.length})
            </TabsTrigger>
            <TabsTrigger value="leave" className="flex-1 min-w-[120px]">Leave Management</TabsTrigger>
            <TabsTrigger value="payroll" className="flex-1 min-w-[120px]">Payroll</TabsTrigger>
            <TabsTrigger value="reports" className="flex-1 min-w-[120px]">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <EmployeesTab
              employees={employees}
              setEmployees={setEmployees}
              setActiveTab={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="onboarding">
            <OnboardingTab
              employees={employees}
              setEmployees={setEmployees}
              salaryStructures={salaryStructures}
              setSalaryStructures={setSalaryStructures}
            />
          </TabsContent>

          <TabsContent value="attendance">
            <AttendanceTab
              attendance={attendance}
              setAttendance={setAttendance}
            />
          </TabsContent>

          <TabsContent value="leave">
            <LeaveManagementTab
              leaveRequests={leaveRequests}
              setLeaveRequests={setLeaveRequests}
            />
          </TabsContent>

          <TabsContent value="payroll">
            <PayrollTab
              employees={employees}
              payroll={payroll}
              setPayroll={setPayroll}
              salaryStructures={salaryStructures}
              setSalaryStructures={setSalaryStructures}
              salarySlips={salarySlips}
              setSalarySlips={setSalarySlips}
              attendance={attendance}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
            />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceTab
              performance={performance}
              setDeductions={setDeductions}
              setPerformance={setPerformance}
            />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsTab
              employees={employees}
              attendance={attendance}
              payroll={payroll}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default HRMS;