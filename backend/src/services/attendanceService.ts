import Attendance from '../models/attendance';

export class AttendanceService {
  static async getAllSitesSummary(startDate?: string, endDate?: string) {
    const query: any = {};
    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };
    return Attendance.find(query);
  }

  static async getSiteAttendanceDetails(siteId: string, startDate?: string, endDate?: string) {
    const query: any = { siteName: siteId };
    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };
    return Attendance.find(query);
  }

  static async getDepartmentAttendanceSummary(departmentId: string, startDate?: string, endDate?: string) {
    const query: any = { department: departmentId };
    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };
    return Attendance.find(query);
  }

  static async getEmployeeDetails(employeeId: string, startDate?: string, endDate?: string) {
    const query: any = { employeeId };
    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };
    return Attendance.find(query);
  }
}