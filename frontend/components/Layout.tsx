'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link href="/dashboard" className="flex items-center">
                <span className="text-xl font-bold text-primary-600">IntelliFlow</span>
              </Link>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary-600"
                >
                  Dashboard
                </Link>
                <Link
                  href="/products"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-primary-600"
                >
                  Products
                </Link>
                <Link
                  href="/sales"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-primary-600"
                >
                  Sales
                </Link>
                <Link
                  href="/copilot"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-primary-600"
                >
                  AI Copilot
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
