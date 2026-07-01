// routes/attendanceRoutes.ts
import express from 'express';
import {
  checkIn,
  checkOut,
  checkInWithPhoto,
  checkOutWithPhoto,
  breakIn,
  breakOut,
  getTodayStatus,
  getAttendanceHistory,
  getTeamAttendance,
  getAllAttendance,
  updateAttendance,
  getWeeklySummary,
  manualAttendance,
  updateAttendanceStatus,
  upload,
  faceRecognize,
  registerFace ,
  getGeofenceBreaches,updateEmployeeLocation,autoAttendance,
} from '../controllers/attendanceController';

const router = express.Router();

// Check in/out routes
router.post('/checkin', checkIn);
router.post('/checkout', checkOut);

// Check in/out with photo routes
router.post('/checkin-with-photo', upload.single('photo'), checkInWithPhoto);
router.post('/checkout-with-photo', upload.single('photo'), checkOutWithPhoto);

// Break routes
router.post('/breakin', breakIn);
router.post('/breakout', breakOut);

// Get attendance data
router.get('/status/:employeeId', getTodayStatus);
router.get('/history', getAttendanceHistory);
router.get('/team', getTeamAttendance);
router.get('/', getAllAttendance);
router.post('/face-recognize', upload.single('photo'), faceRecognize);
router.post('/register-face/:employeeId', upload.single('photo'), registerFace);
// Update attendance (admin/supervisor)
router.put('/:id', updateAttendance);

// ✅ FIX: Add this DEBUG route to see what's happening
router.get('/auto-attendance', (req, res) => {
  console.log('⚠️ GET /auto-attendance called!');
  console.log('⚠️ This endpoint requires POST, but received GET');
  console.log('⚠️ Query params:', req.query);
  console.log('⚠️ Headers:', req.headers);
  
  res.status(405).json({
    success: false,
    message: 'Method not allowed. This endpoint requires POST, but received GET.',
    requiredMethod: 'POST',
    receivedMethod: 'GET',
    suggestion: 'Please use POST method with multipart/form-data containing a "photo" field'
  });
});


// Add this right before your POST route
router.all('/auto-attendance', (req, res, next) => {
  console.log('🔍 ===== AUTO-ATTENDANCE REQUEST =====');
  console.log('🔍 Method:', req.method);
  console.log('🔍 URL:', req.url);
  console.log('🔍 Headers:', JSON.stringify(req.headers));
  console.log('🔍 Body:', req.body);
  
  if (req.method === 'GET') {
    console.log('⚠️ GET request received - sending 405');
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Please use POST.',
      receivedMethod: 'GET',
      requiredMethod: 'POST',
      fix: 'Change your frontend to use POST method'
    });
  }
  next();
});

// ✅ MAIN ROUTE - POST for auto-attendance
router.post('/auto-attendance', upload.single('photo'), autoAttendance);

// Update attendance status (admin/supervisor)
router.post('/update-status', updateAttendanceStatus);

// Geofencing routes
router.post('/update-location', updateEmployeeLocation);
router.get('/geofence-breaches', getGeofenceBreaches);
// Manual attendance entry
router.post('/manual', manualAttendance);
router.get('/weekly-summary', getWeeklySummary);
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Attendance router works' });
});

export default router;