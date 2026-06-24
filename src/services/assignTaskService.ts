// services/assignTaskService.ts
export interface AssignTask {
  _id: string;
  taskTitle: string;
  description: string;
  startDate: string;
  endDate: string;
  dueDateTime: string;
  priority: 'high' | 'medium' | 'low';
  taskType: string;
  siteId: string;
  siteName: string;
  siteLocation: string;
  clientName: string;
  assignedManagers: Array<{
    userId: string;
    name: string;
    role: 'manager';
    assignedAt: string;
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  }>;
  assignedSupervisors: Array<{
    userId: string;
    name: string;
    role: 'supervisor';
    assignedAt: string;
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  }>;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  completionPercentage?: number;
  isOverdue?: boolean;
  hourlyUpdates?: Array<{
    content: string;
    timestamp: string;
    submittedBy: string;
    submittedByName: string;
  }>;
  attachments?: Array<{
    filename: string;
    url: string;
    uploadedAt: string;
    uploadedBy: string;
    uploadedByName: string;
    size: number;
    type: string;
  }>;
}

export interface CreateAssignTaskRequest {
  taskTitle: string;
  description: string;
  startDate: string;
  endDate: string;
  dueDateTime: string;
  priority: 'high' | 'medium' | 'low';
  taskType: string;
  siteId: string;
  siteName: string;
  siteLocation: string;
  clientName: string;
  assignedManagers: Array<{ userId: string; name: string; role: 'manager' }>;
  assignedSupervisors: Array<{ userId: string; name: string; role: 'supervisor' }>;
  createdBy: string;
  createdByName: string;
}

export interface UpdateAssignTaskRequest {
  taskTitle?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  dueDateTime?: string;
  priority?: 'high' | 'medium' | 'low';
  taskType?: string;
  assignedManagers?: Array<{ userId: string; name: string; role: 'manager' }>;
  assignedSupervisors?: Array<{ userId: string; name: string; role: 'supervisor' }>;
  status?: 'pending' | 'in-progress' | 'completed' | 'cancelled';
}

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');


class AssignTaskService {
  async createAssignTask(taskData: CreateAssignTaskRequest): Promise<AssignTask> {
    try {
      console.log('📝 Creating assign task:', taskData);
      
      const response = await fetch(`${API_URL}/assigntasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create task';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        
        if (response.status === 404) {
          throw new Error('Route not found - please check if server is running and route is registered');
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Task created:', result);
      return result.task || result;
    } catch (error) {
      console.error('❌ Error creating task:', error);
      throw error;
    }
  }

  async getAllAssignTasks(filters?: {
    status?: string;
    priority?: string;
    siteId?: string;
    managerId?: string;
    supervisorId?: string;
    userId?: string;
    userRole?: string;
  }): Promise<AssignTask[]> {
    try {
      console.log('📋 Fetching all assign tasks...');
      
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filters) {
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.priority) queryParams.append('priority', filters.priority);
        if (filters.siteId) queryParams.append('siteId', filters.siteId);
        if (filters.managerId) queryParams.append('managerId', filters.managerId);
        if (filters.supervisorId) queryParams.append('supervisorId', filters.supervisorId);
        if (filters.userId) queryParams.append('userId', filters.userId);
        if (filters.userRole) queryParams.append('userRole', filters.userRole);
      }
      
      const url = `${API_URL}/assigntasks${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`❌ Failed to fetch tasks: ${response.status}`);
        return [];
      }

      const data = await response.json();
      
      // Handle both array response and paginated response
      let tasks = Array.isArray(data) ? data : (data.tasks || []);
      
      // Ensure tasks have the required arrays and properties
      tasks = tasks.map((task: any) => ({
        ...task,
        assignedSupervisors: task.assignedSupervisors || [],
        assignedManagers: task.assignedManagers || [],
        hourlyUpdates: task.hourlyUpdates || [],
        attachments: task.attachments || []
      }));
      
      console.log(`✅ Fetched ${tasks.length} tasks`);
      
      return tasks;
    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      return [];
    }
  }

  async getAssignTaskById(taskId: string): Promise<AssignTask | null> {
    try {
      console.log(`📋 Fetching task ${taskId}...`);
      
      const response = await fetch(`${API_URL}/assigntasks/${taskId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch task');
      }

      const task = await response.json();
      
      // Ensure arrays exist
      return {
        ...task,
        assignedSupervisors: task.assignedSupervisors || [],
        assignedManagers: task.assignedManagers || [],
        hourlyUpdates: task.hourlyUpdates || [],
        attachments: task.attachments || []
      };
    } catch (error) {
      console.error('❌ Error fetching task:', error);
      throw error;
    }
  }

  async updateAssignTask(taskId: string, updateData: UpdateAssignTaskRequest): Promise<AssignTask> {
    try {
      console.log(`📝 Updating task ${taskId}:`, updateData);
      
      const response = await fetch(`${API_URL}/assigntasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update task';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Task updated:', result);
      return result.task || result;
    } catch (error) {
      console.error('❌ Error updating task:', error);
      throw error;
    }
  }

