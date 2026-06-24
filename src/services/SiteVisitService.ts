// src/services/SiteVisitService.ts
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');

export interface Site {
  _id: string;
  name: string;
  clientName: string;
  location: string;
  status: string;
  lastVisited?: Date;
  visitCount: number;
  managerCount?: number;
  supervisorCount?: number;
}

export interface WorkQuery {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  _id?: string;
  createdAt?: Date;
  resolvedAt?: Date;
  resolution?: string;
}

export interface SiteVisitReport {
  _id: string;
  siteId: string;
  siteName: string;
  managerId: string;
  managerName: string;
  visitDate: Date;
  photos: Array<{ url: string; filename: string; uploadedAt: Date; size?: number }>;
  workQueries: WorkQuery[];
  updates: Array<{ content: string; timestamp: Date; type: string }>;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MonthlyReportStats {
  totalReports: number;
  approvedReports: number;
  pendingReports: number;
  rejectedReports: number;
  uniqueManagers: number;
  uniqueSites: number;
  byManager: Array<{
    managerId: string;
    managerName: string;
    visits: any[];
    totalVisits: number;
  }>;
  byDate: Record<string, number>;
}

class SiteVisitService {
  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Get all sites assigned to a manager
  async getManagerSites(managerId: string): Promise<Site[]> {
    try {
      console.log(`Fetching sites for manager: ${managerId}`);
      const response = await fetch(`${API_URL}/site-visits/manager/${managerId}/sites`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sites: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching manager sites:', error);
      return [];
    }
  }

  // Get manager's reports
  async getManagerReports(managerId: string, filters?: {
    siteId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<SiteVisitReport[]> {
    try {
      let url = `${API_URL}/site-visits/manager/${managerId}/reports`;
      
      const params = new URLSearchParams();
      if (filters?.siteId) params.append('siteId', filters.siteId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching manager reports:', error);
      return [];
    }
  }

  // Create a site visit report
  async createReport(
    reportData: Omit<SiteVisitReport, '_id' | 'status' | 'createdAt' | 'updatedAt'>,
    photos: File[]
  ): Promise<SiteVisitReport> {
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify(reportData));
      
      photos.forEach((photo, index) => {
        formData.append('photos', photo);
      });
      
      const url = `${API_URL}/site-visits/reports`;
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create report: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error('Error creating report:', error);
      throw error;
    }
  }

  // Get monthly reports (SuperAdmin)
  async getMonthlyReports(year: number, month: number, filters?: {
    managerId?: string;
    siteId?: string;
    status?: string;
  }): Promise<{ reports: SiteVisitReport[]; stats: MonthlyReportStats }> {
    try {
      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
        ...(filters?.managerId && { managerId: filters.managerId }),
        ...(filters?.siteId && { siteId: filters.siteId }),
        ...(filters?.status && { status: filters.status })
      });
      
      const response = await fetch(`${API_URL}/site-visits/reports/monthly?${params}`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch monthly reports: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        reports: data.data || [],
        stats: data.stats || {
          totalReports: 0,
          approvedReports: 0,
          pendingReports: 0,
          rejectedReports: 0,
          uniqueManagers: 0,
          uniqueSites: 0,
          byManager: [],
          byDate: {}
        }
      };
    } catch (error) {
      console.error('Error fetching monthly reports:', error);
      return { reports: [], stats: {
        totalReports: 0,
        approvedReports: 0,
        pendingReports: 0,
        rejectedReports: 0,
        uniqueManagers: 0,
        uniqueSites: 0,
        byManager: [],
        byDate: {}
      }};
    }
  }

  // Get statistics (SuperAdmin)
  async getStatistics(year?: number, month?: number, managerId?: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (year) params.append('year', year.toString());
      if (month !== undefined) params.append('month', month.toString());
      if (managerId) params.append('managerId', managerId);
      
      const response = await fetch(`${API_URL}/site-visits/statistics?${params}`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch statistics: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || {
        dailyVisits: [],
        statusBreakdown: [],
        managerPerformance: [],
        sitePopularity: [],
        totalVisits: 0
      };
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return {
        dailyVisits: [],
        statusBreakdown: [],
        managerPerformance: [],
        sitePopularity: [],
        totalVisits: 0
      };
    }
  }

  // Get managers with visit history (SuperAdmin)
  async getManagersVisits(year?: number, month?: number): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (year) params.append('year', year.toString());
      if (month !== undefined) params.append('month', month.toString());
      
      const response = await fetch(`${API_URL}/site-visits/managers/visits?${params}`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch manager visits: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || { managers: [], sites: [], totalVisits: 0 };
    } catch (error) {
      console.error('Error fetching manager visits:', error);
      return { managers: [], sites: [], totalVisits: 0 };
    }
  }

  // Approve report (SuperAdmin)
  async approveReport(reportId: string, approvedBy: string): Promise<SiteVisitReport> {
    try {
      const response = await fetch(`${API_URL}/site-visits/reports/${reportId}/approve`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ approvedBy })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to approve report: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error('Error approving report:', error);
      throw error;
    }
  }

  // Reject report (SuperAdmin)
  async rejectReport(reportId: string, rejectionReason: string): Promise<SiteVisitReport> {
    try {
      const response = await fetch(`${API_URL}/site-visits/reports/${reportId}/reject`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ rejectionReason })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to reject report: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error('Error rejecting report:', error);
      throw error;
    }
  }
}

export const siteVisitService = new SiteVisitService();
export default siteVisitService;