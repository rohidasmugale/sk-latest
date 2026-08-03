import { useState, useEffect } from "react";
import { useRole } from "@/context/RoleContext";
import EmployeesTab from "./EmployeesTab";
import axios from "axios";
import { siteService, Site as ServiceSite } from "@/services/SiteService";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building, ArrowLeft, Users } from "lucide-react";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5001/api" : "https://sk-backend-btbj.onrender.com/api");

interface FilterParams {
  siteName?: string | string[];
  reportingManager?: string;
  supervisorId?: string;
  department?: string;
  status?: string;
  search?: string;
  [key: string]: unknown;
}

const EmployeeManagementWrapper = () => {
  const { user, role } = useRole();
  const [filterParams, setFilterParams] = useState<FilterParams>({});
  const [loading, setLoading] = useState(true);
  const [initialSite, setInitialSite] = useState("");
  const [allowImport, setAllowImport] = useState(false);
  const [allowExport, setAllowExport] = useState(false);

  // Site-wise drill-down state
  const [realSites, setRealSites] = useState<ServiceSite[]>([]);
  const [showSiteDetails, setShowSiteDetails] = useState(false);
  const [selectedSiteForDetails, setSelectedSiteForDetails] = useState<ServiceSite | null>(null);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("sites");

  // Fetch real sites
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const sitesData = await siteService.getAllSites();
        setRealSites(sitesData || []);
      } catch (error) {
        console.error("Failed to fetch sites:", error);
        toast.error("Failed to load sites");
      }
    };
    fetchSites();
  }, []);

  // Handle site click
  const handleViewSiteDetails = (site: ServiceSite) => {
    setSelectedSiteForDetails(site);
    setShowSiteDetails(true);
    const params = new URLSearchParams(window.location.search);
    params.set("siteDetails", "true");
    params.set("selectedSiteId", site._id);
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  const handleBackFromSiteDetails = () => {
    setShowSiteDetails(false);
    setSelectedSiteForDetails(null);
    window.history.replaceState(null, "", window.location.pathname);
  };

  // Restore from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("siteDetails") === "true" && realSites.length > 0) {
      const site = realSites.find((s) => s._id === params.get("selectedSiteId"));
      if (site) {
        setSelectedSiteForDetails(site);
        setShowSiteDetails(true);
      }
    }
  }, [realSites]);

  // Existing logic
  useEffect(() => {
    const determineAccess = async () => {
      try {
        if (role === "superadmin") {
          setFilterParams({});
          setAllowImport(true);
          setAllowExport(true);
        } else if (role === "admin") {
          const assignedSites = user?.assignedSites || user?.sites || [];
          if (assignedSites.length > 0) {
            setFilterParams({ siteName: assignedSites });
            setInitialSite(assignedSites[0]);
          } else {
            setFilterParams({});
          }
          setAllowImport(true);
          setAllowExport(true);
        } else if (role === "manager") {
          const managerName = user?.name;
          if (managerName) setFilterParams({ reportingManager: managerName });
          else setFilterParams({ reportingManager: "____none____" });
        } else if (role === "supervisor") {
          const supervisorId = user?._id;
          if (supervisorId) setFilterParams({ supervisorId });
          else setFilterParams({ supervisorId: "____none____" });
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    determineAccess();
  }, [role, user]);

  // Fetch employees for site counts
  useEffect(() => {
    const fetchAllEmployees = async () => {
      try {
        const response = await axios.get(`${API_URL}/employees`, {
          params: { limit: 10000 },
        });
        if (response.data?.success) {
          setAllEmployees(response.data.data || response.data.employees || []);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    fetchAllEmployees();
  }, []);

  // Site Detail View
  if (showSiteDetails && selectedSiteForDetails) {
    const site = selectedSiteForDetails;
    const siteEmployees = allEmployees.filter(
      (emp: any) => emp.siteName === site.name || emp.site === site.name
    );
    const activeEmployees = siteEmployees.filter((emp: any) => emp.status === "active");
    const leftEmployees = siteEmployees.filter(
      (emp: any) => emp.status === "left" || emp.status === "inactive"
    );

    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" size="sm" onClick={handleBackFromSiteDetails}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Sites
          </Button>
          <div>
            <h1 className="text-xl font-bold">{site.name} — Employees</h1>
            <p className="text-xs text-muted-foreground">
              {siteEmployees.length} total employees
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{siteEmployees.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{activeEmployees.length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{leftEmployees.length}</p>
              <p className="text-xs text-muted-foreground">Left</p>
            </CardContent>
          </Card>
        </div>

        {/* Employees Table for this site */}
        <Card>
          <CardHeader>
            <CardTitle>Employees at {site.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {siteEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No employees at this site
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siteEmployees.map((emp: any) => (
                      <TableRow key={emp._id || emp.id}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell>{emp.employeeId || emp._id}</TableCell>
                        <TableCell>{emp.department}</TableCell>
                        <TableCell>{emp.position || emp.designation}</TableCell>
                        <TableCell>
                          <Badge
                            variant={emp.status === "active" ? "default" : "destructive"}
                          >
                            {emp.status || "Active"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center">Loading employees...</div>;

  // Explicitly typed fetch function
  const customFetch = async (params: Record<string, unknown>) => {
    const finalParams = { ...params, ...filterParams };
    const response = await axios.get(`${API_URL}/employees`, { params: finalParams });
    return response.data;
  };

  // Main view with Sites tab
  return (
    <div className="min-h-screen bg-gray-50">
      <Tabs
        defaultValue="sites"
        onValueChange={setActiveTab}
        className="w-full"
      >
        <div className="p-4 md:p-6">
          <TabsList className="mb-4">
            <TabsTrigger value="sites">
              <Building className="mr-2 h-4 w-4" />
              Sites ({realSites.length})
            </TabsTrigger>
            <TabsTrigger value="employees">
              <Users className="mr-2 h-4 w-4" />
              All Employees
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sites">
            <Card>
              <CardHeader>
                <CardTitle>Sites Overview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Click a site to view its employees
                </p>
              </CardHeader>
              <CardContent>
                {realSites.length === 0 ? (
                  <div className="text-center py-8">
                    <Building className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-muted-foreground">No sites found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {realSites.map((site) => {
                      const siteEmployees = allEmployees.filter(
                        (emp: any) =>
                          emp.siteName === site.name || emp.site === site.name
                      );
                      const activeCount = siteEmployees.filter(
                        (emp: any) => emp.status === "active"
                      ).length;

                      return (
                        <Card
                          key={site._id}
                          className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-400 group"
                          onClick={() => handleViewSiteDetails(site)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                <Building className="h-4 w-4 text-blue-600" />
                              </div>
                              <h3 className="font-semibold text-sm truncate">
                                {site.name}
                              </h3>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-center text-xs">
                              <div className="bg-blue-50 rounded-lg p-2">
                                <p className="font-bold text-blue-600 text-lg">
                                  {siteEmployees.length}
                                </p>
                                <p className="text-muted-foreground">Total</p>
                              </div>
                              <div className="bg-green-50 rounded-lg p-2">
                                <p className="font-bold text-green-600 text-lg">
                                  {activeCount}
                                </p>
                                <p className="text-muted-foreground">Active</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees">
            <EmployeesTab
              customFetch={customFetch}
              initialSiteFilter={initialSite}
              allowImport={allowImport}
              allowExport={allowExport}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default EmployeeManagementWrapper;