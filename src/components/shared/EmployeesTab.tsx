/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Trash2, Plus, Download, Sheet, User, Edit, Camera, FileText, ArrowUpDown, Calendar, Files, AlertCircle, Loader2, Save, Upload, Database, Cloud, CheckCircle, XCircle, Users, Building, Shield, ShieldCheck, History, Clock, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Employee } from "@/pages/superadmin/types";
import StatCard from "@/pages/admin/StatCard";
import SearchBar from "@/pages/admin/SearchBar";
import Pagination from "@/pages/admin/Pagination";
import ExcelImportDialog from "@/pages/admin/ExcelImportDialog";
import axios from "axios";
import * as XLSX from 'xlsx';
import { format, differenceInDays } from 'date-fns';
import DocumentUpload from "../../pages/superadmin/DocumentUpload";
import { FaceRegisterButton } from "@/pages/supervisor/FaceRegisterButton";
// ─── API URL ──────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

// ─── Extended Interfaces ──────────────────────────────────────────────────

interface SiteAssignmentHistory {
  siteName: string;
  assignedDate: string;
  leftDate?: string;
  daysWorked?: number;
}

interface ExtendedEmployee extends Employee {
  siteHistory: SiteAssignmentHistory[];
  isManager: boolean;
  isSupervisor?: boolean;
  kycDocuments: any[];
  documents: any[];
  photo?: string | null;
  photoPublicId?: string | null;
  uanNumber: string;
  dateOfJoining: string;
  _id?: string;
  faceEmbeddings?: number[][];  // ✅ ADD THIS
}

interface EPFForm11Data {
  memberName: string;
  fatherOrSpouseName: string;
  relationshipType: "father" | "spouse";
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  email: string;
  mobileNumber: string;
  previousEPFMember: boolean;
  previousPensionMember: boolean;
  previousUAN: string;
  previousPFAccountNumber: string;
  dateOfExit: string;
  schemeCertificateNumber: string;
  pensionPaymentOrder: string;
  internationalWorker: boolean;
  countryOfOrigin: string;
  passportNumber: string;
  passportValidityFrom: string;
  passportValidityTo: string;
  bankAccountNumber: string;
  ifscCode: string;
  aadharNumber: string;
  panNumber: string;
  firstEPFMember: boolean;
  enrolledDate: string;
  firstEmploymentWages: string;
  epfMemberBeforeSep2014: boolean;
  epfAmountWithdrawn: boolean;
  epsAmountWithdrawn: boolean;
  epsAmountWithdrawnAfterSep2014: boolean;
  declarationDate: string;
  declarationPlace: string;
  employerDeclarationDate: string;
  employerName: string;
  pfNumber: string;
  kycStatus: "not_uploaded" | "uploaded_not_approved" | "uploaded_approved";
  transferRequestGenerated: boolean;
  physicalClaimFiled: boolean;
}

interface Site {
  _id: string;
  name: string;
  location?: string;
  address?: string;
  status?: 'active' | 'inactive';
  managerCount?: number;
  supervisorCount?: number;
  staffDeployment?: Array<{ role: string; count: number }>;
  currentManagerCount?: number;
  currentSupervisorCount?: number;
  currentStaffCount?: number;
}

interface SiteDeploymentStatus {
  siteName: string;
  managerCount: number;
  managerRequirement: number;
  supervisorCount: number;
  supervisorRequirement: number;
  staffCount: number;
  staffRequirement: number;
  totalStaff: number;
  isManagerFull: boolean;
  isSupervisorFull: boolean;
  isStaffFull: boolean;
  remainingManagers: number;
  remainingSupervisors: number;
  remainingStaff: number;
  details: {
    managers: Employee[];
    supervisors: Employee[];
    staff: Employee[];
  };
}

interface EditEmployeeForm {
  name: string;
  email: string;
  phone: string;
  aadharNumber: string;
  panNumber: string;
  esicNumber: string;
  uanNumber: string;
  dateOfBirth: string;
  bloodGroup: string;
  gender: string;
  maritalStatus: string;
  permanentAddress: string;
  permanentPincode: string;
  localAddress: string;
  localPincode: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  fatherName: string;
  motherName: string;
  spouseName: string;
  numberOfChildren: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  nomineeName: string;
  nomineeRelation: string;
  pantSize: string;
  shirtSize: string;
  capSize: string;
  idCardIssued: boolean;
  westcoatIssued: boolean;
  apronIssued: boolean;
  department: string;
  position: string;
  salary: number | string;
  siteName: string;
  status: "active" | "inactive" | "left";
}

// ─── Props Interface ──────────────────────────────────────────────────────

interface EmployeesTabProps {
  setActiveTab?: (tab: string) => void;
  employees?: Employee[];
  setEmployees?: React.Dispatch<React.SetStateAction<Employee[]>>;
  onEmployeeUpdate?: (updatedEmployee: Employee) => void;
  onEmployeesBulkUpdate?: (updatedEmployees: Employee[]) => void;
  customFetch?: (params: any) => Promise<any>;
  initialSiteFilter?: string;
  allowImport?: boolean;
  allowExport?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────

const EmployeesTab = ({
  setActiveTab,
  employees: propEmployees,
  setEmployees: propSetEmployees,
  onEmployeeUpdate,
  onEmployeesBulkUpdate
}: EmployeesTabProps) => {
  // ─── State ──────────────────────────────────────────────────────────────

  const [searchTerm, setSearchTerm] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [employeesPage, setEmployeesPage] = useState(1);
  const [employeesItemsPerPage, setEmployeesItemsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [selectedJoinDate, setSelectedJoinDate] = useState<string>("");
  const [selectedEmployeeForDocuments, setSelectedEmployeeForDocuments] = useState<ExtendedEmployee | null>(null);
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [documentUploadDialogOpen, setDocumentUploadDialogOpen] = useState(false);
  const [selectedEmployeeForDocumentUpload, setSelectedEmployeeForDocumentUpload] = useState<ExtendedEmployee | null>(null);
  const [refreshDocuments, setRefreshDocuments] = useState(false);
  const [epfForm11DialogOpen, setEpfForm11DialogOpen] = useState(false);
  const [selectedEmployeeForEPF, setSelectedEmployeeForEPF] = useState<ExtendedEmployee | null>(null);
  const [isSavingEPF, setIsSavingEPF] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState<ExtendedEmployee | null>(null);
  const [editFormData, setEditFormData] = useState<EditEmployeeForm | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState<ExtendedEmployee | null>(null);

  const [bulkSiteDialogOpen, setBulkSiteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedSiteForBulk, setSelectedSiteForBulk] = useState("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [sitesFromAPI, setSitesFromAPI] = useState<Site[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);

  const [siteDeploymentStatus, setSiteDeploymentStatus] = useState<Map<string, SiteDeploymentStatus>>(new Map());
  const [loadingDeploymentStatus, setLoadingDeploymentStatus] = useState(false);

  const [localEmployees, setLocalEmployees] = useState<ExtendedEmployee[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // Mobile responsiveness state
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  // Use local employees if no prop provided
  const employees = propEmployees ? (propEmployees as ExtendedEmployee[]) : localEmployees;
  const setEmployees = propSetEmployees ? (propSetEmployees as React.Dispatch<React.SetStateAction<ExtendedEmployee[]>>) : setLocalEmployees;

  const [epfFormData, setEpfFormData] = useState<EPFForm11Data>({
    memberName: "",
    fatherOrSpouseName: "",
    relationshipType: "father",
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
    email: "",
    mobileNumber: "",
    previousEPFMember: false,
    previousPensionMember: false,
    previousUAN: "",
    previousPFAccountNumber: "",
    dateOfExit: "",
    schemeCertificateNumber: "",
    pensionPaymentOrder: "",
    internationalWorker: false,
    countryOfOrigin: "",
    passportNumber: "",
    passportValidityFrom: "",
    passportValidityTo: "",
    bankAccountNumber: "",
    ifscCode: "",
    aadharNumber: "",
    panNumber: "",
    firstEPFMember: true,
    enrolledDate: new Date().toISOString().split("T")[0],
    firstEmploymentWages: "",
    epfMemberBeforeSep2014: false,
    epfAmountWithdrawn: false,
    epsAmountWithdrawn: false,
    epsAmountWithdrawnAfterSep2014: false,
    declarationDate: new Date().toISOString().split("T")[0],
    declarationPlace: "Mumbai",
    employerDeclarationDate: new Date().toISOString().split("T")[0],
    employerName: "SK ENTERPRISES",
    pfNumber: "",
    kycStatus: "not_uploaded",
    transferRequestGenerated: false,
    physicalClaimFiled: false
  });

  const [statsData, setStatsData] = useState({
    total: 0,
    active: 0,
    left: 0
  });
  // ─── Effects ─────────────────────────────────────────────────────────────

  // Handle resize for mobile detection
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchEmployeeStats();
  }, [employeesPage, employeesItemsPerPage, searchTerm, selectedDepartment, selectedSite, selectedJoinDate, sortBy, refreshDocuments]);

  useEffect(() => {
    fetchSites();
  }, []);

  useEffect(() => {
    if (employees.length > 0 && sitesFromAPI.length > 0) {
      calculateSiteDeploymentStatus();
    }
  }, [employees, sitesFromAPI]);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      // When 'showPagination' is false (total <= 10), fetch ALL employees
      // Otherwise respect pagination
      const shouldFetchAll = totalEmployees > 0 && totalEmployees <= 10;

      const params: any = {
        page: employeesPage,
        limit: shouldFetchAll ? 10000 : employeesItemsPerPage, // Fetch all if <= 10 employees
      };
      if (searchTerm) params.search = searchTerm;
      if (selectedDepartment !== "all") params.department = selectedDepartment;
      if (selectedSite !== "all") params.siteName = selectedSite;
      if (selectedJoinDate) params.dateOfJoining = selectedJoinDate;
      if (sortBy) {
        params.sortBy = sortBy;
        params.sortOrder = "asc";
      }

      const response = await axios.get(`${API_URL}/employees`, { params });

      if (response.data && response.data.success) {
        const apiData = response.data.data || response.data.employees || [];

        if (!Array.isArray(apiData)) {
          console.error("API data is not an array:", apiData);
          setError("Invalid data format received from server");
          setEmployees([]);
          setTotalEmployees(0);
          return;
        }

        const transformedEmployees: ExtendedEmployee[] = apiData.map((emp: any, index: number) => {
          let siteHistory = [];
          if (emp.siteHistory && Array.isArray(emp.siteHistory)) {
            siteHistory = emp.siteHistory.map((history: any) => ({
              siteName: history.siteName || '',
              assignedDate: history.assignedDate,
              leftDate: history.leftDate,
              daysWorked: history.daysWorked
            }));
          }

          const employee: ExtendedEmployee = {
            _id: emp._id || emp.id || `emp_${index}`,
            id: emp._id || emp.id || `emp_${index}`,
            employeeId: emp.employeeId || emp.employeeID ?
              emp.employeeId :
              `SK${((employeesPage - 1) * employeesItemsPerPage) + index + 1}`,
            name: emp.name || emp.employeeName || "Unknown",
            email: emp.email || "",
            phone: emp.phone || emp.mobile || "",
            aadharNumber: emp.aadharNumber || emp.aadhar || "",
            panNumber: emp.panNumber || emp.pan || "",
            esicNumber: emp.esicNumber || emp.esic || "",
            uan: emp.uanNumber || emp.uan || "",
            uanNumber: emp.uanNumber || emp.uan || "",
            dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split('T')[0] : "",
            joinDate: emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            dateOfJoining: emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            exitDate: emp.dateOfExit ? new Date(emp.dateOfExit).toISOString().split('T')[0] : "",
            bloodGroup: emp.bloodGroup || "",
            gender: emp.gender || "",
            maritalStatus: emp.maritalStatus || "",
            department: emp.department || "Unknown",
            position: emp.position || emp.designation || "",
            siteName: emp.siteName || emp.site || "",
            salary: emp.salary || emp.basicSalary || 0,
            status: emp.status || "active",
            documents: emp.documents || [],
            photo: emp.photo || null,
            photoPublicId: emp.photoPublicId || null,
            fatherName: emp.fatherName || "",
            motherName: emp.motherName || "",
            spouseName: emp.spouseName || "",
            numberOfChildren: emp.numberOfChildren ? emp.numberOfChildren.toString() : "0",
            nomineeName: emp.nomineeName || "",
            nomineeRelation: emp.nomineeRelation || "",
            accountNumber: emp.accountNumber || emp.bankAccountNumber || "",
            ifscCode: emp.ifscCode || "",
            bankName: emp.bankName || "",
            permanentAddress: emp.permanentAddress || "",
            localAddress: emp.localAddress || "",
            emergencyContactName: emp.emergencyContactName || "",
            emergencyContactPhone: emp.emergencyContactPhone || "",
            emergencyContactRelation: emp.emergencyContactRelation || "",
            siteHistory: siteHistory,
            kycDocuments: emp.kycDocuments || [],
            isManager: false,
            isSupervisor: false,
            faceEmbeddings: (emp as any).faceEmbeddings || [],  // ✅ ADD THIS
          };

          if (employee.siteName && siteHistory.length === 0) {
            employee.siteHistory = [{
              siteName: employee.siteName,
              assignedDate: employee.joinDate,
              leftDate: undefined,
              daysWorked: undefined
            }];
          }

          const position = employee.position?.toLowerCase() || '';
          const department = employee.department?.toLowerCase() || '';

          employee.isManager = position.includes('manager') || department.includes('manager');
          employee.isSupervisor = position.includes('supervisor') || department.includes('supervisor');

          return employee;
        });
        setEmployees(transformedEmployees);

        const totalFromAPI = response.data.pagination?.total || response.data.total || response.data.count || 0;
        setTotalEmployees(totalFromAPI);
      } else {
        const errorMsg = response.data?.message || "Failed to fetch employees";
        setError(errorMsg);
        toast.error(errorMsg);
        setEmployees([]);
        setTotalEmployees(0);
      }
    } catch (err: any) {
      console.error("Error fetching employees:", err);
      const errorMsg = err.response?.data?.message || err.message || "Network error occurred";
      setError(errorMsg);
      toast.error("Error loading employees: " + errorMsg);
      setEmployees([]);
      setTotalEmployees(0);
    } finally {
      setLoading(false);
    }
  };
  const fetchEmployeeStats = async () => {
    try {
      // Fetch ALL employees just for counting (no pagination)
      const response = await axios.get(`${API_URL}/employees`, {
        params: { limit: 10000 } // Get all
      });

      if (response.data && response.data.success) {
        const allEmps = response.data.data || response.data.employees || [];
        setStatsData({
          total: allEmps.length,
          active: allEmps.filter((e: any) => e.status === 'active').length,
          left: allEmps.filter((e: any) => e.status === 'left' || e.status === 'inactive').length
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };
  const fetchSites = async () => {
    try {
      setLoadingSites(true);
      const response = await axios.get(`${API_URL}/sites`);

      let sitesData: Site[] = [];

      if (response.data) {
        if (response.data.success && Array.isArray(response.data.data)) {
          sitesData = response.data.data;
        } else if (Array.isArray(response.data)) {
          sitesData = response.data;
        } else if (response.data.sites && Array.isArray(response.data.sites)) {
          sitesData = response.data.sites;
        } else {
          console.warn("Unexpected sites API response format:", response.data);
          sitesData = [];
        }
      }

      const enhancedSites = sitesData.map(site => {
        const siteEmployees = employees.filter(emp => emp.siteName === site.name);

        const managerCount = siteEmployees.filter(emp =>
          emp.position?.toLowerCase().includes('manager') ||
          emp.department?.toLowerCase().includes('manager')
        ).length;

        const supervisorCount = siteEmployees.filter(emp =>
          emp.position?.toLowerCase().includes('supervisor') ||
          emp.department?.toLowerCase().includes('supervisor')
        ).length;

        const staffCount = siteEmployees.filter(emp =>
          !emp.position?.toLowerCase().includes('manager') &&
          !emp.position?.toLowerCase().includes('supervisor') &&
          !emp.department?.toLowerCase().includes('manager') &&
          !emp.department?.toLowerCase().includes('supervisor')
        ).length;

        return {
          ...site,
          currentManagerCount: managerCount,
          currentSupervisorCount: supervisorCount,
          currentStaffCount: staffCount
        };
      });

      setSitesFromAPI(enhancedSites);
    } catch (err: any) {
      console.error("Error fetching sites:", err);
      setSitesFromAPI([]);
    } finally {
      setLoadingSites(false);
    }
  };

  const calculateSiteDeploymentStatus = () => {
    setLoadingDeploymentStatus(true);

    const statusMap = new Map<string, SiteDeploymentStatus>();

    sitesFromAPI.forEach(site => {
      const staffRequirement = Array.isArray(site.staffDeployment)
        ? site.staffDeployment.reduce((total, item) => {
          const role = item.role?.toLowerCase() || '';
          if (!role.includes('manager') && !role.includes('supervisor')) {
            return total + (Number(item.count) || 0);
          }
          return total;
        }, 0)
        : 0;

      statusMap.set(site.name, {
        siteName: site.name,
        managerCount: site.currentManagerCount || 0,
        managerRequirement: site.managerCount || 0,
        supervisorCount: site.currentSupervisorCount || 0,
        supervisorRequirement: site.supervisorCount || 0,
        staffCount: site.currentStaffCount || 0,
        staffRequirement: staffRequirement,
        totalStaff: (site.currentManagerCount || 0) + (site.currentSupervisorCount || 0) + (site.currentStaffCount || 0),
        isManagerFull: (site.managerCount || 0) > 0 && (site.currentManagerCount || 0) >= (site.managerCount || 0),
        isSupervisorFull: (site.supervisorCount || 0) > 0 && (site.currentSupervisorCount || 0) >= (site.supervisorCount || 0),
        isStaffFull: staffRequirement > 0 && (site.currentStaffCount || 0) >= staffRequirement,
        remainingManagers: Math.max(0, (site.managerCount || 0) - (site.currentManagerCount || 0)),
        remainingSupervisors: Math.max(0, (site.supervisorCount || 0) - (site.currentSupervisorCount || 0)),
        remainingStaff: Math.max(0, staffRequirement - (site.currentStaffCount || 0)),
        details: {
          managers: employees.filter(emp => emp.siteName === site.name &&
            (emp.position?.toLowerCase().includes('manager') || emp.department?.toLowerCase().includes('manager'))),
          supervisors: employees.filter(emp => emp.siteName === site.name &&
            (emp.position?.toLowerCase().includes('supervisor') || emp.department?.toLowerCase().includes('supervisor'))),
          staff: employees.filter(emp => emp.siteName === site.name &&
            !emp.position?.toLowerCase().includes('manager') &&
            !emp.position?.toLowerCase().includes('supervisor') &&
            !emp.department?.toLowerCase().includes('manager') &&
            !emp.department?.toLowerCase().includes('supervisor'))
        }
      });
    });

    setSiteDeploymentStatus(statusMap);
    setLoadingDeploymentStatus(false);
  };

  // ─── Helper Functions ──────────────────────────────────────────────────

  const canAssignToSite = (siteName: string, employeesToAssign: ExtendedEmployee[]): {
    allowed: boolean;
    message?: string;
    violations: Array<{
      employee: ExtendedEmployee;
      reason: string;
    }>;
  } => {
    const status = siteDeploymentStatus.get(siteName);
    if (!status) {
      return { allowed: true, violations: [] };
    }

    const violations: Array<{ employee: ExtendedEmployee; reason: string }> = [];

    const managersToAdd = employeesToAssign.filter(emp => emp.isManager).length;
    const supervisorsToAdd = employeesToAssign.filter(emp => emp.isSupervisor).length;
    const staffToAdd = employeesToAssign.filter(emp => !emp.isManager && !emp.isSupervisor).length;

    if (managersToAdd > status.remainingManagers) {
      const overLimit = managersToAdd - status.remainingManagers;
      employeesToAssign.filter(emp => emp.isManager).slice(0, overLimit).forEach(emp => {
        violations.push({
          employee: emp,
          reason: `Manager position full for ${siteName}. Only ${status.remainingManagers} manager position(s) remaining.`
        });
      });
    }

    if (supervisorsToAdd > status.remainingSupervisors) {
      const overLimit = supervisorsToAdd - status.remainingSupervisors;
      employeesToAssign.filter(emp => emp.isSupervisor).slice(0, overLimit).forEach(emp => {
        violations.push({
          employee: emp,
          reason: `Supervisor position full for ${siteName}. Only ${status.remainingSupervisors} supervisor position(s) remaining.`
        });
      });
    }

    if (staffToAdd > status.remainingStaff) {
      const overLimit = staffToAdd - status.remainingStaff;
      employeesToAssign.filter(emp => !emp.isManager && !emp.isSupervisor).slice(0, overLimit).forEach(emp => {
        violations.push({
          employee: emp,
          reason: `Staff position full for ${siteName}. Only ${status.remainingStaff} staff position(s) remaining.`
        });
      });
    }

    return {
      allowed: violations.length === 0,
      violations
    };
  };

  const updateSiteHistory = (employee: ExtendedEmployee, newSiteName: string): ExtendedEmployee => {
    const today = new Date().toISOString().split('T')[0];

    let history = employee.siteHistory || [];

    if (employee.siteName && employee.siteName !== newSiteName && employee.siteName !== "") {
      const lastEntryIndex = history.findIndex(entry => !entry.leftDate);

      if (lastEntryIndex !== -1) {
        const existingEntry = history[lastEntryIndex];
        const assignedDate = new Date(existingEntry.assignedDate);
        const leftDate = new Date(today);
        const daysWorked = differenceInDays(leftDate, assignedDate);

        const updatedEntry = {
          siteName: employee.siteName,
          assignedDate: existingEntry.assignedDate,
          leftDate: today,
          daysWorked: daysWorked > 0 ? daysWorked : 0
        };

        history = history.map((entry, index) => {
          if (index === lastEntryIndex) {
            return updatedEntry;
          }
          return entry;
        });
      } else {
        const newEntry = {
          siteName: employee.siteName,
          assignedDate: employee.joinDate || today,
          leftDate: today,
          daysWorked: differenceInDays(new Date(today), new Date(employee.joinDate || today))
        };
        history.push(newEntry);
      }
    }

    const newSiteEntry = {
      siteName: newSiteName,
      assignedDate: today
    };
    history.push(newSiteEntry);

    return {
      ...employee,
      siteName: newSiteName,
      siteHistory: history
    };
  };

  // ─── Filtering & Sorting ──────────────────────────────────────────────

  const departments = Array.from(new Set(employees.map(emp => emp.department))).filter(Boolean);
  const employeeSites = Array.from(new Set(employees.map(emp => emp.siteName))).filter(Boolean);
  const apiSiteNames = sitesFromAPI.map(site => site.name).filter(Boolean);
  const allSiteNames = Array.from(new Set([...employeeSites, ...apiSiteNames]));

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.siteName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = selectedDepartment === "all" || emp.department === selectedDepartment;
    const matchesSite = selectedSite === "all" || emp.siteName === selectedSite;
    const matchesJoinDate = !selectedJoinDate || emp.joinDate === selectedJoinDate;

    return matchesSearch && matchesDepartment && matchesSite && matchesJoinDate;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (sortBy === "name") {
      return (a.name || "").localeCompare(b.name || "");
    }
    if (sortBy === "department") {
      return (a.department || "").localeCompare(b.department || "");
    }
    if (sortBy === "site") {
      return (a.siteName || "").localeCompare(b.siteName || "");
    }
    if (sortBy === "joinDate") {
      return new Date(a.joinDate || "").getTime() - new Date(b.joinDate || "").getTime();
    }
    return 0;
  });
  const showPagination = totalEmployees > employeesItemsPerPage;
  const activeEmployees = statsData.active;
  const leftEmployeesCount = statsData.left;

  // ─── Selection Handlers ──────────────────────────────────────────────

  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedEmployees([]);
    } else {
      // Select ALL employees (not just filtered/sorted)
      setSelectedEmployees(employees.map(emp => emp.id || emp._id || ''));
    }
    setSelectAll(!selectAll);
  };

