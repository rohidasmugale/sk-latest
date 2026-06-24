import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  X, 
  Plus, 
  Clock, 
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  Edit,
  Eye,
  Phone,
  FileText,
  Users,
  Briefcase,
  Calendar as CalendarIcon,
  Filter
} from 'lucide-react';

// Types
type LeaveType = 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'unpaid';
type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface LeaveRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  appliedDate: string;
  appliedBy: string;
  department: string;
  status: LeaveStatus;
  createdAt?: string;
  updatedAt?: string;
  remarks?: string;
  cancellationReason?: string;
  contactNumber?: string;
}

interface AdminLeaveStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  totalDays: number;
}

// Calendar component remains the same
const DatePickerCalendar: React.FC<{
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  isOpen: boolean;
  onClose: () => void;
  position: 'from' | 'to';
}> = ({ selectedDate, onDateSelect, isOpen, onClose, position }) => {
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate.getMonth());
      setCurrentYear(selectedDate.getFullYear());
    }
  }, [selectedDate]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const handleDateClick = (date: Date) => {
    onDateSelect(date);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    // Previous month's days
    const prevMonthLastDay = getDaysInMonth(currentYear, currentMonth - 1);
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      days.push(
        <button
          key={`prev-${i}`}
          className="h-10 w-10 rounded-lg text-gray-400 cursor-default"
          disabled
        >
          {prevMonthLastDay - i}
        </button>
      );
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isDateToday = isToday(date);
      const isDateSelected = isSelected(date);
      const isPastDate = date < new Date(new Date().setHours(0, 0, 0, 0));

      days.push(
        <button
          key={day}
          onClick={() => !isPastDate && handleDateClick(date)}
          className={`
            h-10 w-10 rounded-lg transition-all duration-200 flex items-center justify-center
            ${isPastDate ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-100'}
            ${isDateToday ? 'bg-blue-50 text-blue-600 font-medium' : ''}
            ${isDateSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
          `}
          disabled={isPastDate}
        >
          {day}
        </button>
      );
    }

    // Next month's days
    const totalCells = 42; // 6 weeks * 7 days
    const remainingCells = totalCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push(
        <button
          key={`next-${i}`}
          className="h-10 w-10 rounded-lg text-gray-400 cursor-default"
          disabled
        >
          {i}
        </button>
      );
    }

    return days;
  };

  if (!isOpen) return null;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 w-72">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-lg font-semibold">
          {monthNames[currentMonth]} {currentYear}
        </div>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {renderCalendar()}
      </div>

      {/* Today Button */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={() => handleDateClick(new Date())}
          className="w-full py-2 px-4 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium transition-colors"
        >
          Select Today
        </button>
      </div>
    </div>
  );
};

