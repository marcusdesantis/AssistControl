import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { User, Mail, KeyRound, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { sysApi } from '@/services/sysApi'
import { useSysAuthStore } from '@/store/sysAuthStore'

interface PasswordForm {
  currentPassword: string
  newPassword:     string
  confirmPassword: string
}

export default function SysProfilePage() {
  const { user } = useSysAuthStore()
  const initials = user?.name?.slice(0, 2).toUpperCase() ?? 'SA'

  const [savingPwd,   setSavingPwd]   = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, watch, reset, setError, formState: { errors } } = useForm<PasswordForm>()
  const newPassword = watch('newPassword')

  const onChangePassword = async (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      setError('confirmPassword', { message: 'Las contraseñas no coinciden.' })
      return
    }
    setSavingPwd(true)
    try {
      await sysApi.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
      })
      reset()
      toast.success('Contraseña cambiada correctamente.')
    } catch (err: any) {
      const code = err?.response?.data?.code
      if (code === 'INVALID_CURRENT_PASSWORD')
        setError('currentPassword', { message: 'La contraseña actual es incorrecta.' })
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
        <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white text-2xl font-bold">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-gray-900 truncate">{user?.name}</p>
          <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            <ShieldCheck className="w-3 h-3" />
            Superadministrador
          </span>
        </div>
      </div>

      {/* Datos del perfil */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <User className="w-4 h-4 text-slate-600" />
          <h2 className="text-sm font-semibold text-gray-800">Información de la cuenta</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-600">{user?.name}</span>
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
          <KeyRound className="w-4 h-4 text-slate-600" />
          <h2 className="text-sm font-semibold text-gray-800">Cambiar contraseña</h2>
        </div>
        <form onSubmit={handleSubmit(onChangePassword)} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contraseña actual</label>
            <div className="relative">
              <input
                {...register('currentPassword', { required: 'Requerido' })}
                type={showCurrent ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              <button type="button" onClick={() => setShowCurrent(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.currentPassword && <p className="text-xs text-red-500 mt-1">{errors.currentPassword.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nueva contraseña</label>
            <div className="relative">
              <input
                {...register('newPassword', { required: 'Requerido', minLength: { value: 6, message: 'Mínimo 6 caracteres' } })}
                type={showNew ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              <button type="button" onClick={() => setShowNew(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Confirmar nueva contraseña</label>
            <div className="relative">
              <input
                {...register('confirmPassword', {
                  required: 'Requerido',
                  validate: v => v === newPassword || 'Las contraseñas no coinciden',
                })}
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repite la nueva contraseña"
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              <button type="button" onClick={() => setShowConfirm(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={savingPwd}
              className="flex items-center gap-2 px-5 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
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
