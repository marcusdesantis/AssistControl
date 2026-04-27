import axios from 'axios'
import { useSysAuthStore } from '@/store/sysAuthStore'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export const sysApi = axios.create({
  baseURL: `${BASE_URL}/api/v1/admin`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

sysApi.interceptors.request.use((config) => {
  const token = useSysAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

sysApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useSysAuthStore.getState().clearAuth()
      window.location.href = '/sys/login'
    }
    return Promise.reject(err)
  }
)
