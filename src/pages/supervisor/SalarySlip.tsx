import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useRole } from '@/context/RoleContext';
import { Loader2 } from 'lucide-react';
import { salarySlipApi } from '@/services/payrollApi';
import axios from 'axios';
import { BackButton } from '@/components/shared/BackButton';
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  department?: string;
  email?: string;
  siteName?: string;
  accountNumber?: string;
  bankName?: string;
  bankBranch?: string;
  aadharNumber?: string;
  panNumber?: string;
}

interface Site {
  _id: string;
  name: string;
  clientName?: string;
}

export default function SupervisorSalarySlip() {
  const { user } = useRole();
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [supervisorSites, setSupervisorSites] = useState<Site[]>([]);
  const [fetching, setFetching] = useState(true);

  // Fetch supervisor's assigned sites (same as Attendance)
  const fetchSupervisorSites = useCallback(async () => {
    if (!user) return [];
    try {
      const supervisorId = user._id || user.id;
      const response = await axios.get(`${API_URL}/tasks`, { params: { limit: 1000 } });
      let allTasks = response.data?.data || response.data || [];
      if (!Array.isArray(allTasks)) allTasks = [];
      const siteSet = new Set<string>();
      allTasks.forEach((task: any) => {
        if (task.assignedUsers?.some((u: any) => u.userId === supervisorId)) {
          if (task.siteName) siteSet.add(task.siteName);
        }
        if (task.assignedTo === supervisorId && task.siteName) siteSet.add(task.siteName);
      });
      const siteNames = Array.from(siteSet);
      const sitesRes = await axios.get(`${API_URL}/sites`);
      let allSites = sitesRes.data?.data || sitesRes.data || [];
      if (!Array.isArray(allSites)) allSites = [];
      const filtered = allSites.filter((s: any) => siteNames.includes(s.name));
      setSupervisorSites(filtered);
      return filtered;
    } catch (error) {
      console.error('Error fetching supervisor sites:', error);
      return [];
    }
  }, [user]);

  // Fetch employees belonging to those sites
  const fetchEmployeesBySites = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    try {
      let sites = supervisorSites;
      if (sites.length === 0) sites = await fetchSupervisorSites();
      const siteNames = sites.map(s => s.name);
      if (siteNames.length === 0) {
        setEmployees([]);
        setFetching(false);
        return;
      }
      const response = await axios.get(`${API_URL}/employees`, { params: { limit: 1000 } });
      let allEmployees = response.data?.data || response.data?.employees || response.data || [];
      if (!Array.isArray(allEmployees)) allEmployees = [];
      const filtered = allEmployees.filter((emp: any) => {
        const empSite = emp.siteName || '';
        return siteNames.some(sn => sn.toLowerCase().trim() === empSite.toLowerCase().trim());
      });
      setEmployees(filtered);

      // Find supervisor's own employee record (by email)
      const myEmail = user.email;
      const myRecord = filtered.find(emp => emp.email === myEmail);
      if (myRecord) {
        setMyEmployeeId(myRecord.employeeId);
      } else {
        setMyEmployeeId(null);
        toast.warning('Your own employee record not found – "My Salary Slip" may not work');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setFetching(false);
    }
  }, [user, supervisorSites, fetchSupervisorSites]);

  useEffect(() => {
    if (user) {
      fetchSupervisorSites();
    }
  }, [user, fetchSupervisorSites]);

  useEffect(() => {
    if (supervisorSites.length > 0 || !user) {
      fetchEmployeesBySites();
    }
  }, [supervisorSites, fetchEmployeesBySites]);

  // Print function – generates HTML and opens print dialog
  const printSlip = (slip: any) => {
    const employee = employees.find(e => e.employeeId === slip.employeeId);
    if (!employee) {
      toast.error('Employee details not found');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups for this site');
      return;
    }

    const structure = {
      da: 0,
      hra: 0,
      conveyance: 0,
      specialAllowance: 0,
      leaveEncashment: 0,
      medicalAllowance: 0,
      arrears: 0,
      otherAllowances: 0,
      providentFund: 0,
      esic: 0,
      advance: 0,
      mlwf: 0,
      professionalTax: 0,
      // We don't have these from the slip API, but we can default or fetch from salary structure later
    };

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Slip - ${employee.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .slip-title { font-size: 20px; margin-bottom: 10px; }
          .employee-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
          .breakdown { width: 100%; border-collapse: collapse; }
          .breakdown td { padding: 8px; border-bottom: 1px solid #eee; }
          .breakdown .amount { text-align: right; }
          .total { font-weight: bold; border-top: 2px solid #333; }
          .attendance-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center; margin-top: 20px; }
          .attendance-item { padding: 10px; border-radius: 5px; }
          .present { background: #d1fae5; color: #065f46; }
          .absent { background: #fee2e2; color: #991b1b; }
          .half-day { background: #fef3c7; color: #92400e; }
          .leaves { background: #dbeafe; color: #1e40af; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">S K ENTERPRISES</div>
          <div class="slip-title">SALARY SLIP</div>
          <div>Period: ${slip.month}</div>
          <div>Wages Slip Rule 27(2) Maharashtra Minimum Wages Rules, 1963</div>
        </div>
        
        <div class="employee-info">
          <div>
            <strong>Name:</strong> ${employee.name}<br>
            <strong>Employee ID:</strong> ${employee.employeeId}<br>
            <strong>Department:</strong> ${employee.department}<br>
            <strong>Bank Account:</strong> ${employee.accountNumber || 'N/A'}<br>
            <strong>Bank:</strong> ${employee.bankName || 'N/A'} - ${employee.bankBranch || 'N/A'}
          </div>
          <div>
            <strong>Generated Date:</strong> ${new Date(slip.generatedDate).toLocaleDateString()}<br>
            <strong>Slip Number:</strong> ${slip.slipNumber}<br>
            <strong>Aadhar:</strong> ${employee.aadharNumber || 'N/A'}<br>
            <strong>PAN:</strong> ${employee.panNumber || 'N/A'}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div class="section">
            <div class="section-title">EARNINGS</div>
            <table class="breakdown">
              <tr><td>BASIC</td><td class="amount">₹${slip.basicSalary.toLocaleString()}</td></tr>
              <tr><td>DA</td><td class="amount">₹0</td></tr>
              <tr><td>HRA</td><td class="amount">₹0</td></tr>
              <tr><td>CCA</td><td class="amount">₹0</td></tr>
              <tr><td>BONUS</td><td class="amount">₹0</td></tr>
              <tr><td>LEAVE</td><td class="amount">₹0</td></tr>
              <tr><td>MEDICAL</td><td class="amount">₹0</td></tr>
              <tr><td>ARREARS</td><td class="amount">₹0</td></tr>
              <tr><td>OTHER ALL</td><td class="amount">₹0</td></tr>
              <tr class="total"><td><strong>TOTAL EARNINGS</strong></td><td class="amount"><strong>₹${slip.allowances.toLocaleString()}</strong></td></tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">DEDUCTIONS</div>
            <table class="breakdown">
              <tr><td>PF</td><td class="amount">-₹0</td></tr>
              <tr><td>ESIC</td><td class="amount">-₹0</td></tr>
              <tr><td>ADVANCE</td><td class="amount">-₹0</td></tr>
              <tr><td>MLWF</td><td class="amount">-₹0</td></tr>
              <tr><td>Profession Tax</td><td class="amount">-₹0</td></tr>
              <tr class="total"><td><strong>TOTAL DEDUCTIONS</strong></td><td class="amount"><strong>-₹${slip.deductions.toLocaleString()}</strong></td></tr>
            </table>
          </div>
        </div>

        <div class="section">
          <div class="section-title">NET SALARY</div>
          <table class="breakdown">
            <tr class="total"><td><strong>NET PAYABLE</strong></td><td class="amount"><strong>₹${slip.netSalary.toLocaleString()}</strong></td></tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Attendance Summary</div>
          <div class="attendance-grid">
            <div class="attendance-item present"><div style="font-size:18px;font-weight:bold;">${slip.presentDays}</div><div>Present</div></div>
            <div class="attendance-item absent"><div style="font-size:18px;font-weight:bold;">${slip.absentDays}</div><div>Absent</div></div>
            <div class="attendance-item half-day"><div style="font-size:18px;font-weight:bold;">${slip.halfDays}</div><div>Half Days</div></div>
            <div class="attendance-item leaves"><div style="font-size:18px;font-weight:bold;">${slip.leaves}</div><div>Leaves</div></div>
          </div>
        </div>

        <div style="margin-top:30px;text-align:center;color:#666;font-size:12px;">
          <p>Office No 505, Global Square, Deccan College Road, Yerwada, Pune 411006</p>
          <p>THIS IS COMPUTER GENERATED SLIP NOT REQUIRED SIGNATURE & STAMP</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Download own slip
  const handleDownloadOwnSlip = async () => {
    if (!myEmployeeId) {
      toast.error('Your employee record not found');
      return;
    }
    setLoading(true);
    try {
      const res = await salarySlipApi.getAll({ month: selectedMonth, employeeId: myEmployeeId });
      if (res.success && res.data.length > 0) {
        printSlip(res.data[0]);
        toast.success('Salary slip loaded');
      } else {
        toast.info('No salary slip found for this month');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch your salary slip');
    } finally {
      setLoading(false);
    }
  };

  // Download selected employee's slip
  const handleDownloadEmployeeSlip = async () => {
    if (!selectedEmployeeId) {
      toast.error('Please select an employee');
      return;
    }
    setLoading(true);
    try {
      const res = await salarySlipApi.getAll({
        month: selectedMonth,
        employeeId: selectedEmployeeId,
      });
      if (res.success && res.data.length > 0) {
        printSlip(res.data[0]);
        toast.success('Employee salary slip loaded');
      } else {
        toast.info('No salary slip found for this employee this month');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch employee salary slip');
    } finally {
      setLoading(false);
    }
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = date.toISOString().slice(0, 7);
    const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    return { value, label };
  });

  if (fetching) {
    return (
      <div className="p-4 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <BackButton /> 
      <h1 className="text-2xl font-bold">Salary Slip</h1>

      <Card>
        <CardHeader><CardTitle>My Salary Slip</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Select Month</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleDownloadOwnSlip} disabled={loading || !myEmployeeId}>
            {loading && <Loader2 className="animate-spin mr-2" />}
            Download My Salary Slip
          </Button>
        </CardContent>
      </Card>

      {employees.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Employee Salary Slips</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Employee</label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Choose employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.employeeId} value={emp.employeeId}>
                      {emp.name} ({emp.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleDownloadEmployeeSlip} disabled={loading || !selectedEmployeeId}>
              {loading && <Loader2 className="animate-spin mr-2" />}
              Download Employee Salary Slip
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}