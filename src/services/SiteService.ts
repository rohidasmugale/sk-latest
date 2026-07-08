// services/SiteService.ts

// Define interfaces
export interface Site {
  _id: string;
  name: string;
  clientId?: string;
  clientName: string;
  clientDetails?: {
    company: string;
    email: string;
    phone: string;
    city: string;
    state: string;
  };
  location: string;
  areaSqft: number;
  manager?:string;
  managerCount?: number; // ADD THIS
  supervisorCount?: number; // ADD THIS
  services: string[];
  staffDeployment: Array<{ role: string; count: number }>;
  contractValue: number;
  contractEndDate: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface Client {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  state: string;
}

export interface CreateSiteRequest {
  name: string;
  clientName: string;
  clientId?: string;
  location: string;
  areaSqft: number;
  managerCount?: number; // ADD THIS
  supervisorCount?: number; // ADD THIS
  contractValue: number;
  contractEndDate: string;
  services: string[];
  staffDeployment: Array<{ role: string; count: number }>;
  status: 'active' | 'inactive';
}

export interface UpdateSiteRequest extends Partial<CreateSiteRequest> {}

export interface SiteStats {
  totalSites: number;
  totalStaff: number;
  activeSites: number;
  inactiveSites: number;
  totalContractValue: number;
  stats?: Array<{
    _id: string;
    count: number;
    totalContractValue?: number;
  }>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface SearchParams {
  query?: string;
  status?: string;
}

// Error handling utility
class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');

// Default stats
const defaultStats: SiteStats = {
  totalSites: 0,
  totalStaff: 0,
  activeSites: 0,
  inactiveSites: 0,
  totalContractValue: 0
};

// API Service Class
class SiteService {
  static getAllSites() {
    throw new Error("Method not implemented.");
  }
  // Generic fetch method with error handling
  private async fetchApi<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    
    console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`, options.body ? { body: JSON.parse(options.body as string) } : '');
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const responseText = await response.text();
      console.log(`📥 Response from ${url}:`, responseText);
      
      let data: ApiResponse<T>;
      
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error(`❌ Failed to parse JSON from ${url}:`, responseText);
        // If the response is already an array, wrap it in success response
        try {
          const parsedArray = JSON.parse(responseText);
          if (Array.isArray(parsedArray)) {
            console.log('✅ Response is already an array, wrapping in success response');
            return parsedArray as T;
          }
        } catch {
          // Not an array either
        }
        throw new ApiError(`Invalid JSON response from server: ${responseText.substring(0, 100)}`);
      }

      if (!response.ok) {
        console.error(`❌ API Error [${response.status}]:`, data);
        throw new ApiError(
          data.message || data.error || `http error! status: ${response.status}`,
          response.status,
          data
        );
      }

      // Handle different response formats
      if (data.success === false && data.error) {
        console.error(`❌ API Error:`, data.error);
        throw new ApiError(data.error, response.status, data);
      }

      // Extract data from response - handle both { data: [...] } and direct array
      let resultData: any;
      
      if (data.data !== undefined) {
        // Format: { success: true, data: [...] }
        resultData = data.data;
      } else if (data.success !== undefined) {
        // Format: { success: true, ...otherProps }
        resultData = data;
      } else if (Array.isArray(data)) {
        // Direct array response
        resultData = data;
      } else {
        // Try to extract data from any property
        const keys = Object.keys(data);
        if (keys.length === 1 && Array.isArray(data[keys[0]])) {
          resultData = data[keys[0]];
        } else {
          resultData = data;
        }
      }

      console.log(`✅ API Success [${url}]:`, Array.isArray(resultData) ? `${resultData.length} items` : 'object');
      return resultData as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error) {
        console.error(`❌ Network Error:`, error.message);
        throw new ApiError(`Network error: ${error.message}`);
      }
      throw new ApiError('Unknown error occurred');
    }
  }

  // Site-related methods
  // services/SiteService.ts - Fix the getAllSites method

async getAllSites(): Promise<Site[]> {
  try {
    console.log('📡 Fetching all sites...');
    
    const token = localStorage.getItem('sk_token');
    const response = await fetch(`${API_URL}/sites`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    console.log('📡 Raw sites data:', data);
    
    // Handle different response formats
    let sitesArray = [];
    if (data.success && Array.isArray(data.data)) {
      sitesArray = data.data;
    } else if (Array.isArray(data)) {
      sitesArray = data;
    } else if (Array.isArray(data.sites)) {
      sitesArray = data.sites;
    } else {
      console.warn('⚠️ Unknown response format:', data);
      return [];
    }
    
    // Transform to Site interface
    const transformedSites = sitesArray.map((site: any) => ({
      _id: site._id || site.id || `site-${Date.now()}`,
      name: site.name || 'Unnamed Site',
      clientName: site.clientName || site.client || 'Unknown Client',
      clientId: site.clientId || '',
      location: site.location || 'Unknown Location',
      areaSqft: Number(site.areaSqft || site.area || 0),
      manager: site.manager || '',
      managerCount: Number(site.managerCount || 0),
      supervisorCount: Number(site.supervisorCount || 0),
      services: Array.isArray(site.services) ? site.services : [],
      staffDeployment: Array.isArray(site.staffDeployment) ? site.staffDeployment : [],
      contractValue: Number(site.contractValue || site.contract || 0),
      contractEndDate: site.contractEndDate || site.endDate || new Date().toISOString(),
      status: site.status === 'inactive' ? 'inactive' : 'active',
      createdAt: site.createdAt || site.created || new Date().toISOString(),
      updatedAt: site.updatedAt || site.updated || new Date().toISOString()
    }));
    
    console.log(`✅ Transformed ${transformedSites.length} sites`);
    return transformedSites;
  } catch (error) {
    console.error('❌ Error fetching sites:', error);
    return [];
  }
}

  async getSiteById(siteId: string): Promise<Site | null> {
    try {
      const site = await this.fetchApi<any>(`/sites/${siteId}`);
      return this.transformSiteData(site);
    } catch (error) {
      console.error(`Error fetching site ${siteId}:`, error);
      return null;
    }
  }

  async createSite(siteData: CreateSiteRequest): Promise<Site | null> {
    try {
      // Clean the data to prevent duplicate ID issues
      const cleanData = this.cleanSiteData(siteData);
      console.log('📤 Creating site with clean data:', cleanData);
      
      const response = await this.fetchApi<any>('/sites', {
        method: 'POST',
        body: JSON.stringify(cleanData),
      });
      
      return this.transformSiteData(response);
    } catch (error) {
      console.error('Error creating site:', error);
      throw error;
    }
  }

  async updateSite(siteId: string, siteData: UpdateSiteRequest): Promise<Site | null> {
    try {
      // Clean the data to prevent duplicate ID issues
      const cleanData = this.cleanSiteData(siteData);
      console.log(`🔄 Updating site ${siteId} with clean data:`, cleanData);
      
      const response = await this.fetchApi<any>(`/sites/${siteId}`, {
        method: 'PUT',
        body: JSON.stringify(cleanData),
      });
      
      return this.transformSiteData(response);
    } catch (error) {
      console.error(`Error updating site ${siteId}:`, error);
      throw error;
    }
  }

  async deleteSite(siteId: string): Promise<{ success: boolean; message: string } | null> {
    try {
      return await this.fetchApi<{ success: boolean; message: string }>(`/sites/${siteId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error(`Error deleting site ${siteId}:`, error);
      throw error;
    }
  }

