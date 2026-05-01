import Image from 'next/image'
import Link from 'next/link'
import logo from '@/docs/images/intelliflow.png'

const footerLinks = [
  { href: '#product', label: 'Product' },
  { href: '/plans', label: 'Plans' },
  { href: '#mcp-rag', label: 'MCP + RAG' },
  { href: '#e-invoicing', label: 'E-Invoicing' },
  { href: '/login', label: 'Login' },
]

export default function Footer() {
  return (
    <footer className="border-t border-black/8 bg-white/68 backdrop-blur-xl dark:border-white/10 dark:bg-[#18110d]/88">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <div className="flex items-center gap-3">
            <Image src={logo} alt="IntelliFlow" className="h-10 w-auto" />
            <span className="font-montserrat text-sm font-semibold uppercase tracking-[0.22em] text-[#111318] dark:text-[#f7ede0]">
              IntelliFlow
            </span>
          </div>
          <p className="font-lexend mt-4 text-sm leading-7 text-[#526070] dark:text-[#d5c6b8]">
            Precision inventory, smarter logistics, and AI-assisted supply-chain control.
          </p>
        </div>

        <nav className="flex flex-wrap gap-3 sm:gap-4">
          {footerLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#526070] transition-all duration-200 hover:scale-[1.03] hover:bg-white hover:text-[#111318] hover:shadow-md active:scale-[0.97] dark:text-[#d5c6b8] dark:hover:bg-white/[0.06] dark:hover:text-[#fff4ea]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
