import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { KeyRound, AlertCircle, CheckCircle } from 'lucide-react'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/authStore'

interface ChangePasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { clearAuth } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ChangePasswordForm>()
  const newPassword = watch('newPassword')

  const onSubmit = async (data: ChangePasswordForm) => {
    setError(null)
    setLoading(true)
    try {
      await api.post('/auth/change-password', data)
      clearAuth()
      navigate('/login', { replace: true })
    } catch {
      setError('Error al cambiar contraseña. Verifica tu contraseña actual.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur rounded-2xl mb-4">
            <KeyRound className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Cambio de Contraseña</h1>
          <p className="text-primary-200 mt-1 text-sm">Debes cambiar tu contraseña antes de continuar</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {field === 'currentPassword' ? 'Contraseña actual' :
                   field === 'newPassword' ? 'Nueva contraseña' : 'Confirmar contraseña'}
                </label>
                <input
                  {...register(field as keyof ChangePasswordForm, {
                    required: 'Este campo es requerido',
                    ...(field === 'newPassword' && { minLength: { value: 8, message: 'Mínimo 8 caracteres' } }),
                    ...(field === 'confirmPassword' && {
                      validate: (v) => v === newPassword || 'Las contraseñas no coinciden'
                    }),
                  })}
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
                {errors[field as keyof ChangePasswordForm] && (
                  <p className="text-red-500 text-xs mt-1">{errors[field as keyof ChangePasswordForm]?.message}</p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {loading ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
