import axios from 'axios';

export class AttendanceService {

// Add this function to apiService object
async fetchSiteWiseAttendanceCount(startDate: string, endDate: string) {
  try {
    const response = await axios.get('/attendance', {
      params: { 
        startDate, 
        endDate, 
        limit: 1000,
        sortBy: 'date',
        sortOrder: 'desc'
      }
    });
    
    const attendanceRecords = response.data.data || response.data || [];
    
    if (attendanceRecords.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    // Group by site
    const siteMap = new Map();
    const dateSet = new Set(); // Track unique dates for rate calculation
    
    attendanceRecords.forEach((record: any) => {
      const siteName = record.siteName || record.site || record.department || 'Unknown Site';
      const siteId = (record.siteId || siteName).toString().replace(/\s+/g, '-').toLowerCase();
      const employeeId = record.employeeId || record.employee?._id || record.employee;
      const date = record.date;
      const status = record.status?.toLowerCase() || 'absent';
      
      if (date) dateSet.add(date);
      
      if (!siteMap.has(siteId)) {
        siteMap.set(siteId, {
          siteId,
          siteName,
          totalEmployees: new Set(),
          present: 0,
          absent: 0,
          halfDay: 0,
          leave: 0,
          shortage: 0,
          dates: new Set()
        });
      }
      
      const siteData = siteMap.get(siteId);
      
      // Add employee to site
      if (employeeId) {
        siteData.totalEmployees.add(employeeId);
      }
      
      // Add date
      if (date) {
        siteData.dates.add(date);
      }
      
      // Count status
      switch (status) {
        case 'present':
          siteData.present++;
          break;
        case 'absent':
          siteData.absent++;
          siteData.shortage++;
          break;
        case 'half-day':
        case 'halfday':
        case 'half_day':
          siteData.halfDay++;
          siteData.shortage += 0.5;
          break;
        case 'leave':
          siteData.leave++;
          break;
        default:
          siteData.absent++;
          siteData.shortage++;
      }
    });
    
    // Convert to array with calculated rates
    const sites = Array.from(siteMap.values()).map(site => {
      const totalEmployeesCount = site.totalEmployees.size;
      const totalDays = site.dates.size || dateSet.size || 1;
      const presentTotal = site.present + (site.halfDay * 0.5);
      const attendanceRate = totalEmployeesCount > 0 && totalDays > 0
        ? Math.round((presentTotal / (totalEmployeesCount * totalDays)) * 100)
        : 0;
      
      return {
        ...site,
        totalEmployees: totalEmployeesCount,
        attendanceRate,
        lastUpdated: new Date().toISOString()
      };
    });
    
    return {
      success: true,
      data: sites
    };
  } catch (error: any) {
    console.error('Error fetching site-wise attendance count:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch site-wise attendance data');
  }
}

  
  // Get all sites attendance summary
  static async getAllSitesSummary(startDate: string, endDate: string) {
    // Get all attendance records for the date range
    const attendanceRecords = await Attendance.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    // Group by site/department
    const siteMap = new Map();
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalEmployees = 0;
    let totalWeeklyOff = 0;

    attendanceRecords.forEach(record => {
      const siteId = record.department || 'General'; // Using department as site for now
      
      if (!siteMap.has(siteId)) {
        siteMap.set(siteId, {
          siteId,
          siteName: siteId,
          totalEmployees: 0,
          present: 0,
          absent: 0,
          weeklyOff: 0,
          shortage: 0
        });
      }

      const siteData = siteMap.get(siteId);
      siteData.totalEmployees++;
      totalEmployees++;

      switch (record.status) {
        case 'present':
          siteData.present++;
          totalPresent++;
          break;
        case 'absent':
          siteData.absent++;
          totalAbsent++;
          siteData.shortage++;
          break;
        case 'half-day':
          siteData.present += 0.5;
          siteData.absent += 0.5;
          totalPresent += 0.5;
          totalAbsent += 0.5;
          siteData.shortage += 0.5;
          break;
        case 'leave':
          siteData.weeklyOff++;
          totalWeeklyOff++;
          break;
      }
    });

    // Calculate attendance rates
    const sites = Array.from(siteMap.values()).map(site => ({
      ...site,
      attendanceRate: site.totalEmployees > 0 
        ? Math.round((site.present / site.totalEmployees) * 100) 
        : 0,
      lastUpdated: new Date().toISOString()
    }));

    return {
      totalSites: sites.length,
      totalEmployees,
      totalPresent: Math.round(totalPresent),
      totalAbsent: Math.round(totalAbsent),
      totalWeeklyOff,
      overallAttendanceRate: totalEmployees > 0 
        ? Math.round((totalPresent / totalEmployees) * 100) 
        : 0,
      averageDailyShortage: Math.round(totalAbsent / sites.length),
      sites
    };
  }

  // Get site attendance details
  static async getSiteAttendanceDetails(siteId: string, startDate: string, endDate: string) {
    const attendanceRecords = await Attendance.find({
      department: siteId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 });

    // Group by date
    const dateMap = new Map();
    const summary = {
      totalDays: 0,
      totalPresent: 0,
      totalAbsent: 0,
      totalShortage: 0,
      maxAttendanceDate: '',
      minAttendanceDate: ''
    };

    attendanceRecords.forEach(record => {
      const date = record.date;
      
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          siteName: siteId,
          totalEmployees: 0,
          present: 0,
          absent: 0,
          weeklyOff: 0,
          shortage: 0
        });
        summary.totalDays++;
      }

      const dayData = dateMap.get(date);
      dayData.totalEmployees++;
      
      switch (record.status) {
        case 'present':
          dayData.present++;
          summary.totalPresent++;
          break;
        case 'absent':
          dayData.absent++;
          dayData.shortage++;
          summary.totalAbsent++;
          summary.totalShortage++;
          break;
        case 'half-day':
          dayData.present += 0.5;
          dayData.absent += 0.5;
          dayData.shortage += 0.5;
          summary.totalPresent += 0.5;
          summary.totalAbsent += 0.5;
          summary.totalShortage += 0.5;
          break;
        case 'leave':
          dayData.weeklyOff++;
          break;
      }
    });

    // Calculate rates and find max/min dates
    const dailyStats = Array.from(dateMap.values()).map(day => ({
      ...day,
      attendanceRate: day.totalEmployees > 0 
        ? Math.round((day.present / day.totalEmployees) * 100) 
        : 0
    }));

    // Find max and min attendance dates
    if (dailyStats.length > 0) {
      const sortedByRate = [...dailyStats].sort((a, b) => b.attendanceRate - a.attendanceRate);
      summary.maxAttendanceDate = sortedByRate[0].date;
      summary.minAttendanceDate = sortedByRate[sortedByRate.length - 1].date;
      summary.averageAttendanceRate = Math.round(
        dailyStats.reduce((sum, day) => sum + day.attendanceRate, 0) / dailyStats.length
      );
    }

    return {
      siteId,
      siteName: siteId,
      dailyStats,
      summary
    };
  }

  // Get department attendance summary
  static async getDepartmentAttendanceSummary(departmentId: string, startDate: string, endDate: string) {
    const attendanceRecords = await Attendance.find({
      department: departmentId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    // Group by employee/site
    const employeeMap = new Map();
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalEmployees = 0;
    let totalShortage = 0;

    attendanceRecords.forEach(record => {
      const employeeKey = record.employeeId;
      
      if (!employeeMap.has(employeeKey)) {
        employeeMap.set(employeeKey, {
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          totalDays: 0,
          presentDays: 0,
          absentDays: 0
        });
        totalEmployees++;
      }

      const employeeData = employeeMap.get(employeeKey);
      employeeData.totalDays++;

      switch (record.status) {
        case 'present':
          employeeData.presentDays++;
          totalPresent++;
          break;
        case 'absent':
          employeeData.absentDays++;
          totalAbsent++;
          totalShortage++;
          break;
        case 'half-day':
          employeeData.presentDays += 0.5;
          employeeData.absentDays += 0.5;
          totalPresent += 0.5;
          totalAbsent += 0.5;
          totalShortage += 0.5;
          break;
      }
    });

    const overallAttendanceRate = totalEmployees > 0 
      ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 100) 
      : 0;

    return {
      departmentId,
      departmentName: departmentId,
      totalSites: Math.ceil(totalEmployees / 10), // Estimate based on employees
      totalEmployees,
      totalPresent: Math.round(totalPresent),
      totalAbsent: Math.round(totalAbsent),
      overallAttendanceRate,
      totalShortage: Math.round(totalShortage),
      employees: Array.from(employeeMap.values())
    };
  }

  // Get employee details for a site
  static async getEmployeeDetails(siteId: string, startDate: string, endDate: string) {
    const attendanceRecords = await Attendance.find({
      department: siteId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: -1 });

    const employees = attendanceRecords.map(record => ({
      id: record._id.toString(),
      name: record.employeeName,
      employeeId: record.employeeId,
      department: record.department,
      position: 'Staff', // You might want to add position field to your model
      status: record.status,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      siteId: record.department,
      siteName: record.department,
      date: record.date,
      totalHours: record.totalHours,
      breakTime: record.breakTime
    }));

    return {
      siteId,
      siteName: siteId,
      startDate,
      endDate,
      employees
    };
  }
}// services/AttendanceService.ts
import Attendance from '../models/Attendance';

