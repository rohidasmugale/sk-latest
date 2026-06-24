import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Upload, Trash2, Camera, X, Save, Edit, Download, Loader2, UserCheck, User, Search, ChevronDown, Building, MapPin, Users, Check } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as XLSX from 'xlsx';
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
// Define the API Base URL
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');


// Types
interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  aadharNumber: string;
  department: string;
  position: string;
  joinDate?: string;
  dateOfJoining?: string;
  status: "active" | "inactive" | "left";
  salary: number | string;
  uanNumber?: string;
  uan?: string;
  esicNumber?: string;
  panNumber?: string;
  photo?: string;
  photoPublicId?: string;
  // Additional fields
  siteName?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  gender?: string;
  maritalStatus?: string;
  permanentAddress?: string;
  permanentPincode?: string;
  localAddress?: string;
  localPincode?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  numberOfChildren?: string | number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  pantSize?: string;
  shirtSize?: string;
  capSize?: string;
  idCardIssued?: boolean;
  westcoatIssued?: boolean;
  apronIssued?: boolean;
  employeeSignature?: string;
  authorizedSignature?: string;
  createdAt?: string;
  updatedAt?: string;
  isManager?: boolean;
  isSupervisor?: boolean;
}

interface SalaryStructure {
  id: number;
  employeeId: string;
  basic: number;
  hra: number;
  da: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
  otherAllowances: number;
  pf: number;
  esic: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  workingDays: number;
  paidDays: number;
  lopDays: number;
}

interface Site {
  _id: string;
  name: string;
  clientName: string;
  location: string;
  areaSqft: number;
  services: string[];
  status: 'active' | 'inactive';
  contractValue: number;
  contractEndDate: string;
  staffDeployment: Array<{
    role: string;
    count: number;
  }>;
  totalStaff?: number;
  managerCount?: number;
  supervisorCount?: number;
  addedBy?: string;
  addedByRole?: string;
  manager?: string;
  clientId?: string;
  contractStartDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface NewEmployeeForm {
  // Basic Information
  name: string;
  email: string;
  phone: string;
  aadharNumber: string;
  panNumber: string;
  esicNumber: string;
  uanNumber: string;
  
  // Personal Details
  siteName: string;
  dateOfBirth: string;
  dateOfJoining: string;
  dateOfExit: string;
  bloodGroup: string;
  gender?: string;
  maritalStatus?: string;
  
  // Address
  permanentAddress: string;
  permanentPincode: string;
  localAddress: string;
  localPincode: string;
  
  // Bank Details
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  
  // Family Details
  fatherName: string;
  motherName: string;
  spouseName: string;
  numberOfChildren: string;
  
  // Emergency Contact
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  
  // Nominee Details
  nomineeName: string;
  nomineeRelation: string;
  
  // Uniform Details
  pantSize: string;
  shirtSize: string;
  capSize: string;
  
  // Issued Items
  idCardIssued: boolean;
  westcoatIssued: boolean;
  apronIssued: boolean;
  
  // Employment Details
  department: string;
  position: string;
  salary: string;
  
  // Documents
  photo: File | string | null;
  employeeSignature: File | null;
  authorizedSignature: File | null;
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
  
  // Additional fields for employer declaration
  kycStatus?: "not_uploaded" | "uploaded_not_approved" | "uploaded_approved";
  transferRequestGenerated?: boolean;
  physicalClaimFiled?: boolean;
}

interface OnboardingTabProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  salaryStructures: SalaryStructure[];
  setSalaryStructures: React.Dispatch<React.SetStateAction<SalaryStructure[]>>;
  newJoinees?: Employee[];
  setNewJoinees?: React.Dispatch<React.SetStateAction<Employee[]>>;
  leftEmployees?: Employee[];
  setLeftEmployees?: React.Dispatch<React.SetStateAction<Employee[]>>;
  // Add these props to receive updates from parent
  onEmployeeUpdate?: (updatedEmployee: Employee) => void;
  onEmployeesBulkUpdate?: (updatedEmployees: Employee[]) => void;
}

// Departments array
const departments = [
  "Housekeeping ", 
  "Security ", 
  "Parking Management", 
  "Waste Management", 
  "STP Tank Cleaning", 
  "Consumables Management",
  "Administration",
  "HR",
  "Finance",
  "IT",
  "Operations",
  "Maintenance"
];

// FormField Component
const FormField = ({ 
  label, 
  id, 
  children, 
  required = false 
}: { 
  label: string; 
  id?: string; 
  children: React.ReactNode; 
  required?: boolean;
}) => (
  <div className="space-y-2">
    <Label htmlFor={id}>
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    {children}
  </div>
);

// Reset form function
const resetNewEmployeeForm = () => ({
  name: "",
  email: "",
  phone: "",
  aadharNumber: "",
  panNumber: "",
  esicNumber: "",
  uanNumber: "",
  siteName: "",
  dateOfBirth: "",
  dateOfJoining: new Date().toISOString().split("T")[0],
  dateOfExit: "",
  bloodGroup: "",
  permanentAddress: "",
  permanentPincode: "",
  localAddress: "",
  localPincode: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  branchName: "",
  fatherName: "",
  motherName: "",
  spouseName: "",
  numberOfChildren: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "",
  nomineeName: "",
  nomineeRelation: "",
  pantSize: "",
  shirtSize: "",
  capSize: "",
  idCardIssued: false,
  westcoatIssued: false,
  apronIssued: false,
  department: "",
  position: "",
  salary: "",
  photo: null,
  employeeSignature: null,
  authorizedSignature: null
});

