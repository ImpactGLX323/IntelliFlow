'use client'

import { useEffect, useState } from 'react'
import { notificationsAPI } from '@/lib/api'
import { normalizePlanLabel } from '@/lib/navigation'
import { useAuth } from '@/contexts/AuthContext'
import type { NotificationItem, NotificationPreference } from '@/types/notifications'

const notificationCategoryMeta: Record<string, { label: string; tier: string; body: string }> = {
  low_stock: { label: 'Low stock', tier: 'Free', body: 'Triggered when a tracked SKU falls to or below its minimum threshold.' },
  stock_received: { label: 'Stock received', tier: 'Free', body: 'Confirms inbound stock has been posted into the ledger.' },
  stock_adjusted: { label: 'Stock adjusted', tier: 'Free', body: 'Flags a positive or negative stock correction.' },
  stock_deducted: { label: 'Stock deducted', tier: 'Free', body: 'Indicates stock has been consumed through fulfillment or a sale.' },
  account_system_alerts: { label: 'Account and system alerts', tier: 'Free', body: 'Basic workspace and account-level system notifications.' },
  sales_order_alerts: { label: 'Sales order alerts', tier: 'Premium', body: 'Covers order creation, confirmation, and fulfillment movement.' },
  purchase_order_due_overdue: { label: 'Purchase order due or overdue', tier: 'Premium', body: 'Highlights inbound purchasing milestones that need attention.' },
  reorder_suggestions: { label: 'Reorder suggestions', tier: 'Premium', body: 'Reserved for backend reorder planning signals.' },
  return_spike: { label: 'Return spike', tier: 'Premium', body: 'Used for unusual return activity or return intake events.' },
  profit_leakage: { label: 'Profit leakage', tier: 'Premium', body: 'Used for refunds and return-adjusted profit exceptions.' },
  weekly_operations_summary: { label: 'Weekly operations summary', tier: 'Premium', body: 'Reserved for periodic workspace summaries.' },
  basic_rag_alerts: { label: 'Basic RAG alerts', tier: 'Premium', body: 'Reserved for document and compliance retrieval notices.' },
  shipment_delayed: { label: 'Shipment delayed', tier: 'Boost', body: 'Urgent shipment-delay alerts from the logistics control tower.' },
  customs_hold: { label: 'Customs hold', tier: 'Boost', body: 'Urgent customs disruption alerts.' },
  port_pressure_high: { label: 'Port pressure high', tier: 'Boost', body: 'Reserved for elevated public or provider-backed port pressure signals.' },
  route_risk_increased: { label: 'Route risk increased', tier: 'Boost', body: 'Reserved for route-risk escalation alerts.' },
  supplier_risk_warning: { label: 'Supplier risk warning', tier: 'Boost', body: 'Reserved for supplier reliability and variance alerts.' },
  ai_recommendation_created: { label: 'AI recommendation created', tier: 'Boost', body: 'Reserved for newly created agent recommendations.' },
  compliance_risk_detected: { label: 'Compliance risk detected', tier: 'Boost', body: 'Reserved for advanced compliance and transport risk findings.' },
  approval_required: { label: 'Approval required', tier: 'Boost', body: 'Actionable approval workflow events.' },
  daily_operations_brief: { label: 'Daily operations brief', tier: 'Boost', body: 'Reserved for control-tower briefings and daily summaries.' },
}

