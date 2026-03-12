'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FirebaseError } from 'firebase/app'
import { useAuth } from '@/contexts/AuthContext'
import logo from '../../docs/images/Intelliflow.png'

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const getAuthErrorMessage = (error: unknown) => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Enter a valid email address.'
      case 'auth/user-not-found':
        return 'No account found for this email.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Try again in a few minutes.'
      default:
        return error.message || 'Unable to send reset email.'
    }
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Unable to send reset email.'
}

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setStatus('')

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      await resetPassword(email)
      setStatus('Password reset email sent. Check your inbox.')
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08111d] text-white">
      <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline>
        <source src="/images/bg.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,17,29,0.98),rgba(8,17,29,0.9)_44%,rgba(8,17,29,0.84))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent_24%)]" />

      <header className="relative z-10 px-6 pt-8 sm:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src={logo} alt="IntelliFlow" className="h-9 w-auto" priority />
            <span className="font-montserrat text-[11px] font-semibold uppercase tracking-[0.38em] text-white/68">
              IntelliFlow
            </span>
          </Link>
          <Link
            href="/login"
            className="font-montserrat rounded-full border border-white/12 bg-white/[0.04] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"
          >
            Back to login
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-88px)] items-center px-6 py-14 sm:px-10">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <section className="max-w-2xl">
            <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.3em] text-[#b9c7d8]">
              Access Recovery
            </p>
            <h1 className="font-montserrat mt-6 text-5xl font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:text-6xl">
              Restore your workspace access.
            </h1>
            <p className="font-lexend mt-6 max-w-xl text-base leading-8 text-[#c8d2de]">
              We will send a secure reset link so you can regain access to your inventory,
              compliance, and regional trade dashboard.
            </p>
          </section>

          <section className="rounded-[2rem] border border-white/12 bg-white/[0.05] p-7 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8">
            <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#8ea2ba]">
              Reset Password
            </p>
            <h2 className="font-montserrat mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
              Request reset link.
            </h2>
            <p className="font-lexend mt-3 text-sm leading-7 text-[#c1ccd8]">
              Enter the email tied to your workspace and we’ll send recovery instructions.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}
              {status && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {status}
                </div>
              )}

              <div>
                <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.16em] text-white/46">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-white/24"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="font-montserrat w-full rounded-full bg-[#0f223a] px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white ring-1 ring-white/10 disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>

              <div className="text-sm text-white/58">
                <Link href="/login" className="font-lexend underline underline-offset-4">
                  Back to sign in
                </Link>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}
