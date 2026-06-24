import { useState, useEffect } from "react";
import { useRole } from "@/context/RoleContext";
import EmployeesTab from "./EmployeesTab";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

// Define filter parameters type
interface FilterParams {
  siteName?: string | string[];
  reportingManager?: string;
  supervisorId?: string;
  department?: string;
  status?: string;
  search?: string;
  [key: string]: unknown; // for any extra fields
}

const EmployeeManagementWrapper = () => {
  const { user, role } = useRole();
  const [filterParams, setFilterParams] = useState<FilterParams>({});
  const [loading, setLoading] = useState(true);
  const [initialSite, setInitialSite] = useState("");
  const [allowImport, setAllowImport] = useState(false);
  const [allowExport, setAllowExport] = useState(false);

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

  if (loading) return <div className="p-8 text-center">Loading employees...</div>;

  // Explicitly typed fetch function
  const customFetch = async (params: Record<string, unknown>) => {
    const finalParams = { ...params, ...filterParams };
    const response = await axios.get(`${API_URL}/employees`, { params: finalParams });
    return response.data;
  };

  return (
    <EmployeesTab
      customFetch={customFetch}
      initialSiteFilter={initialSite}
      allowImport={allowImport}
      allowExport={allowExport}
    />
  );
};

export default EmployeeManagementWrapper;