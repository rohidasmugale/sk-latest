// src/services/inventoryService.ts
import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');


// InventoryItem Interface - matches backend model
export interface InventoryItem {
  _id: string;
  sku: string;
  name: string;
  department: string;
  category: string;
  site: string;
  assignedManager: string;
  quantity: number;
  price: number;
  costPrice: number;
  supplier: string;
  reorderLevel: number;
  description?: string;
  brushCount?: number;
  squeegeeCount?: number;
  changeHistory: Array<{
    date: string;
    change: string;
    user: string;
    quantity: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

// Helper interface for frontend compatibility
export interface FrontendInventoryItem extends Omit<InventoryItem, '_id'> {
  id: string;
}

// Inventory Stats Interface
export interface InventoryStats {
  totalItems: number;
  lowStockItems: number;
  totalValue: number;
  itemsByDepartment?: Array<{
    _id: string;
    count: number;
    totalValue: number;
  }>;
  topCategories?: Array<{
    _id: string;
    count: number;
  }>;
  recentItems?: InventoryItem[];
  averageQuantity?: number;
}

// API Response Interface
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Inventory API Request] ${config.method?.toUpperCase()} ${config.url}`);
      if (config.params) {
        console.log('[Inventory API Request Params]', config.params);
      }
    }
    return config;
  },
  (error) => {
    console.error('[Inventory API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Inventory API Response] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    console.error('[Inventory API Error]', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

// Helper function to convert backend item to frontend item
const convertToFrontendItem = (item: InventoryItem): FrontendInventoryItem => {
  return {
    ...item,
    id: item._id
  };
};

// Main Inventory Service
class InventoryService {
  // ========== ITEM METHODS ==========

  // Get all items with optional filters
  async getItems(filters?: {
    search?: string;
    department?: string;
    category?: string;
    site?: string;
    page?: number;
    limit?: number;
    assignedManager?: string;
    [key: string]: any;
  }): Promise<FrontendInventoryItem[]> {
    try {
      // Build query params
      const params: Record<string, any> = {};
      
      // Add all filters to query parameters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '' && value !== 'all') {
            params[key] = value;
          }
        });
      }
      
      console.log('Fetching inventory items with filters:', filters);
      console.log('Request params:', params);
      
      // ✅ FIXED: Pass params in the config object
      const response = await api.get<ApiResponse<InventoryItem[]>>('/inventory', { 
        params 
      });
      
      // Convert backend items to frontend items
      const backendItems = response.data.data || [];
      const frontendItems = backendItems.map(item => convertToFrontendItem(item));
      
      console.log(`Fetched ${frontendItems.length} inventory items`);
      
      // Debug: Check if items belong to the filtered manager
      if (filters?.assignedManager && frontendItems.length > 0) {
        const wrongItems = frontendItems.filter(item => item.assignedManager !== filters.assignedManager);
        if (wrongItems.length > 0) {
          console.warn(`WARNING: Found ${wrongItems.length} items not assigned to ${filters.assignedManager}!`);
        }
      }
      
      return frontendItems;
    } catch (error) {
      console.error('Failed to fetch items:', error);
      return [];
    }
  }

  // Get single item by ID
  async getItem(id: string): Promise<FrontendInventoryItem | null> {
    try {
      const response = await api.get<ApiResponse<InventoryItem>>(`/inventory/${id}`);
      
      if (response.data.data) {
        return convertToFrontendItem(response.data.data);
      }
      return null;
    } catch (error) {
      console.error(`Failed to fetch item ${id}:`, error);
      return null;
    }
  }

  // Create new item
  async createItem(itemData: Omit<FrontendInventoryItem, 'id' | '_id' | 'createdAt' | 'updatedAt'>): Promise<FrontendInventoryItem> {
    try {
      // Convert to backend format (remove id if present)
      const { id, ...backendItem } = itemData as any;
      
      const response = await api.post<ApiResponse<InventoryItem>>('/inventory', backendItem);
      
      return convertToFrontendItem(response.data.data);
    } catch (error: any) {
      console.error('Failed to create item:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create item');
    }
  }

  // Update existing item
  async updateItem(id: string, updates: Partial<FrontendInventoryItem>): Promise<FrontendInventoryItem> {
    try {
      // Convert to backend format
      const { _id, ...updateData } = updates as any;
      
      const response = await api.put<ApiResponse<InventoryItem>>(`/inventory/${id}`, updateData);
      
      return convertToFrontendItem(response.data.data);
    } catch (error: any) {
      console.error(`Failed to update item ${id}:`, error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update item');
    }
  }

  // Delete item
  async deleteItem(id: string): Promise<boolean> {
    try {
      const response = await api.delete<ApiResponse<{ id: string }>>(`/inventory/${id}`);
      return response.data.success;
    } catch (error) {
      console.error(`Failed to delete item ${id}:`, error);
      return false;
    }
  }

  // ========== STATISTICS ==========

  // Get inventory statistics
  async getStats(): Promise<InventoryStats> {
    try {
      const response = await api.get<ApiResponse<InventoryStats>>('/inventory/stats');
      
      if (response.data.data) {
        return response.data.data;
      }
      
      // Return default stats if no data
      return {
        totalItems: 0,
        lowStockItems: 0,
        totalValue: 0
      };
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Return default stats
      return {
        totalItems: 0,
        lowStockItems: 0,
        totalValue: 0
      };
    }
  }

  // Get low stock items
  async getLowStockItems(): Promise<FrontendInventoryItem[]> {
    try {
      const response = await api.get<ApiResponse<InventoryItem[]>>('/inventory/low-stock');
      
      // Convert backend items to frontend items
      const backendItems = response.data.data || [];
      const frontendItems = backendItems.map(item => convertToFrontendItem(item));
      return frontendItems;
    } catch (error) {
      console.error('Failed to fetch low stock items:', error);
      return [];
    }
  }

  // ========== BULK OPERATIONS ==========

  // Import items from CSV/JSON
  async importItems(items: FrontendInventoryItem[]): Promise<{ imported: number; failed: number; errors?: string[] }> {
    try {
      // Convert to backend format
      const backendItems = items.map(item => {
        const { id, ...rest } = item;
        return rest;
      });
      
      const response = await api.post<ApiResponse<{ imported: number; failed: number; errors?: string[] }>>('/inventory/import', backendItems);
      
      return response.data.data || { imported: 0, failed: 0 };
    } catch (error: any) {
      console.error('Failed to import items:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to import items');
    }
  }

  // Import items from CSV file
  async importItemsFromFile(file: File): Promise<{ imported: number; failed: number; errors?: string[] }> {
    try {
      // Read the CSV file
      const text = await file.text();
      const lines = text.split('\n');
      
      // Parse CSV (simple implementation)
      const items: Partial<FrontendInventoryItem>[] = [];
      const headers = lines[0].split(',').map(h => h.trim());
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const values = lines[i].split(',').map(v => v.trim());
        const item: any = {};
        
        headers.forEach((header, index) => {
          if (header && values[index]) {
            // Convert numeric fields
            if (['quantity', 'price', 'costPrice', 'reorderLevel', 'brushCount', 'squeegeeCount'].includes(header)) {
              item[header] = parseFloat(values[index]) || 0;
            } else {
              item[header] = values[index];
            }
          }
        });
        
        items.push(item);
      }
      
      // Send to backend
      return await this.importItems(items as FrontendInventoryItem[]);
    } catch (error: any) {
      console.error('Failed to parse CSV file:', error);
      throw new Error('Invalid CSV file format');
    }
  }

  // ========== HELPER METHODS ==========

  // Format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  // Check if item is low stock
  isLowStock(item: FrontendInventoryItem): boolean {
    return item.quantity <= item.reorderLevel;
  }

  // Calculate item value
  calculateItemValue(item: FrontendInventoryItem): number {
    return item.quantity * item.costPrice;
  }

  // Calculate total value for a list of items
  calculateTotalValue(items: FrontendInventoryItem[]): number {
    return items.reduce((sum, item) => {
      return sum + (item.quantity * item.costPrice);
    }, 0);
  }

  // Generate next SKU (optional helper)
  generateNextSKU(lastSKU: string): string {
    const match = lastSKU.match(/(\D+)(\d+)/);
    if (match) {
      const prefix = match[1];
      const number = parseInt(match[2]) + 1;
      return `${prefix}${number.toString().padStart(3, '0')}`;
    }
    return 'INV-001';
  }

  // Validate item data
  validateItem(item: Partial<FrontendInventoryItem>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Required fields
    const requiredFields = ['sku', 'name', 'department', 'category', 'site', 'assignedManager', 'quantity', 'price', 'costPrice', 'supplier', 'reorderLevel'];
    requiredFields.forEach(field => {
      if (!item[field as keyof FrontendInventoryItem]) {
        errors.push(`${field} is required`);
      }
    });

    // Numeric validation
    if (item.quantity !== undefined && item.quantity < 0) {
      errors.push('Quantity cannot be negative');
    }
    
    if (item.price !== undefined && item.price < 0) {
      errors.push('Price cannot be negative');
    }
    
    if (item.costPrice !== undefined && item.costPrice < 0) {
      errors.push('Cost price cannot be negative');
    }
    
    if (item.reorderLevel !== undefined && item.reorderLevel < 0) {
      errors.push('Reorder level cannot be negative');
    }

    // SKU format validation
    if (item.sku && !item.sku.match(/^[A-Z0-9\-]+$/)) {
      errors.push('SKU can only contain uppercase letters, numbers, and hyphens');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Format date
  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Export items to CSV
  exportToCSV(items: FrontendInventoryItem[]): string {
    if (items.length === 0) return '';
    
    const headers = [
      'SKU', 'Name', 'Department', 'Category', 'Site', 'Assigned Manager',
      'Quantity', 'Price', 'Cost Price', 'Supplier', 'Reorder Level',
      'Description', 'Brush Count', 'Squeegee Count'
    ];
    
    const rows = items.map(item => [
      item.sku,
      `"${item.name.replace(/"/g, '""')}"`, // Escape quotes in CSV
      item.department,
      item.category,
      item.site,
      item.assignedManager,
      item.quantity.toString(),
      item.price.toString(),
      item.costPrice.toString(),
      item.supplier,
      item.reorderLevel.toString(),
      item.description ? `"${item.description.replace(/"/g, '""')}"` : '',
      item.brushCount?.toString() || '',
      item.squeegeeCount?.toString() || ''
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

// Create and export a singleton instance
export const inventoryService = new InventoryService();

// Also export the class if needed elsewhere
export { InventoryService };