  async toggleSiteStatus(siteId: string): Promise<Site | null> {
    try {
      const response = await this.fetchApi<any>(`/sites/${siteId}/toggle-status`, {
        method: 'PATCH',
      });
      
      return this.transformSiteData(response);
    } catch (error) {
      console.error(`Error toggling status for site ${siteId}:`, error);
      throw error;
    }
  }

  // Site search and filtering
  async searchSites(params: SearchParams): Promise<Site[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.query) {
        queryParams.append('query', params.query);
      }
      
      if (params.status && params.status !== 'all') {
        queryParams.append('status', params.status);
      }
      
      const endpoint = queryParams.toString() 
        ? `/sites/search?${queryParams.toString()}`
        : '/sites/search';
      
      console.log('🔍 Searching sites with params:', params);
      const results = await this.fetchApi<any[]>(endpoint);
      const transformedResults = this.transformSitesData(results);
      console.log(`🔍 Found ${transformedResults.length} sites`);
      return transformedResults;
    } catch (error) {
      console.error('Error searching sites:', error);
      return [];
    }
  }

  // Site statistics
  async getSiteStats(): Promise<SiteStats> {
    try {
      console.log('📊 Fetching site stats...');
      const statsData = await this.fetchApi<any>('/sites/stats');
      console.log('📊 Raw stats data:', statsData);
      
      // Transform stats data
      const transformedStats = this.transformStatsData(statsData);
      console.log('📊 Transformed stats:', transformedStats);
      return transformedStats;
    } catch (error) {
      console.warn('⚠️ Failed to fetch stats from server, returning default stats');
      return defaultStats;
    }
  }

  // Client-related methods
  async getAllClients(): Promise<Client[]> {
    try {
      console.log('👥 Fetching all clients...');
      const clients = await this.fetchApi<any[]>('/clients');
      console.log(`👥 Raw clients data:`, clients);
      
      // Transform data to ensure it matches Client interface
      const transformedClients = this.transformClientsData(clients);
      console.log(`👥 Transformed ${transformedClients.length} clients`);
      return transformedClients;
    } catch (error) {
      // If clients endpoint doesn't exist, return empty array
      if (error instanceof ApiError && error.status === 404) {
        console.warn('👥 Clients endpoint not found, returning empty array');
      } else {
        console.error('❌ Error fetching clients:', error);
      }
      return [];
    }
  }

  async searchClients(query: string): Promise<Client[]> {
    try {
      console.log(`🔍 Searching clients with query: "${query}"`);
      const results = await this.fetchApi<any[]>(`/clients/search?query=${encodeURIComponent(query)}`);
      const transformedResults = this.transformClientsData(results);
      console.log(`🔍 Found ${transformedResults.length} clients`);
      return transformedResults;
    } catch (error) {
      // If search fails, return empty array
      console.warn('⚠️ Client search failed, returning empty array');
      return [];
    }
  }

  // Data transformation methods
  private transformSitesData(data: any[]): Site[] {
    if (!Array.isArray(data)) {
      console.warn('⚠️ Sites data is not an array:', data);
      return [];
    }
    
    return data.map(item => this.transformSiteData(item)).filter(Boolean) as Site[];
  }

  // In your SiteService.ts, update the transformSiteData method:

