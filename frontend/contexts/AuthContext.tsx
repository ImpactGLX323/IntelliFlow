'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface User {
  uid: string
  email: string | null
  full_name: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => Promise<void>
}

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
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password)
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
    setUser({
      uid: credential.user.uid,
      email: credential.user.email,
      full_name: fullName ?? credential.user.displayName ?? null,
    })
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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
