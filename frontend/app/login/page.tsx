'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import Image from 'next/image'
import { FirebaseError } from 'firebase/app'
import logo from '../../docs/images/Intelliflow.png'

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

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

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
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,17,29,0.96),rgba(8,17,29,0.9)_46%,rgba(8,17,29,0.82))]" />
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
            href="/register"
            className="font-montserrat rounded-full border border-white/12 bg-white/[0.04] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"
          >
            Register
          </Link>
        </div>
      </header>

      <main className="relative z-10 px-6 pb-16 pt-14 sm:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <section className="max-w-2xl">
            <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.3em] text-[#b9c7d8]">
              Secure Workspace Access
            </p>
            <h1 className="font-montserrat mt-6 text-5xl font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:text-6xl">
              Continue with regional inventory clarity.
            </h1>
            <p className="font-lexend mt-6 max-w-xl text-base leading-8 text-[#c8d2de]">
              Access your ASEAN inventory visibility, cross-border intelligence, and
              operational dashboards from one controlled workspace.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm">
                <p className="font-montserrat text-xs uppercase tracking-[0.18em] text-white/42">Visibility</p>
                <p className="font-montserrat mt-3 text-3xl font-semibold text-white">Live</p>
                <p className="font-lexend mt-3 text-sm leading-7 text-white/58">
                  Port, transit, and platform signals in one login.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-sm">
                <p className="font-montserrat text-xs uppercase tracking-[0.18em] text-white/42">Control</p>
                <p className="font-montserrat mt-3 text-3xl font-semibold text-white">99.8%</p>
                <p className="font-lexend mt-3 text-sm leading-7 text-white/58">
                  Sync confidence across inventory and order movement.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/12 bg-white/[0.05] p-7 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8">
            <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#8ea2ba]">
              Sign In
            </p>
            <h2 className="font-montserrat mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
              Welcome back.
            </h2>
            <p className="font-lexend mt-3 text-sm leading-7 text-[#c1ccd8]">
              Enter your workspace credentials to continue.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
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

              <div>
                <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.16em] text-white/46">
                  Password
                </label>
                <input
                  type="password"
                  required
                  className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-white/24"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="font-montserrat rounded-full bg-[#0f223a] px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white ring-1 ring-white/10 disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : 'Continue'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="font-montserrat rounded-full border border-white/16 bg-white/[0.03] px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white/88"
                >
                  Continue as guest
                </button>
              </div>
            </form>

            <div className="mt-8 flex flex-wrap gap-4 text-sm text-white/58">
              <Link href="/register" className="font-lexend underline underline-offset-4">
                Create account
              </Link>
              <Link href="/reset-password" className="font-lexend underline underline-offset-4">
                Forgot password
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
