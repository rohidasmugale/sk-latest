import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

const cachedRoleIds: Record<string, string[]> = {};

const getUserIdsByRole = async (role: string): Promise<string[]> => {
  if (cachedRoleIds[role]) return cachedRoleIds[role];

  try {
    const token = localStorage.getItem('sk_token');
    const response = await axios.get(`${API_URL}/users`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    
    const usersForRole = response.data?.groupedByRole?.[role] || [];
    const ids = usersForRole.map((u: any) => u._id).filter(Boolean);

    cachedRoleIds[role] = ids;
    return ids;
  } catch (error) {
    console.error(`Failed to fetch users with role ${role}:`, error);
    return [];
  }
};

export const notifyRoles = async (
  roles: string[],
  title: string,
  message: string,
  type: 'success' | 'warning' | 'info' | 'urgent' = 'info',
  priority: 'low' | 'medium' | 'high' = 'medium',
  metadata: Record<string, any> = {},
  notificationType?: string
) => {
  try {
    const token = localStorage.getItem('sk_token');
    const idLists = await Promise.all(roles.map(r => getUserIdsByRole(r)));
    const userIds = Array.from(new Set(idLists.flat()));

    if (userIds.length === 0) {
      console.warn(`No users found for roles [${roles.join(', ')}] — notification not sent`);
      return;
    }

    await Promise.allSettled(
      userIds.map(userId =>
        axios.post(
          `${API_URL}/notifications`,
          { userId, title, message, type, priority, notificationType, metadata },
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        )
      )
    );
    console.log(`✅ Notified ${userIds.length} user(s) across [${roles.join(', ')}]:`, title);
  } catch (error) {
    console.error('❌ Failed to send role notifications:', error);
  }
};

// ✅ Backward‑compatible wrapper for superadmin only
export const createNotificationForSuperadmin = async (
  title: string,
  message: string,
  type: 'success' | 'warning' | 'info' | 'urgent' = 'info',
  priority: 'low' | 'medium' | 'high' = 'medium',
  metadata: Record<string, any> = {},
  notificationType?: string
) => {
  return notifyRoles(
    ['superadmin'],
    title,
    message,
    type,
    priority,
    metadata,
    notificationType
  );
};

export const notifyIncidentReported = (
  siteName: string,
  incidentType: string,
  description: string,
  incidentId?: string
) => {
  return notifyRoles(
    ['superadmin', 'admin', 'manager'],
    `🚨 New Incident Reported`,
    `${incidentType === 'accident' ? 'Accident' : 'Issue'} at ${siteName}: ${description.slice(0, 80)}`,
    incidentType === 'accident' ? 'urgent' : 'warning',
    incidentType === 'accident' ? 'high' : 'medium',
    { incidentId, siteName, incidentType, notificationType: 'incident_report' },
    'incident_report'
  );
};