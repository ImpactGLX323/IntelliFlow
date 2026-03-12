'use client'

import { useAuth } from '@/contexts/AuthContext'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import CopilotDock from '@/components/CopilotDock'

const navigation = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/products', label: 'Products' },
  { href: '/sales', label: 'Sales' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#08111d] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_24%)]" />
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(180deg,#08111d,#0b1728_55%,#08111d)]" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#08111d]/86 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-sm font-semibold text-white">
                IF
              </div>
              <div>
                <p className="font-montserrat text-lg font-semibold text-white">IntelliFlow</p>
                <p className="font-montserrat text-[10px] uppercase tracking-[0.28em] text-white/38">
                  Inventory Control
                </p>
              </div>
            </Link>

            <nav className="hidden items-center gap-2 lg:flex">
              {navigation.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`font-montserrat rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
                      active
                        ? 'bg-[#0f223a] text-white ring-1 ring-white/10'
                        : 'text-white/58 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs text-white/68 sm:block">
              {user?.email ?? 'Guest'}
            </div>
            <button
              onClick={handleLogout}
              className="font-montserrat rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:pr-[420px]">{children}</main>
      <CopilotDock defaultExpanded={pathname === '/dashboard'} />
    </div>
  )
}