private transformSiteData(data: any): Site | null {
  if (!data) return null;
  
  console.log('🔧 Transforming site data:', data);
  
  // Handle different data structures
  const siteData = data.data || data;
  
  return {
    _id: siteData._id || siteData.id || `temp-${Date.now()}`,
    name: siteData.name || 'Unnamed Site',
    clientId: siteData.clientId || '',
    clientName: siteData.clientName || 'Unknown Client',
    clientDetails: siteData.clientDetails || siteData.client,
    location: siteData.location || 'Unknown Location',
    areaSqft: Number(siteData.areaSqft || siteData.area || 0),
    
    // Existing manager field
    manager: siteData.manager || '',
    
    // NEW: Manager and Supervisor limits
    managerCount: Number(siteData.managerCount || 0), // ADD THIS
    supervisorCount: Number(siteData.supervisorCount || 0), // ADD THIS
    
    services: Array.isArray(siteData.services) ? siteData.services : [],
    staffDeployment: Array.isArray(siteData.staffDeployment) ? siteData.staffDeployment : [],
    contractValue: Number(siteData.contractValue || siteData.contract || 0),
    contractEndDate: siteData.contractEndDate || siteData.endDate || new Date().toISOString(),
    status: (siteData.status === 'inactive' || siteData.status === 'inactive') ? 'inactive' : 'active',
    createdAt: siteData.createdAt || siteData.created || new Date().toISOString(),
    updatedAt: siteData.updatedAt || siteData.updated || new Date().toISOString()
  };
}

  private transformClientsData(data: any[]): Client[] {
    if (!Array.isArray(data)) {
      console.warn('⚠️ Clients data is not an array:', data);
      return [];
    }
    
    return data.map(item => ({
      _id: item._id || item.id || `client-${Date.now()}`,
      name: item.name || 'Unknown Client',
      company: item.company || item.business || '',
      email: item.email || '',
      phone: item.phone || item.mobile || '',
      city: item.city || '',
      state: item.state || item.region || ''
    })).filter(Boolean);
  }

  private transformStatsData(data: any): SiteStats {
    console.log('🔧 Transforming stats data:', data);
    
    // Check if data has the expected structure
    if (data.totalSites !== undefined) {
      // Already in correct format
      return {
        totalSites: data.totalSites || 0,
        totalStaff: data.totalStaff || 0,
        activeSites: data.activeSites || 0,
        inactiveSites: data.inactiveSites || 0,
        totalContractValue: data.totalContractValue || 0
      };
    }
    
    // Try to extract from nested structure
    if (data.data) {
      const stats = data.data;
      return {
        totalSites: stats.totalSites || 0,
        totalStaff: stats.totalStaff || 0,
        activeSites: stats.activeSites || 0,
        inactiveSites: stats.inactiveSites || 0,
        totalContractValue: stats.totalContractValue || 0
      };
    }
    
    // Try to calculate from stats array
    if (Array.isArray(data.stats)) {
      const activeStat = data.stats.find((s: any) => s._id === 'active');
      const inactiveStat = data.stats.find((s: any) => s._id === 'inactive');
      
      return {
        totalSites: data.totalSites || 0,
        totalStaff: data.totalStaff || 0,
        activeSites: activeStat?.count || 0,
        inactiveSites: inactiveStat?.count || 0,
        totalContractValue: data.stats.reduce((sum: number, stat: any) => 
          sum + (stat.totalContractValue || 0), 0)
      };
    }
    
    console.warn('⚠️ Could not parse stats data, returning defaults');
    return defaultStats;
  }

  // Utility methods
  private cleanSiteData(data: any): any {
    if (!data) return {};
    
    console.log('🧹 Cleaning site data:', data);
    
    // Create a clean copy without any MongoDB ID fields
    const cleanData = { ...data };
    
    // Remove any ID fields that might cause duplicate key errors
    delete cleanData._id;
    delete cleanData.id;
    delete cleanData.__v;
    
    // Ensure staffDeployment is properly formatted
    if (Array.isArray(cleanData.staffDeployment)) {
      cleanData.staffDeployment = cleanData.staffDeployment
        .filter(item => item && item.count > 0)
        .map(item => ({
          role: item.role || '',
          count: Number(item.count) || 0
        }));
    } else {
      cleanData.staffDeployment = [];
    }
    
    // Ensure services is an array
    if (!Array.isArray(cleanData.services)) {
      cleanData.services = [];
    }
    
    // Ensure numeric fields are numbers
    cleanData.areaSqft = Number(cleanData.areaSqft) || 0;
    cleanData.contractValue = Number(cleanData.contractValue) || 0;
    
    // Ensure required string fields
    cleanData.name = cleanData.name?.trim() || '';
    cleanData.clientName = cleanData.clientName?.trim() || '';
    cleanData.location = cleanData.location?.trim() || '';
    cleanData.status = cleanData.status === 'inactive' ? 'inactive' : 'active';
    
    // Ensure contract date is valid
    if (!cleanData.contractEndDate) {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      cleanData.contractEndDate = futureDate.toISOString().split('T')[0];
    }
    
    console.log('✅ Cleaned site data:', cleanData);
    return cleanData;
  }

  // Validation methods
  validateSiteData(data: CreateSiteRequest): string[] {
    const errors: string[] = [];
    
    if (!data?.name?.trim()) {
      errors.push('Site name is required');
    }
    
    if (!data?.clientName?.trim()) {
      errors.push('Client name is required');
    }
    
    if (!data?.location?.trim()) {
      errors.push('Location is required');
    }
    
    if (!data?.areaSqft || data.areaSqft <= 0) {
      errors.push('Valid area is required');
    }
    
    if (!data?.contractValue || data.contractValue < 0) {
      errors.push('Valid contract value is required');
    }
    
    if (!data?.contractEndDate) {
      errors.push('Contract end date is required');
    }
    
    return errors;
  }

  // Formatting utilities (can also be used in components)
  formatCurrency(amount: number | undefined): string {
    const safeAmount = amount || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(safeAmount);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  formatNumber(num: number | undefined): string {
    return ((num || 0)).toLocaleString();
  }

  getTotalStaff(site: Site | null | undefined): number {
    if (!site || !Array.isArray(site.staffDeployment)) return 0;
    return site.staffDeployment.reduce((total, item) => {
      const count = Number(item?.count) || 0;
      return total + count;
    }, 0);
  }

  calculateAverageArea(sites: Site[] | undefined | null): number {
    if (!sites || !Array.isArray(sites) || sites.length === 0) return 0;
    const totalArea = sites.reduce((sum, site) => {
      const area = Number(site?.areaSqft) || 0;
      return sum + area;
    }, 0);
    return totalArea / sites.length;
  }

  // Get total staff across all sites
  getTotalStaffAcrossSites(sites: Site[] | undefined | null): number {
    if (!sites || !Array.isArray(sites)) return 0;
    return sites.reduce((total, site) => {
      return total + this.getTotalStaff(site);
    }, 0);
  }

  // Get total contract value across all sites
  getTotalContractValue(sites: Site[] | undefined | null): number {
    if (!sites || !Array.isArray(sites)) return 0;
    return sites.reduce((total, site) => {
      const value = Number(site?.contractValue) || 0;
      return total + value;
    }, 0);
  }

  // Get active and inactive counts
  getSiteStatusCounts(sites: Site[] | undefined | null): { active: number; inactive: number } {
    if (!sites || !Array.isArray(sites)) return { active: 0, inactive: 0 };
    
    const counts = { active: 0, inactive: 0 };
    sites.forEach(site => {
      if (site?.status === 'inactive') {
        counts.inactive++;
      } else {
        counts.active++;
      }
    });
    
    return counts;
  }

  // Get default stats (for initial state)
  getDefaultStats(): SiteStats {
    return { ...defaultStats };
  }
}

// Create and export singleton instance
export const siteService = new SiteService();

// Alternative: Export class for testing/mocking purposes
export default SiteService;
