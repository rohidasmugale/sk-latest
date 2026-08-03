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
import { siteService, Site } from "@/services/SiteService";
import { Building, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Site Filter Component
const SiteFilter: React.FC<{
  selectedSite: string;
  onSiteChange: (value: string) => void;
  sites: Site[];
  isLoading?: boolean;
}> = ({ selectedSite, onSiteChange, sites, isLoading = false }) => {
  return (
    <div className="flex items-center gap-2">
      <Building className="h-4 w-4 text-gray-500" />
      <select
        value={selectedSite}
        onChange={(e) => onSiteChange(e.target.value)}
        disabled={isLoading}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white text-sm min-w-[180px]"
      >
        <option value="all">🏢 All Sites</option>
        {sites.map((site) => (
          <option key={site._id} value={site._id}>
            {site.name}
          </option>
        ))}
      </select>
      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
    </div>
  );
};

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

  // Site state
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [isLoadingSites, setIsLoadingSites] = useState<boolean>(false);

  // Helper to resolve site ID to name
  const resolveSiteName = (siteId: string): string | undefined => {
    if (siteId === 'all') return undefined;
    const site = allSites.find(s => s._id === siteId);
    return site?.name;
  };

  // Get site name for display
  const getSiteDisplayName = () => {
    if (selectedSite === 'all') return 'All Sites';
    const site = allSites.find(s => s._id === selectedSite);
    return site ? site.name : 'Unknown Site';
  };

  // Fetch sites
  const fetchSites = async () => {
    try {
      setIsLoadingSites(true);
      const sitesData = await siteService.getAllSites();
      setAllSites(sitesData || []);
      console.log("✅ Loaded sites:", sitesData.length);
    } catch (error) {
      console.error("Error fetching sites:", error);
      setAllSites([]);
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

  // Filter employees by selected site
  const filteredEmployees = employees.filter(emp => {
    if (selectedSite === "all") return true;
    const resolvedName = resolveSiteName(selectedSite);
    return emp.site === selectedSite ||
      emp.siteName === selectedSite ||
      emp.siteId === selectedSite ||
      emp.site === resolvedName ||
      emp.siteName === resolvedName;
  });

  // Filter leave requests by site
  const filteredLeaveRequests = leaveRequests.filter(leave => {
    if (selectedSite === "all") return true;
    const resolvedName = resolveSiteName(selectedSite);
    return leave.site === selectedSite ||
      leave.siteName === selectedSite ||
      leave.siteId === selectedSite ||
      leave.site === resolvedName ||
      leave.siteName === resolvedName;
  });

  // Filter attendance by site
  const filteredAttendance = attendance.filter(att => {
    if (selectedSite === "all") return true;
    const resolvedName = resolveSiteName(selectedSite);
    return att.site === selectedSite ||
      att.siteName === selectedSite ||
      att.siteId === selectedSite ||
      att.site === resolvedName ||
      att.siteName === resolvedName;
  });

  // Filter payroll by site
  const filteredPayroll = payroll.filter(p => {
    if (selectedSite === "all") return true;
    const resolvedName = resolveSiteName(selectedSite);
    return p.site === selectedSite ||
      p.siteName === selectedSite ||
      p.siteId === selectedSite ||
      p.site === resolvedName ||
      p.siteName === resolvedName;
  });

  // Filter performance by site
  const filteredPerformance = performance.filter(p => {
    if (selectedSite === "all") return true;
    const resolvedName = resolveSiteName(selectedSite);
    return p.site === selectedSite ||
      p.siteName === selectedSite ||
      p.siteId === selectedSite ||
      p.site === resolvedName ||
      p.siteName === resolvedName;
  });

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
    fetchSites();
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
        className="p-6 space-y-6"
      >
        {/* Site Filter Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SiteFilter
            selectedSite={selectedSite}
            onSiteChange={setSelectedSite}
            sites={allSites}
            isLoading={isLoadingSites}
          />
          <span className="text-xs text-muted-foreground">
            {selectedSite !== 'all' && `Showing: ${getSiteDisplayName()}`}
          </span>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto">
            <TabsTrigger value="employees" className="flex-1 min-w-[120px]">
              Employees ({filteredEmployees.length})
            </TabsTrigger>
            <TabsTrigger value="leave" className="flex-1 min-w-[120px]">Leave Management</TabsTrigger>
            <TabsTrigger value="payroll" className="flex-1 min-w-[120px]">Payroll</TabsTrigger>
            <TabsTrigger value="reports" className="flex-1 min-w-[120px]">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <EmployeesTab
              employees={filteredEmployees}
              setEmployees={setEmployees}
              setActiveTab={setActiveTab}
              selectedSite={selectedSite}
              sites={allSites}
            />
          </TabsContent>

          <TabsContent value="onboarding">
            <OnboardingTab
              employees={filteredEmployees}
              setEmployees={setEmployees}
              salaryStructures={salaryStructures}
              setSalaryStructures={setSalaryStructures}
              selectedSite={selectedSite}
              sites={allSites}
            />
          </TabsContent>

          <TabsContent value="attendance">
            <AttendanceTab
              attendance={filteredAttendance}
              setAttendance={setAttendance}
              selectedSite={selectedSite}
              sites={allSites}
            />
          </TabsContent>

          <TabsContent value="leave">
            <LeaveManagementTab
              leaveRequests={filteredLeaveRequests}
              setLeaveRequests={setLeaveRequests}
              selectedSite={selectedSite}
              sites={allSites}
            />
          </TabsContent>

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
              sites={allSites}
            />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceTab
              performance={filteredPerformance}
              setDeductions={setDeductions}
              setPerformance={setPerformance}
              selectedSite={selectedSite}
              sites={allSites}
            />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsTab
              employees={filteredEmployees}
              attendance={filteredAttendance}
              payroll={filteredPayroll}
              selectedSite={selectedSite}
              sites={allSites}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default HRMS;