export default function AlertsPage() {
  const { user } = useAuth()
  const plan = normalizePlanLabel(user?.subscription_plan)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [notificationResponse, preferenceResponse] = await Promise.all([
        notificationsAPI.list({ limit: 50 }),
        notificationsAPI.preferences(),
      ])
      setNotifications(notificationResponse.data)
      setPreferences(preferenceResponse.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const markRead = async (notificationId: number) => {
    try {
      await notificationsAPI.markRead(notificationId)
      setNotifications((current) =>
        current.map((item) => (item.id === notificationId ? { ...item, read_at: new Date().toISOString() } : item))
      )
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to mark notification as read.')
    }
  }

  const togglePreference = async (preference: NotificationPreference) => {
    try {
      const response = await notificationsAPI.updatePreference(preference.category, {
        enabled: !preference.enabled,
        push_enabled: preference.push_enabled,
        email_enabled: preference.email_enabled,
      })
      setPreferences((current) =>
        current.map((item) => (item.category === preference.category ? response.data : item))
      )
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update preference.')
    }
  }

  const updateChannel = async (
    preference: NotificationPreference,
    field: 'enabled' | 'push_enabled' | 'email_enabled',
  ) => {
    try {
      const response = await notificationsAPI.updatePreference(preference.category, {
        enabled: field === 'enabled' ? !preference.enabled : preference.enabled,
        push_enabled: field === 'push_enabled' ? !preference.push_enabled : preference.push_enabled,
        email_enabled: field === 'email_enabled' ? !preference.email_enabled : preference.email_enabled,
      })
      setPreferences((current) =>
        current.map((item) => (item.category === preference.category ? response.data : item))
      )
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update notification preference.')
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-2 border-white/14 border-t-white" /></div>
  }

  const unread = notifications.filter((item) => !item.read_at).length

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#ff9b3d]/75">Notifications</p>
          <h1 className="font-montserrat mt-4 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
            Operational alerting by subscription tier.
          </h1>
          <p className="font-lexend mt-5 max-w-3xl text-sm leading-8 text-[#c1ccd8] sm:text-base">
            In-app notifications stay enabled by default. Push is reserved for urgent or actionable events, and email remains off by default for future summaries, reports, and security notices.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['Current plan', plan],
            ['Unread', String(unread)],
            ['Categories', String(preferences.length)],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-[1.4rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm">
              <p className="font-montserrat text-[11px] uppercase tracking-[0.16em] text-white/40">{label}</p>
              <p className="font-montserrat mt-3 text-3xl font-semibold text-white">{String(value)}</p>
            </div>
          ))}
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{String(error)}</div>}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
          <h2 className="font-montserrat text-2xl font-semibold text-white">Recent alerts</h2>
          <div className="mt-5 space-y-3">
            {notifications.length ? (
              notifications.map((notification) => (
                <div key={notification.id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-montserrat text-[11px] uppercase tracking-[0.18em] text-[#ff9b3d]/75">{notification.category}</p>
                      <p className="font-montserrat mt-2 text-lg font-semibold text-white">{notification.title}</p>
                      <p className="font-lexend mt-3 text-sm leading-7 text-white/66">{notification.body}</p>
                      <p className="font-lexend mt-3 text-xs text-white/40">{new Date(notification.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/76">
                        {notification.severity}
                      </span>
                      {!notification.read_at && (
                        <button type="button" onClick={() => markRead(notification.id)} className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/76">
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/62">
                No alerts have been generated for this workspace yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
          <h2 className="font-montserrat text-2xl font-semibold text-white">Preferences</h2>
          <div className="mt-5 space-y-3">
            {preferences.map((preference) => (
              <div key={preference.category} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-montserrat text-sm font-semibold text-white">
                      {notificationCategoryMeta[preference.category]?.label ?? preference.category.replaceAll('_', ' ')}
                    </p>
                    <p className="font-lexend mt-2 text-xs text-white/48">
                      {notificationCategoryMeta[preference.category]?.tier ?? 'Workspace'} • {notificationCategoryMeta[preference.category]?.body ?? 'Workspace notification category.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => updateChannel(preference, 'enabled')} className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.14em] ${preference.enabled ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100' : 'border-white/12 bg-white/[0.04] text-white/68'}`}>
                      In-app {preference.enabled ? 'On' : 'Off'}
                    </button>
                    <button type="button" onClick={() => updateChannel(preference, 'push_enabled')} className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.14em] ${preference.push_enabled ? 'border-amber-400/30 bg-amber-500/10 text-amber-100' : 'border-white/12 bg-white/[0.04] text-white/68'}`}>
                      Push {preference.push_enabled ? 'On' : 'Off'}
                    </button>
                    <button type="button" onClick={() => updateChannel(preference, 'email_enabled')} className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.14em] ${preference.email_enabled ? 'border-sky-400/30 bg-sky-500/10 text-sky-100' : 'border-white/12 bg-white/[0.04] text-white/68'}`}>
                      Email {preference.email_enabled ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <button type="button" onClick={() => togglePreference(preference)} className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.14em] text-white/76">
                    {preference.enabled ? 'Mute entire category' : 'Enable in-app again'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
