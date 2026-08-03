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
  Users, Clock, DollarSign, ChevronDown, ChevronUp, Building,
  Filter, Loader2, RefreshCw
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import EmployeesTab from "../../components/shared/EmployeesTab";
import OnboardingTab from "./OnboardingTab";
import AttendanceTab from "./AttendanceTab";
import LeaveManagementTab from "./LeaveManagementTab";
import PayrollTab from "../superadmin/PayrollTab";
import PerformanceTab from "./PerformanceTab";
import ReportsTab from "./ReportsTab";
import { 
  Employee, 
  LeaveRequest, 
  Attendance, 
  Payroll, 
  Performance, 
  SalaryStructure, 
  SalarySlip 
} from "./types";

// Site Service
import { siteService, Site as ServiceSite } from "@/services/SiteService";

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

// Site Filter Component
const SiteFilter = ({ 
  selectedSite, 
  onSiteChange, 
  sites, 
  isLoading = false 
}: { 
  selectedSite: string; 
  onSiteChange: (value: string) => void; 
  sites: ServiceSite[];
  isLoading?: boolean;
}) => {
  return (
    <div className="flex items-center gap-2">
      <Building className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedSite} onValueChange={onSiteChange} disabled={isLoading}>
        <SelectTrigger className="w-[180px] sm:w-[220px] h-9 text-sm">
          <SelectValue placeholder="All Sites" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">🏢 All Sites</SelectItem>
          {sites.map((site) => (
            <SelectItem key={site._id} value={site._id}>
              {site.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
};

const HRMS = () => {
  // Data state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState("employees");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Site state
  const [sites, setSites] = useState<ServiceSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch sites on mount
  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    setIsLoadingSites(true);
    try {
      const sitesData = await siteService.getAllSites();
      setSites(sitesData || []);
    } catch (error) {
      console.error("Failed to fetch sites:", error);
      toast.error("Failed to load sites");
    } finally {
      setIsLoadingSites(false);
    }
  };

  const handleMenuClick = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const handleMobileClose = () => {
    setMobileSidebarOpen(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSites();
    // Refresh other data here if needed
    setIsRefreshing(false);
  };

  // Filter data by selected site
  const filterBySite = <T extends { site?: string; siteName?: string }>(data: T[]): T[] => {
    if (selectedSite === "all") return data;
    return data.filter(item => 
      item.site === selectedSite || 
      item.siteName === selectedSite
    );
  };

  // Filtered data
  const filteredEmployees = filterBySite(employees);
  const filteredLeaveRequests = filterBySite(leaveRequests);
  const filteredAttendance = filterBySite(attendance);
  const filteredPayroll = filterBySite(payroll);
  const filteredPerformance = filterBySite(performance);

  // Calculate stats based on filtered data
  const totalEmployees = filteredEmployees.length;
  const activeEmployees = filteredEmployees.filter(e => e.status === "active").length;
  const pendingLeaves = filteredLeaveRequests.filter(l => l.status === "pending").length;
  const presentToday = filteredAttendance.filter(a => a.status === "present").length;
  const payrollPending = filteredPayroll.filter(p => p.status === "pending").length;
  const avgPerformance = filteredPerformance.length > 0 
    ? (filteredPerformance.reduce((sum, p) => sum + p.rating, 0) / filteredPerformance.length).toFixed(1)
    : "0.0";

  // Get site name for display
  const getSiteName = () => {
    if (selectedSite === "all") return "All Sites";
    const site = sites.find(s => s._id === selectedSite);
    return site ? site.name : "Unknown Site";
  };

  // Define tabs for mobile selector
  const tabs = [
    { value: "employees", label: "Employees", icon: <Users className="h-4 w-4" /> },
    { value: "leave", label: "Leave", icon: <Clock className="h-4 w-4" /> },
    { value: "payroll", label: "Payroll", icon: <DollarSign className="h-4 w-4" /> },
  ];

  // Get site ID for props (convert 'all' to undefined or handle in child components)
  const siteIdForProps = selectedSite === "all" ? undefined : selectedSite;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader 
        title={<span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">HRMS - Human Resource Management</span>}
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
        className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6"
      >
        {/* Site Filter & Stats Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SiteFilter 
              selectedSite={selectedSite}
              onSiteChange={setSelectedSite}
              sites={sites}
              isLoading={isLoadingSites}
            />
            <span className="text-xs text-muted-foreground">
              {selectedSite !== "all" && `Showing: ${getSiteName()}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards - Site-wise */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <StatCard 
            title="Total Employees" 
            value={totalEmployees} 
            icon={Users} 
            color="primary"
            subtitle={`Active: ${activeEmployees}`}
          />
          <StatCard 
            title="Present Today" 
            value={presentToday} 
            icon={Clock} 
            color="success"
          />
          <StatCard 
            title="Pending Leaves" 
            value={pendingLeaves} 
            icon={Clock} 
            color="warning"
          />
          <StatCard 
            title="Payroll Pending" 
            value={payrollPending} 
            icon={DollarSign} 
            color="danger"
          />
          <StatCard 
            title="Avg Performance" 
            value={`${avgPerformance}%`} 
            icon={TrendingUp} 
            color="purple"
          />
          <StatCard 
            title="Site" 
            value={selectedSite === "all" ? "All" : sites.find(s => s._id === selectedSite)?.name || "N/A"} 
            icon={Building} 
            color="primary"
          />
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

          {/* Employees Tab - Pass site filter */}
          <TabsContent value="employees">
            <EmployeesTab
              employees={filteredEmployees}
              setEmployees={setEmployees}
              setActiveTab={setActiveTab}
              selectedSite={selectedSite}
              sites={sites}
            />
          </TabsContent>

          {/* Onboarding Tab */}
          <TabsContent value="onboarding">
            <OnboardingTab
              employees={filteredEmployees}
              setEmployees={setEmployees}
              salaryStructures={salaryStructures}
              setSalaryStructures={setSalaryStructures}
              selectedSite={selectedSite}
              sites={sites}
            />
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <AttendanceTab
              attendance={filteredAttendance}
              setAttendance={setAttendance}
              selectedSite={selectedSite}
              sites={sites}
            />
          </TabsContent>

          {/* Leave Tab */}
          <TabsContent value="leave">
            <LeaveManagementTab
              leaveRequests={filteredLeaveRequests}
              setLeaveRequests={setLeaveRequests}
              selectedSite={selectedSite}
              sites={sites}
            />
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll">
            <PayrollTab
              employees={filteredEmployees}
              payroll={filteredPayroll}
              setPayroll={setPayroll}
              salaryStructures={salaryStructures}
              setSalaryStructures={setSalaryStructures}
              salarySlips={salarySlips}
              setSalarySlips={setSalarySlips}
              attendance={filteredAttendance}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              selectedSite={selectedSite}
              sites={sites}
            />
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            <PerformanceTab
              performance={filteredPerformance}
              setDeductions={() => {}} 
              setPerformance={setPerformance}
              selectedSite={selectedSite}
              sites={sites}
            />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <ReportsTab
              employees={filteredEmployees}
              attendance={filteredAttendance}
              payroll={filteredPayroll}
              selectedSite={selectedSite}
              sites={sites}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default HRMS;