// services/expenseService.ts

export interface Expense {
  _id: string;
  siteId: {
    _id: string;
    name: string;
    location: string;
    clientName: string;
  } | string;
  expenseType: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  vendor: string;
  paymentMethod: string;
  customFields?: Array<{
    fieldName: string;
    fieldValue: string;
  }>;
  receiptUrl?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
   status?: "pending" | "approved" | "rejected";
}

export interface CreateExpenseRequest {
  siteId: string;
  expenseType: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  vendor: string;
  paymentMethod: string;
  customFields?: Array<{ fieldName: string; fieldValue: string }>;
}

export interface MonthlyExpense {
  _id: {
    month: number;
    year: number;
  };
  month: number;
  year: number;
  totalAmount: number;
  count: number;
  categories: string[];
  expenses?: Expense[];
}
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');

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

// Expense Service Class
export class ExpenseService {
 private async fetchApi<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  try {
    console.log(`🌐 Fetching: ${options.method || 'GET'} ${url}`, options.body);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const responseText = await response.text();
    console.log(`📥 Response (${response.status}):`, responseText.substring(0, 200));
    
    // Handle empty response
    if (!responseText) {
      if (response.ok) {
        return {} as T;
      }
      throw new ApiError(`Empty response with status ${response.status}`);
    }
    
    let data: any;
    
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse JSON:', responseText);
      throw new ApiError('Invalid JSON response from server');
    }

    if (!response.ok) {
      throw new ApiError(
        data.message || data.error || `http error! status: ${response.status}`,
        response.status,
        data
      );
    }

    // If response has success property, return the data
    if (data && typeof data === 'object') {
      if (data.success === true) {
        return data.data as T;
      }
      // If no success property but has data
      if (data.data !== undefined) {
        return data.data as T;
      }
    }
    
    // Return the data as is
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error instanceof Error ? error.message : 'Network error occurred');
  }
}

  // Get all expenses with filters
  async getExpenses(filters?: {
    siteId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Expense[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters?.siteId && filters.siteId !== 'all') {
        queryParams.append('siteId', filters.siteId);
      }
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      
      const endpoint = queryParams.toString() ? `/expenses?${queryParams.toString()}` : '/expenses';
      
      const expenses = await this.fetchApi<any[]>(endpoint);
      return this.transformExpensesData(expenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }
  }

  // Get expenses by site
  async getExpensesBySite(siteId: string): Promise<Expense[]> {
    try {
      const expenses = await this.fetchApi<any[]>(`/expenses/site/${siteId}`);
      return this.transformExpensesData(expenses);
    } catch (error) {
      console.error(`Error fetching expenses for site ${siteId}:`, error);
      return [];
    }
  }

  // Get monthly expenses for a site
  async getMonthlyExpenses(siteId: string, year?: number): Promise<MonthlyExpense[]> {
    try {
      const queryParam = year ? `?year=${year}` : '';
      const monthlyData = await this.fetchApi<any[]>(`/expenses/site/${siteId}/monthly${queryParam}`);
      return Array.isArray(monthlyData) ? monthlyData : [];
    } catch (error) {
      console.error(`Error fetching monthly expenses:`, error);
      return [];
    }
  }

  // Create new expense
  async createExpense(expenseData: CreateExpenseRequest): Promise<Expense | null> {
    try {
      const cleanData = {
        siteId: expenseData.siteId,
        expenseType: expenseData.expenseType,
        category: expenseData.category,
        description: expenseData.description,
        amount: Number(expenseData.amount),
        date: expenseData.date,
        vendor: expenseData.vendor,
        paymentMethod: expenseData.paymentMethod,
        customFields: expenseData.customFields?.filter(f => f.fieldName && f.fieldValue) || []
      };
      
      const response = await this.fetchApi<any>('/expenses', {
        method: 'POST',
        body: JSON.stringify(cleanData),
      });
      
      // Transform and return the created expense
      const transformed = this.transformExpenseData(response);
      console.log('✅ Expense created successfully:', transformed);
      return transformed;
    } catch (error) {
      console.error('❌ Error creating expense:', error);
      throw error;
    }
  }

  // Update expense
  async updateExpense(expenseId: string, expenseData: Partial<CreateExpenseRequest>): Promise<Expense | null> {
    try {
      const cleanData: any = {};
      if (expenseData.expenseType) cleanData.expenseType = expenseData.expenseType;
      if (expenseData.category) cleanData.category = expenseData.category;
      if (expenseData.description) cleanData.description = expenseData.description;
      if (expenseData.amount) cleanData.amount = Number(expenseData.amount);
      if (expenseData.date) cleanData.date = expenseData.date;
      if (expenseData.vendor) cleanData.vendor = expenseData.vendor;
      if (expenseData.paymentMethod) cleanData.paymentMethod = expenseData.paymentMethod;
      if (expenseData.customFields) {
        cleanData.customFields = expenseData.customFields.filter(f => f.fieldName && f.fieldValue);
      }
      
      const response = await this.fetchApi<any>(`/expenses/${expenseId}`, {
        method: 'PUT',
        body: JSON.stringify(cleanData),
      });
      
      // Transform and return the updated expense
      const transformed = this.transformExpenseData(response);
      console.log('✅ Expense updated successfully:', transformed);
      return transformed;
    } catch (error) {
      console.error(`❌ Error updating expense:`, error);
      throw error;
    }
  }

  // Delete expense
  async deleteExpense(expenseId: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.fetchApi<{ success: boolean; message: string }>(`/expenses/${expenseId}`, {
        method: 'DELETE',
      });
      console.log('✅ Expense deleted successfully:', result);
      return result;
    } catch (error) {
      console.error(`❌ Error deleting expense:`, error);
      throw error;
    }
  }

private transformExpenseData(data: any): Expense | null {
  if (!data) return null;
  
  // Handle both wrapped and unwrapped responses
  const expenseData = data.data || data;
  
  // Ensure we have an object
  if (typeof expenseData !== 'object') return null;
  
  console.log('Transforming expense data:', expenseData); // Debug log
  
  // Handle siteId - it could be an object or a string
  let siteIdObj = expenseData.siteId;
  
  // If siteId is an object with _id property
  if (siteIdObj && typeof siteIdObj === 'object' && siteIdObj._id) {
    siteIdObj = {
      _id: siteIdObj._id || '',
      name: siteIdObj.name || '',
      location: siteIdObj.location || '',
      clientName: siteIdObj.clientName || ''
    };
  } 
  // If siteId is just a string
  else if (typeof siteIdObj === 'string') {
    siteIdObj = {
      _id: siteIdObj,
      name: '',
      location: '',
      clientName: ''
    };
  } 
  // Fallback
  else {
    siteIdObj = { _id: '', name: '', location: '', clientName: '' };
  }
  
  // Ensure all required fields exist with fallbacks
  return {
    _id: expenseData._id || expenseData.id || '',
    siteId: siteIdObj,
    expenseType: expenseData.expenseType || 'other',
    category: expenseData.category || 'other',
    description: expenseData.description || '',
    amount: Number(expenseData.amount) || 0,
    date: expenseData.date || new Date().toISOString(),
    vendor: expenseData.vendor || '',
    paymentMethod: expenseData.paymentMethod || 'cash',
    customFields: Array.isArray(expenseData.customFields) ? expenseData.customFields : [],
    receiptUrl: expenseData.receiptUrl || '',
    createdBy: expenseData.createdBy || '',
    createdAt: expenseData.createdAt || new Date().toISOString(),
    updatedAt: expenseData.updatedAt || new Date().toISOString()
  };
}
  // Transform an array of expenses
  private transformExpensesData(data: any[]): Expense[] {
    if (!Array.isArray(data)) {
      return [];
    }
    
    return data
      .map(item => this.transformExpenseData(item))
      .filter((expense): expense is Expense => expense !== null);
  }

  // Formatting utilities
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
    } catch {
      return dateString;
    }
  }

  getMonthName(monthNumber: number): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthNumber - 1] || 'Unknown';
  }

  // Get total for a site
  getSiteTotal(expenses: Expense[], siteId: string): number {
    return expenses
      .filter(e => {
        const expenseSiteId = typeof e.siteId === 'object' ? e.siteId._id : e.siteId;
        return expenseSiteId === siteId;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }

  // Get count for a site
  getSiteCount(expenses: Expense[], siteId: string): number {
    return expenses.filter(e => {
      const expenseSiteId = typeof e.siteId === 'object' ? e.siteId._id : e.siteId;
      return expenseSiteId === siteId;
    }).length;
  }
}

// Create and export singleton instance
export const expenseService = new ExpenseService();