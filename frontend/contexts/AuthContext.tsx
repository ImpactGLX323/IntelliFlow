'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import type { AuthContextType, User } from '@/types/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          full_name: firebaseUser.displayName ?? null,
        })
        firebaseUser
          .getIdToken()
          .then((token) => {
            if (typeof window !== 'undefined') {
              localStorage.setItem('idToken', token)
            }
          })
          .catch(() => {})
      } else {
        setUser(null)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('idToken')
        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    const token = await credential.user.getIdToken()
    if (typeof window !== 'undefined') {
      localStorage.setItem('idToken', token)
    }
    setUser({
      uid: credential.user.uid,
      email: credential.user.email,
      full_name: credential.user.displayName ?? null,
    })
  }

  const register = async (email: string, password: string, fullName?: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    if (fullName) {
      await updateProfile(credential.user, { displayName: fullName })
    }
    const token = await credential.user.getIdToken()
    if (typeof window !== 'undefined') {
      localStorage.setItem('idToken', token)
    }
    setUser({
      uid: credential.user.uid,
      email: credential.user.email,
      full_name: fullName ?? credential.user.displayName ?? null,
    })
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