// View Leave Details Modal Component
const ViewLeaveDetailsModal: React.FC<{
  leave: LeaveRecord | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ leave, isOpen, onClose }) => {
  if (!isOpen || !leave) return null;

  const getStatusColor = (status: LeaveStatus) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLeaveTypeLabel = (type: LeaveType) => {
    switch (type) {
      case 'sick': return 'Sick Leave';
      case 'annual': return 'Annual Leave';
      case 'personal': return 'Personal Leave';
      case 'maternity': return 'Maternity Leave';
      case 'paternity': return 'Paternity Leave';
      case 'unpaid': return 'Unpaid Leave';
      default: return type;
    }
  };

  const getStatusIcon = (status: LeaveStatus) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-5 h-5" />;
      case 'rejected': return <X className="w-5 h-5" />;
      case 'pending': return <Clock className="w-5 h-5" />;
      case 'cancelled': return <X className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Leave Details</h2>
            <p className="text-sm text-gray-500 mt-1">Complete information about your leave request</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content with scrolling */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
          <div className="space-y-6">
            {/* Employee Information */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Your Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-sm text-blue-900 font-medium">{leave.employeeName}</p>
                      <p className="text-xs text-blue-700">Your Name</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-7">
                    <div>
                      <p className="text-sm text-blue-900">{leave.employeeId}</p>
                      <p className="text-xs text-blue-700">Your ID</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-sm text-blue-900 font-medium">{leave.department}</p>
                      <p className="text-xs text-blue-700">Department</p>
                    </div>
                  </div>
                  {leave.contactNumber && leave.contactNumber !== 'N/A' && (
                    <div className="flex items-center gap-3 ml-7">
                      <Phone className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-blue-900">{leave.contactNumber}</p>
                        <p className="text-xs text-blue-700">Contact Number</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Leave Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Leave Type and Status */}
              <div>
                <h3 className="font-medium text-gray-700 mb-3">Leave Information</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Leave Type</p>
                    <p className="font-medium text-gray-900">{getLeaveTypeLabel(leave.leaveType)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mt-1 ${getStatusColor(leave.status)}`}>
                      {getStatusIcon(leave.status)}
                      {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates Information */}
              <div>
                <h3 className="font-medium text-gray-700 mb-3">Dates</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">From Date</p>
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {leave.fromDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">To Date</p>
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {leave.toDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Days</p>
                    <p className="font-medium text-gray-900">{leave.totalDays} day{leave.totalDays > 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Application Details */}
            <div>
              <h3 className="font-medium text-gray-700 mb-3">Application Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Applied Date</p>
                  <p className="font-medium text-gray-900">{leave.appliedDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Application Status</p>
                  <p className="font-medium text-gray-900">
                    {leave.status === 'pending' ? 'Awaiting Approval' : 
                     leave.status === 'approved' ? 'Approved' :
                     leave.status === 'rejected' ? 'Rejected' : 'Cancelled'}
                  </p>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div>
              <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Reason for Leave
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 whitespace-pre-line">{leave.reason}</p>
              </div>
            </div>

            {/* Additional Information */}
            {(leave.remarks || leave.cancellationReason) && (
              <div>
                <h3 className="font-medium text-gray-700 mb-3">Additional Information</h3>
                <div className="space-y-4">
                  {leave.remarks && (
                    <div>
                      <p className="text-sm text-gray-500">Manager Remarks</p>
                      <div className="bg-yellow-50 p-4 rounded-lg mt-1">
                        <p className="text-gray-700">{leave.remarks}</p>
                      </div>
                    </div>
                  )}
                  {leave.cancellationReason && (
                    <div>
                      <p className="text-sm text-gray-500">Cancellation Reason</p>
                      <div className="bg-red-50 p-4 rounded-lg mt-1">
                        <p className="text-gray-700">{leave.cancellationReason}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminLeavePage: React.FC = () => {
  // State for form inputs
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [contactNumber, setContactNumber] = useState<string>('');
  
  // Calendar states
  const [showFromCalendar, setShowFromCalendar] = useState<boolean>(false);
  const [showToCalendar, setShowToCalendar] = useState<boolean>(false);
  const [fromDateObj, setFromDateObj] = useState<Date | null>(null);
  const [toDateObj, setToDateObj] = useState<Date | null>(null);
  
  // State for popup and data
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [filteredLeaves, setFilteredLeaves] = useState<LeaveRecord[]>([]);
  const [stats, setStats] = useState<AdminLeaveStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    totalDays: 0
  });
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'all'>('all');
  
  // View details modal state
  const [viewModalOpen, setViewModalOpen] = useState<boolean>(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  // User state (fetched from profile/localStorage)
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; department: string }>({
    name: '',
    email: '',
    department: 'Administration'
  });

  // API Base URL
 const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');
  // Fetch current user from localStorage on component mount
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Fetch admin leaves when current user is available
  useEffect(() => {
    if (currentUser.name) {
      fetchAdminLeaves();
      fetchAdminStats();
    }
  }, [currentUser.name]);

  // Filter leaves when status filter or leaveRecords change
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredLeaves(leaveRecords);
    } else {
      setFilteredLeaves(leaveRecords.filter(leave => leave.status === statusFilter));
    }
  }, [statusFilter, leaveRecords]);

  const fetchCurrentUser = () => {
    try {
      const storedUser = localStorage.getItem('sk_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser({
          name: parsedUser.name || 'Admin User',
          email: parsedUser.email || '',
          department: parsedUser.department || 'Administration'
        });
      } else {
        // Fallback to default
        setCurrentUser({
          name: 'Admin User',
          email: '',
          department: 'Administration'
        });
      }
    } catch (error) {
      console.error('Error fetching user from localStorage:', error);
      setCurrentUser({
        name: 'Admin User',
        email: '',
        department: 'Administration'
      });
    }
  };

  // Format date to dd-mm-yyyy
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Format date for API (YYYY-MM-DD)
  const formatDateForAPI = (dateStr: string): string => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  // Format date from API (YYYY-MM-DD to dd-mm-yyyy)
  const formatDateFromAPI = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return formatDate(date);
    } catch (error) {
      return dateStr;
    }
  };

  // Fetch admin leave records from MongoDB - FILTERED FOR CURRENT USER
const fetchAdminLeaves = async () => {
  try {
    setLoading(true);
    
    // Get current user from localStorage
    const storedUser = localStorage.getItem('sk_user');
    const userId = storedUser ? JSON.parse(storedUser).name : currentUser.name;
    
    // CORRECTED ENDPOINT: /api/admin-leaves (not /api/admin/leaves)
    const response = await fetch(`${API_URL}/admin-leaves?userId=${encodeURIComponent(userId)}`);
    
    if (!response.ok) {
      throw new Error(`http error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Transform the data to match our frontend format
      const transformedLeaves = data.leaves
        .map((leave: any) => ({
          id: leave._id || leave.id,
          employeeId: leave.employeeId,
          employeeName: leave.employeeName,
          leaveType: leave.leaveType,
          fromDate: formatDateFromAPI(leave.fromDate),
          toDate: formatDateFromAPI(leave.toDate),
          totalDays: leave.totalDays,
          reason: leave.reason,
          appliedDate: formatDateFromAPI(leave.appliedDate || leave.createdAt),
          appliedBy: leave.appliedBy,
          department: leave.department,
          status: leave.status,
          createdAt: leave.createdAt,
          updatedAt: leave.updatedAt,
          remarks: leave.superadminRemarks || leave.remarks,
          cancellationReason: leave.cancellationReason,
          contactNumber: leave.contactNumber
        }))
        // Sort by date (newest first)
        .sort((a: LeaveRecord, b: LeaveRecord) => {
          const dateA = new Date(a.appliedDate.split('-').reverse().join('-'));
          const dateB = new Date(b.appliedDate.split('-').reverse().join('-'));
          return dateB.getTime() - dateA.getTime();
        });
      
      setLeaveRecords(transformedLeaves);
    }
  } catch (error) {
    console.error('Error fetching admin leaves:', error);
    // Fallback to sample data if API fails
    const sampleData = [
      {
        id: '1',
        employeeId: 'ADMIN-001',
        employeeName: currentUser.name,
        leaveType: 'annual',
        fromDate: '15-01-2024',
        toDate: '16-01-2024',
        totalDays: 2,
        reason: 'Annual vacation',
        appliedDate: '14-01-2024',
        appliedBy: currentUser.name,
        department: 'Administration',
        status: 'pending' as LeaveStatus // Changed to pending for testing
      }
    ];
    
    setLeaveRecords(sampleData);
  } finally {
    setLoading(false);
  }
};


  // Fetch admin leave statistics - CALCULATED FOR CURRENT USER ONLY
const fetchAdminStats = async () => {
  try {
    // Get current user from localStorage
    const storedUser = localStorage.getItem('sk_user');
    const userId = storedUser ? JSON.parse(storedUser).name : currentUser.name;
    
    // CORRECTED ENDPOINT: /api/admin-leaves/stats
    const response = await fetch(`${API_URL}/admin-leaves/stats?userId=${encodeURIComponent(userId)}`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        return;
      }
    }
    
    // Fallback: Calculate stats from local data
    const localStats = {
      total: leaveRecords.length,
      pending: leaveRecords.filter(l => l.status === 'pending').length,
      approved: leaveRecords.filter(l => l.status === 'approved').length,
      rejected: leaveRecords.filter(l => l.status === 'rejected').length,
      cancelled: leaveRecords.filter(l => l.status === 'cancelled').length,
      totalDays: leaveRecords.reduce((sum, record) => sum + record.totalDays, 0)
    };
    setStats(localStats);
    
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    // Calculate stats from local data if API fails
    const localStats = {
      total: leaveRecords.length,
      pending: leaveRecords.filter(l => l.status === 'pending').length,
      approved: leaveRecords.filter(l => l.status === 'approved').length,
      rejected: leaveRecords.filter(l => l.status === 'rejected').length,
      cancelled: leaveRecords.filter(l => l.status === 'cancelled').length,
      totalDays: leaveRecords.reduce((sum, record) => sum + record.totalDays, 0)
    };
    setStats(localStats);
  }
};

  // Handle from date selection
  const handleFromDateSelect = (date: Date) => {
    setFromDateObj(date);
    setFromDate(formatDate(date));
    if (toDateObj && date > toDateObj) {
      setToDateObj(null);
      setToDate('');
    }
    setShowFromCalendar(false);
  };

  // Handle to date selection
  const handleToDateSelect = (date: Date) => {
    if (fromDateObj && date < fromDateObj) {
      alert('To date must be after from date');
      return;
    }
    setToDateObj(date);
    setToDate(formatDate(date));
    setShowToCalendar(false);
  };

  // Function to calculate days between dates
  const calculateDays = (from: string, to: string): number => {
    if (!from || !to) return 0;
    
    const fromParts = from.split('-');
    const toParts = to.split('-');
    
    if (fromParts.length !== 3 || toParts.length !== 3) return 0;
    
    const fromDateObj = new Date(
      parseInt(fromParts[2]),
      parseInt(fromParts[1]) - 1,
      parseInt(fromParts[0])
    );
    
    const toDateObj = new Date(
      parseInt(toParts[2]),
      parseInt(toParts[1]) - 1,
      parseInt(toParts[0])
    );
    
    const timeDiff = toDateObj.getTime() - fromDateObj.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    
    return daysDiff > 0 ? daysDiff : 1;
  };

  // Reset form
  const resetForm = () => {
    setLeaveType('annual');
    setFromDate('');
    setToDate('');
    setFromDateObj(null);
    setToDateObj(null);
    setReason('');
    setContactNumber('');
    setShowFromCalendar(false);
    setShowToCalendar(false);
    setIsEditMode(false);
    setEditingLeaveId(null);
  };

  // Open form for editing
  const handleEditLeave = (leave: LeaveRecord) => {
    setLeaveType(leave.leaveType);
    setFromDate(leave.fromDate);
    setToDate(leave.toDate);
    setReason(leave.reason);
    setContactNumber(leave.contactNumber || '');
    setEditingLeaveId(leave.id);
    setIsEditMode(true);
    setIsPopupOpen(true);
  };

  // Handle view leave details
  const handleViewLeave = (leave: LeaveRecord) => {
    setSelectedLeave(leave);
    setViewModalOpen(true);
  };

  // Handle form submission - Send to MongoDB
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!fromDate || !toDate || !reason) {
    alert('Please fill all required fields');
    return;
  }
  
  // Calculate total days
  const totalDays = calculateDays(fromDate, toDate);
  if (totalDays <= 0) {
    alert('Invalid date range');
    return;
  }
  
  try {
    setSubmitting(true);
    
    const leaveData = {
      leaveType,
      fromDate: formatDateForAPI(fromDate),
      toDate: formatDateForAPI(toDate),
      reason,
      appliedBy: currentUser.name,
      employeeName: currentUser.name,
      contactNumber: contactNumber || 'N/A',
      department: currentUser.department
    };
    
    // CORRECTED ENDPOINT: /api/admin-leaves/apply
    const response = await fetch(`${API_URL}/admin-leaves/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(leaveData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `http error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Add the new leave to local state
      const newLeave: LeaveRecord = {
        id: data.leave._id || data.leave.id,
        employeeId: data.leave.employeeId,
        employeeName: data.leave.employeeName,
        leaveType: data.leave.leaveType as LeaveType,
        fromDate: formatDateFromAPI(data.leave.fromDate),
        toDate: formatDateFromAPI(data.leave.toDate),
        totalDays: data.leave.totalDays,
        reason: data.leave.reason,
        appliedDate: formatDateFromAPI(data.leave.appliedDate || new Date().toISOString()),
        appliedBy: data.leave.appliedBy,
        department: data.leave.department,
        status: data.leave.status as LeaveStatus,
        contactNumber: data.leave.contactNumber
      };
      
      setLeaveRecords(prev => [newLeave, ...prev]);
      
      // Update stats
      fetchAdminStats();
      
      alert('Leave request submitted successfully! Waiting for superadmin approval.');
      
      // Reset form and close popup
      resetForm();
      setIsPopupOpen(false);
      
    } else {
      throw new Error(data.message || 'Failed to submit leave request');
    }
  } catch (error) {
    console.error('Error submitting leave request:', error);
    alert(`Error: ${error instanceof Error ? error.message : 'Failed to submit leave request'}`);
  } finally {
    setSubmitting(false);
  }
};

  // Get status badge color
  const getStatusColor = (status: LeaveStatus) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: LeaveStatus) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-4 h-4" />;
      case 'rejected': return <X className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
    }
  };

  // Get leave type label
  const getLeaveTypeLabel = (type: LeaveType) => {
    switch (type) {
      case 'sick': return 'Sick Leave';
      case 'annual': return 'Annual Leave';
      case 'personal': return 'Personal Leave';
      case 'maternity': return 'Maternity Leave';
      case 'paternity': return 'Paternity Leave';
      case 'unpaid': return 'Unpaid Leave';
      default: return type;
    }
  };

  // Refresh data
  const handleRefresh = () => {
    fetchAdminLeaves();
    fetchAdminStats();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Leave Management</h1>
            <p className="text-gray-600 mt-2">
              Welcome, <span className="font-semibold text-blue-600">{currentUser.name}</span> • {currentUser.department}
            </p>
          </div>
          
          <div className="flex gap-3 mt-4 md:mt-0">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            
            {/* Apply Leave Button */}
            <button
              onClick={() => {
                resetForm();
                setIsPopupOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              <Plus className="w-5 h-5" />
              Apply for Leave
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Applied</p>
                <p className="text-2xl font-bold mt-2">{stats.total}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Your total leave applications</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pending</p>
                <p className="text-2xl font-bold mt-2 text-yellow-600">
                  {stats.pending}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Awaiting approval</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Approved</p>
                <p className="text-2xl font-bold mt-2 text-green-600">
                  {stats.approved}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Approved leaves</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Days</p>
                <p className="text-2xl font-bold mt-2 text-purple-600">
                  {stats.totalDays}
                </p>
              </div>
              <CalendarDays className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Total leave days taken</p>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">My Leave History</h2>
            <p className="text-sm text-gray-500 mt-1">
              Showing your {statusFilter === 'all' ? 'all' : statusFilter} leave requests
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeaveStatus | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Leave Records Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Your Leave Requests</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {loading ? 'Loading...' : `Showing ${filteredLeaves.length} of ${leaveRecords.length} records`}
                </p>
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Details
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From - To Date
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Days
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied Date
                  </th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center">
                      <div className="flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      </div>
                    </td>
                  </tr>
                ) : filteredLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <Calendar className="w-12 h-12 text-gray-300 mb-2" />
                        <p className="text-lg font-medium mb-2">No leave records found</p>
                        <p className="text-gray-500 mb-4">
                          {statusFilter === 'all' 
                            ? "You haven't applied for any leaves yet" 
                            : `You don't have any ${statusFilter} leave requests`}
                        </p>
                        <button
                          onClick={() => setIsPopupOpen(true)}
                          className="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4 inline mr-2" />
                          Apply for Leave
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeaves.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            {record.reason.substring(0, 50)}{record.reason.length > 50 ? '...' : ''}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {record.employeeId}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-medium text-gray-900">
                          {getLeaveTypeLabel(record.leaveType)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900">
                          {record.fromDate} to {record.toDate}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm font-medium text-gray-900">
                          {record.totalDays} day{record.totalDays > 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                          {getStatusIcon(record.status)}
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-500">
                          {record.appliedDate}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-3">
                          {/* View Button */}
                          <button
                            onClick={() => handleViewLeave(record)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          
                          {/* Edit Button (only for pending leaves) */}
                          {record.status === 'pending' && (
                            <button
                              onClick={() => handleEditLeave(record)}
                              className="text-yellow-600 hover:text-yellow-700 text-sm font-medium flex items-center gap-1 px-3 py-1 rounded-md hover:bg-yellow-50 transition-colors"
                              title="Edit Leave"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Popup Modal for Add/Edit Leave */}
        {isPopupOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                <h2 className="text-xl font-semibold text-gray-900">
                  {isEditMode ? 'Edit Your Leave Request' : 'Apply for Leave'}
                </h2>
                <button
                  onClick={() => !submitting && (resetForm(), setIsPopupOpen(false))}
                  className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
                  disabled={submitting}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Current User Info */}
              <div className="px-6 pt-6">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">{currentUser.name}</p>
                      <p className="text-xs text-blue-600">{currentUser.department}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Form with scrolling */}
              <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
                <div className="p-6 space-y-6">
                  {/* Leave Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Leave Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      required
                      disabled={submitting}
                    >
                      <option value="annual">Annual Leave</option>
                      <option value="sick">Sick Leave</option>
                      <option value="personal">Personal Leave</option>
                      <option value="maternity">Maternity Leave</option>
                      <option value="paternity">Paternity Leave</option>
                      <option value="unpaid">Unpaid Leave</option>
                    </select>
                  </div>

                  {/* Contact Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      placeholder="Enter your contact number"
                      disabled={submitting}
                    />
                  </div>

                  {/* Date Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        From Date <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="dd-mm-yyyy"
                          value={fromDate}
                          readOnly
                          onClick={() => {
                            setShowFromCalendar(true);
                            setShowToCalendar(false);
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition cursor-pointer bg-white"
                          required
                          disabled={submitting}
                        />
                        <Calendar className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                      </div>
                      {showFromCalendar && (
                        <div className="absolute z-20">
                          <DatePickerCalendar
                            selectedDate={fromDateObj}
                            onDateSelect={handleFromDateSelect}
                            isOpen={showFromCalendar}
                            onClose={() => setShowFromCalendar(false)}
                            position="from"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        To Date <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="dd-mm-yyyy"
                          value={toDate}
                          readOnly
                          onClick={() => {
                            setShowToCalendar(true);
                            setShowFromCalendar(false);
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition cursor-pointer bg-white"
                          required
                          disabled={submitting}
                        />
                        <Calendar className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                      </div>
                      {showToCalendar && (
                        <div className="absolute z-20">
                          <DatePickerCalendar
                            selectedDate={toDateObj}
                            onDateSelect={handleToDateSelect}
                            isOpen={showToCalendar}
                            onClose={() => setShowToCalendar(false)}
                            position="to"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                      placeholder="Enter reason for leave"
                      required
                      disabled={submitting}
                    />
                  </div>

                  {/* Info about days calculation */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">Note:</p>
                        <p className="mt-1">
                          Total days will be automatically calculated when you submit the form.
                          Weekends are included in the calculation.
                        </p>
                        {fromDate && toDate && (
                          <p className="mt-2 font-medium">
                            Calculated: {calculateDays(fromDate, toDate)} day(s)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Sticky bottom */}
                <div className="p-6 border-t bg-white sticky bottom-0">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => !submitting && (resetForm(), setIsPopupOpen(false))}
                      className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {isEditMode ? 'Updating...' : 'Submitting...'}
                        </>
                      ) : (
                        isEditMode ? 'Update Leave Request' : 'Submit Leave Request'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Leave Details Modal */}
        <ViewLeaveDetailsModal
          leave={selectedLeave}
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default AdminLeavePage;