import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Mail, Plus, X, Send, Copy, Check, ChevronDown, Loader2, Save,
  Server, Eye, EyeOff, ToggleLeft, ToggleRight, KeyRound, RefreshCw, AlertTriangle, Lock, CreditCard, UserPlus,
} from 'lucide-react'
import { copyText } from '@/utils/clipboard'
import { createTour } from '@/utils/tour'
import HelpButton from '@/components/HelpButton'
import { settingsService } from './settingsService'
import type { TenantSettings } from './settingsService'
import { authService } from '../auth/authService'
import { scheduleService } from '../schedules/scheduleService'
import type { Schedule } from '@/types/schedule'
import SubscriptionTab from './SubscriptionTab'

// ─── Presets SMTP ────────────────────────────────────────────────────────────
const PROVIDERS = [
  { label: 'Gmail',           host: 'smtp.gmail.com',           port: 587, ssl: true  },
  { label: 'Outlook/Hotmail', host: 'smtp-mail.outlook.com',    port: 587, ssl: true  },
  { label: 'Yahoo Mail',      host: 'smtp.mail.yahoo.com',      port: 587, ssl: true  },
  { label: 'Office 365',      host: 'smtp.office365.com',       port: 587, ssl: true  },
  { label: 'Zoho Mail',       host: 'smtp.zoho.com',            port: 587, ssl: true  },
  { label: 'Personalizado',   host: '',                          port: 587, ssl: true  },
]

const EMPTY: TenantSettings = {
  employeeCodePrefix:          'EMP-',
  invitationExpirationHours:   48,
  invitationEmails:            null,
  smtpEnabled:                 false,
  smtpHost:                    null,
  smtpPort:                    587,
  smtpUsername:                null,
  smtpPassword:                null,
  smtpFromName:                null,
  smtpEnableSsl:               true,
  checkerKey:                  '',
  checkerRequires2FA:          false,
  checkerOtpExpirationMinutes: 5,
}

