// frontend/src/types/employee.ts
export interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  siteName: string;
  salary: number;
  status: 'active' | 'inactive' | 'left';
  role: string;
  joinDate: string;
  dateOfJoining?: string;
  dateOfBirth?: string;
  photo?: string;
  photoPublicId?: string;
  aadharNumber?: string;
  panNumber?: string;
  esicNumber?: string;
  uanNumber?: string;
  gender?: string;
  maritalStatus?: string;
  bloodGroup?: string;
  permanentAddress?: string;
  
  localAddress?: string;
  
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  relativeName?: string;
  relation?: string; // "Father" | "Mother" | "Spouse" | "Husband" | "Wife"
  
  numberOfChildren?: number;

  emergencyContactPhone?: string;
 emergencyPhone2?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  pantSize?: string;
  shirtSize?: string;
  capSize?: string;
  idCardIssued?: boolean;
  westcoatIssued?: boolean;
  apronIssued?: boolean;
  employeeSignature?: string;
  employeeSignaturePublicId?: string;
  authorizedSignature?: string;
  authorizedSignaturePublicId?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  profileStatus?: "complete" | "incomplete";   // ✅ ADD THIS
}