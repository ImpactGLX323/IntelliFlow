'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = {
  children: React.ReactNode
  href?: string
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  target?: string
  rel?: string
  className?: string
  variant?: ButtonVariant
  size?: ButtonSize
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#111827] text-white shadow-[0_20px_50px_-24px_rgba(17,24,39,0.72)] hover:bg-[#1f2937] hover:shadow-[0_24px_60px_-24px_rgba(17,24,39,0.68)] dark:bg-[#f0d7be] dark:text-[#20140d] dark:hover:bg-[#f7e2cf]',
  secondary:
    'bg-white/92 text-[#111318] ring-1 ring-black/5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.28)] hover:bg-white dark:bg-[#3b271b] dark:text-[#f7ede0] dark:ring-white/10 dark:hover:bg-[#4a3122]',
  ghost:
    'bg-transparent text-[#111318] hover:bg-black/[0.04] dark:text-[#f7ede0] dark:hover:bg-white/[0.06]',
  outline:
    'border border-black/10 bg-white/60 text-[#111318] shadow-[0_16px_40px_-32px_rgba(15,23,42,0.35)] hover:border-black/20 hover:bg-white/90 dark:border-white/12 dark:bg-white/[0.06] dark:text-[#f7ede0] dark:hover:bg-white/[0.1]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2.5 text-xs',
  md: 'px-5 py-3 text-sm',
  lg: 'px-6 py-3.5 text-sm sm:px-7',
}

const baseClassName =
  'inline-flex items-center justify-center rounded-full font-montserrat font-semibold uppercase tracking-[0.12em] transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:scale-100'

export default function Button({
  children,
  href,
  onClick,
  target,
  rel,
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
}: ButtonProps) {
  const classes = cn(baseClassName, variantClasses[variant], sizeClasses[size], className)

  if (href) {
    return (
      <Link
        href={href}
        target={target}
        rel={rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)}
        aria-disabled={disabled}
        className={cn(classes, disabled && 'pointer-events-none')}
      >
        {children}
      </Link>
    )
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  )
}