export class AttendanceService {

// Add this function to apiService object
async fetchSiteWiseAttendanceCount(startDate: string, endDate: string) {
  try {
    const response = await axios.get('/attendance', {
      params: { 
        startDate, 
        endDate, 
        limit: 1000,
        sortBy: 'date',
        sortOrder: 'desc'
      }
    });
    
    const attendanceRecords = response.data.data || response.data || [];
    
    if (attendanceRecords.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    // Group by site
    const siteMap = new Map();
    const dateSet = new Set(); // Track unique dates for rate calculation
    
    attendanceRecords.forEach((record: any) => {
      const siteName = record.siteName || record.site || record.department || 'Unknown Site';
      const siteId = (record.siteId || siteName).toString().replace(/\s+/g, '-').toLowerCase();
      const employeeId = record.employeeId || record.employee?._id || record.employee;
      const date = record.date;
      const status = record.status?.toLowerCase() || 'absent';
      
      if (date) dateSet.add(date);
      
      if (!siteMap.has(siteId)) {
        siteMap.set(siteId, {
          siteId,
          siteName,
          totalEmployees: new Set(),
          present: 0,
          absent: 0,
          halfDay: 0,
          leave: 0,
          shortage: 0,
          dates: new Set()
        });
      }
      
      const siteData = siteMap.get(siteId);
      
      // Add employee to site
      if (employeeId) {
        siteData.totalEmployees.add(employeeId);
      }
      
      // Add date
      if (date) {
        siteData.dates.add(date);
      }
      
      // Count status
      switch (status) {
        case 'present':
          siteData.present++;
          break;
        case 'absent':
          siteData.absent++;
          siteData.shortage++;
          break;
        case 'half-day':
        case 'halfday':
        case 'half_day':
          siteData.halfDay++;
          siteData.shortage += 0.5;
          break;
        case 'leave':
          siteData.leave++;
          break;
        default:
          siteData.absent++;
          siteData.shortage++;
      }
    });
    
    // Convert to array with calculated rates
    const sites = Array.from(siteMap.values()).map(site => {
      const totalEmployeesCount = site.totalEmployees.size;
      const totalDays = site.dates.size || dateSet.size || 1;
      const presentTotal = site.present + (site.halfDay * 0.5);
      const attendanceRate = totalEmployeesCount > 0 && totalDays > 0
        ? Math.round((presentTotal / (totalEmployeesCount * totalDays)) * 100)
        : 0;
      
      return {
        ...site,
        totalEmployees: totalEmployeesCount,
        attendanceRate,
        lastUpdated: new Date().toISOString()
      };
    });
    
    return {
      success: true,
      data: sites
    };
  } catch (error: any) {
    console.error('Error fetching site-wise attendance count:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch site-wise attendance data');
  }
}

  
  // Get all sites attendance summary
  static async getAllSitesSummary(startDate: string, endDate: string) {
    // Get all attendance records for the date range
    const attendanceRecords = await Attendance.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    // Group by site/department
    const siteMap = new Map();
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalEmployees = 0;
    let totalWeeklyOff = 0;

    attendanceRecords.forEach(record => {
      const siteId = record.department || 'General'; // Using department as site for now
      
      if (!siteMap.has(siteId)) {
        siteMap.set(siteId, {
          siteId,
          siteName: siteId,
          totalEmployees: 0,
          present: 0,
          absent: 0,
          weeklyOff: 0,
          shortage: 0
        });
      }

      const siteData = siteMap.get(siteId);
      siteData.totalEmployees++;
      totalEmployees++;

      switch (record.status) {
        case 'present':
          siteData.present++;
          totalPresent++;
          break;
        case 'absent':
          siteData.absent++;
          totalAbsent++;
          siteData.shortage++;
          break;
        case 'half-day':
          siteData.present += 0.5;
          siteData.absent += 0.5;
          totalPresent += 0.5;
          totalAbsent += 0.5;
          siteData.shortage += 0.5;
          break;
        case 'leave':
          siteData.weeklyOff++;
          totalWeeklyOff++;
          break;
      }
    });

    // Calculate attendance rates
    const sites = Array.from(siteMap.values()).map(site => ({
      ...site,
      attendanceRate: site.totalEmployees > 0 
        ? Math.round((site.present / site.totalEmployees) * 100) 
        : 0,
      lastUpdated: new Date().toISOString()
    }));

    return {
      totalSites: sites.length,
      totalEmployees,
      totalPresent: Math.round(totalPresent),
      totalAbsent: Math.round(totalAbsent),
      totalWeeklyOff,
      overallAttendanceRate: totalEmployees > 0 
        ? Math.round((totalPresent / totalEmployees) * 100) 
        : 0,
      averageDailyShortage: Math.round(totalAbsent / sites.length),
      sites
    };
  }

  // Get site attendance details
  static async getSiteAttendanceDetails(siteId: string, startDate: string, endDate: string) {
    const attendanceRecords = await Attendance.find({
      department: siteId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 });

    // Group by date
    const dateMap = new Map();
    const summary = {
      totalDays: 0,
      totalPresent: 0,
      totalAbsent: 0,
      totalShortage: 0,
      maxAttendanceDate: '',
      minAttendanceDate: ''
    };

    attendanceRecords.forEach(record => {
      const date = record.date;
      
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          siteName: siteId,
          totalEmployees: 0,
          present: 0,
          absent: 0,
          weeklyOff: 0,
          shortage: 0
        });
        summary.totalDays++;
      }

      const dayData = dateMap.get(date);
      dayData.totalEmployees++;
      
      switch (record.status) {
        case 'present':
          dayData.present++;
          summary.totalPresent++;
          break;
        case 'absent':
          dayData.absent++;
          dayData.shortage++;
          summary.totalAbsent++;
          summary.totalShortage++;
          break;
        case 'half-day':
          dayData.present += 0.5;
          dayData.absent += 0.5;
          dayData.shortage += 0.5;
          summary.totalPresent += 0.5;
          summary.totalAbsent += 0.5;
          summary.totalShortage += 0.5;
          break;
        case 'leave':
          dayData.weeklyOff++;
          break;
      }
    });

    // Calculate rates and find max/min dates
    const dailyStats = Array.from(dateMap.values()).map(day => ({
      ...day,
      attendanceRate: day.totalEmployees > 0 
        ? Math.round((day.present / day.totalEmployees) * 100) 
        : 0
    }));

    // Find max and min attendance dates
    if (dailyStats.length > 0) {
      const sortedByRate = [...dailyStats].sort((a, b) => b.attendanceRate - a.attendanceRate);
      summary.maxAttendanceDate = sortedByRate[0].date;
      summary.minAttendanceDate = sortedByRate[sortedByRate.length - 1].date;
      summary.averageAttendanceRate = Math.round(
        dailyStats.reduce((sum, day) => sum + day.attendanceRate, 0) / dailyStats.length
      );
    }

    return {
      siteId,
      siteName: siteId,
      dailyStats,
      summary
    };
  }

  // Get department attendance summary
  static async getDepartmentAttendanceSummary(departmentId: string, startDate: string, endDate: string) {
    const attendanceRecords = await Attendance.find({
      department: departmentId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    // Group by employee/site
    const employeeMap = new Map();
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalEmployees = 0;
    let totalShortage = 0;

    attendanceRecords.forEach(record => {
      const employeeKey = record.employeeId;
      
      if (!employeeMap.has(employeeKey)) {
        employeeMap.set(employeeKey, {
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          totalDays: 0,
          presentDays: 0,
          absentDays: 0
        });
        totalEmployees++;
      }

      const employeeData = employeeMap.get(employeeKey);
      employeeData.totalDays++;

      switch (record.status) {
        case 'present':
          employeeData.presentDays++;
          totalPresent++;
          break;
        case 'absent':
          employeeData.absentDays++;
          totalAbsent++;
          totalShortage++;
          break;
        case 'half-day':
          employeeData.presentDays += 0.5;
          employeeData.absentDays += 0.5;
          totalPresent += 0.5;
          totalAbsent += 0.5;
          totalShortage += 0.5;
          break;
      }
    });

    const overallAttendanceRate = totalEmployees > 0 
      ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 100) 
      : 0;

    return {
      departmentId,
      departmentName: departmentId,
      totalSites: Math.ceil(totalEmployees / 10), // Estimate based on employees
      totalEmployees,
      totalPresent: Math.round(totalPresent),
      totalAbsent: Math.round(totalAbsent),
      overallAttendanceRate,
      totalShortage: Math.round(totalShortage),
      employees: Array.from(employeeMap.values())
    };
  }

  // Get employee details for a site
  static async getEmployeeDetails(siteId: string, startDate: string, endDate: string) {
    const attendanceRecords = await Attendance.find({
      department: siteId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: -1 });

    const employees = attendanceRecords.map(record => ({
      id: record._id.toString(),
      name: record.employeeName,
      employeeId: record.employeeId,
      department: record.department,
      position: 'Staff', // You might want to add position field to your model
      status: record.status,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      siteId: record.department,
      siteName: record.department,
      date: record.date,
      totalHours: record.totalHours,
      breakTime: record.breakTime
    }));

    return {
      siteId,
      siteName: siteId,
      startDate,
      endDate,
      employees
    };
  }
}
