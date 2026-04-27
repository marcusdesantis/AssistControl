import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Building2, Loader2, CheckCircle2, XCircle, Copy, CheckCheck, Smartphone } from 'lucide-react'
import { copyText } from '@/utils/clipboard'
import { publicService } from './settingsService'
import type { InvitationInfo } from './settingsService'

interface RegisterResult {
  employeeId:   string
  employeeCode: string
  pin:          string
  username:     string
  password:     string
}

export default function RegisterPage() {
  const { token } = useParams<{ token: string }>()

  const [info,    setInfo]    = useState<InvitationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)

  const [firstName,    setFirstName]    = useState('')
  const [lastName,     setLastName]     = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [positionId,   setPositionId]   = useState('')
  const [email,        setEmail]        = useState('')
  const [phone,        setPhone]        = useState('')
  const [username,     setUsername]     = useState('')
  const [password,     setPassword]     = useState('')
  const [confirmPass,  setConfirmPass]  = useState('')
  const [showPass,     setShowPass]     = useState(false)

  const [submitting,      setSubmitting]      = useState(false)
  const [result,          setResult]          = useState<RegisterResult | null>(null)
  const [error,           setError]           = useState<string | null>(null)
  const [copiedCode,      setCopiedCode]      = useState(false)
  const [copiedPin,       setCopiedPin]       = useState(false)
  const [copiedUsername,  setCopiedUsername]  = useState(false)
  const [copiedPassword,  setCopiedPassword]  = useState(false)
  const [copiedAll,       setCopiedAll]       = useState(false)

  const copyToClipboard = async (text: string, setter: (v: boolean) => void) => {
    try {
      await copyText(text)
      setter(true)
      setTimeout(() => setter(false), 2000)
    } catch { /* silent */ }
  }

  const copyAll = async (r: RegisterResult) => {
    const text = [
      `Código de empleado: ${r.employeeCode}`,
      `PIN checador:       ${r.pin}`,
      `Usuario app:        ${r.username}`,
      `Contraseña app:     ${r.password}`,
    ].join('\n')
    try {
      await copyText(text)
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    } catch { /* silent */ }
  }

useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return }
    publicService.getInvitationInfo(token)
      .then(data => { setInfo(data); if (!data.isValid) setInvalid(true) })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!firstName || !lastName || !email || !username || !password) {
      setError('Completa todos los campos requeridos.'); return
    }
    if (password !== confirmPass) {
      setError('Las contraseñas no coinciden.'); return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.'); return
    }
    if (!/^[a-z0-9._-]{3,50}$/.test(username.toLowerCase())) {
      setError('El usuario solo puede tener letras minúsculas, números y los símbolos . _ -'); return
    }
    setSubmitting(true); setError(null)
    try {
      const data = await publicService.register(token, {
        firstName, lastName,
        departmentId: departmentId || null,
        positionId:   positionId   || null,
        email, phone,
        username: username.toLowerCase().trim(),
        password,
      })
      setResult(data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Error al registrarse. Intente de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (invalid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center shadow-sm space-y-4">
          <XCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-gray-800">Invitación inválida</h2>
          <p className="text-sm text-gray-500">Este enlace no es válido o ha expirado. Solicita una nueva invitación al administrador.</p>
        </div>
      </div>
    )
  }

  if (result !== null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center shadow-sm space-y-4">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-800">¡Registro exitoso!</h2>
          <p className="text-sm text-gray-500">Guarda estos datos — los necesitarás para entrar al checador y a la app.</p>
          <div className="space-y-3 text-left">

            {/* Código */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Código de empleado</p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-2xl font-bold text-blue-800">{result.employeeCode}</span>
                <button onClick={() => copyToClipboard(result.employeeCode, setCopiedCode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium transition-colors">
                  {copiedCode ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Usuario app */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">
                <Smartphone className="w-3 h-3 inline mr-1" />Usuario app móvil
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-lg font-bold text-purple-800">{result.username}</span>
                <button onClick={() => copyToClipboard(result.username, setCopiedUsername)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-medium transition-colors">
                  {copiedUsername ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUsername ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Contraseña app */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">
                <Smartphone className="w-3 h-3 inline mr-1" />Contraseña app móvil
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-lg font-bold text-green-800">{result.password}</span>
                <button onClick={() => copyToClipboard(result.password, setCopiedPassword)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium transition-colors">
                  {copiedPassword ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPassword ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* PIN */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">PIN del reloj checador</p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-2xl font-bold text-amber-800 tracking-widest">{result.pin}</span>
                <button onClick={() => copyToClipboard(result.pin, setCopiedPin)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-medium transition-colors">
                  {copiedPin ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPin ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <p className="text-xs text-amber-600 mt-2">Solo se muestra una vez.</p>
            </div>

          </div>

          {/* Copiar todo + Enviar por correo */}
          <div className="space-y-2">
            <button
              onClick={() => copyAll(result)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-700 transition-colors">
              {copiedAll ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copiedAll ? '¡Todo copiado!' : 'Copiar todo'}
            </button>
          </div>

          {!info?.hasSchedule && (
            <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-left">
              <span className="text-amber-500 text-base mt-0.5">⚠</span>
              <p className="text-xs text-amber-700">
                <strong>Sin horario asignado.</strong> Por el momento no podrás registrar asistencia. Solicita al administrador que te asigne un horario.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header empresa */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-4 shadow-sm">
          {info?.logoBase64 ? (
            <img src={info.logoBase64} alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-gray-100" />
          ) : (
            <div className="w-16 h-16 bg-primary-50 rounded-lg flex items-center justify-center border border-primary-100">
              <Building2 className="w-8 h-8 text-primary-400" />
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Invitación de registro</p>
            <h1 className="text-xl font-bold text-gray-900">{info?.companyName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Completa tus datos para unirte al equipo</p>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Nombre(s) <span className="text-red-500">*</span></label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="María"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Apellido(s) <span className="text-red-500">*</span></label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="García López"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Departamento</label>
                <select value={departmentId} onChange={e => setDepartmentId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">— Sin departamento —</option>
                  {info?.departments?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Cargo</label>
                <select value={positionId} onChange={e => setPositionId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">— Sin cargo —</option>
                  {info?.positions?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Correo electrónico <span className="text-red-500">*</span></label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="correo@ejemplo.com"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Teléfono</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="(000) 000-0000"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>

            {/* Credenciales app móvil */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Acceso a la app móvil</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Nombre de usuario <span className="text-red-500">*</span></label>
                <input value={username} onChange={e => setUsername(e.target.value.toLowerCase())}
                  placeholder="ej. maria.garcia" autoComplete="username"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                <p className="text-xs text-gray-400">Solo letras minúsculas, números y los símbolos . _ -</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Contraseña <span className="text-red-500">*</span></label>
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    type={showPass ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Confirmar contraseña <span className="text-red-500">*</span></label>
                  <input value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                    type={showPass ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showPass} onChange={e => setShowPass(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-xs text-gray-500">Mostrar contraseña</span>
              </label>
            </div>

            <button type="submit" disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors mt-2">
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" />Registrando…</> : 'Completar registro'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
