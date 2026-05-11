import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { User, Mail, KeyRound, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/authStore'

const ROLE_LABEL: Record<string, string> = {
  Admin: 'Administrador', Supervisor: 'Supervisor', Employee: 'Empleado',
}

interface PasswordForm {
  currentPassword: string
  newPassword:     string
  confirmPassword: string
}

export default function ProfilePage() {
  const { user, setAuth, accessToken, refreshToken, capabilities } = useAuthStore()

  const [savingPwd,   setSavingPwd]   = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { register: regW, handleSubmit: hsW, watch, reset: resetPwd, setError: setErrW, formState: { errors: errW } } = useForm<PasswordForm>()
  const newPassword = watch('newPassword')

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? 'U'

  const onChangePassword = async (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      setErrW('confirmPassword', { message: 'Las contraseñas no coinciden.' })
      return
    }
    setSavingPwd(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
        confirmPassword: data.confirmPassword,
      })
      resetPwd()
      toast.success('Contraseña cambiada correctamente.')
      if (user && accessToken && refreshToken) {
        setAuth({ ...user, mustChangePassword: false }, accessToken, refreshToken, capabilities)
      }
    } catch (err: any) {
      const code = err?.response?.data?.code
      if (code === 'INVALID_CURRENT_PASSWORD')
        setErrW('currentPassword', { message: 'La contraseña actual es incorrecta.' })
      else
        toast.error(err?.response?.data?.message ?? 'Error al cambiar la contraseña.')
    } finally { setSavingPwd(false) }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-gray-500 text-sm mt-0.5">Gestiona tus datos y seguridad</p>
      </div>

      {/* Avatar + info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
        <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white text-2xl font-bold">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-gray-900 truncate">{user?.username}</p>
          <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
            <ShieldCheck className="w-3 h-3" />
            {ROLE_LABEL[user?.role ?? ''] ?? user?.role}
          </span>
        </div>
      </div>

      {/* Datos del perfil */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <User className="w-4 h-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-800">Información de la cuenta</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Usuario</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-600">{user?.username}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Correo electrónico</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-600">{user?.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <KeyRound className="w-4 h-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-800">Cambiar contraseña</h2>
        </div>
        <form onSubmit={hsW(onChangePassword)} className="p-5 space-y-4">
          {/* Contraseña actual */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contraseña actual</label>
            <div className="relative">
              <input
                {...regW('currentPassword', { required: 'Requerido' })}
                type={showCurrent ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button type="button" onClick={() => setShowCurrent(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errW.currentPassword && <p className="text-xs text-red-500 mt-1">{errW.currentPassword.message}</p>}
          </div>

          {/* Nueva contraseña */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nueva contraseña</label>
            <div className="relative">
              <input
                {...regW('newPassword', { required: 'Requerido', minLength: { value: 6, message: 'Mínimo 6 caracteres' } })}
                type={showNew ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button type="button" onClick={() => setShowNew(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errW.newPassword && <p className="text-xs text-red-500 mt-1">{errW.newPassword.message}</p>}
          </div>

          {/* Confirmar */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Confirmar nueva contraseña</label>
            <div className="relative">
              <input
                {...regW('confirmPassword', {
                  required: 'Requerido',
                  validate: v => v === newPassword || 'Las contraseñas no coinciden',
                })}
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repite la nueva contraseña"
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button type="button" onClick={() => setShowConfirm(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errW.confirmPassword && <p className="text-xs text-red-500 mt-1">{errW.confirmPassword.message}</p>}
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={savingPwd}
              className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
              {savingPwd
                ? <><Loader2 className="w-4 h-4 animate-spin" />Cambiando…</>
                : <><KeyRound className="w-4 h-4" />Cambiar contraseña</>}
            </button>
          </div>
        </form>
      </div>

    </div>
  )
}
