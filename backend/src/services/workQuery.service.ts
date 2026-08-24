// services/workQuery.service.ts
import { WorkQuery, IWorkQuery } from '../models/workQuery.model';

// Update the interface to match what controller sends
interface CreateWorkQueryData {
  title: string;
  description: string;
  serviceId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  reportedBy: {
    userId: string;
    name: string;
    role: string;
  };
  supervisorId: string;
  supervisorName: string;
  serviceTitle?: string;
  serviceType?: string;
  images?: Array<{
    url: string;
    publicId: string;
    uploadedAt: string;
  }>;
}

interface Service {
  _id: string;
  serviceId: string;
  type: 'cleaning' | 'waste-management' | 'parking-management' | 'security' | 'maintenance';
  title: string;
  description: string;
  location: string;
  assignedTo: string;
  assignedToName: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  schedule: string;
  supervisorId: string;
}

interface FilterParams {
  search?: string;
  status?: string;
  priority?: string;
  serviceType?: string;
  supervisorId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface Statistics {
  total: number;
  statusCounts: {
    pending: number;
    'in-progress': number;
    resolved: number;
    rejected: number;
  };
  serviceTypeCounts: {
    cleaning: number;
    'waste-management': number;
    'parking-management': number;
    security: number;
    maintenance: number;
  };
  priorityCounts: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

interface CommentData {
  userId: string;
  name: string;
  comment: string;
}

interface AssignData {
  userId: string;
  name: string;
  role?: string;
}

class WorkQueryService {
  
  // CREATE WORK QUERY - Fixed signature (single parameter)
  async createWorkQuery(data: CreateWorkQueryData): Promise<IWorkQuery> {
    try {
      console.log('🚀 Creating work query with data:', JSON.stringify(data, null, 2));
      console.log('Images received:', data.images?.length || 0);
      
      // Generate unique query ID
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      const queryId = `QUERY${timestamp}${random}`;
      
      // Prepare work query data
      const workQueryData: any = {
        queryId,
        title: data.title,
        description: data.description,
        serviceId: data.serviceId,
        priority: data.priority,
        category: data.category,
        reportedBy: data.reportedBy || {
          userId: data.supervisorId,
          name: data.supervisorName,
          role: 'supervisor'
        },
        supervisorId: data.supervisorId,
        supervisorName: data.supervisorName,
        status: 'pending',
        type: 'service',
      };
      
      // Handle service title and type if provided
      if (data.serviceTitle) {
        workQueryData.serviceTitle = data.serviceTitle;
      }
      
      if (data.serviceType) {
        workQueryData.serviceType = data.serviceType;
      }
      
      // Handle images if provided
      if (data.images && Array.isArray(data.images) && data.images.length > 0) {
        workQueryData.images = data.images;
        console.log(`Adding ${data.images.length} images to the query`);
      } else {
        workQueryData.images = [];
        console.log('No images to add');
      }
      
      console.log('💾 Saving to MongoDB with images:', workQueryData.images.length);
      
      // Create and save the work query
      const workQuery = new WorkQuery(workQueryData);
      const savedQuery = await workQuery.save();
      
      console.log('✅ Work query saved successfully!');
      console.log('📋 Query ID:', savedQuery.queryId);
      console.log('🆔 MongoDB ID:', savedQuery._id);
      console.log('🖼️ Images saved:', savedQuery.images?.length || 0);
      
      return savedQuery;
    } catch (error: any) {
      console.error('❌ Error in createWorkQuery service:', error);
      throw error;
    }
  }
  
  // GET ALL SERVICES (For dropdown) - Return mock data for now
  async getAllServices(): Promise<Service[]> {
    try {
      console.log('📋 Getting all services');
      
      // Return mock services (you should replace with actual database query)
      return [
        {
          _id: '1',
          serviceId: 'CLEAN001',
          type: 'cleaning',
          title: 'Office Floor Deep Cleaning',
          description: 'Complete deep cleaning of office floor',
          location: 'Floor 3',
          assignedTo: 'STAFF001',
          assignedToName: 'Ramesh Kumar',
          status: 'in-progress',
          schedule: '2024-02-15T09:00:00',
          supervisorId: 'SUP001'
        },
        {
          _id: '2',
          serviceId: 'WASTE001',
          type: 'waste-management',
          title: 'Biomedical Waste Collection',
          description: 'Urgent collection and disposal',
          location: 'Clinic Wing',
          assignedTo: 'STAFF002',
          assignedToName: 'Suresh Patel',
          status: 'pending',
          schedule: '2024-02-15T14:00:00',
          supervisorId: 'SUP001'
        }
      ];
    } catch (error: any) {
      console.error('Error getting services:', error);
      throw error;
    }
  }
  
  // GET WORK QUERIES FOR USER
  async getWorkQueriesForUser(
    userId: string, 
    userRole: string, 
    filters: FilterParams
  ): Promise<{ queries: IWorkQuery[]; total: number }> {
    try {
      console.log('🔍 Fetching work queries for user:', userId, 'role:', userRole);
      console.log('📋 Filters:', filters);
      
      // Build query based on user role
      const query: any = {};
      
      if (userRole === 'supervisor') {
        query.supervisorId = userId;
      } else if (userRole === 'staff') {
        query['assignedTo.userId'] = userId;
      }
      
      // Apply search filter
      if (filters.search) {
        query.$or = [
          { title: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { queryId: { $regex: filters.search, $options: 'i' } },
          { serviceId: { $regex: filters.search, $options: 'i' } }
        ];
      }
      
      // Apply status filter
      if (filters.status && filters.status !== 'all') {
        query.status = filters.status;
      }
      
      // Apply priority filter
      if (filters.priority && filters.priority !== 'all') {
        query.priority = filters.priority;
      }
      
      // Apply service type filter
      if (filters.serviceType && filters.serviceType !== 'all') {
        query.serviceType = filters.serviceType;
      }
      
      console.log('🔍 MongoDB query:', JSON.stringify(query, null, 2));
      
      // Calculate skip for pagination
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;
      
      // Determine sort order
      const sort: any = {};
      if (filters.sortBy) {
        sort[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1;
      } else {
        sort.createdAt = -1;
      }
      
      // Execute query
      const [queries, total] = await Promise.all([
        WorkQuery.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        WorkQuery.countDocuments(query)
      ]);
      
      console.log(`✅ Found ${queries.length} queries out of ${total}`);
      
      // Log image counts for debugging
      queries.forEach((q: any, index: number) => {
        console.log(`Query ${index + 1}: ${q.queryId} has ${q.images?.length || 0} images`);
      });
      
      return {
        queries: queries as IWorkQuery[],
        total
      };
    } catch (error: any) {
      console.error('❌ Error getting work queries for user:', error);
      console.error('📋 Error stack:', error.stack);
      // Return empty data if database error
      return {
        queries: [],
        total: 0
      };
    }
  }
  
  // GET STATISTICS
  async getStatistics(userId: string, userRole: string): Promise<Statistics> {
    try {
      console.log(`📊 Getting statistics for user: ${userId}, role: ${userRole}`);
      
      // Build query based on user role
      const query: any = {};
      
      if (userRole === 'supervisor') {
        query.supervisorId = userId;
      } else if (userRole === 'staff') {
        query['assignedTo.userId'] = userId;
      }
      
      // Get all queries for this user
      const queries = await WorkQuery.find(query).lean();
      console.log(`📊 Found ${queries.length} queries for statistics`);
      
      // Calculate statistics
      const statusCounts = {
        pending: queries.filter((q: any) => q.status === 'pending').length,
        'in-progress': queries.filter((q: any) => q.status === 'in-progress').length,
        resolved: queries.filter((q: any) => q.status === 'resolved').length,
        rejected: queries.filter((q: any) => q.status === 'rejected').length
      };
      
      const priorityCounts = {
        low: queries.filter((q: any) => q.priority === 'low').length,
        medium: queries.filter((q: any) => q.priority === 'medium').length,
        high: queries.filter((q: any) => q.priority === 'high').length,
        critical: queries.filter((q: any) => q.priority === 'critical').length
      };
      
      const serviceTypeCounts = {
        cleaning: queries.filter((q: any) => q.serviceType === 'cleaning').length,
        'waste-management': queries.filter((q: any) => q.serviceType === 'waste-management').length,
        'parking-management': queries.filter((q: any) => q.serviceType === 'parking-management').length,
        security: queries.filter((q: any) => q.serviceType === 'security').length,
        maintenance: queries.filter((q: any) => q.serviceType === 'maintenance').length
      };
      
      return {
        total: queries.length,
        statusCounts,
        serviceTypeCounts,
        priorityCounts
      };
    } catch (error: any) {
      console.error('❌ Error getting statistics:', error);
      // Return empty statistics
      return {
        total: 0,
        statusCounts: {
          pending: 0,
          'in-progress': 0,
          resolved: 0,
          rejected: 0
        },
        serviceTypeCounts: {
          cleaning: 0,
          'waste-management': 0,
          'parking-management': 0,
          security: 0,
          maintenance: 0
        },
        priorityCounts: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        }
      };
    }
  }
  
  // GET WORK QUERY BY ID
  async getWorkQueryById(id: string): Promise<IWorkQuery | null> {
    try {
      console.log(`🔍 Fetching work query by ID: ${id}`);
      
      const query = await WorkQuery.findById(id).lean();
      
      if (!query) {
        console.log(`❌ Query ${id} not found`);
        return null;
      }
      
      console.log(`✅ Query ${id} found with ${query.images?.length || 0} images`);
      return query as IWorkQuery;
    } catch (error: any) {
      console.error('❌ Error fetching work query by ID:', error);
      return null;
    }
  }

  // GET WORK QUERY BY QUERYID
  async getWorkQueryByQueryId(queryId: string): Promise<IWorkQuery | null> {
    try {
      console.log(`🔍 Fetching work query by queryId: ${queryId}`);
      
      const query = await WorkQuery.findOne({ queryId }).lean();
      
      if (!query) {
        console.log(`❌ Query with queryId ${queryId} not found`);
        return null;
      }
      
      console.log(`✅ Query ${queryId} found with ${query.images?.length || 0} images`);
      return query as IWorkQuery;
    } catch (error: any) {
      console.error('❌ Error fetching work query by queryId:', error);
      return null;
    }
  }
  
  // UPDATE QUERY STATUS
  async updateQueryStatus(
    queryId: string, 
    status: string, 
    resolution?: string
  ): Promise<IWorkQuery | null> {
    try {
      console.log(`🔄 Updating query ${queryId} status to ${status}`);
      
      const updateData: any = {
        status,
        updatedAt: new Date()
      };
      
      if (resolution) {
        updateData.superadminResponse = resolution;
        updateData.responseDate = new Date();
      }
      
      const query = await WorkQuery.findByIdAndUpdate(
        queryId,
        updateData,
        { new: true }
      );
      
      if (!query) {
        console.log(`❌ Query ${queryId} not found`);
        return null;
      }
      
      console.log(`✅ Query ${queryId} updated successfully`);
      return query;
    } catch (error: any) {
      console.error('❌ Error updating query status:', error);
      return null;
    }
  }
  
  // ADD COMMENT
  async addComment(
    queryId: string, 
    commentData: CommentData
  ): Promise<IWorkQuery | null> {
    try {
      console.log(`💬 Adding comment to query ${queryId}`);
      
      const comment = {
        userId: commentData.userId,
        name: commentData.name,
        comment: commentData.comment,
        timestamp: new Date()
      };
      
      const query = await WorkQuery.findByIdAndUpdate(
        queryId,
        {
          $push: { comments: comment },
          $set: { updatedAt: new Date() }
        },
        { new: true }
      );
      
      if (!query) {
        console.log(`❌ Query ${queryId} not found`);
        return null;
      }
      
      console.log(`✅ Comment added to query ${queryId}`);
      return query;
    } catch (error: any) {
      console.error('❌ Error adding comment:', error);
      return null;
    }
  }
  
  // ASSIGN QUERY
  async assignQuery(
    queryId: string, 
    assignData: AssignData
  ): Promise<IWorkQuery | null> {
    try {
      console.log(`👤 Assigning query ${queryId} to ${assignData.name}`);
      
      const query = await WorkQuery.findByIdAndUpdate(
        queryId,
        {
          $set: {
            assignedTo: {
              userId: assignData.userId,
              name: assignData.name,
              role: assignData.role || 'staff'
            },
            updatedAt: new Date()
          }
        },
        { new: true }
      );
      
      if (!query) {
        console.log(`❌ Query ${queryId} not found`);
        return null;
      }
      
      console.log(`✅ Query ${queryId} assigned successfully`);
      return query;
    } catch (error: any) {
      console.error('❌ Error assigning query:', error);
      return null;
    }
  }

  // DELETE WORK QUERY
  async deleteWorkQuery(id: string): Promise<IWorkQuery | null> {
    try {
      console.log(`🗑️ Deleting work query: ${id}`);
      
      const query = await WorkQuery.findByIdAndDelete(id);
      
      if (!query) {
        console.log(`❌ Query ${id} not found`);
        return null;
      }
      
      console.log(`✅ Query ${id} deleted successfully`);
      return query;
    } catch (error: any) {
      console.error('❌ Error deleting work query:', error);
      return null;
    }
  }
  // services/workQuery.service.ts - Add these methods

// GET ALL WORK QUERIES FOR SUPERADMIN
async getAllWorkQueriesForSuperadmin(filters: FilterParams): Promise<{ queries: IWorkQuery[]; total: number }> {
  try {
    console.log('🔍 Fetching all work queries for superadmin');
    console.log('📋 Filters:', filters);
    
    // Build query
    const query: any = {};
    
    // Apply search filter
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { queryId: { $regex: filters.search, $options: 'i' } },
        { serviceId: { $regex: filters.search, $options: 'i' } },
        { supervisorName: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }
    
    // Apply priority filter
    if (filters.priority && filters.priority !== 'all') {
      query.priority = filters.priority;
    }
    
    // Apply service type filter
    if (filters.serviceType && filters.serviceType !== 'all') {
      query.serviceType = filters.serviceType;
    }
    
    // Apply supervisor filter
    if (filters.supervisorId) {
      query.supervisorId = filters.supervisorId;
    }
    
    console.log('🔍 MongoDB query:', JSON.stringify(query, null, 2));
    
    // Calculate skip for pagination
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;
    
    // Determine sort order
    const sort: any = {};
    if (filters.sortBy) {
      sort[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }
    
    // Execute query
    const [queries, total] = await Promise.all([
      WorkQuery.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      WorkQuery.countDocuments(query)
    ]);
    
    console.log(`✅ Found ${queries.length} queries out of ${total}`);
    
    return {
      queries: queries as IWorkQuery[],
      total
    };
  } catch (error: any) {
    console.error('❌ Error getting all work queries for superadmin:', error);
    return {
      queries: [],
      total: 0
    };
  }
}

// GET SUPERADMIN STATISTICS
async getSuperadminStatistics(): Promise<any> {
  try {
    console.log('📊 Getting superadmin statistics');
    
    // Get all queries
    const queries = await WorkQuery.find().lean();
    
    // Calculate status counts
    const statusCounts = {
      pending: queries.filter((q: any) => q.status === 'pending').length,
      'in-progress': queries.filter((q: any) => q.status === 'in-progress').length,
      resolved: queries.filter((q: any) => q.status === 'resolved').length,
      rejected: queries.filter((q: any) => q.status === 'rejected').length
    };
    
    // Calculate priority counts
    const priorityCounts = {
      low: queries.filter((q: any) => q.priority === 'low').length,
      medium: queries.filter((q: any) => q.priority === 'medium').length,
      high: queries.filter((q: any) => q.priority === 'high').length,
      critical: queries.filter((q: any) => q.priority === 'critical').length
    };
    
    // Calculate supervisor stats
    const supervisorMap = new Map();
    queries.forEach((q: any) => {
      const supervisorId = q.supervisorId;
      const supervisorName = q.supervisorName;
      
      if (!supervisorMap.has(supervisorId)) {
        supervisorMap.set(supervisorId, {
          supervisorId,
          supervisorName,
          total: 0,
          pending: 0,
          resolved: 0
        });
      }
      
      const stats = supervisorMap.get(supervisorId);
      stats.total++;
      if (q.status === 'pending') stats.pending++;
      if (q.status === 'resolved') stats.resolved++;
    });
    
    const supervisorStats = Array.from(supervisorMap.values());
    
    return {
      total: queries.length,
      statusCounts,
      priorityCounts,
      supervisorStats
    };
  } catch (error: any) {
    console.error('❌ Error getting superadmin statistics:', error);
    return {
      total: 0,
      statusCounts: {
        pending: 0,
        'in-progress': 0,
        resolved: 0,
        rejected: 0
      },
      priorityCounts: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      supervisorStats: []
    };
  }
}

  // GET SERVICES BY SUPERVISOR
  async getServicesBySupervisor(supervisorId: string): Promise<any[]> {
    try {
      console.log(`🔍 Getting services for supervisor: ${supervisorId}`);
      
      // Return mock services for now
      // Replace with actual database query
      const mockServices = [
        {
          _id: '1',
          serviceId: 'CLEAN001',
          type: 'cleaning',
          title: 'Office Floor Deep Cleaning',
          description: 'Complete deep cleaning of office floor',
          location: 'Floor 3',
          assignedTo: 'STAFF001',
          assignedToName: 'Ramesh Kumar',
          status: 'in-progress',
          schedule: '2024-02-15T09:00:00',
          supervisorId: 'SUP001'
        },
        {
          _id: '2',
          serviceId: 'WASTE001',
          type: 'waste-management',
          title: 'Biomedical Waste Collection',
          description: 'Urgent collection and disposal',
          location: 'Clinic Wing',
          assignedTo: 'STAFF002',
          assignedToName: 'Suresh Patel',
          status: 'pending',
          schedule: '2024-02-15T14:00:00',
          supervisorId: 'SUP001'
        }
      ];
      
      return mockServices.filter(service => service.supervisorId === supervisorId);
    } catch (error) {
      console.error('Error getting services:', error);
      return [];
    }
  }
}

// Export the service instance
const workQueryService = new WorkQueryService();
export { WorkQueryService, workQueryService };