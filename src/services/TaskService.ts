// services/TaskService.ts
export interface Site {
  _id: string;
  name: string;
  clientName: string;
  location: string;
  status: string;
  managerCount?: number;
  supervisorCount?: number;
  staffDeployment?: any[];
}

// Extended Site interface for sites with required counts
export interface ExtendedSite extends Site {
  managerCount: number;
  supervisorCount: number;
}

export interface Assignee {
  [x: string]: string;
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'manager' | 'supervisor' | 'staff';
  department?: string;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  uploadedAt: string;
  size: number;
  type: string;
}

export interface HourlyUpdate {
  id: string;
  timestamp: string;
  content: string;
  submittedBy: string;
}

export interface AssignedUser {
  userId: string;
  name: string;
  role: 'manager' | 'supervisor' | 'employee';
  assignedAt: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
}

export interface Task {
  createdBy: string;
  _id: string;
  title: string;
  description: string;
  assignedUsers: AssignedUser[];
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  deadline: string;
  dueDateTime: string;
  siteId: string;
  siteName: string;
  clientName: string;
  taskType?: string;
  attachments: Attachment[];
  hourlyUpdates: HourlyUpdate[];
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  assignedToName?: string;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  assignedUsers: AssignedUser[];
  priority: 'high' | 'medium' | 'low';
  status?: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  deadline: string;
  dueDateTime: string;
  siteId: string;
  siteName: string;
  clientName: string;
  taskType?: string;
  createdBy: string;
  attachments?: Attachment[];
  hourlyUpdates?: HourlyUpdate[];
}

export interface CreateMultipleTasksRequest {
  tasks: CreateTaskRequest[];
  createdBy: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  assignedUsers?: AssignedUser[];
  addAssignees?: AssignedUser[];
  removeAssignees?: string[];
  replaceAssignee?: {
    oldUserId: string;
    newUser: AssignedUser;
  };
  priority?: 'high' | 'medium' | 'low';
  status?: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  deadline?: string;
  dueDateTime?: string;
  siteId?: string;
  siteName?: string;
  clientName?: string;
  taskType?: string;
  attachments?: Attachment[];
}

export interface UpdateTaskStatusRequest {
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  userId?: string;
}

export interface AddHourlyUpdateRequest {
  content: string;
  submittedBy: string;
}

export interface AddAssigneesRequest {
  assignees: AssignedUser[];
}

export interface RemoveAssigneesRequest {
  userIds: string[];
}

export interface ReplaceAssigneeRequest {
  oldUserId: string;
  newUser: AssignedUser;
}

export interface UploadAttachmentRequest {
  file: File;
  taskId: string;
}

export interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  cancelledTasks: number;
  assigneeCount: number;
  siteCount: number;
  tasksByRole?: Array<{
    _id: string;
    count: number;
    uniqueUsers: string[];
  }>;
}

export interface StaffMember {
  _id: string;
  userId: string;
  name: string;
  email: string;
  role: 'manager' | 'supervisor' | 'employee';
  phone?: string;
  siteId?: string;
  siteName?: string;
  isActive: boolean;
}

export interface SiteStaff {
  siteId: string;
  siteName: string;
  managers: StaffMember[];
  supervisors: StaffMember[];
}

export interface StaffWithTaskCount {
  userId: string;
  name: string;
  taskCount: number;
}

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');


class TaskService {
  // Sites
  async getAllSites(): Promise<ExtendedSite[]> {
    try {
      const response = await fetch(`${API_URL}/sites`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sites: ${response.status}`);
      }
      const data = await response.json();
      
      const sites = Array.isArray(data) ? data : [];
      return sites.map((site: any) => ({
        ...site,
        managerCount: site.managerCount !== undefined ? site.managerCount : 0,
        supervisorCount: site.supervisorCount !== undefined ? site.supervisorCount : 0
      }));
      
    } catch (error) {
      console.error('Error fetching sites:', error);
      throw error;
    }
  }

  async getSiteById(siteId: string): Promise<Site | null> {
    try {
      const response = await fetch(`${API_URL}/sites/${siteId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch site: ${response.status}`);
      }
      const site = await response.json();
      return {
        ...site,
        managerCount: site.managerCount !== undefined ? site.managerCount : 0,
        supervisorCount: site.supervisorCount !== undefined ? site.supervisorCount : 0
      };
    } catch (error) {
      console.error(`Error fetching site ${siteId}:`, error);
      throw error;
    }
  }

  /**
   * Get sites assigned to a specific manager
   */
  async getManagerAssignedSites(managerId: string): Promise<ExtendedSite[]> {
    try {
      console.log(`🔍 Fetching sites assigned to manager: ${managerId}`);
      
      // First, get all sites
      const allSites = await this.getAllSites();
      
      // Then, get all tasks to find which sites this manager is assigned to
      const allTasks = await this.getAllTasks();
      
      // Get unique site IDs where this manager is assigned
      const assignedSiteIds = new Set<string>();
      
      allTasks.forEach(task => {
        // Check if manager is assigned to this task
        const isManagerAssigned = task.assignedUsers?.some(
          user => user.role === 'manager' && user.userId === managerId
        );
        
        if (isManagerAssigned && task.siteId) {
          assignedSiteIds.add(task.siteId);
        }
      });
      
      console.log(`📋 Found ${assignedSiteIds.size} site IDs where manager is assigned:`, Array.from(assignedSiteIds));
      
      // Filter sites to only those where manager is assigned
      const assignedSites = allSites.filter(site => 
        assignedSiteIds.has(site._id)
      );
      
      console.log(`✅ Found ${assignedSites.length} assigned sites for manager ${managerId}`);
      return assignedSites;
    } catch (error) {
      console.error('Error fetching manager assigned sites:', error);
      return [];
    }
  }

  /**
   * Get all supervisors from a specific site
   */
  async getSupervisorsBySite(siteId: string): Promise<StaffWithTaskCount[]> {
    try {
      console.log(`📋 Fetching supervisors for site ${siteId}...`);
      
      const staffData = await this.getSiteStaffWithCounts(siteId);
      
      console.log(`✅ Found ${staffData.supervisors.length} supervisors for site ${siteId}`);
      return staffData.supervisors;
    } catch (error) {
      console.error(`❌ Error fetching supervisors for site ${siteId}:`, error);
      return [];
    }
  }

  // Tasks
  async getAllTasks(): Promise<Task[]> {
    try {
      const response = await fetch(`${API_URL}/tasks`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch task: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching task ${taskId}:`, error);
      throw error;
    }
  }

  async createTask(taskData: CreateTaskRequest): Promise<Task> {
    try {
      console.log('📝 Sending create task request to:', `${API_URL}/tasks`);
      console.log('📦 Task data:', JSON.stringify(taskData, null, 2));
      
      const response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });
      
      const responseText = await response.text();
      console.log('📨 Response status:', response.status);
      console.log('📨 Response body:', responseText);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText || `Failed to create task: ${response.status}` };
        }
        console.error('❌ Server error response:', errorData);
        throw new Error(errorData.message || `Failed to create task: ${response.status}`);
      }
      
      const result = JSON.parse(responseText);
      console.log('✅ Task created successfully:', result);
      return result.task || result;
      
    } catch (error) {
      console.error('❌ Error creating task:', error);
      throw error;
    }
  }

  async createMultipleTasks(tasksData: CreateMultipleTasksRequest): Promise<Task[]> {
    try {
      console.log('📝 CREATE MULTIPLE TASKS - Request:', JSON.stringify(tasksData, null, 2));
      
      const response = await fetch(`${API_URL}/tasks/multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tasksData),
      });
      
      const responseText = await response.text();
      console.log('📨 Response status:', response.status);
      console.log('📨 Response body:', responseText);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText || `Failed to create tasks: ${response.status}` };
        }
        console.error('❌ Server error response:', errorData);
        throw new Error(errorData.message || `Failed to create tasks: ${response.status}`);
      }
      
      const result = JSON.parse(responseText);
      console.log('✅ Tasks created successfully:', result);
      return result.tasks || result;
      
    } catch (error) {
      console.error('❌ Error creating multiple tasks:', error);
      throw error;
    }
  }

  async updateTask(taskId: string, updateData: UpdateTaskRequest): Promise<Task> {
    try {
      console.log(`🔄 Updating task ${taskId}:`, JSON.stringify(updateData, null, 2));
      
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update task: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Task updated successfully:', result);
      return result.task || result;
      
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      throw error;
    }
  }

  async addAssigneesToTask(taskId: string, assignees: AssignedUser[]): Promise<Task> {
    try {
      console.log(`➕ Adding assignees to task ${taskId}:`, assignees);
      
      const response = await fetch(`${API_URL}/tasks/${taskId}/assignees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignees }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to add assignees: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Assignees added successfully:', result);
      return result.task || result;
      
    } catch (error) {
      console.error(`Error adding assignees to task ${taskId}:`, error);
      throw error;
    }
  }

  async removeAssigneesFromTask(taskId: string, userIds: string[]): Promise<Task> {
    try {
      console.log(`➖ Removing assignees from task ${taskId}:`, userIds);
      
      const response = await fetch(`${API_URL}/tasks/${taskId}/assignees`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to remove assignees: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Assignees removed successfully:', result);
      return result.task || result;
      
    } catch (error) {
      console.error(`Error removing assignees from task ${taskId}:`, error);
      throw error;
    }
  }

  async replaceAssigneeInTask(taskId: string, oldUserId: string, newUser: AssignedUser): Promise<Task> {
    try {
      console.log(`🔄 Replacing assignee in task ${taskId}:`, { oldUserId, newUser });
      
      const response = await fetch(`${API_URL}/tasks/${taskId}/assignees/replace`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldUserId, newUser }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to replace assignee: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Assignee replaced successfully:', result);
      return result.task || result;
      
    } catch (error) {
      console.error(`Error replacing assignee in task ${taskId}:`, error);
      throw error;
    }
  }

  async updateTaskStatus(taskId: string, status: UpdateTaskStatusRequest): Promise<Task> {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(status),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update task status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error updating task ${taskId} status:`, error);
      throw error;
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete task: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error deleting task ${taskId}:`, error);
      throw error;
    }
  }

  async getAllAssignees(): Promise<Assignee[]> {
    try {
      const response = await fetch(`${API_URL}/tasks/assignees`);
      if (!response.ok) {
        throw new Error(`Failed to fetch assignees: ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching assignees:', error);
      throw error;
    }
  }

  async getAssigneesByRole(role: 'manager' | 'supervisor' | 'staff'): Promise<Assignee[]> {
    try {
      const response = await fetch(`${API_URL}/tasks/assignees?role=${role}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch assignees by role: ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`Error fetching assignees by role ${role}:`, error);
      throw error;
    }
  }

  async getAssignedSupervisors(): Promise<string[]> {
    try {
      const tasks = await this.getAllTasks();
      
      const assignedSupervisorIds = new Set<string>();
      
      tasks.forEach(task => {
        task.assignedUsers.forEach(user => {
          if (user.role === 'supervisor') {
            assignedSupervisorIds.add(user.userId);
          }
        });
      });
      
      return Array.from(assignedSupervisorIds);
    } catch (error) {
      console.error('Error getting assigned supervisors:', error);
      return [];
    }
  }

  async getSupervisorsBySiteOld(): Promise<Map<string, Set<string>>> {
    try {
      const response = await fetch(`${API_URL}/tasks/supervisors-by-site`);
      
      if (!response.ok) {
        const tasks = await this.getAllTasks();
        
        const siteToSupervisors = new Map<string, Set<string>>();
        
        tasks.forEach(task => {
          const supervisors = task.assignedUsers.filter(user => user.role === 'supervisor');
          
          supervisors.forEach(supervisor => {
            if (!siteToSupervisors.has(task.siteId)) {
              siteToSupervisors.set(task.siteId, new Set());
            }
            siteToSupervisors.get(task.siteId)!.add(supervisor.userId);
          });
        });
        
        return siteToSupervisors;
      }
      
      const data = await response.json();
      
      const siteToSupervisors = new Map<string, Set<string>>();
      Object.entries(data).forEach(([siteId, supervisorIds]) => {
        siteToSupervisors.set(siteId, new Set(supervisorIds as string[]));
      });
      
      return siteToSupervisors;
    } catch (error) {
      console.error('Error getting supervisors by site:', error);
      return new Map();
    }
  }

  async getSiteStaffWithCounts(siteId: string): Promise<{ 
    managers: StaffWithTaskCount[],
    supervisors: StaffWithTaskCount[]
  }> {
    try {
      console.log(`📋 Fetching staff with task counts for site ${siteId}...`);
      
      const tasks = await this.getAllTasks();
      
      const managerMap = new Map<string, StaffWithTaskCount>();
      const supervisorMap = new Map<string, StaffWithTaskCount>();
      
      tasks.forEach(task => {
        if (task.siteId === siteId) {
          task.assignedUsers?.forEach(user => {
            if (user.role === 'manager') {
              const existing = managerMap.get(user.userId);
              if (existing) {
                existing.taskCount += 1;
              } else {
                managerMap.set(user.userId, { 
                  userId: user.userId,
                  name: user.name, 
                  taskCount: 1 
                });
              }
            } else if (user.role === 'supervisor') {
              const existing = supervisorMap.get(user.userId);
              if (existing) {
                existing.taskCount += 1;
              } else {
                supervisorMap.set(user.userId, { 
                  userId: user.userId,
                  name: user.name, 
                  taskCount: 1 
                });
              }
            }
          });
        }
      });
      
      const managers = Array.from(managerMap.values());
      const supervisors = Array.from(supervisorMap.values());
      
      console.log(`✅ Found ${managers.length} managers and ${supervisors.length} supervisors for site ${siteId}`);
      
      return { managers, supervisors };
    } catch (error) {
      console.error(`❌ Error fetching staff counts for site ${siteId}:`, error);
      return { managers: [], supervisors: [] };
    }
  }

  async getStaffBySite(): Promise<SiteStaff[]> {
    try {
      console.log('📋 Fetching staff grouped by site...');
      
      const tasks = await this.getAllTasks();
      
      const siteStaffMap = new Map<string, SiteStaff>();
      
      tasks.forEach(task => {
        if (!task.siteId) return;
        
        if (!siteStaffMap.has(task.siteId)) {
          siteStaffMap.set(task.siteId, {
            siteId: task.siteId,
            siteName: task.siteName || 'Unknown Site',
            managers: [],
            supervisors: []
          });
        }
        
        const siteStaff = siteStaffMap.get(task.siteId)!;
        
        task.assignedUsers?.forEach(user => {
          if (user.role === 'manager') {
            const exists = siteStaff.managers.some(m => m.userId === user.userId);
            if (!exists) {
              siteStaff.managers.push({
                _id: user.userId,
                userId: user.userId,
                name: user.name,
                email: user.email || '',
                role: 'manager',
                siteId: task.siteId,
                siteName: task.siteName,
                isActive: true
              });
            }
          } else if (user.role === 'supervisor') {
            const exists = siteStaff.supervisors.some(s => s.userId === user.userId);
            if (!exists) {
              siteStaff.supervisors.push({
                _id: user.userId,
                userId: user.userId,
                name: user.name,
                email: user.email || '',
                role: 'supervisor',
                siteId: task.siteId,
                siteName: task.siteName,
                isActive: true
              });
            }
          }
        });
      });
      
      return Array.from(siteStaffMap.values());
    } catch (error) {
      console.error('❌ Error fetching staff by site:', error);
      return [];
    }
  }

  async getAllManagers(): Promise<StaffMember[]> {
    try {
      console.log('📋 Fetching all managers from tasks...');
      
      const tasks = await this.getAllTasks();
      const managerMap = new Map<string, StaffMember>();
      
      tasks.forEach(task => {
        task.assignedUsers?.forEach(user => {
          if (user.role === 'manager' && !managerMap.has(user.userId)) {
            managerMap.set(user.userId, {
              _id: user.userId,
              userId: user.userId,
              name: user.name,
              email: user.email || '',
              role: 'manager',
              siteId: task.siteId,
              siteName: task.siteName,
              isActive: true
            });
          }
        });
      });
      
      return Array.from(managerMap.values());
    } catch (error) {
      console.error('❌ Error fetching managers:', error);
      return [];
    }
  }

  async getAllSupervisors(): Promise<StaffMember[]> {
    try {
      console.log('📋 Fetching all supervisors from tasks...');
      
      const tasks = await this.getAllTasks();
      const supervisorMap = new Map<string, StaffMember>();
      
      tasks.forEach(task => {
        task.assignedUsers?.forEach(user => {
          if (user.role === 'supervisor' && !supervisorMap.has(user.userId)) {
            supervisorMap.set(user.userId, {
              _id: user.userId,
              userId: user.userId,
              name: user.name,
              email: user.email || '',
              role: 'supervisor',
              siteId: task.siteId,
              siteName: task.siteName,
              isActive: true
            });
          }
        });
      });
      
      return Array.from(supervisorMap.values());
    } catch (error) {
      console.error('❌ Error fetching supervisors:', error);
      return [];
    }
  }

  async getStaffForSite(siteId: string): Promise<{ managers: StaffMember[], supervisors: StaffMember[] }> {
    try {
      console.log(`📋 Fetching staff for site ${siteId}...`);
      
      const tasks = await this.getAllTasks();
      const managerMap = new Map<string, StaffMember>();
      const supervisorMap = new Map<string, StaffMember>();
      
      tasks.forEach(task => {
        if (task.siteId === siteId) {
          task.assignedUsers?.forEach(user => {
            if (user.role === 'manager' && !managerMap.has(user.userId)) {
              managerMap.set(user.userId, {
                _id: user.userId,
                userId: user.userId,
                name: user.name,
                email: user.email || '',
                role: 'manager',
                siteId: task.siteId,
                siteName: task.siteName,
                isActive: true
              });
            } else if (user.role === 'supervisor' && !supervisorMap.has(user.userId)) {
              supervisorMap.set(user.userId, {
                _id: user.userId,
                userId: user.userId,
                name: user.name,
                email: user.email || '',
                role: 'supervisor',
                siteId: task.siteId,
                siteName: task.siteName,
                isActive: true
              });
            }
          });
        }
      });
      
      return {
        managers: Array.from(managerMap.values()),
        supervisors: Array.from(supervisorMap.values())
      };
    } catch (error) {
      console.error(`❌ Error fetching staff for site ${siteId}:`, error);
      return { managers: [], supervisors: [] };
    }
  }

  async getTaskHourlyUpdates(taskId: string): Promise<HourlyUpdate[]> {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}/hourly-updates`);
      if (!response.ok) {
        throw new Error(`Failed to fetch hourly updates: ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`Error fetching hourly updates for task ${taskId}:`, error);
      throw error;
    }
  }

  async addHourlyUpdate(taskId: string, updateData: AddHourlyUpdateRequest): Promise<HourlyUpdate> {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}/hourly-updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to add hourly update: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error adding hourly update to task ${taskId}:`, error);
      throw error;
    }
  }

  async deleteHourlyUpdate(taskId: string, updateId: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}/hourly-updates/${updateId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete hourly update: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error deleting hourly update ${updateId}:`, error);
      throw error;
    }
  }

  async getTaskAttachments(taskId: string): Promise<Attachment[]> {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}/attachments`);
      if (!response.ok) {
        throw new Error(`Failed to fetch attachments: ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`Error fetching attachments for task ${taskId}:`, error);
      throw error;
    }
  }

  async uploadAttachment(taskId: string, file: File): Promise<Attachment> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_URL}/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to upload attachment: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error uploading attachment to task ${taskId}:`, error);
      throw error;
    }
  }

  async uploadMultipleAttachments(taskId: string, files: File[]): Promise<Attachment[]> {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      const response = await fetch(`${API_URL}/tasks/${taskId}/attachments/multiple`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to upload attachments: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error uploading multiple attachments to task ${taskId}:`, error);
      throw error;
    }
  }

  async deleteAttachment(taskId: string, attachmentId: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete attachment: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error deleting attachment ${attachmentId}:`, error);
      throw error;
    }
  }

  async getTaskStatistics(): Promise<TaskStats> {
    try {
      const response = await fetch(`${API_URL}/tasks/stats`);
      if (!response.ok) {
        throw new Error(`Failed to fetch task statistics: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching task statistics:', error);
      throw error;
    }
  }

  async getAssigneeTaskCounts(): Promise<Record<string, number>> {
    try {
      const response = await fetch(`${API_URL}/tasks/assignees/counts`);
      if (!response.ok) {
        throw new Error(`Failed to fetch assignee task counts: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching assignee task counts:', error);
      throw error;
    }
  }
  
  async getTasksByAssignee(assigneeId: string): Promise<Task[]> {
    try {
      const response = await fetch(`${API_URL}/tasks/assignee/${assigneeId}`);
      if (!response.ok) {
        if (response.status === 404) {
          console.log("Endpoint /tasks/assignee/:id not found, filtering from all tasks");
          const allTasks = await this.getAllTasks();
          return allTasks.filter(task => 
            task.assignedUsers.some(user => user.userId === assigneeId)
          );
        }
        throw new Error(`Failed to fetch tasks by assignee: ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`Error fetching tasks for assignee ${assigneeId}:`, error);
      throw error;
    }
  }

  async getTasksByCreator(creatorId: string): Promise<Task[]> {
    try {
      const response = await fetch(`${API_URL}/tasks/creator/${creatorId}`);
      if (!response.ok) {
        if (response.status === 404) {
          const allTasks = await this.getAllTasks();
          return allTasks.filter(task => 
            task.createdBy === creatorId || task.createdBy === creatorId
          );
        }
        throw new Error(`Failed to fetch tasks by creator: ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`Error fetching tasks for creator ${creatorId}:`, error);
      throw error;
    }
  }

  async getTasksBySite(siteName: string): Promise<Task[]> {
    try {
      const response = await fetch(`${API_URL}/tasks/site/${encodeURIComponent(siteName)}`);
      if (!response.ok) {
        if (response.status === 404) {
          const allTasks = await this.getAllTasks();
          return allTasks.filter(task => task.siteName === siteName);
        }
        throw new Error(`Failed to fetch tasks by site: ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`Error fetching tasks for site ${siteName}:`, error);
      throw error;
    }
  }

  async downloadAttachment(attachment: Attachment): Promise<void> {
    try {
      const response = await fetch(attachment.url);
      if (!response.ok) {
        throw new Error(`Failed to download attachment: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      throw error;
    }
  }

  previewAttachment(attachment: Attachment): void {
    window.open(attachment.url, '_blank');
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'No date set';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  }

  getPriorityColor(priority: string): 'destructive' | 'default' | 'secondary' {
    const colors: Record<string, 'destructive' | 'default' | 'secondary'> = { 
      high: 'destructive', 
      medium: 'default', 
      low: 'secondary' 
    };
    return colors[priority] || 'default';
  }

  getStatusColor(status: string): 'default' | 'destructive' | 'secondary' {
    const colors: Record<string, 'default' | 'destructive' | 'secondary'> = { 
      completed: 'default', 
      'in-progress': 'default', 
      pending: 'secondary',
      cancelled: 'destructive'
    };
    return colors[status] || 'default';
  }

  getAssignedUserNames(task: Task): string {
    return task.assignedUsers.map(user => user.name).join(', ');
  }

  getManagers(task: Task): AssignedUser[] {
    return task.assignedUsers.filter(user => user.role === 'manager');
  }

  getSupervisors(task: Task): AssignedUser[] {
    return task.assignedUsers.filter(user => user.role === 'supervisor');
  }

  isUserAssigned(task: Task, userId: string): boolean {
    return task.assignedUsers.some(user => user.userId === userId);
  }

  getUserStatus(task: Task, userId: string): string | null {
    const user = task.assignedUsers.find(u => u.userId === userId);
    return user ? user.status : null;
  }

  findMissingRoles(task: Task, siteManagerCount: number, siteSupervisorCount: number): {
    missingManagers: number;
    missingSupervisors: number;
    currentManagers: number;
    currentSupervisors: number;
  } {
    const currentManagers = this.getManagers(task).length;
    const currentSupervisors = this.getSupervisors(task).length;
    
    return {
      missingManagers: Math.max(0, siteManagerCount - currentManagers),
      missingSupervisors: Math.max(0, siteSupervisorCount - currentSupervisors),
      currentManagers,
      currentSupervisors
    };
  }
}

export const taskService = new TaskService();
export default taskService;