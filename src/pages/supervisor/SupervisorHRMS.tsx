import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { DashboardSidebar } from "@/components/shared/DashboardSidebar";
import { motion } from "framer-motion";
import EmployeesTab from "@/components/shared/EmployeesTab";
import { Building, Loader2, Users } from "lucide-react";
import { useRole } from "@/context/RoleContext";
import employeeService from "@/services/employeeService";
import { Employee } from "@/types/employee";
import { Site } from "@/services/SiteService";

const SupervisorHRMS = () => {
  const { user } = useRole();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [isLoadingSites, setIsLoadingSites] = useState(false);

  // Resolve site name from ID
  const resolveSiteName = (siteId: string): string | undefined => {
    if (siteId === 'all') return undefined;
    const site = allSites.find(s => s._id === siteId);
    return site?.name;
  };

  const getSiteDisplayName = () => {
    if (selectedSite === 'all') return 'All My Sites';
    const site = allSites.find(s => s._id === selectedSite);
    return site ? site.name : 'Unknown Site';
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await employeeService.getSupervisorEmployees();

      // ✅ Correctly extract the employees array
      // The API returns { success: true, data: [...] }
      const supervisorEmployees = response?.data || [];
      // If response is the raw axios response, use response.data.data
      // But based on your logs, response is already the parsed object.

      console.log('🔍 Extracted employees:', supervisorEmployees.length);
      setEmployees(supervisorEmployees);

      // Build sites from employees' siteName
      const siteNames = Array.from(
        new Set(supervisorEmployees.map((emp: any) => emp.siteName).filter(Boolean))
      );
      const sitesFromEmployees = siteNames.map((name) => ({
        _id: name as string,
        name: name as string,
        clientName: '',
        location: '',
        areaSqft: 0,
        services: [],
        staffDeployment: [],
        contractValue: 0,
        contractEndDate: '',
        status: 'active' as const,
      }));
      setAllSites(sitesFromEmployees);

      if (sitesFromEmployees.length > 0) {
        setSelectedSite(sitesFromEmployees[0]._id);
      } else {
        setSelectedSite('all');
      }

      console.log(`✅ Loaded ${supervisorEmployees.length} employees from ${sitesFromEmployees.length} sites`);
    } catch (err: any) {
      console.error('🔴 Failed to fetch supervisor employees:', err);
      setError(err.message || 'Failed to fetch your team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Filter employees client-side (if the user picks a different site from dropdown)
  const filteredEmployees = employees.filter(emp => {
    if (selectedSite === "all") return true;
    const resolvedName = resolveSiteName(selectedSite);
    const empSite = emp.siteName || '';
    return empSite === selectedSite || empSite === resolvedName;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your team...</p>
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
        title="HRMS - My Team"
        onMenuClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />
      {mobileSidebarOpen && (
        <DashboardSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        {/* Site Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-gray-500" />
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              disabled={isLoadingSites || allSites.length === 0}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white text-sm min-w-[180px]"
            >
              <option value="all">🏢 All My Sites</option>
              {allSites.map((site) => (
                <option key={site._id} value={site._id}>
                  {site.name}
                </option>
              ))}
            </select>
            {isLoadingSites && (
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {allSites.length === 0
              ? "No sites assigned yet"
              : selectedSite !== 'all'
                ? `Showing: ${getSiteDisplayName()}`
                : `Showing all ${allSites.length} sites`}
          </span>
        </div>

        {/* Employee List */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">
              Employees ({filteredEmployees.length})
              {selectedSite !== 'all' && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  at {getSiteDisplayName()}
                </span>
              )}
            </h2>
          </div>

          {/* ✅ Pass employees and setEmployees props so EmployeesTab doesn't re-fetch globally */}
          <EmployeesTab
            employees={filteredEmployees as any}
            setEmployees={setEmployees as any}
            setActiveTab={() => { }}
            selectedSite={selectedSite}
            sites={allSites}           // ← ADD THIS
            skipFetch={true}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default SupervisorHRMS;