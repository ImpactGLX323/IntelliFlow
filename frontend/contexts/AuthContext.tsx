'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { apiClient } from '@/lib/api/client'
import { normalizePlanLabel } from '@/lib/navigation'
import type { AuthContextType, User } from '@/types/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function loadBackendUser(firebaseUser: { uid: string; email: string | null; displayName: string | null }, token: string): Promise<User> {
  if (typeof window !== 'undefined') {
    localStorage.setItem('idToken', token)
  }

  try {
    const response = await apiClient.get('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    const backendUser = response.data
    return {
      id: backendUser.id,
      uid: firebaseUser.uid,
      email: backendUser.email ?? firebaseUser.email,
      full_name: backendUser.full_name ?? firebaseUser.displayName ?? null,
      organization_id: backendUser.organization_id ?? null,
      subscription_plan: normalizePlanLabel(backendUser.subscription_plan),
    }
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        full_name: firebaseUser.displayName ?? null,
      }
    }

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      full_name: firebaseUser.displayName ?? null,
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const resolve = async () => {
        if (firebaseUser) {
          try {
            const token = await firebaseUser.getIdToken()
            setUser(await loadBackendUser(firebaseUser, token))
          } catch {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              full_name: firebaseUser.displayName ?? null,
            })
          }
        } else {
          setUser(null)
          if (typeof window !== 'undefined') {
            localStorage.removeItem('idToken')
          }
        }
        setLoading(false)
      }

      resolve()
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    const token = await credential.user.getIdToken()
    setUser(await loadBackendUser(credential.user, token))
  }

  const register = async (email: string, password: string, fullName?: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    if (fullName) {
      await updateProfile(credential.user, { displayName: fullName })
    }
    const token = await credential.user.getIdToken()
    setUser(
      await loadBackendUser(
        {
          uid: credential.user.uid,
          email: credential.user.email,
          displayName: fullName ?? credential.user.displayName ?? null,
        },
        token
      )
    )
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('idToken')
    }
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
