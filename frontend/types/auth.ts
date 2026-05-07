export interface User {
  id?: number
  uid: string
  email: string | null
  full_name: string | null
  organization_id?: number | null
  subscription_plan?: 'FREE' | 'PREMIUM' | 'BOOST'
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}
