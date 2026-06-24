// AttendanceDetailsDialog.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  CalendarDays,
  Users,
  LogIn,
  LogOut,
  Camera,
  FileText,
  Save,
  Loader2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  siteName?: string;
  status: string;
  totalHours?: number;
}

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  status: 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off';
  isCheckedIn: boolean;
  isOnBreak: boolean;
  supervisorId?: string;
  remarks?: string;
}

interface AttendanceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off';
  date: string;
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  onRefresh: () => Promise<void>;
  supervisorId: string;
  getStatusBadge: (status: string) => string;
  getStatusIcon: (status: string) => JSX.Element | null;
  formatTimeForDisplay: (time: string | null) => string;
  formatHours: (hours: number) => string;
}

const AttendanceDetailsDialog: React.FC<AttendanceDetailsDialogProps> = ({
  open,
  onOpenChange,
  type,
  date,
  employees,
  attendanceRecords,
  onRefresh,
  supervisorId,
  getStatusBadge,
  getStatusIcon,
  formatTimeForDisplay,
  formatHours,
}) => {
  const [isMobileView, setIsMobileView] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [statusUpdateDialogOpen, setStatusUpdateDialogOpen] = useState(false);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [statusUpdateData, setStatusUpdateData] = useState({
    employeeId: '',
    employeeName: '',
    attendanceId: '',
    currentStatus: '',
    newStatus: 'present' as 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off',
    date: date,
    remarks: ''
  });
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [selectedPhotoType, setSelectedPhotoType] = useState<'checkin' | 'checkout'>('checkin');

  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getTitle = () => {
    switch (type) {
      case 'present':
        return { title: 'Present Employees', icon: <CheckCircle className="h-5 w-5 text-green-600" />, color: 'green', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
      case 'absent':
        return { title: 'Absent Employees', icon: <XCircle className="h-5 w-5 text-red-600" />, color: 'red', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
      case 'half-day':
        return { title: 'Half Day Employees', icon: <Clock className="h-5 w-5 text-yellow-600" />, color: 'yellow', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
      case 'leave':
        return { title: 'On Leave Employees', icon: <Calendar className="h-5 w-5 text-blue-600" />, color: 'blue', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
      case 'weekly-off':
        return { title: 'Weekly Off Employees', icon: <CalendarDays className="h-5 w-5 text-purple-600" />, color: 'purple', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' };
      default:
        return { title: 'Attendance Details', icon: <Users className="h-5 w-5" />, color: 'gray', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
    }
  };

  const { title, icon, bgColor, borderColor } = getTitle();

  const getFilteredEmployeesByType = () => {
    const recordsForDate = attendanceRecords.filter(record => record.date === date);
    
    switch (type) {
      case 'present':
        return employees.filter(emp => {
          const record = recordsForDate.find(r => r.employeeId === emp._id);
          return record && record.status === 'present';
        });
      case 'absent':
        return employees.filter(emp => {
          const record = recordsForDate.find(r => r.employeeId === emp._id);
          return !record || record.status === 'absent';
        });
      case 'half-day':
        return employees.filter(emp => {
          const record = recordsForDate.find(r => r.employeeId === emp._id);
          return record && record.status === 'half-day';
        });
      case 'leave':
        return employees.filter(emp => {
          const record = recordsForDate.find(r => r.employeeId === emp._id);
          return record && record.status === 'leave';
        });
      case 'weekly-off':
        return employees.filter(emp => {
          const record = recordsForDate.find(r => r.employeeId === emp._id);
          return record && record.status === 'weekly-off';
        });
      default:
        return [];
    }
  };

  const filteredEmployeesByType = getFilteredEmployeesByType();

  const getEmployeeAttendanceRecord = (employeeId: string): AttendanceRecord | undefined => {
    return attendanceRecords.find(record => record.employeeId === employeeId && record.date === date);
  };

  const getFilteredEmployees = () => {
    let filtered = [...filteredEmployeesByType];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(query) ||
        emp.employeeId.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query)
      );
    }
    
    if (selectedSite !== "all") {
      filtered = filtered.filter(emp => emp.siteName === selectedSite);
    }
    
    if (selectedDepartment !== "all") {
      filtered = filtered.filter(emp => emp.department === selectedDepartment);
    }
    
    return filtered;
  };

  const displayedEmployees = getFilteredEmployees();

  const siteOptions = Array.from(new Set(employees.map(emp => emp.siteName))).filter(Boolean);
  const departmentOptions = Array.from(new Set(employees.map(emp => emp.department))).filter(Boolean);

  const handleStatusUpdate = (employee: Employee) => {
    const attendanceRecord = getEmployeeAttendanceRecord(employee._id);
    setSelectedEmployee(employee);
    setStatusUpdateData({
      employeeId: employee._id,
      employeeName: employee.name,
      attendanceId: attendanceRecord?._id || '',
      currentStatus: attendanceRecord?.status || 'absent',
      newStatus: 'present',
      date: date,
      remarks: attendanceRecord?.remarks || ''
    });
    setStatusUpdateDialogOpen(true);
  };

  const submitStatusUpdate = async () => {
    if (!selectedEmployee) return;

    try {
      setUpdatingStatus(true);
      
      const response = await axios.post(`${API_URL}/attendance/update-status`, {
        employeeId: statusUpdateData.employeeId,
        attendanceId: statusUpdateData.attendanceId || null,
        date: statusUpdateData.date,
        status: statusUpdateData.newStatus,
        remarks: statusUpdateData.remarks,
        supervisorId: supervisorId,
        employeeName: selectedEmployee.name
      });

      const data = response.data;
      
      if (data.success) {
        toast.success(`Status updated to ${statusUpdateData.newStatus.replace('-', ' ')} for ${selectedEmployee.name}`);
        setStatusUpdateDialogOpen(false);
        await onRefresh();
      } else {
        toast.error(data.message || "Error updating status");
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(`Error updating status: ${error.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleViewPhoto = (photoUrl: string | null | undefined, type: 'checkin' | 'checkout') => {
    if (photoUrl) {
      setSelectedPhotoUrl(photoUrl);
      setSelectedPhotoType(type);
      setPhotoModalOpen(true);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSite("all");
    setSelectedDepartment("all");
  };

  const getTypeBadgeClass = () => {
    switch (type) {
      case 'present': return "bg-green-100 text-green-800 border-green-200";
      case 'absent': return "bg-red-100 text-red-800 border-red-200";
      case 'half-day': return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'leave': return "bg-blue-100 text-blue-800 border-blue-200";
      case 'weekly-off': return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const toggleExpandEmployee = (employeeId: string) => {
    if (expandedEmployeeId === employeeId) {
      setExpandedEmployeeId(null);
    } else {
      setExpandedEmployeeId(employeeId);
    }
  };

  // Mobile Employee Card Component
  const MobileEmployeeCard = ({ employee }: { employee: Employee }) => {
    const attendanceRecord = getEmployeeAttendanceRecord(employee._id);
    const isExpanded = expandedEmployeeId === employee._id;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-3"
      >
        <Card className={`overflow-hidden ${borderColor} ${bgColor}`}>
          <CardContent className="p-4">
            {/* Header - Always Visible */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-base truncate">{employee.name}</h4>
                    <p className="text-xs text-muted-foreground">ID: {employee.employeeId}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={attendanceRecord ? getStatusBadge(attendanceRecord.status) : getTypeBadgeClass()}>
                  {attendanceRecord ? getStatusIcon(attendanceRecord.status) : getStatusIcon(type)}
                  <span className="ml-1 text-xs">
                    {attendanceRecord ? 
                      attendanceRecord.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                      title.replace(' Employees', '')}
                  </span>
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpandEmployee(employee._id)}
                  className="h-8 w-8 p-0"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Basic Info - Always Visible */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1">
                <Briefcase className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Dept:</span>
                <span className="font-medium truncate">{employee.department}</span>
              </div>
              <div className="flex items-center gap-1">
                <Building className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Site:</span>
                <span className="font-medium truncate">{employee.siteName || 'N/A'}</span>
              </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3 pt-3 border-t space-y-3 overflow-hidden"
                >
                  {/* Contact Info */}
                  <div className="space-y-2">
                    {employee.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Email:</span>
                        <span className="text-xs truncate flex-1">{employee.email}</span>
                      </div>
                    )}
                    {employee.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Phone:</span>
                        <span>{employee.phone}</span>
                      </div>
                    )}
                    {employee.position && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Position:</span>
                        <span>{employee.position}</span>
                      </div>
                    )}
                  </div>

                  {/* Attendance Details */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Attendance Details</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/50 rounded p-2">
                        <p className="text-xs text-muted-foreground">Check In</p>
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <LogIn className="h-3 w-3" />
                          {attendanceRecord?.checkInTime ? formatTimeForDisplay(attendanceRecord.checkInTime) : "-"}
                        </div>
                        {attendanceRecord?.checkInPhoto && (
                          <button
                            onClick={() => handleViewPhoto(attendanceRecord.checkInPhoto, 'checkin')}
                            className="text-xs text-blue-500 mt-1 flex items-center gap-1"
                          >
                            <Camera className="h-3 w-3" />
                            View Photo
                          </button>
                        )}
                      </div>
                      <div className="bg-white/50 rounded p-2">
                        <p className="text-xs text-muted-foreground">Check Out</p>
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <LogOut className="h-3 w-3" />
                          {attendanceRecord?.checkOutTime ? formatTimeForDisplay(attendanceRecord.checkOutTime) : "-"}
                        </div>
                        {attendanceRecord?.checkOutPhoto && (
                          <button
                            onClick={() => handleViewPhoto(attendanceRecord.checkOutPhoto, 'checkout')}
                            className="text-xs text-blue-500 mt-1 flex items-center gap-1"
                          >
                            <Camera className="h-3 w-3" />
                            View Photo
                          </button>
                        )}
                      </div>
                      <div className="bg-white/50 rounded p-2">
                        <p className="text-xs text-muted-foreground">Break In</p>
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Clock className="h-3 w-3" />
                          {attendanceRecord?.breakStartTime ? formatTimeForDisplay(attendanceRecord.breakStartTime) : "-"}
                        </div>
                      </div>
                      <div className="bg-white/50 rounded p-2">
                        <p className="text-xs text-muted-foreground">Break Out</p>
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Clock className="h-3 w-3" />
                          {attendanceRecord?.breakEndTime ? formatTimeForDisplay(attendanceRecord.breakEndTime) : "-"}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Hours</p>
                        <p className="text-sm font-bold">{attendanceRecord?.totalHours ? formatHours(attendanceRecord.totalHours) : "-"}</p>
                      </div>
                      {attendanceRecord?.remarks && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Remarks</p>
                          <p className="text-xs italic">{attendanceRecord.remarks}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(employee)}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Update Status
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // Stats Card Component for Mobile
  const StatsCard = ({ label, count, icon, colorClass }: { label: string; count: number; icon: React.ReactNode; colorClass: string }) => (
    <Card className={`${colorClass} border`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium">{label}</p>
            <p className="text-xl font-bold">{count}</p>
          </div>
          <div className="p-2 rounded-full bg-white/50">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`${isMobileView ? 'max-w-[95vw] p-4' : 'max-w-6xl p-6'} max-h-[90vh] overflow-y-auto`}>
          <DialogHeader className={isMobileView ? 'sticky top-0 bg-background z-10 pb-2' : ''}>
            <DialogTitle className="flex items-center gap-2 text-lg md:text-xl">
              {icon}
              <span className="truncate">{title} - {date}</span>
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Total: {displayedEmployees.length} employees • Tap on any employee to view details and update status
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and Filters - Mobile Optimized */}
            <div className="sticky top-12 bg-background z-10 pt-2 pb-2 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, ID or email..."
                    className="pl-10 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size={isMobileView ? "sm" : "default"}
                    onClick={() => setShowFilters(!showFilters)}
                    className="shrink-0"
                  >
                    <Filter className="h-4 w-4 mr-1" />
                    {!isMobileView && "Filters"}
                  </Button>
                  <Button
                    variant="outline"
                    size={isMobileView ? "sm" : "default"}
                    onClick={clearFilters}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4 mr-1" />
                    {!isMobileView && "Clear"}
                  </Button>
                </div>
              </div>

              {/* Expandable Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border rounded-lg bg-gray-50">
                      <div>
                        <Label className="text-xs font-medium">Site</Label>
                        <Select value={selectedSite} onValueChange={setSelectedSite}>
                          <SelectTrigger className="text-sm h-9">
                            <SelectValue placeholder="All Sites" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Sites</SelectItem>
                            {siteOptions.map(site => (
                              <SelectItem key={site} value={site || ''} className="text-sm">
                                {site}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Department</Label>
                        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                          <SelectTrigger className="text-sm h-9">
                            <SelectValue placeholder="All Departments" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {departmentOptions.map(dept => (
                              <SelectItem key={dept} value={dept} className="text-sm">
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Stats Summary - Mobile Optimized */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <StatsCard 
                label="Present" 
                count={attendanceRecords.filter(r => r.date === date && r.status === 'present').length}
                icon={<CheckCircle className="h-5 w-5 text-green-600" />}
                colorClass="bg-green-50 border-green-200"
              />
              <StatsCard 
                label="Absent" 
                count={employees.length - attendanceRecords.filter(r => r.date === date && r.status !== 'absent').length}
                icon={<XCircle className="h-5 w-5 text-red-600" />}
                colorClass="bg-red-50 border-red-200"
              />
              <StatsCard 
                label="Half Day" 
                count={attendanceRecords.filter(r => r.date === date && r.status === 'half-day').length}
                icon={<Clock className="h-5 w-5 text-yellow-600" />}
                colorClass="bg-yellow-50 border-yellow-200"
              />
              <StatsCard 
                label="On Leave" 
                count={attendanceRecords.filter(r => r.date === date && r.status === 'leave').length}
                icon={<Calendar className="h-5 w-5 text-blue-600" />}
                colorClass="bg-blue-50 border-blue-200"
              />
            </div>

            {/* Employees List - Mobile Responsive */}
            {displayedEmployees.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No {type} employees found</p>
                <p className="text-xs text-muted-foreground mt-2">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                {/* Mobile View - Card Layout */}
                {isMobileView && (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {displayedEmployees.map((employee) => (
                        <MobileEmployeeCard key={employee._id} employee={employee} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Desktop View - Table Layout */}
                {!isMobileView && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Employee</TableHead>
                            <TableHead className="whitespace-nowrap">ID</TableHead>
                            <TableHead className="whitespace-nowrap">Department</TableHead>
                            <TableHead className="whitespace-nowrap">Site</TableHead>
                            <TableHead className="whitespace-nowrap">Check In</TableHead>
                            <TableHead className="whitespace-nowrap">Check Out</TableHead>
                            <TableHead className="whitespace-nowrap">Check In Photo</TableHead>
                            <TableHead className="whitespace-nowrap">Check Out Photo</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Hours</TableHead>
                            <TableHead className="whitespace-nowrap">Status</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayedEmployees.map((employee) => {
                            const attendanceRecord = getEmployeeAttendanceRecord(employee._id);
                            
                            return (
                              <TableRow 
                                key={employee._id}
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => handleStatusUpdate(employee)}
                              >
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{employee.name}</span>
                                    <span className="text-xs text-muted-foreground">{employee.email}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <span className="text-sm">{employee.employeeId}</span>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">{employee.department}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="max-w-[150px] truncate">
                                    {employee.siteName || 'Not Assigned'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {attendanceRecord?.checkInTime ? (
                                    <div className="flex items-center gap-2">
                                      <LogIn className="h-3 w-3 text-muted-foreground" />
                                      {formatTimeForDisplay(attendanceRecord.checkInTime)}
                                    </div>
                                  ) : "-"}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {attendanceRecord?.checkOutTime ? (
                                    <div className="flex items-center gap-2">
                                      <LogOut className="h-3 w-3 text-muted-foreground" />
                                      {formatTimeForDisplay(attendanceRecord.checkOutTime)}
                                    </div>
                                  ) : "-"}
                                </TableCell>
                                <TableCell>
                                  {attendanceRecord?.checkInPhoto ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewPhoto(attendanceRecord.checkInPhoto, 'checkin');
                                      }}
                                      className="h-8 px-2"
                                    >
                                      <Camera className="h-4 w-4" />
                                    </Button>
                                  ) : <span className="text-muted-foreground text-sm">-</span>}
                                </TableCell>
                                <TableCell>
                                  {attendanceRecord?.checkOutPhoto ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewPhoto(attendanceRecord.checkOutPhoto, 'checkout');
                                      }}
                                      className="h-8 px-2"
                                    >
                                      <Camera className="h-4 w-4" />
                                    </Button>
                                  ) : <span className="text-muted-foreground text-sm">-</span>}
                                </TableCell>
                                <TableCell className="text-right font-medium whitespace-nowrap">
                                  {attendanceRecord?.totalHours ? formatHours(attendanceRecord.totalHours) : "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge className={attendanceRecord ? getStatusBadge(attendanceRecord.status) : getTypeBadgeClass()}>
                                    {attendanceRecord ? getStatusIcon(attendanceRecord.status) : getStatusIcon(type)}
                                    {attendanceRecord ? 
                                      attendanceRecord.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                                      title.replace(' Employees', '')}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusUpdate(employee);
                                    }}
                                    className="whitespace-nowrap"
                                  >
                                    <FileText className="h-4 w-4 mr-1" />
                                    Update
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Pagination / Load More for Mobile */}
                {isMobileView && displayedEmployees.length > 10 && (
                  <div className="flex justify-center pt-4">
                    <p className="text-xs text-muted-foreground">
                      Showing {displayedEmployees.length} employees
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog - Mobile Responsive */}
      <Dialog open={statusUpdateDialogOpen} onOpenChange={setStatusUpdateDialogOpen}>
        <DialogContent className={`${isMobileView ? 'max-w-[95vw] p-4' : 'sm:max-w-md'} max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className="text-lg">Update Attendance Status</DialogTitle>
            <DialogDescription className="text-sm">
              Update status for {selectedEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Employee Details</Label>
              <div className="p-3 border rounded-lg bg-gray-50 space-y-2 mt-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm"><strong>Name:</strong> {selectedEmployee?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">ID: {selectedEmployee?.employeeId}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm"><strong>Department:</strong> {selectedEmployee?.department}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm"><strong>Site:</strong> {selectedEmployee?.siteName || 'Not Assigned'}</p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm">Date</Label>
              <Input
                type="date"
                value={statusUpdateData.date}
                onChange={(e) => setStatusUpdateData({...statusUpdateData, date: e.target.value})}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label className="text-sm">Current Status</Label>
              <div className="p-2 border rounded-md bg-gray-50 mt-1">
                <Badge className={getStatusBadge(statusUpdateData.currentStatus)}>
                  {getStatusIcon(statusUpdateData.currentStatus)}
                  {statusUpdateData.currentStatus.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              </div>
            </div>
            
            <div>
              <Label htmlFor="new-status" className="text-sm">New Status</Label>
              <Select
                value={statusUpdateData.newStatus}
                onValueChange={(value: 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off') => 
                  setStatusUpdateData({...statusUpdateData, newStatus: value})
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                      Present
                    </div>
                  </SelectItem>
                  <SelectItem value="absent">
                    <div className="flex items-center">
                      <XCircle className="mr-2 h-4 w-4 text-red-600" />
                      Absent
                    </div>
                  </SelectItem>
                  <SelectItem value="half-day">
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                      Half Day
                    </div>
                  </SelectItem>
                  <SelectItem value="leave">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-blue-600" />
                      Leave
                    </div>
                  </SelectItem>
                  <SelectItem value="weekly-off">
                    <div className="flex items-center">
                      <CalendarDays className="mr-2 h-4 w-4 text-purple-600" />
                      Weekly Off
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status-remarks" className="text-sm">Remarks</Label>
              <Textarea
                id="status-remarks"
                value={statusUpdateData.remarks}
                onChange={(e) => setStatusUpdateData({...statusUpdateData, remarks: e.target.value})}
                placeholder="Enter reason for status update..."
                rows={3}
                className="mt-1 text-sm"
              />
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setStatusUpdateDialogOpen(false)} disabled={updatingStatus} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={submitStatusUpdate} disabled={updatingStatus} className="w-full sm:w-auto">
              {updatingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Status
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo View Modal - Mobile Responsive */}
      <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
        <DialogContent className={`${isMobileView ? 'max-w-[95vw] p-4' : 'sm:max-w-md'}`}>
          <DialogHeader>
            <DialogTitle className="text-lg">
              {selectedPhotoType === 'checkin' ? 'Check-in Photo' : 'Check-out Photo'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {selectedPhotoUrl && (
              <img
                src={selectedPhotoUrl}
                alt={`${selectedPhotoType} photo`}
                className="max-w-full h-auto rounded-lg max-h-[60vh] object-contain"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoModalOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AttendanceDetailsDialog;