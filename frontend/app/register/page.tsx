'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import Image from 'next/image'
import { Manrope } from 'next/font/google'
import logo from '../../docs/images/Intelliflow.png'
import { FirebaseError } from 'firebase/app'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

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

const isValidEmail = (value: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const isValidPassword = (value: string) => {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value)
  )
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
    } catch (err: any) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`relative min-h-screen overflow-hidden ${manrope.className}`}>
      <div className="absolute inset-0 bg-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35)_0%,_rgba(2,6,23,0.9)_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,_rgba(148,197,255,0.3)_0%,_transparent_45%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_70%,_rgba(59,130,246,0.25)_0%,_transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,_rgba(255,255,255,0.3)_1px,_transparent_0)] bg-[length:20px_20px] opacity-60" />
      <div className="absolute -top-24 left-1/4 h-72 w-[60rem] -translate-x-1/2 rotate-6 bg-gradient-to-r from-sky-400/40 via-cyan-200/40 to-transparent blur-3xl animate-float-slow" />
      <div className="absolute bottom-0 right-0 h-80 w-[55rem] translate-x-1/3 rotate-[-6deg] bg-gradient-to-l from-blue-500/40 via-slate-200/30 to-transparent blur-3xl animate-float-slower" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-3">
          <Image src={logo} alt="IntelliFlow" className="h-9 w-auto" priority />
        </div>
      </header>

      <main className="relative z-10 flex items-center justify-center px-6 pb-16 sm:px-10">
        <div className="w-full max-w-xl rounded-3xl border border-white/40 bg-white/85 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-10">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold text-slate-800 sm:text-4xl">
              Create Your Account
            </h1>
            <p className="text-sm text-slate-500 sm:text-base">
              Join IntelliFlow today to simplify your workflow.
            </p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <label className="block text-sm text-slate-600">
              Full Name
              <input
                type="text"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
              />
            </label>

            <label className="block text-sm text-slate-600">
              Email Address
              <input
                type="email"
                required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@intelliflow.ai"
              />
            </label>

            <label className="block text-sm text-slate-600">
              Password
              <input
                type="password"
                required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
              />
              <span className="mt-2 block text-xs text-slate-400">
                8+ characters, with upper & lower case letters and a number.
              </span>
            </label>

            <label className="block text-sm text-slate-600">
              Confirm Password
              <input
                type="password"
                required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-full bg-sky-600 px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-sky-500/40 transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-200" />
            Or register with
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-500">
            <button className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 transition hover:border-slate-300">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white">
                G
              </span>
              Google
            </button>
            <button className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 transition hover:border-slate-300">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white">
                A
              </span>
              Apple
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-sky-700 hover:text-sky-600">
              Sign in
            </Link>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
          100% {
            transform: translateY(0px);
          }
        }
        .animate-float-slow {
          animation: float 16s ease-in-out infinite;
        }
        .animate-float-slower {
          animation: float 22s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
