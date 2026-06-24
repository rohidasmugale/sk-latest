import { useOutletContext } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CheckCircle2, XCircle, Play, Square, Coffee, Camera, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRole } from "@/context/RoleContext";
import CameraCapture from "../supervisor/CameraCapture";
import { getLocation } from "@/utils/geo";                    // ✅ NEW: shared geo utility
import { startLocationTracking, stopLocationTracking } from "@/utils/locationTracker"; // ✅ NEW: shared tracker
import axios from "axios";

// API URL
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

// Types
interface AttendanceRecord {
  _id: string;
  employeeId: string;
  date: string;
  status: 'present' | 'absent' | 'half-day' | 'leave' | 'weekly-off';
  checkInTime?: string;
  checkOutTime?: string;
  checkInPhoto?: string;
  checkOutPhoto?: string;
  totalHours?: number;
}

interface OutletContext {
  onMenuClick: () => void;
}

// Helper: format time for display
const formatTimeForDisplay = (timestamp: string | null): string => {
  if (!timestamp) return "-";
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

// Helper: format hours
const formatHours = (hours: number): string => `${hours.toFixed(2)} hrs`;

const EmployeeAttendance = () => {
  const { onMenuClick } = useOutletContext<OutletContext>();
  const { user } = useRole(); // logged‑in employee data

  // Camera & action states
  const [cameraOpen, setCameraOpen] = useState(false);
  const [action, setAction] = useState<'checkin' | 'checkout'>('checkin');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Attendance status (derived from API/local)
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [checkInPhoto, setCheckInPhoto] = useState<string | null>(null);
  const [checkOutPhoto, setCheckOutPhoto] = useState<string | null>(null);
  const [totalHours, setTotalHours] = useState(0);
  const [breakStartTime, setBreakStartTime] = useState<string | null>(null);
  const [breakEndTime, setBreakEndTime] = useState<string | null>(null);
  const [breakTime, setBreakTime] = useState(0);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [hasCheckedOutToday, setHasCheckedOutToday] = useState(false);

  // Attendance history
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Current date
  const today = new Date().toISOString().split('T')[0];

  // Location tracking cleanup
  // Location tracking cleanup
useEffect(() => {
  // Stop on component unmount (navigation away)
  return () => stopLocationTracking();
}, []);

// ✅ Stop tracking when browser tab is closed
useEffect(() => {
  const handleBeforeUnload = () => {
    stopLocationTracking();
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, []);
  // Load attendance status from API on mount
  useEffect(() => {
    if (user?._id) {
      loadAttendanceStatus();
      loadAttendanceHistory();
    }
  }, [user]);

  // Load today's status from API
  const loadAttendanceStatus = async () => {
    if (!user?._id) return;
    try {
      const res = await axios.get(`${API_URL}/attendance/status/${user._id}`);
      if (res.data.success && res.data.data) {
        const data = res.data.data;
        const lastCheckInDate = data.lastCheckInDate
          ? new Date(data.lastCheckInDate).toDateString()
          : null;
        const todayStr = new Date().toDateString();

        setHasCheckedInToday(lastCheckInDate === todayStr);
        setHasCheckedOutToday(
          data.checkOutTime && new Date(data.checkOutTime).toDateString() === todayStr
        );
        setIsCheckedIn(data.isCheckedIn || false);
        setIsOnBreak(data.isOnBreak || false);
        setCheckInTime(data.checkInTime || null);
        setCheckOutTime(data.checkOutTime || null);
        setCheckInPhoto(data.checkInPhoto || null);
        setCheckOutPhoto(data.checkOutPhoto || null);
        setTotalHours(Number(data.totalHours) || 0);
        setBreakStartTime(data.breakStartTime || null);
        setBreakEndTime(data.breakEndTime || null);
        setBreakTime(Number(data.breakTime) || 0);
      }
    } catch (error) {
      console.error("Failed to load attendance status:", error);
    }
  };

  // Load attendance history (last 7 days)
  const loadAttendanceHistory = async () => {
    if (!user?._id) return;
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_URL}/attendance/history`, {
        params: { employeeId: user._id, limit: 7 },
      });
      if (res.data.success) {
        setAttendanceRecords(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load attendance history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ----- Camera handlers -----
  const handleCheckInClick = () => {
    if (hasCheckedOutToday) {
      toast.error("You have already checked out today.");
      return;
    }
    if (isCheckedIn) {
      toast.error("You are already checked in.");
      return;
    }
    setAction('checkin');
    setCameraOpen(true);
  };

  const handleCheckOutClick = () => {
    if (hasCheckedOutToday) {
      toast.error("You have already checked out today.");
      return;
    }
    if (!hasCheckedInToday) {
      toast.error("You haven't checked in today.");
      return;
    }
    if (!isCheckedIn) {
      toast.warning("You are not currently checked in, but you checked in earlier. Use force check-out?");
      // optionally add a force check-out button
    }
    setAction('checkout');
    setCameraOpen(true);
  };

  // Photo capture callback (shared for check‑in & check‑out)
  const handlePhotoCapture = async (photoFile: File) => {
    if (!user?._id) {
      toast.error("User not logged in");
      return;
    }

    setUploadingPhoto(true);

    try {
      // 1. Capture location
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const loc = await getLocation();
        latitude = loc.lat;
        longitude = loc.lng;
      } catch (locErr) {
        toast.warning("Location not available – check‑in/out continues without location");
      }

      // 2. Build FormData
      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('employeeId', user._id);
      formData.append('employeeName', user.name || 'Employee');
      if (latitude !== undefined && longitude !== undefined) {
        formData.append('latitude', String(latitude));
        formData.append('longitude', String(longitude));
      }

      const endpoint =
        action === 'checkin'
          ? `${API_URL}/attendance/checkin-with-photo`
          : `${API_URL}/attendance/checkout-with-photo`;

      const res = await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        toast.success(`Successfully ${action === 'checkin' ? 'checked in' : 'checked out'}`);

        // Update local state
        if (action === 'checkin') {
          setIsCheckedIn(true);
          setHasCheckedInToday(true);
          setCheckInTime(new Date().toISOString());
          setCheckInPhoto(res.data.data?.checkInPhoto || null);
          // ✅ Start location tracking for this employee
          startLocationTracking(user._id);
        } else {
          setIsCheckedIn(false);
          setHasCheckedOutToday(true);
          setCheckOutTime(new Date().toISOString());
          setCheckOutPhoto(res.data.data?.checkOutPhoto || null);
          // ✅ Stop location tracking on check‑out
          stopLocationTracking();
        }

        // Reload status & history
        await loadAttendanceStatus();
        await loadAttendanceHistory();
      } else {
        toast.error(res.data.message || 'Action failed');
      }
    } catch (error: any) {
      console.error("Attendance action error:", error);
      toast.error(error.response?.data?.message || 'Error processing check‑in/out');
    } finally {
      setUploadingPhoto(false);
      setCameraOpen(false);
    }
  };

  // Force check‑out (without photo – for edge cases)
  const handleForceCheckOut = async () => {
    if (!user?._id) return;
    try {
      const res = await axios.post(`${API_URL}/attendance/checkout`, {
        employeeId: user._id,
        employeeName: user.name,
      });
      if (res.data.success) {
        toast.success("Force checked out successfully");
        setIsCheckedIn(false);
        setHasCheckedOutToday(true);
        setCheckOutTime(new Date().toISOString());
        stopLocationTracking(); // ✅ stop tracking
        await loadAttendanceStatus();
        await loadAttendanceHistory();
      } else {
        toast.error(res.data.message || "Force check‑out failed");
      }
    } catch (error) {
      toast.error("Error during force check‑out");
    }
  };

  // Break handlers (no photo)
  const handleBreakIn = async () => {
    if (!isCheckedIn) {
      toast.error("You need to be checked in first.");
      return;
    }
    if (isOnBreak) {
      toast.error("Already on break.");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/attendance/breakin`, {
        employeeId: user._id,
      });
      if (res.data.success) {
        toast.success("Break started");
        setIsOnBreak(true);
        setBreakStartTime(new Date().toISOString());
        await loadAttendanceStatus();
      } else {
        toast.error(res.data.message || "Failed to start break");
      }
    } catch (error) {
      toast.error("Error starting break");
    }
  };

  const handleBreakOut = async () => {
    if (!isOnBreak) {
      toast.error("You are not on break.");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/attendance/breakout`, {
        employeeId: user._id,
      });
      if (res.data.success) {
        toast.success("Break ended");
        setIsOnBreak(false);
        setBreakEndTime(new Date().toISOString());
        await loadAttendanceStatus();
      } else {
        toast.error(res.data.message || "Failed to end break");
      }
    } catch (error) {
      toast.error("Error ending break");
    }
  };

  // Stats for today
  const summary = {
    totalEmployees: 1, // only the employee themselves
    present: hasCheckedInToday ? 1 : 0,
    absent: !hasCheckedInToday ? 1 : 0,
    weeklyOff: 0,
    halfDay: 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Attendance" subtitle="Check in/out and manage your breaks" onMenuClick={onMenuClick} />

      <div className="p-6 space-y-6">
        {/* Today's Attendance Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle>Today's Attendance</CardTitle>
              <Badge
                variant={
                  hasCheckedOutToday
                    ? "default"
                    : hasCheckedInToday
                      ? "secondary"
                      : "outline"
                }
                className="ml-auto"
              >
                {hasCheckedOutToday
                  ? "Completed"
                  : hasCheckedInToday
                    ? "In Progress"
                    : "Not Started"}
              </Badge>
            </div>
            <CardDescription>
              {hasCheckedInToday
                ? `Checked in at ${formatTimeForDisplay(checkInTime)}`
                : "Start your work day by checking in"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {!hasCheckedInToday && !hasCheckedOutToday ? (
                <Button
                  onClick={handleCheckInClick}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
                  size="lg"
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5 mr-2" />
                  )}
                  Check In
                </Button>
              ) : (
                <>
                  {!isOnBreak ? (
                    <Button
                      onClick={handleBreakIn}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-6 text-lg"
                      size="lg"
                      disabled={!isCheckedIn || isOnBreak || uploadingPhoto}
                    >
                      <Coffee className="h-5 w-5 mr-2" />
                      Start Break
                    </Button>
                  ) : (
                    <Button
                      onClick={handleBreakOut}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
                      size="lg"
                      disabled={!isOnBreak || uploadingPhoto}
                    >
                      <Play className="h-5 w-5 mr-2" />
                      End Break
                    </Button>
                  )}
                  {!hasCheckedOutToday && (
                    <Button
                      onClick={handleCheckOutClick}
                      variant="destructive"
                      className="px-8 py-6 text-lg"
                      size="lg"
                      disabled={uploadingPhoto}
                    >
                      <Square className="h-5 w-5 mr-2" />
                      Check Out
                    </Button>
                  )}
                  {hasCheckedInToday && !isCheckedIn && !hasCheckedOutToday && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleForceCheckOut}
                      className="text-xs"
                    >
                      Force Check Out
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Status info */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="p-2 bg-green-50 rounded">
                <span className="text-muted-foreground">Check In</span>
                <p className="font-medium">{formatTimeForDisplay(checkInTime)}</p>
              </div>
              <div className="p-2 bg-red-50 rounded">
                <span className="text-muted-foreground">Check Out</span>
                <p className="font-medium">{formatTimeForDisplay(checkOutTime) || '-'}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded">
                <span className="text-muted-foreground">Total Hours</span>
                <p className="font-medium">{formatHours(totalHours)}</p>
              </div>
              <div className="p-2 bg-purple-50 rounded">
                <span className="text-muted-foreground">Break Time</span>
                <p className="font-medium">{formatHours(breakTime)}</p>
              </div>
            </div>

            {/* Photo previews */}
            {checkInPhoto && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Check‑in photo:</span>
                <img src={checkInPhoto} alt="Check-in" className="h-12 w-12 object-cover rounded border" />
              </div>
            )}
            {checkOutPhoto && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Check‑out photo:</span>
                <img src={checkOutPhoto} alt="Check-out" className="h-12 w-12 object-cover rounded border" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance History Card (compact) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </div>
            ) : attendanceRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No records found.</p>
            ) : (
              <div className="space-y-1">
                {attendanceRecords.slice(0, 5).map((rec, index) => (
                  <div key={rec._id || index} className="flex justify-between text-xs border-b pb-1">
                    <span>{rec.date}</span>
                    <Badge variant={rec.status === 'present' ? 'default' : 'secondary'}>
                      {rec.status}
                    </Badge>
                    <span>{formatHours(rec.totalHours || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Camera Capture Dialog */}
      <CameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handlePhotoCapture}
        title={action === 'checkin' ? 'Check In' : 'Check Out'}
        description={action === 'checkin' ? 'Take a selfie to check in' : 'Take a photo to check out'}
        actionLabel={action === 'checkin' ? 'Confirm Check In' : 'Confirm Check Out'}
        continuous={false}
      // loading prop removed
      />
    </div>
  );
};

export default EmployeeAttendance;