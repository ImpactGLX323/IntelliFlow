import { apiClient } from '@/lib/api/client'
import type { NotificationPreferenceUpdate } from '@/types/notifications'

export const notificationsAPI = {
  list: (params?: { unread_only?: boolean; limit?: number }) => apiClient.get('/api/notifications/', { params }),
  unreadCount: () => apiClient.get('/api/notifications/unread-count'),
  markRead: (notificationId: number) => apiClient.post(`/api/notifications/${notificationId}/read`),
  preferences: () => apiClient.get('/api/notifications/preferences'),
  updatePreference: (category: string, payload: NotificationPreferenceUpdate) =>
    apiClient.put(`/api/notifications/preferences/${category}`, payload),
}
