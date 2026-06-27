// src/components/hrms/HRMS.tsx
import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { DashboardSidebar } from "@/components/shared/DashboardSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { 
  Users, UserPlus, Calendar, Clock, FileText, TrendingUp, 
  BarChart3, ChevronDown, ChevronUp, Menu, Building, 
  Briefcase, DollarSign, AlertCircle, CheckCircle, UserCheck, UserX,
  PieChart, Download, Upload, Filter, Search, Eye, Edit, Trash2,
  Plus, X, ChevronLeft, ChevronRight, MoreVertical, Home, Shield,
  Car, Droplets, ShoppingCart, Settings, LogOut, Bell, Sun, Moon,
  Loader2, RefreshCw, Database
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import EmployeesTab from "../../components/shared/EmployeesTab";
import OnboardingTab from "./OnboardingTab";
import AttendanceTab from "./AttendanceTab";
import LeaveManagementTab from "./LeaveManagementTab";

import PayrollTab from "../superadmin/PayrollTab";  // ✅ Use this
import PerformanceTab from "./PerformanceTab";
import ReportsTab from "./ReportsTab";
import { 
  Employee, 
  LeaveRequest, 
  Attendance, 
  Payroll, 
  Performance, 
  Shift, 
  SalaryStructure, 
  SalarySlip 
} from "./types";
import { Deduction } from "@/services/DeductionService";

// Mobile Tab Selector Component
const MobileTabSelector = ({
  activeTab,
  onTabChange,
  tabs
}: {
  activeTab: string;
  onTabChange: (value: string) => void;
  tabs: { value: string; label: string; icon?: React.ReactNode }[];
}) => {
  const [open, setOpen] = useState(false);
  const currentTab = tabs.find(t => t.value === activeTab);

  return (
    <div className="lg:hidden mb-4">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-10 text-sm">
            <span className="flex items-center">
              {currentTab?.icon}
              <span className="ml-2">{currentTab?.label || 'Select Tab'}</span>
            </span>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[calc(100vw-2rem)] sm:w-[400px] rounded-xl">
          {tabs.map((tab) => (
            <DropdownMenuItem
              key={tab.value}
              onClick={() => {
                onTabChange(tab.value);
                setOpen(false);
              }}
              className={`cursor-pointer py-2.5 ${activeTab === tab.value ? "bg-blue-50 text-blue-600" : ""}`}
            >
              {tab.icon}
              <span className="ml-2">{tab.label}</span>
              {activeTab === tab.value && (
                <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-600">Active</Badge>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// Stats Card Component
const StatCard = ({ title, value, icon: Icon, color = "primary", subtitle }: any) => {
  const colorClasses: Record<string, string> = {
    primary: "text-blue-600 bg-blue-100",
    success: "text-green-600 bg-green-100",
    warning: "text-yellow-600 bg-yellow-100",
    danger: "text-red-600 bg-red-100",
    purple: "text-purple-600 bg-purple-100"
  };

  return (
    <Card className="border-0 shadow-sm rounded-lg">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-lg font-bold mt-1 truncate">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg flex-shrink-0 ml-2 ${colorClasses[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const HRMS = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
const [attendance, setAttendance] = useState<Attendance[]>([]);
const [payroll, setPayroll] = useState<Payroll[]>([]);
const [performance, setPerformance] = useState<Performance[]>([]);
const [shifts, setShifts] = useState<Shift[]>([]);
const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [activeTab, setActiveTab] = useState("employees");
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMenuClick = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const handleMobileClose = () => {
    setMobileSidebarOpen(false);
  };

  // Calculate stats
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === "active").length;
  const pendingLeaves = leaveRequests.filter(l => l.status === "pending").length;
  const presentToday = attendance.filter(a => a.status === "present").length;
  const payrollPending = payroll.filter(p => p.status === "pending").length;
  const avgPerformance = (performance.reduce((sum, p) => sum + p.rating, 0) / performance.length).toFixed(1);

  // Define tabs for mobile selector
  const tabs = [
    { value: "employees", label: "Employees", icon: <Users className="h-4 w-4" /> },
    { value: "leave", label: "Leave", icon: <Clock className="h-4 w-4" /> },
    
    { value: "payroll", label: "Payroll", icon: <DollarSign className="h-4 w-4" /> },
   
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader 
        title={<span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">HRMS - Human Resource Management</span>}
        onMenuClick={handleMenuClick}
      />
      
      {/* Mobile Sidebar */}
      {mobileSidebarOpen && (
        <DashboardSidebar 
          mobileOpen={mobileSidebarOpen}
          onMobileClose={handleMobileClose}
        />
      )}
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6"
      >
        {/* Stats Cards - Responsive Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard title="Total Employees" value={totalEmployees} icon={Users} color="primary" subtitle="All staff members" />
          <StatCard title="Active" value={activeEmployees} icon={UserCheck} color="success" subtitle="Currently working" />
          <StatCard title="Pending Leaves" value={pendingLeaves} icon={Clock} color="warning" subtitle="Awaiting approval" />
          <StatCard title="Present Today" value={presentToday} icon={CheckCircle} color="success" subtitle="Today's attendance" />
          <StatCard title="Payroll Pending" value={payrollPending} icon={DollarSign} color="danger" subtitle="To be processed" />
          <StatCard title="Avg Rating" value={avgPerformance} icon={TrendingUp} color="purple" subtitle="Performance score" />
        </div>

        {/* Mobile Tab Selector */}
        <MobileTabSelector
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
        />

        {/* Desktop Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6 w-full">
          <TabsList className="hidden lg:flex w-full justify-start flex-wrap h-auto p-1 gap-1">
            <TabsTrigger value="employees" className="flex-1 min-w-[100px] text-sm py-2">
              <Users className="h-4 w-4 mr-2" /> Employees
            </TabsTrigger>
           
            <TabsTrigger value="leave" className="flex-1 min-w-[100px] text-sm py-2">
              <Clock className="h-4 w-4 mr-2" /> Leave
            </TabsTrigger>
            
            <TabsTrigger value="payroll" className="flex-1 min-w-[100px] text-sm py-2">
              <DollarSign className="h-4 w-4 mr-2" /> Payroll
            </TabsTrigger>
            
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