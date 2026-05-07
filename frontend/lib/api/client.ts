import axios from 'axios'
import { auth } from '@/lib/firebase/client'

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim()
const API_URL =
  configuredApiUrl ||
  (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : '')

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(async (config) => {
  if (typeof window === 'undefined') {
    return config
  }

  let token: string | null = null

  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken()
    } catch {
      token = null
    }
  }

  if (!token) {
    token = localStorage.getItem('idToken')
  }

  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('idToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
