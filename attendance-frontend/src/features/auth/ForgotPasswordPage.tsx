import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { api } from '@/services/api'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true); setError(null)
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() })
      setSent(true)
    } catch (err: any) {
      const code = err?.response?.data?.errorCode ?? err?.response?.data?.code
      if (code === 'EMAIL_NOT_FOUND')
        setError('No existe una cuenta asociada a este correo electrónico.')
      else if (code === 'SMTP_NOT_CONFIGURED')
        setError('El servicio de correo no está configurado. Contacta al administrador del sistema.')
      else
        setError(err?.response?.data?.message ?? 'Error al enviar el correo. Intenta nuevamente.')
    } finally { setLoading(false) }
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
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">¡Correo enviado!</h2>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  Si <strong>{email}</strong> está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.
                </p>
                <p className="text-xs text-gray-400 mt-2">El enlace es válido por 1 hora.</p>
              </div>
              <Link to="/login"
                className="flex items-center justify-center gap-2 w-full py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <h2 className="text-xl font-bold text-gray-900">¿Olvidaste tu contraseña?</h2>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Ingresa tu correo y te enviaremos un enlace para restablecerla.
                </p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@empresa.com"
                      required
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando…</> : 'Enviar enlace'}
                </button>

                <Link to="/login"
                  className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio de sesión
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
