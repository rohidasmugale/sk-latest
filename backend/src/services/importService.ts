import ImportJob from '../models/ImportJob';
import Employee from '../models/Employee';
import Site from '../models/Site';
import XLSX from 'xlsx';
import fs from 'fs';

// ─── Helper: convert Excel serial date to Date ───────────────────────
function excelSerialToDate(serial: number): Date {
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
    return new Date();
  }
}

function parseDateString(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  try {
    const cleanStr = dateStr.trim();
    // US format mm/dd/yyyy
    const usMatch = cleanStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const month = parseInt(usMatch[1]) - 1;
      const day = parseInt(usMatch[2]);
      const year = parseInt(usMatch[3]);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
    // EU format dd/mm/yyyy
    const euMatch = cleanStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (euMatch) {
      const day = parseInt(euMatch[1]);
      const month = parseInt(euMatch[2]) - 1;
      const year = parseInt(euMatch[3]);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
    // ISO yyyy-mm-dd
    const isoMatch = cleanStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]) - 1;
      const day = parseInt(isoMatch[3]);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
    const date = new Date(cleanStr);
    if (!isNaN(date.getTime())) return date;
    return null;
  } catch {
    return null;
  }
}

function safeNumericString(value: any): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'number') return String(Math.round(value));
  return String(value).trim();
}

