import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2, AlertCircle, Mail, Send } from 'lucide-react'
import axios from 'axios'

type State = 'loading' | 'success' | 'pending' | 'invalid' | 'expired' | 'error' | 'resend_form' | 'resend_sent' | 'resend_error'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

// ── Componente fuera del padre para evitar re-montaje en cada keystroke ───────
function ResendForm({
  title, subtitle, icon,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
}) {
  const [email,         setEmail]        = useState('')
  const [loading,       setLoading]      = useState(false)
  const [sent,          setSent]         = useState(false)
  const [alreadyVerif,  setAlreadyVerif] = useState(false)
  const [errMsg,        setErrMsg]       = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setErrMsg('')
    try {
      await axios.post(`${BASE_URL}/api/v1/auth/resend-verification`, { email: email.trim() })
      setSent(true)
    } catch (err: any) {
      const code = err?.response?.data?.code ?? err?.response?.data?.errorCode
      if (code === 'ALREADY_VERIFIED') setAlreadyVerif(true)
      else setErrMsg(err?.response?.data?.message ?? 'No se pudo reenviar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (alreadyVerif) return (
    <>
      <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-9 h-9 text-green-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">¡Ya verificado!</h2>
      <p className="text-gray-500 text-sm mb-6">Tu correo ya fue verificado. Puedes iniciar sesión.</p>
      <Link to="/login" className="inline-block w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-xl text-sm transition">
        Ir al login
      </Link>
    </>
  )

  if (sent) return (
    <>
      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-9 h-9 text-blue-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">¡Correo reenviado!</h2>
      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
        Te enviamos un nuevo enlace. Revisa tu bandeja de entrada.
        <span className="block text-gray-400 text-xs mt-1">Válido por 24 horas.</span>
      </p>
      <Link to="/login" className="inline-block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition">
        Volver al inicio
      </Link>
    </>
  )

  return (
    <>
      <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500 text-sm mb-5 leading-relaxed">{subtitle}</p>
      <form onSubmit={handleSubmit} className="text-left space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tu correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@empresa.com"
            required
            autoFocus
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {errMsg && <p className="text-red-500 text-xs">{errMsg}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {loading ? 'Enviando...' : 'Reenviar enlace'}
        </button>
      </form>
      <div className="mt-4 pt-3 border-t border-gray-100">
        <Link to="/login" className="text-xs text-gray-400 hover:text-gray-600 transition">← Volver al inicio de sesión</Link>
      </div>
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function VerifyEmailPage() {
  const [params]  = useSearchParams()
  const [state,   setState]   = useState<State>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setState('resend_form'); return }

    axios.get(`${BASE_URL}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(res => setState(res.data?.data?.requiresApproval ? 'pending' : 'success'))
      .catch(err => {
        const code = err?.response?.data?.code ?? err?.response?.data?.errorCode
        if (code === 'TOKEN_EXPIRED')    setState('expired')
        else if (code === 'INVALID_TOKEN') setState('invalid')
        else { setState('error'); setMessage(err?.response?.data?.message ?? 'Error desconocido.') }
      })
  }, [params])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-sm w-full">

        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <img src="/logo-landing-pages.png" alt="TiempoYa" className="h-9 w-auto object-contain" />
        </div>

        {state === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verificando...</h2>
            <p className="text-gray-400 text-sm">Por favor espera un momento.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">¡Correo verificado!</h2>
            <p className="text-gray-500 text-sm mb-6">Tu cuenta está activa. Ya puedes iniciar sesión.</p>
            <Link to="/login" className="inline-block w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-xl text-sm transition">
              Ir al inicio de sesión
            </Link>
          </>
        )}

        {state === 'pending' && (
          <>
            <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-9 h-9 text-yellow-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Correo verificado</h2>
            <p className="text-gray-500 text-sm mb-6">
              Tu empresa está pendiente de aprobación. El administrador la revisará pronto.
            </p>
            <Link to="/login" className="inline-block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition">
              Volver al inicio
            </Link>
          </>
        )}

        {state === 'expired' && (
          <ResendForm
            title="Enlace expirado"
            subtitle="El enlace expiró (válido 24 horas). Ingresa tu correo para recibir uno nuevo."
            icon={<div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center"><XCircle className="w-9 h-9 text-orange-400" /></div>}
          />
        )}

        {state === 'invalid' && (
          <ResendForm
            title="Enlace no válido"
            subtitle="Este enlace ya fue utilizado o no es válido. Ingresa tu correo para recibir uno nuevo."
            icon={<div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center"><XCircle className="w-9 h-9 text-red-400" /></div>}
          />
        )}

        {state === 'resend_form' && (
          <ResendForm
            title="Reenviar verificación"
            subtitle="Ingresa el correo con el que te registraste para recibir un nuevo enlace."
            icon={<div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center"><Mail className="w-9 h-9 text-blue-500" /></div>}
          />
        )}

        {state === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-9 h-9 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-500 text-sm mb-6">{message || 'Ocurrió un error inesperado.'}</p>
            <Link to="/login" className="inline-block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition">
              Volver al inicio
            </Link>
          </>
        )}

      </div>
    </div>
  )
}
