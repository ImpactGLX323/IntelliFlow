'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FirebaseError } from 'firebase/app'
import { useAuth } from '@/contexts/AuthContext'
import { Plus_Jakarta_Sans } from 'next/font/google'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const isValidEmail = (value: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

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
    <div className={`${jakarta.className} min-h-screen bg-[#f4f7fb] text-slate-900`}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-100/70 blur-3xl" />
          <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-xl px-6 py-16">
          <div className="rounded-[2rem] border border-white bg-white/80 px-8 py-10 shadow-[0_35px_80px_-60px_rgba(15,23,42,0.45)] backdrop-blur">
            <h1 className="text-3xl font-semibold">Reset your password</h1>
            <p className="mt-2 text-sm text-slate-500">
              We will email you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {error && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {status && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {status}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200/60 transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>

              <div className="text-center text-sm text-slate-500">
                <Link href="/login" className="text-sky-600 hover:underline">
                  Back to sign in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