  useEffect(() => {
    if (sortedEmployees.length > 0 && selectedEmployees.length === sortedEmployees.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedEmployees, sortedEmployees]);

  // ─── Edit Handlers ──────────────────────────────────────────────────

  const handleEditEmployee = (employee: ExtendedEmployee) => {
    setSelectedEmployeeForEdit(employee);
    setEditFormData({
      name: employee.name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      aadharNumber: employee.aadharNumber || "",
      panNumber: employee.panNumber || "",
      esicNumber: employee.esicNumber || "",
      uanNumber: employee.uanNumber || employee.uan || "",
      dateOfBirth: employee.dateOfBirth || "",
      bloodGroup: employee.bloodGroup || "",
      gender: employee.gender || "",
      maritalStatus: employee.maritalStatus || "",
      permanentAddress: employee.permanentAddress || "",
      permanentPincode: employee.permanentPincode || "",
      localAddress: employee.localAddress || "",
      localPincode: employee.localPincode || "",
      bankName: employee.bankName || "",
      accountNumber: employee.accountNumber || "",
      ifscCode: employee.ifscCode || "",
      branchName: employee.branchName || "",
      fatherName: employee.fatherName || "",
      motherName: employee.motherName || "",
      spouseName: employee.spouseName || "",
      numberOfChildren: employee.numberOfChildren?.toString() || "0",
      emergencyContactName: employee.emergencyContactName || "",
      emergencyContactPhone: employee.emergencyContactPhone || "",
      emergencyContactRelation: employee.emergencyContactRelation || "",
      nomineeName: employee.nomineeName || "",
      nomineeRelation: employee.nomineeRelation || "",
      pantSize: employee.pantSize || "",
      shirtSize: employee.shirtSize || "",
      capSize: employee.capSize || "",
      idCardIssued: employee.idCardIssued || false,
      westcoatIssued: employee.westcoatIssued || false,
      apronIssued: employee.apronIssued || false,
      department: employee.department || "",
      position: employee.position || "",
      salary: employee.salary || 0,
      siteName: employee.siteName || "",
      status: employee.status || "active"
    });
    setEditDialogOpen(true);
  };

  const handleEditFormChange = (field: keyof EditEmployeeForm, value: any) => {
    if (editFormData) {
      setEditFormData({
        ...editFormData,
        [field]: value
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedEmployeeForEdit || !editFormData) {
      toast.error("No employee selected for editing");
      return;
    }

    const requiredFields = [
      { field: editFormData.name, name: 'Name' },
      { field: editFormData.aadharNumber, name: 'Aadhar Number' },
      { field: editFormData.position, name: 'Position' },
      { field: editFormData.department, name: 'Department' },
      { field: editFormData.siteName, name: 'Site Name' },
    ];

    const missingFields = requiredFields
      .filter(item => !item.field || item.field.toString().trim() === '')
      .map(item => item.name);

    if (missingFields.length > 0) {
      toast.error(`Please fill all required fields: ${missingFields.join(', ')}`);
      return;
    }

    if (editFormData.email && editFormData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editFormData.email)) {
        toast.error("Please enter a valid email address");
        return;
      }
    }

    if (editFormData.phone && !/^\d{10}$/.test(editFormData.phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    if (!/^\d{12}$/.test(editFormData.aadharNumber)) {
      toast.error("Please enter a valid 12-digit Aadhar number");
      return;
    }

    try {
      setIsSavingEdit(true);

      const employeeId = selectedEmployeeForEdit.id || selectedEmployeeForEdit._id;

      const apiData = {
        ...editFormData,
        email: editFormData.email?.trim() || null,
        panNumber: editFormData.panNumber?.trim() || null,
        esicNumber: editFormData.esicNumber?.trim() || null,
        uanNumber: editFormData.uanNumber?.trim() || null,
        dateOfBirth: editFormData.dateOfBirth || null,
        bloodGroup: editFormData.bloodGroup || null,
        gender: editFormData.gender || null,
        maritalStatus: editFormData.maritalStatus || null,
        permanentAddress: editFormData.permanentAddress?.trim() || null,
        permanentPincode: editFormData.permanentPincode?.trim() || null,
        localAddress: editFormData.localAddress?.trim() || null,
        localPincode: editFormData.localPincode?.trim() || null,
        bankName: editFormData.bankName?.trim() || null,
        accountNumber: editFormData.accountNumber?.trim() || null,
        ifscCode: editFormData.ifscCode?.trim().toUpperCase() || null,
        branchName: editFormData.branchName?.trim() || null,
        fatherName: editFormData.fatherName?.trim() || null,
        motherName: editFormData.motherName?.trim() || null,
        spouseName: editFormData.spouseName?.trim() || null,
        numberOfChildren: editFormData.numberOfChildren?.toString() || "0",
        emergencyContactName: editFormData.emergencyContactName?.trim() || null,
        emergencyContactPhone: editFormData.emergencyContactPhone?.trim() || null,
        emergencyContactRelation: editFormData.emergencyContactRelation?.trim() || null,
        nomineeName: editFormData.nomineeName?.trim() || null,
        nomineeRelation: editFormData.nomineeRelation?.trim() || null,
        pantSize: editFormData.pantSize || null,
        shirtSize: editFormData.shirtSize || null,
        capSize: editFormData.capSize || null,
        idCardIssued: editFormData.idCardIssued === true,
        westcoatIssued: editFormData.westcoatIssued === true,
        apronIssued: editFormData.apronIssued === true,
        salary: typeof editFormData.salary === 'string' ? parseFloat(editFormData.salary) : editFormData.salary,
      };

      const response = await axios.patch(`${API_URL}/employees/${employeeId}`, apiData);

      if (response.data.success) {
        setEmployees(prev => prev.map(emp =>
          (emp.id === employeeId || emp._id === employeeId)
            ? { ...emp, ...apiData, numberOfChildren: editFormData.numberOfChildren?.toString() || "0" } as ExtendedEmployee
            : emp
        ));

        if (onEmployeeUpdate) {
          const updatedEmployee = employees.find(emp => emp.id === employeeId || emp._id === employeeId);
          if (updatedEmployee) {
            onEmployeeUpdate({ ...updatedEmployee, ...apiData } as Employee);
          }
        }

        toast.success("Employee updated successfully!");
        setEditDialogOpen(false);
        setSelectedEmployeeForEdit(null);
        setEditFormData(null);

        calculateSiteDeploymentStatus();
        fetchEmployees();
      } else {
        toast.error(response.data.message || "Failed to update employee");
      }
    } catch (err: any) {
      console.error("Error updating employee:", err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "Error updating employee";
      toast.error(errorMessage);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ─── History / Documents / EPF ──────────────────────────────────────

  const handleViewHistory = (employee: ExtendedEmployee) => {
    const currentEmployee = employees.find(emp => emp.id === employee.id || emp._id === employee._id);

    if (currentEmployee) {
      setSelectedEmployeeForHistory(currentEmployee);
    } else {
      setSelectedEmployeeForHistory(employee);
    }
    setHistoryDialogOpen(true);
  };

  const handleOpenDocumentUpload = (employee: ExtendedEmployee) => {
    setSelectedEmployeeForDocumentUpload(employee);
    setDocumentUploadDialogOpen(true);
  };

  const handleDocumentUploaded = () => {
    fetchEmployees();
    setRefreshDocuments(prev => !prev);
    toast.success('Documents refreshed');
  };

  // ─── Bulk Actions ────────────────────────────────────────────────────

  const handleBulkSiteAssignment = async () => {
    if (!selectedSiteForBulk) {
      toast.error("Please select a site");
      return;
    }

    if (selectedEmployees.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }

    const employeesToAssign = employees.filter(emp => selectedEmployees.includes(emp.id || emp._id || ''));

    const capacityCheck = canAssignToSite(selectedSiteForBulk, employeesToAssign);

    if (!capacityCheck.allowed) {
      toast.error(
        <div className="space-y-2">
          <div className="flex items-centergap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="font-medium">Site Capacity Exceeded</span>
          </div>
          <div className="text-sm text-red-600 max-h-40 overflow-y-auto">
            {capacityCheck.violations.map((violation, index) => (
              <div key={index} className="mb-1">
                • {violation.employee.name}: {violation.reason}
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Please select different employees or adjust site requirements.
          </div>
        </div>,
        { duration: 8000 }
      );
      return;
    }

    try {
      setIsBulkUpdating(true);

      const employeeIds = employeesToAssign.map(emp => emp._id || emp.id);

      console.log('Sending bulk site update:', { employeeIds, siteName: selectedSiteForBulk });

      const response = await axios.patch(`${API_URL}/employees/bulk/site`, {
        employeeIds: employeeIds,
        siteName: selectedSiteForBulk
      });

      if (response.data.success) {
        const managersCount = employeesToAssign.filter(emp => emp.isManager).length;
        const supervisorsCount = employeesToAssign.filter(emp => emp.isSupervisor).length;
        const staffCount = employeesToAssign.filter(emp => !emp.isManager && !emp.isSupervisor).length;

        toast.success(
          <div className="space-y-2">
            <div className="flex items-centergap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium">Site Assignment Successful</span>
            </div>
            <div className="text-sm">
              Assigned {selectedEmployees.length} employees to {selectedSiteForBulk}:
              <div className="mt-1 text-xs">
                {managersCount > 0 && <div>• Managers: {managersCount}</div>}
                {supervisorsCount > 0 && <div>• Supervisors: {supervisorsCount}</div>}
                {staffCount > 0 && <div>• Staff: {staffCount}</div>}
              </div>
            </div>
          </div>,
          { duration: 8000 }
        );

        await fetchEmployees();
        await fetchSites();
        calculateSiteDeploymentStatus();

        setBulkSiteDialogOpen(false);
        setSelectedEmployees([]);
        setSelectAll(false);
        setSelectedSiteForBulk("");
      } else {
        toast.error(response.data.message || "Failed to assign site");
      }
    } catch (err: any) {
      console.error("Error assigning site:", err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "Error assigning site";
      toast.error(errorMessage);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEmployees.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }

    try {
      setIsBulkDeleting(true);

      const response = await axios.delete(`${API_URL}/employees/bulk`, {
        data: { employeeIds: selectedEmployees }
      });

      if (response.data.success) {
        toast.success(`Successfully deleted ${selectedEmployees.length} employees`);

        setEmployees(prev => prev.filter(emp => !selectedEmployees.includes(emp.id || emp._id || '')));
        setTotalEmployees(prev => prev - selectedEmployees.length);

        setBulkDeleteDialogOpen(false);
        setSelectedEmployees([]);
        setSelectAll(false);

        calculateSiteDeploymentStatus();
        fetchEmployees();
      } else {
        toast.error(response.data.message || "Failed to delete employees");
      }
    } catch (err: any) {
      console.error("Error deleting employees:", err);
      toast.error(err.response?.data?.message || "Error deleting employees");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // ─── Delete Individual ──────────────────────────────────────────────

  const handleDeleteEmployee = async (id: string) => {
    try {
      setIsDeleting(id);
      const employee = employees.find(emp => (emp.id === id || emp._id === id));
      if (!employee) {
        toast.error("Employee not found");
        return;
      }

      const employeeId = employee.id || employee._id;

      const response = await axios.delete(`${API_URL}/employees/${employeeId}`);

      if (response.data.success) {
        setEmployees(prev => prev.filter(emp => emp.id !== id && emp._id !== id));
        setTotalEmployees(prev => prev - 1);
        toast.success("Employee deleted successfully!");

        calculateSiteDeploymentStatus();
      } else {
        toast.error(response.data.message || "Failed to delete employee");
      }
    } catch (err: any) {
      console.error("Error deleting employee:", err);
      toast.error(err.response?.data?.message || "Error deleting employee");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleMarkAsLeft = async (employee: ExtendedEmployee) => {
    try {
      setLoading(true);
      const employeeId = employee.id || employee._id;
      const response = await axios.patch(
        `${API_URL}/employees/${employeeId}/status`,
        { status: "left" }
      );

      if (response.data.success) {
        setEmployees(prev => prev.map(emp =>
          (emp.id === employeeId || emp._id === employeeId)
            ? { ...emp, status: "left", exitDate: new Date().toISOString().split("T")[0] } as ExtendedEmployee
            : emp
        ));
        toast.success("Employee marked as left");

        calculateSiteDeploymentStatus();
      } else {
        toast.error(response.data.message || "Failed to update status");
      }
    } catch (err: any) {
      console.error("Error updating employee status:", err);
      toast.error(err.response?.data?.message || "Error updating status");
    } finally {
      setLoading(false);
    }
  };

  // ─── Status / Export / Import ──────────────────────────────────────

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "inactive": return "destructive";
      case "left": return "destructive";
      default: return "outline";
    }
  };

  const handleExportEmployees = async () => {
    try {
      setIsExporting(true);

      const response = await axios.get(`${API_URL}/employees/export`, {
        responseType: "blob",
        params: {
          department: selectedDepartment !== "all" ? selectedDepartment : undefined,
          status: "active"
        }
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `employees_export_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Employees exported successfully!");
    } catch (err: any) {
      console.error("Error exporting employees:", err);
      if (err.response?.status === 404) {
        toast.error("Export feature is not available. Please check backend configuration.");
      } else {
        toast.error(err.response?.data?.message || "Export failed");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportEmployees = async (file: File) => {
    try {
      setIsImporting(true);
      setImportProgress({ current: 0, total: 0 });

      if (!file) {
        toast.error("Please select a file to import");
        return;
      }

      const toastId = toast.loading(
        <div className="space-y-2">
          <div className="flex items-centergap-2">
            <Database className="h-4 w-4" />
            <span className="font-medium">Reading Excel file...</span>
          </div>
        </div>
      );

      let freshSites: Site[] = [];
      try {
        const response = await axios.get(`${API_URL}/sites`);

        if (response.data) {
          if (response.data.success && Array.isArray(response.data.data)) {
            freshSites = response.data.data;
          } else if (Array.isArray(response.data)) {
            freshSites = response.data;
          } else if (response.data.sites && Array.isArray(response.data.sites)) {
            freshSites = response.data.sites;
          }
        }

        setSitesFromAPI(freshSites);

      } catch (err) {
        console.error("Error fetching fresh sites:", err);
        freshSites = sitesFromAPI;
      }

      if (freshSites.length === 0) {
        toast.error(
          <div className="space-y-2">
            <div className="flex items-centergap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="font-medium">No Sites Found</span>
            </div>
            <div className="text-sm text-red-600">
              Please add sites in the Sites section before importing employees.
            </div>
          </div>,
          { id: toastId, duration: 10000 }
        );
        return;
      }

      const employeesResponse = await axios.get(`${API_URL}/employees`, {
        params: { limit: 10000 }
      });

      let existingEmployees: Employee[] = [];
      if (employeesResponse.data && employeesResponse.data.success) {
        existingEmployees = employeesResponse.data.data || employeesResponse.data.employees || [];
      }

      const siteCapacityMap = new Map<string, {
        name: string;
        managerRequirement: number;
        supervisorRequirement: number;
        staffRequirement: number;
        currentManagerCount: number;
        currentSupervisorCount: number;
        currentStaffCount: number;
        remainingManagers: number;
        remainingSupervisors: number;
        remainingStaff: number;
      }>();

      freshSites.forEach(site => {
        const staffRequirement = Array.isArray(site.staffDeployment)
          ? site.staffDeployment.reduce((total, item) => {
            const role = item.role?.toLowerCase() || '';
            if (!role.includes('manager') && !role.includes('supervisor')) {
              return total + (Number(item.count) || 0);
            }
            return total;
          }, 0)
          : 0;

        const siteEmployees = existingEmployees.filter(emp =>
          emp.siteName?.trim() === site.name.trim()
        );

        const managerCount = siteEmployees.filter(emp =>
          emp.position?.toLowerCase().includes('manager') ||
          emp.department?.toLowerCase().includes('manager')
        ).length;

        const supervisorCount = siteEmployees.filter(emp =>
          emp.position?.toLowerCase().includes('supervisor') ||
          emp.department?.toLowerCase().includes('supervisor')
        ).length;

        const staffCount = siteEmployees.filter(emp =>
          !emp.position?.toLowerCase().includes('manager') &&
          !emp.position?.toLowerCase().includes('supervisor') &&
          !emp.department?.toLowerCase().includes('manager') &&
          !emp.department?.toLowerCase().includes('supervisor')
        ).length;

        siteCapacityMap.set(site.name, {
          name: site.name,
          managerRequirement: site.managerCount || 0,
          supervisorRequirement: site.supervisorCount || 0,
          staffRequirement: staffRequirement,
          currentManagerCount: managerCount,
          currentSupervisorCount: supervisorCount,
          currentStaffCount: staffCount,
          remainingManagers: Math.max(0, (site.managerCount || 0) - managerCount),
          remainingSupervisors: Math.max(0, (site.supervisorCount || 0) - supervisorCount),
          remainingStaff: Math.max(0, staffRequirement - staffCount)
        });
      });

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        cellDates: true,
        cellNF: false
      });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        raw: false,
        dateNF: 'mm/dd/yyyy'
      });

      if (jsonData.length < 2) {
        toast.error(
          <div className="space-y-2">
            <div className="flex items-centergap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="font-medium">Empty File</span>
            </div>
            <div className="text-sm text-red-600">
              The Excel file has no data rows.
            </div>
          </div>,
          { id: toastId, duration: 10000 }
        );
        return;
      }

      const headers = jsonData[0] as string[];

      const siteIndex = 0;
      const nameIndex = 1;
      const dobIndex = 3;
      const dojIndex = 4;
      const contactIndex = 6;
      const bloodGroupIndex = 7;
      const emailIndex = 8;
      const aadharIndex = 9;
      const panIndex = 10;
      const positionIndex = 36;
      const salaryIndex = 37;
      const departmentIndex = 35;
      const accountNumberIndex = 18;
      const ifscIndex = 19;
      const bankNameIndex = 17;
      const fatherNameIndex = 20;
      const motherNameIndex = 21;
      const spouseNameIndex = 22;
      const emergencyContactNameIndex = 23;
      const emergencyContactPhoneIndex = 24;
      const permanentAddressIndex = 13;

      const employeesBySiteAndRole: Map<string, {
        managers: any[],
        supervisors: any[],
        staff: any[],
        rows: number[]
      }> = new Map();

      const employeesToImport = [];
      let processedCount = 0;
      let skippedCount = 0;
      const skippedReasons: string[] = [];
      const invalidSiteNames: Set<string> = new Set();
      const capacityViolations: Array<{ site: string; role: string; count: number; available: number }> = [];

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (!row || row.length === 0) continue;

        const hasData = row.some(cell => cell !== undefined && cell !== null && cell.toString().trim() !== '');
        if (!hasData) continue;

        let siteName = '';
        if (row[siteIndex] !== undefined && row[siteIndex] !== null) {
          siteName = String(row[siteIndex]).trim();
          siteName = siteName.replace(/[^\x20-\x7E]/g, '').trim();
        }

        const position = row[positionIndex] ? String(row[positionIndex]).trim() : '';
        const department = row[departmentIndex] ? String(row[departmentIndex]).trim() : '';

        const isManager = position.toLowerCase().includes('manager') || department.toLowerCase().includes('manager');
        const isSupervisor = position.toLowerCase().includes('supervisor') || department.toLowerCase().includes('supervisor');

        if (!siteName) {
          continue;
        }

        const siteCapacity = siteCapacityMap.get(siteName);
        if (!siteCapacity) {
          continue;
        }

        if (!employeesBySiteAndRole.has(siteName)) {
          employeesBySiteAndRole.set(siteName, { managers: [], supervisors: [], staff: [], rows: [] });
        }

        const siteGroup = employeesBySiteAndRole.get(siteName)!;
        siteGroup.rows.push(i);

        const employeeInfo = {
          row: i,
          siteName,
          position,
          department,
          isManager,
          isSupervisor,
          data: row
        };

        if (isManager) {
          siteGroup.managers.push(employeeInfo);
        } else if (isSupervisor) {
          siteGroup.supervisors.push(employeeInfo);
        } else {
          siteGroup.staff.push(employeeInfo);
        }
      }

      const takenCounts = new Map<string, { managers: number; supervisors: number; staff: number }>();
      const allRows = new Set<number>();
      employeesBySiteAndRole.forEach((group, siteName) => {
        takenCounts.set(siteName, { managers: 0, supervisors: 0, staff: 0 });
        group.rows.forEach(row => allRows.add(row));
      });

      const sortedRows = Array.from(allRows).sort((a, b) => a - b);

      for (const rowIndex of sortedRows) {
        const row = jsonData[rowIndex] as any[];

        const siteName = row[siteIndex] ? String(row[siteIndex]).trim().replace(/[^\x20-\x7E]/g, '').trim() : '';
        const name = row[nameIndex] ? String(row[nameIndex]).trim() : '';
        const aadhar = row[aadharIndex] ? String(row[aadharIndex]).trim().replace(/\s/g, '') : '';
        const position = row[positionIndex] ? String(row[positionIndex]).trim() : '';
        const department = row[departmentIndex] ? String(row[departmentIndex]).trim() : '';

        const dobRaw = row[dobIndex];
        const dojRaw = row[dojIndex];

        const contact = row[contactIndex] ? String(row[contactIndex]).trim() : '';
        const bloodGroup = row[bloodGroupIndex] ? String(row[bloodGroupIndex]).trim() : '';
        const email = row[emailIndex] ? String(row[emailIndex]).trim() : '';
        const pan = row[panIndex] ? String(row[panIndex]).trim().toUpperCase() : '';
        const salaryStr = row[salaryIndex] ? String(row[salaryIndex]).trim() : '';
        const accountNumber = row[accountNumberIndex] ? String(row[accountNumberIndex]).trim() : '';
        const ifscCode = row[ifscIndex] ? String(row[ifscIndex]).trim().toUpperCase() : '';
        const bankName = row[bankNameIndex] ? String(row[bankNameIndex]).trim() : '';
        const fatherName = row[fatherNameIndex] ? String(row[fatherNameIndex]).trim() : '';
        const motherName = row[motherNameIndex] ? String(row[motherNameIndex]).trim() : '';
        const spouseName = row[spouseNameIndex] ? String(row[spouseNameIndex]).trim() : '';
        const emergencyContactName = row[emergencyContactNameIndex] ? String(row[emergencyContactNameIndex]).trim() : '';
        const emergencyContactPhone = row[emergencyContactPhoneIndex] ? String(row[emergencyContactPhoneIndex]).trim() : '';
        const permanentAddress = row[permanentAddressIndex] ? String(row[permanentAddressIndex]).trim() : '';

        if (!siteName) {
          skippedCount++;
          skippedReasons.push(`Row ${rowIndex}: Missing site name`);
          continue;
        }

        const siteCapacity = siteCapacityMap.get(siteName);
        if (!siteCapacity) {
          skippedCount++;
          invalidSiteNames.add(siteName);
          skippedReasons.push(`Row ${rowIndex}: Site "${siteName}" not found in database`);
          continue;
        }

        if (!name || !aadhar) {
          skippedCount++;
          skippedReasons.push(`Row ${rowIndex}: Missing name or aadhar`);
          continue;
        }

        if (!/^\d{12}$/.test(aadhar)) {
          skippedCount++;
          skippedReasons.push(`Row ${rowIndex}: Invalid Aadhar format (${aadhar.length} digits)`);
          continue;
        }

        const isManager = position.toLowerCase().includes('manager') || department.toLowerCase().includes('manager');
        const isSupervisor = position.toLowerCase().includes('supervisor') || department.toLowerCase().includes('supervisor');

        const taken = takenCounts.get(siteName)!;

        if (isManager) {
          if (taken.managers >= siteCapacity.remainingManagers) {
            skippedCount++;
            capacityViolations.push({
              site: siteName,
              role: 'Manager',
              count: 1,
              available: siteCapacity.remainingManagers
            });
            skippedReasons.push(`Row ${rowIndex}: Manager position full for ${siteName}. Only ${siteCapacity.remainingManagers} manager positions available.`);
            continue;
          }
          taken.managers++;
        } else if (isSupervisor) {
          if (taken.supervisors >= siteCapacity.remainingSupervisors) {
            skippedCount++;
            capacityViolations.push({
              site: siteName,
              role: 'Supervisor',
              count: 1,
              available: siteCapacity.remainingSupervisors
            });
            skippedReasons.push(`Row ${rowIndex}: Supervisor position full for ${siteName}. Only ${siteCapacity.remainingSupervisors} supervisor positions available.`);
            continue;
          }
          taken.supervisors++;
        } else {
          if (taken.staff >= siteCapacity.remainingStaff) {
            skippedCount++;
            capacityViolations.push({
              site: siteName,
              role: 'Staff',
              count: 1,
              available: siteCapacity.remainingStaff
            });
            skippedReasons.push(`Row ${rowIndex}: Staff position full for ${siteName}. Only ${siteCapacity.remainingStaff} staff positions available.`);
            continue;
          }
          taken.staff++;
        }

        let dateOfBirth: Date | null = null;
        let dateOfJoining: Date = new Date();

        if (dojRaw !== undefined && dojRaw !== null && dojRaw !== '') {
          try {
            if (dojRaw instanceof Date) {
              dateOfJoining = dojRaw;
            } else if (typeof dojRaw === 'number') {
              dateOfJoining = excelSerialToDate(dojRaw);
            } else if (typeof dojRaw === 'string') {
              const parsed = parseDateString(dojRaw);
              if (parsed) {
                dateOfJoining = parsed;
              } else {
                const testDate = new Date(dojRaw);
                if (!isNaN(testDate.getTime())) {
                  dateOfJoining = testDate;
                }
              }
            }

            if (isNaN(dateOfJoining.getTime())) {
              dateOfJoining = new Date();
            }
          } catch (error) {
            dateOfJoining = new Date();
          }
        }

        if (dobRaw !== undefined && dobRaw !== null && dobRaw !== '') {
          try {
            if (dobRaw instanceof Date) {
              dateOfBirth = dobRaw;
            } else if (typeof dobRaw === 'number') {
              dateOfBirth = excelSerialToDate(dobRaw);
            } else if (typeof dobRaw === 'string') {
              const parsed = parseDateString(dobRaw);
              if (parsed) dateOfBirth = parsed;
            }
          } catch (error) {
            console.warn(`Row ${rowIndex}: Error parsing DOB:`, error);
          }
        }

        const positionToDepartmentMap: Record<string, string> = {
          'ACCOUNTANT': 'Finance',
          'OWC OPERATOR': 'Operations',
          'Security Guard': 'Security',
          'HK STAFF': 'Housekeeping',
          'HK Supervisor': 'Housekeeping',
          'Supervisor': 'Supervisor',
          'Driver': 'Driver',
          'DRIVER': 'Driver',
          'Parking Attendent': 'Parking Management',
          'GATE ATTENDANT': 'Security',
          'PARKING': 'Parking Management',
          'MANAGER': 'Administration',
          'RECEPTIONIST': 'Administration',
          'Bouncer': 'Security',
          'Security SUP': 'Security',
          'Manager': 'Administration',
          'OFFICE STAFF': 'Administration',
          'Admin': 'Administration',
          'HR': 'HR',
          'ACCOUNDEND': 'Finance',
          'OWC Opreter': 'Operations',
          'HK SUPERVISOR': 'Housekeeping',
          'CLEANER': 'Housekeeping',
          'HOUSEKEEPING': 'Housekeeping',
          'SECURITY': 'Security',
          'MAINTENANCE': 'Maintenance',
          'IT STAFF': 'IT',
          'SALES': 'Sales'
        };

        let finalDepartment = department || 'General Staff';
        if (position) {
          const posUpper = position.toUpperCase();
          if (positionToDepartmentMap[posUpper]) {
            finalDepartment = positionToDepartmentMap[posUpper];
          }
        }

        let finalEmail = email;
        if (!email && name) {
          const nameParts = name.toLowerCase().split(' ');
          const firstName = nameParts[0]?.replace(/[^a-z]/g, '') || 'employee';
          const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1].replace(/[^a-z]/g, '') : '';
          const randomNum = Math.floor(100 + Math.random() * 900);
          finalEmail = `${firstName}${lastName ? '.' + lastName : ''}${randomNum}@skenterprises.com`.toLowerCase();
        }

        let finalPhone = contact;
        if (finalPhone) {
          const digits = finalPhone.replace(/\D/g, '');
          if (digits.length === 10) {
            finalPhone = digits;
          } else if (digits.length > 10) {
            finalPhone = digits.slice(-10);
          } else {
            finalPhone = '98' + Math.floor(10000000 + Math.random() * 90000000).toString();
          }
        } else {
          finalPhone = '98' + Math.floor(10000000 + Math.random() * 90000000).toString();
        }

        let salary = 15000;
        if (salaryStr) {
          const cleaned = salaryStr.replace(/[^0-9.]/g, '');
          const parsed = parseFloat(cleaned);
          if (!isNaN(parsed) && parsed > 0) {
            salary = parsed;
          }
        }

        let finalBloodGroup = null;
        if (bloodGroup) {
          const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
          const bgUpper = bloodGroup.trim().toUpperCase();
          if (validBloodGroups.includes(bgUpper)) {
            finalBloodGroup = bgUpper;
          }
        }

        const employeeData = {
          name: name,
          email: finalEmail,
          phone: finalPhone,
          aadharNumber: aadhar,
          dateOfJoining: dateOfJoining,
          department: finalDepartment,
          position: position || 'Employee',
          salary: salary,
          status: 'active',
          role: 'employee',
          siteName: siteName,
          dateOfBirth: dateOfBirth,
          bloodGroup: finalBloodGroup,
          panNumber: pan || null,
          gender: null,
          maritalStatus: null,
          bankName: bankName || null,
          accountNumber: accountNumber || null,
          ifscCode: ifscCode || null,
          branchName: null,
          bankBranch: null,
          permanentAddress: permanentAddress || null,
          permanentPincode: null,
          localAddress: null,
          localPincode: null,
          fatherName: fatherName || null,
          motherName: motherName || null,
          spouseName: spouseName || null,
          numberOfChildren: 0,
          emergencyContactName: emergencyContactName || null,
          emergencyContactPhone: emergencyContactPhone || null,
          emergencyContactRelation: null,
          nomineeName: null,
          nomineeRelation: null,
          esicNumber: null,
          uanNumber: null,
          dateOfExit: null,
          pantSize: null,
          shirtSize: null,
          capSize: null,
          idCardIssued: false,
          westcoatIssued: false,
          apronIssued: false,
          photo: null,
          photoPublicId: null,
          employeeSignature: null,
          employeeSignaturePublicId: null,
          authorizedSignature: null,
          authorizedSignaturePublicId: null,
          siteHistory: [{
            siteName: siteName,
            assignedDate: dateOfJoining instanceof Date ? dateOfJoining.toISOString().split('T')[0] : dateOfJoining
          }],
          kycDocuments: []
        };

        employeesToImport.push(employeeData);
        processedCount++;

        setImportProgress({ current: rowIndex, total: jsonData.length - 1 });

        if (rowIndex % 50 === 0) {
          console.log(`Processed ${rowIndex}/${jsonData.length - 1} rows...`);
        }
      }

      if (employeesToImport.length === 0) {
        let errorMessage = "No valid employees found to import.";
        if (invalidSiteNames.size > 0) {
          errorMessage += ` The following sites do not exist in database: ${Array.from(invalidSiteNames).join(', ')}.`;
          errorMessage += ` Available sites: ${Array.from(siteCapacityMap.keys()).join(', ')}`;
        }
        if (capacityViolations.length > 0) {
          errorMessage += ` ${capacityViolations.length} employees exceeded site capacity.`;
        }
        if (skippedCount > 0) {
          errorMessage += ` Skipped ${skippedCount} rows due to validation errors.`;
        }

        toast.error(
          <div className="space-y-2">
            <div className="flex items-centergap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="font-medium">No Valid Employees Found</span>
            </div>
            <div className="text-sm text-red-600">
              {errorMessage}
            </div>
            {capacityViolations.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  View capacity violations ({capacityViolations.length})
                </summary>
                <div className="mt-2 p-2 bg-yellow-50 rounded max-h-32 overflow-y-auto">
                  {capacityViolations.map((violation, idx) => (
                    <div key={idx} className="text-yellow-700">
                      {violation.site}: {violation.role} position full (only {violation.available} available)
                    </div>
                  ))}
                </div>
              </details>
            )}
            {skippedReasons.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  View skipped rows details ({skippedReasons.length})
                </summary>
                <div className="mt-2 p-2 bg-red-50 rounded max-h-32 overflow-y-auto">
                  {skippedReasons.map((reason, idx) => (
                    <div key={idx} className="text-red-600 truncate">{reason}</div>
                  ))}
                </div>
              </details>
            )}
          </div>,
          { id: toastId, duration: 10000 }
        );
        return;
      }

      toast.loading(
        <div className="space-y-2">
          <div className="flex items-centergap-2">
            <Cloud className="h-4 w-4" />
            <span className="font-medium">Importing {employeesToImport.length} employees...</span>
          </div>
          <div className="text-xs text-muted-foreground">
            This may take a few moments...
          </div>
        </div>,
        { id: toastId }
      );

      let successCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;
      const errorMessages: string[] = [];
      const importedSites: Set<string> = new Set();

      const batchSize = 20;
      for (let batchStart = 0; batchStart < employeesToImport.length; batchStart += batchSize) {
        const batch = employeesToImport.slice(batchStart, batchStart + batchSize);

        for (let i = 0; i < batch.length; i++) {
          const employee = batch[i];

          try {
            const response = await axios.post(`${API_URL}/employees`, employee, {
              timeout: 15000
            });

            if (response.data.success) {
              successCount++;
              importedSites.add(employee.siteName);
            } else {
              errorCount++;
              const errorMsg = response.data.message || 'Unknown error';
              errorMessages.push(`${employee.name}: ${errorMsg}`);

              if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
                duplicateCount++;
              }
            }
          } catch (error: any) {
            errorCount++;
            const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
            errorMessages.push(`${employee.name}: ${errorMsg}`);

            if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
              duplicateCount++;
            }
          }

          setImportProgress({
            current: batchStart + i + 1,
            total: employeesToImport.length
          });
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const actualNewImports = successCount;

      let resultMessage = '';
      if (actualNewImports > 0) {
        resultMessage = `✅ ${actualNewImports} employees imported successfully`;
        if (duplicateCount > 0) {
          resultMessage += `, ⚠️ ${duplicateCount} already existed (skipped)`;
        }
        if (errorCount > duplicateCount) {
          const otherErrors = errorCount - duplicateCount;
          resultMessage += `, ❌ ${otherErrors} failed`;
        }
      } else {
        resultMessage = `❌ No new employees imported. ${duplicateCount} already exist, ${errorCount - duplicateCount} failed.`;
      }

      let siteSummary = '';
      if (importedSites.size > 0) {
        siteSummary = `\nImported to sites: ${Array.from(importedSites).join(', ')}`;
      }

      toast.success(
        <div className="space-y-2">
          <div className="flex items-centergap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="font-medium">Import Complete</span>
          </div>
          <div className="text-sm">
            {resultMessage}
            {siteSummary && <div className="text-xs mt-1 text-muted-foreground">{siteSummary}</div>}
          </div>
          {skippedCount > 0 && (
            <div className="text-xs text-muted-foreground">
              {skippedCount} rows were skipped due to invalid data or site capacity limits
            </div>
          )}
          {invalidSiteNames.size > 0 && (
            <div className="text-xs text-amber-600">
              Invalid sites found: {Array.from(invalidSiteNames).join(', ')}
            </div>
          )}
          {capacityViolations.length > 0 && (
            <div className="text-xs text-amber-600">
              {capacityViolations.length} employees skipped due to site capacity limits
            </div>
          )}
          {errorMessages.length > 0 && errorMessages.length <= 10 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                View error details ({errorMessages.length})
              </summary>
              <div className="mt-2 p-2 bg-red-50 rounded max-h-32 overflow-y-auto">
                {errorMessages.map((msg, idx) => (
                  <div key={idx} className="text-red-600 truncate">{msg}</div>
                ))}
              </div>
            </details>
          )}
        </div>,
        { id: toastId, duration: 10000 }
      );

      await fetchEmployees();
      await fetchSites();
      calculateSiteDeploymentStatus();

      setImportDialogOpen(false);

    } catch (error: any) {
      console.error("Import process failed:", error);
      toast.error(
        <div className="space-y-2">
          <div className="flex items-centergap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="font-medium">Import Failed</span>
          </div>
          <div className="text-sm text-red-600">
            {error.message || "Error processing the file"}
          </div>
        </div>
      );
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  const excelSerialToDate = (serial: number): Date => {
    try {
      const adjustedSerial = serial > 60 ? serial - 1 : serial;
      const utcDays = Math.floor(adjustedSerial - 25569);
      const utcValue = utcDays * 86400 * 1000;
      const date = new Date(utcValue);

      if (serial % 1 !== 0) {
        const fraction = serial % 1;
        const hours = Math.floor(fraction * 24);
        const minutes = Math.floor((fraction * 24 * 60) % 60);
        const seconds = Math.floor((fraction * 24 * 60 * 60) % 60);
        date.setHours(hours, minutes, seconds);
      }

      return date;
    } catch (error) {
      console.error('Error converting Excel date:', serial, error);
      return new Date();
    }
  };

  const parseDateString = (dateStr: string): Date | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;

    try {
      const cleanStr = dateStr.trim();

      const usFormat = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const usMatch = cleanStr.match(usFormat);
      if (usMatch) {
        const month = parseInt(usMatch[1]) - 1;
        const day = parseInt(usMatch[2]);
        const year = parseInt(usMatch[3]);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      const euFormat = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const euMatch = cleanStr.match(euFormat);
      if (euMatch) {
        const day = parseInt(euMatch[1]);
        const month = parseInt(euMatch[2]) - 1;
        const year = parseInt(euMatch[3]);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      const isoFormat = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
      const isoMatch = cleanStr.match(isoFormat);
      if (isoMatch) {
        const year = parseInt(isoMatch[1]);
        const month = parseInt(isoMatch[2]) - 1;
        const day = parseInt(isoMatch[3]);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      const date = new Date(cleanStr);
      if (!isNaN(date.getTime())) {
        return date;
      }

      return null;
    } catch (error) {
      console.error('Error parsing date string:', dateStr, error);
      return null;
    }
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
  };

  const clearFilters = () => {
    setSelectedDepartment("all");
    setSelectedSite("all");
    setSelectedJoinDate("");
    setSortBy("");
    setSearchTerm("");
  };

  const handleViewDocuments = (employee: ExtendedEmployee) => {
    setSelectedEmployeeForDocuments(employee);
    setDocumentsDialogOpen(true);
  };

  const handleOpenEPFForm11 = (employee: ExtendedEmployee) => {
    setSelectedEmployeeForEPF(employee);

    setEpfFormData({
      memberName: employee.name || "",
      fatherOrSpouseName: employee.fatherName || employee.spouseName || "",
      relationshipType: employee.fatherName ? "father" : "spouse",
      dateOfBirth: employee.dateOfBirth || "",
      gender: employee.gender || "",
      maritalStatus: employee.maritalStatus || "",
      email: employee.email || "",
      mobileNumber: employee.phone || "",
      previousEPFMember: false,
      previousPensionMember: false,
      previousUAN: employee.uan || "",
      previousPFAccountNumber: "",
      dateOfExit: "",
      schemeCertificateNumber: "",
      pensionPaymentOrder: "",
      internationalWorker: false,
      countryOfOrigin: "",
      passportNumber: "",
      passportValidityFrom: "",
      passportValidityTo: "",
      bankAccountNumber: employee.accountNumber || "",
      ifscCode: employee.ifscCode || "",
      aadharNumber: employee.aadharNumber || "",
      panNumber: employee.panNumber || "",
      firstEPFMember: true,
      enrolledDate: employee.joinDate || new Date().toISOString().split("T")[0],
      firstEmploymentWages: employee.salary?.toString() || "0",
      epfMemberBeforeSep2014: false,
      epfAmountWithdrawn: false,
      epsAmountWithdrawn: false,
      epsAmountWithdrawnAfterSep2014: false,
      declarationDate: new Date().toISOString().split("T")[0],
      declarationPlace: "Mumbai",
      employerDeclarationDate: new Date().toISOString().split("T")[0],
      employerName: "SK ENTERPRISES",
      pfNumber: employee.uan || "",
      kycStatus: "not_uploaded",
      transferRequestGenerated: false,
      physicalClaimFiled: false
    });

    setEpfForm11DialogOpen(true);
  };

  const handleEPFFormChange = (field: keyof EPFForm11Data, value: any) => {
    setEpfFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEPFForm = async () => {
    if (!epfFormData.memberName || !epfFormData.aadharNumber || !selectedEmployeeForEPF) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setIsSavingEPF(true);
      const employeeId = selectedEmployeeForEPF.id || selectedEmployeeForEPF._id;

      const response = await fetch(`${API_URL}/epf-forms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...epfFormData,
          employeeId: employeeId,
          firstEmploymentWages: parseFloat(epfFormData.firstEmploymentWages) || 0,
          enrolledDate: new Date(epfFormData.enrolledDate || selectedEmployeeForEPF.joinDate),
          declarationDate: new Date(epfFormData.declarationDate),
          employerDeclarationDate: new Date(epfFormData.employerDeclarationDate)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save EPF Form");
      }

      if (data.success) {
        toast.success("EPF Form saved successfully!");
        setEpfForm11DialogOpen(false);
        setSelectedEmployeeForEPF(null);
      } else {
        toast.error(data.message || "Failed to save EPF Form");
      }
    } catch (error: any) {
      console.error("Error saving EPF Form:", error);
      toast.error(error.message || "Error saving EPF Form");
    } finally {
      setIsSavingEPF(false);
    }
  };

  const handlePrintEPFForm = () => {
    if (!selectedEmployeeForEPF) {
      toast.error("No employee selected");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow popups to print forms");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>EPF Form 11 - ${epfFormData.memberName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              font-size: 12px;
              line-height: 1.4;
            }
            .form-container { 
              max-width: 800px; 
              margin: 0 auto; 
              border: 1px solid #000;
              padding: 20px;
              position: relative;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .header h2 {
              margin: 0;
              font-size: 16px;
              font-weight: bold;
            }
            .header h3 {
              margin: 5px 0;
              font-size: 14px;
              font-weight: normal;
            }
            .subtitle {
              font-size: 10px;
              margin-top: 5px;
              font-style: italic;
            }
            .section { 
              margin-bottom: 20px; 
            }
            .section-title { 
              background: #f0f0f0; 
              padding: 8px; 
              font-weight: bold;
              border: 1px solid #000;
              margin-bottom: 10px;
              font-size: 11px;
            }
            .field-row {
              display: flex;
              margin-bottom: 8px;
              align-items: flex-start;
            }
            .field-group {
              display: flex;
              flex-direction: column;
              margin-right: 20px;
              flex: 1;
            }
            .label { 
              font-weight: bold; 
              margin-bottom: 2px;
              font-size: 10px;
            }
            .value { 
              min-height: 18px;
              border-bottom: 1px solid #000;
              padding: 2px 5px;
              flex: 1;
            }
            .checkbox-group {
              display: flex;
              align-items: center;
              margin-right: 15px;
            }
            .checkbox {
              margin-right: 5px;
            }
            .full-width {
              width: 100%;
            }
            .half-width {
              width: 48%;
            }
            .quarter-width {
              width: 24%;
            }
            .signature-area { 
              margin-top: 30px; 
              border-top: 1px solid #000; 
              padding-top: 15px;
            }
            .signature-line {
              display: inline-block;
              width: 200px;
              border-bottom: 1px solid #000;
              margin: 0 10px;
            }
            .declaration {
              margin: 20px 0;
              padding: 15px;
              border: 1px solid #000;
              background: #f9f9f9;
            }
            .declaration p {
              margin: 5px 0;
              font-size: 11px;
            }
            .note {
              font-size: 10px;
              font-style: italic;
              color: #666;
              margin-top: 3px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .form-container { border: none; padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="form-container">
            <div class="header">
              <h2>New Form : 11 - Declaration Form</h2>
              <h3>(To be retained by the employer for future reference)</h3>
              <div class="subtitle">EMPLOYEES' PROVIDENT FUND ORGANISATION</div>
              <div class="subtitle">Employees' Provident Fund Scheme, 1952 (Paragraph 34 & 57) and Employees' Pension Scheme, 1995 (Paragraph 24)</div>
              <div class="subtitle">(Declaration by a person taking up Employment in any Establishment on which EPF Scheme, 1952 and for EPS, 1995 is applicable)</div>
            </div>
            <div class="section">
              <div class="section-title">1. EMPLOYEE DETAILS</div>
              <div class="field-row">
                <div class="field-group half-width">
                  <span class="label">Name of Member (Aadhar Name)</span>
                  <span class="value">${epfFormData.memberName}</span>
                </div>
                <div class="field-group half-width">
                  <span class="label">Father's Name / Spouse's Name</span>
                  <span class="value">${epfFormData.fatherOrSpouseName}</span>
                </div>
              </div>
              <div class="field-row">
                <div class="field-group half-width">
                  <span class="label">Date of Birth</span>
                  <span class="value">${epfFormData.dateOfBirth}</span>
                </div>
                <div class="field-group half-width">
                  <span class="label">Gender</span>
                  <span class="value">${epfFormData.gender}</span>
                </div>
              </div>
              <div class="field-row">
                <div class="field-group half-width">
                  <span class="label">Marital Status</span>
                  <span class="value">${epfFormData.maritalStatus}</span>
                </div>
                <div class="field-group half-width">
                  <span class="label">eMail ID</span>
                  <span class="value">${epfFormData.email}</span>
                </div>
              </div>
              <div class="field-row">
                <div class="field-group half-width">
                  <span class="label">Mobile No (Aadhar Registered)</span>
                  <span class="value">${epfFormData.mobileNumber}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">2. PREVIOUS MEMBERSHIP DETAILS</div>
              <div class="field-row">
                <div class="field-group">
                  <span class="label">Whether earlier member of EPF Scheme, 1952 ?</span>
                  <span class="value">${epfFormData.previousEPFMember ? 'Yes' : 'No'}</span>
                </div>
                <div class="field-group">
                  <span class="label">Whether earlier member of EPS, 1995 ?</span>
                  <span class="value">${epfFormData.previousPensionMember ? 'Yes' : 'No'}</span>
                </div>
              </div>
              ${epfFormData.previousEPFMember || epfFormData.previousPensionMember ? `
              <div class="field-row">
                <div class="field-group">
                  <span class="label">Universal Account Number (UAN)</span>
                  <span class="value">${epfFormData.previousUAN}</span>
                </div>
                <div class="field-group">
                  <span class="label">Previous PF Account Number</span>
                  <span class="value">${epfFormData.previousPFAccountNumber}</span>
                </div>
              </div>
              <div class="field-row">
                <div class="field-group">
                  <span class="label">Date of Exit from previous Employment</span>
                  <span class="value">${epfFormData.dateOfExit}</span>
                </div>
                <div class="field-group">
                  <span class="label">Scheme Certificate No (If issued)</span>
                  <span class="value">${epfFormData.schemeCertificateNumber}</span>
                </div>
              </div>
              <div class="field-row">
                <div class="field-group">
                  <span class="label">Pension Payment Order (PPO) (If issued)</span>
                  <span class="value">${epfFormData.pensionPaymentOrder}</span>
                </div>
              </div>
              ` : ''}
            </div>

            <div class="section">
              <div class="section-title">3. INTERNATIONAL WORKER DETAILS</div>
              <div class="field-row">
                <div class="field-group">
                  <span class="label">International Worker</span>
                  <span class="value">${epfFormData.internationalWorker ? 'Yes' : 'No'}</span>
                </div>
                ${epfFormData.internationalWorker ? `
                <div class="field-group">
                  <span class="label">Country of Origin</span>
                  <span class="value">${epfFormData.countryOfOrigin}</span>
                </div>
                <div class="field-group">
                  <span class="label">Passport No.</span>
                  <span class="value">${epfFormData.passportNumber}</span>
                </div>
              </div>
              <div class="field-row">
                <div class="field-group">
                  <span class="label">Passport Validity From</span>
                  <span class="value">${epfFormData.passportValidityFrom}</span>
                </div>
                <div class="field-group">
                  <span class="label">Passport Validity To</span>
                  <span class="value">${epfFormData.passportValidityTo}</span>
                </div>
              </div>
              ` : ''}
            </div>

            <div class="section">
              <div class="section-title">4. KYC DETAILS</div>
              <div class="field-row">
                <div class="field-group">
                  <span class="label">Bank Account No.</span>
                  <span class="value">${epfFormData.bankAccountNumber}</span>
                </div>
                <div class="field-group">
                  <span class="label">IFSC Code</span>
                  <span class="value">${epfFormData.ifscCode}</span>
                </div>
              </div>
              <div class="field-row">
                <div class="field-group">
                  <span class="label">Aadhar Number</span>
                  <span class="value">${epfFormData.aadharNumber}</span>
                </div>
                <div class="field-group">
                  <span class="label">PAN Number</span>
                  <span class="value">${epfFormData.panNumber}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">5. DECLARATION DETAILS</div>
              <div class="field-row">
                <div class="field-group">
                  <span class="label">First EPF Member</span>
                  <span class="value">${epfFormData.firstEPFMember ? 'Yes' : 'No'}</span>
                </div>
                <div class="field-group">
                  <span class="label">Enrolled Date</span>
                  <span class="value">${epfFormData.enrolledDate}</span>
                </div>
                <div class="field-group">
                  <span class="label">First Employment EPF Wages</span>
                  <span class="value">${epfFormData.firstEmploymentWages}</span>
                </div>
              </div>
              <div class="field-row">
                <div class="field-group">
                  <span class="label">EPF Member before 01/09/2014</span>
                  <span class="value">${epfFormData.epfMemberBeforeSep2014 ? 'Yes' : 'No'}</span>
                </div>
                <div class="field-group">
                  <span class="label">EPF Amount Withdrawn</span>
                  <span class="value">${epfFormData.epfAmountWithdrawn ? 'Yes' : 'No'}</span>
                </div>
                <div class="field-group">
                  <span class="label">EPS Amount Withdrawn</span>
                  <span class="value">${epfFormData.epsAmountWithdrawn ? 'Yes' : 'No'}</span>
                </div>
                <div class="field-group">
                  <span class="label">EPS Amount Withdrawn after Sep 2014</span>
                  <span class="value">${epfFormData.epsAmountWithdrawnAfterSep2014 ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">6. EMPLOYER DECLARATION</div>
              <div class="field-row">
                <div class="field-group">
                  <span class="label">Date</span>
                  <span class="value">${epfFormData.employerDeclarationDate}</span>
                </div>
                <div class="field-group">
                  <span class="label">Place</span>
                  <span class="value">${epfFormData.declarationPlace}</span>
                </div>
              </div>
              <div class="field-row">
                <div class="field-group">
                  <span class="label">Employer Name</span>
                  <span class="value">${epfFormData.employerName}</span>
                </div>
                <div class="field-group">
                  <span class="label">PF Number</span>
                  <span class="value">${epfFormData.pfNumber}</span>
                </div>
              </div>
              <div class="field-row">
                <div class="field-group">
                  <span class="label">KYC Status</span>
                  <span class="value">${epfFormData.kycStatus}</span>
                </div>
                <div class="field-group">
                  <span class="label">Transfer Request Generated</span>
                  <span class="value">${epfFormData.transferRequestGenerated ? 'Yes' : 'No'}</span>
                </div>
                <div class="field-group">
                  <span class="label">Physical Claim Filed</span>
                  <span class="value">${epfFormData.physicalClaimFiled ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            <div class="signature-area">
              <div class="field-row">
                <div class="field-group">
                  <span class="label">Employee Signature</span>
                  <span class="value">________________</span>
                </div>
                <div class="field-group">
                  <span class="label">Employer Signature</span>
                  <span class="value">________________</span>
                </div>
              </div>
              <div class="field-row">
                <div class="field-group">
                  <span class="label">Date</span>
                  <span class="value">${epfFormData.declarationDate}</span>
                </div>
                <div class="field-group">
                  <span class="label">Place</span>
                  <span class="value">${epfFormData.declarationPlace}</span>
                </div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getPhotoUrl = (employee: ExtendedEmployee): string => {
    if (!employee.photo) {
      return "";
    }

    if (typeof employee.photo === 'string') {
      if (employee.photo.startsWith('data:image')) {
        return employee.photo;
      }

      if (employee.photo.includes('cloudinary.com')) {
        if (employee.photo.includes('/image/upload/')) {
          if (!employee.photo.includes('w_') && !employee.photo.includes('h_')) {
            return employee.photo.replace('/image/upload/', '/image/upload/w_200,h_200,c_fill,q_auto/');
          }
          return employee.photo;
        }
        return employee.photo;
      }

      if (employee.photo.startsWith('http')) {
        return employee.photo;
      }

      if (employee.photo.startsWith('/')) {
        return `${API_URL.replace('/api', '')}${employee.photo}`;
      }

      return employee.photo;
    }

    return "";
  };

  // ─── Mobile Employee Card Component ────────────────────────────────────

  // ─── Mobile Employee Card Component ────────────────────────────────────

  const MobileEmployeeCard = ({ employee, selected, onSelect, onEdit, onViewHistory, onUpload, onViewDocs, onEPF, onMarkLeft, onDelete, onViewID, onDownloadID }: any) => {
    const [expanded, setExpanded] = useState(false);
    const photoUrl = getPhotoUrl(employee);

    return (
      <div className="border rounded-lg p-3 mb-2 bg-white shadow-sm">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(employee.id || employee._id)}
            className="mt-1 h-4 w-4 rounded border-gray-300"
          />
          {photoUrl ? (
            <img src={photoUrl} alt={employee.name} className="w-10 h-10 rounded-full object-cover border flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-gray-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-semibold text-sm truncate max-w-[120px]">{employee.name}</span>
              {employee.status === 'left' && <Badge variant="destructive" className="text-[10px]">Left</Badge>}
              {employee.isManager && <Badge className="bg-amber-100 text-amber-800 text-[10px]">Mgr</Badge>}
              {employee.isSupervisor && <Badge className="bg-teal-100 text-teal-800 text-[10px]">Supv</Badge>}
            </div>
            <div className="text-xs text-muted-foreground truncate">{employee.employeeId} • {employee.department}</div>
            <div className="text-xs text-muted-foreground truncate">{employee.position} • {employee.siteName || 'No site'}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
              <span>Joining: {employee.joinDate}</span>
              <span>•</span>
              <span>₹{employee.salary.toLocaleString()}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {employee.panNumber && <Badge variant="outline" className="text-[10px]">PAN</Badge>}
              {employee.uan && <Badge variant="outline" className="text-[10px]">UAN</Badge>}
              {employee.esicNumber && <Badge variant="outline" className="text-[10px]">ESIC</Badge>}
              {(employee.photo || employee.photoPublicId) && <Badge variant="outline" className="text-[10px]"><Camera className="h-3 w-3 mr-0.5" />Photo</Badge>}
              {employee.kycDocuments?.length > 0 && <Badge variant="outline" className="text-[10px] bg-blue-50">KYC</Badge>}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {expanded && (
          <div className="mt-2 pt-2 border-t">
            {/* Row 1: Edit and Register Face - side by side */}
            <div className="grid grid-cols-2 gap-1 mb-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onEdit(employee)}>
                <Edit className="h-3 w-3 mr-1" />Edit
              </Button>
              <div className="w-full">
                <FaceRegisterButton
                  employeeId={employee._id || employee.id || ''}
                  employeeName={employee.name}
                  currentEmbeddingDim={(employee as any).faceEmbeddings?.[0]?.length}
                />
              </div>
            </div>

            {/* Row 2: History, Upload, Docs */}
            <div className="grid grid-cols-3 gap-1 mb-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onViewHistory(employee)}>
                <History className="h-3 w-3 mr-1" />History
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onUpload(employee)}>
                <Upload className="h-3 w-3 mr-1" />Upload
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onViewDocs(employee)}>
                <Files className="h-3 w-3 mr-1" />Docs
              </Button>
            </div>

            {/* Row 3: ID, ID Card, EPF 11 */}
            <div className="grid grid-cols-3 gap-1 mb-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onViewID(employee)}>
                <Eye className="h-3 w-3 mr-1" />ID
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onDownloadID(employee)}>
                <Download className="h-3 w-3 mr-1" />ID Card
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onEPF(employee)}>
                <FileText className="h-3 w-3 mr-1" />EPF 11
              </Button>
            </div>

            {/* Row 4: Mark Left and Delete */}
            <div className="grid grid-cols-2 gap-1">
              {employee.status !== 'left' && (
                <Button variant="outline" size="sm" className="h-7 text-xs text-amber-600" onClick={() => onMarkLeft(employee)}>
                  Mark Left
                </Button>
              )}
              <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => onDelete(employee.id || employee._id)}>
                <Trash2 className="h-3 w-3 mr-1" />Delete
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };
  // ─── ID Card Functions ──────────────────────────────────────────────────

  const generateIDCard = (employee: ExtendedEmployee) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to generate ID card");
      return;
    }

    const photoUrl = getPhotoUrl(employee);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ID Card - ${employee.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #f5f5f5;
            }
            .id-card {
              width: 350px;
              background: white;
              border-radius: 15px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.3);
              overflow: hidden;
              border: 2px solid #e11d48;
            }
            .header {
              background: linear-gradient(135deg, #e11d48, #be123c);
              color: white;
              padding: 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: bold;
            }
            .header .subtitle {
              font-size: 12px;
              opacity: 0.9;
            }
            .photo-section {
              padding: 20px;
              text-align: center;
              background: white;
            }
            .employee-photo {
              width: 120px;
              height: 120px;
              border-radius: 50%;
              border: 3px solid #e11d48;
              object-fit: cover;
              margin: 0 auto;
              background: #f5f5f5;
            }
            .no-photo {
              width: 120px;
              height: 120px;
              border-radius: 50%;
              border: 3px solid #e11d48;
              background: #ccc;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #666;
              font-size: 14px;
              margin: 0 auto;
            }
            .details {
              padding: 20px;
              background: white;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              padding: 4px 0;
              border-bottom: 1px solid #f0f0f0;
            }
            .label {
              font-weight: bold;
              color: #666;
              font-size: 12px;
            }
            .value {
              color: #333;
              font-size: 12px;
            }
            .footer {
              background: #f8f9fa;
              padding: 15px;
              text-align: center;
              border-top: 1px solid #e9ecef;
            }
            .signature {
              margin-top: 10px;
              border-top: 1px solid #ccc;
              padding-top: 5px;
              font-size: 10px;
              color: #666;
            }
            @media print {
              body { background: white; }
              .id-card { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="id-card">
            <div class="header">
              <h1>SK ENTERPRISES</h1>
              <div class="subtitle">ID CARD</div>
            </div>
            <div class="photo-section">
              ${photoUrl
        ? `<img src="${photoUrl}" alt="Employee Photo" class="employee-photo" onerror="this.style.display='none'; document.getElementById('no-photo').style.display='flex';" />` +
        `<div id="no-photo" class="no-photo" style="display: none;">No Photo</div>`
        : '<div class="no-photo">No Photo</div>'
      }
            </div>
            <div class="details">
              <div class="detail-row">
                <span class="label">Name:</span>
                <span class="value">${employee.name}</span>
              </div>
              <div class="detail-row">
                <span class="label">Employee ID:</span>
                <span class="value">${employee.employeeId}</span>
              </div>
              <div class="detail-row">
                <span class="label">Department:</span>
                <span class="value">${employee.department}</span>
              </div>
              <div class="detail-row">
                <span class="label">Position:</span>
                <span class="value">${employee.position}</span>
              </div>
              <div class="detail-row">
                <span class="label">Blood Group:</span>
                <span class="value">${employee.bloodGroup || "N/A"}</span>
              </div>
              <div class="detail-row">
                <span class="label">Join Date:</span>
                <span class="value">${employee.joinDate}</span>
              </div>
            </div>
            <div class="footer">
              <div>Authorized Signature</div>
              <div class="signature">This card is property of SK Enterprises</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadIDCard = (employee: ExtendedEmployee) => {
    generateIDCard(employee);
    toast.success(`ID Card downloaded for ${employee.name}`);
  };

  const downloadNomineeForm = (employee: ExtendedEmployee) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to generate forms");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Nominee Form - ${employee.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .form-container { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 25px; }
            .section-title { background: #f0f0f0; padding: 10px; font-weight: bold; }
            .field { margin-bottom: 10px; }
            .label { font-weight: bold; display: inline-block; width: 200px; }
            .signature-area { margin-top: 50px; border-top: 1px solid #000; padding-top: 10px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="form-container">
            <div class="header">
              <h2>SK ENTERPRISES</h2>
              <h3>Nomination Form for Provident Fund</h3>
            </div>
            
            <div class="section">
              <div class="section-title">Employee Details</div>
              <div class="field"><span class="label">Name:</span> ${employee.name}</div>
              <div class="field"><span class="label">Employee ID:</span> ${employee.employeeId}</div>
              <div class="field"><span class="label">UAN Number:</span> ${employee.uan}</div>
              <div class="field"><span class="label">Department:</span> ${employee.department}</div>
            </div>

            <div class="section">
              <div class="section-title">Nominee Details</div>
              <div class="field"><span class="label">Nominee Name:</span> ${employee.nomineeName || "________________"}</div>
              <div class="field"><span class="label">Relationship:</span> ${employee.nomineeRelation || "________________"}</div>
              <div class="field"><span class="label">Date of Birth:</span> ________________</div>
              <div class="field"><span class="label">Address:</span> ________________</div>
              <div class="field"><span class="label">Share Percentage:</span> ________________</div>
            </div>

            <div class="section">
              <div class="section-title">Guardian Details (if nominee is minor)</div>
              <div class="field"><span class="label">Guardian Name:</span> ________________</div>
              <div class="field"><span class="label">Relationship:</span> ________________</div>
              <div class="field"><span class="label">Address:</span> ________________</div>
            </div>

            <div class="signature-area">
              <div class="field">
                <span class="label">Employee Signature:</span> ________________
              </div>
              <div class="field">
                <span class="label">Date:</span> ________________
              </div>
              <div class="field">
                <span class="label">Employer Signature:</span> ________________
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(`Nominee Form generated for ${employee.name}`);
  };

  const downloadPFForm = (employee: ExtendedEmployee) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to generate forms");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PF Declaration Form - ${employee.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .form-container { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 25px; }
            .section-title { background: #f0f0f0; padding: 10px; font-weight: bold; }
            .field { margin-bottom: 10px; }
            .label { font-weight: bold; display: inline-block; width: 250px; }
            .signature-area { margin-top: 50px; border-top: 1px solid #000; padding-top: 10px; }
            .declaration { margin: 20px 0; padding: 15px; border: 1px solid #000; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="form-container">
            <div class="header">
              <h2>SK ENTERPRISES</h2>
              <h3>Provident Fund Declaration Form</h3>
            </div>
            
            <div class="section">
              <div class="section-title">Employee Information</div>
              <div class="field"><span class="label">Full Name:</span> ${employee.name}</div>
              <div class="field"><span class="label">Employee ID:</span> ${employee.employeeId}</div>
              <div class="field"><span class="label">UAN Number:</span> ${employee.uan}</div>
              <div class="field"><span class="label">Date of Joining:</span> ${employee.joinDate}</div>
              <div class="field"><span class="label">Department:</span> ${employee.department}</div>
              <div class="field"><span class="label">Designation:</span> ${employee.position}</div>
              <div class="field"><span class="label">Basic Salary:</span> ₹${employee.salary}</div>
            </div>

            <div class="section">
              <div class="section-title">Previous PF Details (if any)</div>
              <div class="field"><span class="label">Previous UAN:</span> ________________</div>
              <div class="field"><span class="label">Previous Employer:</span> ________________</div>
              <div class="field"><span class="label">PF Account Number:</span> ________________</div>
            </div>

            <div class="section">
              <div class="section-title">Bank Account Details</div>
              <div class="field"><span class="label">Bank Name:</span> ${employee.bankName || "________________"}</div>
              <div class="field"><span class="label">Account Number:</span> ${employee.accountNumber || "________________"}</div>
              <div class="field"><span class="label">IFSC Code:</span> ${employee.ifscCode || "________________"}</div>
            </div>

            <div class="declaration">
              <p><strong>Declaration:</strong></p>
              <p>I hereby declare that the information provided above is true and correct to the best of my knowledge. I agree to contribute to the Provident Fund as per the rules and regulations.</p>
            </div>

            <div class="signature-area">
              <div class="field">
                <span class="label">Employee Signature:</span> ________________
              </div>
              <div class="field">
                <span class="label">Date:</span> ________________
              </div>
              <div class="field">
                <span class="label">Witness Signature:</span> ________________
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(`PF Form generated for ${employee.name}`);
  };

  const downloadESICForm = (employee: ExtendedEmployee) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to generate forms");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ESIC Form - ${employee.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .form-container { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 25px; }
            .section-title { background: #f0f0f0; padding: 10px; font-weight: bold; }
            .field { margin-bottom: 10px; }
            .label { font-weight: bold; display: inline-block; width: 250px; }
            .signature-area { margin-top: 50px; border-top: 1px solid #000; padding-top: 10px; }
            .family-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .family-table th, .family-table td { border: 1px solid #000; padding: 8px; text-align: left; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="form-container">
            <div class="header">
              <h2>SK ENTERPRISES</h2>
              <h3>ESIC Family Declaration Form</h3>
            </div>
            
            <div class="section">
              <div class="section-title">Employee Details</div>
              <div class="field"><span class="label">Name:</span> ${employee.name}</div>
              <div class="field"><span class="label">ESIC Number:</span> ${employee.esicNumber}</div>
              <div class="field"><span class="label">Employee ID:</span> ${employee.employeeId}</div>
              <div class="field"><span class="label">Date of Birth:</span> ${employee.dateOfBirth || "________________"}</div>
              <div class="field"><span class="label">Gender:</span> ________________</div>
              <div class="field"><span class="label">Marital Status:</span> ________________</div>
            </div>

            <div class="section">
              <div class="section-title">Family Details</div>
              <table class="family-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Relationship</th>
                    <th>Date of Birth</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  ${employee.fatherName ? `<tr><td>${employee.fatherName}</td><td>Father</td><td>________________</td><td>________________</td></tr>` : ""}
                  ${employee.motherName ? `<tr><td>${employee.motherName}</td><td>Mother</td><td>________________</td><td>________________</td></tr>` : ""}
                  ${employee.spouseName ? `<tr><td>${employee.spouseName}</td><td>Spouse</td><td>________________</td><td>________________</td></tr>` : ""}
                  ${employee.numberOfChildren ? Array(parseInt(employee.numberOfChildren) || 0).fill(0).map((_, i) =>
      `<tr><td>________________</td><td>Child ${i + 1}</td><td>________________</td><td>________________</td></tr>`
    ).join("") : ""}
                </tbody>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Nominee for Dependants Benefit</div>
              <div class="field"><span class="label">Nominee Name:</span> ${employee.nomineeName || "________________"}</div>
              <div class="field"><span class="label">Relationship:</span> ${employee.nomineeRelation || "________________"}</div>
              <div class="field"><span class="label">Address:</span> ________________</div>
            </div>

            <div class="signature-area">
              <div class="field">
                <span class="label">Employee Signature:</span> ________________
              </div>
              <div class="field">
                <span class="label">Date:</span> ________________
              </div>
              <div class="field">
                <span class="label">Employer Signature:</span> ________________
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(`ESIC Form generated for ${employee.name}`);
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ─── Import progress banner ──────────────────────────────────── */}
      {isImporting && importProgress.total > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-semibold text-sm">Importing to Database</h4>
                    <p className="text-xs text-muted-foreground">
                      Validating sites, checking capacity, and saving employees...
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="sm:ml-0 w-fit">
                  {importProgress.current}/{importProgress.total}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round((importProgress.current / importProgress.total) * 100)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Loading overlay ────────────────────────────────────────── */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg mx-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-center">Loading employees...</p>
          </div>
        </div>
      )}

      {/* ─── Error banner ────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
            <span className="text-red-700 font-medium break-words">{error}</span>
          </div>
          <button
            onClick={() => {
              setError(null);
              fetchEmployees();
            }}
            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ─── Top controls ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search employees..."
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="department">Department</SelectItem>
              <SelectItem value="site">Site</SelectItem>
              <SelectItem value="joinDate">Join Date</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => setBulkSiteDialogOpen(true)}
              disabled={selectedEmployees.length === 0}
              className={`flex-1 sm:flex-none ${selectedEmployees.length > 0 ? "border-blue-500 text-blue-600" : ""}`}
            >
              <Users className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Assign Site </span>
              {selectedEmployees.length > 0 && `(${selectedEmployees.length})`}
            </Button>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(true)}
              disabled={selectedEmployees.length === 0}
              className={`flex-1 sm:flex-none ${selectedEmployees.length > 0 ? "border-red-500 text-red-600 hover:bg-red-50" : ""}`}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Bulk Delete </span>
              {selectedEmployees.length > 0 && `(${selectedEmployees.length})`}
            </Button>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
              className="flex-1 sm:flex-none"
              disabled={isImporting}
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              {isImporting ? "Importing..." : "Import"}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportEmployees}
              className="flex-1 sm:flex-none"
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              {isExporting ? "Exporting..." : "Export"}
            </Button>
            <Button onClick={() => setActiveTab?.("onboarding")} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Add Employee</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Filters ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSite} onValueChange={setSelectedSite}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by Site" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {allSiteNames.map(site => (
              <SelectItem key={site} value={site}>{site}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Input
            type="date"
            value={selectedJoinDate}
            onChange={(e) => setSelectedJoinDate(e.target.value)}
            placeholder="Filter by Join Date"
            className="w-full pr-10"
          />
          <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>

        <Button variant="outline" onClick={clearFilters} className="w-full">
          Clear Filters
        </Button>
      </div>

      {/* ─── Import Dialog ────────────────────────────────────────────── */}
      <ExcelImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImportEmployees}
        loading={isImporting}
      />

      {/* ─── Document Upload Dialog ──────────────────────────────────── */}
      <Dialog open={documentUploadDialogOpen} onOpenChange={setDocumentUploadDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5 text-blue-600" />
              Upload KYC Documents - {selectedEmployeeForDocumentUpload?.name}
            </DialogTitle>
            <DialogDescription>
              Employee ID: {selectedEmployeeForDocumentUpload?.employeeId} | Department: {selectedEmployeeForDocumentUpload?.department}
            </DialogDescription>
          </DialogHeader>

          {selectedEmployeeForDocumentUpload && (
            <DocumentUpload
              employeeId={selectedEmployeeForDocumentUpload.id || selectedEmployeeForDocumentUpload._id || ''}
              employeeName={selectedEmployeeForDocumentUpload.name}
              existingDocuments={selectedEmployeeForDocumentUpload.kycDocuments || []}
              onDocumentUploaded={() => {
                handleDocumentUploaded();
                const updatedEmp = employees.find(e =>
                  (e.id === selectedEmployeeForDocumentUpload.id || e._id === selectedEmployeeForDocumentUpload._id)
                );
                if (updatedEmp) {
                  setSelectedEmployeeForDocumentUpload(updatedEmp);
                }
              }}
            />
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setDocumentUploadDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── EPF Form 11 Dialog ──────────────────────────────────────── */}
      <Dialog open={epfForm11DialogOpen} onOpenChange={setEpfForm11DialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              EPF Form 11 - Declaration Form
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              For Employee: <span className="font-semibold">{selectedEmployeeForEPF?.name}</span>
              | Employee ID: <span className="font-semibold">{selectedEmployeeForEPF?.employeeId}</span>
            </p>
          </DialogHeader>

          <div className="space-y-6">
            <div className="text-center border-b-2 border-black pb-4">
              <h2 className="text-xl font-bold">New Form : 11 - Declaration Form</h2>
              <p className="text-sm">(To be retained by the employer for future reference)</p>
              <p className="text-xs font-semibold">EMPLOYEES' PROVIDENT FUND ORGANISATION</p>
              <p className="text-xs">Employees' Provident Fund Scheme, 1952 (Paragraph 34 & 57) and Employees' Pension Scheme, 1995 (Paragraph 24)</p>
              <p className="text-xs">(Declaration by a person taking up Employment in any Establishment on which EPF Scheme, 1952 and for EPS, 1995 is applicable)</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 a1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Auto-filled from Employee Record</h3>
                  <div className="mt-2 text-xs text-blue-700">
                    <p>Fields marked with <span className="font-semibold">(Auto-filled)</span> are automatically populated from the employee's onboarding data.</p>
                    <p className="mt-1">Please review all information before saving.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="memberName">
                  1. Name of Member (Aadhar Name) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="memberName"
                    value={epfFormData.memberName}
                    onChange={(e) => handleEPFFormChange('memberName', e.target.value)}
                    placeholder="Enter full name as per Aadhar"
                    className="bg-gray-50 pr-20"
                    required
                  />
                  <div className="absolute right-2 top-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fatherOrSpouseName">
                  2. Father's Name / Spouse's Name
                </Label>
                <div className="relative">
                  <Input
                    id="fatherOrSpouseName"
                    value={epfFormData.fatherOrSpouseName}
                    onChange={(e) => handleEPFFormChange('fatherOrSpouseName', e.target.value)}
                    placeholder="Enter father or spouse name"
                    className="bg-gray-50 pr-20"
                  />
                  <div className="absolute right-2 top-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="father"
                      name="relationshipType"
                      checked={epfFormData.relationshipType === "father"}
                      onChange={() => handleEPFFormChange('relationshipType', 'father')}
                    />
                    <Label htmlFor="father" className="text-sm">Father</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="spouse"
                      name="relationshipType"
                      checked={epfFormData.relationshipType === "spouse"}
                      onChange={() => handleEPFFormChange('relationshipType', 'spouse')}
                    />
                    <Label htmlFor="spouse" className="text-sm">Spouse</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">3. Date of Birth (dd/mm/yyyy)</Label>
                <div className="relative">
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={epfFormData.dateOfBirth}
                    onChange={(e) => handleEPFFormChange('dateOfBirth', e.target.value)}
                    className="bg-gray-50 pr-20"
                  />
                  <div className="absolute right-2 top-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">4. Gender (Male / Female / Transgender)</Label>
                <div className="relative">
                  <Select value={epfFormData.gender} onValueChange={(value) => handleEPFFormChange('gender', value)}>
                    <SelectTrigger className="bg-gray-50 pr-20">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Transgender">Transgender</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="absolute right-2 top-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maritalStatus">5. Marital Status ? (Single/Married/Widow/Widower/Divorcee)</Label>
                <div className="relative">
                  <Select value={epfFormData.maritalStatus} onValueChange={(value) => handleEPFFormChange('maritalStatus', value)}>
                    <SelectTrigger className="bg-gray-50 pr-20">
                      <SelectValue placeholder="Select marital status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Widow">Widow</SelectItem>
                      <SelectItem value="Widower">Widower</SelectItem>
                      <SelectItem value="Divorcee">Divorcee</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="absolute right-2 top-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">6. (a) eMail ID</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={epfFormData.email}
                    onChange={(e) => handleEPFFormChange('email', e.target.value)}
                    placeholder="Enter email address (optional)"
                    className="bg-gray-50 pr-20"
                  />
                  <div className="absolute right-2 top-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobileNumber">6. (b) Mobile No (Aadhar Registered)</Label>
                <div className="relative">
                  <Input
                    id="mobileNumber"
                    value={epfFormData.mobileNumber}
                    onChange={(e) => handleEPFFormChange('mobileNumber', e.target.value)}
                    placeholder="Enter mobile number"
                    className="bg-gray-50 pr-20"
                  />
                  <div className="absolute right-2 top-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold border-b pb-2">Previous Membership Details</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>7. Whether earlier member of the Employee's Provident Fund Scheme, 1952 ?</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={epfFormData.previousEPFMember}
                        onChange={(e) => handleEPFFormChange('previousEPFMember', e.target.checked)}
                      />
                      <Label>Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!epfFormData.previousEPFMember}
                        onChange={(e) => handleEPFFormChange('previousEPFMember', !e.target.checked)}
                      />
                      <Label>No</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>8. Whether earlier member of the Employee's Pension Scheme, 1995 ?</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={epfFormData.previousPensionMember}
                        onChange={(e) => handleEPFFormChange('previousPensionMember', e.target.checked)}
                      />
                      <Label>Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!epfFormData.previousPensionMember}
                        onChange={(e) => handleEPFFormChange('previousPensionMember', !e.target.checked)}
                      />
                      <Label>No</Label>
                    </div>
                  </div>
                </div>
              </div>

              {(epfFormData.previousEPFMember || epfFormData.previousPensionMember) && (
                <div className="space-y-4 mt-4 p-4 border rounded-lg bg-gray-50">
                  <h5 className="font-medium">9. Previous Employment details ? (If Yes, 7 & 8 details above)</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="previousUAN">a) Universal Account Number (UAN)</Label>
                      <Input
                        id="previousUAN"
                        value={epfFormData.previousUAN}
                        onChange={(e) => handleEPFFormChange('previousUAN', e.target.value)}
                        placeholder="Enter previous UAN"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="previousPFAccountNumber">b) Previous PF Account Number</Label>
                      <Input
                        id="previousPFAccountNumber"
                        value={epfFormData.previousPFAccountNumber}
                        onChange={(e) => handleEPFFormChange('previousPFAccountNumber', e.target.value)}
                        placeholder="Enter previous PF account number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfExit">c) Date of Exit from previous Employment</Label>
                      <Input
                        id="dateOfExit"
                        type="date"
                        value={epfFormData.dateOfExit}
                        onChange={(e) => handleEPFFormChange('dateOfExit', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schemeCertificateNumber">d) Scheme Certificate No (If issued)</Label>
                      <Input
                        id="schemeCertificateNumber"
                        value={epfFormData.schemeCertificateNumber}
                        onChange={(e) => handleEPFFormChange('schemeCertificateNumber', e.target.value)}
                        placeholder="Enter scheme certificate number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pensionPaymentOrder">e) Pension Payment Order (PPO) (If issued)</Label>
                      <Input
                        id="pensionPaymentOrder"
                        value={epfFormData.pensionPaymentOrder}
                        onChange={(e) => handleEPFFormChange('pensionPaymentOrder', e.target.value)}
                        placeholder="Enter PPO number"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold border-b pb-2">10. International Worker Details</h4>

              <div className="space-y-2">
                <Label>a) International Worker</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={epfFormData.internationalWorker}
                      onChange={(e) => handleEPFFormChange('internationalWorker', e.target.checked)}
                    />
                    <Label>Yes</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!epfFormData.internationalWorker}
                      onChange={(e) => handleEPFFormChange('internationalWorker', !e.target.checked)}
                    />
                    <Label>No</Label>
                  </div>
                </div>
              </div>

              {epfFormData.internationalWorker && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="countryOfOrigin">b) Country of Origin</Label>
                    <Input
                      id="countryOfOrigin"
                      value={epfFormData.countryOfOrigin}
                      onChange={(e) => handleEPFFormChange('countryOfOrigin', e.target.value)}
                      placeholder="Enter country name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passportNumber">c) Passport No.</Label>
                    <Input
                      id="passportNumber"
                      value={epfFormData.passportNumber}
                      onChange={(e) => handleEPFFormChange('passportNumber', e.target.value)}
                      placeholder="Enter passport number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passportValidityFrom">d) Passport Validity From</Label>
                    <Input
                      id="passportValidityFrom"
                      type="date"
                      value={epfFormData.passportValidityFrom}
                      onChange={(e) => handleEPFFormChange('passportValidityFrom', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passportValidityTo">d) Passport Validity To</Label>
                    <Input
                      id="passportValidityTo"
                      type="date"
                      value={epfFormData.passportValidityTo}
                      onChange={(e) => handleEPFFormChange('passportValidityTo', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold border-b pb-2">11. KYC Details : (attach self attested copies of following KYC's)</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankAccountNumber">a) Bank Account No. & IFS Code</Label>
                  <div className="relative">
                    <Input
                      id="bankAccountNumber"
                      value={epfFormData.bankAccountNumber}
                      onChange={(e) => handleEPFFormChange('bankAccountNumber', e.target.value)}
                      placeholder="Enter bank account number"
                      className="bg-gray-50 pr-20"
                    />
                    <div className="absolute right-2 top-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <div className="relative">
                    <Input
                      id="ifscCode"
                      value={epfFormData.ifscCode}
                      onChange={(e) => handleEPFFormChange('ifscCode', e.target.value)}
                      placeholder="Enter IFSC code"
                      className="bg-gray-50 pr-20"
                    />
                    <div className="absolute right-2 top-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aadharNumber">
                    b) AADHAR Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="aadharNumber"
                      value={epfFormData.aadharNumber}
                      onChange={(e) => handleEPFFormChange('aadharNumber', e.target.value)}
                      placeholder="Enter Aadhar number"
                      className="bg-gray-50 pr-20"
                      required
                    />
                    <div className="absolute right-2 top-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="panNumber">c) Permanent Account Number (PAN)</Label>
                  <div className="relative">
                    <Input
                      id="panNumber"
                      value={epfFormData.panNumber}
                      onChange={(e) => handleEPFFormChange('panNumber', e.target.value)}
                      placeholder="Enter PAN number"
                      className="bg-gray-50 pr-20"
                    />
                    <div className="absolute right-2 top-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold border-b pb-2">12. Declaration Details</h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>First EPF Member</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={epfFormData.firstEPFMember}
                        onChange={(e) => handleEPFFormChange('firstEPFMember', e.target.checked)}
                      />
                      <Label>Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!epfFormData.firstEPFMember}
                        onChange={(e) => handleEPFFormChange('firstEPFMember', !e.target.checked)}
                      />
                      <Label>No</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enrolledDate">Enrolled Date</Label>
                  <div className="relative">
                    <Input
                      id="enrolledDate"
                      type="date"
                      value={epfFormData.enrolledDate}
                      onChange={(e) => handleEPFFormChange('enrolledDate', e.target.value)}
                      className="bg-gray-50 pr-20"
                    />
                    <div className="absolute right-2 top-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firstEmploymentWages">First Employment EPF Wages</Label>
                  <div className="relative">
                    <Input
                      id="firstEmploymentWages"
                      value={epfFormData.firstEmploymentWages}
                      onChange={(e) => handleEPFFormChange('firstEmploymentWages', e.target.value)}
                      placeholder="Enter wages"
                      className="bg-gray-50 pr-20"
                    />
                    <div className="absolute right-2 top-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-sm">Are you EPF Member before 01/09/2014</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={epfFormData.epfMemberBeforeSep2014}
                        onChange={(e) => handleEPFFormChange('epfMemberBeforeSep2014', e.target.checked)}
                      />
                      <Label>Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!epfFormData.epfMemberBeforeSep2014}
                        onChange={(e) => handleEPFFormChange('epfMemberBeforeSep2014', !e.target.checked)}
                      />
                      <Label>No</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">If Yes, EPF Amount Withdrawn?</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={epfFormData.epfAmountWithdrawn}
                        onChange={(e) => handleEPFFormChange('epfAmountWithdrawn', e.target.checked)}
                      />
                      <Label>Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!epfFormData.epfAmountWithdrawn}
                        onChange={(e) => handleEPFFormChange('epfAmountWithdrawn', !e.target.checked)}
                      />
                      <Label>No</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">If Yes, EPS (Pension) Amount Withdrawn?</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={epfFormData.epsAmountWithdrawn}
                        onChange={(e) => handleEPFFormChange('epsAmountWithdrawn', e.target.checked)}
                      />
                      <Label>Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!epfFormData.epsAmountWithdrawn}
                        onChange={(e) => handleEPFFormChange('epsAmountWithdrawn', !e.target.checked)}
                      />
                      <Label>No</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">After Sep 2014 earned EPS (Pension) Amount Withdrawn before Join current Employer?</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={epfFormData.epsAmountWithdrawnAfterSep2014}
                        onChange={(e) => handleEPFFormChange('epsAmountWithdrawnAfterSep2014', e.target.checked)}
                      />
                      <Label>Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!epfFormData.epsAmountWithdrawnAfterSep2014}
                        onChange={(e) => handleEPFFormChange('epsAmountWithdrawnAfterSep2014', !e.target.checked)}
                      />
                      <Label>No</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-semibold mb-2">UNDERTAKING</h4>
              <p className="text-sm">1) Certified that the particulars are true to the best of my knowledge</p>
              <p className="text-sm">2) I authorise EPFO to use my Aadhar for verification / authentication / eKYC purpose for service delivery</p>
              <p className="text-sm">3) Kindly transfer the fund and service details, if applicable, from the previous PF account as declared above to the present PF account.</p>
              <p className="text-sm">(The transfer would be possible only if the identified KYC details approved by previous employer has been verified by present employer using his Digital Signature</p>
              <p className="text-sm">4) In case of changes in above details, the same will be intimated to employer at the earliest.</p>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold">Employee Declaration</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="declarationDate">Date</Label>
                  <Input
                    id="declarationDate"
                    type="date"
                    value={epfFormData.declarationDate}
                    onChange={(e) => handleEPFFormChange('declarationDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="declarationPlace">Place</Label>
                  <Input
                    id="declarationPlace"
                    value={epfFormData.declarationPlace}
                    onChange={(e) => handleEPFFormChange('declarationPlace', e.target.value)}
                    placeholder="Enter place"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Signature of Member</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center h-20 flex items-center justify-center">
                  <span className="text-muted-foreground">Employee Signature</span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <div className="section-title">DECLARATION BY PRESENT EMPLOYER</div>

              <div className="space-y-2">
                <Label>A. The member Mr./Ms./Mrs. {epfFormData.memberName} has joined on {epfFormData.enrolledDate} and has been allotted PF Number ${selectedEmployeeForEPF?.uan || epfFormData.pfNumber || "Pending"}</Label>
              </div>

              <div className="space-y-2">
                <Label>B. In case the person was earlier not a member of EPF Scheme, 1952 and EPS, 1995: ((Post allotment of UAN) The UAN allotted or the member is) Please Tick the Appropriate Option :</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={epfFormData.kycStatus === "not_uploaded"}
                      onChange={() => handleEPFFormChange('kycStatus', 'not_uploaded')}
                    />
                    <Label>The KYC details of the above member in the JAN database have not been uploaded</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={epfFormData.kycStatus === "uploaded_not_approved"}
                      onChange={() => handleEPFFormChange('kycStatus', 'uploaded_not_approved')}
                    />
                    <Label>Have been uploaded but not approved</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={epfFormData.kycStatus === "uploaded_approved"}
                      onChange={() => handleEPFFormChange('kycStatus', 'uploaded_approved')}
                    />
                    <Label>Have been uploaded and approved with DSC</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>C. In case the person was earlier a member of EPF Scheme, 1952 and EPS 1995;</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={epfFormData.transferRequestGenerated}
                      onChange={(e) => handleEPFFormChange('transferRequestGenerated', e.target.checked)}
                    />
                    <Label>The KYC details of the above member in the UAN database have been approved with Digital Signature Certificate and transfer request has been generated on portal</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={epfFormData.physicalClaimFiled}
                      onChange={(e) => handleEPFFormChange('physicalClaimFiled', e.target.checked)}
                    />
                    <Label>As the DSC of establishment are not registered with EPFO, the member has been informed to file physical claim (Form-13) for transfer of funds from his previous establishment.</Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="employerDeclarationDate">Date</Label>
                  <Input
                    id="employerDeclarationDate"
                    type="date"
                    value={epfFormData.employerDeclarationDate}
                    onChange={(e) => handleEPFFormChange('employerDeclarationDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Signature of Employer with Seal of Establishment</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center h-20 flex items-center justify-center">
                  <span className="text-muted-foreground">Employer Signature & Seal</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4 border-t">
              <Button onClick={handleSaveEPFForm} className="flex items-center gap-2 w-full sm:w-auto" disabled={isSavingEPF}>
                {isSavingEPF ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSavingEPF ? "Saving..." : "Save Form"}
              </Button>
              <Button onClick={handlePrintEPFForm} variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
                <Download className="h-4 w-4" />
                Print Form
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Employee Dialog ──────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Edit className="h-5 w-5" />
              Edit Employee - {selectedEmployeeForEdit?.name}
            </DialogTitle>
            <DialogDescription>
              Make changes to employee information below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          {editFormData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => handleEditFormChange('name', e.target.value)}
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => handleEditFormChange('email', e.target.value)}
                  placeholder="Enter email address (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone *</Label>
                <Input
                  id="edit-phone"
                  value={editFormData.phone}
                  onChange={(e) => handleEditFormChange('phone', e.target.value)}
                  placeholder="Enter 10-digit phone number"
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-aadhar">Aadhar Number *</Label>
                <Input
                  id="edit-aadhar"
                  value={editFormData.aadharNumber}
                  onChange={(e) => handleEditFormChange('aadharNumber', e.target.value)}
                  placeholder="Enter 12-digit Aadhar number"
                  maxLength={12}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-pan">PAN Number</Label>
                <Input
                  id="edit-pan"
                  value={editFormData.panNumber}
                  onChange={(e) => handleEditFormChange('panNumber', e.target.value.toUpperCase())}
                  placeholder="Enter PAN number"
                  className="uppercase"
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-esic">ESIC Number</Label>
                <Input
                  id="edit-esic"
                  value={editFormData.esicNumber}
                  onChange={(e) => handleEditFormChange('esicNumber', e.target.value)}
                  placeholder="Enter ESIC number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-uan">UAN Number</Label>
                <Input
                  id="edit-uan"
                  value={editFormData.uanNumber}
                  onChange={(e) => handleEditFormChange('uanNumber', e.target.value)}
                  placeholder="Enter UAN number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-dob">Date of Birth</Label>
                <Input
                  id="edit-dob"
                  type="date"
                  value={editFormData.dateOfBirth}
                  onChange={(e) => handleEditFormChange('dateOfBirth', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bloodGroup">Blood Group</Label>
                <Select
                  value={editFormData.bloodGroup}
                  onValueChange={(value) => handleEditFormChange('bloodGroup', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A +ve</SelectItem>
                    <SelectItem value="A-">A -ve</SelectItem>
                    <SelectItem value="B+">B +ve</SelectItem>
                    <SelectItem value="B-">B -ve</SelectItem>
                    <SelectItem value="O+">O +ve</SelectItem>
                    <SelectItem value="O-">O -ve</SelectItem>
                    <SelectItem value="AB+">AB +ve</SelectItem>
                    <SelectItem value="AB-">AB -ve</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-gender">Gender</Label>
                <Select
                  value={editFormData.gender}
                  onValueChange={(value) => handleEditFormChange('gender', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Transgender">Transgender</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-maritalStatus">Marital Status</Label>
                <Select
                  value={editFormData.maritalStatus}
                  onValueChange={(value) => handleEditFormChange('maritalStatus', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select marital status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Widow">Widow</SelectItem>
                    <SelectItem value="Widower">Widower</SelectItem>
                    <SelectItem value="Divorcee">Divorcee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-department">Department *</Label>
                <Select
                  value={editFormData.department}
                  onValueChange={(value) => handleEditFormChange('department', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-position">Position *</Label>
                <Input
                  id="edit-position"
                  value={editFormData.position}
                  onChange={(e) => handleEditFormChange('position', e.target.value)}
                  placeholder="Enter position"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-siteName">Site Name *</Label>
                <Select
                  value={editFormData.siteName}
                  onValueChange={(value) => handleEditFormChange('siteName', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSiteNames.map(site => (
                      <SelectItem key={site} value={site}>{site}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-salary">Salary (₹) *</Label>
                <Input
                  id="edit-salary"
                  type="number"
                  value={editFormData.salary}
                  onChange={(e) => handleEditFormChange('salary', e.target.value)}
                  placeholder="Enter monthly salary"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value: "active" | "inactive" | "left") => handleEditFormChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-permanentAddress">Permanent Address</Label>
                <Textarea
                  id="edit-permanentAddress"
                  value={editFormData.permanentAddress}
                  onChange={(e) => handleEditFormChange('permanentAddress', e.target.value)}
                  placeholder="Enter permanent address"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-permanentPincode">Permanent Pin Code</Label>
                <Input
                  id="edit-permanentPincode"
                  value={editFormData.permanentPincode}
                  onChange={(e) => handleEditFormChange('permanentPincode', e.target.value)}
                  placeholder="Enter pin code"
                  maxLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-localAddress">Local Address</Label>
                <Textarea
                  id="edit-localAddress"
                  value={editFormData.localAddress}
                  onChange={(e) => handleEditFormChange('localAddress', e.target.value)}
                  placeholder="Enter local address"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-localPincode">Local Pin Code</Label>
                <Input
                  id="edit-localPincode"
                  value={editFormData.localPincode}
                  onChange={(e) => handleEditFormChange('localPincode', e.target.value)}
                  placeholder="Enter pin code"
                  maxLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bankName">Bank Name</Label>
                <Input
                  id="edit-bankName"
                  value={editFormData.bankName}
                  onChange={(e) => handleEditFormChange('bankName', e.target.value)}
                  placeholder="Enter bank name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-accountNumber">Account Number</Label>
                <Input
                  id="edit-accountNumber"
                  value={editFormData.accountNumber}
                  onChange={(e) => handleEditFormChange('accountNumber', e.target.value)}
                  placeholder="Enter account number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-ifscCode">IFSC Code</Label>
                <Input
                  id="edit-ifscCode"
                  value={editFormData.ifscCode}
                  onChange={(e) => handleEditFormChange('ifscCode', e.target.value.toUpperCase())}
                  placeholder="Enter IFSC code"
                  className="uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-branchName">Branch Name</Label>
                <Input
                  id="edit-branchName"
                  value={editFormData.branchName}
                  onChange={(e) => handleEditFormChange('branchName', e.target.value)}
                  placeholder="Enter branch name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-fatherName">Father's Name</Label>
                <Input
                  id="edit-fatherName"
                  value={editFormData.fatherName}
                  onChange={(e) => handleEditFormChange('fatherName', e.target.value)}
                  placeholder="Enter father's name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-motherName">Mother's Name</Label>
                <Input
                  id="edit-motherName"
                  value={editFormData.motherName}
                  onChange={(e) => handleEditFormChange('motherName', e.target.value)}
                  placeholder="Enter mother's name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-spouseName">Spouse Name</Label>
                <Input
                  id="edit-spouseName"
                  value={editFormData.spouseName}
                  onChange={(e) => handleEditFormChange('spouseName', e.target.value)}
                  placeholder="Enter spouse name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-numberOfChildren">Number of Children</Label>
                <Input
                  id="edit-numberOfChildren"
                  type="number"
                  value={editFormData.numberOfChildren}
                  onChange={(e) => handleEditFormChange('numberOfChildren', e.target.value)}
                  placeholder="Enter number of children"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-emergencyContactName">Emergency Contact Name</Label>
                <Input
                  id="edit-emergencyContactName"
                  value={editFormData.emergencyContactName}
                  onChange={(e) => handleEditFormChange('emergencyContactName', e.target.value)}
                  placeholder="Enter emergency contact name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-emergencyContactPhone">Emergency Contact Phone</Label>
                <Input
                  id="edit-emergencyContactPhone"
                  value={editFormData.emergencyContactPhone}
                  onChange={(e) => handleEditFormChange('emergencyContactPhone', e.target.value)}
                  placeholder="Enter emergency contact phone"
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-emergencyContactRelation">Relation</Label>
                <Input
                  id="edit-emergencyContactRelation"
                  value={editFormData.emergencyContactRelation}
                  onChange={(e) => handleEditFormChange('emergencyContactRelation', e.target.value)}
                  placeholder="Enter relation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-nomineeName">Nominee Name</Label>
                <Input
                  id="edit-nomineeName"
                  value={editFormData.nomineeName}
                  onChange={(e) => handleEditFormChange('nomineeName', e.target.value)}
                  placeholder="Enter nominee name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-nomineeRelation">Nominee Relation</Label>
                <Input
                  id="edit-nomineeRelation"
                  value={editFormData.nomineeRelation}
                  onChange={(e) => handleEditFormChange('nomineeRelation', e.target.value)}
                  placeholder="Enter nominee relation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-pantSize">Pant Size</Label>
                <Select
                  value={editFormData.pantSize}
                  onValueChange={(value) => handleEditFormChange('pantSize', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pant size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="28">28</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="32">32</SelectItem>
                    <SelectItem value="34">34</SelectItem>
                    <SelectItem value="36">36</SelectItem>
                    <SelectItem value="38">38</SelectItem>
                    <SelectItem value="40">40</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-shirtSize">Shirt Size</Label>
                <Select
                  value={editFormData.shirtSize}
                  onValueChange={(value) => handleEditFormChange('shirtSize', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shirt size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S">S</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="XL">XL</SelectItem>
                    <SelectItem value="XXL">XXL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-capSize">Cap Size</Label>
                <Select
                  value={editFormData.capSize}
                  onValueChange={(value) => handleEditFormChange('capSize', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cap size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S">S</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="XL">XL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-idCardIssued"
                      checked={editFormData.idCardIssued}
                      onChange={(e) => handleEditFormChange('idCardIssued', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="edit-idCardIssued">ID Card Issued</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-westcoatIssued"
                      checked={editFormData.westcoatIssued}
                      onChange={(e) => handleEditFormChange('westcoatIssued', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="edit-westcoatIssued">Westcoat Issued</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-apronIssued"
                      checked={editFormData.apronIssued}
                      onChange={(e) => handleEditFormChange('apronIssued', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="edit-apronIssued">Apron Issued</Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit} className="w-full sm:w-auto">
              {isSavingEdit ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── History Dialog ────────────────────────────────────────────── */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl p-3 sm:p-6 overflow-hidden">
          <DialogHeader className="px-0 pt-0 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5" />
              Site Assignment History - {selectedEmployeeForHistory?.name}
            </DialogTitle>
            <DialogDescription>
              Employee ID: {selectedEmployeeForHistory?.employeeId}
            </DialogDescription>
          </DialogHeader>

          <div className="px-0 py-4 max-h-[60vh] overflow-y-auto">
            {selectedEmployeeForHistory?.siteHistory && selectedEmployeeForHistory.siteHistory.length > 0 ? (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  <div className="space-y-6">
                    {selectedEmployeeForHistory.siteHistory.map((history, index) => {
                      const isLastEntry = index === selectedEmployeeForHistory.siteHistory.length - 1;
                      const hasLeftDate = history.leftDate !== undefined && history.leftDate !== null && history.leftDate !== '';

                      let displaySiteName = history.siteName;

                      if (!displaySiteName || displaySiteName === '') {
                        if (!hasLeftDate && isLastEntry && selectedEmployeeForHistory.siteName) {
                          displaySiteName = selectedEmployeeForHistory.siteName;
                        } else {
                          displaySiteName = 'Unknown Site';
                        }
                      }

                      return (
                        <div key={index} className="relative pl-10">
                          <div className={`absolute left-2 top-1 w-4 h-4 rounded-full border-4 border-white ${!hasLeftDate && isLastEntry ? 'bg-green-500' : 'bg-blue-500'
                            }`}></div>
                          <div className="bg-white p-4 rounded-lg border shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="h-4 w-4 text-blue-600" />
                              <span className="font-semibold text-lg">{displaySiteName}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-muted-foreground">Assigned Date:</span>
                                <div className="font-medium">
                                  {history.assignedDate ? new Date(history.assignedDate).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  }) : 'Not specified'}
                                </div>
                              </div>
                              {hasLeftDate && (
                                <div>
                                  <span className="text-muted-foreground">Left Date:</span>
                                  <div className="font-medium">
                                    {new Date(history.leftDate).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </div>
                                </div>
                              )}
                              {hasLeftDate && history.daysWorked !== undefined && (
                                <div className="sm:col-span-2">
                                  <span className="text-muted-foreground">Days Worked:</span>
                                  <div className="font-medium text-green-600">
                                    <Clock className="h-3 w-3 inline mr-1" />
                                    {history.daysWorked} days
                                  </div>
                                </div>
                              )}
                              {!hasLeftDate && isLastEntry && (
                                <div className="sm:col-span-2">
                                  <Badge className="bg-green-100 text-green-800">Current Site</Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No site assignment history found for this employee.</p>
              </div>
            )}
          </div>

          <div className="px-0 py-4 border-t bg-gray-50">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setHistoryDialogOpen(false)} className="w-full sm:w-auto">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Stats Cards ────────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Employees" value={totalEmployees} />
        <StatCard
          title="Active Employees"
          value={activeEmployees}    // ← Now uses real count
          className="text-green-600"
        />
        <StatCard
          title="Left/Inactive Employees"
          value={leftEmployeesCount} // ← Now uses real count
          className="text-red-600"
        />
      </div>
      {/* ─── Select All row ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="selectAll"
              checked={selectAll}
              onChange={handleSelectAll}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="selectAll" className="text-sm font-medium cursor-pointer">
              Select All ({sortedEmployees.length})
            </Label>
          </div>
          {selectedEmployees.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
            </Badge>
          )}
        </div>
      </div>

      {/* ─── Documents Dialog ────────────────────────────────────────────── */}
      <Dialog open={documentsDialogOpen} onOpenChange={setDocumentsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Documents - {selectedEmployeeForDocuments?.name} ({selectedEmployeeForDocuments?.employeeId})
            </DialogTitle>
          </DialogHeader>
          {selectedEmployeeForDocuments && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  KYC Documents
                </h4>
                {selectedEmployeeForDocuments.kycDocuments && selectedEmployeeForDocuments.kycDocuments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedEmployeeForDocuments.kycDocuments.map((doc: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-blue-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{doc.documentName}</p>
                              {doc.documentNumber && (
                                <p className="text-sm text-muted-foreground truncate">
                                  Number: {doc.documentNumber}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                                {doc.expiryDate && ` • Expires: ${new Date(doc.expiryDate).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-start sm:self-center">
                            {doc.verified ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600">
                                <XCircle className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(doc.fileUrl, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <FileText className="mx-auto h-12 w-12 mb-4" />
                    <p>No KYC documents uploaded for this employee</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setDocumentsDialogOpen(false);
                        setSelectedEmployeeForDocumentUpload(selectedEmployeeForDocuments);
                        setDocumentUploadDialogOpen(true);
                      }}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Documents
                    </Button>
                  </div>
                )}
              </div>

              {selectedEmployeeForDocuments.documents && selectedEmployeeForDocuments.documents.length > 0 && (
                <div>
                  <h4 className="font-semibold text-lg mb-4">Other Documents</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedEmployeeForDocuments.documents.map((doc: any, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-blue-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{doc.name}</p>
                              <p className="text-sm text-muted-foreground">{doc.type}</p>
                              <p className="text-xs text-muted-foreground">
                                Uploaded: {doc.uploadDate} • Expires: {doc.expiryDate}
                              </p>
                            </div>
                          </div>
                          <Badge variant={doc.status === "valid" ? "default" : "destructive"} className="self-start sm:self-center">
                            {doc.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-lg mb-4">Available Forms</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer">
                    <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <h5 className="font-medium mb-2">ID Card</h5>
                    <p className="text-sm text-muted-foreground mb-3">Employee identification card</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        generateIDCard(selectedEmployeeForDocuments);
                        setDocumentsDialogOpen(false);
                      }}
                      className="w-full"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer">
                    <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <h5 className="font-medium mb-2">Nominee Form</h5>
                    <p className="text-sm text-muted-foreground mb-3">PF nominee declaration</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        downloadNomineeForm(selectedEmployeeForDocuments);
                        setDocumentsDialogOpen(false);
                      }}
                      className="w-full"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer">
                    <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                    <h5 className="font-medium mb-2">PF Form</h5>
                    <p className="text-sm text-muted-foreground mb-3">Provident fund declaration</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        downloadPFForm(selectedEmployeeForDocuments);
                        setDocumentsDialogOpen(false);
                      }}
                      className="w-full"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer">
                    <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-6 w-6 text-orange-600" />
                    </div>
                    <h5 className="font-medium mb-2">ESIC Form</h5>
                    <p className="text-sm text-muted-foreground mb-3">Health insurance form</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        downloadESICForm(selectedEmployeeForDocuments);
                        setDocumentsDialogOpen(false);
                      }}
                      className="w-full"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer">
                    <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-6 w-6 text-red-600" />
                    </div>
                    <h5 className="font-medium mb-2">EPF Form 11</h5>
                    <p className="text-sm text-muted-foreground mb-3">Employee declaration form</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleOpenEPFForm11(selectedEmployeeForDocuments);
                        setDocumentsDialogOpen(false);
                      }}
                      className="w-full"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </div>

              {(selectedEmployeeForDocuments.photo || selectedEmployeeForDocuments.photoPublicId) && (
                <div>
                  <h4 className="font-semibold text-lg mb-4">Employee Photo</h4>
                  <div className="border rounded-lg p-4 text-center">
                    <img
                      src={getPhotoUrl(selectedEmployeeForDocuments)}
                      alt={selectedEmployeeForDocuments.name}
                      className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-gray-200"
                      onError={(e) => {
                        e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";
                      }}
                    />
                    <p className="text-sm text-muted-foreground mt-2">Employee Photo</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Employee List Card ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>Employee List</span>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {selectedDepartment !== "all" && (
                <Badge variant="secondary">Department: {selectedDepartment}</Badge>
              )}
              {selectedSite !== "all" && (
                <Badge variant="secondary">Site: {selectedSite}</Badge>
              )}
              {selectedJoinDate && (
                <Badge variant="secondary">Join Date: {selectedJoinDate}</Badge>
              )}
              {sortBy && (
                <Badge variant="secondary">
                  Sorted by: {sortBy === "name" ? "Name" : sortBy === "department" ? "Department" : sortBy === "site" ? "Site" : "Join Date"}
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          {isMobileView ? (
            // Mobile employee cards
            <div className="space-y-2">
              {sortedEmployees.map((employee) => (
                <MobileEmployeeCard
                  key={employee.id || employee._id}
                  employee={employee}
                  selected={selectedEmployees.includes(employee.id || employee._id || '')}
                  onSelect={handleSelectEmployee}
                  onEdit={handleEditEmployee}
                  onViewHistory={handleViewHistory}
                  onUpload={handleOpenDocumentUpload}
                  onViewDocs={handleViewDocuments}
                  onEPF={handleOpenEPFForm11}
                  onMarkLeft={handleMarkAsLeft}
                  onDelete={handleDeleteEmployee}
                  onViewID={generateIDCard}
                  onDownloadID={downloadIDCard}
                />
              ))}
              {sortedEmployees.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || selectedDepartment !== "all" || selectedSite !== "all" || selectedJoinDate ?
                    "No employees found matching your filters. Try clearing filters." :
                    "No employees found. Add your first employee above."}
                </div>
              )}
            </div>
          ) : (
            // Desktop layout (same as before)
            <div className="space-y-4">
              {sortedEmployees.map((employee) => (
                <div key={employee.id || employee._id} className="border rounded-lg p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee.id || employee._id || '')}
                        onChange={() => handleSelectEmployee(employee.id || employee._id || '')}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1"
                      />

                      {employee.photo || employee.photoPublicId ? (
                        <img
                          src={getPhotoUrl(employee)}
                          alt={employee.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                          onError={(e) => {
                            console.log('Image failed to load:', employee.photo);
                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300 flex-shrink-0">
                          <User className="h-6 w-6 text-gray-400" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">{employee.name}</h4>
                          {employee.status === "left" && (
                            <Badge variant="destructive" className="text-xs">Left</Badge>
                          )}
                          {employee.isManager && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Manager</Badge>
                          )}
                          {employee.isSupervisor && (
                            <Badge className="bg-teal-100 text-teal-800 border-teal-200 text-xs">Supervisor</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{employee.employeeId} • {employee.department}</p>
                        <p className="text-sm text-muted-foreground truncate">{employee.position}</p>
                        <p className="text-sm text-muted-foreground truncate">Site: {employee.siteName || "Not specified"}</p>
                        <p className="text-sm text-muted-foreground">Join Date: {employee.joinDate}</p>
                        <p className="text-sm text-muted-foreground">Salary: ₹{employee.salary.toLocaleString()}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            Documents: {employee.documents?.length || 0}
                          </Badge>
                          {employee.panNumber && (
                            <Badge variant="secondary" className="text-xs">PAN</Badge>
                          )}
                          {employee.uan && (
                            <Badge variant="secondary" className="text-xs">UAN</Badge>
                          )}
                          {employee.esicNumber && (
                            <Badge variant="secondary" className="text-xs">ESIC</Badge>
                          )}
                          {(employee.photo || employee.photoPublicId) && (
                            <Badge variant="secondary" className="text-xs">
                              <Camera className="h-3 w-3 mr-1" />
                              Photo
                            </Badge>
                          )}
                          {employee.siteHistory && employee.siteHistory.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              <History className="h-3 w-3 mr-1" />
                              {employee.siteHistory.length} {employee.siteHistory.length === 1 ? 'Move' : 'Moves'}
                            </Badge>
                          )}
                          {employee.kycDocuments && employee.kycDocuments.length > 0 && (
                            <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              <Shield className="h-3 w-3 mr-1" />
                              {employee.kycDocuments.length} KYC
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditEmployee(employee as ExtendedEmployee)}
                        className="flex items-center gap-1 flex-1 sm:flex-none"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>

                      {/* ✅ REPLACE THIS with the smaller version */}
                      <FaceRegisterButton
                        employeeId={employee._id || employee.id || ''}
                        employeeName={employee.name}
                        currentEmbeddingDim={(employee as any).faceEmbeddings?.[0]?.length}
                      />

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewHistory(employee as ExtendedEmployee)}
                        className="flex items-center gap-1 flex-1 sm:flex-none"
                      >
                        <History className="h-3 w-3" />
                        History
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDocumentUpload(employee)}
                        className="flex items-center gap-1 flex-1 sm:flex-none bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                        title="Upload KYC Documents"
                      >
                        <Upload className="h-3 w-3" />
                        <span className="hidden sm:inline">Upload</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDocuments(employee)}
                        className="flex items-center gap-1 flex-1 sm:flex-none"
                      >
                        <Files className="h-3 w-3" />
                        Documents
                      </Button>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="flex-1 sm:flex-none">
                            <Eye className="h-3 w-3 mr-1" />
                            Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl p-3 sm:p-6">
                          <DialogHeader>
                            <DialogTitle>Employee Details - {employee.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div><strong>Employee ID:</strong> {employee.employeeId}</div>
                              <div><strong>Email:</strong> {employee.email}</div>
                              <div><strong>Phone:</strong> {employee.phone}</div>
                              <div><strong>Aadhar:</strong> {employee.aadharNumber}</div>
                              <div><strong>PAN:</strong> {employee.panNumber || "Not provided"}</div>
                              <div><strong>UAN:</strong> {employee.uan}</div>
                              <div><strong>ESIC:</strong> {employee.esicNumber}</div>
                              <div><strong>Department:</strong> {employee.department}</div>
                              <div><strong>Position:</strong> {employee.position}</div>
                              <div><strong>Site:</strong> {employee.siteName || "Not specified"}</div>
                              <div><strong>Join Date:</strong> {employee.joinDate}</div>
                              <div><strong>Salary:</strong> ₹{employee.salary.toLocaleString()}</div>
                              <div><strong>Status:</strong>
                                <Badge variant={getStatusColor(employee.status)} className="ml-2">
                                  {employee.status}
                                </Badge>
                              </div>
                            </div>
                            {(employee.photo || employee.photoPublicId) && (
                              <div>
                                <strong>Employee Photo:</strong>
                                <div className="mt-2">
                                  <img
                                    src={getPhotoUrl(employee)}
                                    alt={employee.name}
                                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                                    onError={(e) => {
                                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";
                                    }}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">Stored in Cloudinary</p>
                                </div>
                              </div>
                            )}
                            <div>
                              <strong>Documents:</strong>
                              <div className="mt-2 space-y-2">
                                {employee.documents && employee.documents.length > 0 ? (
                                  employee.documents.map((doc: any) => (
                                    <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 border rounded">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        <span className="truncate">{doc.name}</span>
                                        <span className="text-sm text-muted-foreground">({doc.type})</span>
                                      </div>
                                      <Badge variant={getStatusColor(doc.status)}>
                                        {doc.status}
                                      </Badge>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-4 text-muted-foreground">
                                    No documents uploaded
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateIDCard(employee)}
                        className="flex-1 sm:flex-none"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View ID
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadIDCard(employee)}
                        className="flex-1 sm:flex-none"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        ID Card
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEPFForm11(employee)}
                        className="flex-1 sm:flex-none"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        EPF Form 11
                      </Button>

                      {employee.status !== "left" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsLeft(employee)}
                          className="flex-1 sm:flex-none"
                        >
                          Mark as Left
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteEmployee(employee.id || employee._id || '')}
                        disabled={isDeleting === (employee.id || employee._id)}
                        className="flex-1 sm:flex-none"
                      >
                        {isDeleting === (employee.id || employee._id) ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {sortedEmployees.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || selectedDepartment !== "all" || selectedSite !== "all" || selectedJoinDate ?
                    "No employees found matching your filters. Try clearing filters." :
                    "No employees found. Add your first employee above."}
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {/* ─── Pagination ────────────────────────────────────────────────────────── */}
          {sortedEmployees.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing {Math.min((employeesPage - 1) * employeesItemsPerPage + 1, totalEmployees)} to{" "}
                  {Math.min(employeesPage * employeesItemsPerPage, totalEmployees)} of {totalEmployees} employees
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Items per page selector - only show if total > min */}
                  {totalEmployees > 10 && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="itemsPerPage" className="text-sm whitespace-nowrap">
                        Show:
                      </Label>
                      <Select
                        value={String(employeesItemsPerPage)}
                        onValueChange={(value) => {
                          const newSize = parseInt(value);
                          setEmployeesItemsPerPage(newSize);
                          setEmployeesPage(1); // Reset to first page
                        }}
                      >
                        <SelectTrigger id="itemsPerPage" className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="999999">All</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Pagination controls - only show if more than one page */}
                  {totalEmployees > employeesItemsPerPage && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEmployeesPage(1)}
                        disabled={employeesPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        «
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEmployeesPage(p => Math.max(1, p - 1))}
                        disabled={employeesPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        ‹
                      </Button>

                      <span className="px-2 text-sm">
                        {employeesPage} / {Math.ceil(totalEmployees / employeesItemsPerPage)}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEmployeesPage(p => Math.min(Math.ceil(totalEmployees / employeesItemsPerPage), p + 1))}
                        disabled={employeesPage === Math.ceil(totalEmployees / employeesItemsPerPage)}
                        className="h-8 w-8 p-0"
                      >
                        ›
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEmployeesPage(Math.ceil(totalEmployees / employeesItemsPerPage))}
                        disabled={employeesPage === Math.ceil(totalEmployees / employeesItemsPerPage)}
                        className="h-8 w-8 p-0"
                      >
                        »
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Bulk Site Dialog ────────────────────────────────────────────── */}
      <Dialog open={bulkSiteDialogOpen} onOpenChange={setBulkSiteDialogOpen}>
        <DialogContent className="sm:max-w-md p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Assign Site to Multiple Employees
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selected Employees</Label>
              <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
                {employees
                  .filter(emp => selectedEmployees.includes(emp.id || emp._id || ''))
                  .map(emp => (
                    <div key={emp.id || emp._id} className="text-sm py-1 flex items-center justify-between">
                      <span className="truncate pr-2">
                        {emp.name} ({emp.employeeId})
                      </span>
                      {emp.isManager ? (
                        <Badge className="bg-amber-100 text-amber-800 text-xs whitespace-nowrap">Manager</Badge>
                      ) : emp.isSupervisor ? (
                        <Badge className="bg-teal-100 text-teal-800 text-xs whitespace-nowrap">Supervisor</Badge>
                      ) : (
                        <Badge className="bg-cyan-100 text-cyan-800 text-xs whitespace-nowrap">Staff</Badge>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteSelect">Select Site</Label>
              <Select value={selectedSiteForBulk} onValueChange={setSelectedSiteForBulk}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a site" />
                </SelectTrigger>
                <SelectContent>
                  {loadingSites ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Loading sites...</span>
                    </div>
                  ) : (
                    <>
                      {Array.from(siteDeploymentStatus.values()).map(status => (
                        <SelectItem key={status.siteName} value={status.siteName}>
                          <div className="flex flex-col items-start">
                            <span>{status.siteName}</span>
                            <span className="text-xs text-muted-foreground">
                              Managers: {status.managerCount}/{status.managerRequirement} |
                              Supervisors: {status.supervisorCount}/{status.supervisorRequirement} |
                              Staff: {status.staffCount}/{status.staffRequirement}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      {allSiteNames.length === 0 && (
                        <div className="p-4 text-center text-muted-foreground">
                          No sites available
                        </div>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
              {allSiteNames.length === 0 && !loadingSites && (
                <p className="text-xs text-amber-600 mt-1">
                  No sites found. Please add sites in the Sites page or import employees with sites.
                </p>
              )}
            </div>

            {selectedSiteForBulk && siteDeploymentStatus.has(selectedSiteForBulk) && (
              <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-semibold text-xs mb-2">Site Capacity Info - {selectedSiteForBulk}</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Managers:
                    </span>
                    <span className={siteDeploymentStatus.get(selectedSiteForBulk)?.isManagerFull ? 'text-red-600 font-bold' : 'text-green-600'}>
                      {siteDeploymentStatus.get(selectedSiteForBulk)?.managerCount} / {siteDeploymentStatus.get(selectedSiteForBulk)?.managerRequirement}
                      {siteDeploymentStatus.get(selectedSiteForBulk)?.remainingManagers > 0 &&
                        ` (${siteDeploymentStatus.get(selectedSiteForBulk)?.remainingManagers} left)`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      Supervisors:
                    </span>
                    <span className={siteDeploymentStatus.get(selectedSiteForBulk)?.isSupervisorFull ? 'text-red-600 font-bold' : 'text-green-600'}>
                      {siteDeploymentStatus.get(selectedSiteForBulk)?.supervisorCount} / {siteDeploymentStatus.get(selectedSiteForBulk)?.supervisorRequirement}
                      {siteDeploymentStatus.get(selectedSiteForBulk)?.remainingSupervisors > 0 &&
                        ` (${siteDeploymentStatus.get(selectedSiteForBulk)?.remainingSupervisors} left)`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Staff:
                    </span>
                    <span className={siteDeploymentStatus.get(selectedSiteForBulk)?.isStaffFull ? 'text-red-600 font-bold' : 'text-green-600'}>
                      {siteDeploymentStatus.get(selectedSiteForBulk)?.staffCount} / {siteDeploymentStatus.get(selectedSiteForBulk)?.staffRequirement}
                      {siteDeploymentStatus.get(selectedSiteForBulk)?.remainingStaff > 0 &&
                        ` (${siteDeploymentStatus.get(selectedSiteForBulk)?.remainingStaff} left)`
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setBulkSiteDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                onClick={handleBulkSiteAssignment}
                disabled={isBulkUpdating || !selectedSiteForBulk || allSiteNames.length === 0}
                className="w-full sm:w-auto"
              >
                {isBulkUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Assign Site
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Bulk Delete Dialog ────────────────────────────────────────── */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-red-600">
              <AlertCircle className="h-5 w-5" />
              Confirm Bulk Deletion
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                You are about to delete <strong>{selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''}</strong>.
                This action cannot be undone.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Employees to be deleted:</Label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
                {employees
                  .filter(emp => selectedEmployees.includes(emp.id || emp._id || ''))
                  .map(emp => (
                    <div key={emp.id || emp._id} className="text-sm py-1 flex items-center gap-2">
                      <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                      <span className="truncate">
                        {emp.name} ({emp.employeeId}) - {emp.department}
                        {emp.isManager && " (Manager)"}
                        {emp.isSupervisor && " (Supervisor)"}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="w-full sm:w-auto"
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeesTab;