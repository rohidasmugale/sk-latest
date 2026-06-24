// services/InvoiceService.ts
// Use a relative URL for API calls - this works for both development and production
// For development: http://localhost:5001/api
// For production: /api (if using proxy) or full URL if deployed separately
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');


export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  unit?: string;
  designation?: string;
  days?: number;
  hours?: number;
}

export interface Invoice {
  // Basic invoice info
  id: string;
  invoiceNumber: string;
  voucherNo?: string;
  invoiceType: 'perform' | 'tax';
  status: 'pending' | 'paid' | 'overdue';
  date: string;
  dueDate?: string;
  
  // User/Role tracking
  createdBy?: string;
  userId?: string;
  sharedWith?: string[];
  
  // Client info
  client: string;
  clientEmail?: string;
  clientAddress?: string;
  
  // Company info
  companyName?: string;
  companyAddress?: string;
  companyGSTIN?: string;
  companyState?: string;
  companyStateCode?: string;
  companyEmail?: string;
  
  // Consignee info
  consignee?: string;
  consigneeAddress?: string;
  consigneeGSTIN?: string;
  consigneeState?: string;
  consigneeStateCode?: string;
  
  // Buyer info
  buyer?: string;
  buyerAddress?: string;
  buyerGSTIN?: string;
  buyerState?: string;
  buyerStateCode?: string;
  
  // Order details
  buyerRef?: string;
  dispatchedThrough?: string;
  paymentTerms?: string;
  notes?: string;
  site?: string;
  destination?: string;
  deliveryTerms?: string;
  serviceType?: string;
  
  // Items
  items: InvoiceItem[];
  
  // Financials
  amount: number;
  subtotal?: number;
  tax: number;
  discount?: number;
  roundUp?: number;
  
  // Tax invoice specific
  managementFeesPercent?: number;
  managementFeesAmount?: number;
  sacCode?: string;
  panNumber?: string;
  gstNumber?: string;
  serviceLocation?: string;
  esicNumber?: string;
  lwfNumber?: string;
  pfNumber?: string;
  servicePeriodFrom?: string;
  servicePeriodTo?: string;
  
  // Bank details
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branch?: string;
  accountHolder?: string;
  branchAndIFSC?: string;
  
  // Additional fields
  amountInWords?: string;
  footerNote?: string;
  termsConditions?: string;
  authorisedSignatory?: string;
  
  // Timestamps (from backend)
  createdAt?: string;
  updatedAt?: string;
}

class InvoiceService {
  private userId: string | null = null;
  private userRole: string | null = null;

  constructor(userId?: string, userRole?: string) {
    if (userId) this.userId = userId;
    if (userRole) this.userRole = userRole;
  }

  // Helper function for API calls
  private async fetchApi(endpoint: string, options?: RequestInit) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`http error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Get all invoices for current user
  async getAllInvoices(): Promise<Invoice[]> {
    try {
      const url = this.userId ? `/invoices?userId=${this.userId}` : '/invoices';
      const data = await this.fetchApi(url);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch invoices');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  }

  // Get invoices by type for current user
  async getInvoicesByType(type: 'perform' | 'tax'): Promise<Invoice[]> {
    try {
      const url = this.userId 
        ? `/invoices/type/${type}?userId=${this.userId}`
        : `/invoices/type/${type}`;
      
      const data = await this.fetchApi(url);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch invoices by type');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching invoices by type:', error);
      throw error;
    }
  }

  // Get invoice by ID with access control
  async getInvoiceById(id: string): Promise<Invoice> {
    try {
      const url = this.userId 
        ? `/invoices/${id}?userId=${this.userId}`
        : `/invoices/${id}`;
      
      const data = await this.fetchApi(url);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch invoice');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw error;
    }
  }

  // Create new invoice
  async createInvoice(invoice: Invoice): Promise<Invoice> {
    try {
      // Add user info to invoice if available
      const invoiceWithUser = {
        ...invoice,
        createdBy: this.userRole || 'superadmin',
        userId: this.userId || undefined
      };
      
      const data = await this.fetchApi('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceWithUser)
      });
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create invoice');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  
  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    try {
      const url = this.userId 
        ? `/invoices/${id}?userId=${this.userId}`
        : `/invoices/${id}`;
      
      const data = await this.fetchApi(url, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update invoice');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  }

  // Mark invoice as paid
  async markAsPaid(id: string): Promise<Invoice> {
    try {
      const data = await this.fetchApi(`/invoices/${id}/mark-paid`, {
        method: 'PATCH'
      });
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to mark invoice as paid');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      throw error;
    }
  }

  // Delete invoice
  async deleteInvoice(id: string): Promise<void> {
    try {
      const url = this.userId 
        ? `/invoices/${id}?userId=${this.userId}`
        : `/invoices/${id}`;
      
      const data = await this.fetchApi(url, {
        method: 'DELETE'
      });
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  }

  // Search invoices
  async searchInvoices(query: string): Promise<Invoice[]> {
    try {
      const url = this.userId 
        ? `/invoices/search/${encodeURIComponent(query)}?userId=${this.userId}`
        : `/invoices/search/${encodeURIComponent(query)}`;
      
      const data = await this.fetchApi(url);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to search invoices');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error searching invoices:', error);
      throw error;
    }
  }

  // Get invoice statistics
  async getInvoiceStats(): Promise<any> {
    try {
      const url = this.userId 
        ? `/invoices/stats/summary?userId=${this.userId}`
        : '/invoices/stats/summary';
      
      const data = await this.fetchApi(url);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get invoice stats');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error getting invoice stats:', error);
      throw error;
    }
  }

  // Share invoice with other users
  async shareInvoice(invoiceId: string, userIds: string[]): Promise<Invoice> {
    try {
      const data = await this.fetchApi(`/invoices/${invoiceId}/share`, {
        method: 'POST',
        body: JSON.stringify({ userIds })
      });
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to share invoice');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error sharing invoice:', error);
      throw error;
    }
  }
}

export default InvoiceService;