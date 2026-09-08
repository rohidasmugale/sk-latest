import SuperAdminDashboard from "../superadmin/SuperAdminDashboard";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Coffee, Timer, RefreshCw, Upload } from "lucide-react";
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
  const [cameraAction, setCameraAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const loadMyAttendanceStatus = async () => {
    const userId = getCurrentAdminId();
    if (!userId) return;

    try {
      const response = await axios.get(`${API_URL}/attendance/status/${userId}`);
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
    loadMyAttendanceStatus();
  }, []);

  const handleAttendanceCamera = () => {
    setCameraAction('recognize');
    setCameraOpen(true);
  };

  const handlePhotoCapture = async (photoFile) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('supervisorId', getCurrentAdminId() || '');
      formData.append('siteName', '');

      const response = await axios.post(`${API_URL}/attendance/auto-attendance`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 15000,
      });

      if (response.data.success) {
        const { employeeName, action, alreadyCheckedIn } = response.data.data;
        if (alreadyCheckedIn) {
          toast.info(`${employeeName} already checked in`);
        } else {
          toast.success(`${employeeName} ${action === 'checkin' ? 'checked in' : 'checked out'}!`);
          loadMyAttendanceStatus();
        }
      } else {
        toast.error(response.data.message || 'Attendance failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process attendance');
    } finally {
      setLoading(false);
      setCameraOpen(false);
      setCameraAction(null);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoCapture(file);
    }
    e.target.value = "";
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
      const userId = getCurrentAdminId();
      await axios.post(`${API_URL}/attendance/breakin`, { employeeId: userId });
      setAttendance({
        ...attendance,
        isOnBreak: true,
        breakStartTime: new Date().toISOString(),
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
      const userId = getCurrentAdminId();
      await axios.post(`${API_URL}/attendance/breakout`, { employeeId: userId });
      setAttendance({
        ...attendance,
        isOnBreak: false,
        breakEndTime: new Date().toISOString(),
      });
      toast.success("Break ended");
      loadMyAttendanceStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to end break");
    }
  };

  return (
    <>
      {/* Admin Self-Attendance Bar */}
      <div className="px-3 sm:px-4 mt-2 flex flex-wrap items-center gap-2">
        <Button
          onClick={handleAttendanceCamera}
          variant="default"
          size="sm"
          className="flex items-center gap-1"
          disabled={loading}
        >
          <Camera className="h-4 w-4" />
          {loading ? 'Processing...' : 'Attendance'}
        </Button>

        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
        >
          <Upload className="h-4 w-4" /> Upload Photo
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          className="hidden"
        />

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

      {/* SuperAdmin Dashboard */}
      <SuperAdminDashboard title="Admin Dashboard" />

      {/* Camera Capture Modal */}
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