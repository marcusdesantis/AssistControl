import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserInfo, PlanCapabilities } from '@/types/auth'
import { DEFAULT_CAPABILITIES } from '@/types/auth'

interface AuthState {
  user:               UserInfo | null
  accessToken:        string | null
  refreshToken:       string | null
  isAuthenticated:    boolean
  capabilities:       PlanCapabilities
  tenantDeactivated:  boolean
  userDeactivated:    boolean

  setAuth:             (user: UserInfo, accessToken: string, refreshToken: string, capabilities: PlanCapabilities) => void
  setCapabilities:     (capabilities: PlanCapabilities) => void
  updateAccessToken:   (accessToken: string) => void
  clearAuth:           () => void
  setDeactivated:      () => void
  clearDeactivated:    () => void
  setUserDeactivated:  () => void
  clearUserDeactivated:() => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:              null,
      accessToken:       null,
      refreshToken:      null,
      isAuthenticated:   false,
      capabilities:      DEFAULT_CAPABILITIES,
      tenantDeactivated: false,
      userDeactivated:   false,

      setAuth: (user, accessToken, refreshToken, capabilities) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true, capabilities, tenantDeactivated: false }),

      setCapabilities: (capabilities) =>
        set({ capabilities }),

      updateAccessToken: (accessToken) =>
        set({ accessToken }),

      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, capabilities: DEFAULT_CAPABILITIES }),

      setDeactivated: () =>
        set({ tenantDeactivated: true }),

      clearDeactivated: () =>
        set({ tenantDeactivated: false }),

      setUserDeactivated: () =>
        set({ userDeactivated: true }),

      clearUserDeactivated: () =>
        set({ userDeactivated: false }),
    }),
    {
      name: 'attendance-auth',
      partialize: (state) => ({
        user:            state.user,
        accessToken:     state.accessToken,
        refreshToken:    state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        capabilities:    state.capabilities,
      }),
    }
  )
)