  async deleteAssignTask(taskId: string): Promise<void> {
    try {
      console.log(`🗑️ Deleting task ${taskId}...`);
      
      const response = await fetch(`${API_URL}/assigntasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete task';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      console.log('✅ Task deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      throw error;
    }
  }

  async updateTaskStatus(taskId: string, status: string): Promise<AssignTask> {
    try {
      console.log(`📝 Updating task ${taskId} status to ${status}`);
      
      const response = await fetch(`${API_URL}/assigntasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update status';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Task status updated:', result);
      return result.task || result;
    } catch (error) {
      console.error('❌ Error updating task status:', error);
      throw error;
    }
  }

  async getTasksBySupervisor(supervisorId: string): Promise<AssignTask[]> {
    try {
      console.log(`📋 Fetching tasks for supervisor ${supervisorId}...`);
      
      const allTasks = await this.getAllAssignTasks({ supervisorId });
      
      // Additional filtering to ensure we only get tasks where this supervisor is assigned
      const supervisorTasks = allTasks.filter(task => {
        if (!task.assignedSupervisors || !Array.isArray(task.assignedSupervisors)) {
          return false;
        }
        
        return task.assignedSupervisors.some(supervisor => {
          const supervisorUserId = supervisor.userId || (supervisor as any)._id || (supervisor as any).id;
          return String(supervisorUserId) === String(supervisorId);
        });
      });

      console.log(`✅ Found ${supervisorTasks.length} tasks assigned to supervisor ${supervisorId}`);
      return supervisorTasks;
    } catch (error) {
      console.error(`❌ Error fetching tasks for supervisor ${supervisorId}:`, error);
      return [];
    }
  }

  async getTasksByManager(managerId: string): Promise<AssignTask[]> {
    try {
      console.log(`📋 Fetching tasks created by manager ${managerId}...`);
      
      const allTasks = await this.getAllAssignTasks();
      
      const managerTasks = allTasks.filter(task => {
        // Check if task was created by this manager
        const createdBy = task.createdBy || (task as any).createdById;
        return String(createdBy) === String(managerId);
      });

      console.log(`✅ Found ${managerTasks.length} tasks created by manager ${managerId}`);
      return managerTasks;
    } catch (error) {
      console.error(`❌ Error fetching tasks for manager ${managerId}:`, error);
      return [];
    }
  }

// services/assignTaskService.ts

async getTasksWithManager(managerId: string): Promise<AssignTask[]> {
  try {
    console.log(`📋 Fetching tasks with manager ${managerId} assigned...`);
    
    // Use the filter approach with the API
    const allTasks = await this.getAllAssignTasks({ managerId });
    
    // Additional client-side filtering for safety
    const tasksWithManager = allTasks.filter(task => {
      if (!task.assignedManagers || !Array.isArray(task.assignedManagers)) {
        return false;
      }
      
      return task.assignedManagers.some(manager => {
        const managerUserId = manager.userId || (manager as any)._id || (manager as any).id;
        return String(managerUserId) === String(managerId);
      });
    });

    console.log(`✅ Found ${tasksWithManager.length} tasks with manager ${managerId} assigned`);
    return tasksWithManager;
  } catch (error) {
    console.error(`❌ Error fetching tasks with manager ${managerId}:`, error);
    
    // Fallback: try without filter
    try {
      console.log('⚠️ Trying fallback: fetching all tasks and filtering client-side');
      const allTasks = await this.getAllAssignTasks();
      
      const tasksWithManager = allTasks.filter(task => {
        if (!task.assignedManagers || !Array.isArray(task.assignedManagers)) {
          return false;
        }
        
        return task.assignedManagers.some(manager => {
          const managerUserId = manager.userId || (manager as any)._id || (manager as any).id;
          return String(managerUserId) === String(managerId);
        });
      });
      
      console.log(`✅ Fallback: Found ${tasksWithManager.length} tasks with manager ${managerId} assigned`);
      return tasksWithManager;
    } catch (fallbackError) {
      return [];
    }
  }
}

