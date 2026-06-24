// src/components/hrms/tabs/DeductionListTab.tsx
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  IndianRupee,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Pagination from "./Pagination";

// Dialog Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// Service
import deductionService, {
  type Deduction,
  type Employee,
  type CreateDeductionRequest,
  type UpdateDeductionRequest,
  type DeductionStats,
  type PaginatedResponse,
} from "../../services/DeductionService";

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

interface DeductionListTabProps {
  // Optional props if you need to manage deductions from parent component
}

const DeductionListTab = ({}: DeductionListTabProps) => {
  // State
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [deductionPage, setDeductionPage] = useState(1);
  const [deductionItemsPerPage, setDeductionItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isAddingDeduction, setIsAddingDeduction] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<Deduction | null>(
    null
  );
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    deduction: Deduction | null;
  }>({ open: false, deduction: null });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalDeductionsCount, setTotalDeductionsCount] = useState(0);

  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [deductionStats, setDeductionStats] = useState<DeductionStats>({
    totalDeductions: 0,
    totalAdvances: 0,
    totalFines: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    completedCount: 0,
  });

  // Deduction form state
  const [deductionForm, setDeductionForm] = useState({
    employeeId: "",
    type: "advance" as "advance" | "fine" | "other",
    amount: "",
    description: "",
    deductionDate: new Date().toISOString().split("T")[0],
    status: "pending" as "pending" | "approved" | "rejected" | "completed",
    repaymentMonths: "",
    installmentAmount: "",
    fineAmount: "",
    appliedMonth: new Date().toISOString().slice(0, 7),
  });

  // Use refs to track mounted state
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Debug useEffect to track employees
  useEffect(() => {
    console.log("Employees state changed:", {
      count: employees.length,
      employees: employees.slice(0, 3) // First 3 for preview
    });
  }, [employees]);

  // Debug useEffect to track deductions
  useEffect(() => {
    console.log("Deductions state changed:", {
      count: deductions.length,
      totalCount: totalDeductionsCount,
      stats: deductionStats
    });
  }, [deductions, totalDeductionsCount, deductionStats]);

  // Debug useEffect to track filters
  useEffect(() => {
    console.log("Filters changed:", {
      searchTerm,
      statusFilter,
      typeFilter,
      page: deductionPage,
      itemsPerPage: deductionItemsPerPage
    });
  }, [searchTerm, statusFilter, typeFilter, deductionPage, deductionItemsPerPage]);

  const fetchDeductions = useCallback(
    async (forceRefresh = false) => {
      console.log("Fetching deductions...", {
        page: deductionPage,
        limit: deductionItemsPerPage,
        statusFilter,
        typeFilter,
        searchTerm,
      });

      setIsLoading(true);
      try {
        const params: any = {
          page: deductionPage,
          limit: deductionItemsPerPage,
        };

        if (statusFilter !== "all") params.status = statusFilter;
        if (typeFilter !== "all") params.type = typeFilter;
        if (searchTerm) params.search = searchTerm;

        console.log("API params:", params);

        // Direct API call with correct endpoint
        const response = await fetch(
          `${API_URL}/deductions/deductions?${new URLSearchParams(
            params
          ).toString()}`
        );

        if (!response.ok) {
          throw new Error(
            `API Error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log("API Response data:", data);

        if (!isMounted.current) return;

        if (data.success) {
          // Transform the data
          const transformedDeductions = data.data.map((deduction: any) => {
            const employeeDetails = deduction.employeeDetails || {};
            return {
              id: deduction._id,
              employeeId:
                deduction.employeeId || employeeDetails.employeeId || "",
              employeeName:
                deduction.employeeName || employeeDetails.name || "",
              employeeCode:
                deduction.employeeCode || employeeDetails.employeeId || "",
              type: deduction.type,
              amount: deduction.amount,
              description: deduction.description || "",
              deductionDate: deduction.deductionDate
                ? new Date(deduction.deductionDate).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
              status: deduction.status,
              repaymentMonths: deduction.repaymentMonths || 0,
              installmentAmount: deduction.installmentAmount || 0,
              fineAmount: deduction.fineAmount || 0,
              appliedMonth: deduction.appliedMonth,
              createdAt: deduction.createdAt,
              updatedAt: deduction.updatedAt,
            };
          });

          console.log("Transformed deductions:", transformedDeductions);

          setDeductions(transformedDeductions);
          
          // Use the pagination total from API
          const totalFromApi = data.pagination?.totalItems || 0;
          console.log("Total deductions from API:", totalFromApi);
          setTotalDeductionsCount(totalFromApi);
        } else {
          toast.error("Failed to fetch deductions", {
            description: data.message || "Please try again",
          });
        }
      } catch (error: any) {
        console.error("Error fetching deductions:", error);
        toast.error("Network Error", {
          description: "Unable to connect to the server.",
        });
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    },
    [deductionPage, deductionItemsPerPage, statusFilter, typeFilter, searchTerm]
  );

  const fetchEmployees = useCallback(async (forceRefresh = false) => {
    setIsLoadingEmployees(true);
    try {
      console.log("Fetching employees from API...");
      
      // Try just one reliable endpoint first
      const endpoint = `${API_URL}/employees`;
      console.log(`Using endpoint: ${endpoint}`);
      
      const response = await fetch(endpoint);
      
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`https Error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Employees API response structure:", data);

      if (!isMounted.current) return;

      if (data.success) {
        // Check various possible structures
        const employeesArray = data.data || data.employees || data.result || [];
        
        console.log("Employees array length:", employeesArray.length);
        
        if (!Array.isArray(employeesArray)) {
          console.error("Employees data is not an array:", employeesArray);
          toast.error("Data Format Error", {
            description: "Employees data is not in expected array format",
          });
          setEmployees([]);
          return;
        }

        // Transform employee data
        const transformedEmployees = employeesArray
          .filter((employee: any) => employee && (employee._id || employee.id)) // Filter out invalid entries
          .map((employee: any) => ({
            id: employee._id || employee.id || '',
            employeeId: employee.employeeId || employee.code || employee.empId || "",
            name: employee.name || employee.fullName || employee.employeeName || "",
            department: employee.department || employee.dept || "",
            status: employee.status || employee.empStatus || "active",
            designation: employee.designation || employee.position || employee.role || "",
            position: employee.position || employee.designation || employee.role || "",
            email: employee.email || employee.emailId || "",
            phone: employee.phone || employee.phoneNumber || employee.mobile || "",
            salary: employee.salary || employee.baseSalary || 0,
            joinDate: employee.dateOfJoining || employee.joiningDate || employee.startDate
              ? new Date(employee.dateOfJoining || employee.joiningDate || employee.startDate).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
          }));

        console.log(`Transformed ${transformedEmployees.length} employees`);
        setEmployees(transformedEmployees);
        
        // Show success message if employees found
        if (transformedEmployees.length > 0) {
          console.log("Employees loaded successfully");
        } else {
          console.warn("No employees found in response");
        }
      } else {
        console.error("API returned success=false:", data);
        toast.error("Failed to fetch employees", {
          description: data.message || data.error || "Please check API response",
        });
        setEmployees([]);
      }
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      
      // More specific error messages
      if (error.message.includes('Failed to fetch')) {
        toast.error("Connection Error", {
          description: "Unable to connect to the server. Please ensure:\n1. Backend is running on port 5001\n2. CORS is properly configured\n3. Network connection is stable",
        });
      } else if (error.message.includes('https Error')) {
        toast.error("Server Error", {
          description: `Server returned error: ${error.message}`,
        });
      } else {
        toast.error("API Error", {
          description: error.message || "Unable to fetch employees",
        });
      }
      setEmployees([]);
    } finally {
      if (isMounted.current) {
        setIsLoadingEmployees(false);
      }
    }
  }, []);

  // Fetch deduction statistics
  const fetchDeductionStats = useCallback(async () => {
    try {
      // Try to get stats from a dedicated API endpoint
      const response = await fetch(`${API_URL}/deductions/stats`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          console.log("Stats from API:", data.data);
          setDeductionStats(data.data);
          return;
        }
      }
      
      // Fallback: If no dedicated stats endpoint, fetch ALL deductions for stats
      console.log("Fetching all deductions for stats calculation...");
      const allDeductionsResponse = await fetch(
        `${API_URL}/deductions/deductions?limit=1000`
      );
      
      if (allDeductionsResponse.ok) {
        const allData = await allDeductionsResponse.json();
        
        if (allData.success && allData.data) {
          const stats = allData.data.reduce(
            (acc: any, deduction: any) => {
              if (!deduction) return acc;
              
              // Use the same calculation logic as in fetchDeductions
              acc.totalDeductions += deduction.amount || 0;
              
              if (deduction.type === "advance") {
                acc.totalAdvances += deduction.amount || 0;
              }
              
              if (deduction.type === "fine") {
                acc.totalFines += deduction.fineAmount || deduction.amount || 0;
              }
              
              // Count by status
              switch (deduction.status) {
                case "pending":
                  acc.pendingCount += 1;
                  break;
                case "approved":
                  acc.approvedCount += 1;
                  break;
                case "rejected":
                  acc.rejectedCount += 1;
                  break;
                case "completed":
                  acc.completedCount += 1;
                  break;
              }
              
              return acc;
            },
            {
              totalDeductions: 0,
              totalAdvances: 0,
              totalFines: 0,
              pendingCount: 0,
              approvedCount: 0,
              rejectedCount: 0,
              completedCount: 0,
            }
          );
          
          console.log("Calculated stats:", stats);
          setDeductionStats(stats);
        }
      } else {
        // Final fallback: Calculate from current deductions (limited)
        console.log("Using current deductions for stats (may be incomplete)");
        const localStats = deductions.reduce(
          (acc, deduction) => {
            if (!deduction) return acc;
            acc.totalDeductions += deduction.amount || 0;
            if (deduction.type === "advance")
              acc.totalAdvances += deduction.amount || 0;
            if (deduction.type === "fine")
              acc.totalFines += deduction.fineAmount || deduction.amount || 0;
            if (deduction.status === "pending") acc.pendingCount += 1;
            if (deduction.status === "approved") acc.approvedCount += 1;
            if (deduction.status === "rejected") acc.rejectedCount += 1;
            if (duplicate.status === "completed") acc.completedCount += 1;
            return acc;
          },
          {
            totalDeductions: 0,
            totalAdvances: 0,
            totalFines: 0,
            pendingCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
            completedCount: 0,
          }
        );
        setDeductionStats(localStats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Don't show toast for stats errors, they're less critical
    }
  }, [deductions]);

  // Load employees and deductions on component mount
  useEffect(() => {
    fetchEmployees();
    fetchDeductions();
  }, [fetchEmployees, fetchDeductions]);

  // Load deductions when filters or pagination changes
  useEffect(() => {
    fetchDeductions();
  }, [
    deductionPage,
    deductionItemsPerPage,
    statusFilter,
    typeFilter,
    fetchDeductions,
  ]);

  // Load deductions when search term changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== undefined && isMounted.current) {
        setDeductionPage(1);
        fetchDeductions();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, fetchDeductions]);

  // Load stats when deductions change
  useEffect(() => {
    fetchDeductionStats();
  }, [deductions, fetchDeductionStats]);

  // Filter deductions based on search and filters
  const filteredDeductions = useMemo(() => {
    return (deductions || []).filter((deduction) => {
      if (!deduction) return false;

      const employee = (employees || []).find(
        (emp) => emp && emp.employeeId === deduction.employeeId
      );
      const matchesSearch =
        employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee?.employeeId
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        deduction.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || deduction.status === statusFilter;
      const matchesType = typeFilter === "all" || deduction.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [deductions, employees, searchTerm, statusFilter, typeFilter]);

  const paginatedDeductions = filteredDeductions.slice(
    (deductionPage - 1) * deductionItemsPerPage,
    deductionPage * deductionItemsPerPage
  );

  // Add new deduction
  const handleAddDeduction = async () => {
    if (!deductionForm.employeeId || !deductionForm.amount) {
      toast.error("Validation Error", {
        description: "Please fill in all required fields (Employee and Amount)",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const employee = employees.find(
        (emp) => emp.employeeId === deductionForm.employeeId
      );

      if (!employee) {
        toast.error("Employee Not Found", {
          description: "Selected employee not found",
        });
        return;
      }

      // Prepare deduction data
      const deductionData = {
        employeeId: deductionForm.employeeId,
        employeeName: employee.name,
        employeeCode: employee.employeeId,
        type: deductionForm.type,
        amount: parseFloat(deductionForm.amount),
        description: deductionForm.description || "",
        deductionDate: deductionForm.deductionDate,
        status: deductionForm.status,
        repaymentMonths: deductionForm.repaymentMonths
          ? parseInt(deductionForm.repaymentMonths)
          : 0,
        fineAmount: deductionForm.fineAmount
          ? parseFloat(deductionForm.fineAmount)
          : 0,
        appliedMonth: deductionForm.appliedMonth,
      };

      console.log("Sending deduction data:", deductionData);

      // Direct API call to create deduction
      const response = await fetch(
        `${API_URL}/deductions/deductions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deductionData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API Error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Create deduction response:", data);

      if (data.success) {
        // Transform the response to match frontend format
        const employeeDetails = data.data.employeeDetails || {};
        const newDeduction = {
          id: data.data._id,
          employeeId: data.data.employeeId || employeeDetails.employeeId || "",
          employeeName: data.data.employeeName || employeeDetails.name || "",
          employeeCode:
            data.data.employeeCode || employeeDetails.employeeId || "",
          type: data.data.type,
          amount: data.data.amount,
          description: data.data.description || "",
          deductionDate: data.data.deductionDate
            ? new Date(data.data.deductionDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          status: data.data.status,
          repaymentMonths: data.data.repaymentMonths || 0,
          installmentAmount: data.data.installmentAmount || 0,
          fineAmount: data.data.fineAmount || 0,
          appliedMonth: data.data.appliedMonth,
          createdAt: data.data.createdAt,
          updatedAt: data.data.updatedAt,
        };

        // Add to the beginning of the list
        setDeductions((prev) => [newDeduction, ...(prev || [])]);
        setIsAddingDeduction(false);
        resetDeductionForm();

        toast.success("Success", {
          description: data.message || "Deduction added successfully!",
        });

        // Refresh the list to get updated data
        fetchDeductions(true);
        fetchDeductionStats(); // Refresh stats after adding
      } else {
        toast.error("Failed to add deduction", {
          description: data.message || "Please try again",
        });
      }
    } catch (error: any) {
      console.error("Error adding deduction:", error);
      toast.error("Network Error", {
        description:
          error.message ||
          "Unable to save deduction. Please check your connection.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update deduction
  const handleUpdateDeduction = async () => {
    if (!editingDeduction) return;

    setIsSubmitting(true);
    try {
      const employee = employees.find(
        (emp) => emp.employeeId === deductionForm.employeeId
      );

      if (!employee) {
        toast.error("Employee Not Found", {
          description: "Selected employee not found",
        });
        return;
      }

      const updateData = {
        employeeId: deductionForm.employeeId,
        employeeName: employee.name,
        employeeCode: employee.employeeId,
        type: deductionForm.type,
        amount: parseFloat(deductionForm.amount),
        description: deductionForm.description || "",
        deductionDate: deductionForm.deductionDate,
        status: deductionForm.status,
        repaymentMonths: deductionForm.repaymentMonths
          ? parseInt(deductionForm.repaymentMonths)
          : 0,
        fineAmount: deductionForm.fineAmount
          ? parseFloat(deductionForm.fineAmount)
          : 0,
        appliedMonth: deductionForm.appliedMonth,
      };

      console.log(`Updating deduction ${editingDeduction.id}:`, updateData);

      // Check what endpoint your backend uses for updating
      // Try both possibilities
      const response = await fetch(
        `${API_URL}/deductions/deductions/${editingDeduction.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        // Try alternative endpoint
        const altResponse = await fetch(
          `${API_URL}/deductions/${editingDeduction.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
          }
        );

        if (!altResponse.ok) {
          throw new Error(
            `API Error: ${response.status} ${response.statusText}`
          );
        }

        const data = await altResponse.json();

        if (data.success) {
          const updatedDeduction = {
            id: data.data._id,
            employeeId: data.data.employeeId,
            employeeName: data.data.employeeName,
            employeeCode: data.data.employeeCode,
            type: data.data.type,
            amount: data.data.amount,
            description: data.data.description || "",
            deductionDate: data.data.deductionDate
              ? new Date(data.data.deductionDate).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
            status: data.data.status,
            repaymentMonths: data.data.repaymentMonths || 0,
            installmentAmount: data.data.installmentAmount || 0,
            fineAmount: data.data.fineAmount || 0,
            appliedMonth: data.data.appliedMonth,
            createdAt: data.data.createdAt,
            updatedAt: data.data.updatedAt,
          };

          setDeductions((prev) =>
            (prev || []).map((d) =>
              d.id === updatedDeduction.id ? updatedDeduction : d
            )
          );
          setEditingDeduction(null);
          resetDeductionForm();

          toast.success("Success", {
            description: data.message || "Deduction updated successfully!",
          });

          fetchDeductions(true);
          fetchDeductionStats(); // Refresh stats after updating
        }
      } else {
        const data = await response.json();

        if (data.success) {
          const updatedDeduction = {
            id: data.data._id,
            employeeId: data.data.employeeId,
            employeeName: data.data.employeeName,
            employeeCode: data.data.employeeCode,
            type: data.data.type,
            amount: data.data.amount,
            description: data.data.description || "",
            deductionDate: data.data.deductionDate
              ? new Date(data.data.deductionDate).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
            status: data.data.status,
            repaymentMonths: data.data.repaymentMonths || 0,
            installmentAmount: data.data.installmentAmount || 0,
            fineAmount: data.data.fineAmount || 0,
            appliedMonth: data.data.appliedMonth,
            createdAt: data.data.createdAt,
            updatedAt: data.data.updatedAt,
          };

          setDeductions((prev) =>
            (prev || []).map((d) =>
              d.id === updatedDeduction.id ? updatedDeduction : d
            )
          );
          setEditingDeduction(null);
          resetDeductionForm();

          toast.success("Success", {
            description: data.message || "Deduction updated successfully!",
          });

          fetchDeductions(true);
          fetchDeductionStats(); // Refresh stats after updating
        }
      }
    } catch (error: any) {
      console.error("Error updating deduction:", error);
      toast.error("Network Error", {
        description:
          error.message ||
          "Unable to update deduction. Please check your connection.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete deduction
  const handleDeleteDeduction = async (id: string) => {
    try {
      console.log(`Deleting deduction ${id}`);

      // Check what endpoint your backend uses for deleting
      // Try both possibilities
      const response = await fetch(
        `${API_URL}/deductions/deductions/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        // Try alternative endpoint
        const altResponse = await fetch(
          `${API_URL}/deductions/${id}`,
          {
            method: "DELETE",
          }
        );

        if (!altResponse.ok) {
          throw new Error(
            `API Error: ${response.status} ${response.statusText}`
          );
        }

        const data = await altResponse.json();

        if (data.success) {
          setDeductions((prev) => (prev || []).filter((d) => d.id !== id));
          setDeleteDialog({ open: false, deduction: null });

          toast.success("Success", {
            description: data.message || "Deduction deleted successfully!",
          });

          fetchDeductions(true);
          fetchDeductionStats(); // Refresh stats after deleting
        } else {
          toast.error("Failed to delete deduction", {
            description: data.message || "Please try again",
          });
        }
      } else {
        const data = await response.json();

        if (data.success) {
          setDeductions((prev) => (prev || []).filter((d) => d.id !== id));
          setDeleteDialog({ open: false, deduction: null });

          toast.success("Success", {
            description: data.message || "Deduction deleted successfully!",
          });

          fetchDeductions(true);
          fetchDeductionStats(); // Refresh stats after deleting
        } else {
          toast.error("Failed to delete deduction", {
            description: data.message || "Please try again",
          });
        }
      }
    } catch (error: any) {
      console.error("Error deleting deduction:", error);
      toast.error("Network Error", {
        description:
          error.message ||
          "Unable to delete deduction. Please check your connection.",
      });
    }
  };

  // Edit deduction
  const handleEditDeduction = (deduction: Deduction) => {
    setEditingDeduction(deduction);
    setDeductionForm({
      employeeId: deduction.employeeId.toString(),
      type: deduction.type,
      amount: deduction.amount.toString(),
      description: deduction.description || "",
      deductionDate:
        deduction.deductionDate || new Date().toISOString().split("T")[0],
      status: deduction.status,
      repaymentMonths: deduction.repaymentMonths?.toString() || "",
      installmentAmount: deduction.installmentAmount?.toString() || "",
      fineAmount: deduction.fineAmount?.toString() || "",
      appliedMonth:
        deduction.appliedMonth || new Date().toISOString().slice(0, 7),
    });
  };

  // Reset deduction form
  const resetDeductionForm = () => {
    setDeductionForm({
      employeeId: "",
      type: "advance",
      amount: "",
      description: "",
      deductionDate: new Date().toISOString().split("T")[0],
      status: "pending",
      repaymentMonths: "",
      installmentAmount: "",
      fineAmount: "",
      appliedMonth: new Date().toISOString().slice(0, 7),
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const badgeClass = deductionService.getStatusBadgeClass(status);

    return (
      <Badge variant="secondary" className={badgeClass}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Get type badge
  const getTypeBadge = (type: string) => {
    const badgeClass = deductionService.getTypeBadgeClass(type);

    return (
      <Badge variant="secondary" className={badgeClass}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  // Export deductions data to CSV
  const handleExportDeductions = async () => {
    if (!deductions || deductions.length === 0) {
      toast.error("No Data", {
        description: "No deduction data to export",
      });
      return;
    }

    try {
      const blob = await deductionService.exportDeductions({
        format: "csv",
        status: statusFilter !== "all" ? statusFilter : undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `deductions_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Export Successful", {
        description: "Deduction data exported to CSV file",
      });
    } catch (error) {
      console.error("Error exporting deductions:", error);
      toast.error("Export Failed", {
        description: "Unable to export deductions. Please try again.",
      });
    }
  };

  // Handle form input changes with calculation
  const handleFormChange = (field: string, value: string) => {
    if (field === "amount" || field === "repaymentMonths") {
      const amount =
        field === "amount"
          ? parseFloat(value) || 0
          : parseFloat(deductionForm.amount) || 0;
      const months =
        field === "repaymentMonths"
          ? parseInt(value) || 0
          : parseInt(deductionForm.repaymentMonths) || 0;
      const installment = deductionService.calculateInstallmentAmount(
        amount,
        months
      );

      setDeductionForm((prev) => ({
        ...prev,
        [field]: value,
        installmentAmount: installment.toString(),
      }));
    } else {
      setDeductionForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  // Manual refresh function
  const handleManualRefresh = () => {
    // Force refresh
    fetchEmployees(true);
    fetchDeductions(true);
    fetchDeductionStats();

    toast.info("Refreshing data...");
  };

  return (
    <div className="space-y-6">
      {/* Add/Edit Deduction Dialog - IMPROVED UI */}
      <Dialog
        open={isAddingDeduction || !!editingDeduction}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingDeduction(false);
            setEditingDeduction(null);
            resetDeductionForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingDeduction ? (
                <>
                  <Edit className="h-5 w-5 text-primary" />
                  Edit Deduction
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-primary" />
                  Add New Deduction
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingDeduction
                ? "Update deduction information below"
                : "Fill in the details to add a new salary deduction or advance"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId" className="flex items-center gap-1">
                Employee <span className="text-red-500">*</span>
              </Label>
              <Select
                value={deductionForm.employeeId}
                onValueChange={(value) => handleFormChange("employeeId", value)}
                disabled={isLoadingEmployees}
              >
                <SelectTrigger className="w-full">
                  {isLoadingEmployees ? (
                    <div className="flex items-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading employees...
                    </div>
                  ) : (
                    <SelectValue placeholder="Select an employee" />
                  )}
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {(employees || []).map(
                    (employee) =>
                      employee && (
                        <SelectItem
                          key={employee.employeeId}
                          value={employee.employeeId}
                          className="py-2"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{employee.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {employee.employeeId} • {employee.department}
                            </span>
                          </div>
                        </SelectItem>
                      )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="flex items-center gap-1">
                Deduction Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={deductionForm.type}
                onValueChange={(value) =>
                  handleFormChange("type", value as any)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="advance" className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                    Salary Advance
                  </SelectItem>
                  <SelectItem value="fine" className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                    Fine/Penalty
                  </SelectItem>
                  <SelectItem value="other" className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
                    Other Deduction
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-1">
                Amount (₹) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={deductionForm.amount}
                  onChange={(e) => handleFormChange("amount", e.target.value)}
                  required
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={deductionForm.status}
                onValueChange={(value) =>
                  handleFormChange("status", value as any)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending" className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                    Pending
                  </SelectItem>
                  <SelectItem value="approved" className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                    Approved
                  </SelectItem>
                  <SelectItem value="rejected" className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                    Rejected
                  </SelectItem>
                  <SelectItem value="completed" className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                    Completed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deductionDate">Deduction Date</Label>
              <Input
                id="deductionDate"
                type="date"
                value={deductionForm.deductionDate}
                onChange={(e) =>
                  handleFormChange("deductionDate", e.target.value)
                }
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appliedMonth">Applied Month</Label>
              <Input
                id="appliedMonth"
                type="month"
                value={deductionForm.appliedMonth}
                onChange={(e) =>
                  handleFormChange("appliedMonth", e.target.value)
                }
                className="w-full"
              />
            </div>

            {deductionForm.type === "advance" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="repaymentMonths">Repayment Months</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="repaymentMonths"
                      type="number"
                      min="0"
                      placeholder="e.g., 3"
                      value={deductionForm.repaymentMonths}
                      onChange={(e) =>
                        handleFormChange("repaymentMonths", e.target.value)
                      }
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      months
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="installmentAmount">
                    Monthly Installment (₹)
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="installmentAmount"
                      type="number"
                      readOnly
                      placeholder="Auto-calculated"
                      value={deductionForm.installmentAmount}
                      className="pl-9 bg-muted"
                    />
                  </div>
                </div>
              </>
            )}

            {deductionForm.type === "fine" && (
              <div className="space-y-2">
                <Label htmlFor="fineAmount">Fine Amount (₹)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fineAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={deductionForm.fineAmount}
                    onChange={(e) =>
                      handleFormChange("fineAmount", e.target.value)
                    }
                    className="pl-9"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Enter description for the deduction..."
              value={deductionForm.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
              className="w-full"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingDeduction(false);
                setEditingDeduction(null);
                resetDeductionForm();
              }}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={
                editingDeduction ? handleUpdateDeduction : handleAddDeduction
              }
              disabled={
                isSubmitting ||
                !deductionForm.employeeId ||
                !deductionForm.amount
              }
              className="flex-1 sm:flex-none"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingDeduction ? "Save Changes" : "Add Deduction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog - IMPROVED UI */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, deduction: null })}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <Trash2 className="h-5 w-5" />
              <AlertDialogTitle>Delete Deduction</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left">
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-md">
                {deleteDialog.deduction && (
                  <>
                    <p className="font-medium text-sm">
                      Employee: {deleteDialog.deduction.employeeName}
                    </p>
                    <p className="text-sm">
                      Amount: ₹{deductionService.formatCurrency(deleteDialog.deduction.amount)}
                    </p>
                    <p className="text-sm">
                      Type: {deleteDialog.deduction.type}
                    </p>
                  </>
                )}
              </div>
              <p className="text-sm">
                Are you sure you want to delete this deduction record? This action
                cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="flex-1 sm:flex-none">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteDialog.deduction &&
                handleDeleteDeduction(deleteDialog.deduction.id.toString())
              }
              className="bg-red-600 hover:bg-red-700 flex-1 sm:flex-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header Section - IMPROVED UI */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Deduction Management</h2>
          <p className="text-muted-foreground">
            Manage salary advances, fines, and other deductions for employees
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleExportDeductions}
            disabled={deductions.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setIsAddingDeduction(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Deduction
          </Button>
        </div>
      </div>

      {/* Stats Cards - IMPROVED UI */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Deductions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <IndianRupee className="h-5 w-5 mr-1" />
              {deductionService.formatCurrency(deductionStats.totalDeductions)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {totalDeductionsCount} records
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Salary Advances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 flex items-center">
              <IndianRupee className="h-5 w-5 mr-1" />
              {deductionService.formatCurrency(deductionStats.totalAdvances)}
            </div>
            <div className="flex items-center mt-1">
              <div className="w-full bg-purple-100 rounded-full h-1.5">
                <div 
                  className="bg-purple-500 h-1.5 rounded-full" 
                  style={{ 
                    width: `${deductionStats.totalAdvances > 0 && deductionStats.totalDeductions > 0 ? 
                      (deductionStats.totalAdvances / deductionStats.totalDeductions) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fines/Penalties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 flex items-center">
              <IndianRupee className="h-5 w-5 mr-1" />
              {deductionService.formatCurrency(deductionStats.totalFines)}
            </div>
            <div className="flex items-center mt-1">
              <div className="w-full bg-orange-100 rounded-full h-1.5">
                <div 
                  className="bg-orange-500 h-1.5 rounded-full" 
                  style={{ 
                    width: `${deductionStats.totalFines > 0 && deductionStats.totalDeductions > 0 ? 
                      (deductionStats.totalFines / deductionStats.totalDeductions) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {deductionStats.pendingCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search - IMPROVED UI */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg">Deduction Records</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Approved: {deductionStats.approvedCount}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                Rejected: {deductionStats.rejectedCount}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                Completed: {deductionStats.completedCount}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employee name, ID, or description..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      fetchDeductions();
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span>Status</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-gray-300 mr-2"></div>
                      All Status
                    </div>
                  </SelectItem>
                  <SelectItem value="pending">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                      Pending
                    </div>
                  </SelectItem>
                  <SelectItem value="approved">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                      Approved
                    </div>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                      Rejected
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                      Completed
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span>Type</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-gray-300 mr-2"></div>
                      All Types
                    </div>
                  </SelectItem>
                  <SelectItem value="advance">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                      Salary Advance
                    </div>
                  </SelectItem>
                  <SelectItem value="fine">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                      Fine/Penalty
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
                      Other
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleManualRefresh}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Deductions Table - IMPROVED UI */}
          <div className="rounded-lg border overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col justify-center items-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <span className="text-muted-foreground">Loading deductions...</span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-semibold">Employee</TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold">Amount</TableHead>
                        <TableHead className="font-semibold">Fine Amount</TableHead>
                        <TableHead className="font-semibold">Description</TableHead>
                        <TableHead className="font-semibold">Installment</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Month</TableHead>
                        <TableHead className="font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDeductions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <Search className="h-12 w-12 text-muted-foreground mb-4" />
                              <h3 className="font-medium text-lg mb-1">
                                {deductions && deductions.length === 0
                                  ? "No deductions added yet"
                                  : "No matching deductions found"}
                              </h3>
                              <p className="text-muted-foreground text-sm max-w-md text-center">
                                {deductions && deductions.length === 0
                                  ? "Get started by adding your first deduction"
                                  : "Try adjusting your search or filters to find what you're looking for"}
                              </p>
                              {deductions && deductions.length === 0 && (
                                <Button 
                                  onClick={() => setIsAddingDeduction(true)} 
                                  className="mt-4"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add First Deduction
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedDeductions.map((deduction) => {
                          if (!deduction) return null;

                          const employee = (employees || []).find(
                            (emp) =>
                              emp && emp.employeeId === deduction.employeeId
                          );

                          return (
                            <TableRow key={deduction.id} className="hover:bg-muted/50 transition-colors">
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium">
                                    {employee?.name || "Unknown Employee"}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Badge variant="outline" className="text-xs font-normal">
                                      {employee?.employeeId || "N/A"}
                                    </Badge>
                                    <span className="text-muted-foreground">
                                      {employee?.department || "N/A"}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getTypeBadge(deduction.type)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center font-medium">
                                  <IndianRupee className="h-4 w-4 mr-1" />
                                  {deductionService.formatCurrency(
                                    deduction.amount
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {deduction.type === "fine" ? (
                                  <div className="flex items-center font-medium text-orange-600">
                                    <IndianRupee className="h-4 w-4 mr-1" />
                                    {deductionService.formatCurrency(
                                      deduction.fineAmount ||
                                        deduction.amount ||
                                        0
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                              <TableCell
                                className="max-w-xs min-w-[200px]"
                              >
                                <div className="truncate" title={deduction.description || ""}>
                                  {deduction.description || (
                                    <span className="text-muted-foreground italic">No description</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {deduction.type === "advance" &&
                                (deduction.installmentAmount || 0) > 0 ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center text-sm font-medium">
                                      <IndianRupee className="h-3 w-3 mr-1" />
                                      {deductionService.formatCurrency(
                                        deduction.installmentAmount || 0
                                      )}
                                      <span className="text-xs text-muted-foreground ml-1">
                                        /month
                                      </span>
                                    </div>
                                    {deduction.repaymentMonths &&
                                      deduction.repaymentMonths > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          {deduction.repaymentMonths} months
                                        </Badge>
                                      )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(deduction.status)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-normal">
                                  {deduction.appliedMonth || "N/A"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditDeduction(deduction)}
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() =>
                                      setDeleteDialog({ open: true, deduction })
                                    }
                                    title="Delete"
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

                {filteredDeductions.length > 0 && (
                  <div className="border-t">
                    <Pagination
                      currentPage={deductionPage}
                      totalPages={Math.ceil(
                        totalDeductionsCount / deductionItemsPerPage
                      )}
                      totalItems={totalDeductionsCount}
                      itemsPerPage={deductionItemsPerPage}
                      onPageChange={setDeductionPage}
                      onItemsPerPageChange={(value) => {
                        setDeductionItemsPerPage(value);
                        setDeductionPage(1); // Reset to first page when changing items per page
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeductionListTab;