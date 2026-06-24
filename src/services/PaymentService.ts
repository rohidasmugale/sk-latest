// services/PaymentService.ts
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? `http://localhost:5001/api` : 'https://sk-backend-btbj.onrender.com/api');

export interface Payment {
  _id: string;
  paymentId: string;
  invoiceId: string;
  client: string;
  amount: number;
  date: string;
  method: string;
  status: 'paid' | 'pending' | 'failed';
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

class PaymentService {
  // Helper function for API calls
  private static async fetchApi(endpoint: string, options?: RequestInit) {
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

  // Get all payments
  static async getAllPayments(filters?: {
    status?: string;
    method?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Payment[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.method) queryParams.append('method', filters.method);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      if (filters?.page) queryParams.append('page', filters.page.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());

      const queryString = queryParams.toString();
      const endpoint = `/payments${queryString ? `?${queryString}` : ''}`;
      
      const data = await this.fetchApi(endpoint);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch payments');
      }
      
      return {
        data: data.data,
        pagination: data.pagination
      };
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  }

  // Get payment by ID
  static async getPaymentById(id: string): Promise<Payment> {
    try {
      const data = await this.fetchApi(`/payments/${id}`);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch payment');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  }

  // Create new payment
  static async createPayment(paymentData: Partial<Payment>): Promise<Payment> {
    try {
      const data = await this.fetchApi('/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create payment');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  // Update payment
  static async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
    try {
      const data = await this.fetchApi(`/payments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update payment');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  }

  // Delete payment
  static async deletePayment(id: string): Promise<void> {
    try {
      const data = await this.fetchApi(`/payments/${id}`, {
        method: 'DELETE'
      });
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete payment');
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  }

  // Get payment statistics
  static async getPaymentStats(period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'): Promise<any> {
    try {
      const data = await this.fetchApi(`/payments/stats?period=${period}`);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get payment stats');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error getting payment stats:', error);
      throw error;
    }
  }

  // Get payment methods distribution
  static async getPaymentMethodsDistribution(): Promise<Array<{method: string; amount: number; count: number}>> {
    try {
      const data = await this.fetchApi('/payments/methods/distribution');
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get payment methods distribution');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error getting payment methods distribution:', error);
      throw error;
    }
  }
}

export default PaymentService;