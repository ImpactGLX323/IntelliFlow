'use client'

import { cn } from '@/lib/utils/cn'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import logo from '@/docs/images/intelliflow.png'

const primaryNavigation = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/products', label: 'Products' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/sales', label: 'Sales' },
  { href: '/purchasing', label: 'Purchasing' },
  { href: '/transfers', label: 'Transfers' },
  { href: '/returns', label: 'Returns' },
]

const secondaryNavigation = [
  { href: '/manufacturing/boms', label: 'BOMs' },
  { href: '/manufacturing/orders', label: 'Manufacturing' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/recommendations', label: 'Recommendations' },
  { href: '/logistics', label: 'Logistics' },
  { href: '/compliance', label: 'Compliance' },
  { href: '/copilot', label: 'Copilot' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="relative z-10 hidden w-72 shrink-0 border-r border-white/10 bg-black/20 px-5 py-6 backdrop-blur-xl lg:block">
      <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/14 bg-white/[0.055] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <Image src={logo} alt="IntelliFlow" className="h-full w-full object-contain" priority />
        </div>
        <div className="min-w-0">
          <p className="truncate font-montserrat text-lg font-semibold text-white">IntelliFlow</p>
          <p className="font-lexend text-[10px] uppercase tracking-[0.24em] text-white/38">
            Inventory Control
          </p>
        </div>
      </Link>

      <nav className="mt-10 space-y-8">
        <div className="space-y-2">
          <p className="font-montserrat px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff9b3d]/75">
            Workspace
          </p>
          {primaryNavigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'font-montserrat block rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition',
                  active
                    ? 'bg-white/[0.09] text-white ring-1 ring-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'text-white/55 hover:bg-white/[0.055] hover:text-white'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="space-y-2">
          <p className="font-montserrat px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff9b3d]/75">
            Operations
          </p>
          {secondaryNavigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'font-montserrat block rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition',
                  active
                    ? 'bg-white/[0.09] text-white ring-1 ring-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'text-white/55 hover:bg-white/[0.055] hover:text-white'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
