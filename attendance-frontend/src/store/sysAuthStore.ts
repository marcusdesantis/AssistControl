import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SysUser {
  email: string
  name:  string
}

interface SysAuthState {
  user:            SysUser | null
  token:           string | null
  isAuthenticated: boolean
  setAuth:         (user: SysUser, token: string) => void
  clearAuth:       () => void
}

export const useSysAuthStore = create<SysAuthState>()(
  persist(
    (set) => ({
      user:            null,
      token:           null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      clearAuth: ()          => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'sys-auth',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
)