function normalizeHeaderText(h: any): string {
  return String(h ?? '')
    .toLowerCase()
    .replace(/[/.\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Column alias mapping (same as frontend) ─────────────────────────
const IMPORT_FIELD_ALIASES: Record<string, string[]> = {
  site: ['site', 'site name'],
  status: ['status'],
  uan: ['uan no', 'uan number', 'uan'],
  esic: ['esic no', 'esic number', 'esic'],
  employeeCode: ['emp code', 'emp no', 'employee id', 'employee code', 'empcode', 'emp id'],
  position: ['designation', 'position'],
  name: ['name as per aadhar', 'name', 'employee name'],
  gender: ['gender', 'sex'],
  dob: ['date of birth', 'full date of birth', 'dob'],
  doj: ['date of joining', 'doj', 'joining date', 'date of join'],
  dateOfExit: ['date of exit', 'exit date'],
  aadhar: ['aadhar no', 'adhaar number', 'aadhar number', 'aadhaar number', 'aadhar', 'aadhaar'],
  pan: ['pan no', 'pan number', 'pan'],
  bloodGroup: ['blood group'],
  relativeName: ['father name', 'father husband name', 'father s name', 'relative name'],
  relation: ['relation'],
  mobile: ['mobile no', 'mobile number', 'contact no', 'contact', 'mobile'],
  accountNumber: ['bank account no', 'bank a c number', 'account number', 'bank ac number'],
  ifsc: ['ifsc code', 'ifsc'],
  bankBranch: ['bank branch', 'branch name'],
  nomineeName: ['nominee name'],
  nomineeRelation: ['nominee relation', 'relation2'],
  emergencyPhone: ['emergency contact no', 'emer no', 'emergency contact', 'emergency no', 'emergency contact 1'],
  localAddress: ['local address', 'present add'],
  permanentAddress: ['permanent address', 'adhar add', 'aadhar address', 'permannt address'],
  maritalStatus: ['married unmarried', 'marital status'],
  pfNo: ['pf no', 'pf number'],
  email: ['email', 'e mail', 'e mail id'],
  spouseName: ['spouse name', 'husband wife name'],
  numberOfChildren: ['number of children', 'no of children', 'children'],
  department: ['department'],
  salary: ['salary', 'basic salary'],
  permanentPincode: ['permanent pincode', 'permanent pin code'],
  localPincode: ['local pincode', 'local pin code'],
};

interface ImportColumnMap {
  site: number; status: number; uan: number; esic: number; employeeCode: number;
  position: number; name: number; gender: number; dob: number; doj: number;
  dateOfExit: number; aadhar: number; pan: number; bloodGroup: number;
  relativeName: number; relation: number; mobile: number; accountNumber: number;
  ifsc: number; bankBranch: number; nomineeName: number; nomineeRelation: number;
  emergencyPhone: number; localAddress: number; permanentAddress: number;
  maritalStatus: number; pfNo: number;
}

function buildImportColumnMap(headers: any[]): ImportColumnMap {
  const normalizedHeaders = headers.map(normalizeHeaderText);
  const map = {} as ImportColumnMap;
  (Object.keys(IMPORT_FIELD_ALIASES) as (keyof ImportColumnMap)[]).forEach((field) => {
    const aliases = IMPORT_FIELD_ALIASES[field];
    let foundIndex = -1;
    for (const alias of aliases) {
      const idx = normalizedHeaders.indexOf(alias);
      if (idx !== -1) {
        foundIndex = idx;
        break;
      }
    }
    map[field] = foundIndex;
  });
  return map;
}

// ─── Helper: build site capacity map ──────────────────────────────────
function buildSiteCapacityMap(sites: any[], existingEmployees: any[]) {
  const map = new Map();
  sites.forEach(site => {
    const staffRequirement = Array.isArray(site.staffDeployment)
      ? site.staffDeployment.reduce((total: number, item: any) => {
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

    map.set(site.name, {
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
  return map;
}

// ─── Helper: perform bulk import ──────────────────────────────────────
async function performBulkImport(creates: any[], updates: any[]) {
  const operations: any[] = [];

  if (creates && creates.length) {
    creates.forEach((doc: any) => {
      operations.push({
        insertOne: {
          document: {
            ...doc,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      });
    });
  }

  if (updates && updates.length) {
    updates.forEach(({ id, payload }: { id: string; payload: any }) => {
      operations.push({
        updateOne: {
          filter: { _id: id },
          update: {
            $set: {
              ...payload,
              updatedAt: new Date()
            }
          }
        }
      });
    });
  }

  const result = await Employee.bulkWrite(operations, { ordered: false });

  const errors = result.hasWriteErrors()
    ? result.getWriteErrors().map((e: any) => ({
        row: e.index,
        message: e.errmsg
      }))
    : [];

  return {
    createdCount: result.insertedCount || 0,
    updatedCount: result.modifiedCount || 0,
    errors
  };
}

// ─── Main background processor ────────────────────────────────────────
export async function processImportJob(jobId: string, filePath: string) {
  const job = await ImportJob.findOne({ jobId });
  if (!job) return;

  try {
    job.status = 'processing';
    await job.save();

    // 1. Read Excel as array of arrays (header: 1) – same as frontend
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: true,
      dateNF: 'mm/dd/yyyy'
    });

    if (jsonData.length < 2) {
      throw new Error('Excel file has no data rows');
    }

    const headers = jsonData[0] as string[];
    const col = buildImportColumnMap(headers);

    // Validate required columns
    const requiredMissing: string[] = [];
    if (col.site === -1) requiredMissing.push('Site');
    if (col.name === -1) requiredMissing.push('Name');
    if (col.aadhar === -1) requiredMissing.push('Aadhar');
    if (col.employeeCode === -1) requiredMissing.push('Emp Code / Employee ID');
    if (requiredMissing.length > 0) {
      throw new Error(`Missing required columns: ${requiredMissing.join(', ')}`);
    }

    // 2. Fetch sites and existing employees
    const [sites, existingEmployees] = await Promise.all([
      Site.find(),
      Employee.find()
    ]);

    const siteCapacityMap = buildSiteCapacityMap(sites, existingEmployees);

    // ─── Normalise site names ──────────────────────────────────────────
    const normalizeSiteName = (name: string): string =>
      name.trim().toUpperCase().replace(/\s+/g, ' ');

    const SITE_ALIASES: Record<string, string> = {
      'OWC OPRETER': 'OWC OPERATOR',
      'GOLBAL SQUARE': 'GLOBAL SQUARE',
      'GOLBAL LIFE STYLE': 'GLOBAL LIFE STYLE',
      // add more as needed
    };

    const dbSiteNormalizedMap = new Map<string, string>();
    for (const site of sites) {
      dbSiteNormalizedMap.set(normalizeSiteName(site.name), site.name);
    }

    // ─── Build lookup maps for existing employees ─────────────────────
    const existingByAadhar = new Map();
    const existingByEmpId = new Map();
    existingEmployees.forEach(emp => {
      if (emp.aadharNumber) existingByAadhar.set(emp.aadharNumber, emp);
      if (emp.employeeId) existingByEmpId.set(String(emp.employeeId), emp);
    });

    // ─── Position → Department map ─────────────────────────────────────
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
      'SALES': 'Sales',
      'HK': 'Housekeeping',
    };

    // ─── Grouping by site (to enforce capacity) ──────────────────────
    const employeesBySiteAndRole = new Map<string, {
      managers: any[], supervisors: any[], staff: any[], rows: number[]
    }>();

    // 3. Process each row (full frontend logic)
    const employeesToCreate: any[] = [];
    const employeesToUpdate: any[] = [];
    const errors: any[] = [];
    let processed = 0;
    const totalRows = jsonData.length - 1;
    const seenInFileAadhar = new Set<string>();
    const skippedReasons: string[] = [];
    const invalidSiteNames = new Set<string>();
    const capacityViolations: Array<{ site: string; role: string; count: number; available: number }> = [];

    // First pass: group rows by site and role
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || row.length === 0) continue;
      const hasData = row.some(cell => cell !== undefined && cell !== null && cell.toString().trim() !== '');
      if (!hasData) continue;

      let siteName = '';
      if (row[col.site] !== undefined && row[col.site] !== null) {
        siteName = String(row[col.site]).trim().replace(/[^\x20-\x7E]/g, '').trim();
      }
      if (!siteName) {
        skippedReasons.push(`Row ${i}: Missing site name`);
        continue;
      }
      const normalizedSite = normalizeSiteName(siteName);
      const aliasedSite = SITE_ALIASES[normalizedSite] || normalizedSite;
      const dbSite = dbSiteNormalizedMap.get(aliasedSite);
      if (!dbSite) {
        invalidSiteNames.add(siteName);
        skippedReasons.push(`Row ${i}: Site "${siteName}" not found in database (normalised: "${aliasedSite}")`);
        continue;
      }
      const position = col.position !== -1 && row[col.position] ? String(row[col.position]).trim() : '';
      const isManager = position.toLowerCase().includes('manager');
      const isSupervisor = position.toLowerCase().includes('supervisor');

      if (!employeesBySiteAndRole.has(dbSite)) {
        employeesBySiteAndRole.set(dbSite, { managers: [], supervisors: [], staff: [], rows: [] });
      }
      const group = employeesBySiteAndRole.get(dbSite)!;
      group.rows.push(i);
      const employeeInfo = { row: i, siteName: dbSite, position, isManager, isSupervisor, data: row };
      if (isManager) group.managers.push(employeeInfo);
      else if (isSupervisor) group.supervisors.push(employeeInfo);
      else group.staff.push(employeeInfo);
    }

    const takenCounts = new Map<string, { managers: number; supervisors: number; staff: number }>();
    const allRows = new Set<number>();
    employeesBySiteAndRole.forEach((group, siteName) => {
      takenCounts.set(siteName, { managers: 0, supervisors: 0, staff: 0 });
      group.rows.forEach(row => allRows.add(row));
    });
    const sortedRows = Array.from(allRows).sort((a, b) => a - b);

    // Second pass: process each row in order
    for (const rowIndex of sortedRows) {
      const row = jsonData[rowIndex] as any[];
      let siteName = '';
      if (row[col.site] !== undefined && row[col.site] !== null) {
        siteName = String(row[col.site]).trim().replace(/[^\x20-\x7E]/g, '').trim();
      }
      const normalizedSite = normalizeSiteName(siteName);
      const aliasedSite = SITE_ALIASES[normalizedSite] || normalizedSite;
      const dbSite = dbSiteNormalizedMap.get(aliasedSite);
      if (!dbSite) {
        skippedReasons.push(`Row ${rowIndex}: Site "${siteName}" not found in database (processing)`);
        continue;
      }
      const actualSiteName = dbSite;

      // --- Read fields ---
      const rawStatus = col.status !== -1 && row[col.status]
        ? String(row[col.status]).trim().toLowerCase()
        : 'active';
      const LEFT_KEYWORDS = ['left', 'off', 'resigned', 'terminated', 'exit', 'relieved', 'discontinued', 'stopped'];
      const INACTIVE_KEYWORDS = ['inactive', 'suspended', 'on hold', 'hold'];
      const ACTIVE_KEYWORDS = ['active', 'on', 'working', 'present'];
      let status: 'active' | 'inactive' | 'left' = 'active';
      if (LEFT_KEYWORDS.some(v => rawStatus.includes(v))) status = 'left';
      else if (INACTIVE_KEYWORDS.some(v => rawStatus.includes(v))) status = 'inactive';
      else if (ACTIVE_KEYWORDS.some(v => rawStatus.includes(v))) status = 'active';

      const uanNumber = col.uan !== -1 ? safeNumericString(row[col.uan]) : '';
      const esicNumber = col.esic !== -1 ? safeNumericString(row[col.esic]) : '';
      const employeeCode = safeNumericString(row[col.employeeCode]);
      if (!employeeCode) {
        skippedReasons.push(`Row ${rowIndex}: Missing Employee ID`);
        continue;
      }
      const position = col.position !== -1 && row[col.position] ? String(row[col.position]).trim() : '';
      const name = row[col.name] ? String(row[col.name]).trim() : '';
      let gender = '';
      if (col.gender !== -1 && row[col.gender]) {
        gender = String(row[col.gender]).trim();
      }
      let normalizedGender: string | null = null;
      const genderLower = gender.toLowerCase();
      if (['male', 'm'].includes(genderLower)) normalizedGender = 'Male';
      else if (['female', 'f'].includes(genderLower)) normalizedGender = 'Female';
      else if (['transgender', 't'].includes(genderLower)) normalizedGender = 'Transgender';

      const dobRaw = col.dob !== -1 ? row[col.dob] : undefined;
      const dojRaw = col.doj !== -1 ? row[col.doj] : undefined;
      const dateOfExitRaw = col.dateOfExit !== -1 ? row[col.dateOfExit] : undefined;
      const aadhar = safeNumericString(row[col.aadhar]).replace(/\s/g, '');
      const paddedAadhar = aadhar.length < 12 && /^\d+$/.test(aadhar) ? aadhar.padStart(12, '0') : aadhar;

      if (seenInFileAadhar.has(paddedAadhar)) {
        skippedReasons.push(`Row ${rowIndex}: Duplicate Aadhar within this file`);
        continue;
      }
      seenInFileAadhar.add(paddedAadhar);

      const matchedExisting = existingByAadhar.get(paddedAadhar) || existingByEmpId.get(employeeCode);
      const contact = col.mobile !== -1 ? safeNumericString(row[col.mobile]) : '';
      const pan = col.pan !== -1 ? safeNumericString(row[col.pan]).toUpperCase() : '';
      const bloodGroup = col.bloodGroup !== -1 && row[col.bloodGroup] ? String(row[col.bloodGroup]).trim() : '';
      const relativeName = col.relativeName !== -1 && row[col.relativeName] ? String(row[col.relativeName]).trim() : '';
      const relation = col.relation !== -1 && row[col.relation] ? String(row[col.relation]).trim() : '';
      const accountNumber = col.accountNumber !== -1 ? safeNumericString(row[col.accountNumber]) : '';
      const ifscCode = col.ifsc !== -1 ? safeNumericString(row[col.ifsc]).toUpperCase() : '';
      const bankBranch = col.bankBranch !== -1 && row[col.bankBranch] ? String(row[col.bankBranch]).trim() : '';
      const nomineeName = col.nomineeName !== -1 && row[col.nomineeName] ? String(row[col.nomineeName]).trim() : '';
      const nomineeRelation = col.nomineeRelation !== -1 && row[col.nomineeRelation] ? String(row[col.nomineeRelation]).trim() : '';
      const emergencyContactPhone = col.emergencyPhone !== -1 && row[col.emergencyPhone] ? String(row[col.emergencyPhone]).trim() : '';
      const localAddress = col.localAddress !== -1 && row[col.localAddress] ? String(row[col.localAddress]).trim() : '';
      const permanentAddress = col.permanentAddress !== -1 && row[col.permanentAddress] ? String(row[col.permanentAddress]).trim() : '';
      const rawMaritalStatus = col.maritalStatus !== -1 && row[col.maritalStatus] ? String(row[col.maritalStatus]).trim().toLowerCase() : '';
      let maritalStatus: string | null = null;
      if (rawMaritalStatus.includes('unmarried') || rawMaritalStatus.includes('single')) maritalStatus = 'Single';
      else if (rawMaritalStatus.includes('married')) maritalStatus = 'Married';

      const isManager = position.toLowerCase().includes('manager');
      const isSupervisor = position.toLowerCase().includes('supervisor');

      if (!siteName) {
        skippedReasons.push(`Row ${rowIndex}: Missing site name`);
        continue;
      }
      const siteCapacity = siteCapacityMap.get(actualSiteName);
      if (!siteCapacity) {
        invalidSiteNames.add(actualSiteName);
        skippedReasons.push(`Row ${rowIndex}: Site "${actualSiteName}" not found in database`);
        continue;
      }
      if (!name || !paddedAadhar) {
        skippedReasons.push(`Row ${rowIndex}: Missing name or aadhar`);
        continue;
      }
      if (!/^\d{12}$/.test(paddedAadhar)) {
        skippedReasons.push(`Row ${rowIndex}: Invalid Aadhar format (${paddedAadhar.length} digits)`);
        continue;
      }

      // Enforce capacity (warnings only, do not block)
      const taken = takenCounts.get(actualSiteName)!;
      if (isManager) {
        if (taken.managers >= siteCapacity.remainingManagers) {
          capacityViolations.push({ site: actualSiteName, role: 'Manager', count: 1, available: siteCapacity.remainingManagers });
        }
        taken.managers++;
      } else if (isSupervisor) {
        if (taken.supervisors >= siteCapacity.remainingSupervisors) {
          capacityViolations.push({ site: actualSiteName, role: 'Supervisor', count: 1, available: siteCapacity.remainingSupervisors });
        }
        taken.supervisors++;
      } else {
        if (taken.staff >= siteCapacity.remainingStaff) {
          capacityViolations.push({ site: actualSiteName, role: 'Staff', count: 1, available: siteCapacity.remainingStaff });
        }
        taken.staff++;
      }

      // --- Parse dates ---
      let dateOfBirth: Date | null = null;
      let dateOfJoining: Date = new Date();
      if (dojRaw !== undefined && dojRaw !== null && dojRaw !== '') {
        try {
          if (dojRaw instanceof Date) dateOfJoining = dojRaw;
          else if (typeof dojRaw === 'number') dateOfJoining = excelSerialToDate(dojRaw);
          else if (typeof dojRaw === 'string') {
            const parsed = parseDateString(dojRaw);
            if (parsed) dateOfJoining = parsed;
            else {
              const testDate = new Date(dojRaw);
              if (!isNaN(testDate.getTime())) dateOfJoining = testDate;
            }
          }
        } catch { /* fallback to current date */ }
        if (isNaN(dateOfJoining.getTime())) dateOfJoining = new Date();
      }
      if (dobRaw !== undefined && dobRaw !== null && dobRaw !== '') {
        try {
          if (dobRaw instanceof Date) dateOfBirth = dobRaw;
          else if (typeof dobRaw === 'number') dateOfBirth = excelSerialToDate(dobRaw);
          else if (typeof dobRaw === 'string') {
            const parsed = parseDateString(dobRaw);
            if (parsed) dateOfBirth = parsed;
          }
        } catch { /* ignore */ }
      }

      // --- Department mapping ---
      let finalDepartment = 'General Staff';
      if (position) {
        const posUpper = position.toUpperCase();
        if (positionToDepartmentMap[posUpper]) finalDepartment = positionToDepartmentMap[posUpper];
      }

      // --- Auto-generate email ---
      let finalEmail = '';
      if (name) {
        const nameParts = name.toLowerCase().split(' ');
        const firstName = nameParts[0]?.replace(/[^a-z]/g, '') || 'employee';
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1].replace(/[^a-z]/g, '') : '';
        const randomNum = Math.floor(100 + Math.random() * 900);
        finalEmail = `${firstName}${lastName ? '.' + lastName : ''}${randomNum}@skenterprises.com`.toLowerCase();
      }

      // --- Phone ---
      let finalPhone = contact;
      if (finalPhone) {
        const digits = finalPhone.replace(/\D/g, '');
        if (digits.length === 10) finalPhone = digits;
        else if (digits.length > 10) finalPhone = digits.slice(-10);
        else finalPhone = '98' + Math.floor(10000000 + Math.random() * 90000000).toString();
      } else {
        finalPhone = '98' + Math.floor(10000000 + Math.random() * 90000000).toString();
      }

      const salary = 15000;

      let finalBloodGroup = null;
      if (bloodGroup) {
        const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
        const bgUpper = bloodGroup.trim().toUpperCase();
        if (validBloodGroups.includes(bgUpper)) finalBloodGroup = bgUpper;
      }

      const relationLower = relation.toLowerCase();
      const isFatherRelation = relationLower.includes('father');
      const isMotherRelation = relationLower.includes('mother');
      const isSpouseRelation = relationLower.includes('spouse') || relationLower.includes('husband') || relationLower.includes('wife');

      // --- Build employeeData (exactly as frontend) ---
      const employeeData = {
        name: name,
        email: finalEmail,
        phone: finalPhone,
        aadharNumber: paddedAadhar,
        employeeId: employeeCode || undefined,
        dateOfJoining: dateOfJoining,
        dateOfExit: dateOfExitRaw ? (typeof dateOfExitRaw === 'number' ? excelSerialToDate(dateOfExitRaw) : parseDateString(String(dateOfExitRaw))) : null,
        department: finalDepartment,
        position: position || 'Employee',
        salary: salary,
        status: status,
        role: 'employee',
        siteName: actualSiteName,
        dateOfBirth: dateOfBirth,
        gender: normalizedGender,
        maritalStatus: maritalStatus,
        bloodGroup: finalBloodGroup,
        panNumber: pan || null,
        uanNumber: uanNumber || null,
        esicNumber: esicNumber || null,
        bankName: null,
        branchName: bankBranch || null,
        accountNumber: accountNumber || null,
        ifscCode: ifscCode || null,
        fatherName: isFatherRelation ? relativeName : null,
        spouseName: isSpouseRelation ? relativeName : null,
        motherName: isMotherRelation ? relativeName : null,
        permanentAddress: permanentAddress || null,
        localAddress: localAddress || null,
        nomineeName: nomineeName || null,
        nomineeRelation: nomineeRelation || null,
        emergencyContactName: null,
        emergencyContactPhone: emergencyContactPhone || null,
        emergencyContactRelation: null,
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
          siteName: actualSiteName,
          assignedDate: dateOfJoining instanceof Date ? dateOfJoining.toISOString().split('T')[0] : dateOfJoining
        }],
        kycDocuments: []
      };

      if (matchedExisting) {
        const updatePayload: any = {};
        Object.entries(employeeData).forEach(([k, v]) => {
          if (v !== null && v !== '' && v !== undefined) updatePayload[k] = v;
        });
        employeesToUpdate.push({ id: matchedExisting._id || matchedExisting.id, payload: updatePayload });
      } else {
        employeesToCreate.push(employeeData);
      }

      processed++;
      if (processed % 50 === 0) {
        job.processedRows = processed;
        await job.save();
      }
    }

    // 4. Perform bulk write
    const result = await performBulkImport(employeesToCreate, employeesToUpdate);

    // 5. Save final result
    job.status = 'completed';
    job.processedRows = processed;
    job.createdCount = result.createdCount;
    job.updatedCount = result.updatedCount;
    job.importErrors = errors;
    job.completedAt = new Date();
    await job.save();

    // Cleanup uploaded file
    fs.unlinkSync(filePath);

  } catch (err: any) {
    job.status = 'failed';
    job.importErrors = [{ message: err.message }];
    await job.save();
  }
}