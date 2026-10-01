import SuperAdminDashboard from "../superadmin/SuperAdminDashboard";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Coffee, Timer } from "lucide-react";
import CameraCapture from "../supervisor/CameraCapture";

const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

const AdminDashboard = () => {
  const [attendance, setAttendance] = useState({
    isCheckedIn: false,
    isOnBreak: false,
    checkInTime: null,
    checkOutTime: null,
    totalHours: 0,
    breakTime: 0,
    hasCheckedInToday: false,
    hasCheckedOutToday: false,
  });
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [myEmployeeRecord, setMyEmployeeRecord] = useState<any>(null);

  const getCurrentAdminId = () => {
    const stored = localStorage.getItem("sk_user");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        return user._id || user.id;
      } catch {
        return null;
      }
    }
    return null;
  };

  const getCurrentAdminName = () => {
    const stored = localStorage.getItem("sk_user");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        return user.name || user.firstName || "Admin";
      } catch {
        return "Admin";
      }
    }
    return "Admin";
  };

  const fetchMyEmployeeRecord = async () => {
    try {
      const stored = localStorage.getItem("sk_user");
      const me = stored ? JSON.parse(stored) : null;
      if (!me?._id) return;

      const response = await axios.get(`${API_URL}/employees`, {
        params: { userId: me._id, limit: 1 }
      });

      let employeesData = [];
      if (response.data) {
        if (Array.isArray(response.data)) employeesData = response.data;
        else if (response.data.success && Array.isArray(response.data.data)) employeesData = response.data.data;
      }

      if (employeesData.length > 0) {
        setMyEmployeeRecord(employeesData[0]);
      } else {
        console.warn('⚠️ No Employee record linked to this User (userId):', me._id);
      }
    } catch (error) {
      console.error('Failed to fetch my employee record:', error);
    }
  };

  const loadMyAttendanceStatus = async () => {
    const empId = myEmployeeRecord?.employeeId || myEmployeeRecord?._id;
    if (!empId) return;

    try {
      const response = await axios.get(`${API_URL}/attendance/status/${empId}`);
      if (response.data.success && response.data.data) {
        const api = response.data.data;
        const today = new Date().toDateString();
        const lastCheckInDate = api.lastCheckInDate ? new Date(api.lastCheckInDate).toDateString() : null;

        setAttendance({
          isCheckedIn: api.isCheckedIn || false,
          isOnBreak: api.isOnBreak || false,
          checkInTime: api.checkInTime || null,
          checkOutTime: api.checkOutTime || null,
          totalHours: Number(api.totalHours) || 0,
          breakTime: Number(api.breakTime) || 0,
          hasCheckedInToday: lastCheckInDate === today,
          hasCheckedOutToday: api.checkOutTime && new Date(api.checkOutTime).toDateString() === today,
        });
      }
    } catch (error) {
      console.error("Failed to load admin attendance:", error);
    }
  };

  useEffect(() => {
    fetchMyEmployeeRecord();
  }, []);

  useEffect(() => {
    if (myEmployeeRecord) {
      loadMyAttendanceStatus();
    }
  }, [myEmployeeRecord]);

  const handleAttendanceCamera = () => {
    setCameraOpen(true);
  };

  const handlePhotoCapture = async (photoFile) => {
    setLoading(true);
    try {
      if (!myEmployeeRecord) {
        toast.error("Your employee record wasn't found. Contact superadmin to link your account.");
        setLoading(false);
        setCameraOpen(false);
        return;
      }

      const isCheckingOut = attendance.hasCheckedInToday && !attendance.hasCheckedOutToday;
      const endpoint = isCheckingOut
        ? `${API_URL}/attendance/checkout-with-photo`
        : `${API_URL}/attendance/checkin-with-photo`;

      const empId = myEmployeeRecord.employeeId || myEmployeeRecord._id;
      const empName = myEmployeeRecord.name || "Admin";
      const empSite = myEmployeeRecord.siteName || myEmployeeRecord.site || '';

      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('employeeId', empId);
      formData.append('employeeName', empName);
      formData.append('siteName', empSite);

      const response = await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 15000,
      });

      if (response.data.success) {
        toast.success(isCheckingOut ? 'Checked out successfully!' : 'Checked in successfully!');
        loadMyAttendanceStatus();
      } else {
        toast.error(response.data.message || 'Attendance failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process attendance');
    } finally {
      setLoading(false);
      setCameraOpen(false);
    }
  };

  const handleBreakIn = async () => {
    if (!attendance.isCheckedIn) {
      toast.error("Please check in first");
      return;
    }
    if (attendance.isOnBreak) {
      toast.error("Already on break");
      return;
    }

    try {
      const empId = myEmployeeRecord?.employeeId || myEmployeeRecord?._id;
      await axios.post(`${API_URL}/attendance/breakin`, { employeeId: empId });
      setAttendance({
        ...attendance,
        isOnBreak: true,
      });
      toast.success("Break started");
      loadMyAttendanceStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start break");
    }
  };

  const handleBreakOut = async () => {
    if (!attendance.isOnBreak) {
      toast.error("Not on break");
      return;
    }

    try {
      const empId = myEmployeeRecord?.employeeId || myEmployeeRecord?._id;
      await axios.post(`${API_URL}/attendance/breakout`, { employeeId: empId });
      setAttendance({
        ...attendance,
        isOnBreak: false,
      });
      toast.success("Break ended");
      loadMyAttendanceStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to end break");
    }
  };

  const attendanceBar = (
    <div className="px-3 sm:px-4 mt-2 flex flex-wrap items-center gap-2">
      <Button
        onClick={handleAttendanceCamera}
        variant="default"
        size="sm"
        className="flex items-center gap-1"
        disabled={loading}
      >
        <Camera className="h-4 w-4" />
        {loading
          ? 'Processing...'
          : attendance.hasCheckedInToday && !attendance.hasCheckedOutToday
            ? 'Check Out'
            : 'Check In'}
      </Button>

      <Button
        onClick={handleBreakIn}
        disabled={!attendance.isCheckedIn || attendance.isOnBreak}
        variant="outline"
        size="sm"
      >
        <Coffee className="h-4 w-4 mr-1" /> Break In
      </Button>

      <Button
        onClick={handleBreakOut}
        disabled={!attendance.isOnBreak}
        variant="outline"
        size="sm"
      >
        <Timer className="h-4 w-4 mr-1" /> Break Out
      </Button>

      <div className="flex items-center gap-2 ml-auto sm:ml-0">
        <Badge
          variant={attendance.hasCheckedOutToday ? "default" : attendance.hasCheckedInToday ? "secondary" : "outline"}
          className="text-xs"
        >
          {attendance.hasCheckedOutToday ? "Completed" : attendance.hasCheckedInToday ? "In Progress" : "Not Started"}
        </Badge>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Hours: {attendance.totalHours.toFixed(1)}h
        </span>
      </div>
    </div>
  );

  return (
    <>
      <SuperAdminDashboard title="Admin Dashboard" headerExtra={attendanceBar} />

      <CameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handlePhotoCapture}
        title="Admin Attendance"
        actionLabel="Confirm"
      />
    </>
  );
};

export default AdminDashboard;