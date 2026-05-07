export interface NotificationItem {
  id: number
  category: string
  severity: string
  title: string
  body: string
  data: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

export interface NotificationUnreadCount {
  unread_count: number
}

export interface NotificationPreference {
  id: number
  category: string
  enabled: boolean
  push_enabled: boolean
  email_enabled: boolean
  updated_at: string | null
}

export interface NotificationPreferenceUpdate {
  enabled: boolean
  push_enabled?: boolean
  email_enabled?: boolean
}
