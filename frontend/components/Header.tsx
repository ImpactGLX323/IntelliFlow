'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/docs/images/intelliflow.png'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

const navItems = [
  { href: '#product', label: 'Product' },
  { href: '/plans', label: 'Plans' },
  { href: '#mcp-rag', label: 'MCP + RAG' },
  { href: '#e-invoicing', label: 'E-Invoicing' },
]

type HeaderProps = {
  theme?: 'light' | 'dark'
  onToggleTheme?: () => void
}

export default function Header({ theme = 'light', onToggleTheme }: HeaderProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-[#7a5639] bg-[rgba(62,40,26,0.94)] text-white backdrop-blur-xl shadow-[0_18px_55px_-42px_rgba(15,23,42,0.62)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center">
          <Image src={logo} alt="IntelliFlow" className="h-10 w-auto" priority />
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#f3ddca] transition-all duration-200 hover:scale-[1.03] hover:bg-[#6d4a32] hover:text-white hover:shadow-md active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0d7be] focus-visible:ring-offset-2 focus-visible:ring-offset-[#3e281a]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="rounded-full border border-[#8a6545] bg-[#583c28] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#fff4ea] transition-all duration-200 hover:scale-[1.03] hover:bg-[#6d4a32] hover:shadow-md active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0d7be] focus-visible:ring-offset-2 focus-visible:ring-offset-[#3e281a]"
            >
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          )}
          <Button href="/login" variant="ghost" size="sm" className="!text-[#fff4ea] hover:!bg-[#6d4a32]">
            Login
          </Button>
          <Button href="/register" size="sm" className="!bg-[#f0d7be] !text-[#3e281a] hover:!bg-[#f5dfc8]">
            Get Started
          </Button>
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-label="Toggle menu"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#8a6545] bg-[#583c28] text-[#fff4ea] transition-all duration-200 hover:scale-[1.03] hover:shadow-md active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0d7be] focus-visible:ring-offset-2 focus-visible:ring-offset-[#3e281a] md:hidden"
        >
          <span className="sr-only">Menu</span>
          <div className="flex flex-col gap-1.5">
            <span className={cn('block h-0.5 w-5 rounded-full bg-current transition-transform duration-200', open && 'translate-y-2 rotate-45')} />
            <span className={cn('block h-0.5 w-5 rounded-full bg-current transition-opacity duration-200', open && 'opacity-0')} />
            <span className={cn('block h-0.5 w-5 rounded-full bg-current transition-transform duration-200', open && '-translate-y-2 -rotate-45')} />
          </div>
        </button>
      </div>

      {open && (
        <div className="border-t border-[#7a5639] bg-[rgba(62,40,26,0.98)] px-4 py-4 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.52)] backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#f3ddca] transition-all duration-200 hover:bg-[#6d4a32] hover:text-white active:scale-[0.99]"
              >
                {item.label}
              </Link>
            ))}
            {onToggleTheme && (
              <button
                type="button"
                onClick={() => {
                  onToggleTheme()
                  setOpen(false)
                }}
                className="rounded-2xl border border-[#8a6545] bg-[#583c28] px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#fff4ea] transition-all duration-200 hover:bg-[#6d4a32] active:scale-[0.99]"
              >
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            )}
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Button href="/login" variant="outline" size="sm" className="w-full !border-[#8a6545] !bg-[#583c28] !text-[#fff4ea] hover:!bg-[#6d4a32]" onClick={undefined}>
                Login
              </Button>
              <Button href="/register" size="sm" className="w-full !bg-[#f0d7be] !text-[#3e281a] hover:!bg-[#f5dfc8]">
                Get Started
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
