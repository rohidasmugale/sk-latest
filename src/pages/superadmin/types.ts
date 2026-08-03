// src/components/hrms/types.ts
export interface Document {
  id: string; // Changed from number to string for MongoDB compatibility
  type: string;
  name: string;
  uploadDate: string;
  expiryDate: string;
  status: "valid" | "expired" | "expiring" | "pending";
  fileUrl?: string;
}

export interface Employee {
  // Changed id from number to string for MongoDB compatibility
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  aadharNumber: string;
  department: string;
  position: string;
  siteName: string; // Added
   site: string;
  
  siteId?: string; // ADD THIS
  joinDate: string;

  dateOfBirth?: string; // Added
  exitDate?: string; // Added
  status: "active" | "inactive" | "left"; // Added "left"
  salary: number;
  photo?: string;
  documents: Document[];
  uan?: string;
  esicNumber?: string;
  panNumber?: string; // Added
  
  // Personal details - Added
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  numberOfChildren?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  
  // Bank details - Added
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  
  // Address - Added
  permanentAddress?: string;
  localAddress?: string;
  
  // Emergency contact - Added
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  
  // Other fields from backend - Added
  bloodGroup?: string;
  gender?: string;
  maritalStatus?: string;
  permanentPincode?: string;
  localPincode?: string;
  bankBranch?: string;
  branchName?: string;
  role?: string;
  pantSize?: string;
  shirtSize?: string;
  capSize?: string;
  idCardIssued?: boolean;
  westcoatIssued?: boolean;
  apronIssued?: boolean;
  photoPublicId?: string;
  employeeSignature?: string;
  employeeSignaturePublicId?: string;
  authorizedSignature?: string;
  authorizedSignaturePublicId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveRequest {
  id: number;
  employee: string;
  employeeId: string;
  type: string;
  from: string;
  to: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
    site?: string; // ADD THIS
  siteName?: string; // ADD THIS
  siteId?: string; // ADD THIS
}

export interface Attendance {
  id: number;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: "present" | "absent" | "late" | "half-day";
}

export interface Payroll {
  id: number;
  employeeId: string;
  employeeName: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: "processed" | "pending";
  paymentDate?: string;
  bankAccount: string;
  ifscCode: string;
}

export interface Performance {
  id: number;
  employeeId: string;
  employeeName: string;
  department: string;
  kpi: number;
  rating: number;
  reviewDate: string;
  feedback: string;
}

export interface Shift {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  employees: string[];
}

export interface SalaryStructure {
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

export interface SalarySlip {
  id: number;
  employeeId: string;
  employeeName: string;
  month: string;
  paidDays: number;
  designation: string;
  uan: string;
  esicNumber: string;
  earnings: {
    basic: number;
    da: number;
    hra: number;
    cca: number;
    washing: number;
    leave: number;
    medical: number;
    bonus: number;
    otherAllowances: number;
  };
  deductions: {
    pf: number;
    esic: number;
    monthlyDeductions: number;
    mlwf: number;
    professionalTax: number;
  };
  netSalary: number;
  generatedDate: string;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

export interface NewEmployeeForm {
  name: string;
  email: string;
  phone: string;
  aadharNumber: string;
  department: string;
  position: string;
  salary: string;
  photo: File | null;
  siteName: string;
  dateOfBirth: string;
  dateOfJoining: string;
  dateOfExit: string;
  bloodGroup: string;
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
  employeeSignature: File | null;
  authorizedSignature: File | null;
}

// For EPF Form 11 (if you want to keep it in types file)
export interface EPFForm11Data {
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

// For API responses
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// For import/export
export interface ImportResult {
  success: boolean;
  message: string;
  importedCount: number;
  errorCount?: number;
  errors?: Array<{
    row: number;
    employeeId: string;
    message: string;
  }>;
}