  async getTasksBySite(siteId: string): Promise<AssignTask[]> {
    try {
      console.log(`📋 Fetching tasks for site ${siteId}...`);
      
      const allTasks = await this.getAllAssignTasks({ siteId });

      console.log(`✅ Found ${allTasks.length} tasks for site ${siteId}`);
      return allTasks;
    } catch (error) {
      console.error(`❌ Error fetching tasks for site ${siteId}:`, error);
      return [];
    }
  }

  async getTasksByStatus(status: string): Promise<AssignTask[]> {
    try {
      console.log(`📋 Fetching tasks with status ${status}...`);
      
      const allTasks = await this.getAllAssignTasks({ status });

      console.log(`✅ Found ${allTasks.length} tasks with status ${status}`);
      return allTasks;
    } catch (error) {
      console.error(`❌ Error fetching tasks with status ${status}:`, error);
      return [];
    }
  }

  async getOverdueTasks(): Promise<AssignTask[]> {
    try {
      console.log('📋 Fetching overdue tasks...');
      
      const allTasks = await this.getAllAssignTasks();
      const now = new Date();
      
      const overdueTasks = allTasks.filter(task => 
        task.status !== 'completed' && 
        task.status !== 'cancelled' && 
        new Date(task.dueDateTime) < now
      );

      console.log(`✅ Found ${overdueTasks.length} overdue tasks`);
      return overdueTasks;
    } catch (error) {
      console.error('❌ Error fetching overdue tasks:', error);
      return [];
    }
  }

  async addHourlyUpdate(
    taskId: string, 
    content: string, 
    submittedBy: string, 
    submittedByName: string
  ): Promise<any> {
    try {
      console.log(`📝 Adding hourly update to task ${taskId}`);
      
      const response = await fetch(`${API_URL}/assigntasks/${taskId}/hourly-updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          submittedBy,
          submittedByName
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to add hourly update';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Hourly update added:', result);
      return result.update || result;
    } catch (error) {
      console.error('❌ Error adding hourly update:', error);
      throw error;
    }
  }

  async uploadAttachment(taskId: string, file: File, uploadedBy: string, uploadedByName: string): Promise<any> {
    try {
      console.log(`📎 Uploading attachment to task ${taskId}`);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadedBy', uploadedBy);
      formData.append('uploadedByName', uploadedByName);

      const response = await fetch(`${API_URL}/assigntasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to upload attachment';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Attachment uploaded:', result);
      return result.attachment || result;
    } catch (error) {
      console.error('❌ Error uploading attachment:', error);
      throw error;
    }
  }

  async deleteAttachment(taskId: string, attachmentId: string): Promise<void> {
    try {
      console.log(`🗑️ Deleting attachment ${attachmentId} from task ${taskId}`);
      
      const response = await fetch(`${API_URL}/assigntasks/${taskId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete attachment';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      console.log('✅ Attachment deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting attachment:', error);
      throw error;
    }
  }

  async getTaskStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    overdue: number;
  }> {
    try {
      console.log('📊 Calculating task statistics...');
      
      const allTasks = await this.getAllAssignTasks();
      const now = new Date();
      
      const byStatus: Record<string, number> = {};
      const byPriority: Record<string, number> = {};
      let overdue = 0;
      
      allTasks.forEach(task => {
        // Count by status
        byStatus[task.status] = (byStatus[task.status] || 0) + 1;
        
        // Count by priority
        byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
        
        // Count overdue
        if (task.status !== 'completed' && task.status !== 'cancelled' && new Date(task.dueDateTime) < now) {
          overdue++;
        }
      });
      
      const stats = {
        total: allTasks.length,
        byStatus,
        byPriority,
        overdue
      };
      
      console.log('✅ Statistics calculated:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error calculating statistics:', error);
      throw error;
    }
  }

  async searchTasks(query: string): Promise<AssignTask[]> {
    try {
      console.log(`🔍 Searching tasks for: "${query}"`);
      
      const allTasks = await this.getAllAssignTasks();
      const searchLower = query.toLowerCase();
      
      const results = allTasks.filter(task => 
        task.taskTitle.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower) ||
        task.siteName.toLowerCase().includes(searchLower) ||
        task.clientName.toLowerCase().includes(searchLower) ||
        task.taskType.toLowerCase().includes(searchLower) ||
        (task.createdByName && task.createdByName.toLowerCase().includes(searchLower))
      );

      console.log(`✅ Found ${results.length} tasks matching "${query}"`);
      return results;
    } catch (error) {
      console.error('❌ Error searching tasks:', error);
      return [];
    }
  }
}

export const assignTaskService = new AssignTaskService();
export default assignTaskService;