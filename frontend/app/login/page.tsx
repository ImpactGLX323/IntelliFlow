'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { FirebaseError } from 'firebase/app'
import logo from '../../docs/images/Intelliflow.png'


const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const getAuthErrorMessage = (error: unknown) => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Enter a valid email address.'
      case 'auth/user-disabled':
        return 'This account has been disabled.'
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Email or password is incorrect.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Try again in a few minutes.'
      default:
        return error.message || 'Login failed.'
    }
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Login failed.'
}

const isValidEmail = (value: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (!isValidEmail(email)) {
        setError('Enter a valid email address.')
        return
      }
      setLoading(true)
      await login(email, password)
      router.push('/dashboard')
    } catch (err: any) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${jakarta.className} min-h-screen bg-[#f4f7fb] text-slate-900`}>
      <div className="relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-100/70 blur-3xl" />
          <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 py-12">
          <div className="rounded-[2rem] border border-white bg-white/80 shadow-[0_35px_80px_-60px_rgba(15,23,42,0.45)] backdrop-blur">
            
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-8 py-6">
              <div className="flex items-center gap-3">
                <img
                  src="../../docs/images/Intelliflow.png"
                  alt="IntelliFlow"
                  className="h-9"
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    IntelliFlow
                  </p>
                  <p className="text-lg font-semibold">Welcome back</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <button className="rounded-full border border-slate-200 px-3 py-1">
                  EN
                </button>
                <button className="rounded-full border border-slate-200 px-3 py-1">
                  Support
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="grid gap-10 px-8 py-10 lg:grid-cols-2">
              
              {/* Left: Login */}
              <div>
                <h1 className="text-3xl font-semibold">
                  Sign in to IntelliFlow
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Access your dashboard, shipments, and analytics.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  {error && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
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

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200/60 transition hover:-translate-y-0.5 disabled:opacity-60"
                    >
                      {loading ? 'Signing in…' : 'Continue'}
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push('/dashboard')}
                      className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 hover:border-sky-200"
                    >
                      Continue as Guest
                    </button>
                  </div>

                  <div className="pt-2 text-sm text-slate-500">
                    Don’t have an account?{' '}
                    <Link href="/register" className="text-sky-600 hover:underline">
                      Create one
                    </Link>
                  </div>

                  <div className="text-sm text-slate-500">
                    <Link href="/reset-password" className="text-sky-600 hover:underline">
                      Forgot your password?
                    </Link>
                  </div>
                </form>
              </div>

              {/* Right: Value / Actions */}
              <div className="space-y-4">
                <div className="rounded-[1.75rem] border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    What you can do
                  </p>
                  <ul className="mt-4 space-y-3 text-sm text-slate-600">
                    <li>🚚 Track shipments in real time</li>
                    <li>📦 Manage inventory & orders</li>
                    <li>📊 View analytics & reports</li>
                    <li>🧠 Optimize logistics workflows</li>
                  </ul>
                </div>

                <div className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold">Need enterprise access?</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Request an admin workspace or invite your team.
                  </p>
                  <Link
                    href="/register"
                    className="mt-4 inline-flex rounded-full border border-sky-200 px-4 py-2 text-xs font-semibold text-sky-600"
                  >
                    Request access
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
