'use client'

import { useAuth } from '@/contexts/AuthContext'
import { usePathname, useRouter } from 'next/navigation'

const titleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/inventory': 'Inventory',
  '/sales': 'Sales',
  '/purchasing': 'Purchasing',
  '/transfers': 'Transfers',
  '/returns': 'Returns',
  '/alerts': 'Alerts',
  '/recommendations': 'Recommendations',
  '/logistics': 'Logistics',
  '/compliance': 'Compliance',
  '/copilot': 'Copilot',
}

export default function Topbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const currentTitle =
    Object.entries(titleMap).find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ??
    'Workspace'

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/10 backdrop-blur-xl">
      <div className="flex min-w-0 items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="font-montserrat text-[10px] font-semibold uppercase tracking-[0.28em] text-[#ff9b3d]/75">
            Workspace
          </p>
          <h1 className="font-montserrat mt-1 truncate text-xl font-semibold text-white">
            {currentTitle}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden rounded-full border border-white/12 bg-white/[0.055] px-4 py-2 text-xs text-white/68 sm:block">
            {user?.email ?? 'Guest'}
          </div>
          <div className="hidden rounded-full border border-[#d7ff4d]/24 bg-[#d7ff4d]/8 px-3 py-2 font-lexend text-xs uppercase tracking-[0.16em] text-[#d7ff4d]/85 md:block">
            AI Ready
          </div>
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
