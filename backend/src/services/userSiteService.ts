// backend/services/userSiteService.ts
import AssignTask from '../models/AssignTask';
import Employee from '../models/Employee';
import User from '../models/User'; // ✅ Import User

export interface UserSiteInfo {
  siteName: string | null;
  assignedSites: string[];
  siteIds: string[];
}

export class UserSiteService {
  static async getUserSites(userId: string, role: string): Promise<UserSiteInfo> {
    let siteName: string | null = null;
    let assignedSites: string[] = [];
    let siteIds: string[] = [];

    console.log(`🔍 Getting sites for user ${userId} with role ${role}`);

    // 1. Try to get from AssignTask
    try {
      const tasks = await AssignTask.find({
        $or: [
          { 'assignedSupervisors.userId': userId },
          { 'assignedManagers.userId': userId }
        ]
      }).lean();

      console.log(`📋 Found ${tasks?.length || 0} tasks for user`);

      if (tasks && tasks.length > 0) {
        const siteNameSet = new Set<string>();
        const siteIdSet = new Set<string>();

        tasks.forEach((task: any) => {
          const isSupervisor = task.assignedSupervisors?.some(
            (s: any) => s.userId === userId
          );
          const isManager = task.assignedManagers?.some(
            (m: any) => m.userId === userId
          );

          if ((isSupervisor || isManager) && task.siteId) {
            if (task.siteName) siteNameSet.add(task.siteName);
            siteIdSet.add(task.siteId);
          }
        });

        siteName = siteNameSet.size > 0 ? Array.from(siteNameSet)[0] : null;
        siteIds = Array.from(siteIdSet);
        assignedSites = siteIds;
        
        console.log(`✅ Found from AssignTask: siteName=${siteName}`);
      }
    } catch (error) {
      console.log('AssignTask lookup failed, trying Employee fallback');
    }

    // 2. Fallback to Employee model
    if (!siteName || siteIds.length === 0) {
      try {
        const employee = await Employee.findById(userId).lean();
        if (employee) {
          console.log(`📋 Found Employee record`);
          
          // ✅ Only use siteName from Employee (assignedSites doesn't exist on Employee)
          if (employee.siteName && !siteName) {
            siteName = employee.siteName;
            console.log(`✅ Found siteName from Employee: ${siteName}`);
          }
          
          // Check if site is a string on the employee
          if ((employee as any).site && !siteName) {
            siteName = (employee as any).site;
            console.log(`✅ Found site from Employee.site: ${siteName}`);
          }
        }
      } catch (error) {
        console.log('Employee lookup failed');
      }
    }

    // 3. Fallback to User model
    if (!siteName) {
      try {
        const user = await User.findById(userId).lean();
        if (user) {
          if (user.siteName) {
            siteName = user.siteName;
            console.log(`✅ Found siteName from User: ${siteName}`);
          }
          if (user.assignedSites && user.assignedSites.length > 0) {
            assignedSites = user.assignedSites;
            siteIds = user.assignedSites;
          }
        }
      } catch (error) {
        console.log('User lookup failed');
      }
    }

    console.log(`🏁 Final: siteName=${siteName}, assignedSites=${assignedSites.join(', ')}`);
    return { siteName, assignedSites, siteIds };
  }
}