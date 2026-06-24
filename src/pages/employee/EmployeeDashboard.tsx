import React, { useState, useEffect } from 'react';
import { useOutletContext } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CheckCircle2, XCircle, Play, Square, Coffee, Camera, Loader2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useRole } from "@/context/RoleContext";
import CameraCapture from "../supervisor/CameraCapture";
import { getLocation } from "@/utils/geo";
import { startLocationTracking, stopLocationTracking } from "@/utils/locationTracker";
import axios from "axios";

// ---------- API URL ----------
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

// ---------- Helper functions ----------
const formatTimeForDisplay = (timestamp: string | null): string => {
  if (!timestamp) return "-";
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatHours = (hours: number): string => `${hours.toFixed(2)} hrs`;

// ---------- Types ----------
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

// ---------- Main Component ----------
const EmployeeDashboard = () => {
  const { onMenuClick } = useOutletContext<OutletContext>();
  const { user } = useRole();

  // ----- Attendance state -----
  const [cameraOpen, setCameraOpen] = useState(false);
  const [action, setAction] = useState<'checkin' | 'checkout'>('checkin');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ----- Location tracking cleanup -----
  useEffect(() => {
    return () => stopLocationTracking();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => stopLocationTracking();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ----- Load attendance status on mount -----
  useEffect(() => {
    if (user?._id) {
      loadAttendanceStatus();
      loadAttendanceHistory();
    }
  }, [user]);

  // ----- API calls -----
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

  // ----- Handlers -----
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
    setAction('checkout');
    setCameraOpen(true);
  };

  const handlePhotoCapture = async (photoFile: File) => {
    if (!user?._id) {
      toast.error("User not logged in");
      return;
    }

    setUploadingPhoto(true);

    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const loc = await getLocation();
        latitude = loc.lat;
        longitude = loc.lng;
      } catch (locErr) {
        toast.warning("Location not available – check‑in/out continues without location");
      }

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

        if (action === 'checkin') {
          setIsCheckedIn(true);
          setHasCheckedInToday(true);
          setCheckInTime(new Date().toISOString());
          setCheckInPhoto(res.data.data?.checkInPhoto || null);
          startLocationTracking(user._id);
        } else {
          setIsCheckedIn(false);
          setHasCheckedOutToday(true);
          setCheckOutTime(new Date().toISOString());
          setCheckOutPhoto(res.data.data?.checkOutPhoto || null);
          stopLocationTracking();
        }

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
        stopLocationTracking();
        await loadAttendanceStatus();
        await loadAttendanceHistory();
      } else {
        toast.error(res.data.message || "Force check‑out failed");
      }
    } catch (error) {
      toast.error("Error during force check‑out");
    }
  };

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

  const handleRefresh = () => {
    loadAttendanceStatus();
    loadAttendanceHistory();
    toast.success("Attendance refreshed");
  };

  // ----- Render -----
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Employee Dashboard" subtitle="Welcome back!" onMenuClick={onMenuClick} />

      <div className="p-2 space-y-2">
        {/* Today's Attendance Card – compact */}
        <Card>
          <CardHeader className="p-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <CardTitle className="text-sm">Today's Attendance</CardTitle>
              <Badge
                variant={
                  hasCheckedOutToday
                    ? "default"
                    : hasCheckedInToday
                    ? "secondary"
                    : "outline"
                }
                className="text-[10px] px-1.5 h-5 ml-auto"
              >
                {hasCheckedOutToday
                  ? "Done"
                  : hasCheckedInToday
                  ? "In"
                  : "Off"}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {hasCheckedInToday
                ? `Checked in at ${formatTimeForDisplay(checkInTime)}`
                : "Start your work day"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {!hasCheckedInToday && !hasCheckedOutToday ? (
                <Button
                  onClick={handleCheckInClick}
                  className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs px-3"
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Camera className="h-3.5 w-3.5 mr-1" />}
                  Check In
                </Button>
              ) : (
                <>
                  {!isOnBreak ? (
                    <Button
                      onClick={handleBreakIn}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white h-7 text-xs px-3"
                      disabled={!isCheckedIn || isOnBreak || uploadingPhoto}
                    >
                      <Coffee className="h-3.5 w-3.5 mr-1" />
                      Break In
                    </Button>
                  ) : (
                    <Button
                      onClick={handleBreakOut}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs px-3"
                      disabled={!isOnBreak || uploadingPhoto}
                    >
                      <Play className="h-3.5 w-3.5 mr-1" />
                      Break Out
                    </Button>
                  )}
                  {!hasCheckedOutToday && (
                    <Button
                      onClick={handleCheckOutClick}
                      variant="destructive"
                      className="h-7 text-xs px-3"
                      disabled={uploadingPhoto}
                    >
                      <Square className="h-3.5 w-3.5 mr-1" />
                      Check Out
                    </Button>
                  )}
                  {hasCheckedInToday && !isCheckedIn && !hasCheckedOutToday && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleForceCheckOut}
                      className="h-7 text-xs px-2"
                    >
                      Force
                    </Button>
                  )}
                </>
              )}

              <Button onClick={handleRefresh} variant="ghost" size="sm" className="h-7 w-7 p-0 ml-auto">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Status grid – compact */}
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-1 text-[10px]">
              <div className="p-1 bg-green-50 rounded">
                <span className="text-muted-foreground">Check In</span>
                <p className="font-medium">{formatTimeForDisplay(checkInTime)}</p>
              </div>
              <div className="p-1 bg-red-50 rounded">
                <span className="text-muted-foreground">Check Out</span>
                <p className="font-medium">{formatTimeForDisplay(checkOutTime) || '-'}</p>
              </div>
              <div className="p-1 bg-blue-50 rounded">
                <span className="text-muted-foreground">Total Hours</span>
                <p className="font-medium">{formatHours(totalHours)}</p>
              </div>
              <div className="p-1 bg-purple-50 rounded">
                <span className="text-muted-foreground">Break Time</span>
                <p className="font-medium">{formatHours(breakTime)}</p>
              </div>
            </div>

            {/* Photo previews – tiny */}
            {(checkInPhoto || checkOutPhoto) && (
              <div className="mt-2 flex gap-2">
                {checkInPhoto && (
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-muted-foreground">In:</span>
                    <img src={checkInPhoto} alt="Check-in" className="h-8 w-8 object-cover rounded border" />
                  </div>
                )}
                {checkOutPhoto && (
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-muted-foreground">Out:</span>
                    <img src={checkOutPhoto} alt="Check-out" className="h-8 w-8 object-cover rounded border" />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Attendance History – compact */}
        <Card>
          <CardHeader className="p-2">
            <CardTitle className="text-xs">Recent Attendance</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            {loadingHistory ? (
              <div className="text-center py-2">
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              </div>
            ) : attendanceRecords.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">No records found.</p>
            ) : (
              <div className="space-y-0.5">
                {attendanceRecords.slice(0, 5).map((rec, index) => (
                  <div key={rec._id || index} className="flex justify-between text-[10px] border-b pb-0.5">
                    <span>{rec.date}</span>
                    <Badge variant={rec.status === 'present' ? 'default' : 'secondary'} className="text-[9px] px-1 h-4">
                      {rec.status}
                    </Badge>
                    <span>{formatHours(rec.totalHours || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats / Tasks (original content) – compact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Recent Tasks Section */}
          <Card>
            <CardHeader className="p-2">
              <CardTitle className="text-xs">Recent Tasks</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="space-y-1">
                <div className="flex items-center justify-between p-1.5 bg-gray-50 dark:bg-gray-800 rounded text-[10px]">
                  <span>Task #1</span>
                  <Badge variant="outline" className="text-[9px] px-1 h-4 bg-yellow-100 text-yellow-800">
                    Pending
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-gray-50 dark:bg-gray-800 rounded text-[10px]">
                  <span>Task #2</span>
                  <Badge variant="default" className="text-[9px] px-1 h-4 bg-green-100 text-green-800">
                    Completed
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Overview */}
          <Card>
            <CardHeader className="p-2">
              <CardTitle className="text-xs">Performance Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0 space-y-2">
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                  <span>Task Completion</span>
                  <span>87%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '87%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                  <span>On-time Delivery</span>
                  <span>92%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
      />
    </div>
  );
};

export default EmployeeDashboard;