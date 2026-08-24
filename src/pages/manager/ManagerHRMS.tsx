// src/pages/ManagerHRMS/ManagerHRMS.tsx
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

const ManagerHRMS = () => {
    const { user } = useRole();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [allSites, setAllSites] = useState<Site[]>([]);
    const [selectedSite, setSelectedSite] = useState<string>("all");
    const [fetchAttempted, setFetchAttempted] = useState(false);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            setError(null);
            setFetchAttempted(true);

            console.log('🟡 Fetching employees for Manager HRMS...');
            const response = await employeeService.getEmployees();
            console.log('🟡 Full response:', response);

            // Try different ways to extract employees
            let allEmployees = [];
            if (response?.employees) {
                allEmployees = response.employees;
            } else if (response?.data) {
                allEmployees = response.data;
            } else if (Array.isArray(response)) {
                allEmployees = response;
            } else {
                allEmployees = [];
            }

            console.log('🟡 Extracted employees:', allEmployees.length);
            setEmployees(allEmployees);

            // Extract unique site names from employees
            const siteNames = Array.from(
                new Set(allEmployees.map((emp: any) => emp.siteName || emp.site).filter(Boolean))
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
            }

            console.log(`✅ Loaded ${allEmployees.length} employees from ${sitesFromEmployees.length} sites`);
        } catch (err: any) {
            console.error('🔴 Failed to fetch employees:', err);
            setError(err.message || 'Failed to fetch employees');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    // Filter employees by selected site
    const filteredEmployees = employees.filter(emp => {
        if (selectedSite === "all") return true;
        const empSite = emp.siteName || emp.site || '';
        return empSite === selectedSite;
    });

    console.log('🔍 Filtered employees:', filteredEmployees.length);

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
                title="HRMS - Employee Management"
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
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white text-sm min-w-[180px]"
                        >
                            <option value="all">🏢 All Sites</option>
                            {allSites.map((site) => (
                                <option key={site._id} value={site._id}>
                                    {site.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        Showing {filteredEmployees.length} employees
                        {selectedSite !== 'all' && ` at ${allSites.find(s => s._id === selectedSite)?.name}`}
                    </span>
                </div>

                {/* Employees Tab - Pass employees directly */}
                <EmployeesTab
                    employees={filteredEmployees}
                    setEmployees={setEmployees}
                    setActiveTab={() => { }}
                    selectedSite={selectedSite}
                    sites={allSites}
                    skipFetch={true}  // This tells EmployeesTab NOT to fetch its own data
                />
            </motion.div>
        </div>
    );
};

export default ManagerHRMS;