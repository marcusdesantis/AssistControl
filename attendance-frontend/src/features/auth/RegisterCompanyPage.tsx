import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import axios from 'axios'
import {
  Clock, Eye, EyeOff, CheckCircle2, ArrowRight, Building2,
  Users, BarChart3, Smartphone, Shield, Zap, Globe,
} from 'lucide-react'
import { api } from '@/services/api'

type Form = {
  companyName: string
  username:    string
  email:       string
  password:    string
  confirm:     string
}

const FEATURES = [
  { icon: Clock,       title: 'Control en tiempo real',    desc: 'Registra entradas y salidas al instante desde cualquier dispositivo.' },
  { icon: Smartphone,  title: 'App móvil incluida',         desc: 'Tus empleados marcan asistencia desde su celular con GPS automático.' },
  { icon: BarChart3,   title: 'Reportes detallados',        desc: 'Analiza tardanzas, ausencias y horas trabajadas con gráficos claros.' },
  { icon: Users,       title: 'Multi-empleado',             desc: 'Gestiona departamentos, cargos y horarios para todo tu equipo.' },
  { icon: Shield,      title: 'Seguro y confiable',         desc: 'Datos cifrados, backups automáticos y acceso por roles.' },
  { icon: Zap,         title: 'Fácil de usar',              desc: 'Sin configuraciones complejas. Listo para usar en minutos.' },
]


export default function RegisterCompanyPage() {
  const navigate  = useNavigate()
  const [showPass,    setShowPass]    = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [success,     setSuccess]     = useState(false)
  const [freePlanLimit, setFreePlanLimit] = useState<number | null>(null)

  const { register, handleSubmit, watch, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<Form>()
  const password = watch('password')

  useEffect(() => {
    const BASE_URL = import.meta.env.VITE_API_URL ?? ''
    axios.get(`${BASE_URL}/api/v1/public/plans`)
      .then(res => setFreePlanLimit(res.data?.data?.maxEmployees ?? null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    document.title = 'Registra tu empresa gratis — AssistControl'
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta) }
    meta.content = 'Crea tu cuenta gratuita en AssistControl y comienza a gestionar la asistencia de tus empleados hoy mismo. Sin tarjeta de crédito.'

    const ogTags: Record<string, string> = {
      'og:title':       'Registra tu empresa gratis — AssistControl',
      'og:description': 'Plataforma de control de asistencia para empresas. App móvil, reportes y gestión de equipos en un solo lugar.',
      'og:type':        'website',
    }
    Object.entries(ogTags).forEach(([prop, content]) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${prop}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el) }
      el.content = content
    })
    return () => { document.title = 'AssistControl' }
  }, [])

  const onSubmit = async (data: Form) => {
    setError(null)
    try {
      const locale   = navigator.language || navigator.languages?.[0] || ''
      const country  = locale.includes('-') ? locale.split('-').pop()!.toUpperCase() : 'EC'
      await api.post('/auth/register', {
        companyName: data.companyName.trim(),
        username:    data.username.trim().toLowerCase(),
        email:       data.email.trim().toLowerCase(),
        password:    data.password,
        timeZone:    Intl.DateTimeFormat().resolvedOptions().timeZone,
        country,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err: any) {
      const code = err?.response?.data?.code ?? err?.response?.data?.errorCode
      const msg  = err?.response?.data?.message
      if (code === 'USERNAME_TAKEN')
        setFieldError('username', { message: 'Este usuario ya está en uso.' })
      else if (code === 'EMAIL_TAKEN')
        setFieldError('email', { message: 'Este correo ya está registrado.' })
      else if (code === 'COMPANY_NAME_TAKEN')
        setFieldError('companyName', { message: 'Ya existe una empresa con ese nombre.' })
      else
        setError(msg ?? 'No se pudo crear la cuenta. Intenta nuevamente.')
    }
  }

  if (success) return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-sm w-full">
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">¡Empresa registrada!</h2>
        <p className="text-gray-500 text-sm">Redirigiendo al inicio de sesión...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">AssistControl</span>
          </div>
          <span className="text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">
              Inicia sesión
            </Link>
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-4 py-10 gap-12">

        {/* ── Lado izquierdo — Info ──────────────────────────────────────────── */}
        <div className="lg:w-1/2 flex flex-col justify-center">
          <div className="mb-2">
            <span className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 text-xs font-semibold px-3 py-1 rounded-full">
              <Zap className="w-3 h-3" /> Disponible en web y móvil
            </span>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 leading-tight mb-4">
            Controla la asistencia<br />
            <span className="text-primary-600">de tu equipo</span> sin complicaciones
          </h1>
          <p className="text-gray-500 text-lg mb-8 leading-relaxed">
            AssistControl es la plataforma más sencilla para registrar entradas,
            salidas y generar reportes de asistencia. App móvil con GPS incluida.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3">
                <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4.5 h-4.5 text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{title}</p>
                  <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Sin tarjeta de crédito</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Hasta {freePlanLimit ?? 10} empleados gratis</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-green-500" />
              <span>En español</span>
            </div>
          </div>
        </div>

        {/* ── Lado derecho — Formulario ──────────────────────────────────────── */}
        <div className="lg:w-1/2 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full max-w-md">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Crea tu cuenta gratis</h2>
              <p className="text-gray-400 text-sm mt-1">Empieza en menos de 2 minutos</p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {/* Nombre empresa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                  Nombre de la empresa
                </label>
                <input
                  {...register('companyName', { required: 'Requerido', minLength: { value: 2, message: 'Mínimo 2 caracteres' } })}
                  placeholder="Mi Empresa S.A."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
                {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>}
              </div>

              {/* Usuario y email en fila */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario admin</label>
                  <input
                    {...register('username', { required: 'Requerido', minLength: { value: 3, message: 'Mínimo 3 caracteres' }, pattern: { value: /^[a-z0-9_]+$/, message: 'Solo letras minúsculas, números y _' } })}
                    placeholder="admin"
                    autoCapitalize="none"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  />
                  {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                  <input
                    {...register('email', { required: 'Requerido', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Correo no válido' } })}
                    type="email"
                    placeholder="tu@empresa.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <div className="relative">
                  <input
                    {...register('password', { required: 'Requerido', minLength: { value: 6, message: 'Mínimo 6 caracteres' } })}
                    type={showPass ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              {/* Confirmar contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                <div className="relative">
                  <input
                    {...register('confirm', { required: 'Requerido', validate: v => v === password || 'Las contraseñas no coinciden' })}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repite tu contraseña"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition text-sm"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Crear cuenta gratis <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-center text-xs text-gray-400 leading-relaxed">
                Al registrarte aceptas nuestros{' '}
                <Link to="/terms" className="text-primary-600 hover:underline font-medium">
                  Términos de uso
                </Link>
                {' '}y{' '}
                <Link to="/privacy" className="text-primary-600 hover:underline font-medium">
                  Política de privacidad
                </Link>.
              </p>
            </form>
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span>© {new Date().getFullYear()} AssistControl. Todos los derechos reservados.</span>
          <span>Sistema de Gestión de Asistencia</span>
        </div>
      </footer>

    </div>
  )
}
