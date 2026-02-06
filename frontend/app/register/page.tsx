'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<'admin' | 'seller' | 'guest' | null>(null)
  const { register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await register(email, password, fullName || undefined)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-4xl p-10 bg-white rounded-2xl shadow-xl space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <img src="/intelliflow-logo.png" alt="IntelliFlow" className="mx-auto h-10" />
          <h2 className="text-3xl font-bold text-gray-900">
            Create your IntelliFlow account
          </h2>
          <p className="text-gray-600">
            Select account type to get started.
          </p>
        </div>

        {/* Role Selection */}
        {!role && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              onClick={() => setRole('admin')}
              className="cursor-pointer rounded-xl border p-6 text-center hover:shadow-lg transition"
            >
              <div className="text-4xl mb-3">🛡️</div>
              <h3 className="font-semibold text-lg">Admin Account</h3>
              <p className="text-sm text-gray-500">
                Manage system, users, analytics
              </p>
            </div>

            <div
              onClick={() => setRole('seller')}
              className="cursor-pointer rounded-xl border-2 border-primary-500 p-6 text-center shadow-md transition"
            >
              <div className="text-4xl mb-3">🏪</div>
              <h3 className="font-semibold text-lg">Seller Account</h3>
              <p className="text-sm text-gray-500">
                Manage products, orders, logistics
              </p>
            </div>

            <div
              onClick={() => setRole('guest')}
              className="cursor-pointer rounded-xl border p-6 text-center hover:shadow-lg transition"
            >
              <div className="text-4xl mb-3">👁️</div>
              <h3 className="font-semibold text-lg">Guest Account</h3>
              <p className="text-sm text-gray-500">
                Browse, track, limited features
              </p>
            </div>
          </div>
        )}

        {/* Registration Form */}
        {role && role !== 'guest' && (
          <form className="space-y-6 max-w-md mx-auto" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <input
              type="text"
              placeholder="Full Name"
              className="w-full px-4 py-3 border rounded-lg"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <input
              type="email"
              placeholder="Email Address"
              required
              className="w-full px-4 py-3 border rounded-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              required
              className="w-full px-4 py-3 border rounded-lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating account...' : `Create ${role} account`}
            </button>

            <button
              type="button"
              onClick={() => setRole(null)}
              className="w-full text-sm text-gray-500 hover:underline"
            >
              ← Back to account type
            </button>
          </form>
        )}

        {/* Guest Access */}
        {role === 'guest' && (
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Continue as guest with limited access.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 rounded-lg bg-primary-600 text-white font-semibold"
            >
              Continue as Guest
            </button>
            <button
              onClick={() => setRole(null)}
              className="block mx-auto text-sm text-gray-500 hover:underline"
            >
              ← Back to account type
            </button>
          </div>
        )}

        <div className="text-center text-sm">
          <Link href="/login" className="text-primary-600 hover:underline">
            Already have an account? Sign in
          </Link>
        </div>

      </div>
    </div>
  )
}
