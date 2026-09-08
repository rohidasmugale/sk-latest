import { Request, Response, NextFunction } from 'express';
import Employee from '../models/Employee';
import User from '../models/User';

/**
 * Auto-create employee record when a new user is created
 */
export const autoCreateEmployee = async (user: any, siteName: string = "Global Square Office") => {
  try {
    // Check if employee already exists
    const existing = await Employee.findOne({ userId: user._id });
    if (existing) {
      console.log(`✅ Employee already exists for ${user.name}`);
      return existing;
    }

    // Determine role-based fields
    let department = "Operations";
    let position = "Employee";
    let isManager = false;
    let isSupervisor = false;

    if (user.role === 'admin' || user.role === 'superadmin') {
      department = "Admin";
      position = "Administrator";
      isManager = true;
    } else if (user.role === 'manager') {
      department = "Operations";
      position = "Manager";
      isManager = true;
    } else if (user.role === 'supervisor') {
      department = "Operations";
      position = "Supervisor";
      isSupervisor = true;
    }

    // Create employee record
    const employee = new Employee({
      employeeId: user._id.toString(),  // ← Link to User._id
      userId: user._id,                 // ← Explicit reference
      name: user.name,
      email: user.email,
      siteName: siteName || user.siteName || "Global Square Office",
      department: department,
      position: position,
      status: "active",
      isManager: isManager,
      isSupervisor: isSupervisor,
      joinDate: user.joinDate || new Date(),
      phone: user.phone || '',
    });

    await employee.save();
    console.log(`✅ Auto-created employee record for ${user.name} (${user.role})`);
    return employee;
  } catch (error) {
    console.error('❌ Failed to auto-create employee:', error);
    return null;
  }
};

/**
 * Middleware: Auto-create employee on user creation
 */
export const ensureEmployeeOnCreate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Store the user from the request body
    const userData = req.body;
    
    // Add a flag to the request so the route handler knows to auto-create
    req.body._autoCreateEmployee = true;
    req.body._siteName = userData.siteName || "Global Square Office";
    
    next();
  } catch (error) {
    console.error('❌ ensureEmployeeOnCreate error:', error);
    next();
  }
};

/**
 * Ensure employee exists on attendance check-in
 */
export const ensureEmployeeForAttendance = async (userId: string, siteName?: string) => {
  try {
    let employee = await Employee.findOne({ userId });
    
    if (!employee) {
      // Get user details
      const user = await User.findById(userId);
      if (!user) {
        console.error(`❌ User not found: ${userId}`);
        return null;
      }
      
      // Auto-create employee
      employee = await autoCreateEmployee(user, siteName || "Global Square Office");
    }
    
    return employee;
  } catch (error) {
    console.error('❌ ensureEmployeeForAttendance error:', error);
    return null;
  }
};