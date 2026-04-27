import { useState } from 'react'

const _loginNotice = (() => {
  const v = localStorage.getItem('login_notice')
  if (v) localStorage.removeItem('login_notice')
  return v
})()
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Clock, Eye, EyeOff, LogIn, AlertCircle, Lock, UserX } from 'lucide-react'
import { authService } from './authService'
import { useAuthStore } from '@/store/authStore'

interface LoginForm {
  username: string
  password: string
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deactivatedModal,     setDeactivatedModal]     = useState(false)
  const [userDeactivatedModal, setUserDeactivatedModal] = useState(_loginNotice === 'user_inactive')

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    setLoading(true)
    try {
      const res = await authService.login(data)
      if (!res.success || !res.data) {
        setError(res.message ?? 'Error al iniciar sesión')
        return
      }
      const { user, accessToken, refreshToken, capabilities } = res.data
      setAuth(user, accessToken, refreshToken, capabilities)
      navigate(user.mustChangePassword ? '/change-password' : '/dashboard', { replace: true })
    } catch (err: any) {
      const code = err?.response?.data?.code ?? err?.response?.data?.errorCode
      if (code === 'TENANT_INACTIVE')
        setDeactivatedModal(true)
      else if (code === 'USER_INACTIVE')
        setUserDeactivatedModal(true)
      else
        setError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.')
    } finally {
      setLoading(false)
    }
  }

  if (userDeactivatedModal) return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <UserX className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Usuario desactivado</h2>
        <p className="text-gray-500 text-sm mb-6">
          Tu usuario ha sido desactivado por el administrador de tu empresa. Contacta con el administrador para más información.
        </p>
        <button
          onClick={() => setUserDeactivatedModal(false)}
          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          Volver al login
        </button>
      </div>
    </div>
  )

  if (deactivatedModal) return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Lock className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Empresa desactivada</h2>
        <p className="text-gray-500 text-sm mb-6">
          Tu empresa ha sido desactivada por el administrador del sistema. Contacta con soporte para más información.
        </p>
        <button
          onClick={() => setDeactivatedModal(false)}
          className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          Volver al login
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur rounded-2xl mb-4">
            <Clock className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">AssistControl</h1>
          <p className="text-primary-200 mt-1 text-sm">Ingresa tus credenciales para continuar</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Usuario
              </label>
              <input
                {...register('username', { required: 'El usuario es requerido' })}
                type="text"
                placeholder="admin"
                autoComplete="username"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              />
              {errors.username && (
                <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  {...register('password', { required: 'La contraseña es requerida' })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-primary-300 text-xs mt-6">
          Sistema de AssistControl · v1.0
        </p>
      </div>
    </div>
  )
}
