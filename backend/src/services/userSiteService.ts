// backend/services/userSiteService.ts
import AssignTask from '../models/AssignTask';
import Employee from '../models/Employee';
import User from '../models/User';
import Site from '../models/Site';
import mongoose from 'mongoose';

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

    // ✅ PRIORITIZE: First try to get from User.assignedSites
    try {
      const user = await User.findById(userId).lean();
      if (user) {
        console.log(`📋 Found User document: ${user.name || userId}`);
        
        if (user.assignedSites && user.assignedSites.length > 0) {
          console.log(`📋 Found assignedSites in User: ${user.assignedSites.join(', ')}`);
          
          // Check if the first item looks like an ObjectId (24 hex chars)
          const firstItem = user.assignedSites[0];
          const isObjectId = /^[0-9a-fA-F]{24}$/.test(firstItem);
          
          if (isObjectId) {
            // It's an ObjectId - query by _id
            console.log('📍 assignedSites contains ObjectIds, querying by _id');
            const sites = await Site.find({
              _id: { $in: user.assignedSites }
            }).lean();
            
            if (sites && sites.length > 0) {
              siteName = sites[0].name;
              siteIds = user.assignedSites;
              assignedSites = user.assignedSites;
              console.log(`✅ Found site from User.assignedSites (by ID): ${siteName}`);
            }
          } else {
            // It's a site name string - query by name
            console.log('📍 assignedSites contains site names, querying by name');
            const sites = await Site.find({
              name: { $in: user.assignedSites }
            }).lean();
            
            if (sites && sites.length > 0) {
              siteName = sites[0].name;
              siteIds = sites.map(s => s._id.toString());
              assignedSites = siteIds;
              console.log(`✅ Found site from User.assignedSites (by name): ${siteName}`);
            } else {
              // No sites found by name, but we have the name string
              // Use it directly
              siteName = user.assignedSites[0];
              assignedSites = [siteName];
              console.log(`⚠️ Using site name directly from assignedSites: ${siteName}`);
            }
          }
        }
        
        // If no assignedSites, check siteName as fallback
        if (!siteName && user.siteName) {
          siteName = user.siteName;
          console.log(`✅ Found siteName from User: ${siteName}`);
        }
      }
    } catch (error) {
      console.log('User lookup failed:', error);
    }

    // 🔥 SECOND: Only if no site found from User, try AssignTask (as fallback)
    if (!siteName || siteIds.length === 0) {
      try {
        const tasks = await AssignTask.find({
          $or: [
            { 'assignedSupervisors.userId': userId },
            { 'assignedManagers.userId': userId }
          ]
        }).lean();

        console.log(`📋 Found ${tasks?.length || 0} tasks for user (fallback)`);

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

          // Only use task data if we don't already have data from User
          if (!siteName && siteNameSet.size > 0) {
            siteName = Array.from(siteNameSet)[0];
            console.log(`⚠️ Fallback: Found siteName from AssignTask: ${siteName}`);
          }
          
          if (siteIds.length === 0 && siteIdSet.size > 0) {
            siteIds = Array.from(siteIdSet);
            assignedSites = siteIds;
          }
        }
      } catch (error) {
        console.log('AssignTask lookup failed:', error);
      }
    }

    // 🟢 THIRD: Try Employee as last resort
    if (!siteName || siteIds.length === 0) {
      try {
        let employee = await Employee.findOne({ userId: userId }).lean();

        if (!employee) {
          const user = await User.findById(userId).lean();
          if (user?.email) {
            employee = await Employee.findOne({ email: user.email }).lean();
          }
        }

        if (employee) {
          console.log(`📋 Found Employee record via userId/email (last resort)`);

          if (employee.siteName && !siteName) {
            siteName = employee.siteName;
            console.log(`⚠️ Last resort: Found siteName from Employee: ${siteName}`);
          }

          if ((employee as any).site && !siteName) {
            siteName = (employee as any).site;
            console.log(`⚠️ Last resort: Found site from Employee.site: ${siteName}`);
          }
        }
      } catch (error) {
        console.log('Employee lookup failed:', error);
      }
    }

    console.log(`🏁 Final: siteName=${siteName}, assignedSites=${assignedSites.join(', ')}`);
    return { siteName, assignedSites, siteIds };
  }
}