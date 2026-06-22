// routes/superadminAttendanceRoutes.ts
import express from 'express';
import Attendance from '../models/attendance';
import { AttendanceService } from '../services/attendanceService';
const router = express.Router();

// 1. Get all sites attendance summary
router.get('/all-sites-summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const data = await AttendanceService.getAllSitesSummary(
      startDate.toString(),
      endDate.toString()
    );

    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error fetching all sites summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sites summary',
      error: error.message
    });
  }
});

// 2. Get site-wise detailed attendance
router.get('/site-details', async (req, res) => {
  try {
    const { siteId, startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const data = await AttendanceService.getSiteAttendanceDetails(
      siteId?.toString() || 'General',
      startDate.toString(),
      endDate.toString()
    );

    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error fetching site details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch site details',
      error: error.message
    });
  }
});

// 3. Get department-wise attendance
router.get('/department-summary', async (req, res) => {
  try {
    const { departmentId, startDate, endDate } = req.query;
    
    if (!startDate || !endDate || !departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Department ID, start date and end date are required'
      });
    }

    const data = await AttendanceService.getDepartmentAttendanceSummary(
      departmentId.toString(),
      startDate.toString(),
      endDate.toString()
    );

    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error fetching department summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department summary',
      error: error.message
    });
  }
});

// 4. Get employee details for a site
router.get('/employee-details', async (req, res) => {
  try {
    const { siteId, startDate, endDate } = req.query;
    
    if (!siteId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Site ID, start date and end date are required'
      });
    }

    const data = await AttendanceService.getEmployeeDetails(
      siteId.toString(),
      startDate.toString(),
      endDate.toString()
    );

    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error fetching employee details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee details',
      error: error.message
    });
  }
});

// 5. Get departments list
router.get('/departments', async (req, res) => {
  try {
    // Get unique departments from attendance records
    const departments = await Attendance.distinct('department');
    
    // Get count of employees in each department
    const departmentStats = await Promise.all(
      departments.map(async (dept: string) => {
        const employeeCount = await Attendance.distinct('employeeId', { department: dept });
        const presentCount = await Attendance.countDocuments({
          department: dept,
          status: 'present'
        });
        const totalCount = await Attendance.countDocuments({ department: dept });
        
        return {
          id: dept.replace(/\s+/g, '-').toUpperCase(),
          name: dept,
          totalEmployees: employeeCount.length,
          present: presentCount,
          attendanceRate: totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0
        };
      })
    );

    res.json({
      success: true,
      data: departmentStats
    });
  } catch (error: any) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
      error: error.message
    });
  }
});

// 6. Get sites list
router.get('/sites', async (req, res) => {
  try {
    // For now, using departments as sites
    const departments = await Attendance.distinct('department');
    
    const sites = departments.map((dept: string, index: number) => ({
      id: `SITE${String(index + 1).padStart(3, '0')}`,
      name: dept,
      code: dept.substring(0, 3).toUpperCase(),
      deploy: Math.floor(Math.random() * 30) + 10, // Random deployment count
      supervisor: `Supervisor ${index + 1}`,
      supervisorId: `SUP${String(index + 1).padStart(3, '0')}`,
      weeklyOff: Math.floor(Math.random() * 5) + 1,
      department: dept,
      location: 'Location 1',
      client: 'Client 1'
    }));

    res.json({
      success: true,
      data: sites
    });
  } catch (error: any) {
    console.error('Error fetching sites:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sites',
      error: error.message
    });
  }
});

// 7. Get monthly shortages data
router.get('/shortages/monthly', async (req, res) => {
  try {
    const { month } = req.query;
    
    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Month is required (format: YYYY-MM)'
      });
    }

    const [year, monthNum] = month.toString().split('-').map(Number);
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-31`;

    // Get all departments as sites
    const departments = await Attendance.distinct('department');
    
    const sites = await Promise.all(
      departments.slice(0, 5).map(async (dept: string, index: number) => {
        const shortages: Record<string, number> = {};
        
        // Get attendance for each day of the month
        for (let day = 1; day <= 31; day++) {
          const date = `${year}-${monthNum.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          
          try {
            const absentCount = await Attendance.countDocuments({
              department: dept,
              date,
              status: { $in: ['absent', 'half-day'] }
            });
            shortages[date] = absentCount;
          } catch {
            shortages[date] = 0;
          }
        }

        return {
          id: `SITE${String(index + 1).padStart(3, '0')}`,
          name: dept,
          deploy: Math.floor(Math.random() * 30) + 10,
          supervisor: `Supervisor ${index + 1}`,
          supervisorId: `SUP${String(index + 1).padStart(3, '0')}`,
          weeklyOff: Math.floor(Math.random() * 5) + 1,
          shortages
        };
      })
    );

    // Generate months list
    const currentDate = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
    }

    res.json({
      success: true,
      data: {
        sites,
        months,
        selectedMonth: month
      }
    });
  } catch (error: any) {
    console.error('Error fetching shortages data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shortages data',
      error: error.message
    });
  }
});

// 8. Update shortage
router.put('/shortages/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const { date, shortage } = req.body;
    
    if (!date || shortage === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Date and shortage value are required'
      });
    }

    // In a real implementation, you would update a Shortages collection
    // For now, we'll return success
    res.json({
      success: true,
      message: 'Shortage updated successfully',
      data: {
        siteId,
        date,
        shortage
      }
    });
  } catch (error: any) {
    console.error('Error updating shortage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shortage',
      error: error.message
    });
  }
});

// 9. Export data
router.post('/export/:format', async (req, res) => {
  try {
    const { format } = req.params;
    const { viewType, startDate, endDate, siteId, departmentId, month } = req.body;

    // Get data based on view type
    let data: any;
    let filename: string;

    switch (viewType) {
      case 'all-sites':
        data = await AttendanceService.getAllSitesSummary(startDate, endDate);
        filename = `all-sites-attendance-${startDate}-${endDate}`;
        break;
      case 'site-wise':
        data = await AttendanceService.getSiteAttendanceDetails(siteId || 'General', startDate, endDate);
        filename = `site-attendance-${siteId}-${startDate}-${endDate}`;
        break;
      case 'department':
        data = await AttendanceService.getDepartmentAttendanceSummary(departmentId, startDate, endDate);
        filename = `department-attendance-${departmentId}-${startDate}-${endDate}`;
        break;
      default:
        throw new Error('Invalid view type');
    }

    // Convert to CSV/Excel format
    let exportData: string;
    
    if (format === 'csv') {
      // Generate CSV
      exportData = 'Date,Total Employees,Present,Absent,Attendance Rate\n';
      
      if (data.dailyStats) {
        data.dailyStats.forEach((stat: any) => {
          exportData += `${stat.date},${stat.totalEmployees},${stat.present},${stat.absent},${stat.attendanceRate}%\n`;
        });
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
      return res.send(exportData);
    } else {
      // For Excel, you would use a library like exceljs
      // Here's a simple implementation
      const excelData = JSON.stringify(data, null, 2);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
      
      // In reality, you would use exceljs to create a proper Excel file
      // For now, returning JSON
      return res.json({
        success: true,
        data,
        message: 'Export data prepared'
      });
    }
  } catch (error: any) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    });
  }
});

export default router;