import { storage } from '@/utils/storage'
import axios from 'axios'

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.100:5000'

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('employee_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const code = error.response?.data?.code
    if (error.response?.status === 403 && (code === 'TENANT_INACTIVE' || code === 'USER_INACTIVE')) {
      const { useAuthStore } = await import('@/store/authStore')
      if (code === 'USER_INACTIVE') {
        await storage.setItem('login_notice', 'user_inactive')
      }
      await useAuthStore.getState().clearAuth()
    }
    return Promise.reject(error)
  }
)

export interface ApiResponse<T> {
  success:    boolean
  message?:   string
  data?:      T
  errorCode?: string
}
