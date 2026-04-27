import axios from 'axios'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'

// En desarrollo: BASE_URL vacío → usa el proxy de Vite (/api → http://localhost:5000)
// En producción: define VITE_API_URL en el .env (ej: https://api.tudominio.com)
const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// ─── Request: adjuntar JWT ────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Response: renovar token si expira (401) ─────────────────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)))
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config

    // Las rutas del checador son públicas (sin JWT) — no aplicar refresh ni redirigir al login
    if (originalRequest?.url?.includes('/checker/')) {
      return Promise.reject(error)
    }

    // Tenant desactivado por superadmin
    if (error.response?.status === 403 && error.response?.data?.code === 'TENANT_INACTIVE') {
      const isLoginRequest = originalRequest?.url?.includes('/auth/login')
      if (!isLoginRequest && !useAuthStore.getState().tenantDeactivated) {
        useAuthStore.getState().setDeactivated()
      }
      error._handled = true
      return Promise.reject(error)
    }

    // Usuario desactivado individualmente
    if (error.response?.status === 403 && error.response?.data?.code === 'USER_INACTIVE') {
      useAuthStore.getState().clearAuth()
      localStorage.setItem('login_notice', 'user_inactive')
      window.location.href = '/login'
      error._handled = true
      return Promise.reject(error)
    }

    // Plan gate — mostrar toast y dejar que el componente maneje el error
    if (error.response?.status === 403 && error.response?.data?.code === 'PLAN_LIMIT') {
      const msg = error.response.data.message ?? 'Mejora tu plan para acceder.'
      toast.error('Límite de plan alcanzado', {
        description: msg,
        action: { label: 'Ver planes', onClick: () => { window.location.href = '/settings?tab=subscription' } },
        duration: 6000,
      })
      error._handled = true
      return Promise.reject(error)
    }

    // Login retorna 401 con errorCode cuando el tenant/usuario está inactivo o pendiente — no intentar refresh
    if (error.response?.status === 401) {
      const errCode = error.response?.data?.errorCode ?? error.response?.data?.code
      if (errCode === 'TENANT_INACTIVE' || errCode === 'USER_INACTIVE' || errCode === 'TENANT_PENDING') {
        error._handled = true
        return Promise.reject(error)
      }
    }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    const { refreshToken, updateAccessToken, clearAuth } = useAuthStore.getState()

    try {
      // Usar la misma instancia api para pasar por el proxy de Vite también
      const res = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { token: refreshToken })
      const newToken: string = res.data.data.accessToken
      updateAccessToken(newToken)
      processQueue(null, newToken)
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return api(originalRequest)
    } catch (err) {
      processQueue(err, null)
      if (!useAuthStore.getState().tenantDeactivated) {
        clearAuth()
        window.location.href = '/login'
      }
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  }
)

export const isHandledError = (e: unknown): boolean => Boolean((e as any)?._handled)
