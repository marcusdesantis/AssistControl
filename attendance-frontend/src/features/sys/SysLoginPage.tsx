import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ShieldCheck, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { sysAuthService } from './sysService'
import { useSysAuthStore } from '@/store/sysAuthStore'

interface Form { email: string; password: string }

export default function SysLoginPage() {
  const navigate  = useNavigate()
  const setAuth   = useSysAuthStore((s) => s.setAuth)
  const [showPwd, setShowPwd] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<Form>()

  const onSubmit = async (data: Form) => {
    setError(null)
    setLoading(true)
    try {
      const res = await sysAuthService.login(data.email, data.password)
      setAuth({ email: res.email, name: res.name }, res.token)
      navigate('/sys', { replace: true })
    } catch {
      setError('Credenciales inválidas o sin acceso.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur rounded-2xl mb-4">
            <ShieldCheck className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
          <p className="text-slate-400 mt-1 text-sm">Acceso restringido</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico</label>
              <input
                {...register('email', { required: 'Requerido' })}
                type="email" placeholder="admin@sistema.com" autoComplete="email"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Requerido' })}
                  type={showPwd ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <LogIn className="w-4 h-4" />}
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
