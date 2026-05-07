'use client'

import { useEffect, useState } from 'react'
import { notificationsAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { findNavigationItem, normalizePlanLabel } from '@/lib/navigation'
import { usePathname, useRouter } from 'next/navigation'

export default function Topbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)

  const activeItem = findNavigationItem(pathname)

  useEffect(() => {
    let disposed = false

    const loadUnread = async () => {
      try {
        const response = await notificationsAPI.unreadCount()
        if (!disposed) {
          setUnreadCount(response.data?.unread_count ?? 0)
        }
      } catch {
        if (!disposed) {
          setUnreadCount(0)
        }
      }
    }

    loadUnread()
    return () => {
      disposed = true
    }
  }, [pathname])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/10 backdrop-blur-xl">
      <div className="flex min-w-0 items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="font-montserrat text-[10px] font-semibold uppercase tracking-[0.28em] text-[#ff9b3d]/75">
            {activeItem.requiredPlan} Access
          </p>
          <h1 className="font-montserrat mt-1 truncate text-xl font-semibold text-white">
            {activeItem.label}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden rounded-full border border-white/12 bg-white/[0.055] px-4 py-2 text-xs text-white/68 sm:block">
            {user?.email ?? 'Guest'}
          </div>
          <div className="hidden rounded-full border border-[#d7ff4d]/24 bg-[#d7ff4d]/8 px-3 py-2 font-lexend text-xs uppercase tracking-[0.16em] text-[#d7ff4d]/85 md:block">
            Plan {normalizePlanLabel(user?.subscription_plan)}
          </div>
          <button
            onClick={() => router.push('/alerts')}
            className="font-montserrat rounded-full border border-white/12 bg-white/[0.055] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white"
          >
            Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}
          </button>
          <button
            onClick={handleLogout}
            className="font-montserrat rounded-full border border-white/12 bg-white/[0.055] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
