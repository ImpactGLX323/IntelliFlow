'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import Image from 'next/image'
import { FirebaseError } from 'firebase/app'
import logo from '@/docs/images/intelliflow.png'

const getAuthErrorMessage = (error: unknown) => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'An account already exists for this email.'
      case 'auth/invalid-email':
        return 'Enter a valid email address.'
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Try again in a few minutes.'
      default:
        return error.message || 'Registration failed.'
    }
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Registration failed.'
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const isValidPassword = (value: string) => {
  return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value)
}

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.')
      return
    }

    if (!isValidPassword(password)) {
      setError('Password must be 8+ chars with upper, lower, and a number.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      await register(email, password, fullName || undefined)
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hud-public min-h-screen overflow-x-hidden p-3 text-white sm:p-6">
      <div className="ive-device relative mx-auto min-h-[calc(100vh-1.5rem)] w-full max-w-7xl overflow-hidden rounded-[1.8rem] sm:min-h-[calc(100vh-3rem)] sm:rounded-[2.8rem]">
        <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline>
          <source src="/images/bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,8,10,0.98),rgba(7,8,10,0.91)_46%,rgba(7,8,10,0.8))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_28%)]" />

        <header className="relative z-10 px-6 pt-8 sm:px-10">
          <div className="mx-auto flex min-w-0 max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image src={logo} alt="IntelliFlow" className="h-9 w-auto" priority />
            <span className="truncate font-montserrat text-[11px] font-semibold uppercase tracking-[0.28em] text-white/68 sm:tracking-[0.38em]">
              IntelliFlow
            </span>
          </Link>
          <Link
            href="/login"
            className="font-montserrat rounded-full border border-white/12 bg-white/[0.04] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white"
          >
            Login
          </Link>
          </div>
        </header>

        <main className="relative z-10 px-6 pb-16 pt-14 sm:px-10">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-center">
          <section className="max-w-2xl">
            <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.3em] text-[#b9c7d8]">
              Workspace Setup
            </p>
            <h1 className="text-balance font-montserrat mt-6 text-[clamp(2.5rem,7vw,3.75rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-white">
              Build your inventory command center.
            </h1>
            <p className="font-lexend mt-6 max-w-xl text-base leading-8 text-[#c8d2de]">
              Create an IntelliFlow workspace for inventory precision, regional trade visibility,
              and compliance-ready operational control.
            </p>

            <div className="mt-10 grid gap-4">
              {[
                'ASEAN inventory synchronization',
                'Cross-border shipment visibility',
                'LHDN-ready compliance workflows',
              ].map((item) => (
                <div
                  key={item}
                  className="font-lexend rounded-[1.4rem] border border-white/12 bg-white/[0.04] px-5 py-4 text-sm text-white/76 backdrop-blur-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="min-w-0 rounded-[2rem] border border-white/12 bg-white/[0.065] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-8">
            <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#8ea2ba]">
              Create Account
            </p>
            <h2 className="font-montserrat mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
              Open a new workspace.
            </h2>
            <p className="font-lexend mt-3 text-sm leading-7 text-[#c1ccd8]">
              Set up your credentials and start configuring your regional inventory environment.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div>
                <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.16em] text-white/46">
                  Full name
                </label>
                <input
                  type="text"
                  className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-white/24"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.16em] text-white/46">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-white/24"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                />
                <span className="font-lexend mt-2 block text-xs text-white/42">
                  8+ characters, including upper case, lower case, and a number.
                </span>
              </div>

              <div>
                <label className="font-montserrat text-xs font-semibold uppercase tracking-[0.16em] text-white/46">
                  Confirm password
                </label>
                <input
                  type="password"
                  required
                  className="font-lexend mt-2 w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-white/24"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="font-montserrat w-full rounded-full bg-[#0f223a] px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white ring-1 ring-white/10 disabled:opacity-60"
              >
                {loading ? 'Creating account...' : 'Create workspace'}
              </button>
            </form>

            <p className="mt-6 text-sm text-white/58">
              <span className="font-lexend">Already have an account? </span>
              <Link href="/login" className="font-lexend underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </section>
          </div>
        </main>
      </div>
    </div>
  )
}