const OnboardingTab = ({ 
  employees, 
  setEmployees, 
  salaryStructures, 
  setSalaryStructures,
  newJoinees = [],
  setNewJoinees,
  leftEmployees,
  setLeftEmployees,
  onEmployeeUpdate,
  onEmployeesBulkUpdate
}: OnboardingTabProps) => {
   const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [isSavingEPF, setIsSavingEPF] = useState(false);
  const [activeTab, setActiveTab] = useState("onboarding");
  const [newEmployee, setNewEmployee] = useState<NewEmployeeForm>(resetNewEmployeeForm());
  const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [createdEmployeeData, setCreatedEmployeeData] = useState<Employee | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [videoReady, setVideoReady] = useState(false);
  const videoReadyRef = useRef(false);
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
    kycStatus: "not_uploaded",
    transferRequestGenerated: false,
    physicalClaimFiled: false
  });

  // New states for Excel import
  const [excelData, setExcelData] = useState<NewEmployeeForm[]>([]);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  
  // New states for Site dropdown
  const [sites, setSites] = useState<Site[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [siteSearch, setSiteSearch] = useState("");
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const [filteredSites, setFilteredSites] = useState<Site[]>([]);
  const [selectedSiteDetails, setSelectedSiteDetails] = useState<Site | null>(null);
  const [currentSiteStaffCount, setCurrentSiteStaffCount] = useState<number>(0);
  const [availableStaffPositions, setAvailableStaffPositions] = useState<number>(0);
  

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureEmployeeRef = useRef<HTMLInputElement>(null);
  const signatureAuthorizedRef = useRef<HTMLInputElement>(null);
  const documentUploadRef = useRef<HTMLInputElement>(null);
  const excelImportRef = useRef<HTMLInputElement>(null);
  const siteSearchRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
const [savedData, setSavedData] = useState<NewEmployeeForm>(resetNewEmployeeForm());
const steps = [
  { title: "Personal Info", fields: ["name", "dateOfBirth", "gender", "maritalStatus", "photo"] },
  { title: "Contact & Address", fields: ["phone", "email", "permanentAddress", "permanentPincode", "localAddress", "localPincode"] },
  { title: "Employment & Bank", fields: ["department", "position", "salary", "bankName", "accountNumber", "ifscCode", "branchName"] },
  { title: "Family & Emergency", fields: ["fatherName", "motherName", "spouseName", "numberOfChildren", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "nomineeName", "nomineeRelation"] },
  { title: "Uniform & Documents", fields: ["pantSize", "shirtSize", "capSize", "idCardIssued", "westcoatIssued", "apronIssued", "employeeSignature", "authorizedSignature", "uploadedDocuments"] }
];
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
  // Clean up object URL when component unmounts or photo changes
  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  // Fetch sites from API
  const fetchSites = async () => {
    try {
      setLoadingSites(true);
      const response = await fetch(`${API_URL}/sites`);
      const data = await response.json();
      
      if (response.ok) {
        const sitesData = data.sites || data.data || data || [];
        setSites(sitesData);
        setFilteredSites(sitesData);
        console.log(`✅ Loaded ${sitesData.length} sites`);
      } else {
        console.error('Failed to fetch sites:', data.message);
        toast.error('Failed to load sites');
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
      toast.error('Error loading sites. Please check your connection.');
    } finally {
      setLoadingSites(false);
    }
  };

  // Fetch sites on component mount
  useEffect(() => {
    fetchSites();
  }, []);

  // Filter sites based on search
  useEffect(() => {
    if (!siteSearch.trim()) {
      setFilteredSites(sites);
      return;
    }

    const searchTerm = siteSearch.toLowerCase();
    const filtered = sites.filter(site => 
      site.name.toLowerCase().includes(searchTerm) ||
      site.clientName.toLowerCase().includes(searchTerm) ||
      site.location.toLowerCase().includes(searchTerm) ||
      (site.manager && site.manager.toLowerCase().includes(searchTerm))
    );
    setFilteredSites(filtered);
  }, [siteSearch, sites]);

  // Calculate current staff count for selected site - FIXED: This will update whenever employees change
  useEffect(() => {
    if (newEmployee.siteName && sites.length > 0) {
      const site = sites.find(s => s.name === newEmployee.siteName);
      setSelectedSiteDetails(site || null);
      
      if (site) {
        // Count current employees at this site (active employees only)
        const siteEmployees = employees.filter(emp => 
          emp.siteName === site.name && 
          emp.status === "active"
        );
        setCurrentSiteStaffCount(siteEmployees.length);
        
        // Calculate regular staff count (excluding managers and supervisors)
        const regularStaffCount = calculateRegularStaffCount(site);
        setAvailableStaffPositions(regularStaffCount);
      } else {
        // Site not found in sites list
        setCurrentSiteStaffCount(0);
        setAvailableStaffPositions(0);
      }
    } else {
      setSelectedSiteDetails(null);
      setCurrentSiteStaffCount(0);
      setAvailableStaffPositions(0);
    }
  }, [newEmployee.siteName, sites, employees]); // Added employees to dependencies

  // Handle site selection
  const handleSiteSelect = (site: Site) => {
    setNewEmployee(prev => ({ ...prev, siteName: site.name }));
    setShowSiteDropdown(false);
    setSiteSearch("");
    toast.success(`Selected site: ${site.name}`);
  };

  // Clear site selection
  const handleClearSite = () => {
    setNewEmployee(prev => ({ ...prev, siteName: "" }));
    setSiteSearch("");
  };

  // Calculate regular staff count (excluding managers and supervisors)
  const calculateRegularStaffCount = (site: Site | null) => {
    if (!site) return 0;
    
    if (site.staffDeployment && Array.isArray(site.staffDeployment)) {
      // Sum all staff counts
      const totalStaff = site.staffDeployment.reduce((sum, item) => sum + (item.count || 0), 0);
      
      // Subtract manager and supervisor counts if they exist in staffDeployment
      const managerCount = site.staffDeployment.find(item => item.role?.toLowerCase() === "manager")?.count || 0;
      const supervisorCount = site.staffDeployment.find(item => item.role?.toLowerCase() === "supervisor")?.count || 0;
      
      return totalStaff - managerCount - supervisorCount;
    }
    
    // If staffDeployment doesn't exist, use totalStaff and subtract managerCount and supervisorCount
    const totalStaff = site.totalStaff || 0;
    const managerCount = site.managerCount || 0;
    const supervisorCount = site.supervisorCount || 0;
    
    return totalStaff - managerCount - supervisorCount;
  };

  // Check if site has available positions
  const hasAvailablePositions = (site: Site | null): boolean => {
    if (!site) return false;
    
    const regularStaffCount = calculateRegularStaffCount(site);
    const siteEmployees = employees.filter(emp => 
      emp.siteName === site.name && 
      emp.status === "active"
    );
    return siteEmployees.length < regularStaffCount;
  };

  // Get available positions count
  const getAvailablePositions = (site: Site | null): number => {
    if (!site) return 0;
    
    const regularStaffCount = calculateRegularStaffCount(site);
    const siteEmployees = employees.filter(emp => 
      emp.siteName === site.name && 
      emp.status === "active"
    );
    return Math.max(0, regularStaffCount - siteEmployees.length);
  };

  // Calculate total staff for a site (including managers and supervisors)
  const calculateTotalStaff = (site: Site) => {
    if (site.totalStaff !== undefined) return site.totalStaff;
    if (site.staffDeployment && Array.isArray(site.staffDeployment)) {
      return site.staffDeployment.reduce((sum, item) => sum + (item.count || 0), 0);
    }
    return 0;
  };

  // Site Dropdown Component
  const SiteDropdown = () => (
    <div className="relative w-full">
      <div className="relative">
        <div 
          className={`flex items-center justify-between w-full px-3 py-2.5 text-sm border rounded-md cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${
            newEmployee.siteName && selectedSiteDetails && !hasAvailablePositions(selectedSiteDetails) ? 'border-amber-300 bg-amber-50' : 'border-gray-300'
          }`}
          onClick={() => {
            setShowSiteDropdown(!showSiteDropdown);
            if (!showSiteDropdown) {
              setTimeout(() => siteSearchRef.current?.focus(), 100);
            }
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {newEmployee.siteName ? (
              <>
                <Building className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="truncate font-medium text-gray-900">
                  {newEmployee.siteName}
                </span>
              </>
            ) : (
              <span className="text-gray-500 truncate">Select a site...</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {newEmployee.siteName && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearSite();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showSiteDropdown ? 'rotate-180' : ''}`} />
          </div>
        </div>
        
        {showSiteDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-hidden">
            {/* Search Header */}
            <div className="sticky top-0 bg-white border-b p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={siteSearchRef}
                  type="text"
                  placeholder="Search sites by name, client, or location..."
                  value={siteSearch}
                  onChange={(e) => setSiteSearch(e.target.value)}
                  className="pl-9 w-full text-sm h-9"
                  autoFocus
                />
                {siteSearch && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0"
                    onClick={() => setSiteSearch("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1 px-1">
                Type to search {sites.length} sites
              </div>
            </div>
            
            {/* Loading State */}
            {loadingSites ? (
              <div className="p-6 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                <p className="text-sm text-gray-500 mt-2">Loading sites...</p>
              </div>
            ) : filteredSites.length === 0 ? (
              <div className="p-6 text-center">
                <Search className="h-8 w-8 mx-auto text-gray-300" />
                <p className="text-sm font-medium text-gray-700 mt-2">No sites found</p>
                <p className="text-xs text-gray-500 mt-1">
                  {siteSearch ? `No results for "${siteSearch}"` : "No sites available"}
                </p>
                {sites.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={fetchSites}
                  >
                    <Loader2 className="h-3 w-3 mr-2" />
                    Retry
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-y-auto max-h-64">
                {filteredSites.map((site) => {
                  const regularStaffCount = calculateRegularStaffCount(site);
                  const siteEmployees = employees.filter(emp => 
                    emp.siteName === site.name && 
                    emp.status === "active"
                  );
                  const availablePositions = regularStaffCount - siteEmployees.length;
                  const isFull = availablePositions <= 0;
                  
                  return (
                    <div
                      key={site._id}
                      className={`px-3 py-3 text-sm cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                        newEmployee.siteName === site.name ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                      } ${isFull ? 'opacity-60' : ''}`}
                      onClick={() => !isFull && handleSiteSelect(site)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${site.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className={`font-medium truncate ${newEmployee.siteName === site.name ? 'text-blue-700' : 'text-gray-900'}`}>
                              {site.name}
                            </span>
                            {newEmployee.siteName === site.name && (
                              <Check className="h-3 w-3 text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                          
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Building className="h-3 w-3" />
                              <span className="truncate">Client: {site.clientName}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{site.location}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Users className="h-3 w-3" />
                              <span>Regular Staff: {regularStaffCount}</span>
                              <span className="text-gray-400 mx-1">|</span>
                              <span className={isFull ? 'text-red-600 font-medium' : 'text-green-600'}>
                                Available: {availablePositions}
                              </span>
                            </div>
                            
                            {site.managerCount && site.managerCount > 0 && (
                              <div className="text-xs text-gray-500">
                                Managers: {site.managerCount} | Supervisors: {site.supervisorCount || 0}
                              </div>
                            )}
                            
                            {site.services && site.services.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {site.services.slice(0, 2).map((service, idx) => (
                                  <Badge 
                                    key={idx} 
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 h-4"
                                  >
                                    {service}
                                  </Badge>
                                ))}
                                {site.services.length > 2 && (
                                  <Badge 
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 h-4"
                                  >
                                    +{site.services.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                            
                            {site.manager && (
                              <div className="text-xs text-gray-500 mt-1">
                                Manager: <span className="font-medium">{site.manager}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="ml-2 flex-shrink-0 space-y-1">
                          <Badge 
                            variant={site.status === 'active' ? "default" : "secondary"}
                            className={`text-xs ${site.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-gray-100 text-gray-800'}`}
                          >
                            {site.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                          
                          {isFull && (
                            <Badge variant="destructive" className="text-xs">
                              Full
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {site.contractEndDate && (
                        <div className="mt-2 text-xs">
                          <span className="text-gray-500">Contract ends: </span>
                          <span className="font-medium">
                            {new Date(site.contractEndDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                      
                      {isFull && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-1 rounded">
                          No regular staff positions available
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Footer with count */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-3 py-2">
              <div className="flex justify-between items-center text-xs text-gray-600">
                <span>
                  Showing {filteredSites.length} of {sites.length} sites
                </span>
                {siteSearch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setSiteSearch("")}
                  >
                    Clear search
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Click outside to close dropdown */}
      {showSiteDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSiteDropdown(false)}
        />
      )}
      
      {/* Site Status Display */}
      {newEmployee.siteName && selectedSiteDetails && (
        <div className="mt-2 space-y-2">
          <div className={`p-3 rounded-md ${
            currentSiteStaffCount >= availableStaffPositions 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Staff Status:</span>
              <Badge variant={currentSiteStaffCount >= availableStaffPositions ? "destructive" : "default"}>
                {currentSiteStaffCount}/{availableStaffPositions} Staff
              </Badge>
            </div>
            <div className="mt-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Regular Staff Capacity:</span>
                <span className="font-medium">{availableStaffPositions}</span>
              </div>
              <div className="flex justify-between">
                <span>Currently Onboarded:</span>
                <span className="font-medium">{currentSiteStaffCount}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Available Positions:</span>
                <span className={availableStaffPositions - currentSiteStaffCount <= 0 ? 'text-red-600' : 'text-green-600'}>
                  {Math.max(0, availableStaffPositions - currentSiteStaffCount)}
                </span>
              </div>
            </div>
          </div>
          
          {currentSiteStaffCount >= availableStaffPositions && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
              ⚠️ This site has reached its regular staff capacity. No more regular staff can be onboarded.
            </div>
          )}
        </div>
      )}
      
      {/* Validation message */}
      {!newEmployee.siteName && (
        <div className="text-xs text-amber-600 mt-1">
          Required field. Select from available sites.
        </div>
      )}
    </div>
  );

  // Helper functions for Excel import
  const parseExcelDate = (excelDate: any): string => {
    if (!excelDate) return '';
    
    try {
      // If it's already a date string with time (like "2023-09-04 00:00:00")
      if (typeof excelDate === 'string') {
        const datePart = excelDate.split(' ')[0];
        return datePart;
      }
      
      // If it's an Excel serial number
      if (typeof excelDate === 'number') {
        const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
      }
      
      // If it's a Date object
      if (excelDate instanceof Date) {
        return excelDate.toISOString().split('T')[0];
      }
      
      return '';
    } catch (error) {
      console.error('Error parsing date:', error, excelDate);
      return '';
    }
  };

  const parseBooleanField = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    
    const stringValue = String(value).toLowerCase().trim();
    
    if (stringValue === 'yes' || stringValue === 'true' || stringValue === '1') {
      return true;
    }
    
    if (stringValue === 'no' || stringValue === 'false' || stringValue === '0') {
      return false;
    }
    
    // Check for checkboxes or marks
    if (stringValue === '✓' || stringValue === '✔' || stringValue === 'x') {
      return true;
    }
    
    // If it's just text but not empty, assume true
    if (stringValue !== '') {
      return true;
    }
    
    return false;
  };

  // Excel import handler
  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      
      // Read the Excel file
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Get the first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) {
            toast.error("Excel file is empty or has no data");
            setImporting(false);
            return;
          }
          
          // Get headers (first row)
          const headers = jsonData[0] as string[];
          
          // Process data rows
          const processedData: NewEmployeeForm[] = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
              continue; // Skip empty rows
            }
            
            const employeeData: any = resetNewEmployeeForm();
            
            // Map Excel columns to form fields
            headers.forEach((header, index) => {
              const cellValue = row[index];
              
              if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
                switch (header.trim()) {
                  case 'Site Name':
                    employeeData.siteName = String(cellValue);
                    break;
                  case 'Employee Name':
                    employeeData.name = String(cellValue);
                    break;
                  case 'Date of Birth':
                    employeeData.dateOfBirth = parseExcelDate(cellValue);
                    break;
                  case 'Date of Joining':
                    employeeData.dateOfJoining = parseExcelDate(cellValue);
                    break;
                  case 'Date of Exit':
                    employeeData.dateOfExit = parseExcelDate(cellValue);
                    break;
                  case 'Contact No':
                    employeeData.phone = String(cellValue).replace(/\D/g, '').slice(0, 10);
                    break;
                  case 'Blood Group':
                    employeeData.bloodGroup = String(cellValue).trim();
                    break;
                  case 'Email':
                    employeeData.email = String(cellValue).toLowerCase().trim();
                    break;
                  case 'Aadhar Number':
                    employeeData.aadharNumber = String(cellValue).replace(/\D/g, '').slice(0, 12);
                    break;
                  case 'PAN Number':
                    employeeData.panNumber = String(cellValue).toUpperCase().trim();
                    break;
                  case 'ESIC Number':
                    employeeData.esicNumber = String(cellValue);
                    break;
                  case 'PF/UAN Number':
                    employeeData.uanNumber = String(cellValue);
                    break;
                  case 'Permanent Address':
                    employeeData.permanentAddress = String(cellValue);
                    break;
                  case 'Permanent Pin Code':
                    employeeData.permanentPincode = String(cellValue).replace(/\D/g, '').slice(0, 6);
                    break;
                  case 'Local Address':
                    employeeData.localAddress = String(cellValue);
                    break;
                  case 'Local Pin Code':
                    employeeData.localPincode = String(cellValue).replace(/\D/g, '').slice(0, 6);
                    break;
                  case 'Bank Name':
                    employeeData.bankName = String(cellValue);
                    break;
                  case 'Account Number':
                    employeeData.accountNumber = String(cellValue);
                    break;
                  case 'IFSC Code':
                    employeeData.ifscCode = String(cellValue).toUpperCase().trim();
                    break;
                  case 'Branch Name':
                    employeeData.branchName = String(cellValue);
                    break;
                  case "Father's Name":
                    employeeData.fatherName = String(cellValue);
                    break;
                  case "Mother's Name":
                    employeeData.motherName = String(cellValue);
                    break;
                  case 'Spouse Name':
                    employeeData.spouseName = String(cellValue);
                    break;
                  case 'Number of Children':
                    employeeData.numberOfChildren = isNaN(Number(cellValue)) ? '' : String(Number(cellValue));
                    break;
                  case 'Emergency Contact Name':
                    employeeData.emergencyContactName = String(cellValue);
                    break;
                  case 'Emergency Contact Phone':
                    employeeData.emergencyContactPhone = String(cellValue).replace(/\D/g, '').slice(0, 10);
                    break;
                  case 'Relation':
                    employeeData.emergencyContactRelation = String(cellValue);
                    break;
                  case 'Nominee Name':
                    employeeData.nomineeName = String(cellValue);
                    break;
                  case 'Nominee Relation':
                    employeeData.nomineeRelation = String(cellValue);
                    break;
                  case 'Pant Size':
                    employeeData.pantSize = String(cellValue);
                    break;
                  case 'Shirt Size':
                    employeeData.shirtSize = String(cellValue);
                    break;
                  case 'Cap Size':
                    employeeData.capSize = String(cellValue);
                    break;
                  case 'ID Card Issued':
                    employeeData.idCardIssued = parseBooleanField(cellValue);
                    break;
                  case 'Westcoat Issued':
                    employeeData.westcoatIssued = parseBooleanField(cellValue);
                    break;
                  case 'Apron Issued':
                    employeeData.apronIssued = parseBooleanField(cellValue);
                    break;
                  case 'Department':
                    employeeData.department = String(cellValue);
                    break;
                  case 'Position':
                    employeeData.position = String(cellValue);
                    break;
                  case 'Monthly Salary':
                    employeeData.salary = isNaN(Number(cellValue)) ? '' : String(Number(cellValue));
                    break;
                }
              }
            });
            
            // Only add if there's at least a name
            if (employeeData.name && employeeData.name.trim() !== '') {
              processedData.push(employeeData);
            }
          }
          
          setExcelData(processedData);
          setShowExcelPreview(true);
          toast.success(`Loaded ${processedData.length} employees from Excel`);
          
        } catch (error) {
          console.error('Error processing Excel:', error);
          toast.error('Error reading Excel file. Please check the format.');
        } finally {
          setImporting(false);
        }
      };
      
      reader.onerror = () => {
        toast.error('Error reading file');
        setImporting(false);
      };
      
      reader.readAsBinaryString(file);
      
    } catch (error) {
      console.error('Excel import error:', error);
      toast.error('Failed to import Excel file');
      setImporting(false);
    }
  };

  // Bulk import function
  const handleBulkImport = async () => {
    if (excelData.length === 0) {
      toast.error('No data to import');
      return;
    }

    // Validate site capacities first
    const siteCounts: { [key: string]: number } = {};
    const siteDetails: { [key: string]: Site } = {};
    
    sites.forEach(site => {
      siteDetails[site.name] = site;
    });
    
    const employeesBySite: { [key: string]: NewEmployeeForm[] } = {};
    
    excelData.forEach(emp => {
      if (emp.siteName) {
        if (!employeesBySite[emp.siteName]) {
          employeesBySite[emp.siteName] = [];
        }
        employeesBySite[emp.siteName].push(emp);
      }
    });
    
    // Check each site's capacity
    const sitesExceedingCapacity: string[] = [];
    
    for (const siteName in employeesBySite) {
      const site = siteDetails[siteName];
      if (!site) {
        sitesExceedingCapacity.push(`${siteName} (Site not found)`);
        continue;
      }
      
      const regularStaffCount = calculateRegularStaffCount(site);
      const currentStaff = employees.filter(emp => 
        emp.siteName === siteName && 
        emp.status === "active"
      ).length;
      
      const importCount = employeesBySite[siteName].length;
      const totalAfterImport = currentStaff + importCount;
      
      if (totalAfterImport > regularStaffCount) {
        sitesExceedingCapacity.push(
          `${siteName}: Would exceed capacity (Current: ${currentStaff}, Importing: ${importCount}, Capacity: ${regularStaffCount})`
        );
      }
    }
    
    if (sitesExceedingCapacity.length > 0) {
      toast.error(
        <div>
          <p className="font-semibold">Cannot import due to capacity issues:</p>
          <ul className="list-disc pl-4 mt-1 text-sm">
            {sitesExceedingCapacity.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      );
      setImporting(false);
      return;
    }

    setImporting(true);
    setImportProgress(0);
    
    const successfulImports: Employee[] = [];
    const failedImports: { name: string; error: string }[] = [];
    
    try {
      for (let i = 0; i < excelData.length; i++) {
        const employeeData = excelData[i];
        
        try {
          // Skip if essential fields are missing
          if (!employeeData.name || !employeeData.aadharNumber) {
            failedImports.push({
              name: employeeData.name || 'Unknown',
              error: 'Missing required fields (Name or Aadhar)'
            });
            continue;
          }

          // Generate email if not provided
          let finalEmail = employeeData.email || '';
          if (!finalEmail && employeeData.name) {
            const nameParts = employeeData.name.toLowerCase().split(' ');
            const firstName = nameParts[0]?.replace(/[^a-z]/g, '') || 'employee';
            const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1].replace(/[^a-z]/g, '') : '';
            const randomNum = Math.floor(100 + Math.random() * 900);
            finalEmail = `${firstName}${lastName ? '.' + lastName : ''}${randomNum}@skenterprises.com`.toLowerCase();
          } else if (!finalEmail) {
            const randomNum = Math.floor(100 + Math.random() * 900);
            finalEmail = `employee${randomNum}@skenterprises.com`.toLowerCase();
          }

          // Create FormData for each employee
          const formData = new FormData();
          
          // Add employee data
          const employeeDataToSend = {
            name: employeeData.name,
            email: finalEmail,
            phone: employeeData.phone || '',
            aadharNumber: employeeData.aadharNumber,
            panNumber: employeeData.panNumber || '',
            esicNumber: employeeData.esicNumber || '',
            uanNumber: employeeData.uanNumber || '',
            siteName: employeeData.siteName || '',
            dateOfBirth: employeeData.dateOfBirth || '',
            dateOfJoining: employeeData.dateOfJoining || new Date().toISOString().split("T")[0],
            dateOfExit: employeeData.dateOfExit || '',
            bloodGroup: employeeData.bloodGroup || '',
            gender: employeeData.gender || '',
            maritalStatus: employeeData.maritalStatus || '',
            permanentAddress: employeeData.permanentAddress || '',
            permanentPincode: employeeData.permanentPincode || '',
            localAddress: employeeData.localAddress || '',
            localPincode: employeeData.localPincode || '',
            bankName: employeeData.bankName || '',
            accountNumber: employeeData.accountNumber || '',
            ifscCode: employeeData.ifscCode || '',
            branchName: employeeData.branchName || '',
            fatherName: employeeData.fatherName || '',
            motherName: employeeData.motherName || '',
            spouseName: employeeData.spouseName || '',
            numberOfChildren: employeeData.numberOfChildren || '',
            emergencyContactName: employeeData.emergencyContactName || '',
            emergencyContactPhone: employeeData.emergencyContactPhone || '',
            emergencyContactRelation: employeeData.emergencyContactRelation || '',
            nomineeName: employeeData.nomineeName || '',
            nomineeRelation: employeeData.nomineeRelation || '',
            pantSize: employeeData.pantSize || '',
            shirtSize: employeeData.shirtSize || '',
            capSize: employeeData.capSize || '',
            idCardIssued: employeeData.idCardIssued || false,
            westcoatIssued: employeeData.westcoatIssued || false,
            apronIssued: employeeData.apronIssued || false,
            department: employeeData.department || '',
            position: employeeData.position || '',
            salary: employeeData.salary || '0'
          };

          // Append all data
          Object.entries(employeeDataToSend).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              formData.append(key, value.toString());
            }
          });

          // Send to backend
          const response = await fetch(`${API_URL}/employees`, {
            method: "POST",
            body: formData
          });

          const data = await response.json();

          if (response.ok && data.employee) {
            successfulImports.push(data.employee);
          } else {
            failedImports.push({
              name: employeeData.name,
              error: data.message || 'Unknown error'
            });
          }
          
        } catch (error: any) {
          failedImports.push({
            name: employeeData.name || 'Unknown',
            error: error.message || 'Unknown error'
          });
        }
        
        // Update progress
        setImportProgress(Math.round(((i + 1) / excelData.length) * 100));
      }
      
      // Update employees list
      if (successfulImports.length > 0) {
        setEmployees(prev => [...prev, ...successfulImports]);
        toast.success(`Successfully imported ${successfulImports.length} employees`);
      }
      
      // Show errors if any
      if (failedImports.length > 0) {
        toast.error(`${failedImports.length} employees failed to import`);
        console.log('Failed imports:', failedImports);
      }
      
      // Reset
      setExcelData([]);
      setShowExcelPreview(false);
      
    } catch (error) {
      console.error('Bulk import error:', error);
      toast.error('Error during bulk import');
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  // Download template function
  const downloadExcelTemplate = () => {
    const headers = [
      'Site Name',
      'Employee Name',
      'Date of Birth',
      'Date of Joining',
      'Date of Exit',
      'Contact No',
      'Blood Group',
      'Email',
      'Aadhar Number',
      'PAN Number',
      'ESIC Number',
      'PF/UAN Number',
      'Permanent Address',
      'Permanent Pin Code',
      'Local Address',
      'Local Pin Code',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'Branch Name',
      "Father's Name",
      "Mother's Name",
      'Spouse Name',
      'Number of Children',
      'Emergency Contact Name',
      'Emergency Contact Phone',
      'Relation',
      'Nominee Name',
      'Nominee Relation',
      'Pant Size',
      'Shirt Size',
      'Cap Size',
      'ID Card Issued',
      'Westcoat Issued',
      'Apron Issued',
      'Department',
      'Position',
      'Monthly Salary'
    ];

    const data = [headers];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    XLSX.writeFile(wb, 'Employee_Import_Template.xlsx');
    toast.success('Template downloaded successfully');
  };

  // Initialize EPF Form with employee data
  const initializeEPFForm = (employee: Employee) => {
    setCreatedEmployeeData(employee);
    
    const today = new Date().toISOString().split('T')[0];
    
    // Safely get salary with fallbacks
    let salaryValue = 0;
    if (employee.salary) {
      salaryValue = typeof employee.salary === 'string' 
        ? parseFloat(employee.salary) 
        : Number(employee.salary) || 0;
    }
    
    // Safely get other properties with fallbacks
    const epfData: EPFForm11Data = {
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
      previousUAN: employee.uanNumber || employee.uan || "",
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
      enrolledDate: employee.joinDate || employee.dateOfJoining || today,
      firstEmploymentWages: salaryValue.toString() || "0",
      epfMemberBeforeSep2014: false,
      epfAmountWithdrawn: false,
      epsAmountWithdrawn: false,
      epsAmountWithdrawnAfterSep2014: false,
      declarationDate: today,
      declarationPlace: "Mumbai",
      employerDeclarationDate: today
    };
    
    setEpfFormData(epfData);
    setActiveTab("epf-form");
    toast.success("Employee created successfully! Please fill EPF Form 11.");
  };

  const isAutoFilledField = (fieldName: keyof EPFForm11Data): boolean => {
    const autoFilledFields: (keyof EPFForm11Data)[] = [
      'memberName',
      'fatherOrSpouseName',
      'dateOfBirth',
      'gender',
      'maritalStatus',
      'email',
      'mobileNumber',
      'aadharNumber',
      'panNumber',
      'bankAccountNumber',
      'ifscCode',
      'enrolledDate',
      'firstEmploymentWages'
    ];
    
    return autoFilledFields.includes(fieldName);
  };

  // Camera functions
  const startCamera = async () => {
  try {
    // Stop any existing stream first
    if (streamRef.current) {
      stopCamera();
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    streamRef.current = stream;
    setVideoReady(false);
    videoReadyRef.current = false;
    setShowCamera(true);
    setCapturedImage(null);

    // Attach stream after the modal is shown so the video element exists
    requestAnimationFrame(() => {
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;

      // Use oncanplay – it fires when the video is actually ready to render frames
      videoRef.current.oncanplay = () => {
        videoRef.current?.play().then(() => {
          setVideoReady(true);
          videoReadyRef.current = true;
        }).catch(console.error);
      };
    });
  } catch (error: any) {
    console.error("Error accessing camera:", error);
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      toast.error("Camera permission denied. Please allow camera access and try again.");
    } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      toast.error("No camera found on this device.");
    } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      toast.error("Camera is already in use by another application.");
    } else {
      toast.error("Cannot access camera. Please check permissions and try again.");
    }
  }
};
const capturePhoto = () => {
  if (!videoRef.current || !canvasRef.current) {
    toast.error("Camera not ready");
    return;
  }

  if (!videoReadyRef.current) {
    toast.error("Camera is still starting. Please wait a moment.");
    return;
  }

  const video = videoRef.current;
  const canvas = canvasRef.current;

  if (video.videoWidth === 0 || video.videoHeight === 0) {
    toast.error("Camera stream not ready yet. Please wait.");
    return;
  }

  const context = canvas.getContext("2d");
  if (context) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageData);
    stopCamera();
    toast.success("Photo captured successfully!");
  } else {
    toast.error("Failed to capture photo");
  }
};

const retakePhoto = () => {
  setCapturedImage(null);
  // Restart camera
  startCamera();
};

const useCapturedPhoto = () => {
  if (capturedImage) {
    // Convert data URL to blob
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        // Create a file from the blob
        const file = new File([blob], `employee-photo-${Date.now()}.jpg`, { 
          type: 'image/jpeg' 
        });
        
        setNewEmployee({...newEmployee, photo: file});
        
        // Create preview URL
        if (photoPreview) {
          URL.revokeObjectURL(photoPreview);
        }
        const previewUrl = URL.createObjectURL(file);
        setPhotoPreview(previewUrl);
        
        toast.success("Photo added successfully!");
        
        // Close camera modal
        setShowCamera(false);
        setCapturedImage(null);
      })
      .catch(error => {
        console.error("Error converting photo:", error);
        toast.error("Error processing photo. Please try again.");
      });
  }
};

const stopCamera = () => {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }
  if (videoRef.current) {
    videoRef.current.srcObject = null;
    videoRef.current.oncanplay = null; // clean up event listener
  }
  setVideoReady(false);
  videoReadyRef.current = false;
};
// Clean up camera on component unmount
useEffect(() => {
  return () => {
    stopCamera();
  };
}, []);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
      setNewEmployee({...newEmployee, photo: file});
      
      toast.success("Photo selected successfully!");
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    setNewEmployee({...newEmployee, photo: null});
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
  };

  // Handle add employee
  const handleAddEmployee = async () => {
    // Validate required fields (email is optional but we'll generate if empty for backend)
    const requiredFields = [
      { field: newEmployee.name, name: 'Name' },
      { field: newEmployee.aadharNumber, name: 'Aadhar Number' },
      { field: newEmployee.position, name: 'Position' },
      { field: newEmployee.department, name: 'Department' },
      { field: newEmployee.siteName, name: 'Site Name' },
      
    ];

    const missingFields = requiredFields
      .filter(item => !item.field || item.field.trim() === '')
      .map(item => item.name);

    if (missingFields.length > 0) {
      toast.error(`Please fill all required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Generate email if not provided (to satisfy backend requirement)
    let finalEmail = newEmployee.email?.trim() || '';
    if (!finalEmail && newEmployee.name) {
      const nameParts = newEmployee.name.toLowerCase().split(' ');
      const firstName = nameParts[0]?.replace(/[^a-z]/g, '') || 'employee';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1].replace(/[^a-z]/g, '') : '';
      const randomNum = Math.floor(100 + Math.random() * 900);
      finalEmail = `${firstName}${lastName ? '.' + lastName : ''}${randomNum}@skenterprises.com`.toLowerCase();
    } else if (!finalEmail) {
      const randomNum = Math.floor(100 + Math.random() * 900);
      finalEmail = `employee${randomNum}@skenterprises.com`.toLowerCase();
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(finalEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Validate phone number - optional
    if (newEmployee.phone && !/^\d{10}$/.test(newEmployee.phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    // Validate Aadhar number
    if (!/^\d{12}$/.test(newEmployee.aadharNumber)) {
      toast.error("Please enter a valid 12-digit Aadhar number");
      return;
    }

    // Validate PAN number if provided
    if (newEmployee.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(newEmployee.panNumber.toUpperCase())) {
      toast.error("Please enter a valid PAN number (format: ABCDE1234F)");
      return;
    }

    // Salary is optional – default to 0 if empty/invalid
let salaryValue = 0;
if (newEmployee.salary && newEmployee.salary.trim() !== "") {
  const parsed = parseFloat(newEmployee.salary);
  if (!isNaN(parsed) && parsed > 0) {
    salaryValue = parsed;
  } else {
    toast.error("Please enter a valid salary amount (positive number)");
    return;
  }
}

    // Validate site capacity
    if (selectedSiteDetails) {
      const regularStaffCount = calculateRegularStaffCount(selectedSiteDetails);
      const siteEmployees = employees.filter(emp => 
        emp.siteName === selectedSiteDetails.name && 
        emp.status === "active"
      );
      
      if (siteEmployees.length >= regularStaffCount) {
        toast.error(`Cannot onboard employee: Site "${selectedSiteDetails.name}" has reached its regular staff capacity (${regularStaffCount} staff).`);
        return;
      }
    }

    setLoading(true);

    try {
      // Create FormData object
      const formData = new FormData();

      // Add employee photo if exists
      if (newEmployee.photo instanceof File) {
        formData.append('photo', newEmployee.photo);
      }

      // Add employee signature if exists
      if (newEmployee.employeeSignature instanceof File) {
        formData.append('employeeSignature', newEmployee.employeeSignature);
      }

      // Add authorized signature if exists
      if (newEmployee.authorizedSignature instanceof File) {
        formData.append('authorizedSignature', newEmployee.authorizedSignature);
      }

      // Clean and prepare data for sending
      const employeeDataToSend = {
        name: newEmployee.name.trim(),
        email: finalEmail, // Use generated email if not provided
        phone: newEmployee.phone?.trim() || '',
        aadharNumber: newEmployee.aadharNumber.replace(/\s/g, ''),
        panNumber: newEmployee.panNumber?.toUpperCase().replace(/\s/g, '') || '',
        esicNumber: newEmployee.esicNumber?.trim() || '',
        uanNumber: newEmployee.uanNumber?.trim() || '',
        siteName: newEmployee.siteName.trim(),
        dateOfBirth: newEmployee.dateOfBirth || '',
        dateOfJoining: newEmployee.dateOfJoining || new Date().toISOString().split("T")[0],
        dateOfExit: newEmployee.dateOfExit || '',
        bloodGroup: newEmployee.bloodGroup || '',
        gender: newEmployee.gender || '',
        maritalStatus: newEmployee.maritalStatus || '',
        permanentAddress: newEmployee.permanentAddress?.trim() || '',
        permanentPincode: newEmployee.permanentPincode?.trim() || '',
        localAddress: newEmployee.localAddress?.trim() || '',
        localPincode: newEmployee.localPincode?.trim() || '',
        bankName: newEmployee.bankName?.trim() || '',
        accountNumber: newEmployee.accountNumber?.replace(/\s/g, '') || '',
        ifscCode: newEmployee.ifscCode?.toUpperCase().replace(/\s/g, '') || '',
        branchName: newEmployee.branchName?.trim() || '',
        fatherName: newEmployee.fatherName?.trim() || '',
        motherName: newEmployee.motherName?.trim() || '',
        spouseName: newEmployee.spouseName?.trim() || '',
        numberOfChildren: newEmployee.numberOfChildren?.trim() || '',
        emergencyContactName: newEmployee.emergencyContactName?.trim() || '',
        emergencyContactPhone: newEmployee.emergencyContactPhone?.trim() || '',
        emergencyContactRelation: newEmployee.emergencyContactRelation?.trim() || '',
        nomineeName: newEmployee.nomineeName?.trim() || '',
        nomineeRelation: newEmployee.nomineeRelation?.trim() || '',
        pantSize: newEmployee.pantSize || '',
        shirtSize: newEmployee.shirtSize || '',
        capSize: newEmployee.capSize || '',
        idCardIssued: newEmployee.idCardIssued,
        westcoatIssued: newEmployee.westcoatIssued,
        apronIssued: newEmployee.apronIssued,
        department: newEmployee.department.trim(),
        position: newEmployee.position.trim(),
        salary: salaryValue.toString()
      };

      // Append all other data
      Object.entries(employeeDataToSend).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          formData.append(key, value.toString());
        }
      });

      console.log('Sending employee data to backend...', employeeDataToSend);

      const response = await fetch(`${API_URL}/employees`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      console.log('Server response:', data);

      if (!response.ok) {
        // Handle specific error messages from server
        const errorMessage = data.message || data.error || `Server error: ${response.status}`;
        throw new Error(errorMessage);
      }

      toast.success("Employee created successfully!");

      
      
      // The backend returns the employee data with Cloudinary URLs
      const createdEmployee = data.employee || data.data || data;
      
      // Debug: Log the created employee data
      console.log('Created employee data:', createdEmployee);
      
      if (!createdEmployee) {
        throw new Error('No employee data returned from server');
      }
      
      // Ensure the employee object has all required properties
      const processedEmployee: Employee = {
        _id: createdEmployee._id,
        employeeId: createdEmployee.employeeId,
        name: createdEmployee.name,
        email: createdEmployee.email,
        phone: createdEmployee.phone,
        aadharNumber: createdEmployee.aadharNumber,
        department: createdEmployee.department,
        position: createdEmployee.position,
        joinDate: createdEmployee.joinDate || createdEmployee.dateOfJoining,
        dateOfJoining: createdEmployee.dateOfJoining,
        status: createdEmployee.status || 'active',
        salary: createdEmployee.salary || 0,
        uanNumber: createdEmployee.uanNumber,
        uan: createdEmployee.uan,
        esicNumber: createdEmployee.esicNumber,
        panNumber: createdEmployee.panNumber,
        photo: createdEmployee.photo,
        photoPublicId: createdEmployee.photoPublicId,
        siteName: createdEmployee.siteName,
        dateOfBirth: createdEmployee.dateOfBirth,
        bloodGroup: createdEmployee.bloodGroup,
        gender: createdEmployee.gender,
        maritalStatus: createdEmployee.maritalStatus,
        permanentAddress: createdEmployee.permanentAddress,
        permanentPincode: createdEmployee.permanentPincode,
        localAddress: createdEmployee.localAddress,
        localPincode: createdEmployee.localPincode,
        bankName: createdEmployee.bankName,
        accountNumber: createdEmployee.accountNumber,
        ifscCode: createdEmployee.ifscCode,
        branchName: createdEmployee.branchName,
        fatherName: createdEmployee.fatherName,
        motherName: createdEmployee.motherName,
        spouseName: createdEmployee.spouseName,
        numberOfChildren: createdEmployee.numberOfChildren,
        emergencyContactName: createdEmployee.emergencyContactName,
        emergencyContactPhone: createdEmployee.emergencyContactPhone,
        emergencyContactRelation: createdEmployee.emergencyContactRelation,
        nomineeName: createdEmployee.nomineeName,
        nomineeRelation: createdEmployee.nomineeRelation,
        pantSize: createdEmployee.pantSize,
        shirtSize: createdEmployee.shirtSize,
        capSize: createdEmployee.capSize,
        idCardIssued: createdEmployee.idCardIssued || false,
        westcoatIssued: createdEmployee.westcoatIssued || false,
        apronIssued: createdEmployee.apronIssued || false,
        employeeSignature: createdEmployee.employeeSignature,
        authorizedSignature: createdEmployee.authorizedSignature,
        createdAt: createdEmployee.createdAt,
        updatedAt: createdEmployee.updatedAt
      };
      
      
      setEmployees(prev => [...prev, processedEmployee]);
      
      // Reset form
      setNewEmployee(resetNewEmployeeForm());
      setUploadedDocuments([]);
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
        setPhotoPreview(null);
      }
      if (newEmployee.photo instanceof File) {
  try {
    const faceFormData = new FormData();
    faceFormData.append('photo', newEmployee.photo);
    await axios.post(`${API_URL}/attendance/register-face/${processedEmployee._id}`, faceFormData);
    toast.success("Face registered successfully for attendance");
  } catch (faceErr) {
    console.error("Face registration failed:", faceErr);
    toast.warning("Employee created but face registration failed. You can register face later.");
  }
}
      
      // Then initialize EPF Form and switch tabs
      initializeEPFForm(processedEmployee);

    } catch (error: any) {
      console.error("Error creating employee:", error);
      
      // Show more specific error message
      if (error.message.includes('500')) {
        toast.error("Server error. Please check if the backend server is running and try again.");
      } else if (error.message.includes('Failed to fetch')) {
        toast.error("Network error. Please check your connection and ensure the backend server is running.");
      } else {
        toast.error(error.message || "Error creating employee. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle document upload
  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newDocuments = Array.from(files);
      setUploadedDocuments(prev => [...prev, ...newDocuments]);
      toast.success(`${newDocuments.length} document(s) uploaded successfully!`);
    }
  };

  const handleRemoveDocument = (index: number) => {
    setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
  };

  // Handle signature upload
  const handleSignatureUpload = (type: 'employee' | 'authorized', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (type === 'employee') {
        setNewEmployee({...newEmployee, employeeSignature: file});
      } else {
        setNewEmployee({...newEmployee, authorizedSignature: file});
      }
      toast.success(`${type === 'employee' ? 'Employee' : 'Authorized'} signature uploaded successfully!`);
    }
  };

  // Handle EPF form change
  const handleEPFFormChange = (field: keyof EPFForm11Data, value: any) => {
    setEpfFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle save EPF form
  const handleSaveEPFForm = async () => {
    if (!epfFormData.memberName || !epfFormData.aadharNumber || !createdEmployeeData) {
      toast.error("Please fill all required fields and select an employee");
      return;
    }

    // Validate Aadhar number
    if (!/^\d{12}$/.test(epfFormData.aadharNumber)) {
      toast.error("Please enter a valid 12-digit Aadhar number");
      return;
    }

    // Validate PAN number if provided
    if (epfFormData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(epfFormData.panNumber)) {
      toast.error("Please enter a valid PAN number (format: ABCDE1234F)");
      return;
    }

    try {
      setIsSavingEPF(true);
      
      // Use _id (MongoDB ObjectId) as employeeId
      const employeeId = createdEmployeeData._id;
      
      if (!employeeId) {
        toast.error("Invalid employee data - missing ID");
        return;
      }
      
      console.log('Saving EPF Form for employee:', employeeId);
      
      const response = await fetch(`${API_URL}/epf-forms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...epfFormData,
          employeeId: employeeId, // Send MongoDB _id
          employeeNumber: createdEmployeeData.employeeId, // Also send employee number for reference
          firstEmploymentWages: parseFloat(epfFormData.firstEmploymentWages) || 0,
          enrolledDate: epfFormData.enrolledDate || createdEmployeeData.joinDate || createdEmployeeData.dateOfJoining || new Date().toISOString().split('T')[0],
          declarationDate: epfFormData.declarationDate || new Date().toISOString().split('T')[0],
          employerDeclarationDate: epfFormData.employerDeclarationDate || new Date().toISOString().split('T')[0]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save EPF Form");
      }

      if (data.success) {
        toast.success("EPF Form saved successfully!");
        setActiveTab("onboarding");
        setCreatedEmployeeData(null);
        
        // Reset EPF form data
        setEpfFormData({
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
          employerDeclarationDate: new Date().toISOString().split("T")[0]
        });
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

  // Handle print EPF form
  const handlePrintEPFForm = () => {
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
              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">1. Name of Member (Aadhar Name)</div>
                  <div class="value">${epfFormData.memberName}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">2. ${epfFormData.relationshipType === 'father' ? 'Father\'s Name' : 'Spouse\'s Name'}</div>
                  <div class="value">${epfFormData.fatherOrSpouseName}</div>
                  <div class="note">(Please tick whichever applicable)</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">3. Date of Birth (dd/mm/yyyy)</div>
                  <div class="value">${epfFormData.dateOfBirth}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">4. Gender (Male / Female / Transgender)</div>
                  <div class="value">${epfFormData.gender}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">5. Marital Status ? (Single/Married/Widow/Widower/Divorcee)</div>
                  <div class="value">${epfFormData.maritalStatus}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">6. (a) eMail ID</div>
                  <div class="value">${epfFormData.email}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">(b) Mobile No (Aadhar Registered)</div>
                  <div class="value">${epfFormData.mobileNumber}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">7. Whether earlier member of the Employee's Provident Fund Scheme, 1952 ?</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.previousEPFMember ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.previousEPFMember ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group half-width">
                  <div class="label">8. Whether earlier member of the Employee's Pension Scheme, 1995 ?</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.previousPensionMember ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.previousPensionMember ? 'checked' : ''}> No
                  </div>
                </div>
              </div>

              <div class="section-title">9. Previous Employment details ? (If Yes, 7 & 8 details above)</div>
              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">a) Universal Account Number (UAN)</div>
                  <div class="value">${epfFormData.previousUAN}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">b) Previous PF Account Number</div>
                  <div class="value">${epfFormData.previousPFAccountNumber}</div>
                </div>
              </div>
              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">c) Date of Exit from previous Employment</div>
                  <div class="value">${epfFormData.dateOfExit}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">d) Scheme Certificate No (If issued)</div>
                  <div class="value">${epfFormData.schemeCertificateNumber}</div>
                </div>
              </div>
              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">e) Pension Payment Order (PPO) (If issued)</div>
                  <div class="value">${epfFormData.pensionPaymentOrder}</div>
                </div>
              </div>

              <div class="section-title">10. International Worker Details</div>
              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">a) International Worker</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.internationalWorker ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.internationalWorker ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group half-width">
                  <div class="label">b) If Yes, state country of origin (name of other country)</div>
                  <div class="value">${epfFormData.countryOfOrigin}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">c) Passport No.</div>
                  <div class="value">${epfFormData.passportNumber}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">d) Validity of passport (dd/mm/yyyy) to (dd/mm/yyyy)</div>
                  <div class="value">${epfFormData.passportValidityFrom} to ${epfFormData.passportValidityTo}</div>
                </div>
              </div>

              <div class="section-title">11. KYC Details : (attach self attested copies of following KYC's)</div>
              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">a) Bank Account No. & IFS Code</div>
                  <div class="value">${epfFormData.bankAccountNumber} / ${epfFormData.ifscCode}</div>
                </div>
                <div class="field-group half-width">
                  <div class="label">b) AADHAR Number</div>
                  <div class="value">${epfFormData.aadharNumber}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group half-width">
                  <div class="label">c) Permanent Account Number (PAN), If available</div>
                  <div class="value">${epfFormData.panNumber}</div>
                </div>
              </div>

              <div class="section-title">12. Declaration Details</div>
              <div class="field-row">
                <div class="field-group quarter-width">
                  <div class="label">First EPF Member</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.firstEPFMember ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.firstEPFMember ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group quarter-width">
                  <div class="label">Enrolled Date</div>
                  <div class="value">${epfFormData.enrolledDate}</div>
                </div>
                <div class="field-group quarter-width">
                  <div class="label">First Employment EPF Wages</div>
                  <div class="value">₹${epfFormData.firstEmploymentWages}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group quarter-width">
                  <div class="label">Are you EPF Member before 01/09/2014</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.epfMemberBeforeSep2014 ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.epfMemberBeforeSep2014 ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group quarter-width">
                  <div class="label">If Yes, EPF Amount Withdrawn?</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.epfAmountWithdrawn ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.epfAmountWithdrawn ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group quarter-width">
                  <div class="label">If Yes, EPS (Pension) Amount Withdrawn?</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.epsAmountWithdrawn ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.epsAmountWithdrawn ? 'checked' : ''}> No
                  </div>
                </div>
                <div class="field-group quarter-width">
                  <div class="label">After Sep 2014 earned EPS (Pension) Amount Withdrawn before Join current Employer?</div>
                  <div class="checkbox-group">
                    <input type="checkbox" class="checkbox" ${epfFormData.epsAmountWithdrawnAfterSep2014 ? 'checked' : ''}> Yes
                    <input type="checkbox" class="checkbox" ${!epfFormData.epsAmountWithdrawnAfterSep2014 ? 'checked' : ''}> No
                  </div>
                </div>
              </div>

              <div class="declaration">
                <p><strong>UNDERTAKING</strong></p>
                <p>1) Certified that the particulars are true to the best of my knowledge</p>
                <p>2) I authorise EPFO to use my Aadhar for verification / authentication / eKYC purpose for service delivery</p>
                <p>3) Kindly transfer the fund and service details, if applicable, from the previous PF account as declared above to the present PF account.</p>
                <p>(The transfer would be possible only if the identified KYC details approved by previous employer has been verified by present employer using his Digital Signature</p>
                <p>4) In case of changes in above details, the same will be intimated to employer at the earliest.</p>
              </div>

              <div class="signature-area">
                <div class="field-row">
                  <div class="field-group half-width">
                    <div class="label">Date :</div>
                    <div class="value">${epfFormData.declarationDate}</div>
                  </div>
                  <div class="field-group half-width">
                    <div class="label">Place :</div>
                    <div class="value">________________</div>
                  </div>
                </div>
                <div class="field-row">
                  <div class="field-group full-width">
                    <div class="label">Signature of Member</div>
                    <div class="value" style="height: 40px;"></div>
                  </div>
                </div>
              </div>

              <div class="section-title">DECLARATION BY PRESENT EMPLOYER</div>
              
              <div class="field-row">
                <div class="field-group full-width">
                  <div class="label">A. The member Mr./Ms./Mrs. ${epfFormData.memberName} has joined on ${epfFormData.enrolledDate} and has been allotted PF Number ${createdEmployeeData?.uanNumber || createdEmployeeData?.uan || "Pending"}</div>
                </div>
              </div>

              <div class="field-row">
                <div class="field-group full-width">
                  <div class="label">B. In case the person was earlier not a member of EPF Scheme, 1952 and EPS, 1995: ((Post allotment of UAN) The UAN allotted or the member is) Please Tick the Appropriate Option :</div>
                </div>
              </div>

              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox" ${epfFormData.kycStatus === "not_uploaded" ? "checked" : ""}> The KYC details of the above member in the JAN database have not been uploaded
                </div>
              </div>
              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox" ${epfFormData.kycStatus === "uploaded_not_approved" ? "checked" : ""}> Have been uploaded but not approved
                </div>
              </div>
              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox" ${epfFormData.kycStatus === "uploaded_approved" ? "checked" : ""}> Have been uploaded and approved with DSC
                </div>
              </div>

              <div class="field-row">
                <div class="field-group full-width">
                  <div class="label">C. In case the person was earlier a member of EPF Scheme, 1952 and EPS 1995;</div>
                </div>
              </div>

              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox" ${epfFormData.transferRequestGenerated ? "checked" : ""}> The KYC details of the above member in the UAN database have been approved with Digital Signature Certificate and transfer request has been generated on portal
                </div>
              </div>
              <div class="field-row">
                <div class="checkbox-group">
                  <input type="checkbox" class="checkbox" ${epfFormData.physicalClaimFiled ? "checked" : ""}> As the DSC of establishment are not registered with EPFO, the member has been informed to file physical claim (Form-13) for transfer of funds from his previous establishment.
                </div>
              </div>

              <div class="signature-area">
                <div class="field-row">
                  <div class="field-group half-width">
                    <div class="label">Date :</div>
                    <div class="value">${epfFormData.employerDeclarationDate}</div>
                  </div>
                </div>
                <div class="field-row">
                  <div class="field-group full-width">
                    <div class="label">Signature of Employer with Seal of Establishment</div>
                    <div class="value" style="height: 40px;"></div>
                  </div>
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

  // Function to manually open EPF form for an existing employee
  const handleOpenEPFForm = (employee: Employee) => {
    initializeEPFForm(employee);
  };

  // FIXED: Function to update employee site from parent component
  const updateEmployeeSite = (employeeId: string, newSiteName: string) => {
    setEmployees(prevEmployees => 
      prevEmployees.map(emp => 
        emp._id === employeeId ? { ...emp, siteName: newSiteName } : emp
      )
    );
  };

  // FIXED: Function to bulk update employee sites from parent component
  const bulkUpdateEmployeeSites = (employeeIds: string[], newSiteName: string) => {
    setEmployees(prevEmployees => 
      prevEmployees.map(emp => 
        employeeIds.includes(emp._id) ? { ...emp, siteName: newSiteName } : emp
      )
    );
  };

  // FIXED: Expose update functions to parent component
  useEffect(() => {
    if (onEmployeeUpdate) {
      // This is just to expose the function - you'll need to pass it through a ref or context
      // For now, we'll assume the parent can call setEmployees directly
    }
  }, [onEmployeeUpdate]);

  return (
    <div className="space-y-6">
{showCamera && (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg max-w-md w-full">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="text-lg font-semibold">Capture Employee Photo</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowCamera(false);
            stopCamera();
            setCapturedImage(null);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4">
        {!capturedImage ? (
          <>
            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover"
              />
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <div className="inline-block bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {videoReadyRef.current ? "Camera ready" : "Starting camera..."}
                </div>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-2 mt-4">
              <Button
                onClick={capturePhoto}
                disabled={!videoReadyRef.current}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {!videoReadyRef.current ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Capture Photo
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCamera(false);
                  stopCamera();
                }}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-64 object-contain"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={useCapturedPhoto}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-2" />
                Use This Photo
              </Button>
              <Button variant="outline" onClick={retakePhoto}>
                <Camera className="h-4 w-4 mr-2" />
                Retake
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t rounded-b-lg">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Tips:</span> Ensure good lighting and face the camera directly.
          The photo should be clear and well-lit.
        </p>
      </div>
    </div>
  </div>
)}

      {/* Excel Import Preview Modal */}
      {showExcelPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">
                Excel Import Preview ({excelData.length} employees)
              </h3>
              <div className="flex gap-2">
                <Button 
                  onClick={handleBulkImport} 
                  disabled={importing || excelData.length === 0}
                  className="flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing... {importProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import All
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowExcelPreview(false);
                  setExcelData([]);
                }}>
                  Cancel
                </Button>
              </div>
            </div>
            
            <div className="p-4 overflow-auto max-h-[70vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Aadhar</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Joining Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {excelData.map((employee, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.phone}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {employee.aadharNumber ? `••••${employee.aadharNumber.slice(-4)}` : '-'}
                      </TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell>₹{employee.salary || '0'}</TableCell>
                      <TableCell>{employee.dateOfJoining || '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          employee.dateOfExit && employee.dateOfExit.trim() !== '' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {employee.dateOfExit && employee.dateOfExit.trim() !== '' ? 'Left' : 'Active'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {excelData.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No data to preview
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Records:</span> {excelData.length}
                </div>
                <div>
                  <span className="font-medium">Required Fields:</span>
                  <div className="text-xs text-muted-foreground">
                    Name, Aadhar, Position, Department
                  </div>
                </div>
                <div>
                  <span className="font-medium">Date Format:</span>
                  <div className="text-xs text-muted-foreground">
                    YYYY-MM-DD or Excel dates
                  </div>
                </div>
                <div>
                  <span className="font-medium">Boolean Fields:</span>
                  <div className="text-xs text-muted-foreground">
                    Yes/No, True/False, 1/0, ✓
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="onboarding" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Employee Onboarding
          </TabsTrigger>
          <TabsTrigger value="epf-form" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            EPF Form 11
          </TabsTrigger>
        </TabsList>

        <TabsContent value="onboarding">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Digital Onboarding & Document Verification</span>
                <Button 
                  onClick={downloadExcelTemplate} 
                  variant="outline" 
                  size="sm"
                  className="h-8 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download Template
                </Button>
              </CardTitle>
            </CardHeader>
           
                  
<CardContent>
  {/* Company header - keep as is */}
  <div className="border-2 border-gray-300 p-4 md:p-6 mb-6">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <div className="text-center mb-4">
          <div className="text-xl md:text-2xl font-bold">SK ENTERPRISES</div>
          <div className="text-xs md:text-sm text-muted-foreground">Housekeeping • Parking • Waste Management</div>
          <div className="text-lg font-semibold mt-2">Employee Joining Form</div>
        </div>
       <div className="flex justify-between items-start flex-col md:flex-row gap-4">
  {/* Photo Box – now interactive */}
  <div className="relative w-20 h-24 md:w-24 md:h-32 mx-auto md:mx-0 flex-shrink-0">
    <div 
      className="w-full h-full border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center text-xs text-muted-foreground text-center p-2 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200 overflow-hidden bg-white"
      onClick={() => fileInputRef.current?.click()}
    >
      {photoPreview ? (
        <img src={photoPreview} alt="Employee" className="w-full h-full object-cover rounded-lg" />
      ) : newEmployee.photo instanceof File ? (
        <img src={URL.createObjectURL(newEmployee.photo)} alt="Employee" className="w-full h-full object-cover rounded-lg" />
      ) : (
        <div className="flex flex-col items-center justify-center">
          <User className="h-6 w-6 text-gray-400" />
          <span className="text-[10px] mt-1">Click to add photo</span>
        </div>
      )}
    </div>
    {/* Camera icon overlay */}
    <button
      type="button"
      className="absolute bottom-1 right-1 bg-primary text-white rounded-full p-1 shadow-md hover:bg-primary/80 transition-colors"
      onClick={(e) => { e.stopPropagation(); startCamera(); }}
      title="Take photo with camera"
    >
      <Camera className="h-3 w-3" />
    </button>
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleFileUpload}
    />
  </div>

  <div className="text-center md:text-right space-y-2 w-full md:w-auto">
    <div className="text-sm font-semibold">New Joining</div>
    <div className="text-sm">
      Code No. / Ref No.: <span className="border-b border-gray-400 inline-block min-w-[100px]">Auto-generated</span>
    </div>
    {photoPreview && (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleRemovePhoto}
        className="text-xs text-red-500 hover:text-red-700"
      >
        <Trash2 className="h-3 w-3 mr-1" /> Remove photo
      </Button>
    )}
  </div>
</div>
      </div>
    </div>
  </div>

  {/* Step indicator (progress bar) */}
  <div className="mb-6 flex justify-between items-center">
    <div className="flex space-x-2 flex-1">
      {steps.map((_, idx) => (
        <div key={idx} className={`h-2 flex-1 rounded-full ${idx <= currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
      ))}
    </div>
    <span className="ml-4 text-sm text-muted-foreground">{currentStep + 1} / {steps.length}</span>
  </div>

  {/* Step content */}
  <div className="space-y-6">
    {currentStep === 0 && (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Site Name" required>
            <SiteDropdown />
          </FormField>
          <FormField label="Name" required>
            <Input value={newEmployee.name} onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})} />
          </FormField>
          <FormField label="Date of Birth">
            <Input type="date" value={newEmployee.dateOfBirth} onChange={(e) => setNewEmployee({...newEmployee, dateOfBirth: e.target.value})} />
          </FormField>
          <FormField label="Gender" required>
            <Select value={newEmployee.gender} onValueChange={(v) => setNewEmployee({...newEmployee, gender: v})}>
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Transgender">Transgender</SelectItem></SelectContent>
            </Select>
          </FormField>
          <FormField label="Marital Status">
            <Select value={newEmployee.maritalStatus} onValueChange={(v) => setNewEmployee({...newEmployee, maritalStatus: v})}>
              <SelectTrigger><SelectValue placeholder="Select marital status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Single">Single</SelectItem><SelectItem value="Married">Married</SelectItem>
                <SelectItem value="Widow">Widow</SelectItem><SelectItem value="Widower">Widower</SelectItem><SelectItem value="Divorcee">Divorcee</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          
   
        </div>
      </div>
    )}

    {currentStep === 1 && (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold border-b pb-2">Contact & Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Contact No." required>
            <Input value={newEmployee.phone} onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})} maxLength={10} />
          </FormField>
          <FormField label="Email">
            <Input type="email" value={newEmployee.email} onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})} />
          </FormField>
          <FormField label="Aadhar Number" required>
            <Input value={newEmployee.aadharNumber} onChange={(e) => setNewEmployee({...newEmployee, aadharNumber: e.target.value})} maxLength={12} />
          </FormField>
          <FormField label="PAN Number">
            <Input value={newEmployee.panNumber} onChange={(e) => setNewEmployee({...newEmployee, panNumber: e.target.value.toUpperCase()})} maxLength={10} className="uppercase" />
          </FormField>
          <FormField label="ESIC Number">
            <Input value={newEmployee.esicNumber} onChange={(e) => setNewEmployee({...newEmployee, esicNumber: e.target.value})} />
          </FormField>
          <FormField label="PF / UAN Number">
            <Input value={newEmployee.uanNumber} onChange={(e) => setNewEmployee({...newEmployee, uanNumber: e.target.value})} />
          </FormField>
          <FormField label="Permanent Address">
            <Textarea rows={2} value={newEmployee.permanentAddress} onChange={(e) => setNewEmployee({...newEmployee, permanentAddress: e.target.value})} />
          </FormField>
          <FormField label="Permanent Pin Code">
            <Input value={newEmployee.permanentPincode} onChange={(e) => setNewEmployee({...newEmployee, permanentPincode: e.target.value})} maxLength={6} />
          </FormField>
          <FormField label="Local Address">
            <Textarea rows={2} value={newEmployee.localAddress} onChange={(e) => setNewEmployee({...newEmployee, localAddress: e.target.value})} />
          </FormField>
          <FormField label="Local Pin Code">
            <Input value={newEmployee.localPincode} onChange={(e) => setNewEmployee({...newEmployee, localPincode: e.target.value})} maxLength={6} />
          </FormField>
        </div>
      </div>
    )}

    {currentStep === 2 && (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold border-b pb-2">Employment & Bank Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Department" required>
            <Select value={newEmployee.department} onValueChange={(v) => setNewEmployee({...newEmployee, department: v})}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {departments.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Position" required>
            <Input value={newEmployee.position} onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})} />
          </FormField>
          <FormField label="Monthly Salary (₹)">
            <Input type="number" min="0" step="0.01" value={newEmployee.salary} onChange={(e) => setNewEmployee({...newEmployee, salary: e.target.value})} />
          </FormField>
          <FormField label="Bank Name">
            <Input value={newEmployee.bankName} onChange={(e) => setNewEmployee({...newEmployee, bankName: e.target.value})} />
          </FormField>
          <FormField label="Account Number">
            <Input value={newEmployee.accountNumber} onChange={(e) => setNewEmployee({...newEmployee, accountNumber: e.target.value})} />
          </FormField>
          <FormField label="IFSC Code">
            <Input value={newEmployee.ifscCode} onChange={(e) => setNewEmployee({...newEmployee, ifscCode: e.target.value.toUpperCase()})} className="uppercase" />
          </FormField>
          <FormField label="Branch Name">
            <Input value={newEmployee.branchName} onChange={(e) => setNewEmployee({...newEmployee, branchName: e.target.value})} />
          </FormField>
        </div>
      </div>
    )}

    {currentStep === 3 && (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold border-b pb-2">Family & Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Father's Name">
            <Input value={newEmployee.fatherName} onChange={(e) => setNewEmployee({...newEmployee, fatherName: e.target.value})} />
          </FormField>
          <FormField label="Mother's Name">
            <Input value={newEmployee.motherName} onChange={(e) => setNewEmployee({...newEmployee, motherName: e.target.value})} />
          </FormField>
          <FormField label="Spouse Name">
            <Input value={newEmployee.spouseName} onChange={(e) => setNewEmployee({...newEmployee, spouseName: e.target.value})} />
          </FormField>
          <FormField label="Number of Children">
            <Input type="number" min="0" value={newEmployee.numberOfChildren} onChange={(e) => setNewEmployee({...newEmployee, numberOfChildren: e.target.value})} />
          </FormField>
          <FormField label="Emergency Contact Name">
            <Input value={newEmployee.emergencyContactName} onChange={(e) => setNewEmployee({...newEmployee, emergencyContactName: e.target.value})} />
          </FormField>
          <FormField label="Emergency Contact Phone">
            <Input value={newEmployee.emergencyContactPhone} onChange={(e) => setNewEmployee({...newEmployee, emergencyContactPhone: e.target.value})} maxLength={10} />
          </FormField>
          <FormField label="Relation">
            <Input value={newEmployee.emergencyContactRelation} onChange={(e) => setNewEmployee({...newEmployee, emergencyContactRelation: e.target.value})} />
          </FormField>
          <FormField label="Nominee Name">
            <Input value={newEmployee.nomineeName} onChange={(e) => setNewEmployee({...newEmployee, nomineeName: e.target.value})} />
          </FormField>
          <FormField label="Nominee Relation">
            <Input value={newEmployee.nomineeRelation} onChange={(e) => setNewEmployee({...newEmployee, nomineeRelation: e.target.value})} />
          </FormField>
        </div>
      </div>
    )}

    {currentStep === 4 && (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold border-b pb-2">Uniform & Documents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Pant Size">
            <Select value={newEmployee.pantSize} onValueChange={(v) => setNewEmployee({...newEmployee, pantSize: v})}>
              <SelectTrigger><SelectValue placeholder="Select pant size" /></SelectTrigger>
              <SelectContent><SelectItem value="28">28</SelectItem><SelectItem value="30">30</SelectItem><SelectItem value="32">32</SelectItem><SelectItem value="34">34</SelectItem><SelectItem value="36">36</SelectItem><SelectItem value="38">38</SelectItem><SelectItem value="40">40</SelectItem></SelectContent>
            </Select>
          </FormField>
          <FormField label="Shirt Size">
            <Select value={newEmployee.shirtSize} onValueChange={(v) => setNewEmployee({...newEmployee, shirtSize: v})}>
              <SelectTrigger><SelectValue placeholder="Select shirt size" /></SelectTrigger>
              <SelectContent><SelectItem value="S">S</SelectItem><SelectItem value="M">M</SelectItem><SelectItem value="L">L</SelectItem><SelectItem value="XL">XL</SelectItem><SelectItem value="XXL">XXL</SelectItem></SelectContent>
            </Select>
          </FormField>
          <FormField label="Cap Size">
            <Select value={newEmployee.capSize} onValueChange={(v) => setNewEmployee({...newEmployee, capSize: v})}>
              <SelectTrigger><SelectValue placeholder="Select cap size" /></SelectTrigger>
              <SelectContent><SelectItem value="S">S</SelectItem><SelectItem value="M">M</SelectItem><SelectItem value="L">L</SelectItem><SelectItem value="XL">XL</SelectItem></SelectContent>
            </Select>
          </FormField>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="idCardIssued" checked={newEmployee.idCardIssued} onChange={(e) => setNewEmployee({...newEmployee, idCardIssued: e.target.checked})} className="rounded border-gray-300" />
            <Label htmlFor="idCardIssued">ID Card Issued</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="westcoatIssued" checked={newEmployee.westcoatIssued} onChange={(e) => setNewEmployee({...newEmployee, westcoatIssued: e.target.checked})} className="rounded border-gray-300" />
            <Label htmlFor="westcoatIssued">Westcoat Issued</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="apronIssued" checked={newEmployee.apronIssued} onChange={(e) => setNewEmployee({...newEmployee, apronIssued: e.target.checked})} className="rounded border-gray-300" />
            <Label htmlFor="apronIssued">Apron Issued</Label>
          </div>
          <div className="col-span-2">
            <FormField label="Employee Signature">
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <Button variant="outline" onClick={() => signatureEmployeeRef.current?.click()}>Upload Signature</Button>
                {newEmployee.employeeSignature && <p className="mt-2 text-sm text-green-600">Signature uploaded</p>}
              </div>
            </FormField>
            <Input ref={signatureEmployeeRef} type="file" accept="image/*" onChange={(e) => handleSignatureUpload('employee', e)} className="hidden" />
          </div>
          <div className="col-span-2">
            <FormField label="Authorized Signature">
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <Button variant="outline" onClick={() => signatureAuthorizedRef.current?.click()}>Upload Signature</Button>
                {newEmployee.authorizedSignature && <p className="mt-2 text-sm text-green-600">Signature uploaded</p>}
              </div>
            </FormField>
            <Input ref={signatureAuthorizedRef} type="file" accept="image/*" onChange={(e) => handleSignatureUpload('authorized', e)} className="hidden" />
          </div>
          <div className="col-span-2">
            <FormField label="Document Upload">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <Button variant="outline" className="mt-4" onClick={() => documentUploadRef.current?.click()}>Browse Files</Button>
                {uploadedDocuments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedDocuments.map((doc, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 border rounded">
                        <span className="text-sm">{doc.name}</span>
                        <Button size="sm" variant="destructive" onClick={() => handleRemoveDocument(idx)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FormField>
            <Input ref={documentUploadRef} type="file" multiple onChange={handleDocumentUpload} className="hidden" />
          </div>
        </div>
      </div>
    )}
  </div>

  {/* Navigation buttons */}
  <div className="flex justify-between gap-4 mt-8">
    <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)} disabled={currentStep === 0}>
      Previous
    </Button>
    {currentStep < steps.length - 1 ? (
      <Button onClick={() => setCurrentStep(prev => prev + 1)}>Next</Button>
    ) : (
      <Button onClick={handleAddEmployee} disabled={loading}>
        {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
        Create Employee
      </Button>
    )}
  </div>
</CardContent>
             
            
          </Card>
        </TabsContent>

        {/* EPF Form Tab */}
        <TabsContent value="epf-form">
          {createdEmployeeData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  EPF Form 11 - Declaration Form
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  For Employee: <span className="font-semibold">{createdEmployeeData.name}</span> 
                  | Employee ID: <span className="font-semibold">{createdEmployeeData.employeeId}</span>
                  | Department: <span className="font-semibold">{createdEmployeeData.department}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center border-b-2 border-black pb-4">
                    <h2 className="text-xl font-bold">New Form : 11 - Declaration Form</h2>
                    <p className="text-sm">(To be retained by the employer for future reference)</p>
                    <p className="text-xs font-semibold">EMPLOYEES' PROVIDENT FUND ORGANISATION</p>
                    <p className="text-xs">Employees' Provident Fund Scheme, 1952 (Paragraph 34 & 57) and Employees' Pension Scheme, 1995 (Paragraph 24)</p>
                    <p className="text-xs">(Declaration by a person taking up Employment in any Establishment on which EPF Scheme, 1952 and for EPS, 1995 is applicable)</p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Auto-filled from Employee Record</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>Fields marked with <span className="font-semibold">(Auto-filled)</span> are automatically populated from the employee's onboarding data.</p>
                          <p className="mt-1">Please review all information before saving.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* EPF Form Content */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="1. Name of Member (Aadhar Name)" required>
                      <div className="relative">
                        <Input
                          value={epfFormData.memberName}
                          onChange={(e) => handleEPFFormChange('memberName', e.target.value)}
                          placeholder="Enter full name as per Aadhar"
                          className="bg-gray-50"
                          required
                        />
                        <div className="absolute right-2 top-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                        </div>
                      </div>
                    </FormField>

                    <FormField label="2. Father's Name / Spouse's Name">
                      <div className="relative">
                        <Input
                          value={epfFormData.fatherOrSpouseName}
                          onChange={(e) => handleEPFFormChange('fatherOrSpouseName', e.target.value)}
                          placeholder={`Enter ${epfFormData.relationshipType === 'father' ? 'father' : 'spouse'} name`}
                          className="bg-gray-50"
                        />
                        <div className="absolute right-2 top-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-2">
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
                    </FormField>

                    <FormField label="3. Date of Birth">
                      <div className="relative">
                        <Input
                          type="date"
                          value={epfFormData.dateOfBirth}
                          onChange={(e) => handleEPFFormChange('dateOfBirth', e.target.value)}
                          className="bg-gray-50"
                        />
                        <div className="absolute right-2 top-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                        </div>
                      </div>
                    </FormField>

                    <FormField label="4. Gender">
                      <div className="relative">
                        <Select value={epfFormData.gender} onValueChange={(value) => handleEPFFormChange('gender', value)}>
                          <SelectTrigger className="bg-gray-50">
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
                    </FormField>

                   
                    <FormField label="5. Marital Status">
                      <div className="relative">
                        <Select value={epfFormData.maritalStatus} onValueChange={(value) => handleEPFFormChange('maritalStatus', value)}>
                          <SelectTrigger className="bg-gray-50">
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
                    </FormField>

                    <FormField label="6. (a) Email ID">
                      <div className="relative">
                        <Input
                          type="email"
                          value={epfFormData.email}
                          onChange={(e) => handleEPFFormChange('email', e.target.value)}
                          placeholder="Enter email address (optional)"
                          className="bg-gray-50"
                        />
                        <div className="absolute right-2 top-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                        </div>
                      </div>
                    </FormField>

                    <FormField label="6. (b) Mobile No (Aadhar Registered)">
                      <div className="relative">
                        <Input
                          value={epfFormData.mobileNumber}
                          onChange={(e) => handleEPFFormChange('mobileNumber', e.target.value)}
                          placeholder="Enter mobile number"
                          className="bg-gray-50"
                        />
                        <div className="absolute right-2 top-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                        </div>
                      </div>
                    </FormField>
                  </div>

                  {/* Previous Membership Section */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-semibold border-b pb-2">Previous Membership Details</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>7. Whether earlier member of the Employee's Provident Fund Scheme, 1952 ?</Label>
                        <div className="flex gap-4">
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
                        <div className="flex gap-4">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  {/* International Worker Section */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-semibold border-b pb-2">10. International Worker Details</h4>
                    
                    <div className="space-y-2">
                      <Label>a) International Worker</Label>
                      <div className="flex gap-4">
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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

                  {/* KYC Details Section */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-semibold border-b pb-2">11. KYC Details : (attach self attested copies of following KYC's)</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bankAccountNumber">a) Bank Account No. & IFS Code</Label>
                        <div className="relative">
                          <Input
                            id="bankAccountNumber"
                            value={epfFormData.bankAccountNumber}
                            onChange={(e) => handleEPFFormChange('bankAccountNumber', e.target.value)}
                            placeholder="Enter bank account number"
                            className="bg-gray-50"
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
                            className="bg-gray-50"
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
                            className="bg-gray-50"
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
                            className="bg-gray-50"
                          />
                          <div className="absolute right-2 top-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Declaration Details Section */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-semibold border-b pb-2">12. Declaration Details</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>First EPF Member</Label>
                        <div className="flex gap-4">
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
                            className="bg-gray-50"
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
                            className="bg-gray-50"
                          />
                          <div className="absolute right-2 top-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Auto-filled</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Are you EPF Member before 01/09/2014</Label>
                        <div className="flex gap-4">
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
                        <div className="flex gap-4">
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
                        <div className="flex gap-4">
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
                        <div className="flex gap-4">
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

                  {/* Undertaking Section */}
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-semibold mb-2">UNDERTAKING</h4>
                    <p className="text-sm">1) Certified that the particulars are true to the best of my knowledge</p>
                    <p className="text-sm">2) I authorise EPFO to use my Aadhar for verification / authentication / eKYC purpose for service delivery</p>
                    <p className="text-sm">3) Kindly transfer the fund and service details, if applicable, from the previous PF account as declared above to the present PF account.</p>
                    <p className="text-sm">(The transfer would be possible only if the identified KYC details approved by previous employer has been verified by present employer using his Digital Signature</p>
                    <p className="text-sm">4) In case of changes in above details, the same will be intimated to employer at the earliest.</p>
                  </div>

                  {/* Employee Declaration */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-semibold">Employee Declaration</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  {/* Employer Declaration */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="section-title">DECLARATION BY PRESENT EMPLOYER</div>
                    
                    <div className="space-y-2">
                      <Label>A. The member Mr./Ms./Mrs. {epfFormData.memberName} has joined on {epfFormData.enrolledDate} and has been allotted PF Number ${createdEmployeeData?.uanNumber || createdEmployeeData?.uan || "Pending"}</Label>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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

                  {/* Action Buttons */}
                  <div className="flex gap-4 justify-end pt-4 border-t">
                    <Button onClick={handleSaveEPFForm} className="flex items-center gap-2" disabled={isSavingEPF}>
                      {isSavingEPF ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isSavingEPF ? "Saving..." : "Save Form"}
                    </Button>
                    <Button onClick={handlePrintEPFForm} variant="outline" className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Print Form
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Employee Selected</h3>
                  <p className="text-muted-foreground mb-6">
                    Please create an employee first to fill the EPF Form 11.
                  </p>
                  <Button onClick={() => setActiveTab("onboarding")}>
                    Go to Onboarding
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OnboardingTab;