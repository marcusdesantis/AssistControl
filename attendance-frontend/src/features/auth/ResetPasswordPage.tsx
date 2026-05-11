import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Clock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { api } from '@/services/api'

interface Form {
  newPassword:     string
  confirmPassword: string
}

type TokenState = 'checking' | 'valid' | 'invalid' | 'used' | 'expired'

const TOKEN_MESSAGES: Record<string, { title: string; body: string }> = {
  invalid:  { title: 'Enlace inválido',   body: 'Este enlace de recuperación no existe o fue mal escrito.' },
  used:     { title: 'Enlace ya utilizado', body: 'Este enlace ya fue usado para cambiar la contraseña. Si necesitas otro, solicítalo de nuevo.' },
  expired:  { title: 'Enlace expirado',   body: 'Este enlace expiró (válido 1 hora). Solicita uno nuevo desde el inicio de sesión.' },
}

export default function ResetPasswordPage() {
  const [searchParams]  = useSearchParams()
  const navigate        = useNavigate()
  const token           = searchParams.get('token') ?? ''

  const [tokenState,  setTokenState]  = useState<TokenState>(token ? 'checking' : 'invalid')
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success,     setSuccess]     = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Form>()
  const newPassword = watch('newPassword')

  useEffect(() => {
    if (!token) { setTokenState('invalid'); return }
    api.get(`/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(() => setTokenState('valid'))
      .catch((err: any) => {
        const code = err?.response?.data?.errorCode ?? err?.response?.data?.code
        if (code === 'TOKEN_USED')    setTokenState('used')
        else if (code === 'TOKEN_EXPIRED') setTokenState('expired')
        else                               setTokenState('invalid')
      })
  }, [token])

  const onSubmit = async (data: Form) => {
    setServerError(null)
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword:     data.newPassword,
        confirmPassword: data.confirmPassword,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    } catch (err: any) {
      const code = err?.response?.data?.errorCode ?? err?.response?.data?.code
      if (code === 'TOKEN_USED')     setTokenState('used')
      else if (code === 'TOKEN_EXPIRED') setTokenState('expired')
      else setServerError(err?.response?.data?.message ?? 'Error al restablecer la contraseña.')
    }
  }

  // ── Estado: verificando ───────────────────────────────────────────────────
  if (tokenState === 'checking') return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto" />
        <p className="text-sm text-gray-500">Verificando enlace…</p>
      </div>
    </div>
  )

  // ── Estado: inválido / usado / expirado ───────────────────────────────────
  if (tokenState !== 'valid' && !success) {
    const msg = TOKEN_MESSAGES[tokenState] ?? TOKEN_MESSAGES.invalid
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{msg.title}</h2>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{msg.body}</p>
          </div>
          <Link to="/forgot-password"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" /> Solicitar nuevo enlace
          </Link>
          <Link to="/login" className="block text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">TiempoYa</span>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">¡Contraseña restablecida!</h2>
                <p className="text-sm text-gray-500 mt-2">Redirigiendo al inicio de sesión…</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <h2 className="text-xl font-bold text-gray-900">Nueva contraseña</h2>
                <p className="text-sm text-gray-500 mt-1">Elige una contraseña segura para tu cuenta.</p>
              </div>

              {serverError && (
                <div className="mb-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      {...register('newPassword', { required: 'Requerido', minLength: { value: 6, message: 'Mínimo 6 caracteres' } })}
                      type={showNew ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button type="button" onClick={() => setShowNew(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword', {
                        required: 'Requerido',
                        validate:  v => v === newPassword || 'Las contraseñas no coinciden',
                      })}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repite la contraseña"
                      autoComplete="new-password"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button type="button" onClick={() => setShowConfirm(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
                </div>

                <button type="submit" disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
                  {isSubmitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando…</>
                    : 'Restablecer contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