// ─── Componentes pequeños ─────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder, type = 'text', hint,
}: {
  label: string; value: string | number; onChange: (v: string) => void
  placeholder?: string; type?: string; hint?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function PasswordField({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 p-1 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

type Tab = 'email' | 'invitations' | 'checker' | 'subscription'

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [form,       setForm]       = useState<TenantSettings>(EMPTY)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const [activeTab,  setActiveTab]  = useState<Tab>((searchParams.get('tab') as Tab) ?? 'email')
  const [copiedIdx,  setCopiedIdx]  = useState<number | null>(null)
  const [sending,        setSending]        = useState(false)
  const [inviteResults,  setInviteResults]  = useState<{ email: string; assignedCode: string | null; url: string; emailSent: boolean }[] | null>(null)
  const [recipients,     setRecipients]     = useState<{ id: string; email: string; assignedCode: string; scheduleId: string; scheduleStartDate: string }[]>([])
  const [schedules,      setSchedules]      = useState<Schedule[]>([])
  const [copiedKey,        setCopiedKey]        = useState(false)
  const [regenerating,     setRegenerating]     = useState(false)
  const [showCheckerKey,   setShowCheckerKey]   = useState(false)
  const [checkerUnlocked,  setCheckerUnlocked]  = useState(false)
  const [tabDdOpen,        setTabDdOpen]        = useState(false)
  const [showPwdModal,     setShowPwdModal]     = useState(false)
  const [pwdInput,         setPwdInput]         = useState('')
  const [pwdError,         setPwdError]         = useState<string | null>(null)
  const [pwdVerifying,     setPwdVerifying]     = useState(false)

  useEffect(() => {
    settingsService.get()
      .then(data => setForm(data))
      .catch(() => setError('No se pudo cargar la configuración.'))
      .finally(() => setLoading(false))
    scheduleService.getAll()
      .then(scheds => setSchedules(scheds))
      .catch(() => {})
  }, [])

  const handleTabClick = (key: Tab) => {
    // Al salir de la pestaña checker, bloquearla de nuevo
    if (activeTab === 'checker' && key !== 'checker') {
      setCheckerUnlocked(false)
      setShowCheckerKey(false)
    }
    if (key === 'checker' && !checkerUnlocked) {
      setPwdInput('')
      setPwdError(null)
      setShowPwdModal(true)
      return
    }
    setActiveTab(key)
  }

  const handleVerifyPassword = async () => {
    if (!pwdInput.trim()) return
    setPwdVerifying(true)
    setPwdError(null)
    const ok = await authService.verifyPassword(pwdInput)
    setPwdVerifying(false)
    if (ok) {
      setCheckerUnlocked(true)
      setShowPwdModal(false)
      setActiveTab('checker')
    } else {
      setPwdError('Contraseña incorrecta. Intenta de nuevo.')
    }
  }

  const handleRegenerateCheckerKey = async () => {
    setRegenerating(true)
    try {
      const updated = await settingsService.regenerateCheckerKey()
      setForm(prev => ({ ...prev, checkerKey: updated.checkerKey }))
      toast.success('Clave del checador regenerada. Las sesiones activas quedarán invalidadas.')
    } catch {
      toast.error('Error al regenerar la clave.')
    } finally {
      setRegenerating(false)
    }
  }

  const smtpConfigured = !!(form.smtpEnabled && form.smtpHost && form.smtpUsername && form.smtpPassword)

  const runTour = () => {
    const tours: Record<string, { element: string; title: string; description: string }[]> = {
      email: [
        { element: '#tour-smtp-toggle',   title: '¿Para qué sirve el correo?',        description: 'Activa el envío de emails desde tu empresa. <b>Sin esto no se pueden enviar invitaciones ni credenciales a empleados</b>. El Checador con 2FA también depende de este módulo.' },
        { element: '#tour-smtp-provider', title: 'Elige tu proveedor',                description: 'Selecciona Gmail, Outlook u otro. Se rellenan automáticamente el servidor y puerto. Para Gmail <b>necesitas una Contraseña de Aplicación</b>, no tu contraseña normal.' },
        { element: '#tour-smtp-fields',   title: 'Datos de conexión',                 description: 'Ingresa el servidor, puerto, usuario y contraseña. El usuario es tu dirección de correo completa. Puerto 587 = STARTTLS (recomendado). Puerto 465 = SSL directo.' },
        { element: '#tour-smtp-save',       title: 'Guarda los cambios',                description: 'Usa el botón <b>Guardar</b> cuando termines: arriba a la derecha en escritorio, o el botón circular <b>abajo a la derecha</b> en móvil. Los cambios no se aplican hasta que guardes.' },
      ],
      invitations: [
        { element: '#tour-inv-prefix',    title: 'Código de empleado',   description: 'Define el prefijo para los códigos de empleado (ej: EMP-001). La expiración indica cuántas horas tiene el empleado para completar su registro.' },
        { element: '#tour-inv-emails',    title: 'Destinatarios',        description: 'Agrega uno o varios destinatarios. Cada uno recibe su propio enlace único — puedes asignarle un código, un horario y la fecha desde la que aplica ese horario.' },
        { element: '#tour-inv-send',      title: 'Enviar invitaciones',  description: 'Envía los enlaces a todos los destinatarios de una sola vez. <b>Requiere SMTP activo y configurado</b> en la pestaña "Configuración de correo".' },
      ],
      checker: [
        { element: '#tour-checker-key',   title: 'Clave del Checador',                description: 'Esta clave conecta tu empresa con el dispositivo checador web/móvil. <b>Sin ella el checador no funciona</b>. Si la cambias, deberás actualizar el dispositivo.' },
        { element: '#tour-checker-2fa',   title: 'Doble Factor de Autenticación',     description: `Pide un código OTP al empleado antes de registrar asistencia. <b>⚠ Depende de SMTP:</b> ${smtpConfigured ? '✅ SMTP activo — puedes activarlo.' : '❌ Primero debes configurar y activar el SMTP en la pestaña "Configuración de correo".'}` },
        { element: '#tour-checker-otp',   title: 'Expiración del código OTP',         description: 'Tiempo en minutos que tiene el empleado para ingresar el código. Recomendado: 5 minutos.' },
      ],
    }
    const steps = tours[activeTab]
    if (!steps) return
    createTour(steps).drive()
  }

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const updated = await settingsService.update(form)
      setForm(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      toast.success('Configuración guardada correctamente.')
    } catch {
      setError('Error al guardar. Intente de nuevo.')
      toast.error('Error al guardar la configuración.')
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const addRecipient = () => {
    setRecipients(prev => [...prev, { id: crypto.randomUUID(), email: '', assignedCode: '', scheduleId: '', scheduleStartDate: today }])
  }

  const updateRecipient = (id: string, field: 'email' | 'assignedCode' | 'scheduleId' | 'scheduleStartDate', value: string) => {
    setRecipients(prev => prev.map(r => {
      if (r.id !== id) return r
      if (field === 'assignedCode') return { ...r, assignedCode: value.toUpperCase() }
      if (field === 'scheduleId')   return { ...r, scheduleId: value, scheduleStartDate: today }
      return { ...r, [field]: value }
    }))
  }

  const removeRecipient = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id))
  }

  const handleSendInvitation = async () => {
    const valid = recipients.filter(r => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim()))
    if (valid.length === 0) { setError('Agrega al menos un destinatario con correo válido.'); return }
    setSending(true); setError(null)
    try {
      const data = await settingsService.sendInvitation(
        window.location.origin,
        valid.map(r => ({
          email:             r.email.trim().toLowerCase(),
          assignedCode:      r.assignedCode.trim() || undefined,
          scheduleId:        r.scheduleId        || undefined,
          scheduleStartDate: r.scheduleId ? r.scheduleStartDate : undefined,
        })),
      )
      setInviteResults(data.results)
      setRecipients([])
      toast.success(data.emailSent
        ? `${data.results.length} invitación${data.results.length !== 1 ? 'es' : ''} enviada${data.results.length !== 1 ? 's' : ''} por correo.`
        : `${data.results.length} enlace${data.results.length !== 1 ? 's' : ''} generado${data.results.length !== 1 ? 's' : ''} (SMTP desactivado).`
      )
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Error al generar la invitación.')
      toast.error(msg ?? 'Error al generar la invitación.')
    } finally {
      setSending(false)
    }
  }

  const copyInviteUrl = async (url: string, idx: number) => {
    await copyText(url)
    setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000)
  }

  const applyProvider = (label: string) => {
    const p = PROVIDERS.find(pr => pr.label === label)
    if (!p) return
    const hostChanged = p.host !== form.smtpHost
    setForm(prev => ({
      ...prev,
      smtpHost:      p.host,
      smtpPort:      p.port,
      smtpEnableSsl: p.ssl,
      ...(hostChanged && { smtpUsername: '', smtpPassword: '' }),
    }))
  }

  const codePreview = `${form.employeeCodePrefix || 'EMP-'}001`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />Cargando…
      </div>
    )
  }

  return (
    <>
    <div className="space-y-6 pb-20 sm:pb-0">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
            <p className="text-gray-500 text-sm mt-0.5">Parámetros del sistema</p>
          </div>
          {/* HelpButton izquierda — solo desktop */}
          {activeTab !== 'subscription' && (
            <span className="hidden sm:block mt-1"><HelpButton onClick={runTour} /></span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* HelpButton derecha — solo mobile */}
          {activeTab !== 'subscription' && (
            <span className="sm:hidden"><HelpButton onClick={runTour} /></span>
          )}
          {/* Botón guardar — solo desktop */}
          {activeTab !== 'subscription' && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="hidden sm:flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando…</>
                : saved
                ? <><Save className="w-4 h-4" />¡Guardado!</>
                : <><Save className="w-4 h-4" />Guardar</>}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        {/* Dropdown móvil */}
        {(() => {
          const TAB_DEFS = [
            { key: 'email'        as Tab, label: 'Configuración de correo', Icon: Server    },
            { key: 'invitations'  as Tab, label: 'Envío de registro',        Icon: Mail      },
            { key: 'checker'      as Tab, label: 'Checador',                  Icon: KeyRound  },
            { key: 'subscription' as Tab, label: 'Planes - Suscripción',      Icon: CreditCard },
          ]
          const current = TAB_DEFS.find(t => t.key === activeTab)!
          return (
            <div className="sm:hidden relative p-3 border-b border-gray-200">
              <button
                onClick={() => setTabDdOpen(o => !o)}
                className="w-full flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
              >
                <current.Icon className="w-4 h-4 text-gray-500" />
                <span className="flex-1 text-left">{current.label}</span>
                {activeTab === 'checker' && !checkerUnlocked && <Lock className="w-3 h-3 text-gray-400" />}
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${tabDdOpen ? 'rotate-180' : ''}`} />
              </button>
              {tabDdOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setTabDdOpen(false)} />
                  <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                    {TAB_DEFS.map(({ key, label, Icon }) => (
                      <button key={key}
                        onClick={() => { handleTabClick(key); setTabDdOpen(false) }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors
                          ${activeTab === key ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="flex-1">{label}</span>
                        {key === 'checker' && !checkerUnlocked && <Lock className="w-3 h-3 text-gray-400" />}
                        {activeTab === key && <Check className="w-3.5 h-3.5 text-primary-600" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })()}

        {/* Tabs desktop */}
        <div className="hidden sm:flex border-b border-gray-200">
          {([
            { key: 'email',       label: 'Configuración de correo', Icon: Server    },
            { key: 'invitations', label: 'Envío de registro',        Icon: Mail      },
            { key: 'checker',     label: 'Checador',                  Icon: KeyRound  },
            { key: 'subscription',label: 'Planes - Suscripción',      Icon: CreditCard },
          ] as { key: Tab; label: string; Icon: React.ElementType }[]).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => handleTabClick(key)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === key
                  ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {key === 'checker' && !checkerUnlocked && (
                <Lock className="w-3 h-3 text-gray-400 ml-0.5" />
              )}
            </button>
          ))}
        </div>

        {activeTab === 'subscription' && <SubscriptionTab />}
        <div className={activeTab === 'subscription' ? 'hidden' : 'p-6'}>

          {/* ── Tab: Correo electrónico ───────────────────────────────── */}
          {activeTab === 'email' && (
            <div className="space-y-5">

              {/* Toggle habilitado */}
              <div id="tour-smtp-toggle" className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-800">Envío de correos activo</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Si está desactivado se genera el enlace pero no se envía email
                  </p>
                </div>
                <button
                  onClick={() => setForm(p => ({ ...p, smtpEnabled: !p.smtpEnabled }))}
                  className={`flex items-center gap-1.5 text-sm font-medium ${form.smtpEnabled ? 'text-primary-600' : 'text-gray-400'}`}
                >
                  {form.smtpEnabled
                    ? <ToggleRight className="w-8 h-8" />
                    : <ToggleLeft  className="w-8 h-8" />}
                  {form.smtpEnabled ? 'Activado' : 'Desactivado'}
                </button>
              </div>

              {/* Selector de proveedor */}
              <div id="tour-smtp-provider" className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Proveedor</label>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const knownHosts = PROVIDERS.filter(p => p.host !== '').map(p => p.host)
                    const isCustom = !knownHosts.includes(form.smtpHost ?? '')
                    return PROVIDERS.map(p => {
                      const active = p.host !== '' ? form.smtpHost === p.host : isCustom
                      return (
                        <button
                          key={p.label}
                          onClick={() => applyProvider(p.label)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                            active
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400 hover:text-primary-600'
                          }`}
                        >
                          {p.label}
                        </button>
                      )
                    })
                  })()}
                </div>
              </div>

              <div id="tour-smtp-fields" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Field
                    label="Servidor SMTP"
                    value={form.smtpHost ?? ''}
                    onChange={v => setForm(p => ({ ...p, smtpHost: v }))}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <Field
                  label="Puerto"
                  value={form.smtpPort}
                  onChange={v => setForm(p => ({ ...p, smtpPort: parseInt(v) || 587 }))}
                  type="number"
                  placeholder="587"
                />
                <Field
                  label="Usuario / Email remitente"
                  value={form.smtpUsername ?? ''}
                  onChange={v => setForm(p => ({ ...p, smtpUsername: v }))}
                  placeholder="correo@empresa.com"
                />
                <PasswordField
                  label="Contraseña / App Password"
                  value={form.smtpPassword ?? ''}
                  onChange={v => setForm(p => ({ ...p, smtpPassword: v }))}
                  placeholder="Contraseña o App Password"
                />
                <Field
                  label="Nombre del remitente"
                  value={form.smtpFromName ?? ''}
                  onChange={v => setForm(p => ({ ...p, smtpFromName: v }))}
                  placeholder="TiempoYa"
                />
              </div>

              {/* SSL toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="ssl"
                  checked={form.smtpEnableSsl}
                  onChange={e => setForm(p => ({ ...p, smtpEnableSsl: e.target.checked }))}
                  className="w-4 h-4 rounded accent-primary-600"
                />
                <label htmlFor="ssl" className="text-sm text-gray-700">Usar SSL/TLS</label>
              </div>

              {/* Nota Gmail */}
              {form.smtpHost === 'smtp.gmail.com' && (
                <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 space-y-1">
                  <p className="font-medium">Gmail — Contraseña de aplicación</p>
                  <p>
                    Gmail requiere una <strong>contraseña de aplicación</strong> (no tu contraseña normal).
                    Actívala en <strong>Mi Cuenta → Seguridad → Contraseñas de aplicación</strong>.
                    La verificación en dos pasos debe estar habilitada.
                  </p>
                </div>
              )}

              {form.smtpHost === 'smtp-mail.outlook.com' && (
                <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  <p className="font-medium">Outlook/Hotmail</p>
                  <p>Usa tu email completo como usuario (ej: tucorreo@hotmail.com) y tu contraseña normal.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Invitaciones ─────────────────────────────────────── */}
          {activeTab === 'invitations' && (
            <div className="space-y-6">

              {/* Config de códigos */}
              <div id="tour-inv-prefix" className="space-y-3">
                <p className="text-xs font-bold text-primary-700 uppercase tracking-wider">Código de empleado</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Field
                      label="Prefijo"
                      value={form.employeeCodePrefix}
                      onChange={v => setForm(p => ({ ...p, employeeCodePrefix: v.toUpperCase() }))}
                      placeholder="EMP-"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Vista previa: <span className="font-mono font-medium text-primary-700">{codePreview}</span>
                    </p>
                  </div>
                  <Field
                    label="Expiración de invitación (horas)"
                    value={form.invitationExpirationHours}
                    onChange={v => setForm(p => ({ ...p, invitationExpirationHours: parseInt(v) || 48 }))}
                    type="number"
                    placeholder="48"
                    hint="Recomendado: 48 h."
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Destinatarios */}
              <div id="tour-inv-emails" className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-primary-700 uppercase tracking-wider">Destinatarios</p>
                  <button
                    onClick={addRecipient}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-medium rounded-lg border border-primary-200 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />Agregar destinatario
                  </button>
                </div>

                <p className="text-xs text-gray-400">
                  Cada destinatario recibe su propio enlace único. El código y el horario son opcionales — si no asignas código, el sistema genera uno automáticamente.
                </p>

                {recipients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 gap-2">
                    <Mail className="w-8 h-8 opacity-30" />
                    <p className="text-sm">No hay destinatarios</p>
                    <button onClick={addRecipient} className="text-xs text-primary-600 hover:underline">
                      + Agregar el primero
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recipients.map((r, idx) => {
                      const emailInvalid = r.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())
                      return (
                        <div key={r.id} className="relative p-3 pr-9 border border-gray-200 rounded-xl bg-gray-50 space-y-2">
                          {/* X — siempre arriba a la derecha */}
                          <button
                            onClick={() => removeRecipient(r.id)}
                            className="absolute top-2.5 right-2.5 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {/* Desktop: una sola fila — Mobile: apilado */}
                          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                            {/* Correo */}
                            <div className="flex-1 min-w-0">
                              <label className="text-xs font-medium text-gray-500 mb-1 block">
                                Correo <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="email"
                                value={r.email}
                                onChange={e => updateRecipient(r.id, 'email', e.target.value)}
                                placeholder={`empleado${idx + 1}@empresa.com`}
                                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white ${
                                  emailInvalid
                                    ? 'border-red-400 focus:ring-red-400'
                                    : 'border-gray-300 focus:ring-primary-500'
                                }`}
                              />
                              {emailInvalid && (
                                <p className="text-xs text-red-500 mt-0.5">Correo inválido</p>
                              )}
                            </div>
                            {/* Código */}
                            <div className="sm:w-36">
                              <label className="text-xs font-medium text-gray-500 mb-1 block">Código <span className="font-normal text-gray-400">(opc.)</span></label>
                              <input
                                type="text"
                                value={r.assignedCode}
                                onChange={e => updateRecipient(r.id, 'assignedCode', e.target.value)}
                                placeholder={`${form.employeeCodePrefix || 'EMP-'}00${idx + 1}`}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                              />
                            </div>
                            {/* Horario */}
                            <div className="sm:w-44">
                              <label className="text-xs font-medium text-gray-500 mb-1 block">Horario <span className="font-normal text-gray-400">(opc.)</span></label>
                              <select
                                value={r.scheduleId}
                                onChange={e => updateRecipient(r.id, 'scheduleId', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                              >
                                <option value="">— Sin horario —</option>
                                {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            </div>
                            {/* Aplica desde — solo si hay horario */}
                            {r.scheduleId && (
                              <div className="sm:w-40">
                                <label className="text-xs font-medium text-gray-500 mb-1 block">Aplica desde</label>
                                <input
                                  type="date"
                                  value={r.scheduleStartDate}
                                  onChange={e => updateRecipient(r.id, 'scheduleStartDate', e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                />
                              </div>
                            )}
                          </div>

                          {/* Aviso sin horario */}
                          {!r.scheduleId && (
                            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                              Sin horario asignado, el empleado no podrá registrar asistencia en el checador hasta que se le asigne uno.
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Enviar */}
              <div id="tour-inv-send" className="space-y-3">
                {(() => {
                  const smtpOk = !!(form.smtpEnabled && form.smtpHost && form.smtpUsername && form.smtpPassword)
                  const hasValidRecipient = recipients.some(r => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim()))
                  const hasInvalidEmail   = recipients.some(r => r.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim()))
                  const canSend = smtpOk && hasValidRecipient && !hasInvalidEmail
                  return (
                    <>
                      {!smtpOk && (
                        <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>Para enviar invitaciones debes configurar y activar el <strong>correo electrónico</strong> en la pestaña <strong>"Configuración de correo"</strong>.</span>
                        </div>
                      )}
                      <div className="flex sm:justify-start justify-end">
                        <button
                          onClick={handleSendInvitation}
                          disabled={sending || !canSend}
                          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          {sending
                            ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando…</>
                            : <><Send className="w-4 h-4" />Enviar invitaciones</>}
                        </button>
                      </div>
                    </>
                  )
                })()}

                {/* Resultados por destinatario */}
                {inviteResults && inviteResults.length > 0 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-green-700">
                        {inviteResults.length} invitación{inviteResults.length !== 1 ? 'es' : ''} generada{inviteResults.length !== 1 ? 's' : ''}
                      </p>
                      <button onClick={() => setInviteResults(null)} className="text-green-600 hover:text-green-800">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {inviteResults.map((r, idx) => (
                        <div key={idx} className="bg-white border border-green-200 rounded-lg p-3 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-gray-700">{r.email}</span>
                            {r.assignedCode && (
                              <span className="text-xs font-mono bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{r.assignedCode}</span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${r.emailSent ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {r.emailSent ? '✓ Email enviado' : '⚠ Sin email'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1 rounded truncate">{r.url}</code>
                            <button
                              onClick={() => copyInviteUrl(r.url, idx)}
                              className="shrink-0 flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg"
                            >
                              {copiedIdx === idx ? <><Check className="w-3 h-3" />Copiado</> : <><Copy className="w-3 h-3" />Copiar</>}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-green-600">Válidos por {form.invitationExpirationHours} h.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Checador — bloqueado si no se verificó contraseña ── */}
          {activeTab === 'checker' && !checkerUnlocked && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <Lock className="w-10 h-10" />
              <p className="text-sm">Verifica tu contraseña para acceder</p>
            </div>
          )}

          {/* ── Tab: Checador ───────────────────────────────────────── */}
          {activeTab === 'checker' && checkerUnlocked && (
            <div className="space-y-5">

              <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Esta clave identifica tu empresa en el reloj checador.
                  Si la cambias, el dispositivo checador quedará desconectado y deberás ingresar la nueva clave.
                </p>
              </div>

              <div id="tour-checker-key" className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-500">Clave del Checador</label>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <input
                      type={showCheckerKey ? 'text' : 'password'}
                      value={form.checkerKey}
                      onChange={e => setForm(p => ({ ...p, checkerKey: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Clave del checador"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCheckerKey(s => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title={showCheckerKey ? 'Ocultar clave' : 'Mostrar clave'}
                    >
                      {showCheckerKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={async () => {
                      if (!form.checkerKey) return
                      await copyText(form.checkerKey)
                      setCopiedKey(true)
                      setTimeout(() => setCopiedKey(false), 2000)
                    }}
                    title="Copiar clave"
                    className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
                  >
                    {copiedKey ? <><Check className="w-4 h-4 text-green-600" />Copiado</> : <><Copy className="w-4 h-4" />Copiar</>}
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  Puedes escribir tu propia clave o usar el botón "Regenerar" para crear una nueva aleatoria.
                  Guarda los cambios con el botón <strong>Guardar</strong> (arriba a la derecha en escritorio, o el botón circular abajo a la derecha en móvil).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleRegenerateCheckerKey}
                  disabled={regenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {regenerating
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Regenerando…</>
                    : <><RefreshCw className="w-4 h-4" />Regenerar clave</>}
                </button>
                <span className="text-xs text-gray-400">Genera una nueva clave aleatoria y la guarda automáticamente</span>
              </div>

              <hr className="border-gray-100" />

              {/* ── Doble factor ── */}
              <div id="tour-checker-2fa" className="space-y-4">
                <p className="text-xs font-bold text-primary-700 uppercase tracking-wider">Verificación en dos pasos</p>

                {!smtpConfigured && (
                  <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Para activar la verificación en dos pasos primero debes configurar y activar el <strong>SMTP</strong> en la pestaña <strong>"Configuración de correo"</strong>. El sistema necesita enviar el código OTP al empleado por email.</span>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Requerir código de verificación</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Al activarlo, el empleado recibirá un código por email antes de registrar entrada
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (!smtpConfigured && !form.checkerRequires2FA) {
                        toast.error('Configura y activa el SMTP antes de habilitar la verificación en dos pasos.')
                        return
                      }
                      setForm(p => ({ ...p, checkerRequires2FA: !p.checkerRequires2FA }))
                    }}
                    className={`flex items-center gap-1.5 text-sm font-medium ${form.checkerRequires2FA ? 'text-primary-600' : smtpConfigured ? 'text-gray-400' : 'text-gray-300 cursor-not-allowed'}`}
                  >
                    {form.checkerRequires2FA
                      ? <ToggleRight className="w-8 h-8" />
                      : <ToggleLeft  className="w-8 h-8" />}
                    {form.checkerRequires2FA ? 'Activado' : 'Desactivado'}
                  </button>
                </div>

                {form.checkerRequires2FA && (
                  <div id="tour-checker-otp" className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">
                      Duración del código <span className="text-gray-400 font-normal">(minutos)</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.checkerOtpExpirationMinutes}
                      onChange={e => {
                        const val = parseInt(e.target.value)
                        setForm(p => ({ ...p, checkerOtpExpirationMinutes: isNaN(val) ? 1 : Math.max(1, val) }))
                      }}
                      className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-gray-400">Mínimo 1 minuto. El código expirará tras este tiempo.</p>
                    {form.checkerOtpExpirationMinutes < 1 && (
                      <p className="text-xs text-red-500">La duración debe ser mayor a 0.</p>
                    )}
                  </div>
                )}

                {form.checkerRequires2FA && !form.smtpEnabled && (
                  <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    El envío de correo no está activo. Actívalo en la pestaña <strong>Configuración de correo</strong> para que los empleados reciban el código.
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>

    {/* ── FAB guardar — solo móvil ───────────────────────────────────────── */}
    {activeTab !== 'subscription' && (
      <button
        id="tour-smtp-save"
        onClick={handleSave}
        disabled={saving}
        className="sm:hidden fixed bottom-6 right-5 z-40 w-14 h-14 flex items-center justify-center bg-primary-600 hover:bg-primary-700 active:scale-95 disabled:opacity-60 text-white rounded-full shadow-lg shadow-primary-600/40 transition-all"
      >
        {saving
          ? <Loader2 className="w-5 h-5 animate-spin" />
          : saved
          ? <Check className="w-5 h-5" />
          : <Save className="w-5 h-5" />}
      </button>
    )}

    {/* ── Modal de verificación de contraseña ──────────────────────────── */}

    {showPwdModal && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Verificación requerida</h3>
              <p className="text-xs text-gray-500">Ingresa tu contraseña para continuar</p>
            </div>
          </div>

          <div className="flex flex-col gap-1 mb-4">
            <label className="text-xs font-medium text-gray-500">Contraseña</label>
            <input
              type="password"
              value={pwdInput}
              onChange={e => { setPwdInput(e.target.value); setPwdError(null) }}
              onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()}
              autoFocus
              placeholder="••••••••"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {pwdError && (
              <p className="text-xs text-red-500 mt-1">{pwdError}</p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowPwdModal(false); setPwdInput(''); setPwdError(null) }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleVerifyPassword}
              disabled={pwdVerifying || !pwdInput.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {pwdVerifying
                ? <><Loader2 className="w-4 h-4 animate-spin" />Verificando…</>
                : 'Verificar'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
