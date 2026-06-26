import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

let cachedSuperadminId: string | null = null;

export const getSuperadminId = async (): Promise<string> => {
  if (cachedSuperadminId) return cachedSuperadminId;
  
  const stored = localStorage.getItem('superadminId');
  if (stored) {
    cachedSuperadminId = stored;
    return stored;
  }
  
  try {
    const response = await axios.get(`${API_URL}/users?role=superadmin&limit=1`);
    const users = response.data.data || response.data || [];
    if (users.length > 0) {
      const superadmin = users[0];
      const id = superadmin._id || superadmin.id;
      if (id) {
        cachedSuperadminId = id;
        localStorage.setItem('superadminId', id);
        return id;
      }
    }
    throw new Error('Superadmin not found');
  } catch (error) {
    console.error('Failed to fetch superadmin ID:', error);
    throw error;
  }
};

export const createNotificationForSuperadmin = async (
  title: string,
  message: string,
  type: 'success' | 'warning' | 'info' | 'urgent' = 'info',
  priority: 'low' | 'medium' | 'high' = 'medium',
  metadata: Record<string, any> = {},
  notificationType?: string
) => {
  try {
    const superadminId = await getSuperadminId();
    await axios.post(`${API_URL}/notifications`, {
      userId: superadminId,
      title,
      message,
      type,
      priority,
      notificationType,
      metadata
    });
    console.log('✅ Superadmin notification sent:', title);
  } catch (error) {
    console.error('❌ Failed to send superadmin notification:', error);
  }
};