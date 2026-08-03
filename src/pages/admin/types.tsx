// src/components/hrms/types.ts
export interface Document {
  id: number;
  type: string;
  name: string;
  uploadDate: string;
  expiryDate: string;
  status: "valid" | "expired" | "expiring";
  fileUrl?: string;
}

export interface Employee {
  fatherName: any;
  spouseName: any;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  accountNumber: string;
  ifscCode: string;
  panNumber: string;
  _id: string;
  bloodGroup: string;
  nomineeName: string;
  nomineeRelation: string;
  bankName: string;
  motherName: any;
  numberOfChildren: any;
  siteName: string;
  id: number;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  aadharNumber: string;
  department: string;
  position: string;
  joinDate: string;
  status: "active" | "inactive";
  salary: number;
  photo?: string;
  documents: Document[];
  uan?: string;
  esicNumber?: string;
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