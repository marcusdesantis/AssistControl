import { api } from '@/services/api'
import type { ApiResponse, LoginRequest, LoginResponse } from '@/types/auth'

export const authService = {
  login: async (data: LoginRequest) => {
    const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', data)
    return res.data
  },

  verifyPassword: async (password: string): Promise<boolean> => {
    try {
      await api.post('/auth/verify-password', { password })
      return true
    } catch {
      return false
    }
  },

  logout: async () => {
    await api.post('/auth/logout')
  },

  refresh: async (token: string) => {
    const res = await api.post<ApiResponse<LoginResponse>>('/auth/refresh', { token })
    return res.data
  },
}
