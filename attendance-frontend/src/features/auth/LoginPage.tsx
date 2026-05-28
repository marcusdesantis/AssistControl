import { useState, useEffect, useCallback } from 'react'

const _loginNotice = (() => {
  const v = localStorage.getItem('login_notice')
  if (v) localStorage.removeItem('login_notice')
  return v
})()
import { useNavigate, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, LogIn, AlertCircle, Lock, UserX, ClipboardCheck, Mail,
         Fingerprint, Scan, Grid3X3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { authService } from './authService'
import { useAuthStore } from '@/store/authStore'
import { useAndroidBack } from '@/hooks/useAndroidBack'
import { isNative } from '@/utils/platform'
import * as bio from '@/services/biometricService'
import * as pin from '@/services/pinService'

type LoginMethod = 'user' | 'biometric' | 'pin'

interface LoginForm {
  username: string
  password: string
}

export default function LoginPage() {
  useAndroidBack()
  const navigate  = useNavigate()
  const setAuth   = useAuthStore((s) => s.setAuth)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [method,        setMethod]        = useState<LoginMethod>('user')
  const [showPassword,  setShowPassword]  = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [pinDigits,     setPinDigits]     = useState('')

  // Estado biométrico / PIN
  const [bioAvailable,  setBioAvailable]  = useState(false)
  const [bioEnabled,    setBioEnabled]    = useState(false)
  const [bioType,       setBioType]       = useState<bio.BiometricType>('none')
  const [pinEnabled,    setPinEnabled]    = useState(false)

  // Modales de error de login
  const [deactivatedModal,      setDeactivatedModal]      = useState(false)
  const [userDeactivatedModal,  setUserDeactivatedModal]  = useState(_loginNotice === 'user_inactive')
  const [pendingModal,          setPendingModal]          = useState(false)
  const [emailNotVerifiedModal, setEmailNotVerifiedModal] = useState(false)

  // Modales biométrico
  const [showBioOffer,    setShowBioOffer]    = useState(false)
  const [showBioInfo,     setShowBioInfo]     = useState(false)
  const [showPinForgot,   setShowPinForgot]   = useState(false)
  const [pendingAuth,     setPendingAuth]     = useState<{ data: any; username: string; password: string } | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  useEffect(() => {
    if (!isNative) return
    bio.isBiometricAvailable().then(avail => {
      setBioAvailable(avail)
      if (avail) {
        bio.getBiometricType().then(setBioType)
        bio.isBiometricEnabled().then(en => { setBioEnabled(en); if (en) setMethod('biometric') })
      }
    })
    pin.isPinEnabled().then(en => { setPinEnabled(en); })
  }, [])

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  // ── Completar login: setAuth + navegar ──────────────────────────────────────
  const completeLogin = useCallback(async (res: any, username: string) => {
    // Si el usuario guardado en biométrico/PIN es distinto al que acaba de entrar, limpiar
    const bioUser = await bio.getStoredUsername()
    if (bioUser && bioUser !== username) {
      await bio.disableBiometric()
      setBioEnabled(false)
    }
    const pinUser = await pin.getPinStoredUsername()
    if (pinUser && pinUser !== username) {
      await pin.disablePin()
      setPinEnabled(false)
    }

    const { user, accessToken, refreshToken, capabilities } = res
    setAuth(user, accessToken, refreshToken, capabilities)
    navigate(user.mustChangePassword ? '/change-password' : '/dashboard', { replace: true })
  }, [setAuth, navigate])

  // ── Manejo de errores comunes ────────────────────────────────────────────────
  const handleLoginError = useCallback((err: any, fallback?: string) => {
    const code = err?.response?.data?.code ?? err?.response?.data?.errorCode
    const msg  = err?.response?.data?.message
    if      (code === 'TENANT_INACTIVE')    setDeactivatedModal(true)
    else if (code === 'USER_INACTIVE')      setUserDeactivatedModal(true)
    else if (code === 'TENANT_PENDING')     setPendingModal(true)
    else if (code === 'EMAIL_NOT_VERIFIED') setEmailNotVerifiedModal(true)
    else if (code === 'INVALID_CREDENTIALS') setError(msg ?? 'Credenciales incorrectas.')
    else setError(msg ?? fallback ?? 'No se pudo conectar con el servidor.')
  }, [])

  // ── Login con usuario y contraseña ──────────────────────────────────────────
  const onSubmit = async (data: LoginForm) => {
    setError(null)
    setLoading(true)
    try {
      const res = await authService.login(data)
      if (!res.success || !res.data) { setError(res.message ?? 'Error al iniciar sesión'); return }

      if (isNative && bioAvailable && !bioEnabled) {
        setPendingAuth({ data: res.data, username: data.username, password: data.password })
        setShowBioOffer(true)
      } else {
        await completeLogin(res.data, data.username)
      }
    } catch (err: any) {
      handleLoginError(err)
    } finally { setLoading(false) }
  }

  // ── Login biométrico ─────────────────────────────────────────────────────────
  const handleBioLogin = async () => {
    setLoading(true); setError(null)
    try {
      const creds = await bio.getCredentials()
      if (!creds) { setLoading(false); return }
      const res = await authService.login({ username: creds.username, password: creds.password })
      if (!res.success || !res.data) { setError('Error al iniciar sesión'); return }
      await completeLogin(res.data, creds.username)
    } catch (err: any) {
      setError('Sesión expirada. Usa usuario y contraseña.')
      bio.disableBiometric(); setBioEnabled(false); setMethod('user')
    } finally { setLoading(false) }
  }

  // ── Login con PIN ────────────────────────────────────────────────────────────
  const handlePinLogin = async (p: string) => {
    setLoading(true); setError(null)
    try {
      const ok = await pin.verifyPin(p)
      if (!ok) { setError('PIN incorrecto.'); setPinDigits(''); setLoading(false); return }
      const creds = await pin.getPinCredentials()
      if (!creds) { setError('Sesión expirada. Usa usuario y contraseña.'); setPinDigits(''); setLoading(false); return }
      const res = await authService.login(creds)
      if (!res.success || !res.data) { setError('Error al iniciar sesión'); return }
      await completeLogin(res.data, creds.username)
    } catch (err: any) {
      handleLoginError(err, 'Sesión expirada. Usa usuario y contraseña.')
      setPinDigits(''); setMethod('user')
    } finally { setLoading(false) }
  }

  const addPinDigit = (d: string) => {
    if (pinDigits.length >= 4) return
    const next = pinDigits + d
    setPinDigits(next)
    setError(null)
    if (next.length === 4) setTimeout(() => handlePinLogin(next), 100)
  }

  // ── Offer: activar biométrico ────────────────────────────────────────────────
  const handleActivateBio = async () => {
    if (!pendingAuth) return
    setShowBioOffer(false)
    try {
      await bio.saveCredentials(pendingAuth.username, pendingAuth.password)
      setBioEnabled(true)
    } catch { /* cancelado */ }
    await completeLogin(pendingAuth.data, pendingAuth.username)
    setPendingAuth(null)
  }

  const handleDeclineBio = () => {
    setShowBioOffer(false)
    setShowBioInfo(true)
  }

  const handleBioInfoClose = async () => {
    setShowBioInfo(false)
    if (pendingAuth) {
      await completeLogin(pendingAuth.data, pendingAuth.username)
      setPendingAuth(null)
    }
  }

  const bioLabel = bioType === 'facial' ? 'Huella/Face ID' : 'Huella digital'
  const bioIcon  = bioType === 'facial'
    ? <Scan className="w-7 h-7" />
    : <Fingerprint className="w-7 h-7" />

  const methods = [
    { key: 'user'      as LoginMethod, label: 'Usuario',  icon: <LogIn className="w-7 h-7" />, show: true },
    { key: 'biometric' as LoginMethod, label: bioLabel,   icon: bioIcon,                        show: isNative && bioAvailable && bioEnabled },
    { key: 'pin'       as LoginMethod, label: 'PIN',       icon: <Grid3X3 className="w-7 h-7" />, show: isNative && pinEnabled },
  ].filter(m => m.show)

  // ── Modales de estado ────────────────────────────────────────────────────────
  const ModalWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm text-center">
        {children}
      </div>
    </div>
  )

  if (userDeactivatedModal) return (
    <ModalWrapper>
      <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5"><UserX className="w-7 h-7 text-amber-500" /></div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Usuario desactivado</h2>
      <p className="text-gray-500 text-sm mb-6">Tu usuario ha sido desactivado por el administrador de tu empresa.</p>
      <button onClick={() => setUserDeactivatedModal(false)} className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm transition-colors">Volver al login</button>
    </ModalWrapper>
  )

  if (pendingModal) return (
    <ModalWrapper>
      <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5"><ClipboardCheck className="w-7 h-7 text-amber-500" /></div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Empresa en validación</h2>
      <p className="text-gray-500 text-sm mb-6">Tu empresa está siendo revisada. Te notificaremos cuando sea aprobada.</p>
      <button onClick={() => setPendingModal(false)} className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm transition-colors">Entendido</button>
    </ModalWrapper>
  )

  if (emailNotVerifiedModal) return (
    <ModalWrapper>
      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5"><Mail className="w-7 h-7 text-blue-500" /></div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Verifica tu correo</h2>
      <p className="text-gray-500 text-sm mb-6 leading-relaxed">Debes confirmar tu correo electrónico antes de iniciar sesión.</p>
      <button onClick={() => setEmailNotVerifiedModal(false)} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors mb-2">Entendido</button>
      <Link to="/verify-email" className="block text-xs text-center text-blue-500 hover:text-blue-700 font-medium mt-1">¿No recibiste el correo? Solicitar reenvío →</Link>
    </ModalWrapper>
  )

  if (deactivatedModal) return (
    <ModalWrapper>
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5"><Lock className="w-7 h-7 text-red-400" /></div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Empresa desactivada</h2>
      <p className="text-gray-500 text-sm mb-6">Tu empresa ha sido desactivada por el administrador del sistema.</p>
      <button onClick={() => setDeactivatedModal(false)} className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors">Volver al login</button>
    </ModalWrapper>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-block">
            <img src="/tiempoya-login.png" alt="TiempoYa" className="h-28 w-auto object-contain mx-auto mb-1" />
          </a>
          <p className="text-primary-200 text-sm">Panel de administración</p>
        </div>

        {/* Selector de método (solo en móvil con más de 1 opción) */}
        {isNative && methods.length > 1 && (
          <div className="flex gap-3 mb-4">
            {methods.map(m => (
              <button
                key={m.key}
                onClick={() => { setMethod(m.key); setError(null); setPinDigits('') }}
                className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all ${
                  method === m.key
                    ? 'bg-white/20 border-white text-white shadow-lg'
                    : 'bg-white/5 border-white/20 text-white/50 hover:bg-white/10'
                }`}
              >
                {m.icon}
                <span className="text-xs font-semibold">{m.label}</span>
                {method === m.key && <div className="w-1 h-1 rounded-full bg-white" />}
              </button>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Usuario y contraseña ── */}
          {method === 'user' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Usuario</label>
                <input
                  {...register('username', { required: 'El usuario es requerido' })}
                  type="text" placeholder="admin" autoComplete="username"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
                {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                  <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline font-medium">¿Olvidaste tu contraseña?</Link>
                </div>
                <div className="relative">
                  <input
                    {...register('password', { required: 'La contraseña es requerida' })}
                    type={showPassword ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password"
                    className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2">
                {loading
                  ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <LogIn className="w-4 h-4" />}
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          )}

          {/* ── Biométrico ── */}
          {method === 'biometric' && (
            <div className="flex flex-col items-center gap-5 py-4">
              <button
                onClick={handleBioLogin}
                disabled={loading}
                className="w-28 h-28 rounded-full bg-primary-50 border-2 border-primary-500 flex items-center justify-center hover:bg-primary-100 active:scale-95 transition-all disabled:opacity-60 shadow-lg"
              >
                {loading
                  ? <span className="w-8 h-8 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                  : <span className="text-primary-600">{bioIcon}</span>}
              </button>
              <p className="text-gray-500 text-sm">
                {bioType === 'facial' ? 'Toca para escanear' : 'Toca para leer tu huella'}
              </p>
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm w-full">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
                </div>
              )}
              <button onClick={() => { setMethod('user'); setError(null) }}
                className="text-primary-600 text-sm font-medium hover:underline">
                Usar usuario y contraseña
              </button>
            </div>
          )}

          {/* ── PIN ── */}
          {method === 'pin' && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-700 font-semibold">Ingresa tu PIN</p>

              {/* Puntos */}
              <div className="flex gap-4">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
                    pinDigits.length > i ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                  }`} />
                ))}
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm w-full">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
                </div>
              )}

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
                  d === '' ? <div key={i} /> :
                  <button
                    key={i}
                    onClick={() => d === '⌫' ? setPinDigits(p => p.slice(0,-1)) : addPinDigit(d)}
                    disabled={loading}
                    className="h-14 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 active:scale-95 text-gray-800 text-lg font-semibold transition-all disabled:opacity-50"
                  >
                    {loading && d !== '⌫'
                      ? <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
                      : d}
                  </button>
                ))}
              </div>

              <button onClick={() => setShowPinForgot(true)} className="text-gray-400 text-xs hover:underline">
                ¿Olvidaste tu PIN?
              </button>
              <button onClick={() => { setMethod('user'); setError(null); setPinDigits('') }}
                className="text-primary-600 text-sm font-medium hover:underline">
                Usar usuario y contraseña
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-primary-200 text-sm mt-5">
          ¿Aún no tienes cuenta?{' '}
          <Link to="/sign-up" className="text-white font-semibold hover:underline">Regístrate gratis</Link>
        </p>
        <p className="text-center text-primary-300 text-xs mt-3">Sistema de TiempoYa · v1.0</p>
      </div>

      {/* ── Modal: ofrecer biométrico ── */}
      {showBioOffer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600">{bioIcon}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {bioType === 'facial' ? 'Activar Huella/Face ID' : 'Activar huella digital'}
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              {bioType === 'facial'
                ? 'La próxima vez podrás ingresar con tu cara, sin escribir tu contraseña.'
                : 'La próxima vez podrás ingresar con tu huella digital, sin escribir tu contraseña.'}
            </p>
            <button onClick={handleActivateBio}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors mb-2">
              Activar
            </button>
            <button onClick={handleDeclineBio}
              className="w-full py-2.5 text-gray-400 text-sm hover:text-gray-600 transition-colors">
              Ahora no
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: info tras rechazar ── */}
      {showBioInfo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600">{bioIcon}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Sin problema</h3>
            <p className="text-gray-500 text-sm mb-6">
              Puedes activar el acceso con <strong className="text-primary-600">{bioLabel}</strong> en cualquier momento desde tu <strong className="text-primary-600">Perfil</strong>.
            </p>
            <button onClick={handleBioInfoClose}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors">
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: olvidé mi PIN ── */}
      {showPinForgot && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Grid3X3 className="w-7 h-7 text-primary-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Olvidaste tu PIN?</h3>
            <p className="text-gray-500 text-sm mb-6">
              Ingresa con tu <strong className="text-primary-600">usuario y contraseña</strong>. Luego puedes cambiar tu PIN desde tu <strong className="text-primary-600">Perfil</strong>.
            </p>
            <button
              onClick={() => { setShowPinForgot(false); setMethod('user'); setError(null); setPinDigits('') }}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors mb-2">
              Ir a usuario y contraseña
            </button>
            <button onClick={() => setShowPinForgot(false)}
              className="w-full py-2.5 text-gray-400 text-sm hover:text-gray-600 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
